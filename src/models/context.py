from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    github_repo = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    contexts = db.relationship('Context', backref='project', lazy=True, cascade='all, delete-orphan')
    tasks = db.relationship('Task', backref='project', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'github_repo': self.github_repo,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'task_count': len(self.tasks),
            'context_count': len(self.contexts)
        }

class Context(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    context_type = db.Column(db.String(50), default='general')  # general, feature, bugfix, refactor
    git_commit = db.Column(db.String(40))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_current = db.Column(db.Boolean, default=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'title': self.title,
            'content': self.content,
            'context_type': self.context_type,
            'git_commit': self.git_commit,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_current': self.is_current
        }

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    task_type = db.Column(db.String(50), nullable=False)  # feature, bugfix, refactor, documentation
    priority = db.Column(db.String(20), default='medium')  # low, medium, high
    status = db.Column(db.String(20), default='pending')  # pending, in_progress, completed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    context_used = db.Column(db.Text)  # JSON string of context used for this task
    manus_session_notes = db.Column(db.Text)
    
    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'title': self.title,
            'description': self.description,
            'task_type': self.task_type,
            'priority': self.priority,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'context_used': json.loads(self.context_used) if self.context_used else None,
            'manus_session_notes': self.manus_session_notes
        }

class GitRepository(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    repo_url = db.Column(db.String(500), nullable=False)
    branch = db.Column(db.String(100), default='main')
    last_sync = db.Column(db.DateTime)
    access_token = db.Column(db.String(200))  # Encrypted in production
    
    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'repo_url': self.repo_url,
            'branch': self.branch,
            'last_sync': self.last_sync.isoformat() if self.last_sync else None
        }

