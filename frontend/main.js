import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Constants
const GRID_SIZE = 3;
let gridSize = { x: 3, y: 3, z: 3 }; //new for transformable grid
const CELL_SIZE = 1;
const PIECE_OPACITY = 0.95;
const PIECE_HIGHLIGHT_OPACITY = 0.6;

// Global variables
let scene, camera, renderer, controls;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let selectedPiece = null;
let pieces = [];
let gridState = Array(gridSize.x).fill().map(() =>
  Array(gridSize.y).fill().map(() =>
    Array(gridSize.z).fill(null)
  )
);
let gridGroup;

// Track placed pieces by id
let placedPieces = {};

// Canonical Soma pieces (0-based coordinates)
const SOMA_PIECES = [
    {
        id: "V",
        name: "V Shape",
        color: "#FF0000",
        baseShape: [ [0,0,0], [1,0,0], [0,1,0] ]
    },
    {
        id: "L",
        name: "L Shape",
        color: "#00FF00",
        baseShape: [ [0,0,0], [1,0,0], [2,0,0], [0,1,0] ]
    },
    {
        id: "T",
        name: "T Shape",
        color: "#0000FF",
        baseShape: [ [0,0,0], [1,0,0], [2,0,0], [1,1,0] ]
    },
    {
        id: "Z",
        name: "Z Shape",
        color: "#FFFF00",
        baseShape: [ [0,0,0], [1,0,0], [1,1,0], [2,1,0] ]
    },
    {
        id: "A",
        name: "A Shape",
        color: "#FF00FF",
        baseShape: [ [0,0,0], [1,0,0], [1,1,0], [1,1,1] ]
    },
    {
        id: "B",
        name: "B Shape",
        color: "#00FFFF",
        baseShape: [ [0,0,0], [1,0,0], [1,0,1], [1,1,1] ]
    },
    {
        id: "Corner",
        name: "Corner Shape",
        color: "#FFA500",
        baseShape: [ [0,0,0], [1,0,0], [0,1,0], [0,0,1] ]
    }
];

// Grid creation, old commented, new abstraction testing
// function createGrid() {
//     const gridGroup = new THREE.Group();
//     const lineMaterial = new THREE.LineBasicMaterial({ color: 0x808080, linewidth: 2 });
//     const min = 0;
//     const max = GRID_SIZE;

//     // Create vertical lines (Y axis)
//     for (let x = 0; x <= GRID_SIZE; x++) {
//         for (let z = 0; z <= GRID_SIZE; z++) {
//             const geometry = new THREE.BufferGeometry().setFromPoints([
//                 new THREE.Vector3(min + x, min, min + z),
//                 new THREE.Vector3(min + x, max, min + z)
//             ]);
//             gridGroup.add(new THREE.Line(geometry, lineMaterial));
//         }
//     }

//     // Create horizontal lines in X direction (Y fixed)
//     for (let y = 0; y <= GRID_SIZE; y++) {
//         for (let z = 0; z <= GRID_SIZE; z++) {
//             const geometry = new THREE.BufferGeometry().setFromPoints([
//                 new THREE.Vector3(min, min + y, min + z),
//                 new THREE.Vector3(max, min + y, min + z)
//             ]);
//             gridGroup.add(new THREE.Line(geometry, lineMaterial));
//         }
//     }

//     // Create horizontal lines in Z direction (Y fixed)
//     for (let x = 0; x <= GRID_SIZE; x++) {
//         for (let y = 0; y <= GRID_SIZE; y++) {
//             const geometry = new THREE.BufferGeometry().setFromPoints([
//                 new THREE.Vector3(min + x, min + y, min),
//                 new THREE.Vector3(min + x, min + y, max)
//             ]);
//             gridGroup.add(new THREE.Line(geometry, lineMaterial));
//         }
//     }

//     return gridGroup;
// } 
function createGrid() {
    const group = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({ color: 0x808080 });

    const { x: maxX, y: maxY, z: maxZ } = gridSize;

    for (let x = 0; x <= maxX; x++) {
        for (let z = 0; z <= maxZ; z++) {
            group.add(new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(x, 0, z),
                    new THREE.Vector3(x, maxY, z)
                ]),
                mat
            ));
        }
    }

    for (let y = 0; y <= maxY; y++) {
        for (let z = 0; z <= maxZ; z++) {
            group.add(new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(0, y, z),
                    new THREE.Vector3(maxX, y, z)
                ]),
                mat
            ));
        }
    }

    for (let x = 0; x <= maxX; x++) {
        for (let y = 0; y <= maxY; y++) {
            group.add(new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(x, y, 0),
                    new THREE.Vector3(x, y, maxZ)
                ]),
                mat
            ));
        }
    }

    return group;
}


// Piece creation and management
function createPiecesPanel() {
    const container = document.getElementById('pieces-container');
    container.innerHTML = '';
    SOMA_PIECES.forEach(piece => {
        const pieceDiv = document.createElement('div');
        pieceDiv.className = 'piece-item';
        pieceDiv.id = `panel-${piece.id}`;
        pieceDiv.innerHTML = `
            <div class="piece-preview" style="background-color: ${piece.color}"></div>
            <span>${piece.name}</span>
        `;
        pieceDiv.onclick = () => selectOrCreatePiece(piece);
        container.appendChild(pieceDiv);
    });
}

// function resizeGrid() {
//     const x = parseInt(document.getElementById('gridX').value);
//     const y = parseInt(document.getElementById('gridY').value);
//     const z = parseInt(document.getElementById('gridZ').value);
//     gridSize = { x, y, z };

//     //resets
//     gridState = Array(x).fill().map(() => 
//         Array(y).fill().map(() => Array(z).fill(null))
//     );
//     scene.remove(gridGroup);
//     gridGroup = createGrid();
//     scene.add(gridGroup);
//     resetGrid();
//     showMessage(`Resized grid to ${x} × ${y} × ${z}`);
// }
function resizeGrid() {
    console.log('sanity check for resizeGrid called', gridSize);
    const x = parseInt(document.getElementById('gridX').value, 10);
    const y = parseInt(document.getElementById('gridY').value, 10);
    const z = parseInt(document.getElementById('gridZ').value, 10);
    gridSize = { x, y, z };

    // rebuild grid visuals
    scene.remove(gridGroup);
    gridGroup = createGrid();
    scene.add(gridGroup);

    // reset pieces + state
    resetGrid();

    // re‐center camera on the new grid
    camera.position.set(x + 2, y + 2, z + 2);
    camera.lookAt(x / 2, y / 2, z / 2);
    showMessage(`Resized grid to ${x} × ${y} × ${z}`);
}

function renderGeneratedShapes(data) {
    resetGrid();  //Clear old
    pieces = [];  //manage them separately

    Object.entries(data).forEach(([size, shapeList], index) => {
        shapeList.forEach((coords, shapeIndex) => {
            const group = new THREE.Group();
            coords.forEach(([x, y, z]) => {
                const geo = new THREE.BoxGeometry(1, 1, 1);
                const mat = new THREE.MeshPhongMaterial({ 
                    color: new THREE.Color().setHSL(Math.random(), 0.5, 0.5),
                    transparent: true,
                    opacity: 0.9
                });
                const cube = new THREE.Mesh(geo, mat);
                cube.position.set(x + 0.5, y + 0.5, z + 0.5);
                group.add(cube);
            });
            group.position.set(
                Math.floor(gridSize.x / 2),
                Math.floor(gridSize.y / 2),
                Math.floor(gridSize.z / 2)
            );
            scene.add(group);
            pieces.push(group);
        });
    });

    showMessage("Generated and loaded new pieces");
}


// Grid-based validity check
// function isBoardValid() {
//     // Scan the grid for overlaps and out-of-bounds
//     let seen = {};
//     for (let x = 0; x < GRID_SIZE; x++) {
//         for (let y = 0; y < GRID_SIZE; y++) {
//             for (let z = 0; z < GRID_SIZE; z++) {
//                 const val = gridState[x][y][z];
//                 if (val) {
//                     const key = `${x},${y},${z}`;
//                     if (seen[key]) {
//                         // Overlap detected
//                         return false;
//                     }
//                     seen[key] = true;
//                 }
//             }
//         }
//     }
//     return true;
// }
function isBoardValid() {
    let seen = {};
    for (let x = 0; x < gridSize.x; x++) {
        for (let y = 0; y < gridSize.y; y++) {
            for (let z = 0; z < gridSize.z; z++) {
                const val = gridState[x][y][z];
                if (val) {
                    const key = `${x},${y},${z}`;
                    if (seen[key]) return false;
                    seen[key] = true;
                }
            }
        }
    }
    return true;
}

// function selectOrCreatePiece(piece) {
//     // If a piece is currently selected, check if the board is valid
//     if (selectedPiece && !isBoardValid()) {
//         showMessage('Current board state is invalid! Please move or rotate the piece before switching.');
//         return;
//     }
//     // Deselect current piece if any
//     if (selectedPiece) {
//         setPieceHighlight(selectedPiece, false);
//         highlightPanel(selectedPiece.userData.pieceId, false);
//     }
//     // If piece is already placed, select it
//     if (placedPieces[piece.id]) {
//         selectedPiece = placedPieces[piece.id];
//     } else {
//         // Create new piece at center of grid
//         const mesh = createPieceMesh(piece);
//         const centerPos = Math.floor(GRID_SIZE / 2);
//         mesh.position.set(centerPos, centerPos, centerPos);
//         scene.add(mesh);
//         placedPieces[piece.id] = mesh;
//         selectedPiece = mesh;
//         updateGridState();
//     }
//     setPieceHighlight(selectedPiece, true);
//     highlightPanel(piece.id, true);
// }
function selectOrCreatePiece(piece) {
    if (selectedPiece && !isBoardValid()) {
        showMessage(
          'Current board state is invalid! Please move or rotate the piece before switching.'
        );
        return;
    }

    //deselect
    if (selectedPiece) {
        setPieceHighlight(selectedPiece, false);
        highlightPanel(selectedPiece.userData.pieceId, false);
    }

    // 3.select if on board
    if (placedPieces[piece.id]) {
        selectedPiece = placedPieces[piece.id];

    } else {
        // 4.centered in the middle
        const mesh = createPieceMesh(piece);
        mesh.position.set(
            Math.floor(gridSize.x / 2),
            Math.floor(gridSize.y / 2),
            Math.floor(gridSize.z / 2)
        );
        scene.add(mesh);

        //Track it in placedPieces and mark it as selected
        placedPieces[piece.id] = mesh;
        selectedPiece = mesh;

        //update internal gridState array to account for the new piece
        updateGridState();
    }

    //highlight the newly selected piece both in 3D and in the UI panel
    setPieceHighlight(selectedPiece, true);
    highlightPanel(piece.id, true);
}


function setPieceHighlight(mesh, highlight) {
    mesh.traverse(obj => {
        if (obj.isMesh && obj.material) {
            obj.material.opacity = highlight ? PIECE_HIGHLIGHT_OPACITY : PIECE_OPACITY;
        }
    });
}

function highlightPanel(pieceId, highlight) {
    const el = document.getElementById(`panel-${pieceId}`);
    if (el) el.style.background = highlight ? '#e0e0e0' : '';
}

function createPieceMesh(piece) {
    const group = new THREE.Group();
    piece.baseShape.forEach(([x, y, z]) => {
        const geometry = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE);
        const material = new THREE.MeshPhongMaterial({ 
            color: piece.color,
            transparent: true,
            opacity: PIECE_OPACITY,
            shininess: 30
        });
        const cube = new THREE.Mesh(geometry, material);
        // Center cubes in grid cells
        cube.position.set(
            x + 0.5,
            y + 0.5,
            z + 0.5
        );
        group.add(cube);
    });
    group.userData = {
        pieceId: piece.id,
        baseShape: piece.baseShape.map(cube => [...cube]),
        rotation: { x: 0, y: 0, z: 0 },
        originalColor: piece.color
    };
    return group;
}

function movePiece(axis, direction) {
    if (!selectedPiece) return;
    const newPos = selectedPiece.position.clone();
    newPos[axis] += direction;
    // Snap to grid
    newPos.x = Math.round(newPos.x);
    newPos.y = Math.round(newPos.y);
    newPos.z = Math.round(newPos.z);
    selectedPiece.position.copy(newPos);
    updateGridState();
}

function rotatePiece(axis) {
    if (!selectedPiece) return;
    const newRot = { ...selectedPiece.userData.rotation };
    newRot[axis] = (newRot[axis] + 90) % 360;
    // Snap to 90-degree increments
    newRot.x = Math.round(newRot.x / 90) * 90;
    newRot.y = Math.round(newRot.y / 90) * 90;
    newRot.z = Math.round(newRot.z / 90) * 90;
    selectedPiece.userData.rotation = newRot;
    selectedPiece.rotation.set(
        THREE.MathUtils.degToRad(newRot.x),
        THREE.MathUtils.degToRad(newRot.y),
        THREE.MathUtils.degToRad(newRot.z)
    );
    updateGridState();
}

function rotateShape(shape, rotation) {
    let rotated = shape.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    const euler = new THREE.Euler(
        THREE.MathUtils.degToRad(rotation.x),
        THREE.MathUtils.degToRad(rotation.y),
        THREE.MathUtils.degToRad(rotation.z),
        'XYZ'
    );
    rotated = rotated.map(v => v.clone().applyEuler(euler).round());
    return rotated.map(v => [v.x, v.y, v.z]);
}

// function updateGridState() {
//     // Clear grid
//     gridState = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null)));
//     // Place all pieces
//     for (const id in placedPieces) {
//         const mesh = placedPieces[id];
//         const shape = rotateShape(mesh.userData.baseShape, mesh.userData.rotation);
//         for (const [x, y, z] of shape) {
//             const gx = Math.round(mesh.position.x + x);
//             const gy = Math.round(mesh.position.y + y);
//             const gz = Math.round(mesh.position.z + z);
//             if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE && gz >= 0 && gz < GRID_SIZE) {
//                 gridState[gx][gy][gz] = mesh.userData.pieceId;
//             }
//         }
//     }
// }
function updateGridState() {
    // clear gridState
    gridState = Array(gridSize.x).fill().map(() =>
        Array(gridSize.y).fill().map(() =>
            Array(gridSize.z).fill(null)
        )
    );

    // place every piece within new bounds
    for (const id in placedPieces) {
        const mesh = placedPieces[id];
        const shape = rotateShape(mesh.userData.baseShape, mesh.userData.rotation);
        shape.forEach(([dx, dy, dz]) => {
            const gx = Math.round(mesh.position.x + dx);
            const gy = Math.round(mesh.position.y + dy);
            const gz = Math.round(mesh.position.z + dz);
            if (
                gx >= 0 && gx < gridSize.x &&
                gy >= 0 && gy < gridSize.y &&
                gz >= 0 && gz < gridSize.z
            ) {
                gridState[gx][gy][gz] = mesh.userData.pieceId;
            }
        });
    }
}

function removeSelectedPiece() {
    if (!selectedPiece) return;
    scene.remove(selectedPiece);
    delete placedPieces[selectedPiece.userData.pieceId];
    highlightPanel(selectedPiece.userData.pieceId, false);
    selectedPiece = null;
    updateGridState();
}

function handleKeyDown(event) {
    if (!selectedPiece) return;
    
    // Prevent default behavior for arrow keys
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
    }
    
    switch(event.key) {
        case 'ArrowLeft': movePiece('x', -1); break;
        case 'ArrowRight': movePiece('x', 1); break;
        case 'ArrowUp': movePiece('y', 1); break;
        case 'ArrowDown': movePiece('y', -1); break;
        case 'z': movePiece('z', -1); break;
        case 'x': movePiece('z', 1); break;
        case 'r': rotatePiece('x'); break;
        case 'f': rotatePiece('y'); break;
        case 'v': rotatePiece('z'); break;
        case 'Delete': removeSelectedPiece(); break;
    }
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onWindowResize() {
    if (!camera || !renderer) return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

// function resetGrid() {
//     // Remove all pieces from the scene and clear state
//     for (const id in placedPieces) {
//         scene.remove(placedPieces[id]);
//     }
//     placedPieces = {};
//     selectedPiece = null;
//     updateGridState();
//     showMessage('Grid has been reset');
// }
function resetGrid() {
    // remove all meshes
    Object.values(placedPieces).forEach(mesh => scene.remove(mesh));
    placedPieces = {};
    selectedPiece = null;

    // reset gridState
    gridState = Array(gridSize.x).fill().map(() =>
        Array(gridSize.y).fill().map(() =>
            Array(gridSize.z).fill(null)
        )
    );
    showMessage('Grid has been reset');
}

// Scene initialization
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    const cx = gridSize.x / 2,
        cy = gridSize.y / 2,
        cz = gridSize.z / 2;
    
    // Create camera
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.set(gridSize.x + 2, gridSize.y + 2, gridSize.z + 2);
    camera.lookAt(cx, cy, cz);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    
    const container = document.getElementById('container');
    if (!container) {
        return;
    }
    container.appendChild(renderer.domElement);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Create and add grid
    gridGroup = createGrid();
    scene.add(gridGroup);
    
    // Add orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 3;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI / 2;
    controls.target.set(cx, cy, cz);
    controls.update();
    
    // Add event listeners
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onWindowResize);
    
    // Start animation loop
    animate();
}

function animate() {
    if (!scene || !camera || !renderer) {
        return;
    }
    
    requestAnimationFrame(animate);

    controls.update();
    renderer.render(scene, camera);
}

// Show message for user feedback
function showMessage(message, duration = 2000) {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';
        
        if (duration > 0) {
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, duration);
        }
    }
}

// Initialize the application when the DOM is loaded
// document.addEventListener('DOMContentLoaded', () => {
//     init();
//     createPiecesPanel();
    
//     // Add keyboard event listener
//     window.addEventListener('keydown', handleKeyDown);
    
//     // Expose functions to global scope for HTML onclick handlers
//     window.removeSelectedPiece = removeSelectedPiece;
//     window.resetGrid = resetGrid;
//     window.movePiece = movePiece;
//     window.rotatePiece = rotatePiece;
// });
document.addEventListener('DOMContentLoaded', () => {
    init();
    createPiecesPanel();
    
    // Add keyboard event listener
    window.addEventListener('keydown', handleKeyDown);

    // Bind rulesForm submission for uploading shape rules
    document.getElementById('rulesForm').addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData();
        const file = document.getElementById('rulesFile').files[0];
        if (!file) return alert('Please select your rules file.');
        fd.append('rules', file);

        fetch('/api/generateShapes', {
            method: 'POST',
            body: fd
        })
        .then(res => res.json())
        .then(renderGeneratedShapes)
        .catch(console.error);
    });

    // Wire up the Apply Grid Size button
    document.getElementById('applyGridBtn')
        .addEventListener('click', resizeGrid);

    // Expose other functions if you still use inline onclicks elsewhere
    window.removeSelectedPiece = removeSelectedPiece;
    window.resetGrid           = resetGrid;
    window.movePiece           = movePiece;
    window.rotatePiece         = rotatePiece;
});