export const GRID_SIZE = 3;
export const CELL_SIZE = 1;
export const PIECE_OPACITY = 0.95;
export const PIECE_HIGHLIGHT_OPACITY = 0.6;

// YASS format piece identifiers
export const SOMA_PIECES = [
    {
        id: "3",  // V piece
        name: "V Shape",
        color: "#FF0000",
        baseShape: [ [0,0,0], [1,0,0], [0,1,0] ]
    },
    {
        id: "l",
        name: "L Shape",
        color: "#00FF00",
        baseShape: [ [0,0,0], [1,0,0], [2,0,0], [0,1,0] ]
    },
    {
        id: "t",
        name: "T Shape",
        color: "#0000FF",
        baseShape: [ [0,0,0], [1,0,0], [2,0,0], [1,1,0] ]
    },
    {
        id: "z",
        name: "Z Shape",
        color: "#FFFF00",
        baseShape: [ [0,0,0], [1,0,0], [1,1,0], [2,1,0] ]
    },
    {
        id: "p",  // A piece
        name: "A Shape",
        color: "#FF00FF",
        baseShape: [ [0,0,0], [1,0,0], [1,1,0], [1,1,1] ]
    },
    {
        id: "n",  // B piece
        name: "B Shape",
        color: "#00FFFF",
        baseShape: [ [0,0,0], [1,0,0], [1,0,1], [1,1,1] ]
    },
    {
        id: "c",
        name: "Corner Shape",
        color: "#FFA500",
        baseShape: [ [0,0,0], [1,0,0], [0,1,0], [0,0,1] ]
    }
];

// Set of valid piece identifiers
export const VALID_PIECES = new Set(['3', 'l', 't', 'z', 'p', 'n', 'c']); 