# SOMA Cube Puzzle Solver

A web-based application for visualizing, creating, and solving SOMA cube puzzles by converting Three.js objects into text format for the YASS text-based solver. This project is for California Polytechnic State University - San Luis Obispo CSC 481-01 Knowledge-Based Systems with Rodrigo Canaan.

## Overview

This application provides an interactive GUI for working with SOMA cube puzzles - a classic 3D puzzle consisting of 7 irregular pieces that can be assembled into a 3x3x3 cube. Users can:

- Visualize and manipulate SOMA cube pieces
- Build custom SOMA cube configurations
- Validate puzzle configurations
- Generate complete solutions to 3D Rectangular Grids
- Attempt to solve known solutions outside of 3x3x3

The project combines a Flask backend that interfaces with the [Yass SOMA cube solver](https://github.com/thanks4opensource/yass) and a web-based frontend for user interaction.

## Project Structure

```
soma-puzzle-solver/
├── backend/
│   ├── app.py             # Flask server and API endpoints
│   ├── carver.py          # DFS piece carving
│   ├── piece_carver.py    # Flask API endpoints and puzzle cleaning
│   ├── test_carver.py     # Verify only unique pieces
│   ├── soma_grid.py       # 
│   ├── utils.py           # 
│   ├── shapes.json        # SOMA pieces definitions
│   └── yass/              # Yass solver (cloned from GitHub)
├── frontend/
│   ├── index.html         # Main HTML interface
│   ├── main.js            # Frontend application logic
│   ├── styles.css         # Application styling ## Moved to script inside index
│   └── assets/            # Images and other static assets
└── requirements.txt       # Python dependencies
├── Example Rules txt files/
│   ├── 2x2x2_incorrect    # Inpossible with unique, but possible without puzzle piece generation rules
│   ├── 2x2x2_rules        # Correct 2x2x2 cube puzzle piece rules
│   └── soma3x3x3_rules    # Rules for the SOMA cube. Lack of piece restrictions yield a different unique set from the SOMA puzzle
```

## Setup & Installation

### Prerequisites

- Python 3.6+ (Python 3.10+ recommended)
- Node.js (optional, for development)
- Git

### Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/soma-puzzle-solver.git
   cd soma-puzzle-solver
   ```

2. Clone the Yass solver repository:
   ```
   git clone https://github.com/gfonseca/yass.git backend/yass
   ```

3. Compile the Yass solver using the included makefile:
   ```
   cd backend/yass
   make
   cd ../..
   ```

4. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

### Running the Application

1. Start the Flask server:
   ```
   cd backend
   python app.py
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

## API Endpoints

- `GET /api/shapes` - Returns all SOMA piece definitions
- `POST /api/solve` - Submits a puzzle configuration and returns solutions
- `POST /api/hint` - Provides a single solution hint for a given configuration
- `POST /api/validate` - Checks if a configuration is valid/solvable
- `POST /api/validate_orientation` - Validates a specific piece orientation

## Current Status

This application is currently in development with basic functionality implemented. The core features include:
- Web-based GUI for SOMA cube visualization
- Integration with the Yass solver for puzzle solutions
- Basic puzzle validation and hint system

## Future Plans

We plan to enhance the application with the following features:

- Improved 3D visualization with rotating and zooming capabilities
- Step-by-step solution animations
- User accounts to save puzzle progress
- Library of classic SOMA cube challenges
- Mobile-friendly responsive design
- Performance optimizations for larger puzzle configurations
- Additional puzzle statistics and analysis tools

## Credits

- [Yass SOMA Cube Solver](https://github.com/gfonseca/yass) - The backend solver engine used in this project
- Original Yass implementation by [Guilherme Fonseca](https://github.com/gfonseca)
- SOMA Cube was invented by Piet Hein in 1933

## License

[MIT License](LICENSE)




## General Running Tips

- Rightclick + drag moves the grid (up/down zoom left/right move)
- leftclick + drag rotates the grid
- Drop Down menu selects abstract shapes loadable on the 3D grid.
- Reset Grid clears to the base grid selection overriding x,y,z selection
- Piece generation requires a legal rules.txt format, examples can be found in Example Rules txt files
- Delete is not cached to more than one shape given this is not a GUI focused product.