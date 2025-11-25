import datetime
import json
import os
import time
import psycopg2
from psycopg2.extras import RealDictCursor
import google.generativeai as genai
from flask import Flask, request, jsonify, render_template

# --- Configuration ---
# Database connection details from environment variables
DB_NAME = os.getenv("POSTGRES_DB")
DB_USER = os.getenv("POSTGRES_USER")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD")
DB_HOST = os.getenv("DB_HOST", "db")

# Gemini API Key
GEMINI_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("No GOOGLE_API_KEY set for Flask application")

app = Flask(__name__)
app.json.ensure_ascii = False

# --- AI Configuration ---
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

# --- Database Management ---
def get_db_connection():
    """Establishes a connection to the PostgreSQL database."""
    conn = psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD)
    return conn

def init_db():
    """Initializes the database with a retry mechanism."""
    retries = 5
    delay = 5
    for i in range(retries):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS daily_log (
                id SERIAL PRIMARY KEY,
                date DATE UNIQUE NOT NULL,
                score INTEGER NOT NULL,
                note TEXT
            );
            """)
            conn.commit()
            cursor.close()
            conn.close()
            print("Database initialized successfully.")
            return
        except psycopg2.OperationalError as e:
            print(f"Database connection failed: {e}")
            if i < retries - 1:
                print(f"Retrying in {delay} seconds...")
                time.sleep(delay)
            else:
                print("Could not connect to the database after several retries.")
                raise

# --- Frontend Route ---
@app.route('/')
def index():
    """Serves the main HTML page."""
    return render_template('index.html')

# --- API Endpoints ---
@app.route('/api/score', methods=['POST'])
def save_score():
    data = request.get_json()
    if not data or not all(k in data for k in ['date', 'score']):
        return jsonify({'error': 'Missing data. "date" and "score" are required.'}), 400

    date = data['date']
    score = data['score']
    note = data.get('note', '')

    sql = """
        INSERT INTO daily_log (date, score, note)
        VALUES (%s, %s, %s)
        ON CONFLICT (date) DO UPDATE SET
            score = EXCLUDED.score,
            note = EXCLUDED.note;
    """
    
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute(sql, (date, score, note))
            conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Score saved successfully.'}), 201
    except Exception as e:
        return jsonify({'error': f'An unexpected error occurred: {e}'}), 500

@app.route('/api/scores', methods=['GET'])
def get_scores():
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute('SELECT date, score, note FROM daily_log ORDER BY date DESC')
            logs = cursor.fetchall()
        conn.close()
        # Convert date objects to strings
        for log in logs:
            if isinstance(log['date'], datetime.date):
                log['date'] = log['date'].isoformat()
        return jsonify(logs)
    except Exception as e:
        return jsonify({'error': f'Failed to fetch scores: {e}'}), 500

@app.route('/api/feedback', methods=['GET'])
def get_feedback():
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            seven_days_ago = (datetime.date.today() - datetime.timedelta(days=6)).isoformat()
            cursor.execute(
                'SELECT date, score, note FROM daily_log WHERE date >= %s ORDER BY date DESC',
                (seven_days_ago,)
            )
            logs = cursor.fetchall()
        conn.close()

        if not logs:
            return jsonify({'feedback': 'Not enough data for feedback. Please log your productivity for a few days.'})

        # Convert date objects to strings
        for log in logs:
            if isinstance(log['date'], datetime.date):
                log['date'] = log['date'].isoformat()
        
        prompt_template = f"""
あなたは、生産性向上のためのフィードバックを生成するAIアシスタントです。
以下のJSONデータは、ユーザーの過去数日間の生産性ログです。各オブジェクトは1日を表します。
- 'date': 日付
- 'score': 100点満点の生産性スコア
- 'note': その日の行動に関するメモや反省点
--- データ ---
{json.dumps(logs, indent=2, ensure_ascii=False)}
--- データ ---
上記のデータに基づいて、以下の分析とフィードバックを日本語で生成してください。回答のトーンは激励的でプロフェッショナルであること。
1. **ポジティブなパターン（1点）**: スコアが高い日に共通する行動や習慣を一つ特定し、ユーザーを褒めてください。
2. **改善すべき課題（1点）**: スコアが低い日に共通する問題点や非効率な行動を一つ特定してください。
3. **具体的な行動改善提案（3点）**: 課題を解決し、生産性レベルを「Prodigy」に近づけるための、具体的で実行可能な改善策を3つの箇条書き（ステップ）で提案してください。
"""
        response = model.generate_content(prompt_template)
        
        return jsonify({'feedback': response.text})

    except Exception as e:
        return jsonify({'error': f'Failed to generate feedback: {e}'}), 500

# --- App Initialization ---
# The init_db() is now better handled manually or with a startup script in a production environment.
# For this docker-compose setup, we will rely on the app starting and being able to connect.
# A simple init_db() call here might fail if the db is not ready.
# The command in docker-compose.yml has a sleep to mitigate this.
# A more robust solution would be a proper wait-for-it script.
# For now, let's add a manual init command for flask.
@app.cli.command("init-db")
def init_db_command():
    """Initializes the database."""
    init_db()
    print("Database initialization command finished.")
