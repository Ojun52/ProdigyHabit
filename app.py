import datetime
import json
import os
import time

import google.generativeai as genai
from flask import Flask, jsonify, redirect, render_template, request, url_for
from flask_sqlalchemy import SQLAlchemy

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

db = SQLAlchemy(app)

# --- AI Configuration ---
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

# --- Database Model ---


class DailyLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, unique=True, nullable=False)
    score = db.Column(db.Integer, nullable=False)
    note = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            "date": self.date.isoformat(),
            "score": self.score,
            "note": self.note
        }

# --- Frontend Routes ---


@app.route('/')
def index():
    """Redirects to the main entry page."""
    return redirect(url_for('entry'))


@app.route('/entry')
def entry():
    """Renders the score entry page."""
    return render_template('entry.html')


@app.route('/history')
def history():
    """Renders the score history page."""
    return render_template('history.html')


@app.route('/feedback')
def feedback():
    """Renders the AI feedback page."""
    return render_template('feedback.html')

# --- API Endpoints ---


@app.route('/api/score', methods=['POST'])
def save_score():
    data = request.get_json()
    if not data or not all(k in data for k in ['date', 'score']):
        return jsonify({'error': 'Missing data. "date" and "score" are required.'}), 400

    try:
        log_date = datetime.datetime.strptime(data['date'], '%Y-%m-%d').date()

        # Find existing log or create a new one
        log = DailyLog.query.filter_by(date=log_date).first()
        if log:
            # Update existing log
            log.score = data['score']
            log.note = data.get('note', '')
        else:
            # Create new log
            log = DailyLog(
                date=log_date,
                score=data['score'],
                note=data.get('note', '')
            )
            db.session.add(log)

        db.session.commit()
        return jsonify({'success': True, 'message': 'Score saved successfully.'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'An unexpected error occurred: {e}'}), 500


@app.route('/api/scores', methods=['GET'])
def get_scores():
    date_str = request.args.get('date')
    try:
        if date_str:
            target_date = datetime.datetime.strptime(
                date_str, '%Y-%m-%d').date()
        else:
            target_date = datetime.date.today()

        start_of_week = target_date - \
            datetime.timedelta(days=target_date.weekday())
        end_of_week = start_of_week + datetime.timedelta(days=6)

        logs = DailyLog.query.filter(
            DailyLog.date >= start_of_week,
            DailyLog.date <= end_of_week
        ).order_by(DailyLog.date.asc()).all()

        return jsonify({
            "week_start": start_of_week.isoformat(),
            "week_end": end_of_week.isoformat(),
            "logs": [log.to_dict() for log in logs]
        })
    except Exception as e:
        return jsonify({'error': f'Failed to fetch scores: {e}'}), 500


@app.route('/api/feedback', methods=['GET'])
def get_feedback():
    try:
        seven_days_ago = datetime.date.today() - datetime.timedelta(days=6)
        logs = DailyLog.query.filter(
            DailyLog.date >= seven_days_ago
        ).order_by(DailyLog.date.desc()).all()

        if not logs:
            return jsonify({'feedback': 'Not enough data for feedback. Please log your productivity for a few days.'})

        log_data = [log.to_dict() for log in logs]

        prompt_template = f"""
あなたは、生産性向上のためのフィードバックを生成するAIアシスタントです。
以下のJSONデータは、ユーザーの過去数日間の生産性ログです。各オブジェクトは1日を表します。
- 'date': 日付
- 'score': 100点満点の生産性スコア
- 'note': その日の行動に関するメモや反省点
--- データ ---
{json.dumps(log_data, indent=2, ensure_ascii=False)}
--- データ ---
上記のデータに基づいて、以下の分析とフィードバックを日本語で生成してください。回答のトーンは激励的でプロフェッショナルであること。
1. **ポジティブなパターン（1点）**: スコアが高い日に共通する行動や習慣を一つ特定し、ユーザーを褒めてください。
2. **改善すべき課題（1点）**: スコアが低い日に共通する問題点や非効率な行動を一つ特定してください。
3. **具体的な行動改善提案（3点）**: 課題を解決し、生産性レベルを向上させるための、具体的で実行可能な改善策を3つの箇条書き（ステップ）で提案してください。
"""
        response = model.generate_content(prompt_template)

        return jsonify({'feedback': response.text})

    except Exception as e:
        return jsonify({'error': f'Failed to generate feedback: {e}'}), 500

# --- App Initialization ---


@app.cli.command("init-db")
def init_db_command():
    """Initializes the database by creating all tables."""
    # A short delay to allow the DB container to be ready
    # In a real-world app, use a more robust wait-for-it script
    from sqlalchemy.exc import OperationalError
    retries = 5
    delay = 5
    for i in range(retries):
        try:
            db.create_all()
            print("Database initialized successfully.")
            return
        except OperationalError as e:
            print(f"Database connection failed: {e}")
            if i < retries - 1:
                print(f"Retrying in {delay} seconds...")
                time.sleep(delay)
            else:
                print("Could not connect to the database after several retries.")
                raise
                raise
