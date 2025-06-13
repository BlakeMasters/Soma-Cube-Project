import * as THREE from 'three';

export class GridManager {
    constructor(scene) {
        if (!(scene instanceof THREE.Scene)) {
            throw new Error('GridManager requires a THREE.Scene instance');
        }
        this.scene = scene;
        this.dimensions = { width: 0, height: 0, depth: 0 };
        this.occupiedCells = new Set();
        this.gridGroup = new THREE.Group();
        this.originalShape = null;
        this.scene.add(this.gridGroup);
    }

    async loadGrid(shapeId) {
        try {
            const gridData = await this.fetchGridData(shapeId);
            this.resetGridState();
            this.updateGridState(gridData);
            this.createGrid();
            return true;
        } catch (error) {
            console.error('Error loading grid:', error);
            return false;
        }
    }

    async fetchGridData(shapeId) {
        const response = await fetch(`/api/soma/${shapeId}.soma`);
        if (!response.ok) throw new Error(`Failed to load ${shapeId}.soma`);
        return response.json();
    }

    setEmptyGrid(width, height, depth) {
        this.dimensions = { width, height, depth };
        this.occupiedCells = new Set();
        this.originalShape = null; 

        this.clearGridLines();
        this.createGrid();

        console.log(`Grid resized to ${width}×${height}×${depth}`);
    }

    createGrid() {
        this.clearGridLines();
        const mat = new THREE.LineBasicMaterial({ color: 0x808080 });
        const w = this.dimensions.width,
                h = this.dimensions.height,
                d = this.dimensions.depth;

        if (!this.originalShape) {

            for (let y = 0; y <= h; y++) {
            for (let z = 0; z <= d; z++) {
                this.addLine(mat,
                new THREE.Vector3(0, y, z),
                new THREE.Vector3(w, y, z)
                );
            }
            }

            for (let x = 0; x <= w; x++) {
            for (let z = 0; z <= d; z++) {
                this.addLine(mat,
                new THREE.Vector3(x, 0, z),
                new THREE.Vector3(x, h, z)
                );
            }
            }

            for (let x = 0; x <= w; x++) {
            for (let y = 0; y <= h; y++) {
                this.addLine(mat,
                new THREE.Vector3(x, y, 0),
                new THREE.Vector3(x, y, d)
                );
            }
            }
            return;
        }

        const edges = this.calculateGridEdges();
        edges.forEach(([start, end]) => {
            this.addLine(mat, start, end);
        });
    }


    addLine(material, start, end) {
        const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        const line = new THREE.Line(geometry, material);
        this.gridGroup.add(line);
    }

    clearGridLines() {
        while(this.gridGroup.children.length > 0) { 
            this.gridGroup.remove(this.gridGroup.children[0]); 
        }
    }

    updateGridState(data) {
        this.dimensions = data.dimensions;
        this.occupiedCells = new Set(data.occupied_cells.map(cell => 
            `${cell[0]},${cell[1]},${cell[2]}`
        ));
        this.originalShape = data.original_shape;
    }

    resetGridState() {
        this.dimensions = { width: 0, height: 0, depth: 0 };
        this.occupiedCells = new Set();
        this.originalShape = null;
    }

    calculateGridEdges() {
        const edges = new Set();
        
        for (const cellStr of this.occupiedCells) {
            const [x, y, z] = cellStr.split(',').map(Number);
            const cellEdges = this.getCellEdges(x, y, z);
            cellEdges.forEach(edge => edges.add(edge));
        }
        
        return Array.from(edges);
    }

    getCellEdges(x, y, z) {
        const edges = [];
        const corners = [
            [x, y, z], [x+1, y, z], [x, y+1, z], [x+1, y+1, z],
            [x, y, z+1], [x+1, y, z+1], [x, y+1, z+1], [x+1, y+1, z+1]
        ];

        edges.push([corners[0], corners[1]], [corners[0], corners[2]],
                   [corners[1], corners[3]], [corners[2], corners[3]]);
        edges.push([corners[4], corners[5]], [corners[4], corners[6]],
                   [corners[5], corners[7]], [corners[6], corners[7]]);
        edges.push([corners[0], corners[4]], [corners[1], corners[5]],
                   [corners[2], corners[6]], [corners[3], corners[7]]);

        return edges.map(([start, end]) => [
            new THREE.Vector3(...start),
            new THREE.Vector3(...end)
        ]);
    }

    isOccupiedCell(x, y, z) {return this.occupiedCells.has(`${x},${y},${z}`);}

    isWithinBounds(x, y, z) {
        return x >= 0 && x < this.dimensions.width &&
               y >= 0 && y < this.dimensions.height &&
               z >= 0 && z < this.dimensions.depth;
    }

    getDimensions() {return this.dimensions;}

    getOriginalCell(x, y, z) {
        if (!this.originalShape) return '*';
        
        const layers = this.originalShape.split('\n\n');
        if (z >= layers.length) return '*';
        
        const rows = layers[z].split('\n');
        if (y >= rows.length) return '*';
        
        const row = rows[y];
        if (x >= row.length) return '*';
        
        const cell = row[x];
        return cell === '*' || cell === 'o' ? cell : '*';
    }
} 