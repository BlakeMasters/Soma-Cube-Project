export class Utilities {
    static showMessage(message, duration = 2000) {
        const messageDiv = document.getElementById('message');
        if (messageDiv) {
            messageDiv.textContent = message;
            messageDiv.style.display = 'block';
            
            if (duration > 0) {
                setTimeout(() => {
                    messageDiv.style.display = 'none';
                }, duration);
            }
        }
    }

    static isWithinGridBounds(position, gridSize) {
        return position.x >= 0 && position.x < gridSize &&
               position.y >= 0 && position.y < gridSize &&
               position.z >= 0 && position.z < gridSize;
    }
} 