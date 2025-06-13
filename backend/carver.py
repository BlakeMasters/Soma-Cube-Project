

# each shape_coords is a list of (x,y,z) triplets (all ints).
# This will attempt to tile the entire X×Y×Z grid with connected polycubes
# whose sizes and counts are given by rules = { size: count, ... }.
# If a valid tiling is found, it returns a dictionary mapping each requested
# size to a list of Count shapes (each shape is a list of [x,y,z] coordinates).
# If no valid tiling exists, it returns None.

from typing import Dict, List, Tuple, Optional
from itertools import permutations, product
import sys
sys.setrecursionlimit(10_000)

elements = (0,1,2)
ROTATIONS = []
for perm in permutations(elements, 3):
    for signs in product((1, -1), repeat=3):
        def make_rot(perm, signs):
            def rot(cell):
                x, y, z = cell
                return (
                    signs[0] * cell[perm[0]],
                    signs[1] * cell[perm[1]],
                    signs[2] * cell[perm[2]]
                )
            return rot
        R = make_rot(perm, signs)
        m0, m1, m2 = R((1,0,0)), R((0,1,0)), R((0,0,1))
        det = (
            m0[0] * (m1[1]*m2[2] - m1[2]*m2[1])
          - m0[1] * (m1[0]*m2[2] - m1[2]*m2[0])
          + m0[2] * (m1[0]*m2[1] - m1[1]*m2[0])
        )
        if det == 1:
            ROTATIONS.append(R)


def normalize(shape: List[Tuple[int,int,int]]) -> Tuple[Tuple[int,int,int], ...]:
    xs, ys, zs = zip(*shape)
    dx, dy, dz = min(xs), min(ys), min(zs)
    shifted = [(x-dx, y-dy, z-dz) for x,y,z in shape]
    return tuple(sorted(shifted))


def canonical_key(shape: List[Tuple[int,int,int]]) -> Tuple[Tuple[int,int,int], ...]:
    """
    Return the lexicographically smallest normalized form of shape over all rotations.
    """
    forms = [normalize([R(cell) for cell in shape]) for R in ROTATIONS]
    return min(forms)


def carve_pieces(
    grid_dims: Tuple[int, int, int],
    rules: Dict[int, int]
) -> Optional[Dict[int, List[List[List[int]]]]]:
    X, Y, Z = grid_dims
    volume = X * Y * Z

    sizes_list: List[int] = []
    for size, cnt in rules.items():
        if size * cnt > volume:
            return None
        sizes_list += [size] * cnt

    if sum(sizes_list) != volume:
        return None
    sizes_list.sort(reverse=True)

    grid = [[[False]*Z for _ in range(Y)] for _ in range(X)]
    placed_shapes: List[List[Tuple[int,int,int]]] = [None] * len(sizes_list)
    NEIGHBOR_DIRS = [(1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1)]

    def in_bounds(x,y,z):
        return 0 <= x < X and 0 <= y < Y and 0 <= z < Z

    def find_first_empty() -> Optional[Tuple[int,int,int]]:
        for x in range(X):
            for y in range(Y):
                for z in range(Z):
                    if not grid[x][y][z]:
                        return (x,y,z)
        return None

    def get_unfilled_neighbors(cell: Tuple[int,int,int]) -> List[Tuple[int,int,int]]:
        x, y, z = cell
        out = []
        for dx,dy,dz in NEIGHBOR_DIRS:
            nx, ny, nz = x+dx, y+dy, z+dz
            if in_bounds(nx,ny,nz) and not grid[nx][ny][nz]:
                out.append((nx,ny,nz))
        return out

    def generate_connected_shapes(
        start: Tuple[int,int,int], size: int
    ) -> List[List[Tuple[int,int,int]]]:
        all_shapes: List[List[Tuple[int,int,int]]] = []
        def dfs(shape_list, shape_set, frontier):
            if len(shape_list) == size:
                all_shapes.append(shape_list.copy())
                return
            for cell in sorted(frontier):
                if cell <= start:
                    continue
                new_shape = shape_list + [cell]
                new_set = shape_set | {cell}
                new_frontier = (frontier - {cell})
                for nb in get_unfilled_neighbors(cell):
                    if nb not in new_set:
                        new_frontier.add(nb)
                dfs(new_shape, new_set, new_frontier)
        dfs([start], {start}, set(get_unfilled_neighbors(start)))
        unique, seen = [], set()
        for shape in all_shapes:
            key = canonical_key(shape)
            if key not in seen:
                seen.add(key)
                unique.append(shape)
        return unique

    def place_piece(index: int, used_keys: set) -> bool:
        if index >= len(sizes_list):
            return True
        size = sizes_list[index]
        start = find_first_empty()
        if start is None:
            return False

        for shape in generate_connected_shapes(start, size):
            key = canonical_key(shape)
            if key in used_keys:
                continue
            for (x,y,z) in shape:
                grid[x][y][z] = True
            placed_shapes[index] = shape
            used_keys.add(key)

            if place_piece(index+1, used_keys):
                return True

            used_keys.remove(key)
            for (x,y,z) in shape:
                grid[x][y][z] = False
            placed_shapes[index] = None

        return False

    if not place_piece(0, set()):
        return None

    result: Dict[int, List[List[List[int]]]] = {}
    for i, size in enumerate(sizes_list):
        coords = placed_shapes[i]
        result.setdefault(size, []).append([[x,y,z] for (x,y,z) in coords])
    return result
