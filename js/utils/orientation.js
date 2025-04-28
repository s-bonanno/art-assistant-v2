export class OrientationManager {
    constructor(config, updateCanvasSize, drawCanvas) {
        this.config = config;
        this.updateCanvasSize = updateCanvasSize;
        this.drawCanvas = drawCanvas;
        this.landscapeBtn = document.getElementById('landscapeBtn');
        this.portraitBtn = document.getElementById('portraitBtn');
    }

    init() {
        this.setupEventListeners();
        this.updateOrientation();
    }

    setupEventListeners() {
        if (this.landscapeBtn) {
            this.landscapeBtn.addEventListener('click', () => this.setOrientation('landscape'));
        }
        if (this.portraitBtn) {
            this.portraitBtn.addEventListener('click', () => this.setOrientation('portrait'));
        }
    }

    setOrientation(orientation) {
        const width = parseFloat(document.getElementById('canvasWidth').value);
        const height = parseFloat(document.getElementById('canvasHeight').value);
        
        if (width === height) return; // Don't swap if square
        
        if ((orientation === 'landscape' && width < height) || 
            (orientation === 'portrait' && width > height)) {
            // Swap width and height
            document.getElementById('canvasWidth').value = height;
            document.getElementById('canvasHeight').value = width;
            
            // Update config
            this.config.canvasWidthCm = height;
            this.config.canvasHeightCm = width;
            
            // Update canvas and redraw
            this.updateCanvasSize();
            this.drawCanvas();
            
            // Update button states
            this.updateOrientation();
        }
    }

    updateOrientation() {
        if (!this.landscapeBtn || !this.portraitBtn) return;
        
        const width = parseFloat(document.getElementById('canvasWidth').value);
        const height = parseFloat(document.getElementById('canvasHeight').value);
        
        if (width === height) {
            // Square canvas - disable both buttons
            this.landscapeBtn.disabled = true;
            this.portraitBtn.disabled = true;
            this.landscapeBtn.setAttribute('data-active', 'false');
            this.portraitBtn.setAttribute('data-active', 'false');
        } else {
            // Enable buttons
            this.landscapeBtn.disabled = false;
            this.portraitBtn.disabled = false;
            
            // Set active state based on orientation
            const isLandscape = width > height;
            this.landscapeBtn.setAttribute('data-active', isLandscape ? 'true' : 'false');
            this.portraitBtn.setAttribute('data-active', !isLandscape ? 'true' : 'false');
        }
    }
} 