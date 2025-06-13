# test_carver.py
from carver import carve_pieces

if __name__ == "__main__":
    rules = {3: 2, 2: 1, 1: 0}
    grid  = (2, 2, 2)
    shapes = carve_pieces(grid, rules)
    print("RAW:", shapes)

    from carver import canonical_key
    keys = [canonical_key(shape) for shape in shapes[3]]
    print("CANONICAL KEYS for size=3:", keys)
