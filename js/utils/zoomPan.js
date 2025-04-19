// Zoom and pan state
let _zoom = 1;
let _panX = 0;
let _panY = 0;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Touch gesture state
let initialDistance = 0;
let initialZoom = 1;

// Getters and setters for state
export function getZoom() { return _zoom; }
export function setZoom(value) { _zoom = value; }
export function getPanX() { return _panX; }
export function setPanX(value) { _panX = value; }
export function getPanY() { return _panY; }
export function setPanY(value) { _panY = value; }

export function resetZoomAndPan(drawCanvas) {
    _zoom = 1;
    _panX = 0;
    _panY = 0;
    drawCanvas();
}

export function zoomTo100(currentImage, drawCanvas) {
    if (!currentImage) return;
    
    // Set zoom to 1 (100%)
    _zoom = 1;
    
    // Center the image
    const container = document.querySelector('.relative.w-full');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate center position
    _panX = (containerWidth - currentImage.naturalWidth) / 2;
    _panY = (containerHeight - currentImage.naturalHeight) / 2;
    
    // Redraw canvas
    drawCanvas();
}

export function initZoomPanListeners(canvas, currentImage, drawCanvas) {
    // Mouse wheel zoom handler
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (!currentImage) return;

        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        _zoom *= zoomFactor;
        _zoom = Math.min(Math.max(0.1, _zoom), 10);
        
        drawCanvas();
    });

    // Touch gesture handling
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            initialDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            initialZoom = _zoom;
        }
    });

    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const currentDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            
            const scale = currentDistance / initialDistance;
            _zoom = Math.min(Math.max(0.1, initialZoom * scale), 10);
            
            drawCanvas();
        }
    });

    // Mouse drag pan
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastMouseX = e.offsetX;
        lastMouseY = e.offsetY;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.offsetX - lastMouseX;
        const deltaY = e.offsetY - lastMouseY;
        
        _panX += deltaX;
        _panY += deltaY;
        
        lastMouseX = e.offsetX;
        lastMouseY = e.offsetY;
        
        drawCanvas();
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
    });

    // Add keyboard shortcuts for zooming
    document.addEventListener('keydown', (e) => {
        if (e.key === '+' || e.key === '=') {
            _zoom = Math.min(10, _zoom + 0.1);
            drawCanvas();
        } else if (e.key === '-' || e.key === '_') {
            _zoom = Math.max(0.1, _zoom - 0.1);
            drawCanvas();
        }
    });
}

// Export state for use in other modules
export { _zoom, _panX, _panY }; 