

import os
import shutil
import subprocess
from typing import Dict, List, Tuple

from flask import Blueprint, request, jsonify

from carver import carve_pieces, canonical_key

polygen = Blueprint('polygen', __name__)


def write_single_soma(shape_coords: List[List[int]],filename: str,grid_size: Tuple[int, int, int]):
    """
    Write one polycube into YASS's .soma text format, using a variable grid size.
    shape_coords: list of [x, y, z] (0-based).  Assumes coords already “normalized” so that min(x,y,z) = (0,0,0).
    filename: full path to write (e.g. 'backend/yass/figures/tmp_gen/piece5.soma')
    grid_size: (X, Y, Z), the exact dimensions this piece must fit in.
    """
    X, Y, Z = grid_size

    grid = [
        [ ['.' for _ in range(X)] for _ in range(Y) ]
        for _ in range(Z)
    ]

    for (x, y, z) in shape_coords:
        if not (0 <= x < X and 0 <= y < Y and 0 <= z < Z):
            raise ValueError(f"Coordinate {(x,y,z)} out of bounds for grid {grid_size}")
        grid[z][y][x] = '#'

    with open(filename, 'w') as out:
        out.write(f"{X} {Y} {Z}\n")
        for z_idx in range(Z):
            for y_idx in range(Y):
                out.write(''.join(grid[z_idx][y_idx]) + "\n")
            out.write("\n")


@polygen.route('/generateShapes', methods=['POST'])
def generate_shapes_endpoint():
    f = request.files.get('rules')
    if not f:
        return jsonify(error="Missing rules file"), 400

    rules: Dict[int,int] = {}
    for line in f.stream:
        text = line.decode().strip()
        if not text or text.startswith('#'):
            continue
        try:
            size, cnt = map(int, text.split(':'))
        except ValueError:
            return jsonify(error=f"Bad line in rules: {text!r}"), 400
        rules[size] = cnt

    try:
        X = int(request.form.get('X', 3))
        Y = int(request.form.get('Y', 3))
        Z = int(request.form.get('Z', 3))
    except ValueError:
        return jsonify(error="X, Y, Z must be integers"), 400

    volume = X * Y * Z
    if any(size > volume for size in rules):
        return jsonify(error="Cannot carve piece larger than volume"), 400

    shapes = carve_pieces((X, Y, Z), rules)
    if shapes is None:
        return jsonify(error="No valid carving found"), 400

    #sanity-check-collapse any remaining duplicates (should be none)
    deduped: Dict[int, List[List[List[int]]]] = {}
    for size, placements in shapes.items():
        seen_keys = set()
        unique = []
        for coords in placements:
            key = canonical_key(coords)
            if key not in seen_keys:
                seen_keys.add(key)
                unique.append([list(c) for c in key])
        deduped[size] = unique

    for size, needed in rules.items():
        if len(deduped.get(size, [])) < needed:
            return jsonify(error="No valid carving found"), 400
    return jsonify(deduped), 200

@polygen.route('/solveGenerated', methods=['POST'])
def solve_generated_endpoint():
    """
    POST form-data containing exactly the same fields as /api/generateShapes:
      rules: the same “size:count” file
      X, Y, Z: the same grid dims

    Re-carve the pieces in XxYxZ
    Write each piece into backend/yass/figures/tmp_gen/pieceN.soma
    Write an empty well (XxYxZ of dots) into that same folder
    Run make solve inside backend/yass (which reads from figures/tmp_gen/*.soma)
    Read back solution.cube and return it as JSON

    This has unsolvable bugs on Windows platforms as YASS is intended for macOS -Blake
    """
    f = request.files.get('rules')
    if not f:
        return jsonify(error="Missing rules file"), 400

    rules: Dict[int,int] = {}
    for line in f.stream:
        text = line.decode().strip()
        if not text or text.startswith('#'):
            continue
        try:
            size, cnt = map(int, text.split(':'))
        except ValueError:
            return jsonify(error=f"Bad line in rules: {text!r}"), 400
        rules[size] = cnt

    try:
        X = int(request.form.get('X', 3))
        Y = int(request.form.get('Y', 3))
        Z = int(request.form.get('Z', 3))
    except ValueError:
        return jsonify(error="X, Y, Z must be integers"), 400

    volume = X * Y * Z
    if any(size > volume for size in rules):
        return jsonify(error="Cannot carve piece larger than volume"), 400

    shapes = carve_pieces((X, Y, Z), rules)
    if shapes is None:
        return jsonify(error="No valid carving found"), 400

    base_dir = os.getcwd()  #project root
    yass_figures_tmp = os.path.join(base_dir, 'backend', 'yass', 'figures', 'tmp_gen')
    if os.path.isdir(yass_figures_tmp):
        shutil.rmtree(yass_figures_tmp)
    os.makedirs(yass_figures_tmp, exist_ok=True)

    piece_index = 1
    for size_key, piece_list in shapes.items():
        for coords in piece_list:
            soma_filename = os.path.join(yass_figures_tmp, f"piece{piece_index}.soma")
            write_single_soma(coords, soma_filename, grid_size=(X, Y, Z))
            piece_index += 1

    well_path = os.path.join(yass_figures_tmp, 'well.soma')
    with open(well_path, 'w') as w:
        w.write(f"{X} {Y} {Z}\n")
        for _z in range(Z):
            for _y in range(Y):
                w.write('.' * X + "\n")
            w.write("\n")

    yass_dir = os.path.join(base_dir, 'backend', 'yass')
    proc = subprocess.run(
        ["make", "solve"],
        cwd=yass_dir,
        capture_output=True,
        text=True
    )
    if proc.returncode != 0:
        return jsonify(error="YASS failed", details=proc.stderr), 500

    solution_path = os.path.join(yass_dir, "solution.cube")
    if not os.path.exists(solution_path):
        return jsonify(error="No solution produced"), 500

    with open(solution_path, 'r') as sol:
        solution_text = sol.read()

    return jsonify(solution=solution_text), 200
