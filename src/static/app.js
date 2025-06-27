// Manus Context Manager - Frontend Application
class ContextManager {
    constructor() {
        this.currentProject = null;
        this.projects = [];
        this.contexts = [];
        this.tasks = [];
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadDashboardData();
        this.showView('dashboard');
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                this.showView(view);
                this.setActiveNav(item);
            });
        });

        // Form submissions
        document.getElementById('create-project-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createProject();
        });

        // Filters
        document.getElementById('context-project-filter').addEventListener('change', () => {
            this.loadContexts();
        });

        document.getElementById('task-project-filter').addEventListener('change', () => {
            this.loadTasks();
        });

        document.getElementById('task-status-filter').addEventListener('change', () => {
            this.loadTasks();
        });

        // Generator project selection
        document.getElementById('generator-project').addEventListener('change', () => {
            this.updateGeneratorForm();
        });
    }

    showView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Show selected view
        document.getElementById(`${viewName}-view`).classList.add('active');

        // Load data for the view
        switch (viewName) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'projects':
                this.loadProjects();
                break;
            case 'contexts':
                this.loadContexts();
                break;
            case 'tasks':
                this.loadTasks();
                break;
            case 'generator':
                this.loadGeneratorData();
                break;
        }
    }

    setActiveNav(activeItem) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        activeItem.classList.add('active');
    }

    // API Methods
    async apiCall(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`/api${endpoint}`, options);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API call failed:', error);
            this.showToast('API call failed: ' + error.message, 'error');
            throw error;
        }
    }

    // Dashboard Methods
    async loadDashboardData() {
        try {
            this.showLoading();
            const [stats, projects] = await Promise.all([
                this.apiCall('/dashboard/stats'),
                this.apiCall('/projects')
            ]);

            this.updateDashboardStats(stats);
            this.updateRecentProjects(projects.slice(0, 5));
            this.projects = projects;
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            this.hideLoading();
        }
    }

    updateDashboardStats(stats) {
        document.getElementById('total-projects').textContent = stats.total_projects;
        document.getElementById('total-tasks').textContent = stats.total_tasks;
        document.getElementById('total-contexts').textContent = stats.total_contexts;
        document.getElementById('completion-rate').textContent = Math.round(stats.completion_rate) + '%';
    }

    updateRecentProjects(projects) {
        const container = document.getElementById('recent-projects-list');
        container.innerHTML = '';

        if (projects.length === 0) {
            container.innerHTML = '<p class="text-gray-500">No projects yet. Create your first project!</p>';
            return;
        }

        projects.forEach(project => {
            const projectElement = this.createProjectCard(project, true);
            container.appendChild(projectElement);
        });
    }

    // Project Methods
    async loadProjects() {
        try {
            this.showLoading();
            const projects = await this.apiCall('/projects');
            this.projects = projects;
            this.updateProjectsGrid(projects);
            this.updateProjectFilters(projects);
        } catch (error) {
            console.error('Failed to load projects:', error);
        } finally {
            this.hideLoading();
        }
    }

    updateProjectsGrid(projects) {
        const container = document.getElementById('projects-list');
        container.innerHTML = '';

        if (projects.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No projects yet. Create your first project!</p></div>';
            return;
        }

        projects.forEach(project => {
            const projectElement = this.createProjectCard(project);
            container.appendChild(projectElement);
        });
    }

    createProjectCard(project, compact = false) {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.onclick = () => this.selectProject(project);

        const date = new Date(project.created_at).toLocaleDateString();
        
        card.innerHTML = `
            <h3>${project.name}</h3>
            <p>${project.description || 'No description'}</p>
            <div class="project-meta">
                <span>${project.task_count} tasks</span>
                <span>${project.context_count} contexts</span>
                <span>Created ${date}</span>
            </div>
            ${!compact ? `
                <div class="project-actions">
                    <button class="btn btn-small btn-primary" onclick="event.stopPropagation(); this.generateContextForProject(${project.id})">
                        <i class="fas fa-magic"></i> Generate Context
                    </button>
                    <button class="btn btn-small btn-secondary" onclick="event.stopPropagation(); this.editProject(${project.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </div>
            ` : ''}
        `;

        return card;
    }

    async createProject() {
        const name = document.getElementById('project-name').value;
        const description = document.getElementById('project-description').value;
        const githubRepo = document.getElementById('project-github').value;

        if (!name.trim()) {
            this.showToast('Project name is required', 'error');
            return;
        }

        try {
            this.showLoading();
            const project = await this.apiCall('/projects', 'POST', {
                name: name.trim(),
                description: description.trim(),
                github_repo: githubRepo.trim()
            });

            this.showToast('Project created successfully!', 'success');
            this.hideCreateProjectModal();
            this.loadProjects();
            
            // Clear form
            document.getElementById('create-project-form').reset();
        } catch (error) {
            console.error('Failed to create project:', error);
        } finally {
            this.hideLoading();
        }
    }

    selectProject(project) {
        this.currentProject = project;
        this.showToast(`Selected project: ${project.name}`, 'success');
    }

    // Context Methods
    async loadContexts() {
        try {
            this.showLoading();
            const projectFilter = document.getElementById('context-project-filter').value;
            
            if (projectFilter) {
                const contexts = await this.apiCall(`/projects/${projectFilter}/contexts`);
                this.contexts = contexts;
            } else {
                // Load contexts for all projects
                const allContexts = [];
                for (const project of this.projects) {
                    const contexts = await this.apiCall(`/projects/${project.id}/contexts`);
                    allContexts.push(...contexts.map(c => ({ ...c, project_name: project.name })));
                }
                this.contexts = allContexts;
            }
            
            this.updateContextsList(this.contexts);
        } catch (error) {
            console.error('Failed to load contexts:', error);
        } finally {
            this.hideLoading();
        }
    }

    updateContextsList(contexts) {
        const container = document.getElementById('contexts-list');
        container.innerHTML = '';

        if (contexts.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No contexts found.</p></div>';
            return;
        }

        contexts.forEach(context => {
            const contextElement = this.createContextItem(context);
            container.appendChild(contextElement);
        });
    }

    createContextItem(context) {
        const item = document.createElement('div');
        item.className = 'context-item';

        const date = new Date(context.created_at).toLocaleDateString();
        
        item.innerHTML = `
            <h4>${context.title}</h4>
            <div class="context-meta">
                <span class="context-type">${context.context_type}</span>
                ${context.project_name ? `<span>Project: ${context.project_name}</span>` : ''}
                <span>Created: ${date}</span>
                ${context.is_current ? '<span class="badge badge-success">Current</span>' : ''}
            </div>
            <p>${context.content.substring(0, 200)}${context.content.length > 200 ? '...' : ''}</p>
        `;

        return item;
    }

    // Task Methods
    async loadTasks() {
        try {
            this.showLoading();
            const projectFilter = document.getElementById('task-project-filter').value;
            const statusFilter = document.getElementById('task-status-filter').value;
            
            if (projectFilter) {
                const tasks = await this.apiCall(`/projects/${projectFilter}/tasks`);
                this.tasks = tasks;
            } else {
                // Load tasks for all projects
                const allTasks = [];
                for (const project of this.projects) {
                    const tasks = await this.apiCall(`/projects/${project.id}/tasks`);
                    allTasks.push(...tasks.map(t => ({ ...t, project_name: project.name })));
                }
                this.tasks = allTasks;
            }

            // Apply status filter
            if (statusFilter) {
                this.tasks = this.tasks.filter(task => task.status === statusFilter);
            }
            
            this.updateTasksList(this.tasks);
        } catch (error) {
            console.error('Failed to load tasks:', error);
        } finally {
            this.hideLoading();
        }
    }

    updateTasksList(tasks) {
        const container = document.getElementById('tasks-list');
        container.innerHTML = '';

        if (tasks.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No tasks found.</p></div>';
            return;
        }

        tasks.forEach(task => {
            const taskElement = this.createTaskItem(task);
            container.appendChild(taskElement);
        });
    }

    createTaskItem(task) {
        const item = document.createElement('div');
        item.className = 'task-item';

        const date = new Date(task.created_at).toLocaleDateString();
        
        item.innerHTML = `
            <h4>${task.title}</h4>
            <div class="task-meta">
                <span class="task-type">${task.task_type}</span>
                <span class="task-priority ${task.priority}">${task.priority}</span>
                <span class="task-status ${task.status}">${task.status.replace('_', ' ')}</span>
                ${task.project_name ? `<span>Project: ${task.project_name}</span>` : ''}
                <span>Created: ${date}</span>
            </div>
            <p>${task.description || 'No description'}</p>
        `;

        return item;
    }

    // Generator Methods
    async loadGeneratorData() {
        try {
            const projects = await this.apiCall('/projects');
            this.updateGeneratorProjectSelect(projects);
        } catch (error) {
            console.error('Failed to load generator data:', error);
        }
    }

    updateGeneratorProjectSelect(projects) {
        const select = document.getElementById('generator-project');
        select.innerHTML = '<option value="">Choose a project...</option>';
        
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            select.appendChild(option);
        });

        // Update filters too
        this.updateProjectFilters(projects);
    }

    updateProjectFilters(projects) {
        const contextFilter = document.getElementById('context-project-filter');
        const taskFilter = document.getElementById('task-project-filter');
        
        [contextFilter, taskFilter].forEach(filter => {
            const currentValue = filter.value;
            filter.innerHTML = '<option value="">All Projects</option>';
            
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.name;
                filter.appendChild(option);
            });
            
            filter.value = currentValue;
        });
    }

    updateGeneratorForm() {
        const projectId = document.getElementById('generator-project').value;
        // Could add project-specific context here
    }

    async generateContext() {
        const projectId = document.getElementById('generator-project').value;
        const taskType = document.getElementById('generator-task-type').value;
        const description = document.getElementById('generator-description').value;

        if (!projectId || !description.trim()) {
            this.showToast('Please select a project and enter a task description', 'error');
            return;
        }

        try {
            this.showLoading();
            const result = await this.apiCall(`/projects/${projectId}/generate-context`, 'POST', {
                task_type: taskType,
                task_description: description.trim()
            });

            this.displayGeneratedContext(result.context);
            this.showToast('Context generated successfully!', 'success');
        } catch (error) {
            console.error('Failed to generate context:', error);
        } finally {
            this.hideLoading();
        }
    }

    displayGeneratedContext(context) {
        const container = document.getElementById('generated-context');
        const output = document.getElementById('context-output');
        
        output.textContent = context;
        container.style.display = 'block';
        
        // Scroll to the generated context
        container.scrollIntoView({ behavior: 'smooth' });
    }

    // Utility Methods
    showLoading() {
        document.getElementById('loading-overlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading-overlay').style.display = 'none';
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    showCreateProjectModal() {
        document.getElementById('create-project-modal').classList.add('show');
    }

    hideCreateProjectModal() {
        document.getElementById('create-project-modal').classList.remove('show');
    }

    async copyToClipboard() {
        const context = document.getElementById('context-output').textContent;
        try {
            await navigator.clipboard.writeText(context);
            this.showToast('Context copied to clipboard!', 'success');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.showToast('Failed to copy to clipboard', 'error');
        }
    }

    downloadContext() {
        const context = document.getElementById('context-output').textContent;
        const blob = new Blob([context], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'manus-context.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Context downloaded!', 'success');
    }
}

// Global functions for HTML onclick handlers
function showCreateProjectModal() {
    app.showCreateProjectModal();
}

function hideCreateProjectModal() {
    app.hideCreateProjectModal();
}

function createProject() {
    app.createProject();
}

function generateContext() {
    app.generateContext();
}

function copyToClipboard() {
    app.copyToClipboard();
}

function downloadContext() {
    app.downloadContext();
}

// Initialize the application
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ContextManager();
});

