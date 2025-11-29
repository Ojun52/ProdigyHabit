import datetime
import json
import logging
import os
import time
import re

import google.generativeai as genai
from authlib.integrations.flask_client import OAuth
from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, request, url_for, session
from flask_cors import CORS
from flask_login import (
    LoginManager,
    UserMixin,
    current_user,
    login_required,
    login_user,
    logout_user,
)
from flask_sqlalchemy import SQLAlchemy

# --- Load Environment Variables ---
load_dotenv()

# --- App Initialization ---
app = Flask(__name__)

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

app.config["SQLALCHEMY_DATABASE_URI"] = SQLALCHEMY_DATABASE_URI
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.json.ensure_ascii = False
app.secret_key = os.getenv("FLASK_APP_SECRET_KEY", "dev-secret-key")

# --- CORS Configuration ---
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:3000")
CORS(app, origins=CORS_ORIGIN, supports_credentials=True)

# --- Database and Extensions ---
db = SQLAlchemy(app)
oauth = OAuth(app)
genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))

# --- User Authentication (Flask-Login) ---
login_manager = LoginManager()
login_manager.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@login_manager.unauthorized_handler
def unauthorized():
    return jsonify({"error": "User not authenticated"}), 401

# --- Database Models (Refactored) ---
class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    google_id = db.Column(db.String(128), unique=True, nullable=False)
    email = db.Column(db.String(128), unique=True, nullable=False)
    name = db.Column(db.String(128), nullable=True)
    activity_logs = db.relationship('ActivityLog', backref='user', lazy=True)

class ActivityLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow)
    log_type = db.Column(db.String, nullable=False)
    data = db.Column(db.JSON, nullable=False)

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
@app.route('/api/login')
def login():
    redirect_uri = url_for('auth_callback', _external=True)
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

    user = User.query.filter_by(google_id=user_info['id']).first()
    if not user:
        user = User(google_id=user_info['id'], email=user_info['email'], name=user_info.get('name'))
        db.session.add(user)
        db.session.commit()
    login_user(user)
    next_url = session.pop('next_url', 'http://localhost:3000/')
    return redirect(next_url)

@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({"success": True, "message": "Logged out successfully"})

@app.route('/api/dashboard', methods=['GET'])
@login_required
def get_dashboard_data():
    """Fetches recent log data for the main dashboard."""
    seven_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=7)
    
    logs = ActivityLog.query.filter(
        ActivityLog.user_id == current_user.id,
        ActivityLog.created_at >= seven_days_ago
    ).order_by(ActivityLog.created_at.asc()).all()
    
    # Process data for charting
    chart_data = [
        {
            "date": log.created_at.strftime('%Y-%m-%d'),
            # Use .get() for safe access to potentially missing keys in the JSON
            "score": log.data.get('score') if log.log_type == 'focus' else None,
            "sleep": log.data.get('sleep_hours') if log.log_type == 'life' else None,
        } for log in logs
    ]

    # Further processing to combine data for the same day if needed
    processed_data = {}
    for item in chart_data:
        date = item['date']
        if date not in processed_data:
            processed_data[date] = {'date': date}
        if item['score'] is not None:
            processed_data[date]['score'] = item['score']
        if item['sleep'] is not None:
            processed_data[date]['sleep'] = item['sleep']

    final_chart_data = list(processed_data.values())

    return jsonify({"chart_data": final_chart_data})

@app.route('/api/chat/focus', methods=['POST', 'OPTIONS'])
@login_required
def focus_chat():
    """Handles the conversational AI logic for focus session reporting."""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    data = request.get_json()
    message = data.get('message')
    history = data.get('history', [])
    known_duration = data.get('known_duration') # Optional pre-filled duration

    if not message:
        return jsonify({'error': 'Message is required'}), 400

    # Base prompt
    system_prompt = """あなたは、ユーザーの成果報告を聞き出す、親しみやすい専属コーチです。
会話履歴：
{chat_history}
ユーザーの最新のメッセージ：
「{user_message}」
"""

    # Dynamically change the instructions based on what information is already known
    if known_duration:
        system_prompt += f"""
あなたの目的は、ユーザーから**「タスク内容 (task_content)」**を聞き出すことです。
集中時間 ({known_duration}分) は既にわかっています。
タスク内容が不明な場合は、質問してください。
タスク内容が揃ったら、労いの言葉と共に、必ず文末に以下の形式で隠しデータを出力してください:
`JSON_DATA: {{"task_content": "...", "duration_minutes": {known_duration}}}`
"""
    else:
        system_prompt += """
あなたの目的は、ユーザーから**「タスク内容 (task_content)」と「集中時間 (duration_minutes)」**の2つを聞き出すことです。
情報が足りなければ質問してください。
情報が揃ったら、労いの言葉と共に、必ず文末に以下の形式で隠しデータを出力してください:
`JSON_DATA: {{"task_content": "...", "duration_minutes": ...}}`
"""
    
    system_prompt += "\nあなたの応答："
    
    # Format chat history for the prompt
    formatted_history = "\n".join([f"{msg['sender']}: {msg['text']}" for msg in history])
    
    prompt = system_prompt.format(chat_history=formatted_history, user_message=message)

    try:
        text_model = genai.GenerativeModel('gemini-2.5-flash')
        response = text_model.generate_content(prompt)
        
        return jsonify({'reply': response.text})

    except Exception as e:
        logging.error(f"Error during focus chat for user {current_user.id}: {e}")
        return jsonify({'error': 'AI is currently unavailable.'}), 500


# --- Refactored API Endpoints ---
@app.route('/api/activity/log', methods=['POST', 'OPTIONS'])
@login_required
def save_activity_log():
    """Saves a new activity log, handling AI scoring for focus logs."""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    data = request.get_json()
    log_type = data.get('log_type')
    log_data = data.get('data')

    if not log_type or not log_data or log_type not in ['focus', 'life']:
        return jsonify({'error': 'Invalid log data provided'}), 400

    try:
        if log_type == 'focus':
            # For focus logs, call AI to get score and feedback
            task_content = log_data.get('task_content')
            duration = log_data.get('duration_minutes')
            if not task_content or duration is None:
                return jsonify({'error': 'Missing task_content or duration_minutes for focus log'}), 400

            prompt = f"""ユーザーの成果報告を評価し、生産性スコア（仕事点）を0〜100点で採点し、簡潔なフィードバックを日本語で生成してください。
成果報告: 「{task_content}」
作業時間: {duration}分
出力は必ず以下のJSON形式とします。
{{"score": integer, "ai_feedback": "string"}}
"""
            try:
                json_model = genai.GenerativeModel(
                    'gemini-2.5-flash',
                    generation_config={"response_mime_type": "application/json"}
                )
                response = json_model.generate_content(prompt)
                ai_results = json.loads(response.text)
                
                # Add AI results to the data to be saved
                log_data['score'] = ai_results.get('score')
                log_data['ai_feedback'] = ai_results.get('ai_feedback')

            except Exception as ai_e:
                logging.error(f"AI scoring failed for user {current_user.id}: {ai_e}")
                # If AI fails, save with placeholder data
                log_data['score'] = 0
                log_data['ai_feedback'] = "AIによる評価に失敗しました。"

        # For 'life' logs, data is saved as is
        new_log = ActivityLog(
            user_id=current_user.id,
            log_type=log_type,
            data=log_data
        )
        db.session.add(new_log)
        db.session.commit()
        return jsonify({'message': 'Activity log saved successfully', 'log_id': new_log.id}), 201
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error saving activity log for user {current_user.id}: {e}")
        return jsonify({'error': 'An internal server error occurred.'}), 500

@app.route('/api/history', methods=['GET'])
@login_required
def get_history():
    try:
        logs = ActivityLog.query.filter_by(user_id=current_user.id).order_by(ActivityLog.created_at.desc()).all()
        result = [
            {
                "id": log.id,
                "user_id": log.user_id,
                "created_at": log.created_at.isoformat(),
                "log_type": log.log_type,
                "data": log.data
            } for log in logs
        ]
        return jsonify(result)
    except Exception as e:
        logging.error(f"Error fetching history for user {current_user.id}: {e}")
        return jsonify({'error': 'An internal server error occurred.'}), 500

@app.route('/api/feedback', methods=['GET', 'OPTIONS'])
@login_required
def get_feedback():
    """Generates holistic AI feedback based on recent activity logs."""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    try:
        seven_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=7)
        logs = ActivityLog.query.filter(
            ActivityLog.user_id == current_user.id,
            ActivityLog.created_at >= seven_days_ago
        ).order_by(ActivityLog.created_at.asc()).all()

        if len(logs) < 2:
            return jsonify({'feedback': 'フィードバックを生成するには、少なくとも2日以上の記録が必要です。'})

        # Create a simplified summary for the AI prompt
        log_summary = []
        for log in logs:
            entry = f"- Date: {log.created_at.strftime('%Y-%m-%d')}, Type: {log.log_type}, Data: {json.dumps(log.data)}"
            log_summary.append(entry)
        
        summary_text = "\n".join(log_summary)

        prompt = f"""あなたは、生産性向上のための優れたコーチングAIです。
以下のJSON形式のデータは、ユーザーの過去数日間の仕事(focus)と生活(life)のログです。

--- データ ---
{summary_text}
--- データ ---

上記のデータに基づき、仕事と生活の**相関関係を分析**し、以下の2点について具体的で、ユーザーを励ますようなフィードバックを日本語で生成してください。

1. **総括**: ユーザーの生産性と生活のバランスについて、良い点と改善点を3文以内で要約してください。（例：「集中して作業できていますが、睡眠時間が短い傾向があり、パフォーマンスに影響しているかもしれません。」）
2. **ワンポイントアドバイス**: 生産性とウェルビーイングを両立させるための、最も効果的で具体的な行動を2つ提案してください。精神論ではなく、すぐに実践できる仕組みや工夫を提案してください。
"""
        text_model = genai.GenerativeModel('gemini-2.5-flash')
        response = text_model.generate_content(prompt)
        
        return jsonify({'feedback': response.text})

    except Exception as e:
        logging.error(f"Error generating feedback for user {current_user.id}: {e}")
        return jsonify({'error': 'An internal server error occurred.'}), 500

# --- App Initialization Command ---
@app.cli.command("init-db")
def init_db_command():
    """Initializes the database by creating all tables."""
    db.create_all()
    print("Database initialized successfully.")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
