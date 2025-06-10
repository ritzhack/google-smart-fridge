# /home/ubuntu/smart_fridge_app/backend/smart_fridge_api/src/main.py
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv("../../.venv/.env", override=True)

# THIS IS CRITICAL FOR THE FLASK APP TO FIND MODULES IN THE SRC DIRECTORY
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, jsonify
from flask_cors import CORS  # Import CORS
from routes.inventory_routes import inventory_bp
from routes.recipe_routes import recipe_bp
from routes.notification_routes import notification_bp
from db_connector import get_db_instance  # Import to initialize DB connection at startup

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Register Blueprints
app.register_blueprint(inventory_bp)
app.register_blueprint(recipe_bp)
app.register_blueprint(notification_bp)

@app.route("/")
def health_check():
    return jsonify({"status": "healthy", "message": "Smart Fridge API is running!"})

if __name__ == "__main__":
    # Get port from environment variable or default to 5001
    port = int(os.environ.get('PORT', 5001))
    # Enable debug mode in development
    debug = os.environ.get('FLASK_ENV', 'development') == 'development'
    
    # Ensure MongoDB Atlas environment variables are available
    mongo_uri = os.environ.get('MONGODB_URI')
    if mongo_uri:
        print(f"MongoDB Atlas URI is configured")
    else:
        print("Warning: MONGODB_URI environment variable not set. Please set it in your .env file.")
    
    # Initialize DB connection
    db = get_db_instance()
    if db is None:
        print("Failed to connect to MongoDB. Check your configuration.")
    
    # Make sure to run on 0.0.0.0 to be accessible externally if needed (e.g. for frontend dev)
    app.run(host="0.0.0.0", port=port, debug=debug)

