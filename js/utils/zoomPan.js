// Zoom and pan state
let _zoom = 1;
let _panX = 0;
let _panY = 0;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let animationFrameId = null;
let _drawCanvas = null;

// Touch gesture state
let initialDistance = 0;
let initialZoom = 1;
let lastTouchX = 0;
let lastTouchY = 0;
let isTouchPanning = false;

// Getters and setters for state
export function getZoom() { return _zoom; }
export function setZoom(value) { 
    _zoom = value;
    scheduleRedraw();
}
export function getPanX() { return _panX; }
export function setPanX(value) { 
    _panX = value;
    scheduleRedraw();
}
export function getPanY() { return _panY; }
export function setPanY(value) { 
    _panY = value;
    scheduleRedraw();
}

// Helper function to schedule canvas redraw
function scheduleRedraw() {
    if (!_drawCanvas) return;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    animationFrameId = requestAnimationFrame(() => {
        _drawCanvas();
        animationFrameId = null;
    });
}

export function resetZoomAndPan(drawCanvas) {
    _zoom = 1;
    _panX = 0;
    _panY = 0;
    drawCanvas();
}

export function zoomTo100(currentImage, drawCanvas, config) {
    if (!currentImage) return;
    
    // Set zoom to 1 (100%)
    _zoom = 1;
    
    // Reset pan to center
    _panX = 0;
    _panY = 0;
    
    // Redraw canvas
    drawCanvas();
}

export function initZoomPanListeners(canvas, currentImage, drawCanvas, config) {
    _drawCanvas = drawCanvas;
    
    console.log('Initializing zoom pan listeners');
    console.log('Canvas:', canvas);
    console.log('Current image:', currentImage);
    
    // Mouse wheel zoom handler
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (!currentImage) return;

        // Get mouse position relative to canvas container
        const containerRect = canvas.parentElement.getBoundingClientRect();
        const mouseX = e.clientX - containerRect.left;
        const mouseY = e.clientY - containerRect.top;

        // Get container center
        const centerX = containerRect.width / 2;
        const centerY = containerRect.height / 2;

        if (config.viewMode === 'full') {
            // Full image mode
            console.log('Mouse position:', { mouseX, mouseY });
            console.log('Container center:', { centerX, centerY });
            console.log('Current pan:', { panX: _panX, panY: _panY });
            console.log('Current zoom:', _zoom);

            // Calculate the point in image space before zoom
            const imageX = (mouseX - centerX - _panX) / _zoom;
            const imageY = (mouseY - centerY - _panY) / _zoom;
            console.log('Point in image space:', { imageX, imageY });

            // Apply zoom
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.min(Math.max(0.1, _zoom * zoomFactor), 10);
            console.log('New zoom:', newZoom);
            
            // Calculate new pan to keep the point under the cursor fixed
            _panX = mouseX - centerX - (imageX * newZoom);
            _panY = mouseY - centerY - (imageY * newZoom);
            
            console.log('New pan:', { newPanX: _panX, newPanY: _panY });
            _zoom = newZoom;
        } else {
            // Canvas mode
            const scale = Math.min(
                config.canvasWidth / currentImage.width,
                config.canvasHeight / currentImage.height
            );
            
            const baseWidth = currentImage.width * scale;
            const baseHeight = currentImage.height * scale;
            const canvasCenterX = (config.canvasWidth - baseWidth) / 2;
            const canvasCenterY = (config.canvasHeight - baseHeight) / 2;
            
            // Calculate the point in image space before zoom
            const imageX = (mouseX - canvasCenterX - _panX) / (_zoom * scale);
            const imageY = (mouseY - canvasCenterY - _panY) / (_zoom * scale);
            
            // Apply zoom
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.min(Math.max(0.1, _zoom * zoomFactor), 10);
            
            // Calculate new pan to keep the point under the cursor fixed
            _panX = mouseX - canvasCenterX - (imageX * newZoom * scale);
            _panY = mouseY - canvasCenterY - (imageY * newZoom * scale);
            
            _zoom = newZoom;
        }
        
        scheduleRedraw();
    });

    // Touch gesture handling
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            initialDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            initialZoom = _zoom;
        } else if (e.touches.length === 1) {
            isTouchPanning = true;
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
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
            
            scheduleRedraw();
        } else if (e.touches.length === 1 && isTouchPanning) {
            e.preventDefault();
            const currentTouchX = e.touches[0].clientX;
            const currentTouchY = e.touches[0].clientY;
            
            const deltaX = currentTouchX - lastTouchX;
            const deltaY = currentTouchY - lastTouchY;
            
            _panX += deltaX;
            _panY += deltaY;
            
            lastTouchX = currentTouchX;
            lastTouchY = currentTouchY;
            
            scheduleRedraw();
        }
    });

    canvas.addEventListener('touchend', (e) => {
        isTouchPanning = false;
        if (e.touches.length === 0) {
            initialDistance = 0;
            initialZoom = 1;
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
        
        const deltaX = (e.offsetX - lastMouseX) / _zoom;
        const deltaY = (e.offsetY - lastMouseY) / _zoom;
        
        _panX += deltaX;
        _panY += deltaY;
        
        lastMouseX = e.offsetX;
        lastMouseY = e.offsetY;
        
        scheduleRedraw();
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
            scheduleRedraw();
        } else if (e.key === '-' || e.key === '_') {
            _zoom = Math.max(0.1, _zoom - 0.1);
            scheduleRedraw();
        }
    });
}

export function calculateGridSizeLimits(width, height, viewMode, config) {
    // Calculate both smaller and larger dimensions
    const smallerDimension = Math.min(width, height);
    const largerDimension = Math.max(width, height);
    
    // Set minimum grid size to 1/50th of the smaller dimension
    const minGridSize = Math.max(1, Math.floor(smallerDimension / 50));
    
    // Set maximum grid size to 1/3 of the larger dimension
    const maxGridSize = Math.floor(largerDimension / 3);
    
    // Calculate mid point for default grid size
    const midGridSize = Math.floor((minGridSize + maxGridSize) / 2);
    
    if (viewMode === 'canvas') {
        // Convert to cm/in based on canvas width
        const pixelsPerCm = width / config.canvasWidthCm;
        return {
            min: (minGridSize / pixelsPerCm).toFixed(1),
            max: (maxGridSize / pixelsPerCm).toFixed(1),
            mid: (midGridSize / pixelsPerCm).toFixed(1)
        };
    } else {
        // Full image mode - use pixels directly
        return {
            min: minGridSize,
            max: maxGridSize,
            mid: midGridSize
        };
    }
}

// Export state for use in other modules
export { _zoom, _panX, _panY }; 