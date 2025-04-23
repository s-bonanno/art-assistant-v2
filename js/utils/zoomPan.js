import { FullScreenZoomManager, CanvasZoomManager } from './zoomManager.js';

let zoomManager = null;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Touch gesture state
let initialDistance = 0;
let lastTouchX = 0;
let lastTouchY = 0;
let isTouchPanning = false;
let initialCenterX = 0;
let initialCenterY = 0;

// Getters and setters for state
export function getZoom() { return zoomManager ? zoomManager.getZoom() : 1; }
export function setZoom(value) { 
    if (zoomManager) zoomManager.setZoom(value);
}
export function getPanX() { return zoomManager ? zoomManager.getPanX() : 0; }
export function setPanX(value) { 
    if (zoomManager) zoomManager.setPanX(value);
}
export function getPanY() { return zoomManager ? zoomManager.getPanY() : 0; }
export function setPanY(value) { 
    if (zoomManager) zoomManager.setPanY(value);
}

export function resetZoomAndPan(drawCanvas) {
    if (zoomManager) zoomManager.reset();
}

export function zoomTo100(currentImage, drawCanvas, config) {
    if (zoomManager) zoomManager.zoomTo100();
}

export function initZoomPanListeners(canvas, currentImage, drawCanvas, config) {
    // Create appropriate zoom manager based on mode
    zoomManager = config.viewMode === 'full' 
        ? new FullScreenZoomManager(canvas, currentImage, drawCanvas, config)
        : new CanvasZoomManager(canvas, currentImage, drawCanvas, config);
    
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
        zoomManager.handleZoom(mouseX, mouseY, zoomFactor);
        drawCanvas(); // Ensure redraw after zoom
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
            
            zoomManager.handleTouchZoom(
                initialDistance,
                currentDistance,
                initialCenterX,
                initialCenterY,
                currentCenterX,
                currentCenterY
            );
            drawCanvas(); // Ensure redraw after touch zoom
        } else if (isTouchPanning && e.touches.length === 1) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const currentTouchX = (e.touches[0].clientX - rect.left) * scaleX;
            const currentTouchY = (e.touches[0].clientY - rect.top) * scaleY;
            
            const deltaX = currentTouchX - lastTouchX;
            const deltaY = currentTouchY - lastTouchY;
            
            zoomManager.setPanX(zoomManager.getPanX() + deltaX);
            zoomManager.setPanY(zoomManager.getPanY() + deltaY);
            
            lastTouchX = currentTouchX;
            lastTouchY = currentTouchY;
            drawCanvas(); // Ensure redraw after pan
        }
    });

    canvas.addEventListener('touchend', () => {
        isTouchPanning = false;
    });

    // Mouse pan handling
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        lastMouseX = (e.clientX - rect.left) * scaleX;
        lastMouseY = (e.clientY - rect.top) * scaleY;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const currentMouseX = (e.clientX - rect.left) * scaleX;
            const currentMouseY = (e.clientY - rect.top) * scaleY;
            
            const deltaX = currentMouseX - lastMouseX;
            const deltaY = currentMouseY - lastMouseY;
            
            zoomManager.setPanX(zoomManager.getPanX() + deltaX);
            zoomManager.setPanY(zoomManager.getPanY() + deltaY);
            
            lastMouseX = currentMouseX;
            lastMouseY = currentMouseY;
            drawCanvas(); // Ensure redraw after pan
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
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