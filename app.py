
import sqlite3
import datetime
from flask import Flask, request, jsonify, render_template, g

app = Flask(__name__)
DATABASE = 'prodigy_habit.db'

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    with app.app_context():
        db = get_db()
        with app.open_resource('schema.sql', mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()

def init_db_command():
    """Initializes the database."""
    db = sqlite3.connect(DATABASE)
    cursor = db.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        score INTEGER NOT NULL,
        memo TEXT,
        date TEXT NOT NULL UNIQUE
    );
    """)
    db.commit()
    db.close()
    print("Initialized the database.")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/save_score', methods=['POST'])
def save_score():
    data = request.get_json()
    score = data['score']
    memo = data['memo']
    date = datetime.date.today().isoformat()

    try:
        db = get_db()
        cursor = db.cursor()
        # Use INSERT OR REPLACE to handle cases where an entry for the same day already exists
        cursor.execute(
            "INSERT OR REPLACE INTO scores (id, score, memo, date) VALUES ((SELECT id FROM scores WHERE date = ?), ?, ?, ?)",
            (date, score, memo, date)
        )
        db.commit()
        return jsonify({'status': 'success'})
    except sqlite3.Error as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/get_scores', methods=['GET'])
def get_scores():
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Get scores from the last 7 days
        seven_days_ago = (datetime.date.today() - datetime.timedelta(days=6)).isoformat()
        cursor.execute(
            "SELECT score, memo, date FROM scores WHERE date >= ? ORDER BY date DESC",
            (seven_days_ago,)
        )
        scores_data = [dict(row) for row in cursor.fetchall()]

        # Calculate average
        total_score = sum(item['score'] for item in scores_data)
        average = total_score / len(scores_data) if scores_data else 0

        return jsonify({
            'scores': scores_data,
            'average': round(average, 2)
        })
    except sqlite3.Error as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    with app.app_context():
        init_db_command()
    app.run(debug=True, port=5001)

