import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin

db = SQLAlchemy() # This will be initialized by app.py

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    google_id = db.Column(db.String(128), unique=True, nullable=False)
    email = db.Column(db.String(128), unique=True, nullable=False)
    name = db.Column(db.String(128), nullable=True)
    activity_logs = db.relationship('ActivityLog', backref='user', lazy=True)
    ai_usage_logs = db.relationship('AiUsageLog', backref='user', lazy=True)


class ActivityLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow)
    log_type = db.Column(db.String, nullable=False)
    data = db.Column(db.JSON, nullable=False)

class AiUsageLog(db.Model):
    __tablename__ = 'ai_usage_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    used_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow)
    feature_type = db.Column(db.String(50), nullable=False) # 'focus' or 'lounge'
