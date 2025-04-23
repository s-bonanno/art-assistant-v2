// Base class for zoom management
class ZoomManager {
    constructor(canvas, currentImage, drawCanvas, config) {
        this.canvas = canvas;
        this.currentImage = currentImage;
        this.drawCanvas = drawCanvas;
        this.config = config;
        
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.animationFrameId = null;
    }

    getZoom() { return this.zoom; }
    setZoom(value) { 
        this.zoom = value;
        this.scheduleRedraw();
    }
    getPanX() { return this.panX; }
    setPanX(value) { 
        this.panX = value;
        this.scheduleRedraw();
    }
    getPanY() { return this.panY; }
    setPanY(value) { 
        this.panY = value;
        this.scheduleRedraw();
    }

    scheduleRedraw() {
        if (!this.drawCanvas) return;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.animationFrameId = requestAnimationFrame(() => {
            this.drawCanvas();
            this.animationFrameId = null;
        });
    }

    reset() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.drawCanvas();
    }

    zoomTo100() {
        if (!this.currentImage) return;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.drawCanvas();
    }

    // Abstract methods to be implemented by subclasses
    handleZoom(mouseX, mouseY, zoomFactor) {
        throw new Error('handleZoom must be implemented by subclass');
    }

    handleTouchZoom(initialDistance, currentDistance, initialCenterX, initialCenterY, currentCenterX, currentCenterY) {
        throw new Error('handleTouchZoom must be implemented by subclass');
    }
}

// Full screen mode zoom manager
class FullScreenZoomManager extends ZoomManager {
    handleZoom(mouseX, mouseY, zoomFactor) {
        const canvasCenterX = this.canvas.width / 2;
        const canvasCenterY = this.canvas.height / 2;
        
        // Reverse transform stack to get image-relative position
        const imageX = ((mouseX - canvasCenterX) / this.zoom - this.panX) + this.currentImage.naturalWidth / 2;
        const imageY = ((mouseY - canvasCenterY) / this.zoom - this.panY) + this.currentImage.naturalHeight / 2;
        
        // Calculate the minimum zoom needed to fit the image in the viewport
        const mainContainer = document.querySelector('.relative.w-full');
        const availableWidth = mainContainer.clientWidth;
        const availableHeight = mainContainer.clientHeight;
        
        const minZoomWidth = (availableWidth - 32) / this.currentImage.naturalWidth;
        const minZoomHeight = (availableHeight - 32) / this.currentImage.naturalHeight;
        const minZoom = Math.min(minZoomWidth, minZoomHeight);
        
        const maxZoom = 10;
        const newZoom = Math.min(Math.max(minZoom * 0.5, this.zoom * zoomFactor), maxZoom);
        
        this.panX = (mouseX - canvasCenterX) / newZoom - (imageX - this.currentImage.naturalWidth / 2);
        this.panY = (mouseY - canvasCenterY) / newZoom - (imageY - this.currentImage.naturalHeight / 2);
        this.zoom = newZoom;
    }

    handleTouchZoom(initialDistance, currentDistance, initialCenterX, initialCenterY, currentCenterX, currentCenterY) {
        const canvasCenterX = this.canvas.width / 2;
        const canvasCenterY = this.canvas.height / 2;
        
        const imageX = ((initialCenterX - canvasCenterX) / this.zoom - this.panX) + this.currentImage.naturalWidth / 2;
        const imageY = ((initialCenterY - canvasCenterY) / this.zoom - this.panY) + this.currentImage.naturalHeight / 2;
        
        const mainContainer = document.querySelector('.relative.w-full');
        const availableWidth = mainContainer.clientWidth;
        const availableHeight = mainContainer.clientHeight;
        const minZoom = Math.min(
            (availableWidth - 64) / this.currentImage.naturalWidth,
            (availableHeight - 64) / this.currentImage.naturalHeight
        );
        
        const scale = currentDistance / initialDistance;
        const newZoom = Math.min(Math.max(minZoom, this.zoom * scale), 10);
        
        this.panX = (currentCenterX - canvasCenterX) / newZoom - (imageX - this.currentImage.naturalWidth / 2);
        this.panY = (currentCenterY - canvasCenterY) / newZoom - (imageY - this.currentImage.naturalHeight / 2);
        this.zoom = newZoom;
    }
}

// Canvas mode zoom manager
class CanvasZoomManager extends ZoomManager {
    handleZoom(mouseX, mouseY, zoomFactor) {
        // Calculate base scale to fit image in canvas
        const scale = Math.min(
            this.config.canvasWidth / this.currentImage.width,
            this.config.canvasHeight / this.currentImage.height
        );
        
        // Calculate base dimensions and center
        const baseWidth = this.currentImage.width * scale;
        const baseHeight = this.currentImage.height * scale;
        const canvasCenterX = (this.config.canvasWidth - baseWidth) / 2;
        const canvasCenterY = (this.config.canvasHeight - baseHeight) / 2;
        
        // Reverse transform to get image-relative position
        const imageX = (mouseX - canvasCenterX - this.panX) / (this.zoom * scale);
        const imageY = (mouseY - canvasCenterY - this.panY) / (this.zoom * scale);
        
        // Apply zoom with fixed minimum for canvas mode
        const newZoom = Math.min(Math.max(0.1, this.zoom * zoomFactor), 10);
        
        this.panX = mouseX - canvasCenterX - (imageX * newZoom * scale);
        this.panY = mouseY - canvasCenterY - (imageY * newZoom * scale);
        this.zoom = newZoom;
    }

    handleTouchZoom(initialDistance, currentDistance, initialCenterX, initialCenterY, currentCenterX, currentCenterY) {
        const scale = currentDistance / initialDistance;
        this.zoom = Math.min(Math.max(0.1, this.zoom * scale), 10);
        
        // Update pan based on center point movement
        const deltaX = currentCenterX - initialCenterX;
        const deltaY = currentCenterY - initialCenterY;
        this.panX += deltaX;
        this.panY += deltaY;
    }
}

export { ZoomManager, FullScreenZoomManager, CanvasZoomManager }; 