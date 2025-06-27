import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS
from models.context import db
from routes.context import context_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'manus-context-manager-secret-key-2024'

# Enable CORS for all routes
CORS(app)

# Register context management blueprint
app.register_blueprint(context_bp, url_prefix='/api')

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Create database tables
with app.app_context():
db.create_all()

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
static_folder_path = app.static_folder
if static_folder_path is None:
return "Static folder not configured", 404

if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
return send_from_directory(static_folder_path, path)
else:
index_path = os.path.join(static_folder_path, 'index.html')
if os.path.exists(index_path):
return send_from_directory(static_folder_path, 'index.html')
else:
return "index.html not found", 404
:
# Railway deployment configuration
port = int(os.environ.get('PORT', 5000))
app.run(host='0.0.0.0', port=port, debug=False)
