import * as THREE from 'three';
import { SOMA_PIECES, CELL_SIZE, PIECE_OPACITY, PIECE_HIGHLIGHT_OPACITY, GRID_SIZE } from './constants.js';

export class PieceManager {
    constructor(renderer) {
        this.renderer = renderer;
        this.selectedPiece = null;
        this.placedPieces = {};
        this.availablePieces = [...SOMA_PIECES];
    }

    createPiecesPanel() {
        this.updatePiecesPanel();
    }

    updatePiecesPanel() {
        const piecesPanel = document.getElementById('pieces-panel');
        if (!piecesPanel) return;
        
        // Clear only the pieces, not the header
        const piecesContainer = piecesPanel.querySelector('.pieces-container');
        if (piecesContainer) {
            piecesContainer.innerHTML = '';
        } else {
            // If container doesn't exist, create it
            const container = document.createElement('div');
            container.className = 'pieces-container';
            piecesPanel.appendChild(container);
        }
        
        // const nonePiece = {
        //     id: 'None',
        //     name: 'Deselect',
        //     color: '#CCCCCC'
        // };
        // const noneElement = document.createElement('div');
        // noneElement.className = 'piece';
        // noneElement.id = 'panel-None';
        // noneElement.innerHTML = `
        //     <div class="piece-preview" style="background-color: ${nonePiece.color}"></div>
        //     <span>${nonePiece.name}</span>
        // `;
        // noneElement.onclick = () => this.selectOrCreatePiece(nonePiece);
        // piecesPanel.appendChild(noneElement);
        
        SOMA_PIECES.forEach(piece => {
            const pieceElement = document.createElement('div');
            pieceElement.className = 'piece';
            pieceElement.id = `panel-${piece.id}`;
            pieceElement.innerHTML = `
                <div class="piece-preview" style="background-color: ${piece.color}"></div>
                <span>${piece.name}</span>
            `;
            pieceElement.onclick = () => this.selectOrCreatePiece(piece);
            piecesPanel.querySelector('.pieces-container').appendChild(pieceElement);
        });
    }

    createPieceMesh(piece) {
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
            cube.position.set(x + 0.5, y + 0.5, z + 0.5);
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

    selectOrCreatePiece(piece) {
        // if (piece.id === 'None') {
        //     if (this.selectedPiece) {
        //         this.setPieceHighlight(this.selectedPiece, false);
        //         this.highlightPanel(this.selectedPiece.userData.pieceId, false);
        //     }
        //     this.selectedPiece = null;
        //     this.highlightPanel('None', true);
        //     return;
        // }
        
        if (this.placedPieces[piece.id]) {
            if (this.selectedPiece) {
                this.setPieceHighlight(this.selectedPiece, false);
                this.highlightPanel(this.selectedPiece.userData.pieceId, false);
            }
            this.selectedPiece = this.placedPieces[piece.id];
            this.setPieceHighlight(this.selectedPiece, true);
            this.highlightPanel(piece.id, true);
        } else {
            const mesh = this.createPieceMesh(piece);
            const centerPos = Math.floor(GRID_SIZE / 2);
            mesh.position.set(centerPos, centerPos, centerPos);
            this.renderer.scene.add(mesh);
            this.placedPieces[piece.id] = mesh;
            
            if (this.selectedPiece) {
                this.setPieceHighlight(this.selectedPiece, false);
                this.highlightPanel(this.selectedPiece.userData.pieceId, false);
            }
            this.selectedPiece = mesh;
            this.setPieceHighlight(this.selectedPiece, true);
            this.highlightPanel(piece.id, true);
        }
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
        newPos.x = Math.round(newPos.x);
        newPos.y = Math.round(newPos.y);
        newPos.z = Math.round(newPos.z);
        
        this.selectedPiece.position.copy(newPos);
    }

    rotatePiece(axis) {
        if (!this.selectedPiece) return;
        
        const newRot = { ...this.selectedPiece.userData.rotation };
        newRot[axis] = (newRot[axis] + 90) % 360;
        newRot.x = Math.round(newRot.x / 90) * 90;
        newRot.y = Math.round(newRot.y / 90) * 90;
        newRot.z = Math.round(newRot.z / 90) * 90;
        
        this.selectedPiece.userData.rotation = newRot;
        this.selectedPiece.rotation.set(
            THREE.MathUtils.degToRad(newRot.x),
            THREE.MathUtils.degToRad(newRot.y),
            THREE.MathUtils.degToRad(newRot.z)
        );
    }

    removeSelectedPiece() {
        if (!this.selectedPiece) return;
        
        this.renderer.scene.remove(this.selectedPiece);
        delete this.placedPieces[this.selectedPiece.userData.pieceId];
        this.selectedPiece = null;
        this.updatePiecesPanel();
    }
} 