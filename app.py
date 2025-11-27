import datetime
import json
import logging
import os
import time

import google.generativeai as genai
from authlib.integrations.flask_client import OAuth
from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, render_template, request, url_for
from flask_login import (LoginManager, UserMixin, current_user, login_required,
                         login_user, logout_user)
from flask_sqlalchemy import SQLAlchemy

# --- Load Environment Variables ---
load_dotenv()

# --- Configuration ---
# Database connection details from environment variables
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
else:
    DB_NAME = os.getenv("POSTGRES_DB")
    DB_USER = os.getenv("POSTGRES_USER")
    DB_PASSWORD = os.getenv("POSTGRES_PASSWORD")
    DB_HOST = os.getenv("DB_HOST", "db")
    SQLALCHEMY_DATABASE_URI = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"

# Gemini API Key
GEMINI_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("No GOOGLE_API_KEY set for Flask application")

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = SQLALCHEMY_DATABASE_URI
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.json.ensure_ascii = False
app.secret_key = os.getenv("FLASK_APP_SECRET_KEY")
if not app.secret_key:
    raise ValueError("No FLASK_APP_SECRET_KEY set for Flask application")


db = SQLAlchemy(app)
oauth = OAuth(app)

# --- AI Configuration ---
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

# --- User Authentication (Flask-Login) ---
login_manager = LoginManager()
login_manager.init_app(app)
# Redirect to /login if user is not authenticated
login_manager.login_view = 'login'


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# --- Database Models ---


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    google_id = db.Column(db.String(128), unique=True, nullable=False)
    email = db.Column(db.String(128), unique=True, nullable=False)
    name = db.Column(db.String(128), nullable=True)
    logs = db.relationship('DailyLog', backref='user', lazy=True)


class DailyLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    score = db.Column(db.Integer, nullable=False)
    note = db.Column(db.Text, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    __table_args__ = (db.UniqueConstraint(
        'date', 'user_id', name='_date_user_uc'),)

    def to_dict(self):
        return {
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


@app.route('/login')
def login():
    # Determine the redirect URI based on the request environment
    # For Render, it uses HTTPS. For local, HTTP.
    redirect_uri = url_for('auth_callback', _external=True, _scheme='https')
    if '127.0.0.1' in redirect_uri or 'localhost' in redirect_uri:
        redirect_uri = url_for('auth_callback', _external=True)

    return google.authorize_redirect(redirect_uri)


@app.route('/auth/callback')
def auth_callback():
    try:
        token = google.authorize_access_token()
        user_info = google.get('userinfo').json()
    except Exception as e:
        logging.error(f"Error during OAuth callback: {e}")
        return redirect(url_for('login'))

    google_id = user_info['id']
    email = user_info['email']
    name = user_info.get('name')

    user = User.query.filter_by(google_id=google_id).first()
    if not user:
        user = User(google_id=google_id, email=email, name=name)
        db.session.add(user)
        db.session.commit()

    login_user(user)
    return redirect(url_for('index'))


@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))


# --- Frontend Routes ---

@app.route('/')
def index():
    todays_log_exists = False
    if current_user.is_authenticated:
        today = datetime.date.today()
        log = DailyLog.query.filter_by(
            user_id=current_user.id, date=today).first()
        if log:
            todays_log_exists = True
    return render_template('home.html', todays_log_exists=todays_log_exists)


@app.route('/entry')
@login_required
def entry():
    return render_template('entry.html')


@app.route('/history')
@login_required
def history():
    return render_template('history.html')


@app.route('/feedback')
@login_required
def feedback():
    return render_template('feedback.html')


@app.route('/graph')
@login_required
def graph():
    return render_template('graph.html')

# --- API Endpoints ---


@app.route('/api/score', methods=['POST'])
@login_required
def save_score():
    data = request.get_json()
    if not data or not all(k in data for k in ['date', 'score']):
        return jsonify({'error': 'Missing data. "date" and "score" are required.'}), 400

    try:
        log_date = datetime.datetime.strptime(data['date'], '%Y-%m-%d').date()

        log = DailyLog.query.filter_by(
            date=log_date, user_id=current_user.id).first()
        if log:
            log.score = data['score']
            log.note = data.get('note', '')
        else:
            log = DailyLog(
                date=log_date,
                score=data['score'],
                note=data.get('note', ''),
                user_id=current_user.id
            )
            db.session.add(log)

        db.session.commit()
        return jsonify({'success': True, 'message': 'Score saved successfully.'}), 201
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error saving score for user {current_user.id}: {e}")
        return jsonify({'error': 'An internal server error occurred.'}), 500


@app.route('/api/scores', methods=['GET'])
@login_required
def get_scores():
    date_str = request.args.get('date')
    try:
        target_date = datetime.datetime.strptime(
            date_str, '%Y-%m-%d').date() if date_str else datetime.date.today()

        start_of_week = target_date - \
            datetime.timedelta(days=target_date.weekday())
        end_of_week = start_of_week + datetime.timedelta(days=6)

        logs = DailyLog.query.filter(
            DailyLog.user_id == current_user.id,
            DailyLog.date >= start_of_week,
            DailyLog.date <= end_of_week
        ).order_by(DailyLog.date.asc()).all()

        return jsonify({
            "week_start": start_of_week.isoformat(),
            "week_end": end_of_week.isoformat(),
            "logs": [log.to_dict() for log in logs]
        })
    except Exception as e:
        logging.error(f"Error fetching scores for user {current_user.id}: {e}")
        return jsonify({'error': 'An internal server error occurred.'}), 500


@app.route('/api/all_scores', methods=['GET'])
@login_required
def get_all_scores():
    try:
        logs = DailyLog.query.filter(
            DailyLog.user_id == current_user.id
        ).order_by(DailyLog.date.asc()).all()

        return jsonify({
            "logs": [log.to_dict() for log in logs]
        })
    except Exception as e:
        logging.error(
            f"Error fetching all scores for user {current_user.id}: {e}")
        return jsonify({'error': 'An internal server error occurred.'}), 500


@app.route('/api/feedback', methods=['GET'])
@login_required
def get_feedback():
    try:
        seven_days_ago = datetime.date.today() - datetime.timedelta(days=6)
        logs = DailyLog.query.filter(
            DailyLog.user_id == current_user.id,
            DailyLog.date >= seven_days_ago
        ).order_by(DailyLog.date.desc()).all()

        if len(logs) < 2:
            return jsonify({'feedback': 'Not enough data for feedback. Please log your productivity for at least two days.'})

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
        response = model.generate_content(prompt_template)
        return jsonify({'feedback': response.text})

    except Exception as e:
        logging.error(
            f"Error generating feedback for user {current_user.id}: {e}")
        return jsonify({'error': 'An internal server error occurred.'}), 500

# --- App Initialization ---


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
