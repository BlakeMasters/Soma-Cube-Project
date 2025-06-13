

import { SOMA_PIECES, VALID_PIECES, SHAPE_IDS, API_BASE } from './constants.js';
import * as THREE from 'three';

export class UIController {
  constructor(pieceManager, gridManager) {
    this.pieceManager = pieceManager;
    this.gridManager = gridManager;
    this.currentShapeId = 'cube';
    this.initializeUI();
  }

  async initializeUI() {
    this.createShapeSelector();
    this.initializeEventListeners();
    await this.initializeSolutionCounts();

    const controls = document.querySelector('.controls');
    if (controls) {
      controls.style.visibility = 'visible';
    }
  }

  async initializeSolutionCounts() {
    try {
      await this.updateSolutionCounts();
    } catch (error) {
      console.error('Error initializing solution counts:', error);
    }
  }

  async onApplyGridSize() {

    const xInput = document.getElementById('gridX');
    const yInput = document.getElementById('gridY');
    const zInput = document.getElementById('gridZ');

    const newX = parseInt(xInput.value, 10);
    const newY = parseInt(yInput.value, 10);
    const newZ = parseInt(zInput.value, 10);

    if (isNaN(newX) || isNaN(newY) || isNaN(newZ) || newX < 1 || newY < 1 || newZ < 1) {
      this.showMessage('Grid dimensions must be positive integers.', 2000);
      return;
    }
    this.gridManager.setEmptyGrid(newX, newY, newZ);
  }

  showMessage(message, duration = 2000) {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
      messageDiv.textContent = message;
      messageDiv.style.display = 'block';
      if (duration > 0) {
        setTimeout(() => messageDiv.style.display = 'none', duration);
      }
    }
  }

  initializeEventListeners() {
    const checkButton = document.getElementById('check-solution');
    const resetButton = document.getElementById('reset-grid');
    const removeButton = document.getElementById('remove-selected');

    if (checkButton) checkButton.addEventListener('click', () => this.checkSolution());
    if (resetButton) resetButton.addEventListener('click', () => this.resetGrid());
    if (removeButton) removeButton.addEventListener('click', () => this.pieceManager.removeSelectedPiece());
    window.addEventListener('keydown', (event) => this.handleKeyDown(event));

    const applyBtn = document.getElementById('applyGridBtn');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => this.onApplyGridSize());
    }


    const generateForm = document.getElementById('rulesForm');
    if (generateForm) {
      generateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.onGenerateSubmit();
      });
    }

    const solveButton = document.getElementById('solveBtn');
    if (solveButton) {
      solveButton.addEventListener('click', async () => {
        await this.onSolveGenerated();
      });
    }
  }

  setShapeId(shapeId) {
    this.currentShapeId = shapeId;
  }

  handleKeyDown(event) {
    if (!this.pieceManager.selectedPiece) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
    }

    const keyActions = {
      'ArrowLeft': () => this.pieceManager.movePiece('x', -1),
      'ArrowRight': () => this.pieceManager.movePiece('x', 1),
      'ArrowUp': () => this.pieceManager.movePiece('y', 1),
      'ArrowDown': () => this.pieceManager.movePiece('y', -1),
      'z': () => this.pieceManager.movePiece('z', -1),
      'x': () => this.pieceManager.movePiece('z', 1),
      'r': () => this.pieceManager.rotatePiece('x'),
      'f': () => this.pieceManager.rotatePiece('y'),
      'v': () => this.pieceManager.rotatePiece('z'),
      'Delete': () => this.pieceManager.removeSelectedPiece()
    };

    const action = keyActions[event.key];
    if (action) action();
  }

  async checkSolution() {
    const gridState = this.scanGridState();

    const occupiedCells = this.gridManager.occupiedCells;
    for (const cell of occupiedCells) {
      const [x, y, z] = cell.split(',').map(Number);
      if (!gridState[x][y][z]) {
        this.showMessage('Please fill all cells in the grid');
        return false;
      }
    }

    const yassFormat = this.convertToYassFormat(gridState);

    try {
      const response = await fetch(`${API_BASE}/check-solution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          grid_state: yassFormat,
          shape_id: this.currentShapeId
        })
      });

      if (!response.ok) throw new Error('Failed to check solution');

      const data = await response.json();
      this.showMessage(data.message);

      if (data.valid) {
        await this.updateSolutionCounts();
      }

      return data.valid;
    } catch (error) {
      console.error('Error checking solution:', error);
      this.showMessage('Failed to check solution. Please try again.');
      return false;
    }
  }

  async resetGrid() {
    try {
      this.pieceManager.updatePiecesPanel();
      const success = await this.gridManager.loadGrid(this.currentShapeId);

      if (success) {
        await this.updateSolutionCounts();
        this.showMessage('Grid has been reset');
      } else {
        this.showMessage('Failed to reset grid');
      }
    } catch (error) {
      console.error('Error resetting grid:', error);
      this.showMessage('Error resetting grid');
    }
  }

  async updateSolutionCounts() {
    try {
      const [currentCount, totalCount] = await Promise.all([
        this.fetchCurrentSolutionCount(),
        this.fetchTotalSolutions()
      ]);

      this.updateSolutionCountDisplay(currentCount, totalCount);

      if (currentCount === totalCount && totalCount > 0) {
        this.showMessage('CONGRATULATIONS! YOU HAVE FOUND EVERY SOLUTION TO THIS PUZZLE!', 0);
      }
    } catch (error) {
      console.error('Error updating solution counts:', error);
    }
  }

  updateSolutionCountDisplay(currentCount, totalCount) {
    const countElement = document.getElementById('solution-count');
    const totalElement = document.getElementById('total-solutions');

    if (countElement) countElement.textContent = currentCount;
    if (totalElement) totalElement.textContent = totalCount;
  }

  async fetchCurrentSolutionCount() {
    const response = await fetch(`${API_BASE}/solutions/${this.currentShapeId}`);
    if (!response.ok) return 0;
    const solutions = await response.json();
    return solutions.length;
  }

  async fetchTotalSolutions() {
    const response = await fetch(`${API_BASE}/total-solutions/${this.currentShapeId}`);
    if (!response.ok) return 0;
    const data = await response.json();
    return data.total_solutions;
  }

  scanGridState() {
    const dimensions = this.gridManager.getDimensions();
    const currentState = Array(dimensions.width).fill().map(() =>
      Array(dimensions.height).fill().map(() =>
        Array(dimensions.depth).fill(null)
      )
    );

    this.pieceManager.renderer.scene.traverse(object => {
      if (object.isMesh && object.parent && object.parent.userData.pieceId) {
        const worldPos = new THREE.Vector3();
        object.getWorldPosition(worldPos);

        const gx = Math.floor(worldPos.x);
        const gy = Math.floor(worldPos.y);
        const gz = Math.floor(worldPos.z);

        if (gx >= 0 && gx < dimensions.width &&
            gy >= 0 && gy < dimensions.height &&
            gz >= 0 && gz < dimensions.depth) {
          currentState[gx][gy][gz] = object.parent.userData.pieceId;
        }
      }
    });

    return currentState;
  }

  convertToYassFormat(gridState) {
    const dimensions = this.gridManager.getDimensions();
    let yassFormat = '';

    for (let z = 0; z < dimensions.depth; z++) {
      for (let y = 0; y < dimensions.height; y++) {
        for (let x = 0; x < dimensions.width; x++) {
          const pieceId = gridState[x][y][z];

          if (this.gridManager.isOccupiedCell(x, y, z)) {
            const originalCell = this.gridManager.getOriginalCell(x, y, z);
            yassFormat += pieceId || originalCell;
          } else {
            yassFormat += '.';
          }
        }
        yassFormat += '\n';
      }
      if (z < dimensions.depth - 1) {
        yassFormat += '\n';
      }
    }
    return yassFormat;
  }

  createShapeSelector() {
    const selectorContainer = document.getElementById('shape-selector');
    if (!selectorContainer) {
      console.error('Shape selector container not found');
      return;
    }

    const label = document.createElement('label');
    label.htmlFor = 'shape-select';
    label.textContent = 'Select Shape: ';

    const select = document.createElement('select');
    select.id = 'shape-select';

    SHAPE_IDS.forEach(shapeId => {
      const option = document.createElement('option');
      option.value = shapeId;
      option.textContent = shapeId.charAt(0).toUpperCase() + shapeId.slice(1);
      select.appendChild(option);
    });

    select.value = this.currentShapeId;

    select.addEventListener('change', async (e) => {
      const newShapeId = e.target.value;
      if (newShapeId !== this.currentShapeId) {
        try {
          this.showMessage('Loading figure...');
          this.pieceManager.updatePiecesPanel();

          const success = await this.gridManager.loadGrid(newShapeId);
          if (success) {
            this.setShapeId(newShapeId);
            await this.updateSolutionCounts();
            this.showMessage('Figure loaded successfully');
          } else {
            this.showMessage('Failed to load figure');
            select.value = this.currentShapeId;
          }
        } catch (error) {
          console.error('Error loading figure:', error);
          this.showMessage('Error loading figure');
          select.value = this.currentShapeId;
        }
      }
    });

    selectorContainer.appendChild(label);
    selectorContainer.appendChild(select);
  }

  async onGenerateSubmit() {
    const fileInput = document.getElementById('rulesFile');
    const X = parseInt(document.getElementById('dimX').value, 10);
    const Y = parseInt(document.getElementById('dimY').value, 10);
    const Z = parseInt(document.getElementById('dimZ').value, 10);

    if (!fileInput.files[0]) {
      alert('Please select a rules file.');
      return;
    }
    if (isNaN(X) || isNaN(Y) || isNaN(Z) || X < 1 || Y < 1 || Z < 1) {
      alert('Grid dimensions must be positive integers.');
      return;
    }

    const fd = new FormData();
    fd.append('rules', fileInput.files[0]);
    fd.append('X', X);
    fd.append('Y', Y);
    fd.append('Z', Z);

    try {
      const resp = await fetch(`${API_BASE}/generateShapes`, {
        method: 'POST',
        body: fd
      });
      const data = await resp.json();
      if (data.error) {
        alert(`Error generating shapes: ${data.error}`);
        return;
      }

      this.pieceManager.loadGeneratedShapes(data);

    } catch (err) {
      console.error('Error in /generateShapes:', err);
      alert('Failed to generate shapes.  Check console for details.');
    }
  }

  async onSolveGenerated() {
    const fileInput = document.getElementById('rulesFile');
    const X = parseInt(document.getElementById('dimX').value, 10);
    const Y = parseInt(document.getElementById('dimY').value, 10);
    const Z = parseInt(document.getElementById('dimZ').value, 10);

    if (!fileInput.files[0]) {
      alert('Please upload your rules file and generate pieces first.');
      return;
    }
    if (isNaN(X) || isNaN(Y) || isNaN(Z)) {
      alert('Grid dimensions are invalid.');
      return;
    }

    const fd = new FormData();
    fd.append('rules', fileInput.files[0]);
    fd.append('X', X);
    fd.append('Y', Y);
    fd.append('Z', Z);

    try {
      const resp = await fetch(`${API_BASE}/solveGenerated`, {
        method: 'POST',
        body: fd
      });
      const json = await resp.json();
      if (json.error) {
        alert(`Solve failed: ${json.error}`);
        console.error(json.details);
        return;
      }

      console.log('Raw YASS solution.cube:\n', json.solution);
      alert('Solution received. Check console for the full 3D layers.');

    } catch (err) {
      console.error('Error in /solveGenerated:', err);
      alert('Failed to solve generated puzzle.  Check console.');
    }
  }
}
