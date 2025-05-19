import subprocess
import os
import tempfile
import logging
import json

# Configure logging
logger = logging.getLogger(__name__)

# YASS format piece identifiers
VALID_PIECES = {'3', 'l', 't', 'z', 'p', 'n', 'c', '.'}  # Including '.' for empty cells

SOLUTIONS_FILE = 'solutions.json'

def load_solutions():
    if not os.path.exists(SOLUTIONS_FILE):
        return set()

    try:
        with open(SOLUTIONS_FILE, 'r') as f:
            solutions = json.load(f)
            return {normalize_solution(s) for s in solutions}
    except Exception as e:
        logger.error(f"Error loading solutions: {str(e)}")
        return set()

def save_solutions(solutions):
    try:
        normalized_solutions = {normalize_solution(s) for s in solutions}
        with open(SOLUTIONS_FILE, 'w') as f:
            json.dump(list(normalized_solutions), f)
    except Exception as e:
        logger.error(f"Error saving solutions: {str(e)}")

def add_solution(solution):
    solutions = load_solutions()
    normalized = normalize_solution(solution)
    
    # Check if any rotation of this solution already exists
    if normalized not in solutions:
        solutions.add(normalized)
        save_solutions(solutions)
        return True
    return False

def is_solution_known(solution):
    """Check if a solution is already known (including rotations)"""
    solutions = load_solutions()
    normalized = normalize_solution(solution)
    return normalized in solutions

def run_yass_solver(input_file, get_all_solutions=False):
    """Run the yass solver with the given input file and return the result"""
    try:
        cmd = ["./yass/soma"]
        if get_all_solutions:
            cmd.extend(["-a", input_file])
        else:
            cmd.append(input_file)
        logger.debug(f"Running command: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            logger.error(f"Solver error: {result.stderr}")
            return None
        return result.stdout
    except Exception as e:
        logger.error(f"Error running yass solver: {str(e)}")
        return None

def create_temp_file(content):
    """Create a temporary file with the given content"""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.soma', delete=False) as f:
        f.write(content)
        return f.name

def is_valid_placement(grid_state):
    """Check if the grid state is valid"""
    logger.debug(f"Validating grid state: {grid_state}")
    
    # Split into layers
    layers = grid_state.strip().split('\n\n')
    logger.debug(f"Number of layers: {len(layers)}")
    
    if len(layers) != 3:
        logger.debug(f"Invalid layer count: {len(layers)}")
        return False
    
    # Check each layer
    for i, layer in enumerate(layers):
        rows = layer.split('\n')
        logger.debug(f"Layer {i} rows: {rows}")
        
        if len(rows) != 3:
            logger.debug(f"Invalid row count in layer {i}: {len(rows)}")
            return False
        
        for j, row in enumerate(rows):
            if len(row) != 3:
                logger.debug(f"Invalid row length in layer {i}, row {j}: {len(row)}")
                return False
            
            # Check if all characters are valid
            for k, char in enumerate(row):
                if char not in VALID_PIECES:
                    logger.debug(f"Invalid character '{char}' at layer {i}, row {j}, col {k}")
                    return False
    
    logger.debug("Grid state validation passed")
    return True

def normalize_solution(solution):
    """Normalize a solution by rotating it to a canonical form"""
    # Split into layers
    layers = solution.strip().split('\n\n')
    if len(layers) != 3:
        return solution.strip()
    
    # Convert to 3D array for easier manipulation
    grid = []
    for layer in layers:
        rows = layer.split('\n')
        if len(rows) != 3:
            return solution.strip()
        grid.append([list(row) for row in rows])
    
    # Try all possible rotations and return the lexicographically smallest
    min_solution = solution.strip()
    
    def rotate_2d_90_clockwise(matrix):
        # Rotate a 2D matrix 90 degrees clockwise
        return [list(row) for row in zip(*matrix[::-1])]
    
    def rotate_2d_90_counterclockwise(matrix):
        # Rotate a 2D matrix 90 degrees counterclockwise
        return [list(row) for row in zip(*matrix)][::-1]
    
    def rotate_cube_x(grid):
        # Rotate the entire cube around X axis
        # Rotate each layer 90 degrees clockwise
        return [rotate_2d_90_clockwise(layer) for layer in grid]
    
    def rotate_cube_y(grid):
        # Rotate the entire cube around Y axis
        # For Y rotation, we need to transpose the layers and rotate them
        transposed = list(zip(*grid))
        return [rotate_2d_90_clockwise(list(layer)) for layer in transposed]
    
    def rotate_cube_z(grid):
        # Rotate the entire cube around Z axis
        # For Z rotation, we rotate each layer in place
        return [rotate_2d_90_clockwise(layer) for layer in grid]
    
    def grid_to_string(grid):
        # Convert 3D grid to string representation
        layers = []
        for layer in grid:
            rows = [''.join(row) for row in layer]
            layers.append('\n'.join(rows))
        return '\n\n'.join(layers)
    
    # Try all possible rotations
    for _ in range(4):
        for _ in range(4):
            for _ in range(4):
                current_str = grid_to_string(grid)
                if current_str < min_solution:
                    min_solution = current_str

                grid = rotate_cube_x(grid)
            grid = rotate_cube_y(grid)
        grid = rotate_cube_z(grid)
    
    return min_solution

def extract_solution_from_output(output):
    """Extract the solution from the solver's output"""
    # Split by double newlines to get potential solutions
    parts = output.split('\n\n')
    
    for part in parts:
        lines = [line.strip() for line in part.split('\n') if line.strip()]
        if not lines or not lines[0].startswith('solution #'):
            continue
            
        # Skip the "solution #" line and get the actual solution
        solution_lines = lines[1:]
        if len(solution_lines) == 9:  # 3 layers of 3 rows each
            # Group into layers
            layers = [solution_lines[i:i+3] for i in range(0, 9, 3)]
            if all(len(layer) == 3 and all(len(row) == 3 for row in layer) for layer in layers):
                return '\n\n'.join('\n'.join(layer) for layer in layers)
    return None

def extract_all_solutions(output):
    """Extract all solutions from the solver's output"""
    solutions = []
    current_solution = []
    in_solution = False
    
    for line in output.split('\n'):
        line = line.strip()
        if not line:
            continue
            
        if line.startswith('solution #'):
            if current_solution:
                solution = []
                for i in range(0, 9, 3):
                    layer = '\n'.join(current_solution[i:i+3])
                    solution.append(layer)
                solutions.append('\n\n'.join(solution))
            current_solution = []
            in_solution = True
            continue
            
        if in_solution and len(current_solution) < 9:
            current_solution.append(line)
            
    # Add the last solution if exists
    if current_solution:
        solution = []
        for i in range(0, 9, 3):
            layer = '\n'.join(current_solution[i:i+3])
            solution.append(layer)
        solutions.append('\n\n'.join(solution))
        
    return solutions 