const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const imageInput = document.getElementById('imageInput');
const exportBtn = document.getElementById('exportBtn');
const canvasWidthInput = document.getElementById('canvasWidth');
const canvasHeightInput = document.getElementById('canvasHeight');
const gridSquareSizeInput = document.getElementById('gridSquareSize');
const unitSelect = document.getElementById('unitSelect');
const canvasUnitSelect = document.getElementById('canvasUnitSelect');
const gridSizeDisplay = document.getElementById('gridSizeDisplay');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomValue = document.getElementById('zoomValue');
const zoomSlider = document.getElementById('zoomSlider');
const resetZoomBtn = document.getElementById('resetZoomBtn');
const canvasContainer = document.getElementById('canvasContainer');
const viewModeToggle = document.getElementById('viewModeToggle');
const fitToScreenBtn = document.getElementById('fitToScreenBtn');
const gridSizeSlider = document.getElementById('gridSizeSlider');
const gridSizeValue = document.getElementById('gridSizeValue');
const gridSizeDecreaseBtn = document.getElementById('gridSizeDecreaseBtn');
const gridSizeIncreaseBtn = document.getElementById('gridSizeIncreaseBtn');
const zoom100Btn = document.getElementById('zoom100Btn');

const MAX_CANVAS_DIMENSION = 1000; // Maximum canvas dimension in pixels
const EXPORT_SIZE = 2400; // Size of the exported image
const CM_PER_INCH = 2.54;

let currentImage = null;
let zoom = 1;
let panX = 0;
let panY = 0;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Canvas configuration state
let config = {
    canvasWidthCm: 50,
    canvasHeightCm: 50,
    gridSizeCm: 5,
    gridSpacing: 50, // Will be recalculated
    canvasWidth: 500, // Will be recalculated
    canvasHeight: 500, // Will be recalculated
    imageOffsetXPercent: 0, // Track image position as percentage
    imageOffsetYPercent: 0,  // Track image position as percentage
    viewMode: 'canvas' // Current view mode
};

// Grid styling configuration
const gridConfig = {
    lineWeight: 1, // Default for canvas mode
    opacity: 1,
    color: '#ffffff'
};

// Get grid styling elements
const gridLineWeight = document.getElementById('gridLineWeight');
const gridLineWeightValue = document.getElementById('gridLineWeightValue');
const gridOpacity = document.getElementById('gridOpacity');
const gridOpacityValue = document.getElementById('gridOpacityValue');
const colorSwatches = document.querySelectorAll('[data-color]');

// Tab switching functionality
const tabButtons = document.querySelectorAll('[data-tab]');
const tabContents = document.querySelectorAll('[data-tab-content]');

// Add filter state object after other state declarations
let filters = {
    posterise: { enabled: false, levels: 4 },
    edges: { enabled: false, strength: 2, opacity: 1 },
    lightSplit: { enabled: false, shadow: 30, highlight: 70 }
};

// Add filter cache after other state declarations
let filterCache = {
    image: null,
    width: 0,
    height: 0,
    needsUpdate: true
};

function switchTab(tabName) {
    // Update tab buttons
    tabButtons.forEach(button => {
        if (button.dataset.tab === tabName) {
            button.classList.add('border-indigo-500', 'text-zinc-200');
            button.classList.remove('border-transparent', 'text-zinc-400');
        } else {
            button.classList.remove('border-indigo-500', 'text-zinc-200');
            button.classList.add('border-transparent', 'text-zinc-400');
        }
    });

    // Update tab contents
    tabContents.forEach(content => {
        if (content.dataset.tabContent === tabName) {
            content.classList.remove('hidden');
        } else {
            content.classList.add('hidden');
        }
    });
}

// Add click handlers for tabs
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        switchTab(button.dataset.tab);
    });
});

// Initialize with Size tab active
switchTab('size');

function convertToUnit(valueCm, targetUnit) {
    return targetUnit === 'in' ? valueCm / CM_PER_INCH : valueCm;
}

function convertFromUnit(value, sourceUnit) {
    return sourceUnit === 'in' ? value * CM_PER_INCH : value;
}

function updateGridSizeDisplay() {
    const unit = unitSelect.value;
    const size = convertToUnit(config.gridSizeCm, unit);
    gridSizeDisplay.textContent = `${size.toFixed(unit === 'in' ? 2 : 1)} ${unit}`;
}

function updateCanvasUnitDisplay() {
    const unit = canvasUnitSelect.value;
    const width = convertToUnit(config.canvasWidthCm, unit);
    const height = convertToUnit(config.canvasHeightCm, unit);
    
    // Update input values
    canvasWidthInput.value = width.toFixed(unit === 'in' ? 1 : 0);
    canvasHeightInput.value = height.toFixed(unit === 'in' ? 1 : 0);
    
    // Update step size
    canvasWidthInput.step = unit === 'in' ? '0.5' : '1';
    canvasHeightInput.step = unit === 'in' ? '0.5' : '1';
}

function resizeCanvasToFit() {
    const container = document.querySelector('.relative.w-full');
    const canvas = document.getElementById('canvas');
    
    // Get the canvas wrapper element
    const canvasWrapper = container.querySelector('.p-4');
    
    // Get available viewport dimensions
    const maxWidth = container.clientWidth;
    const maxHeight = container.clientHeight;
    
    let width, height;
    
    if (config.viewMode === 'full' && currentImage) {
        // In full image mode, maintain aspect ratio while fitting to viewport
        const imageAspectRatio = currentImage.naturalHeight / currentImage.naturalWidth;
        const availableAspectRatio = maxHeight / maxWidth;
        
        if (imageAspectRatio > availableAspectRatio) {
            // Height is limiting factor
            height = maxHeight;
            width = height / imageAspectRatio;
        } else {
            // Width is limiting factor
            width = maxWidth;
            height = width * imageAspectRatio;
        }
        
        // Set canvas dimensions to match image
        canvas.width = currentImage.naturalWidth;
        canvas.height = currentImage.naturalHeight;
    } else {
        // Canvas mode - existing logic
        const canvasAspectRatio = config.canvasHeightCm / config.canvasWidthCm;
        const availableAspectRatio = maxHeight / maxWidth;
        
        if (canvasAspectRatio > availableAspectRatio) {
            height = maxHeight;
            width = height / canvasAspectRatio;
        } else {
            width = maxWidth;
            height = width * canvasAspectRatio;
        }
        
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Update config with new dimensions
        config.canvasWidth = width;
        config.canvasHeight = height;
    }
    
    // Recalculate grid spacing
    updateGridSpacing();
    
    // Redraw canvas
    drawCanvas();
}

// Update canvas size function to use responsive sizing
function updateCanvasSize() {
    // Calculate new canvas dimensions maintaining aspect ratio
    const aspectRatio = config.canvasHeightCm / config.canvasWidthCm;
    
    // Trigger resize to fit
    resizeCanvasToFit();
}

// Add window resize handler with debounce
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        resizeCanvasToFit();
    }, 100);
});

function setDefaultGridSize() {
    if (config.viewMode === 'full' && currentImage) {
        // Set grid size to image width / 5
        const defaultGridSize = Math.floor(currentImage.naturalWidth / 5);
        // Ensure it's within our min/max limits
        config.gridSpacing = Math.max(5, Math.min(1000, defaultGridSize));
        gridSizeSlider.value = config.gridSpacing;
        gridSquareSizeInput.value = config.gridSpacing;
        gridSizeValue.textContent = `${config.gridSpacing} px`;
    }
}

// Set initial grid style values
function setDefaultGridStyle() {
    // Set line weight based on mode
    gridConfig.lineWeight = config.viewMode === 'full' ? 3 : 1;
    
    // Update UI elements
    gridLineWeight.value = gridConfig.lineWeight;
    gridLineWeightValue.textContent = `${gridConfig.lineWeight}px`;
    gridOpacity.value = gridConfig.opacity;
    gridOpacityValue.textContent = '100%';
    
    // Update color swatch selection
    updateColorSwatchSelection();
    
    // Redraw canvas
    drawCanvas();
}

// Add fit to canvas functionality
function fitToCanvas() {
    if (config.viewMode !== 'canvas' || !currentImage) return;
    
    // Reset zoom and pan
    zoom = 1;
    panX = 0;
    panY = 0;
    
    // Redraw canvas
    drawCanvas();
}

// Add 100% zoom functionality
function zoomTo100() {
    if (!currentImage) return;
    
    // Set zoom to 1 (100%)
    zoom = 1;
    
    // Center the image
    const container = document.querySelector('.relative.w-full');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate center position
    panX = (containerWidth - currentImage.naturalWidth) / 2;
    panY = (containerHeight - currentImage.naturalHeight) / 2;
    
    // Redraw canvas
    drawCanvas();
}

// Update view mode toggle handler
viewModeToggle.addEventListener('change', () => {
    config.viewMode = viewModeToggle.checked ? 'canvas' : 'full';
    fitToScreenBtn.style.display = config.viewMode === 'full' ? 'inline-flex' : 'none';
    zoom100Btn.style.display = config.viewMode === 'full' ? 'inline-flex' : 'none';
    resetZoomBtn.style.display = config.viewMode === 'canvas' ? 'inline-flex' : 'none';
    
    // Set default grid style when switching modes
    setDefaultGridStyle();
    
    // Update grid input based on mode
    if (config.viewMode === 'full') {
        // In full image mode, use pixels
        unitSelect.style.display = 'none';
        gridSquareSizeInput.step = "1";
        gridSizeSlider.min = "5";
        gridSizeSlider.max = "1000";
        gridSizeSlider.step = "1";
        
        // Set default grid size if an image is loaded
        if (currentImage) {
            setDefaultGridSize();
            fitToScreen();
        }
    } else {
        // In canvas mode, use cm/in
        unitSelect.style.display = 'block';
        gridSquareSizeInput.step = "0.1";
        gridSizeSlider.min = "0.1";
        gridSizeSlider.max = "50";
        gridSizeSlider.step = "0.1";
        gridSizeSlider.value = config.gridSizeCm;
        gridSquareSizeInput.value = config.gridSizeCm;
        gridSizeValue.textContent = `${config.gridSizeCm} cm`;
        
        if (currentImage) {
            // Reset zoom and pan when switching to canvas mode
            fitToCanvas();
        }
    }
    
    if (currentImage) {
        resizeCanvasToFit();
    }
    
    // Add cache invalidation when switching modes
    filterCache.needsUpdate = true;
});

// Add fit to screen functionality
function fitToScreen() {
    if (config.viewMode !== 'full' || !currentImage) return;
    
    // Get the main container and its dimensions
    const mainContainer = document.querySelector('.relative.w-full');
    const availableWidth = mainContainer.clientWidth;
    const availableHeight = mainContainer.clientHeight;
    
    // Calculate the scale needed to fit the image
    const scale = Math.min(
        (availableWidth - 64) / currentImage.naturalWidth,  // Account for padding (32px on each side)
        (availableHeight - 64) / currentImage.naturalHeight // Account for padding (32px on each side)
    );
    
    // Update zoom level
    zoom = scale;
    
    // Reset pan position
    panX = 0;
    panY = 0;
    
    // Redraw canvas
    drawCanvas();
}

// Add event listener for fit to screen button
fitToScreenBtn.addEventListener('click', fitToScreen);

// Event listeners for grid controls
gridSizeSlider.addEventListener('input', () => {
    if (config.viewMode === 'full') {
        gridSquareSizeInput.value = gridSizeSlider.value;
    } else {
        gridSquareSizeInput.value = gridSizeSlider.value;
    }
    updateGridSpacing();
});

gridSizeDecreaseBtn.addEventListener('click', () => {
    const currentValue = parseFloat(gridSizeSlider.value);
    const step = config.viewMode === 'full' ? 1 : 0.1;
    gridSizeSlider.value = Math.max(parseFloat(gridSizeSlider.min), currentValue - step);
    updateGridSpacing();
});

gridSizeIncreaseBtn.addEventListener('click', () => {
    const currentValue = parseFloat(gridSizeSlider.value);
    const step = config.viewMode === 'full' ? 1 : 0.1;
    gridSizeSlider.value = Math.min(parseFloat(gridSizeSlider.max), currentValue + step);
    updateGridSpacing();
});

// Update grid line weight
gridLineWeight.addEventListener('input', () => {
    gridConfig.lineWeight = parseFloat(gridLineWeight.value);
    gridLineWeightValue.textContent = `${gridConfig.lineWeight}px`;
    drawCanvas();
});

// Update grid opacity
gridOpacity.addEventListener('input', () => {
    gridConfig.opacity = parseFloat(gridOpacity.value);
    gridOpacityValue.textContent = `${Math.round(gridConfig.opacity * 100)}%`;
    drawCanvas();
});

// Handle color swatch clicks
colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
        gridConfig.color = swatch.dataset.color;
        updateColorSwatchSelection();
        drawCanvas();
    });
});

// Update color swatch selection
function updateColorSwatchSelection() {
    colorSwatches.forEach(swatch => {
        if (swatch.dataset.color === gridConfig.color) {
            swatch.classList.add('border-indigo-500');
            swatch.classList.remove('border-zinc-700');
        } else {
            swatch.classList.remove('border-indigo-500');
            swatch.classList.add('border-zinc-700');
        }
    });
}

// Update image upload handler
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                currentImage = img;
                // Reset transform when loading new image
                zoom = 1;
                panX = 0;
                panY = 0;
                config.imageOffsetXPercent = 0;
                config.imageOffsetYPercent = 0;
                filterCache.needsUpdate = true;
                resizeCanvasToFit();
                
                // Set default grid style when loading new image
                setDefaultGridStyle();
                
                // If in full image mode, fit to screen and set default grid size
                if (config.viewMode === 'full') {
                    fitToScreen();
                    setDefaultGridSize();
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

function updateGridSpacing() {
    if (config.viewMode === 'full') {
        // In full image mode, use pixels directly
        config.gridSpacing = parseFloat(gridSizeSlider.value);
        gridSquareSizeInput.value = config.gridSpacing;
        gridSizeValue.textContent = `${config.gridSpacing} px`;
    } else {
        // Canvas mode - existing logic
        const gridSizeInCm = unitSelect.value === 'in' ? 
            gridSquareSizeInput.value * CM_PER_INCH : 
            gridSquareSizeInput.value;
        
        // Calculate pixels per centimeter
        const pixelsPerCm = config.canvasWidth / config.canvasWidthCm;
        
        // Set grid spacing in pixels
        config.gridSpacing = gridSizeInCm * pixelsPerCm;
        
        // Update slider value
        gridSizeSlider.value = gridSquareSizeInput.value;
        gridSizeValue.textContent = `${gridSquareSizeInput.value} ${unitSelect.value}`;
    }
    
    // Redraw canvas
    drawCanvas();
}

// Event listeners for configuration changes
canvasWidthInput.addEventListener('change', () => {
    const value = parseFloat(canvasWidthInput.value);
    config.canvasWidthCm = convertFromUnit(value, canvasUnitSelect.value);
    updateCanvasSize();
});

canvasHeightInput.addEventListener('change', () => {
    const value = parseFloat(canvasHeightInput.value);
    config.canvasHeightCm = convertFromUnit(value, canvasUnitSelect.value);
    updateCanvasSize();
});

canvasUnitSelect.addEventListener('change', () => {
    updateCanvasUnitDisplay();
});

gridSquareSizeInput.addEventListener('change', () => {
    if (config.viewMode === 'full') {
        config.gridSpacing = parseFloat(gridSquareSizeInput.value);
        gridSizeSlider.value = config.gridSpacing;
    } else {
        config.gridSizeCm = parseFloat(gridSquareSizeInput.value);
        if (unitSelect.value === 'in') {
            config.gridSizeCm *= CM_PER_INCH;
        }
        gridSizeSlider.value = gridSquareSizeInput.value;
    }
    updateGridSpacing();
});

unitSelect.addEventListener('change', () => {
    if (config.viewMode === 'canvas') {
        const currentSizeCm = config.gridSizeCm;
        
        // Update input value based on unit
        if (unitSelect.value === 'in') {
            gridSquareSizeInput.value = (currentSizeCm / CM_PER_INCH).toFixed(2);
            gridSquareSizeInput.step = "0.25";
        } else {
            gridSquareSizeInput.value = currentSizeCm.toFixed(1);
            gridSquareSizeInput.step = "0.1";
        }
        
        updateGridSpacing();
    }
});

// Mouse wheel zoom handler
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (!currentImage) return;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    zoom *= zoomFactor;
    zoom = Math.min(Math.max(0.1, zoom), 10);
    
    drawCanvas();
});

// Touch gesture handling
let initialDistance = 0;
let initialZoom = 1;

canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
        initialDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        initialZoom = zoom;
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
        zoom = Math.min(Math.max(0.1, initialZoom * scale), 10);
        
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
    
    panX += deltaX;
    panY += deltaY;
    
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

// Add event listener for reset zoom button (which now acts as fit to canvas in canvas mode)
resetZoomBtn.addEventListener('click', () => {
    if (config.viewMode === 'canvas') {
        fitToCanvas();
    } else {
        zoom = 1;
        panX = 0;
        panY = 0;
        drawCanvas();
    }
});

// Add keyboard shortcuts for zooming
document.addEventListener('keydown', (e) => {
    if (e.key === '+' || e.key === '=') {
        zoom = Math.min(10, zoom + 0.1);
        drawCanvas();
    } else if (e.key === '-' || e.key === '_') {
        zoom = Math.max(0.1, zoom - 0.1);
        drawCanvas();
    }
});

// Export functionality
exportBtn.addEventListener('click', () => {
    if (!currentImage) {
        alert('Please load an image first');
        return;
    }
    
    // Create high-resolution canvas
    const exportCanvas = document.createElement('canvas');
    const exportCtx = exportCanvas.getContext('2d');
    
    if (config.viewMode === 'full') {
        // In full image mode, use the original image dimensions
        exportCanvas.width = currentImage.naturalWidth;
        exportCanvas.height = currentImage.naturalHeight;
        
        // Clear export canvas with dark background
        exportCtx.fillStyle = '#2c2c2e';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        
        // Create a temporary canvas for the image and filters
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = currentImage.naturalWidth;
        tempCanvas.height = currentImage.naturalHeight;

        // Draw the full image to temp canvas
        tempCtx.drawImage(currentImage, 0, 0);

        // Apply filters to temp canvas if any are enabled
        if (Object.values(filters).some(f => f.enabled)) {
            applyFilters(tempCtx, tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
        }

        // Draw the filtered image to export canvas
        exportCtx.drawImage(tempCanvas, 0, 0);
        
        // Draw high-resolution grid with styling
        exportCtx.beginPath();
        exportCtx.strokeStyle = gridConfig.color;
        exportCtx.globalAlpha = gridConfig.opacity;
        exportCtx.lineWidth = gridConfig.lineWeight;
        
        // Draw vertical lines
        const gridSpacing = config.gridSpacing;
        for (let x = 0; x <= exportCanvas.width; x += gridSpacing) {
            exportCtx.moveTo(x, 0);
            exportCtx.lineTo(x, exportCanvas.height);
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= exportCanvas.height; y += gridSpacing) {
            exportCtx.moveTo(0, y);
            exportCtx.lineTo(exportCanvas.width, y);
        }
        
        exportCtx.stroke();
        exportCtx.globalAlpha = 1; // Reset opacity
    } else {
        // Canvas mode - existing export logic
        exportCanvas.width = EXPORT_SIZE;
        exportCanvas.height = Math.round(EXPORT_SIZE * (config.canvasHeight / config.canvasWidth));
        
        // Calculate scale factor between preview and export
        const scaleFactor = EXPORT_SIZE / config.canvasWidth;
        
        // Clear export canvas with dark background
        exportCtx.fillStyle = '#2c2c2e';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        
        // Draw image at high resolution
        const scale = Math.min(
            config.canvasWidth / currentImage.width,
            config.canvasHeight / currentImage.height
        );
        
        const baseWidth = currentImage.width * scale;
        const baseHeight = currentImage.height * scale;
        const centerX = (config.canvasWidth - baseWidth) / 2;
        const centerY = (config.canvasHeight - baseHeight) / 2;
        
        // Scale up the image dimensions and position
        const finalWidth = baseWidth * zoom * scaleFactor;
        const finalHeight = baseHeight * zoom * scaleFactor;
        const x = (centerX + panX) * scaleFactor;
        const y = (centerY + panY) * scaleFactor;
        
        // Create a temporary canvas for the image and filters
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = finalWidth;
        tempCanvas.height = finalHeight;

        // Draw the scaled image to temp canvas
        tempCtx.drawImage(currentImage, 0, 0, finalWidth, finalHeight);

        // Apply filters to temp canvas if any are enabled
        if (Object.values(filters).some(f => f.enabled)) {
            applyFilters(tempCtx, tempCanvas, 0, 0, finalWidth, finalHeight);
        }

        // Draw the filtered image to export canvas
        exportCtx.drawImage(tempCanvas, x, y);
        
        // Draw high-resolution grid with styling
        exportCtx.beginPath();
        exportCtx.strokeStyle = gridConfig.color;
        exportCtx.globalAlpha = gridConfig.opacity;
        exportCtx.lineWidth = Math.max(1, Math.floor(gridConfig.lineWeight * scaleFactor));
        
        // Draw vertical lines
        const exportGridSpacing = config.gridSpacing * scaleFactor;
        for (let x = 0; x <= exportCanvas.width; x += exportGridSpacing) {
            exportCtx.moveTo(x, 0);
            exportCtx.lineTo(x, exportCanvas.height);
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= exportCanvas.height; y += exportGridSpacing) {
            exportCtx.moveTo(0, y);
            exportCtx.lineTo(exportCanvas.width, y);
        }
        
        exportCtx.stroke();
        exportCtx.globalAlpha = 1; // Reset opacity
    }
    
    // Create download link
    const link = document.createElement('a');
    link.download = 'grid-reference.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
});

// Modify the filter application function
function applyFilters(ctx, canvas, x, y, width, height) {
    if (!currentImage) return;

    // Check if we need to update the cache
    if (filterCache.needsUpdate || 
        filterCache.width !== width || 
        filterCache.height !== height) {
        
        // Create a temporary canvas for filter processing
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = width;
        tempCanvas.height = height;

        // Draw the image portion we want to filter
        tempCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height);

        // Apply posterise if enabled
        if (filters.posterise.enabled) {
            applyPosterise(tempCtx, tempCanvas, filters.posterise.levels);
        }

        // Apply edge detection if enabled
        if (filters.edges.enabled) {
            applyEdgeDetection(tempCtx, tempCanvas, filters.edges.strength, filters.edges.opacity);
        }

        // Apply light split if enabled
        if (filters.lightSplit.enabled) {
            applyLightSplit(tempCtx, tempCanvas, filters.lightSplit.shadow, filters.lightSplit.highlight);
        }

        // Update the cache
        filterCache.image = tempCanvas;
        filterCache.width = width;
        filterCache.height = height;
        filterCache.needsUpdate = false;
    }

    // Draw from cache
    ctx.drawImage(filterCache.image, x, y);
}

function applyPosterise(ctx, canvas, levels) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const step = 255 / (levels - 1);

    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.round(data[i] / step) * step;     // R
        data[i + 1] = Math.round(data[i + 1] / step) * step; // G
        data[i + 2] = Math.round(data[i + 2] / step) * step; // B
    }

    ctx.putImageData(imageData, 0, 0);
}

function applyEdgeDetection(ctx, canvas, strength, opacity) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    const output = new Uint8ClampedArray(data.length);

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            
            // Sobel operator
            let gx = 0;
            let gy = 0;
            
            for (let c = 0; c < 3; c++) {
                const i = idx + c;
                
                // Horizontal gradient
                gx += data[i - width * 4 - 4] * -1;
                gx += data[i - width * 4 + 4] * 1;
                gx += data[i - 4] * -2;
                gx += data[i + 4] * 2;
                gx += data[i + width * 4 - 4] * -1;
                gx += data[i + width * 4 + 4] * 1;
                
                // Vertical gradient
                gy += data[i - width * 4 - 4] * -1;
                gy += data[i - width * 4] * -2;
                gy += data[i - width * 4 + 4] * -1;
                gy += data[i + width * 4 - 4] * 1;
                gy += data[i + width * 4] * 2;
                gy += data[i + width * 4 + 4] * 1;
            }

            const magnitude = Math.sqrt(gx * gx + gy * gy) * (strength / 2);
            
            output[idx] = magnitude;     // R
            output[idx + 1] = magnitude; // G
            output[idx + 2] = magnitude; // B
            output[idx + 3] = 255;       // A
        }
    }

    // Blend the edge detection with the original image
    for (let i = 0; i < data.length; i += 4) {
        data[i] = data[i] * (1 - opacity) + output[i] * opacity;
        data[i + 1] = data[i + 1] * (1 - opacity) + output[i + 1] * opacity;
        data[i + 2] = data[i + 2] * (1 - opacity) + output[i + 2] * opacity;
    }

    ctx.putImageData(imageData, 0, 0);
}

function applyLightSplit(ctx, canvas, shadowThreshold, highlightThreshold) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        // Calculate luminance
        const luminance = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
        const percent = luminance * 100;

        // Apply thresholds
        if (percent <= shadowThreshold) {
            // Shadows
            data[i] = data[i + 1] = data[i + 2] = 0;
        } else if (percent >= highlightThreshold) {
            // Highlights
            data[i] = data[i + 1] = data[i + 2] = 255;
        } else {
            // Midtones - set to gray
            const gray = Math.round(((percent - shadowThreshold) / (highlightThreshold - shadowThreshold)) * 255);
            data[i] = data[i + 1] = data[i + 2] = gray;
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

// Modify the event listeners to invalidate cache when filters change
document.getElementById('posteriseToggle').addEventListener('change', (e) => {
    filters.posterise.enabled = e.target.checked;
    filterCache.needsUpdate = true;
    drawCanvas();
});

document.getElementById('posteriseLevels').addEventListener('input', (e) => {
    filters.posterise.levels = parseInt(e.target.value);
    document.getElementById('posteriseLevelsValue').textContent = e.target.value;
    filterCache.needsUpdate = true;
    drawCanvas();
});

document.getElementById('edgesToggle').addEventListener('change', (e) => {
    filters.edges.enabled = e.target.checked;
    filterCache.needsUpdate = true;
    drawCanvas();
});

document.getElementById('edgesStrength').addEventListener('input', (e) => {
    filters.edges.strength = parseFloat(e.target.value);
    document.getElementById('edgesStrengthValue').textContent = e.target.value;
    filterCache.needsUpdate = true;
    drawCanvas();
});

document.getElementById('edgesOpacity').addEventListener('input', (e) => {
    filters.edges.opacity = parseFloat(e.target.value);
    document.getElementById('edgesOpacityValue').textContent = Math.round(e.target.value * 100) + '%';
    filterCache.needsUpdate = true;
    drawCanvas();
});

document.getElementById('lightSplitToggle').addEventListener('change', (e) => {
    filters.lightSplit.enabled = e.target.checked;
    filterCache.needsUpdate = true;
    drawCanvas();
});

document.getElementById('shadowThreshold').addEventListener('input', (e) => {
    filters.lightSplit.shadow = parseInt(e.target.value);
    document.getElementById('shadowThresholdValue').textContent = e.target.value + '%';
    filterCache.needsUpdate = true;
    drawCanvas();
});

document.getElementById('highlightThreshold').addEventListener('input', (e) => {
    filters.lightSplit.highlight = parseInt(e.target.value);
    document.getElementById('highlightThresholdValue').textContent = e.target.value + '%';
    filterCache.needsUpdate = true;
    drawCanvas();
});

// Modify the drawCanvas function to include filter processing
function drawCanvas() {
    // Clear canvas with dark background
    ctx.fillStyle = '#2c2c2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw image if one is loaded
    if (currentImage) {
        if (config.viewMode === 'full') {
            // Set canvas dimensions to match image
            canvas.width = currentImage.naturalWidth;
            canvas.height = currentImage.naturalHeight;
            
            // Save the current context state
            ctx.save();
            
            // Get the center of the canvas container
            const centerX = canvasContainer.clientWidth / 2;
            const centerY = canvasContainer.clientHeight / 2;
            
            // Apply transforms
            ctx.translate(centerX + panX, centerY + panY);
            ctx.scale(zoom, zoom);
            ctx.translate(-currentImage.naturalWidth / 2, -currentImage.naturalHeight / 2);
            
            // Create a temporary canvas for the image and filters
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = currentImage.naturalWidth;
            tempCanvas.height = currentImage.naturalHeight;

            // Draw the image to temp canvas
            tempCtx.drawImage(currentImage, 0, 0);

            // Apply filters to temp canvas
            if (Object.values(filters).some(f => f.enabled)) {
                applyFilters(tempCtx, tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
            }

            // Draw the filtered image to the main canvas
            ctx.drawImage(tempCanvas, 0, 0);
            
            // Draw grid
            ctx.beginPath();
            ctx.strokeStyle = gridConfig.color;
            ctx.globalAlpha = gridConfig.opacity;
            ctx.lineWidth = gridConfig.lineWeight;
            
            // Calculate grid spacing in pixels
            const gridSpacing = config.gridSpacing;
            
            // Draw vertical lines
            for (let x = 0; x <= canvas.width; x += gridSpacing) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
            }
            
            // Draw horizontal lines
            for (let y = 0; y <= canvas.height; y += gridSpacing) {
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
            }
            
            ctx.stroke();
            
            // Restore the context state
            ctx.restore();
        } else {
            // Canvas mode - existing logic
            const scale = Math.min(
                config.canvasWidth / currentImage.width,
                config.canvasHeight / currentImage.height
            );
            
            const baseWidth = currentImage.width * scale;
            const baseHeight = currentImage.height * scale;
            const centerX = (config.canvasWidth - baseWidth) / 2;
            const centerY = (config.canvasHeight - baseHeight) / 2;
            
            const finalWidth = baseWidth * zoom;
            const finalHeight = baseHeight * zoom;
            const x = centerX + panX;
            const y = centerY + panY;
            
            // Create a temporary canvas for the image and filters
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = finalWidth;
            tempCanvas.height = finalHeight;

            // Draw the scaled image to temp canvas
            tempCtx.drawImage(currentImage, 0, 0, finalWidth, finalHeight);

            // Apply filters to temp canvas
            if (Object.values(filters).some(f => f.enabled)) {
                applyFilters(tempCtx, tempCanvas, 0, 0, finalWidth, finalHeight);
            }

            // Draw the filtered image to the main canvas at the correct position
            ctx.drawImage(tempCanvas, x, y);
            
            // Draw grid
            ctx.beginPath();
            ctx.strokeStyle = gridConfig.color;
            ctx.globalAlpha = gridConfig.opacity;
            ctx.lineWidth = gridConfig.lineWeight;
            
            const gridSpacing = config.gridSpacing;
            const numVerticalLines = Math.ceil(config.canvasWidth / gridSpacing) + 1;
            const numHorizontalLines = Math.ceil(config.canvasHeight / gridSpacing) + 1;
            
            for (let i = 0; i < numVerticalLines; i++) {
                const x = Math.floor(i * gridSpacing);
                ctx.moveTo(x, 0);
                ctx.lineTo(x, config.canvasHeight);
            }
            
            for (let i = 0; i < numHorizontalLines; i++) {
                const y = Math.floor(i * gridSpacing);
                ctx.moveTo(0, y);
                ctx.lineTo(config.canvasWidth, y);
            }
            
            ctx.stroke();
        }
    }
    
    ctx.globalAlpha = 1; // Reset opacity
}

// Initial setup
updateCanvasUnitDisplay();
// Set initial grid spacing to 5px in full mode
config.gridSpacing = 5;
updateGridSpacing();
updateCanvasSize();

// Set initial toggle state and button visibility
viewModeToggle.checked = config.viewMode === 'canvas';
fitToScreenBtn.style.display = config.viewMode === 'full' ? 'inline-flex' : 'none';
resetZoomBtn.style.display = config.viewMode === 'canvas' ? 'inline-flex' : 'none';

// Initial resize
window.addEventListener('load', () => {
    resizeCanvasToFit();
});

// Add event listener for 100% zoom button
document.getElementById('zoom100Btn').addEventListener('click', zoomTo100); 