from flask import Blueprint, request, jsonify
from src.models.context import db, Project, Context, Task, GitRepository
from datetime import datetime
import json

context_bp = Blueprint('context', __name__)

# Project Management Routes
@context_bp.route('/projects', methods=['GET'])
def get_projects():
    """Get all projects"""
    projects = Project.query.all()
    return jsonify([project.to_dict() for project in projects])

@context_bp.route('/projects', methods=['POST'])
def create_project():
    """Create a new project"""
    data = request.get_json()
    
    if not data or 'name' not in data:
        return jsonify({'error': 'Project name is required'}), 400
    
    project = Project(
        name=data['name'],
        description=data.get('description', ''),
        github_repo=data.get('github_repo', '')
    )
    
    db.session.add(project)
    db.session.commit()
    
    return jsonify(project.to_dict()), 201

@context_bp.route('/projects/<int:project_id>', methods=['GET'])
def get_project(project_id):
    """Get a specific project"""
    project = Project.query.get_or_404(project_id)
    return jsonify(project.to_dict())

@context_bp.route('/projects/<int:project_id>', methods=['PUT'])
def update_project(project_id):
    """Update a project"""
    project = Project.query.get_or_404(project_id)
    data = request.get_json()
    
    if 'name' in data:
        project.name = data['name']
    if 'description' in data:
        project.description = data['description']
    if 'github_repo' in data:
        project.github_repo = data['github_repo']
    
    project.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify(project.to_dict())

@context_bp.route('/projects/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    """Delete a project"""
    project = Project.query.get_or_404(project_id)
    db.session.delete(project)
    db.session.commit()
    
    return jsonify({'message': 'Project deleted successfully'})

# Context Management Routes
@context_bp.route('/projects/<int:project_id>/contexts', methods=['GET'])
def get_contexts(project_id):
    """Get all contexts for a project"""
    contexts = Context.query.filter_by(project_id=project_id).order_by(Context.created_at.desc()).all()
    return jsonify([context.to_dict() for context in contexts])

@context_bp.route('/projects/<int:project_id>/contexts/current', methods=['GET'])
def get_current_context(project_id):
    """Get the current context for a project"""
    context = Context.query.filter_by(project_id=project_id, is_current=True).first()
    if not context:
        return jsonify({'error': 'No current context found'}), 404
    return jsonify(context.to_dict())

@context_bp.route('/projects/<int:project_id>/contexts', methods=['POST'])
def create_context(project_id):
    """Create a new context"""
    data = request.get_json()
    
    if not data or 'title' not in data or 'content' not in data:
        return jsonify({'error': 'Title and content are required'}), 400
    
    # Mark all other contexts as not current
    Context.query.filter_by(project_id=project_id, is_current=True).update({'is_current': False})
    
    context = Context(
        project_id=project_id,
        title=data['title'],
        content=data['content'],
        context_type=data.get('context_type', 'general'),
        git_commit=data.get('git_commit', ''),
        is_current=data.get('is_current', True)
    )
    
    db.session.add(context)
    db.session.commit()
    
    return jsonify(context.to_dict()), 201

@context_bp.route('/contexts/<int:context_id>', methods=['PUT'])
def update_context(context_id):
    """Update a context"""
    context = Context.query.get_or_404(context_id)
    data = request.get_json()
    
    if 'title' in data:
        context.title = data['title']
    if 'content' in data:
        context.content = data['content']
    if 'context_type' in data:
        context.context_type = data['context_type']
    if 'git_commit' in data:
        context.git_commit = data['git_commit']
    if 'is_current' in data:
        if data['is_current']:
            # Mark all other contexts as not current
            Context.query.filter_by(project_id=context.project_id, is_current=True).update({'is_current': False})
        context.is_current = data['is_current']
    
    db.session.commit()
    
    return jsonify(context.to_dict())

# Task Management Routes
@context_bp.route('/projects/<int:project_id>/tasks', methods=['GET'])
def get_tasks(project_id):
    """Get all tasks for a project"""
    tasks = Task.query.filter_by(project_id=project_id).order_by(Task.created_at.desc()).all()
    return jsonify([task.to_dict() for task in tasks])

@context_bp.route('/projects/<int:project_id>/tasks', methods=['POST'])
def create_task():
    """Create a new task"""
    data = request.get_json()
    
    if not data or 'title' not in data or 'task_type' not in data:
        return jsonify({'error': 'Title and task_type are required'}), 400
    
    task = Task(
        project_id=data['project_id'],
        title=data['title'],
        description=data.get('description', ''),
        task_type=data['task_type'],
        priority=data.get('priority', 'medium'),
        status=data.get('status', 'pending')
    )
    
    db.session.add(task)
    db.session.commit()
    
    return jsonify(task.to_dict()), 201

@context_bp.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    """Update a task"""
    task = Task.query.get_or_404(task_id)
    data = request.get_json()
    
    if 'title' in data:
        task.title = data['title']
    if 'description' in data:
        task.description = data['description']
    if 'task_type' in data:
        task.task_type = data['task_type']
    if 'priority' in data:
        task.priority = data['priority']
    if 'status' in data:
        task.status = data['status']
        if data['status'] == 'completed' and not task.completed_at:
            task.completed_at = datetime.utcnow()
    if 'context_used' in data:
        task.context_used = json.dumps(data['context_used'])
    if 'manus_session_notes' in data:
        task.manus_session_notes = data['manus_session_notes']
    
    db.session.commit()
    
    return jsonify(task.to_dict())

# Context Generation Routes
@context_bp.route('/projects/<int:project_id>/generate-context', methods=['POST'])
def generate_manus_context(project_id):
    """Generate context for Manus AI"""
    data = request.get_json()
    task_type = data.get('task_type', 'general')
    task_description = data.get('task_description', '')
    
    project = Project.query.get_or_404(project_id)
    current_context = Context.query.filter_by(project_id=project_id, is_current=True).first()
    recent_tasks = Task.query.filter_by(project_id=project_id).order_by(Task.created_at.desc()).limit(5).all()
    
    # Generate comprehensive context for Manus
    manus_context = f"""# Manus Task Context

## Project Information
- **Project:** {project.name}
- **Description:** {project.description}
- **Task Type:** {task_type}
- **Task Description:** {task_description}
- **Generated:** {datetime.utcnow().isoformat()}

## Current Project Context
"""
    
    if current_context:
        manus_context += f"""
### Current Context
{current_context.content}

### Context Type
{current_context.context_type}
"""
    
    if recent_tasks:
        manus_context += f"""
## Recent Task History
"""
        for task in recent_tasks:
            manus_context += f"""
### {task.title} ({task.task_type})
- **Status:** {task.status}
- **Priority:** {task.priority}
- **Created:** {task.created_at.strftime('%Y-%m-%d')}
- **Description:** {task.description}
"""
    
    manus_context += f"""
## Instructions for Manus
Please help me with: **{task_description}**

This is a {task_type} task for the {project.name} project. Use the context above to understand the current project state and provide appropriate assistance.

Focus on maintaining consistency with existing project structure and recent development patterns.
"""
    
    return jsonify({
        'context': manus_context,
        'project': project.to_dict(),
        'current_context': current_context.to_dict() if current_context else None,
        'recent_tasks': [task.to_dict() for task in recent_tasks]
    })

# Dashboard Stats Route
@context_bp.route('/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    """Get dashboard statistics"""
    total_projects = Project.query.count()
    total_tasks = Task.query.count()
    total_contexts = Context.query.count()
    completed_tasks = Task.query.filter_by(status='completed').count()
    pending_tasks = Task.query.filter_by(status='pending').count()
    
    return jsonify({
        'total_projects': total_projects,
        'total_tasks': total_tasks,
        'total_contexts': total_contexts,
        'completed_tasks': completed_tasks,
        'pending_tasks': pending_tasks,
        'completion_rate': (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    })

