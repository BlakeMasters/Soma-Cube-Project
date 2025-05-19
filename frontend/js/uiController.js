import { Utilities } from './utils.js';
import { GRID_SIZE, SOMA_PIECES, VALID_PIECES } from './constants.js';
import * as THREE from 'three';

export class UIController {
    constructor(pieceManager) {
        this.pieceManager = pieceManager;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('check-solution').addEventListener('click', () => this.checkSolution());
        document.getElementById('get-hint').addEventListener('click', () => this.getHint());
        document.getElementById('reset-grid').addEventListener('click', () => this.resetGrid());
        document.getElementById('remove-selected').addEventListener('click', () => this.pieceManager.removeSelectedPiece());
        window.addEventListener('keydown', (event) => this.handleKeyDown(event));
    }

    handleKeyDown(event) {
        if (!this.pieceManager.selectedPiece) return;
        
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
            event.preventDefault();
        }
        
        switch(event.key) {
            case 'ArrowLeft': this.pieceManager.movePiece('x', -1); break;
            case 'ArrowRight': this.pieceManager.movePiece('x', 1); break;
            case 'ArrowUp': this.pieceManager.movePiece('y', 1); break;
            case 'ArrowDown': this.pieceManager.movePiece('y', -1); break;
            case 'z': this.pieceManager.movePiece('z', -1); break;
            case 'x': this.pieceManager.movePiece('z', 1); break;
            case 'r': this.pieceManager.rotatePiece('x'); break;
            case 'f': this.pieceManager.rotatePiece('y'); break;
            case 'v': this.pieceManager.rotatePiece('z'); break;
            case 'Delete': this.pieceManager.removeSelectedPiece(); break;
        }
    }

    async checkSolution() {
        const gridState = this.scanGridState();
        
        if (!this.isGridFilled(gridState)) {
            Utilities.showMessage('Please fill all cells in the grid');
            return false;
        }
        
        const yassFormat = this.convertToYassFormat(gridState);
        console.log('Sending yass format:', yassFormat); // Debug log
        
        try {
            const response = await fetch('/api/check-solution', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grid_state: yassFormat })
            });
            
            if (!response.ok) throw new Error('Failed to check solution');
            
            const data = await response.json();
            console.log('Solution check response:', data); // Debug log
            
            // Use the message from the backend response
            Utilities.showMessage(data.message);
            return data.valid;
        } catch (error) {
            console.error('Error checking solution:', error);
            Utilities.showMessage('Failed to check solution. Please try again.');
            return false;
        }
    }

    isGridFilled(gridState) {
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                for (let z = 0; z < GRID_SIZE; z++) {
                    if (!gridState[x][y][z]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    hasOverlappingPieces(gridState) {
        const pieceCounts = new Map();
        
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                for (let z = 0; z < GRID_SIZE; z++) {
                    const pieceId = gridState[x][y][z];
                    if (pieceId) {
                        pieceCounts.set(pieceId, (pieceCounts.get(pieceId) || 0) + 1);
                    }
                }
            }
        }

        for (const [pieceId, count] of pieceCounts) {
            const piece = SOMA_PIECES.find(p => p.id === pieceId);
            if (piece && count > piece.baseShape.length) {
                return true;
            }
        }

        return false;
    }

    async getHint() {
        const gridState = this.scanGridState();
        
        // Check for overlapping pieces
        if (this.hasOverlappingPieces(gridState)) {
            Utilities.showMessage('Pieces cannot overlap');
            return null;
        }

        const yassFormat = this.convertToYassFormat(gridState);
        
        try {
            const response = await fetch('/api/get-hint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grid_state: yassFormat })
            });
            
            if (!response.ok) throw new Error('Failed to get hint');
            
            const data = await response.json();
            if (data.error) {
                Utilities.showMessage(data.error);
                return null;
            }
            Utilities.showMessage(data.hint);
            return data.hint;
        } catch (error) {
            console.error('Error getting hint:', error);
            Utilities.showMessage('Failed to get hint. Please try again.');
            return null;
        }
    }

    resetGrid() {
        // Remove all pieces from the scene
        for (const id in this.pieceManager.placedPieces) {
            this.pieceManager.renderer.scene.remove(this.pieceManager.placedPieces[id]);
        }
        this.pieceManager.placedPieces = {};
        this.pieceManager.selectedPiece = null;
        this.pieceManager.updatePiecesPanel();
        Utilities.showMessage('Grid has been reset');
    }

    scanGridState() {
        const currentState = Array(GRID_SIZE).fill().map(() => 
            Array(GRID_SIZE).fill().map(() => 
                Array(GRID_SIZE).fill(null)
            )
        );
        
        this.pieceManager.renderer.scene.traverse(object => {
            if (object.isMesh && object.parent && object.parent.userData.pieceId) {
                const worldPos = new THREE.Vector3();
                object.getWorldPosition(worldPos);
                
                const gx = Math.floor(worldPos.x);
                const gy = Math.floor(worldPos.y);
                const gz = Math.floor(worldPos.z);
                
                if (gx >= 0 && gx < GRID_SIZE &&
                    gy >= 0 && gy < GRID_SIZE &&
                    gz >= 0 && gz < GRID_SIZE) {
                    currentState[gx][gy][gz] = object.parent.userData.pieceId;
                }
            }
        });
        
        return currentState;
    }

    convertToYassFormat(gridState) {
        let yassFormat = '';
        for (let z = 0; z < GRID_SIZE; z++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                for (let x = 0; x < GRID_SIZE; x++) {
                    const pieceId = gridState[x][y][z];
                    const yassChar = pieceId || '.';
                    yassFormat += yassChar;
                }
                yassFormat += '\n';
            }
            if (z < GRID_SIZE - 1) {
                yassFormat += '\n';
            }
        }
        return yassFormat;
    }
} 