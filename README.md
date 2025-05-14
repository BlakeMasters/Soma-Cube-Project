# SOMA Cube Puzzle Solver

A web-based application for visualizing, creating, and solving SOMA cube puzzles by converting Three.js objects into text format for the YASS text-based solver

## Overview

This application provides an interactive GUI for working with SOMA cube puzzles - a classic 3D puzzle consisting of 7 irregular pieces that can be assembled into a 3x3x3 cube. Users can:

- Visualize and manipulate SOMA cube pieces
- Build custom SOMA cube configurations
- Validate puzzle configurations
- Get hints for solving difficult puzzles
- Generate complete solutions

The project combines a Flask backend that interfaces with the [Yass SOMA cube solver](https://github.com/thanks4opensource/yass) and a web-based frontend for user interaction.

## Project Structure

```
soma-puzzle-solver/
├── backend/
│   ├── app.py             # Flask server and API endpoints
│   ├── shapes.json        # SOMA pieces definitions
│   └── yass/              # Yass solver (cloned from GitHub)
├── frontend/
│   ├── index.html         # Main HTML interface
│   ├── main.js            # Frontend application logic
│   ├── styles.css         # Application styling
│   └── assets/            # Images and other static assets
└── requirements.txt       # Python dependencies
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

2. Compile the Yass solver using the included makefile:
   ```
   cd backend/yass
   make
   cd ../..
   ```

3. Play around with yass using different inputs and flags
   ```
   ./soma -h
   ./soma -a figures/cube.soma
   ```


### Running the Application

1. Setup a virtual environment
   ```
   python3 -m venv venv
   source venv/bin/activate
   ```

2. Install Python dependencies:
   ```
   pip3 install -r requirements.txt
   ```

3. Start the Flask server:
   ```
   cd backend
   python app.py
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

## Current Status

This application is currently in development with basic functionality implemented. The core features include:
- Web-based GUI for SOMA cube visualization
- Integration with the Yass solver for puzzle solutions
- Basic puzzle validation and hint system

## Future Plans

We plan to enhance the application with the following features:

- Improved 3D visualization with rotating and zooming capabilities
- Hint function will display next viable piece on the grid
- User accounts to save puzzle progress
- Library of classic SOMA cube challenges
- Performance optimizations for larger puzzle configurations
- Additional puzzle statistics and analysis tools

## Credits

- [Yass SOMA Cube Solver](https://github.com/gfonseca/yass) - The backend solver engine used in this project
- Original Yass implementation by [Guilherme Fonseca](https://github.com/gfonseca)
- SOMA Cube was invented by Piet Hein in 1933

## License

[MIT License](LICENSE)
