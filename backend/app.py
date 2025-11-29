import datetime
import json
import logging
import os
import time

import google.generativeai as genai
from authlib.integrations.flask_client import OAuth
from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, request, session, url_for
from flask_cors import CORS
from flask_login import (LoginManager, UserMixin, current_user, login_required,
                         login_user, logout_user)
from flask_sqlalchemy import SQLAlchemy

# --- Load Environment Variables ---
load_dotenv()

# --- Configuration ---
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
else:
    DB_NAME = os.getenv("POSTGRES_DB")
    DB_USER = os.getenv("POSTGRES_USER")
    DB_PASSWORD = os.getenv("POSTGRES_PASSWORD")
    DB_HOST = os.getenv("DB_HOST", "db")
    SQLALCHEMY_DATABASE_URI = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"

GEMINI_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("No GOOGLE_API_KEY set for Flask application")


def sanitize_for_prompt(text: str) -> str:
    """
    A simple sanitizer to mitigate prompt injection.
    This is a basic implementation and should be expanded for production.
    It removes keywords that might be used to alter AI instructions.
    """
    if not text:
        return ""
    # Remove words like 'ignore', 'instruction', 'system', etc. case-insensitively
    bad_keywords = ['ignore', 'instruction', 'system',
                    'context', 'prompt', 'forget', 'override']
    for keyword in bad_keywords:
        text = text.replace(keyword, "")
    # Add more sanitization rules here if needed
    return text


# --- App Initialization ---
app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = SQLALCHEMY_DATABASE_URI
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.json.ensure_ascii = False
app.secret_key = os.getenv("FLASK_APP_SECRET_KEY")
if not app.secret_key:
    raise ValueError("No FLASK_APP_SECRET_KEY set for Flask application")

# --- CORS Configuration ---
# Allow credentials (cookies) from the frontend origin.
# Use an environment variable for production flexibility.
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:3000")
CORS(app, resources={r"/api/*": {"origins": CORS_ORIGIN}},
     supports_credentials=True)


# --- Database and Extensions ---
db = SQLAlchemy(app)
oauth = OAuth(app)
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

# --- User Authentication (Flask-Login) ---
login_manager = LoginManager()
login_manager.init_app(app)


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


@login_manager.unauthorized_handler
def unauthorized():
    # Return a 401 Unauthorized response for API requests
    return jsonify({"error": "User not authenticated"}), 401

# --- Database Models ---


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    google_id = db.Column(db.String(128), unique=True, nullable=False)
    email = db.Column(db.String(128), unique=True, nullable=False)
    name = db.Column(db.String(128), nullable=True)
    logs = db.relationship('DailyLog', backref='user', lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email
        }


class DailyLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, default=datetime.date.today)
    score = db.Column(db.Integer, nullable=False)
    note = db.Column(db.Text, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    __table_args__ = (db.UniqueConstraint(
        'date', 'user_id', name='_date_user_uc'),)

    def to_dict(self):
        return {
            "id": self.id,
            "date": self.date.isoformat(),
            "score": self.score,
            "note": self.note
        }


# --- Google OAuth Configuration ---
google = oauth.register(
    name='google',
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    access_token_url='https://accounts.google.com/o/oauth2/token',
    access_token_params=None,
    authorize_url='https://accounts.google.com/o/oauth2/auth',
    authorize_params=None,
    api_base_url='https://www.googleapis.com/oauth2/v1/',
    userinfo_endpoint='https://openidconnect.googleapis.com/v1/userinfo',
    client_kwargs={'scope': 'openid email profile'},
    jwks_uri="https://www.googleapis.com/oauth2/v3/certs",
)

# --- Authentication Routes ---
# The frontend will link to this to initiate login


@app.route('/api/login')
def login():
    redirect_uri = url_for('auth_callback', _external=True)
    # Store the final frontend redirect URL in the session
    session['next_url'] = request.args.get('next') or 'http://localhost:3000/'
    return google.authorize_redirect(redirect_uri)


@app.route('/api/auth/callback')
def auth_callback():
    try:
        token = google.authorize_access_token()
        user_info = google.get('userinfo').json()
    except Exception as e:
        logging.error(f"Error during OAuth callback: {e}")
        return redirect(f"http://localhost:3000/login?error=true")

    google_id = user_info['id']
    email = user_info['email']
    name = user_info.get('name')

    user = User.query.filter_by(google_id=google_id).first()
    if not user:
        user = User(google_id=google_id, email=email, name=name)
        db.session.add(user)
        db.session.commit()

    login_user(user)
    # Redirect back to the frontend
    next_url = session.pop('next_url', 'http://localhost:3000/')
    return redirect(next_url)


# The frontend will call this to log the user out
@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({"success": True, "message": "Logged out successfully"})

# --- API Endpoints ---


@app.route('/api/me', methods=['GET'])
@login_required
def get_me():
    """Returns the currently logged-in user's information."""
    return jsonify(current_user.to_dict())


@app.route('/api/history', methods=['GET'])
@login_required
def get_history():
    """Returns all logs for the current user."""
    try:
        logs = DailyLog.query.filter(
            DailyLog.user_id == current_user.id
        ).order_by(DailyLog.date.desc()).all()
        return jsonify([log.to_dict() for log in logs])
    except Exception as e:
        logging.error(
            f"Error fetching history for user {current_user.id}: {e}")
        return jsonify({'error': 'An internal server error occurred.'}), 500


@app.route('/api/entry', methods=['POST'])
@login_required
def create_or_update_entry():
    """Creates a new log or updates an existing one for a given date."""
    data = request.get_json()
    if not data or 'score' not in data:
        return jsonify({'error': 'Missing data. "score" is required.'}), 400

    try:
        # Use today's date if not provided
        date_str = data.get('date', datetime.date.today().isoformat())
        log_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()

        log = DailyLog.query.filter_by(
            date=log_date, user_id=current_user.id).first()

        if log:  # Update existing log
            log.score = data['score']
            # Keep old note if new one is empty
            log.note = data.get('note', log.note)
        else:  # Create new log
            log = DailyLog(
                date=log_date,
                score=data['score'],
                note=data.get('note', ''),
                user_id=current_user.id
            )
            db.session.add(log)

        db.session.commit()
        return jsonify(log.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error saving entry for user {current_user.id}: {e}")
        return jsonify({'error': 'An internal server error occurred.'}), 500


@app.route('/api/evaluate', methods=['POST'])
@login_required
def evaluate_log_text():
    """Receives text and returns an AI-generated score and comment."""
    data = request.get_json()
    log_text = data.get('text')

    if not log_text:
        return jsonify({'error': 'Missing "text" in request body'}), 400

    sanitized_log_text = sanitize_for_prompt(log_text)

    try:
        system_instruction = """
あなたは公正で客観的な生産性コーチです。
ユーザーの活動ログに基づき、0〜100点のスコアと、100文字以内の簡潔なフィードバックを日本語で出力してください。
採点基準:
* 90-100点 (卓越): ディープワーク（深い集中）、高難易度タスクの完了、新しいスキルの習得。
* 70-89点 (良): 予定通りのタスク消化、ルーティンワークの遂行、適切な休憩。
* 50-69点 (可): 多少の進捗はあるが、非効率や集中切れが目立つ。
* 0-49点 (不可): 明らかな怠惰、先延ばし、無意味な時間の浪費。
出力形式: 以下のJSONスキーマに従うこと。
{"score": integer, "comment": string}
"""
        json_model = genai.GenerativeModel(
            'gemini-2.5-flash',
            generation_config={"response_mime_type": "application/json"}
        )
        prompt = f"{system_instruction}\n\n活動ログ:\n'''\n{sanitized_log_text}\n'''"
        response = json_model.generate_content(prompt)
        evaluation = json.loads(response.text)
        return jsonify(evaluation)

    except Exception as e:
        logging.error(
            f"Error during AI evaluation for user {current_user.id}: {e}")
        return jsonify({'error': 'AI evaluation failed.'}), 500


@app.route('/api/feedback', methods=['GET'])
@login_required
def get_feedback():
    """Generates AI feedback based on the last 7 days of logs."""
    try:
        seven_days_ago = datetime.date.today() - datetime.timedelta(days=6)
        logs = DailyLog.query.filter(
            DailyLog.user_id == current_user.id,
            DailyLog.date >= seven_days_ago
        ).order_by(DailyLog.date.desc()).all()

        if len(logs) < 2:
            return jsonify({'feedback': 'フィードバックを生成するには、少なくとも2日以上の記録が必要です。'})

        log_data = [log.to_dict() for log in logs]

        prompt_template = f"""
あなたは、生産性向上のためのコーチングAIです。
以下のJSONデータは、ユーザーの過去数日間の生産性ログです。
- 'date': 日付
- 'score': 100点満点の生産性スコア
- 'note': その日の行動に関するメモ

--- データ ---
{json.dumps(log_data, indent=2, ensure_ascii=False)}
--- データ ---

上記のデータに基づき、以下の2点について、簡潔かつ激励的なフィードバックを日本語で生成してください。

1. **総括**: ユーザーの生産性トレンドを3文以内で要約してください。良いところと改善点の両方に触れてください。
2. **ワンポイントアドバイス**: 生産性をさらに向上させるための、最も効果的で具体的な行動を2つ提案してください。

注意: 行動を提案するときは、ユーザーの過去のメモを参考にし、同じ行動を繰り返すのではなく、新しい視点や方法を提供してください。
また、具体的な行動を提示してください。精神論ではなく、ウィルパワーがない人でも「仕組み化」して実行できるような内容にしてください。
"""
        # Use the non-JSON model for this
        text_model = genai.GenerativeModel('gemini-2.5-flash')
        response = text_model.generate_content(prompt_template)
        return jsonify({'feedback': response.text})

    except Exception as e:
        logging.error(
            f"Error generating feedback for user {current_user.id}: {e}")
        return jsonify({'error': 'An internal server error occurred.'}), 500


# --- App Initialization Command ---
@app.cli.command("init-db")
def init_db_command():
    """Initializes the database by creating all tables."""
    retries = 5
    delay = 5
    for i in range(retries):
        try:
            db.create_all()
            print("Database initialized successfully.")
            return
        except Exception as e:
            print(f"Database connection failed: {e}")
            if i < retries - 1:
                print(f"Retrying in {delay} seconds...")
                time.sleep(delay)
            else:
                print("Could not connect to the database after several retries.")
                raise


if __name__ == '__main__':
    # Note: This is for local development without Docker.
    # The Docker container will use a Gunicorn server.
    app.run(host='0.0.0.0', port=5000, debug=True)
