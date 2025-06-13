// File: frontend/js/pieceManager.js

import * as THREE from 'three';
import {
  SOMA_PIECES,
  CELL_SIZE,
  PIECE_OPACITY,
  PIECE_HIGHLIGHT_OPACITY
} from './constants.js';

export class PieceManager {
  constructor(renderer) {
    this.renderer = renderer; 
    this.selectedPiece = null;   
    this.placedPieces = new Map(); 
    this.initializePiecesPanel(); 
  }


  initializePiecesPanel() {
    const panel = document.getElementById('pieces-panel');
    if (!panel) return;
    const container = document.createElement('div');
    container.className = 'pieces-container';
    panel.appendChild(container);

    SOMA_PIECES.forEach(piece => {
      const element = this.createPieceElement(piece);
      container.appendChild(element);
    });
  }

  createPieceElement(piece) {
    const element = document.createElement('div');
    element.className = 'piece';
    element.id = `panel-${piece.id}`;
    element.innerHTML = `
      <div class="piece-preview" style="background-color: ${piece.color}"></div>
      <span>${piece.name}</span>
    `;
    element.onclick = () => this.selectOrCreatePiece(piece);
    return element;
  }

  createPieceMesh(piece) {
    const group = new THREE.Group();
    const material = new THREE.MeshPhongMaterial({
      color: piece.color,
      transparent: true,
      opacity: PIECE_OPACITY,
      shininess: 30
    });

    piece.baseShape.forEach(([x, y, z]) => {
      const geometry = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE);
      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(x + 0.5, y + 0.5, z + 0.5);
      group.add(cube);
    });

    group.userData = {
      pieceId: piece.id,
      baseShape: piece.baseShape.map(coord => [...coord]),
      rotation: { x: 0, y: 0, z: 0 },
      originalColor: piece.color
    };

    return group;
  }

  selectOrCreatePiece(piece) {
    if (this.placedPieces.has(piece.id)) {
      this.selectExistingPiece(piece.id);
    } else {
      this.createNewPiece(piece);
    }
  }

  selectExistingPiece(pieceId) {
    if (this.selectedPiece) {
      this.setPieceHighlight(this.selectedPiece, false);
      this.highlightPanel(this.selectedPiece.userData.pieceId, false);
    }
    this.selectedPiece = this.placedPieces.get(pieceId);
    this.setPieceHighlight(this.selectedPiece, true);
    this.highlightPanel(pieceId, true);
  }

  createNewPiece(piece) {
    const mesh = this.createPieceMesh(piece);
    const centerPos = Math.floor(3 / 2);
    mesh.position.set(centerPos, centerPos, centerPos);
    this.renderer.scene.add(mesh);
    this.placedPieces.set(piece.id, mesh);

    if (this.selectedPiece) {
      this.setPieceHighlight(this.selectedPiece, false);
      this.highlightPanel(this.selectedPiece.userData.pieceId, false);
    }
    this.selectedPiece = mesh;
    this.setPieceHighlight(this.selectedPiece, true);
    this.highlightPanel(piece.id, true);
  }

  setPieceHighlight(mesh, highlight) {
    mesh.traverse(obj => {
      if (obj.isMesh && obj.material) {
        obj.material.opacity = highlight ? PIECE_HIGHLIGHT_OPACITY : PIECE_OPACITY;
      }
    });
  }

  highlightPanel(pieceId, highlight) {
    const el = document.getElementById(`panel-${pieceId}`);
    if (el) el.style.background = highlight ? '#e0e0e0' : '';
  }

  movePiece(axis, direction) {
    if (!this.selectedPiece) return;
    const newPos = this.selectedPiece.position.clone();
    newPos[axis] += direction;
    newPos[axis] = Math.round(newPos[axis]);
    this.selectedPiece.position.copy(newPos);
  }

  rotatePiece(axis) {
    if (!this.selectedPiece) return;
    const rotation = this.selectedPiece.userData.rotation;
    rotation[axis] = (rotation[axis] + 90) % 360;
    this.selectedPiece.rotation.set(
      THREE.MathUtils.degToRad(rotation.x),
      THREE.MathUtils.degToRad(rotation.y),
      THREE.MathUtils.degToRad(rotation.z)
    );
  }

  removeSelectedPiece() {
    if (!this.selectedPiece) return;
    this.renderer.scene.remove(this.selectedPiece);
    this.placedPieces.delete(this.selectedPiece.userData.pieceId);
    this.selectedPiece = null;
  }

  updatePiecesPanel() {
    this.placedPieces.clear();
    this.selectedPiece = null;
    SOMA_PIECES.forEach(piece => this.highlightPanel(piece.id, false));

    const toRemove = [];
    this.renderer.scene.traverse(obj => {
      if (obj.isGroup && obj.userData && obj.userData.pieceId) {
        toRemove.push(obj);
      }
    });
    toRemove.forEach(obj => this.renderer.scene.remove(obj));
  }


  async loadGeneratedShapes(shapesData) {
    const panel = document.getElementById('pieces-container');
    if (!panel) return;
    panel.innerHTML = '';    
    this.placedPieces.clear(); 
    if (this.selectedPiece) {
      this.renderer.scene.remove(this.selectedPiece);
      this.selectedPiece = null;
    }

    let nextId = 1;
    const dynamicPieces = [];
    for (const [sizeStr, shapeList] of Object.entries(shapesData)) {
      for (const coords of shapeList) {
        const genId = `gen${nextId++}`;
        const color = new THREE.Color().setHSL(Math.random(), 0.5, 0.5);
        dynamicPieces.push({ id: genId, baseShape: coords, color });
      }
    }

    dynamicPieces.forEach(piece => {
      const pieceDiv = document.createElement('div');
      pieceDiv.className = 'piece-item';
      pieceDiv.id = `panel-${piece.id}`;

      const preview = document.createElement('div');
      preview.className = 'piece-preview';
      preview.style.backgroundColor = '#' + piece.color.getHexString();

      const label = document.createElement('span');
      label.textContent = `Size ${piece.baseShape.length} (#${piece.id})`;

      pieceDiv.appendChild(preview);
      pieceDiv.appendChild(label);

      pieceDiv.addEventListener('click', () => {
        this.placeGeneratedPiece(piece);
      });

      panel.appendChild(pieceDiv);
    });

    alert('Generated pieces are now in the side panel');
  }

  placeGeneratedPiece(desc) {
    if (this.selectedPiece) {
      this.setPieceHighlight(this.selectedPiece, false);
      this.highlightPanel(this.selectedPiece.userData.pieceId, false);
    }

    const group = new THREE.Group();
    const material = new THREE.MeshPhongMaterial({
      color: desc.color,
      transparent: true,
      opacity: PIECE_OPACITY,
      shininess: 30
    });

    desc.baseShape.forEach(([x, y, z]) => {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const cube = new THREE.Mesh(geo, material);
      cube.position.set(x + 0.5, y + 0.5, z + 0.5);
      group.add(cube);
    });

    group.userData = {
      pieceId: desc.id,
      baseShape: desc.baseShape.map(c => [...c]),
      rotation: { x: 0, y: 0, z: 0 },
      originalColor: desc.color
    };

    group.position.set(1, 1, 1);

    this.renderer.scene.add(group);
    this.placedPieces.set(desc.id, group);
    this.selectedPiece = group;
    this.setPieceHighlight(group, true);
    this.highlightPanel(desc.id, true);
  }
}
