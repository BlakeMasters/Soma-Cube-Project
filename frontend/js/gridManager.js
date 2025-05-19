import * as THREE from 'three';
import { GRID_SIZE } from './constants.js';

export class GridManager {
    constructor(renderer) {
        this.renderer = renderer;
        this.gridGroup = null;
    }

    async loadGrid() {
        try {
            const response = await fetch('/api/grid');
            const gridData = await response.json();
            // For now, we'll use the default 3x3x3 grid
            return this.createGrid();
        } catch (error) {
            console.error('Error loading grid:', error);
            return this.createGrid();
        }
    }

    createGrid() {
        const gridGroup = new THREE.Group();
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x808080, linewidth: 2 });
        const min = 0;
        const max = GRID_SIZE;

        // Create grid lines
        for (let x = 0; x <= GRID_SIZE; x++) {
            for (let z = 0; z <= GRID_SIZE; z++) {
                const geometry = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(min + x, min, min + z),
                    new THREE.Vector3(min + x, max, min + z)
                ]);
                gridGroup.add(new THREE.Line(geometry, lineMaterial));
            }
        }

        // Create horizontal lines
        for (let y = 0; y <= GRID_SIZE; y++) {
            for (let z = 0; z <= GRID_SIZE; z++) {
                const geometry = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(min, min + y, min + z),
                    new THREE.Vector3(max, min + y, min + z)
                ]);
                gridGroup.add(new THREE.Line(geometry, lineMaterial));
            }
        }

        for (let x = 0; x <= GRID_SIZE; x++) {
            for (let y = 0; y <= GRID_SIZE; y++) {
                const geometry = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(min + x, min + y, min),
                    new THREE.Vector3(min + x, min + y, max)
                ]);
                gridGroup.add(new THREE.Line(geometry, lineMaterial));
            }
        }

        this.gridGroup = gridGroup;
        this.renderer.scene.add(gridGroup);
        return gridGroup;
    }
} 