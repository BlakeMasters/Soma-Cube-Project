import { Renderer } from './renderer.js';
import { PieceManager } from './pieceManager.js';
import { UIController } from './uiController.js';
import { GridManager } from './gridManager.js';
import { SOMA_PIECES, GRID_SIZE } from './constants.js';
import { Utilities } from './utils.js';

// Global State
let renderer;
let gridManager;
let pieceManager;
let uiController;
let solvedSolutions = new Set();

// Initialize the application
async function init() {
    renderer = new Renderer();
    renderer.init();
    
    gridManager = new GridManager(renderer);
    await gridManager.loadGrid();
    
    pieceManager = new PieceManager(renderer);
    uiController = new UIController(pieceManager);
    pieceManager.createPiecesPanel();
    
    window.addEventListener('resize', () => renderer.onWindowResize());
    renderer.animate();
}

document.addEventListener('DOMContentLoaded', init);