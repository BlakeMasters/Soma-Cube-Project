from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import logging
from parse_shapes import get_available_pieces, get_available_shapes, get_shape_definition
from utils import *

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/grid')
def get_grid():
    # For now, return a simple 3x3x3 grid definition
    # This can be expanded later to support different grid types
    grid = {
        "type": "cube",
        "dimensions": [3, 3, 3],
        "definition": "..." # Add your grid definition here
    }
    return jsonify(grid)

@app.route('/api/pieces')
def get_pieces():
    try:
        pieces = get_available_shapes()
        return jsonify(pieces)
    except Exception as e:
        logger.error(f"Error getting pieces: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/check-solution', methods=['POST'])
def check_solution():
    """Check if the current state is a valid solution"""
    try:
        data = request.json
        if not data or 'grid_state' not in data:
            logger.error("Missing grid state in request")
            return jsonify({
                "valid": False,
                "message": "Error: Missing grid state",
                "is_new": False
            }), 400

        # Get the grid state in yass format
        yass_format = data['grid_state']
        logger.debug(f"Received yass format:\n{yass_format}")

        # First check if the format is valid
        if not is_valid_placement(yass_format):
            logger.error("Invalid grid format")
            return jsonify({
                "valid": False,
                "message": "Invalid grid format. Please make sure all cells are properly filled.",
                "is_new": False
            })

        # Convert to solver format
        solver_format = (yass_format).strip()
        logger.debug(f"Converted to solver format:\n{solver_format}")
        
        if is_solution_known(solver_format):
            return jsonify({
                "valid": True,
                "message": "You have already found this solution!",
                "is_new": False
            })
        
        # Create temporary file and check solution
        input_file = create_temp_file(solver_format)
        try:
            # First check if it's a valid solution
            result = run_yass_solver(input_file)
            logger.debug(f"Initial solver result:\n{result}")
            
            if not result:
                return jsonify({
                    "valid": False,
                    "message": "Failed to check solution. Please try again.",
                    "is_new": False
                })
            
            # Extract the solution from the output
            solution = extract_solution_from_output(result)
            logger.debug(f"Extracted solution:\n{solution}")
            
            if solution:
                # If we found a solution, normalize both solutions for comparison
                normalized_current = normalize_solution(solver_format)
                normalized_solution = normalize_solution(solution)
                logger.debug(f"Normalized current solution:\n{normalized_current}")
                logger.debug(f"Normalized extracted solution:\n{normalized_solution}")
                
                is_valid = normalized_current == normalized_solution
                if is_valid:
                    # Add the solution to our solutions file
                    is_new = add_solution(solver_format)
                    return jsonify({
                        "valid": True,
                        "message": "Yay! You found a new solution!" if is_new else "You have already found this solution!",
                        "is_new": is_new
                    })
                return jsonify({
                    "valid": False,
                    "message": "This is not a valid solution. Keep trying!",
                    "is_new": False
                })
            
            # If no solution found in initial check, try getting all solutions
            all_solutions_output = run_yass_solver(input_file, get_all_solutions=True)
            logger.debug(f"All solutions:\n{all_solutions_output}")
            
            if all_solutions_output:
                # Extract all solutions from the output
                solutions = extract_all_solutions(all_solutions_output)
                logger.debug(f"Extracted {len(solutions)} solutions")
                
                # Normalize the current solution
                current_solution = normalize_solution(solver_format)
                logger.debug(f"Normalized current solution:\n{current_solution}")
                
                # Check if current solution matches any of the valid solutions
                for solution in solutions:
                    normalized_solution = normalize_solution(solution)
                    logger.debug(f"Comparing with normalized solution:\n{normalized_solution}")
                    if current_solution == normalized_solution:
                        logger.debug("Found matching solution!")
                        # Add the solution to our solutions file
                        is_new = add_solution(solver_format)
                        return jsonify({
                            "valid": True,
                            "message": "Yay! You found a new solution!" if is_new else "You have already found this solution!",
                            "is_new": is_new
                        })
                
                logger.debug("No matching solution found")
                return jsonify({
                    "valid": False,
                    "message": "Something is wrong with the solver.",
                    "is_new": False
                })
            else:
                return jsonify({
                    "valid": False,
                    "message": "Failed to get all solutions.",
                    "is_new": False
                })
        finally:
            os.unlink(input_file)
    except Exception as e:
        logger.error(f"Error checking solution: {str(e)}")
        return jsonify({
            "valid": False,
            "message": f"An error occurred: {str(e)}",
            "is_new": False
        }), 500

@app.route('/api/get-hint', methods=['POST'])
def get_hint():
    try:
        data = request.json
        if not data or 'grid_state' not in data:
            return jsonify({"error": "Missing grid state"}), 400

        yass_format = (data['grid_state']).strip()
        input_file = create_temp_file(yass_format)

        try:
            # Check if current state is solvable
            result = run_yass_solver(input_file)
            if not result or "solution" not in result.lower():
                return jsonify({"error": "Current state is not solvable"}), 400

            # Get all solutions
            result = run_yass_solver(input_file, get_all_solutions=True)
            if not result:
                return jsonify({"error": "Failed to get solutions"}), 500

            # Get the first solution as a hint
            solutions = result.split("\n\n")
            if not solutions:
                return jsonify({"error": "No solutions found"}), 400

            hint_solution = solutions[0]
            
            # Find the first piece in the hint that's not in current state
            current_pieces = set()
            for line in yass_format.split('\n'):
                for char in line:
                    if char in '3ltzpnc':  # YASS format piece identifiers
                        current_pieces.add(char)
            
            # Compare current state with hint solution
            current_lines = yass_format.split('\n')
            hint_lines = hint_solution.split('\n')
            
            next_piece = None
            next_position = None
            
            for y in range(len(current_lines)):
                for x in range(len(current_lines[y])):
                    current_char = current_lines[y][x]
                    hint_char = hint_lines[y][x]
                    
                    if hint_char in '3ltzpnc' and current_char not in '3ltzpnc':
                        next_piece = hint_char
                        next_position = (x, y)
                        break
                if next_piece:
                    break
            
            if next_piece:
                piece_names = {
                    '3': 'V Shape',
                    'l': 'L Shape',
                    't': 'T Shape',
                    'z': 'Z Shape',
                    'p': 'A Shape',
                    'n': 'B Shape',
                    'c': 'Corner Shape'
                }
                hint_message = f"Try placing the {piece_names.get(next_piece, next_piece)} at position ({next_position[0]}, {next_position[1]})"
            else:
                hint_message = "You're on the right track! Keep going!"
                
            return jsonify({"hint": hint_message})
        finally:
            os.unlink(input_file)
    except Exception as e:
        logger.error(f"Error getting hint: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    logger.info("Starting Flask application")
    app.run(debug=True, port=5000)