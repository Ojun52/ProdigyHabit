import datetime
import json
import os
import sqlite3

import google.generativeai as genai
from flask import Flask, g, jsonify, render_template, request

# --- Configuration ---
DATABASE = 'productivity.db'
GEMINI_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("No GOOGLE_API_KEY set for Flask application")

app = Flask(__name__)
app.config['DATABASE'] = DATABASE
app.json.ensure_ascii = False

# --- AI Configuration ---
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

# --- Database Management ---


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(
            app.config['DATABASE'], detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(app.config['DATABASE'])
    cursor = db.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS daily_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT UNIQUE NOT NULL,
        score INTEGER NOT NULL,
        note TEXT
    );
    """)
    db.commit()
    db.close()
    print("Initialized the database.")

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

    sql = ''' INSERT OR REPLACE INTO daily_log (id, date, score, note)
              VALUES ((SELECT id FROM daily_log WHERE date = ?), ?, ?, ?) '''

    try:
        db = get_db()
        db.execute(sql, (date, date, score, note))
        db.commit()
        return jsonify({'success': True, 'message': 'Score saved successfully.'}), 201
    except sqlite3.IntegrityError as e:
        return jsonify({'error': f'Database integrity error: {e}'}), 500
    except Exception as e:
        return jsonify({'error': f'An unexpected error occurred: {e}'}), 500


@app.route('/api/feedback', methods=['GET'])
def get_feedback():
    try:
        db = get_db()
        seven_days_ago = (datetime.date.today() -
                          datetime.timedelta(days=6)).isoformat()

        logs = db.execute(
            'SELECT date, score, note FROM daily_log WHERE date >= ? ORDER BY date DESC',
            (seven_days_ago,)
        ).fetchall()

        if not logs:
            return jsonify({'feedback': 'Not enough data for feedback. Please log your productivity for a few days.'})

        log_data = [dict(log) for log in logs]

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
3. **具体的な行動改善提案（3点）**: 課題を解決し、生産性レベルを「Prodigy」に近づけるための、具体的で実行可能な改善策を3つの箇条書き（ステップ）で提案してください。
"""
        response = model.generate_content(prompt_template)

        return jsonify({'feedback': response.text})

    except Exception as e:
        return jsonify({'error': f'Failed to generate feedback: {e}'}), 500


# --- App Initialization ---
if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5002)
    app.run(debug=True, port=5002)
