import os
import json

# This file is used to parse the .soma files and return the shapes in a json format
# It is only necessary if we want to generate new shapes, like if we wanted to test a 2x2x2 or 4x4x4 with new shapes

def parse_soma_file(file_path):
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

def generate_shapes_data(directory):
    shapes_data = {}
    for file_name in os.listdir(directory):
        if file_name.endswith('.soma'):
            file_path = os.path.join(directory, file_name)
            shapes_data[file_name] = parse_soma_file(file_path)
    return shapes_data

if __name__ == "__main__":
    soma_directory = "./figures"
    output_file = "shapes.json"
    shapes_data = generate_shapes_data(soma_directory)
    with open(output_file, 'w') as f:
        json.dump(shapes_data, f, indent=4)
    print(f"Shapes data saved to {output_file}")
