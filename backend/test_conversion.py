from parse_shapes import load_shape_file, yass_to_grid_state, grid_to_yass_format
import os

# This file is used to test the conversion between yass format and grid state for a specific shape
# Will be helpful for future implentation of solving for any grid size / shape

# Test conversion between yass format and grid state for a specific shape
def test_conversion(shape_name):
    figures_dir = os.path.join(os.path.dirname(__file__), 'yass', 'figures')
    shape_file = os.path.join(figures_dir, f"{shape_name}.soma")
    
    print(f"\nTesting conversion for shape: {shape_name}")
    print("-" * 50)

    shape_content = load_shape_file(shape_file)
    if not shape_content:
        print(f"Failed to load shape file: {shape_file}")
        return
    
    print("\nOriginal yass format:")
    print(shape_content)
    
    grid_state = yass_to_grid_state(shape_content)
    
    print("\nGrid state:")
    for z in range(len(grid_state[0][0])):
        print(f"\nLayer {z}:")
        for y in range(len(grid_state[0])):
            row = []
            for x in range(len(grid_state)):
                piece = grid_state[x][y][z]
                row.append(piece if piece else '.')
            print(''.join(row))

    yass_format = grid_to_yass_format(grid_state)
    print("\nConverted back to yass format:")
    print(yass_format)

    if shape_content.strip() == yass_format.strip():
        print("\n======== Conversion successful ========\n")
    else:
        print("\n======== Conversion failed ========\n")
        print("\nDifferences:")
        original_lines = shape_content.strip().split('\n')
        converted_lines = yass_format.strip().split('\n')
        for i, (orig, conv) in enumerate(zip(original_lines, converted_lines)):
            if orig != conv:
                print(f"Line {i+1}:")
                print(f"  Original: {orig}")
                print(f"  Converted: {conv}")

if __name__ == "__main__":
    test_shapes = ["cube", "tower", "pyramid"]
    for shape in test_shapes:
        test_conversion(shape) 