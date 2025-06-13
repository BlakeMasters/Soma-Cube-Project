from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from typing import List, Set, Tuple, Dict
import os

polygen = Blueprint('polygen', __name__)

def parse_rules(stream) -> Dict[int, int]:
    """
    Expects lines like:
      4: 3
      3: 3
    """
    rules = {}
    for raw in stream:
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        size_str, count_str = line.split(':', 1)
        size, count = int(size_str), int(count_str)
        rules[size] = count
    return rules

_NEIGHBOR_OFFSETS = [(1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1)]

def get_neighbors(cube: Tuple[int,int,int]) -> List[Tuple[int,int,int]]:
    x,y,z = cube
    return [(x+dx, y+dy, z+dz) for dx,dy,dz in _NEIGHBOR_OFFSETS]

def _generate_rotations():
    """Returns transformation functions f((x,y,z)) to (x',y',z')."""
    mats = []
    from itertools import permutations, product
    for perm in permutations((0,1,2)):
        for signs in product((1,-1), repeat=3):
            M = [[0]*3 for _ in range(3)]
            for i,axis in enumerate(perm):
                M[i][axis] = signs[i]
            det = (
                M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1]) -
                M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0]) +
                M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0])
            )
            if det == 1:
                mats.append(M)
    def make_rot(M):
        def rot(cube):
            x,y,z = cube
            return (
                M[0][0]*x + M[0][1]*y + M[0][2]*z,
                M[1][0]*x + M[1][1]*y + M[1][2]*z,
                M[2][0]*x + M[2][1]*y + M[2][2]*z,
            )
        return rot
    return [make_rot(M) for M in mats]

_ROTATIONS = _generate_rotations()

def canonical_form(cubes: Set[Tuple[int,int,int]]) -> Tuple[Tuple[int,int,int], ...]:
    """
    For each rotation:
      1) rotate all coords
      2) translate so min(x,y,z) = (0,0,0)
      3) sort the list of coords
    Return the lexicographically smallest tuple of coords.
    """
    forms = []
    for rot in _ROTATIONS:
        transformed = [rot(c) for c in cubes]
        minx = min(x for x,y,z in transformed)
        miny = min(y for x,y,z in transformed)
        minz = min(z for x,y,z in transformed)
        normalized = sorted((x-minx, y-miny, z-minz) for x,y,z in transformed)
        forms.append(tuple(normalized))
    return min(forms)

def generate_polycubes(n: int) -> Set[Tuple[Tuple[int,int,int], ...]]:
    """
    Returns a set of canonical tuples, each representing a distinct shape.
    """
    seen: Set[Tuple[Tuple[int,int,int], ...]] = set()

    def dfs(current: Set[Tuple[int,int,int]]):
        if len(current) == n:
            canon = canonical_form(current)
            seen.add(canon)
            return
        for cube in list(current):
            for nbr in get_neighbors(cube):
                if nbr not in current:
                    new_set = set(current)
                    new_set.add(nbr)
                    dfs(new_set)

    dfs({(0,0,0)})
    return seen

@polygen.route('/api/generateShapes', methods=['POST'])
def generate_shapes_endpoint():
    """
    POST with form-data “rules” file.
    Returns JSON: { size: [ [ [x,y,z], … ], … ], … }
    """
    if 'rules' not in request.files:
        return jsonify(error="Missing rules file"), 400
    f = request.files['rules']
    filename = secure_filename(f.filename)
    rules = parse_rules(f.stream)
    result: Dict[int, List[List[List[int]]]] = {}

    for size, count in rules.items():
        all_shapes = list(generate_polycubes(size))
        chosen = all_shapes[:count]
        result[size] = [ [list(c) for c in shape] for shape in chosen ]

    return jsonify(result), 200

