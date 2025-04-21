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
let initialCenterX = 0;
let initialCenterY = 0;

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

function handleZoomFullMode(mouseX, mouseY, zoomFactor, currentImage) {
    const canvasCenterX = canvas.width / 2;
    const canvasCenterY = canvas.height / 2;
    
    // Reverse transform stack to get image-relative position
    // 1. Start with mouse position
    // 2. Subtract canvas center (undo translate to center)
    // 3. Divide by zoom (undo scale)
    // 4. Subtract pan (undo pan translate)
    // 5. Add image center (undo -image center translate)
    const imageX = ((mouseX - canvasCenterX) / _zoom - _panX) + currentImage.naturalWidth / 2;
    const imageY = ((mouseY - canvasCenterY) / _zoom - _panY) + currentImage.naturalHeight / 2;
    
    // Apply zoom with more flexible minimum zoom in full mode
    const minZoom = Math.min(0.1, Math.min(
        canvas.width / currentImage.naturalWidth,
        canvas.height / currentImage.naturalHeight
    ));
    const newZoom = Math.min(Math.max(minZoom, _zoom * zoomFactor), 10);
    
    // Forward transform to get new pan
    // 1. Start with image position
    // 2. Subtract image center
    // 3. Multiply by new zoom
    // 4. Add new pan
    // 5. Add canvas center
    // Set equal to mouse position and solve for pan
    _panX = (mouseX - canvasCenterX) / newZoom - (imageX - currentImage.naturalWidth / 2);
    _panY = (mouseY - canvasCenterY) / newZoom - (imageY - currentImage.naturalHeight / 2);
    _zoom = newZoom;
}

function handleZoomCanvasMode(mouseX, mouseY, zoomFactor, currentImage, config) {
    // Calculate base scale to fit image in canvas
    const scale = Math.min(
        config.canvasWidth / currentImage.width,
        config.canvasHeight / currentImage.height
    );
    
    // Calculate base dimensions and center
    const baseWidth = currentImage.width * scale;
    const baseHeight = currentImage.height * scale;
    const canvasCenterX = (config.canvasWidth - baseWidth) / 2;
    const canvasCenterY = (config.canvasHeight - baseHeight) / 2;
    
    // Reverse transform to get image-relative position
    // 1. Start with mouse position
    // 2. Subtract canvas center and pan (undo translate to center + pan)
    // 3. Divide by (zoom * scale) (undo scale and zoom)
    const imageX = (mouseX - canvasCenterX - _panX) / (_zoom * scale);
    const imageY = (mouseY - canvasCenterY - _panY) / (_zoom * scale);
    
    // Apply zoom with fixed minimum for canvas mode
    const newZoom = Math.min(Math.max(0.1, _zoom * zoomFactor), 10);
    
    // Forward transform to get new pan
    // 1. Start with image position
    // 2. Multiply by (newZoom * scale)
    // 3. Add canvas center and new pan
    // Set equal to mouse position and solve for pan
    _panX = mouseX - canvasCenterX - (imageX * newZoom * scale);
    _panY = mouseY - canvasCenterY - (imageY * newZoom * scale);
    _zoom = newZoom;
}

export function initZoomPanListeners(canvas, currentImage, drawCanvas, config) {
    _drawCanvas = drawCanvas;
    
    // Mouse wheel zoom handler
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (!currentImage) return;

        // Get mouse position in canvas pixel space
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        
        // Apply zoom based on mode
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        if (config.viewMode === 'full') {
            handleZoomFullMode(mouseX, mouseY, zoomFactor, currentImage);
        } else {
            handleZoomCanvasMode(mouseX, mouseY, zoomFactor, currentImage, config);
        }
        
        scheduleRedraw();
    });

    // Touch gesture handling
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            
            // Get touch points in canvas pixel space
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const touch1X = (e.touches[0].clientX - rect.left) * scaleX;
            const touch1Y = (e.touches[0].clientY - rect.top) * scaleY;
            const touch2X = (e.touches[1].clientX - rect.left) * scaleX;
            const touch2Y = (e.touches[1].clientY - rect.top) * scaleY;
            
            // Calculate initial distance and center point
            initialDistance = Math.hypot(touch2X - touch1X, touch2Y - touch1Y);
            initialZoom = _zoom; // Store current zoom as initial zoom
            
            // Store initial center point
            initialCenterX = (touch1X + touch2X) / 2;
            initialCenterY = (touch1Y + touch2Y) / 2;
        } else if (e.touches.length === 1) {
            isTouchPanning = true;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            lastTouchX = (e.touches[0].clientX - rect.left) * scaleX;
            lastTouchY = (e.touches[0].clientY - rect.top) * scaleY;
        }
    });

    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            
            // Get touch points in canvas pixel space
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const touch1X = (e.touches[0].clientX - rect.left) * scaleX;
            const touch1Y = (e.touches[0].clientY - rect.top) * scaleY;
            const touch2X = (e.touches[1].clientX - rect.left) * scaleX;
            const touch2Y = (e.touches[1].clientY - rect.top) * scaleY;
            
            // Calculate current distance and center point
            const currentDistance = Math.hypot(touch2X - touch1X, touch2Y - touch1Y);
            const currentCenterX = (touch1X + touch2X) / 2;
            const currentCenterY = (touch1Y + touch2Y) / 2;
            
            if (config.viewMode === 'full') {
                // Full image mode - calculate image-relative position
                const canvasCenterX = canvas.width / 2;
                const canvasCenterY = canvas.height / 2;
                
                // Reverse transform stack to get image-relative position
                const imageX = ((initialCenterX - canvasCenterX) / initialZoom - _panX) + currentImage.naturalWidth / 2;
                const imageY = ((initialCenterY - canvasCenterY) / initialZoom - _panY) + currentImage.naturalHeight / 2;
                
                // Apply zoom with more flexible minimum zoom in full mode
                const minZoom = Math.min(0.1, Math.min(
                    canvas.width / currentImage.naturalWidth,
                    canvas.height / currentImage.naturalHeight
                ));
                const scale = currentDistance / initialDistance;
                const newZoom = Math.min(Math.max(minZoom, initialZoom * scale), 10);
                
                // Forward transform to get new pan
                _panX = (currentCenterX - canvasCenterX) / newZoom - (imageX - currentImage.naturalWidth / 2);
                _panY = (currentCenterY - canvasCenterY) / newZoom - (imageY - currentImage.naturalHeight / 2);
                _zoom = newZoom;
            } else {
                // Canvas mode - existing logic
                const scale = currentDistance / initialDistance;
                _zoom = Math.min(Math.max(0.1, initialZoom * scale), 10);
                
                // Update pan based on center point movement
                const deltaX = currentCenterX - initialCenterX;
                const deltaY = currentCenterY - initialCenterY;
                _panX += deltaX;
                _panY += deltaY;
            }
            
            scheduleRedraw();
        } else if (e.touches.length === 1 && isTouchPanning) {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const currentTouchX = (e.touches[0].clientX - rect.left) * scaleX;
            const currentTouchY = (e.touches[0].clientY - rect.top) * scaleY;
            
            if (config.viewMode === 'full') {
                // In full mode, scale deltas by zoom level
                const deltaX = (currentTouchX - lastTouchX) / _zoom;
                const deltaY = (currentTouchY - lastTouchY) / _zoom;
                _panX += deltaX;
                _panY += deltaY;
            } else {
                // Canvas mode - use raw deltas
                const deltaX = currentTouchX - lastTouchX;
                const deltaY = currentTouchY - lastTouchY;
                _panX += deltaX;
                _panY += deltaY;
            }
            
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
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        if (config.viewMode === 'full') {
            // In full mode, scale deltas by zoom level
            const deltaX = (mouseX - lastMouseX) / _zoom;
            const deltaY = (mouseY - lastMouseY) / _zoom;
            _panX += deltaX;
            _panY += deltaY;
        } else {
            // Canvas mode - use raw deltas
            const deltaX = mouseX - lastMouseX;
            const deltaY = mouseY - lastMouseY;
            _panX += deltaX;
            _panY += deltaY;
        }
        
        lastMouseX = mouseX;
        lastMouseY = mouseY;
        
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