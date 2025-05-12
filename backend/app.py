from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import subprocess
import os
import json
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)  # Enable CORS for all routes

# Load shapes data
def load_shapes():
    try:
        shapes_path = os.path.join(os.path.dirname(__file__), 'shapes.json')
        logger.debug(f"Loading shapes from: {shapes_path}")
        with open(shapes_path, 'r') as f:
            shapes = json.load(f)
            logger.debug(f"Successfully loaded {len(shapes)} shapes")
        return shapes
    except Exception as e:
        logger.error(f"Error loading shapes: {str(e)}")
        return []

@app.route('/')
def serve_index():
    logger.debug("Serving index.html")
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/shapes')
def get_shapes():
    logger.debug("Received request for shapes")
    try:
        shapes = load_shapes()
        logger.debug(f"Returning {len(shapes)} shapes")
        return jsonify(shapes)
    except Exception as e:
        logger.error(f"Error in get_shapes: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/solve', methods=['POST'])
def solve():
    try:
        data = request.json
        if not data or 'cube' not in data:
            return jsonify({"error": "Missing cube data"}), 400
            
        input_file = "input.soma"
        with open(input_file, 'w') as f:
            f.write(data['cube'])
            
        result = subprocess.run(["./yass/soma", input_file], capture_output=True, text=True)
        return jsonify({"output": result.stdout})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/hint', methods=['POST'])
def hint():
    try:
        data = request.json
        if not data or 'cube' not in data:
            return jsonify({"error": "Missing cube data"}), 400
            
        input_file = "input.soma"
        with open(input_file, 'w') as f:
            f.write(data['cube'])
            
        result = subprocess.run(["./yass/soma", input_file, "-a"], capture_output=True, text=True)
        solutions = result.stdout.split("\n\n")
        hint_solution = solutions[0] if solutions else "No solution found."
        return jsonify({"hint": hint_solution})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/validate', methods=['POST'])
def validate():
    try:
        data = request.json
        if not data or 'cube' not in data:
            return jsonify({"error": "Missing cube data"}), 400
            
        input_file = "input.soma"
        with open(input_file, 'w') as f:
            f.write(data['cube'])
            
        result = subprocess.run(["./yass/soma", input_file], capture_output=True, text=True)
        is_valid = "solution" in result.stdout.lower()
        return jsonify({"valid": is_valid})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/validate_orientation', methods=['POST'])
def validate_orientation():
    try:
        data = request.json
        if not data or 'cube' not in data:
            return jsonify({"error": "Missing cube data"}), 400
            
        input_file = "input_orientation.soma"
        with open(input_file, 'w') as f:
            f.write(data['cube'])
            
        result = subprocess.run(["./yass/soma", input_file], capture_output=True, text=True)
        is_valid = "solution" in result.stdout.lower()
        return jsonify({"valid": is_valid, "output": result.stdout})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    logger.info("Starting Flask application")
    app.run(debug=True, port=5000)