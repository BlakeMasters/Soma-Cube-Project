import os
import json

# This file handles conversion between GUI grid state and yass text format
# as well as parsing .soma files for shape definitions
# In the future we plan to add a database of shapes and allow users to upload their own shapes
# For now, we will stick with the 7 unique shapes below. See constants.js for more
# We also plan to make this GUI work for any grid size / shape, for now we will stick with 3x3x3

# YASS format piece identifiers
VALID_PIECES = {'3', 'l', 't', 'z', 'p', 'n', 'c', '.'}  # Including '.' for empty cells

def load_shape_file(file_path):
    try:
        with open(file_path, 'r') as f:
            return f.read()
    except Exception as e:
        print(f"Error loading shape file: {str(e)}")
        return None

def get_grid_size(yass_format):
    layers = yass_format.strip().split('\n\n')
    if not layers:
        return (0, 0, 0)

    width = len(layers[0].split('\n')[0])
    height = len(layers[0].strip().split('\n'))
    depth = len(layers)
    
    return (width, height, depth)

def parse_soma_file(file_path):
    """Parse a .soma file and return the layers"""
    with open(file_path, 'r') as f:
        layers = []
        current_layer = []
        for line in f:
            line = line.strip()
            if not line:
                if current_layer:
                    layers.append(current_layer)
                    current_layer = []
            else:
                current_layer.append(line)
        if current_layer:
            layers.append(current_layer)
    return layers

def get_available_shapes():
    """Get list of available shapes from the figures directory"""
    shapes = []
    figures_dir = os.path.join(os.path.dirname(__file__), 'yass', 'figures')
    
    for file_name in os.listdir(figures_dir):
        if file_name.endswith('.soma'):
            shape_name = os.path.splitext(file_name)[0]
            shapes.append({
                'id': shape_name,
                'name': shape_name.replace('_', ' ').title(),
                'file': file_name
            })
    
    return shapes

def get_shape_definition(shape_id):
    """Get the definition of a specific shape"""
    figures_dir = os.path.join(os.path.dirname(__file__), 'yass', 'figures')
    file_path = os.path.join(figures_dir, f"{shape_id}.soma")
    
    if not os.path.exists(file_path):
        return None
        
    layers = parse_soma_file(file_path)
    return {
        'id': shape_id,
        'name': shape_id.replace('_', ' ').title(),
        'layers': layers
    }

def grid_to_yass_format(grid_state, grid_size=None):
    if grid_size is None:
        width = len(grid_state)
        height = len(grid_state[0])
        depth = len(grid_state[0][0])
    else:
        width, height, depth = grid_size
    
    yass_format = ''
    
    for z in range(depth - 1, -1, -1):
        for y in range(height - 1, -1, -1):
            row = ''
            for x in range(width):
                piece_id = grid_state[x][y][z]
                if piece_id:
                    row += piece_id
                else:
                    row += '.'
            yass_format += row + '\n'
        if z > 0:
            yass_format += '\n'
    
    return yass_format

def yass_to_grid_state(yass_format, grid_size=None):
    if grid_size is None:
        grid_size = get_grid_size(yass_format)
    
    width, height, depth = grid_size
    
    grid_state = [[[None for _ in range(depth)] 
                  for _ in range(height)] 
                 for _ in range(width)]
    
    layers = yass_format.strip().split('\n\n')
    
    for z, layer in enumerate(reversed(layers)):
        rows = layer.strip().split('\n')
        for y, row in enumerate(reversed(rows)):
            for x, char in enumerate(row):
                if char == '*':
                    grid_state[x][y][z] = 'FILLED'
                elif char in VALID_PIECES:
                    grid_state[x][y][z] = char
    
    return grid_state

def get_available_pieces(grid_state, grid_size=None):
    if grid_size is None:
        width = len(grid_state)
        height = len(grid_state[0])
        depth = len(grid_state[0][0])
    else:
        width, height, depth = grid_size
    
    placed_pieces = set()
    for x in range(width):
        for y in range(height):
            for z in range(depth):
                if grid_state[x][y][z]:
                    placed_pieces.add(grid_state[x][y][z])
    
    return [piece for piece in VALID_PIECES if piece not in placed_pieces and piece != '.']
