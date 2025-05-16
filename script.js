import { convertToUnit, convertFromUnit, CM_PER_INCH } from './js/utils/unitConversion.js';
import { gridConfig, updateColorSwatchSelection, setDefaultGridStyle, initGridStyleListeners, getCurrentGridType, updateGridPreview } from './js/utils/gridStyle.js';
import { getZoom, setZoom, getPanX, setPanX, getPanY, setPanY, resetZoomAndPan, zoomTo100, initZoomPanListeners } from './js/utils/zoomPan.js';
import { calculateGridSizeLimits } from './js/utils/gridLimits.js';
import { canvasSizePresets, initCanvasPresetSelector, resetPresetToCustom } from './js/utils/canvasPresets.js';
import { OrientationManager } from './js/utils/orientation.js';
import { exportCanvas } from './js/utils/exportCanvas.js';
import { 
    updateGridSizeDisplay as updateGridSizeDisplayUtil,
    updateGridSpacing as updateGridSpacingUtil,
    updateGridSliderUI as updateGridSliderUIUtil,
    updateGridControlsVisibility as updateGridControlsVisibilityUtil,
    drawGrid as drawGridUtil,
    setDefaultGridSize,
    updateGridSizeLimits
} from './js/utils/gridManager.js';
import { initFilters, filterManager } from './js/filters/init.js';
import { SliderInteractionManager } from './js/utils/SliderInteractionManager.js';
import { 
    setOriginalImage, 
    getOriginalImage, 
    isShowingOriginal, 
    toggleOriginalImage, 
    storeCurrentViewState, 
    getStoredViewState,
    disableOriginalViewIfActive
} from './js/utils/originalImage.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const imageInput = document.getElementById('imageInput');
const exportBtn = document.getElementById('exportBtn');
const canvasWidthInput = document.getElementById('canvasWidth');
const canvasHeightInput = document.getElementById('canvasHeight');
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
const zoom100Btn = document.getElementById('zoom100Btn');

// Add gridSquareSize input handling
const gridSquareSizeInput = document.getElementById('gridSquareSize');

const MAX_CANVAS_DIMENSION = 1000; // Maximum canvas dimension in pixels
const EXPORT_SIZE = 2400; // Size of the exported image

let currentImage = null;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let orientationManager = null;

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
    viewMode: 'canvas', // Current view mode
    pixelsPerCm: 100 // Added for new resize function
};

// Initialize canvas size preset selector
if (canvasWidthInput && canvasHeightInput) {
    initCanvasPresetSelector(canvasWidthInput, canvasHeightInput, (size) => {
        // Update the config and redraw
        config.canvasWidthCm = size.width;
        config.canvasHeightCm = size.height;
        updateCanvasSize();
        drawCanvas();
        
        // Update orientation
        orientationManager.updateOrientation();
    });
}

// Add event listeners for width/height inputs to reset to custom
if (canvasWidthInput) {
    canvasWidthInput.addEventListener('input', () => {
        resetPresetToCustom();
        document.getElementById('canvasSizePreset').value = 'custom';
        orientationManager.updateOrientation();
    });
}

if (canvasHeightInput) {
    canvasHeightInput.addEventListener('input', () => {
        resetPresetToCustom();
        document.getElementById('canvasSizePreset').value = 'custom';
        orientationManager.updateOrientation();
    });
}

// Tab switching functionality
const tabButtons = document.querySelectorAll('[data-tab]');
const tabContents = document.querySelectorAll('[data-tab-content]');

function switchTab(tabName) {
    // Update tab buttons
    tabButtons.forEach(button => {
        if (button.dataset.tab === tabName) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
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
    const container = document.querySelector('.relative.w-full') || document.body;
    const canvas = document.getElementById('canvas');
    
    // Get the canvas wrapper element
    const canvasWrapper = container.querySelector('.p-4') || container;

    // Get available viewport dimensions
    const maxWidth = container.clientWidth;
    const maxHeight = container.clientHeight;

    let width, height;
    let needsResize = false;

    if (config.viewMode === 'full' && currentImage) {
        // Get available screen space
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;

        // Check if canvas size actually needs to change
        needsResize = canvas.width !== displayWidth || canvas.height !== displayHeight;
        
        if (needsResize) {
            // Set canvas CSS size
            canvas.style.width = `${displayWidth}px`;
            canvas.style.height = `${displayHeight}px`;

            // Set canvas drawing buffer size to match
            canvas.width = displayWidth;
            canvas.height = displayHeight;
        }
    } else {
        // Canvas mode - determine canvas size based on configured dimensions
        const canvasAspectRatio = config.canvasHeightCm / config.canvasWidthCm;
        const availableAspectRatio = maxHeight / maxWidth;

        if (canvasAspectRatio > availableAspectRatio) {
            height = maxHeight;
            width = height / canvasAspectRatio;
        } else {
            width = maxWidth;
            height = width * canvasAspectRatio;
        }

        // Check if canvas size actually needs to change (with small tolerance for floating point issues)
        const sizeDifferenceWidth = Math.abs(canvas.width - width);
        const sizeDifferenceHeight = Math.abs(canvas.height - height);
        needsResize = sizeDifferenceWidth > 1 || sizeDifferenceHeight > 1;
        
        if (needsResize) {
            // Set canvas drawing size
            canvas.width = width;
            canvas.height = height;

            // Set CSS size explicitly in pixels
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            // Update config with current pixel dimensions
            config.canvasWidth = width;
            config.canvasHeight = height;
            
            // Calculate and store pixels per cm
            config.pixelsPerCm = width / config.canvasWidthCm;
        }
    }

    // Only recalculate grid spacing and update grid size limits if the canvas was resized
    if (needsResize) {
        // Recalculate grid spacing
        updateGridSpacing();

        // Update grid size limits after resizing
        updateGridSizeLimits(config, gridSizeSlider, gridSquareSizeInput, currentImage);

        // Return true if canvas was resized
        return true;
    }
    
    return false;
}

// Update canvas size function to use responsive sizing
function updateCanvasSize() {
    // Calculate new canvas dimensions maintaining aspect ratio
    const aspectRatio = config.canvasHeightCm / config.canvasWidthCm;
    
    // Trigger resize to fit
    resizeCanvasToFit();
    
    // Update grid size and limits after canvas size change
    setDefaultGridSize(config, currentImage, unitSelect, gridSquareSizeInput, gridSizeSlider, gridSizeValue);
    updateGridSizeLimits(config, gridSizeSlider, gridSquareSizeInput);
}

// Add window resize handler with debounce
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        resizeCanvasToFit();
    }, 100);
});

// Initialize grid style listeners
initGridStyleListeners(drawCanvas);

// Initialize filters
initFilters(drawCanvas);

// Initialize zoom and pan listeners
let zoomPanInitialized = false;

function initializeZoomPan() {
    if (currentImage && !zoomPanInitialized) {
        initZoomPanListeners(canvas, currentImage, drawCanvas, config);
        zoomPanInitialized = true;
    }
}

// Call this when loading a new image
function onImageLoaded(img) {
    // Force edge filter to refresh on new image load
    const edgeFilter = filterManager.getFilter('edge');
    if (edgeFilter) {
        edgeFilter.edgeData = null;
        edgeFilter.originalImageData = null;
    }

    currentImage = img;
    setOriginalImage(img); // Store the original image
    zoomPanInitialized = false;
    initializeZoomPan();
    resizeCanvasToFit();
    drawCanvas();
}

// Add fit to canvas functionality
function fitToCanvas() {
    if (config.viewMode !== 'canvas' || !currentImage) return;
    
    // Reset transform when loading new image
    setZoom(1);
    setPanX(0);
    setPanY(0);
    
    // Redraw canvas

    console.log("Fit to canvas 2");
}

// Add fit to screen functionality
function fitToScreen() {
    if (config.viewMode !== 'full' || !currentImage) return;
    
    // Get the main container and its dimensions
    const mainContainer = document.querySelector('.relative.w-full');
    const availableWidth = mainContainer.clientWidth;
    const availableHeight = mainContainer.clientHeight;
    
    // Calculate the scale needed to fit the image with reduced padding
    const scale = Math.min(
        (availableWidth - 32) / currentImage.naturalWidth,
        (availableHeight - 32) / currentImage.naturalHeight
    );
    
    // Update zoom level
    setZoom(scale);
    
    // Reset pan position
    setPanX(0);
    setPanY(0);
    
    // Redraw canvas
    drawCanvas();
}

// Add event listener for fit to screen button
fitToScreenBtn.addEventListener('click', fitToScreen);

// Event listeners for grid controls
gridSizeSlider.addEventListener('input', () => {
    gridSquareSizeInput.value = gridSizeSlider.value;
    updateGridSpacing();
    disableOriginalViewIfActive();
});

gridSquareSizeInput.addEventListener('change', () => {
    updateGridSpacing();
    disableOriginalViewIfActive();
});

// Add these at the top with other constants
const MAX_PREVIEW_DIMENSION = 2000; // Maximum dimension for preview image
let previewImage = null;

// Add this function to create a preview version of the image
function createPreviewImage(image) {
    const previewCanvas = document.createElement('canvas');
    const previewCtx = previewCanvas.getContext('2d');
    
    // Calculate dimensions to maintain aspect ratio
    let width = image.naturalWidth;
    let height = image.naturalHeight;
    
    if (width > MAX_PREVIEW_DIMENSION || height > MAX_PREVIEW_DIMENSION) {
        const scale = Math.min(MAX_PREVIEW_DIMENSION / width, MAX_PREVIEW_DIMENSION / height);
        width *= scale;
        height *= scale;
    }
    
    previewCanvas.width = width;
    previewCanvas.height = height;
    
    // Draw the image at the new size
    previewCtx.drawImage(image, 0, 0, width, height);
    
    return previewCanvas;
}

// Modify the image upload handler
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                onImageLoaded(img);
                // Create preview version
                previewImage = createPreviewImage(img);
                // Reset transform when loading new image
                setZoom(1);
                setPanX(0);
                setPanY(0);
                config.imageOffsetXPercent = 0;
                config.imageOffsetYPercent = 0;
                filterManager.cache.needsUpdate = true;
                
                // Use imported setDefaultGridSize with all required parameters
                setDefaultGridSize(config, img, unitSelect, gridSquareSizeInput, gridSizeSlider, gridSizeValue);
                
                // Update grid size limits
                updateGridSizeLimits(config, gridSizeSlider, gridSquareSizeInput);
                
                // Resize and fit to screen
                resizeCanvasToFit();
                if (config.viewMode === 'full') {
                    fitToScreen();
                } else {
                    fitToCanvas();
                }
                
                // Force update grid preview with current settings
                updateGridPreview();
                drawCanvas();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

function updateGridSpacing() {
    updateGridSpacingUtil(config, unitSelect, gridSquareSizeInput, gridSizeSlider, gridSizeValue, drawCanvas, currentImage);
}

// Event listeners for configuration changes
canvasWidthInput.addEventListener('change', () => {
    const value = parseFloat(canvasWidthInput.value);
    config.canvasWidthCm = convertFromUnit(value, canvasUnitSelect.value);
    updateCanvasSize();
    orientationManager.updateOrientation();
});

canvasHeightInput.addEventListener('change', () => {
    const value = parseFloat(canvasHeightInput.value);
    config.canvasHeightCm = convertFromUnit(value, canvasUnitSelect.value);
    updateCanvasSize();
    orientationManager.updateOrientation();
});

canvasUnitSelect.addEventListener('change', () => {
    updateCanvasUnitDisplay();
    orientationManager.updateOrientation();
});

unitSelect.addEventListener('change', () => {
    if (config.viewMode === 'full') {
        // In full image mode, force px unit
        unitSelect.value = 'px';
        updateGridSpacing();
    } else {
        // Canvas mode - existing logic
        const currentSizeCm = config.gridSizeCm;
        
        // Update input and slider values based on unit
        if (unitSelect.value === 'in') {
            gridSquareSizeInput.value = (currentSizeCm / CM_PER_INCH).toFixed(2);
            gridSizeSlider.value = gridSquareSizeInput.value;
            gridSizeSlider.step = "0.25";
        } else {
            gridSquareSizeInput.value = currentSizeCm.toFixed(1);
            gridSizeSlider.value = gridSquareSizeInput.value;
            gridSizeSlider.step = "0.1";
        }
        
        // Calculate pixels per cm for grid spacing
        const pixelsPerCm = config.canvasWidth / config.canvasWidthCm;
        config.gridSpacing = currentSizeCm * pixelsPerCm;
        
        // Update grid size limits for the new unit
        updateGridSizeLimits(config, gridSizeSlider, gridSquareSizeInput, currentImage);
        
        updateGridSpacing();
        drawCanvas(); // Ensure the grid is redrawn with the new spacing
    }
});

// Touch gesture handling
let initialDistance = 0;
let initialZoom = 1;
let initialCenterX = 0;
let initialCenterY = 0;
let initialPanX = 0;
let initialPanY = 0;

function getTouchPointInCanvas(touchX, touchY) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: touchX - rect.left,
        y: touchY - rect.top
    };
}

canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
        e.preventDefault();
        
        // Calculate initial distance between touch points
        initialDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        
        // Calculate initial center point
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const centerPoint = getTouchPointInCanvas(centerX, centerY);
        
        initialCenterX = centerPoint.x;
        initialCenterY = centerPoint.y;
        
        // Store initial transform state
        initialZoom = getZoom();
        initialPanX = getPanX();
        initialPanY = getPanY();
    }
});

canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
        e.preventDefault();
        
        // Calculate current distance and center point
        const currentDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const currentCenter = getTouchPointInCanvas(centerX, centerY);
        
        // Calculate zoom scale
        const scale = currentDistance / initialDistance;
        const newZoom = Math.min(Math.max(0.1, initialZoom * scale), 10);
        
        // Calculate the point in image coordinates
        const imageScale = Math.min(
            config.canvasWidth / currentImage.width,
            config.canvasHeight / currentImage.height
        );
        const baseWidth = currentImage.width * imageScale;
        const baseHeight = currentImage.height * imageScale;
        const centerOffsetX = (config.canvasWidth - baseWidth) / 2;
        const centerOffsetY = (config.canvasHeight - baseHeight) / 2;
        
        // Convert center point to image coordinates
        const imageX = (initialCenterX - centerOffsetX - initialPanX) / initialZoom;
        const imageY = (initialCenterY - centerOffsetY - initialPanY) / initialZoom;
        
        // Calculate new pan to keep the center point fixed
        const newPanX = currentCenter.x - centerOffsetX - imageX * newZoom;
        const newPanY = currentCenter.y - centerOffsetY - imageY * newZoom;
        
        setZoom(newZoom);
        setPanX(newPanX);
        setPanY(newPanY);
        
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
    
    // Scale the delta by zoom level in full image mode
    if (config.viewMode === 'full') {
        const zoom = getZoom();
        setPanX(getPanX() + deltaX / zoom);
        setPanY(getPanY() + deltaY / zoom);
    } else {
        setPanX(getPanX() + deltaX);
        setPanY(getPanY() + deltaY);
    }
    
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

// Add event listener for reset zoom button
resetZoomBtn.addEventListener('click', () => {
    resetZoomAndPan(drawCanvas);
});

// Add keyboard shortcuts for zooming
document.addEventListener('keydown', (e) => {
    if (e.key === '+' || e.key === '=') {
        setZoom(Math.min(10, getZoom() + 0.1));
        drawCanvas();
    } else if (e.key === '-' || e.key === '_') {
        setZoom(Math.max(0.1, getZoom() - 0.1));
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
    const exportCanvasElement = document.createElement('canvas');
    const exportCtx = exportCanvasElement.getContext('2d');
    
    if (config.viewMode === 'full') {
        // In full image mode, use the original image dimensions
        exportCanvasElement.width = currentImage.naturalWidth;
        exportCanvasElement.height = currentImage.naturalHeight;
        
        // Clear export canvas with dark background
        exportCtx.fillStyle = '#2c2c2e';
        exportCtx.fillRect(0, 0, exportCanvasElement.width, exportCanvasElement.height);
        
        // Create a temporary canvas for the image and filters
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = currentImage.naturalWidth;
        tempCanvas.height = currentImage.naturalHeight;

        // Draw the full image to temp canvas
        tempCtx.drawImage(currentImage, 0, 0);

        // Apply filters if any are active
        if (filterManager.areFiltersActive()) {
            // Get the edge filter if it's active
            const edgeFilter = filterManager.getFilter('edge');
            if (edgeFilter?.active) {
                // Always regenerate edge data for export size
                const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                edgeFilter.setOriginalImage(imageData);
            }
            filterManager.applyFilters(tempCtx, tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
            // Optionally, reset edge filter cache after export to avoid preview/export mismatch
            if (edgeFilter?.active) {
                edgeFilter.edgeData = null;
                edgeFilter.originalImageData = null;
            }
        }

        // Draw the filtered image to export canvas
        exportCtx.drawImage(tempCanvas, 0, 0);
        
        // Draw grid using current grid type
        const gridType = getCurrentGridType();
        if (gridType) {
            exportCtx.save();
            
            // Set up grid styling
            exportCtx.strokeStyle = gridConfig.color;
            exportCtx.globalAlpha = gridConfig.opacity;
            exportCtx.lineWidth = gridConfig.lineWeight;
            
            // Draw grid using the current grid type
            const dimensions = {
                width: exportCanvasElement.width,
                height: exportCanvasElement.height,
                gridSpacing: config.gridSpacing
            };
            gridType.draw(exportCtx, gridConfig, dimensions);
            
            exportCtx.restore();
        }
        
        exportCtx.globalAlpha = 1; // Reset opacity
    } else {
        // Canvas mode - existing export logic
        exportCanvasElement.width = EXPORT_SIZE;
        exportCanvasElement.height = Math.round(EXPORT_SIZE * (config.canvasHeight / config.canvasWidth));
        
        // Calculate scale factor between preview and export
        const scaleFactor = EXPORT_SIZE / config.canvasWidth;
        
        // Clear export canvas with dark background
        exportCtx.fillStyle = '#2c2c2e';
        exportCtx.fillRect(0, 0, exportCanvasElement.width, exportCanvasElement.height);
        
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
        const finalWidth = baseWidth * getZoom() * scaleFactor;
        const finalHeight = baseHeight * getZoom() * scaleFactor;
        const x = (centerX + getPanX()) * scaleFactor;
        const y = (centerY + getPanY()) * scaleFactor;
        
        // Always use the original high-resolution image for export, regardless of zoom level
        const sourceImage = currentImage;
        
        // Create a temporary canvas for the image and filters
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // Calculate scale to maintain original image's aspect ratio
        const outputScale = Math.min(
            finalWidth / sourceImage.width,
            finalHeight / sourceImage.height
        );
        const scaledWidth = sourceImage.width * outputScale;
        const scaledHeight = sourceImage.height * outputScale;
        
        tempCanvas.width = scaledWidth;
        tempCanvas.height = scaledHeight;
        
        // Enable high quality image scaling
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        
        tempCtx.drawImage(sourceImage, 0, 0, scaledWidth, scaledHeight);
        
        // Apply filters if any are active
        if (filterManager.areFiltersActive()) {
            // Get the edge filter if it's active
            const edgeFilter = filterManager.getFilter('edge');
            if (edgeFilter?.active) {
                // Always regenerate edge data for export size
                const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                edgeFilter.setOriginalImage(imageData);
            }
            filterManager.applyFilters(tempCtx, tempCanvas, 0, 0, scaledWidth, scaledHeight);
            // Optionally, reset edge filter cache after export to avoid preview/export mismatch
            if (edgeFilter?.active) {
                edgeFilter.edgeData = null;
                edgeFilter.originalImageData = null;
            }
        }

        // Draw the filtered image to export canvas
        exportCtx.drawImage(tempCanvas, x, y);
        
        // Draw grid using current grid type
        const gridType = getCurrentGridType();
        if (gridType) {
            exportCtx.save();
            
            // Set up grid styling
            exportCtx.strokeStyle = gridConfig.color;
            exportCtx.globalAlpha = gridConfig.opacity;
            exportCtx.lineWidth = gridConfig.lineWeight;
            
            // Draw grid using the current grid type
            const dimensions = {
                width: exportCanvasElement.width,
                height: exportCanvasElement.height,
                gridSpacing: config.gridSpacing * scaleFactor
            };
            gridType.draw(exportCtx, gridConfig, dimensions);
            
            exportCtx.restore();
        }
        
        exportCtx.globalAlpha = 1; // Reset opacity
    }
    
    // Use the imported exportCanvas function to handle the export
    exportCanvas(exportCanvasElement).catch(error => {
        console.error('Export failed:', error);
        alert('Failed to export image. Please try again.');
    });
});

// Add these variables near the top where other state variables are defined
let fullModeState = {
    zoom: 1,
    panX: 0,
    panY: 0,
    filterCache: null,
    gridSettings: null  // Add grid settings storage
};

let canvasModeState = {
    zoom: 1,
    panX: 0,
    panY: 0,
    filterCache: null,
    gridSettings: null  // Add grid settings storage
};

// Helper function to save the current state
function saveCurrentState() {
    const state = config.viewMode === 'full' ? fullModeState : canvasModeState;
    state.zoom = getZoom();
    state.panX = getPanX();
    state.panY = getPanY();
    state.filterCache = filterManager.cache.imageData;
    
    // Save grid settings
    state.gridSettings = {
        type: gridConfig.type,
        color: gridConfig.color,
        opacity: gridConfig.opacity,
        lineWeight: gridConfig.lineWeight,
        spacing: config.gridSpacing,
        sizeCm: config.gridSizeCm
    };
    
    // Log state for debugging
    console.log(`Saved ${config.viewMode} mode state:`, {
        zoom: state.zoom,
        panX: state.panX,
        panY: state.panY,
        gridSettings: state.gridSettings
    });
}

// Helper function to restore a saved state
function restoreState(state) {
    if (!state) return false;
    
    // Restore zoom and pan
    if (typeof state.zoom === 'number' && !isNaN(state.zoom)) {
        setZoom(state.zoom);
    }
    
    if (typeof state.panX === 'number' && !isNaN(state.panX)) {
        setPanX(state.panX);
    }
    
    if (typeof state.panY === 'number' && !isNaN(state.panY)) {
        setPanY(state.panY);
    }
    
    // Restore filter cache if it exists
    if (state.filterCache) {
        filterManager.cache.imageData = state.filterCache;
        filterManager.cache.needsUpdate = false;
    } else {
        filterManager.cache.needsUpdate = true;
    }
    
    // Restore grid settings if they exist
    if (state.gridSettings) {
        if (state.gridSettings.type) {
            gridConfig.type = state.gridSettings.type;
            // Update grid type in UI
            const gridTypeSelect = document.getElementById('gridType');
            if (gridTypeSelect) {
                gridTypeSelect.value = state.gridSettings.type;
            }
        }
        
        if (state.gridSettings.color) {
            gridConfig.color = state.gridSettings.color;
        }
        
        if (typeof state.gridSettings.opacity === 'number') {
            gridConfig.opacity = state.gridSettings.opacity;
        }
        
        if (state.gridSettings.lineWeight) {
            gridConfig.lineWeight = state.gridSettings.lineWeight;
        }
        
        if (typeof state.gridSettings.spacing === 'number') {
            config.gridSpacing = state.gridSettings.spacing;
        }
        
        if (typeof state.gridSettings.sizeCm === 'number') {
            config.gridSizeCm = state.gridSettings.sizeCm;
        }
        
        // Update grid controls UI
        updateGridControlsVisibility(gridConfig.type);
    }
    
    // Log state for debugging
    console.log(`Restored state:`, {
        zoom: state.zoom,
        panX: state.panX,
        panY: state.panY,
        gridSettings: state.gridSettings
    });
    
    return true;
}

function updateViewMode(showAll) {
    if (!showAllBtn || !cropToCanvasBtn) return; // Guard against null elements
    
    // If we're already in this mode, don't do anything
    if ((showAll && config.viewMode === 'full') || (!showAll && config.viewMode === 'canvas')) {
        return;
    }
    
    // Save current state before switching
    saveCurrentState();
    
    showAllBtn.setAttribute('data-active', showAll ? 'true' : 'false');
    cropToCanvasBtn.setAttribute('data-active', !showAll ? 'true' : 'false');
    
    // Enable/disable canvas size controls
    if (canvasWidth) canvasWidth.disabled = showAll;
    if (canvasHeight) canvasHeight.disabled = showAll;
    if (canvasUnitSelect) canvasUnitSelect.disabled = showAll;
    if (document.getElementById('canvasSizePreset')) {
        document.getElementById('canvasSizePreset').disabled = showAll;
    }

    // Update view mode in config
    config.viewMode = showAll ? 'full' : 'canvas';
    
    // Force edge filter to refresh when switching modes
    const edgeFilter = filterManager.getFilter('edge');
    if (edgeFilter) {
        edgeFilter.edgeData = null;
        edgeFilter.originalImageData = null;
    }
    
    // Invalidate filter cache when switching modes
    filterManager.invalidateCache();
    
    // Update UI based on view mode - Make buttons visible/hidden
    if (fitToScreenBtn) fitToScreenBtn.style.display = showAll ? 'inline-flex' : 'none';
    if (zoom100Btn) zoom100Btn.style.display = showAll ? 'inline-flex' : 'none';
    if (resetZoomBtn) resetZoomBtn.style.display = showAll ? 'none' : 'inline-flex';
    
    // Update canvas if we have an image
    if (currentImage) {
        // First resize the canvas to fit the new mode
        const wasResized = resizeCanvasToFit();
        
        // Store current grid type before updating
        const currentGridType = gridConfig.type;
        
        // Try to restore previous state for this mode
        const targetState = showAll ? fullModeState : canvasModeState;
        
        // If switching to full mode, fit the image to screen first
        if (showAll) {
            // Temporarily set view mode to full to allow fitToScreen to work
            const originalViewMode = config.viewMode;
            config.viewMode = 'full';
            fitToScreen();
            config.viewMode = originalViewMode;
        }
        
        // Restore zoom and pan state when switching to canvas mode
        if (!showAll && targetState) {
            if (typeof targetState.zoom === 'number' && !isNaN(targetState.zoom)) {
                setZoom(targetState.zoom);
            }
            if (typeof targetState.panX === 'number' && !isNaN(targetState.panX)) {
                setPanX(targetState.panX);
            }
            if (typeof targetState.panY === 'number' && !isNaN(targetState.panY)) {
                setPanY(targetState.panY);
            }
        }
        
        // Reset grid size when switching modes
        updateGridSpacingUtil(config, unitSelect, gridSquareSizeInput, gridSizeSlider, gridSizeValue, drawCanvas, currentImage, true);
        
        // Update grid controls visibility
        updateGridControlsVisibilityUtil(currentGridType);
        
        // Update grid size limits
        updateGridSizeLimits(config, gridSizeSlider, gridSquareSizeInput, currentImage);
    }
    
    // Redraw canvas
    drawCanvas();
}

// Helper function to update grid slider UI
function updateGridSliderUI() {
    updateGridSliderUIUtil(config, unitSelect, gridSizeValue, gridSizeSlider, gridSquareSizeInput);
}

// Add event listeners for filter changes
const filterInputs = document.querySelectorAll('#filtersPanel input[type="range"], #filtersPanel input[type="checkbox"]');
filterInputs.forEach(input => {
    input.addEventListener('change', () => {
        filterManager.cache.needsUpdate = true;
        drawCanvas();
    });
});

function updateGridControlsVisibility(gridType) {
    updateGridControlsVisibilityUtil(gridType);
}

// Modify the grid type change handler
const gridTypeSelect = document.getElementById('gridType');
if (gridTypeSelect) {
    gridTypeSelect.addEventListener('change', (e) => {
        gridConfig.type = e.target.value;
        updateGridControlsVisibility(gridConfig.type);
        disableOriginalViewIfActive();
        drawCanvas();
    });
}

// Grid type definitions
const gridTypes = {
    square: {
        name: 'Square',
        draw: (ctx, config, dimensions) => {
            const spacing = dimensions.gridSpacing || config.spacing;
            for (let x = 0; x <= dimensions.width; x += spacing) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, dimensions.height);
                ctx.stroke();
            }
            for (let y = 0; y <= dimensions.height; y += spacing) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(dimensions.width, y);
                ctx.stroke();
            }
        }
    },
    diagonal: {
        name: 'Diagonal',
        draw: (ctx, config, dimensions) => {
            const spacing = 8; // Fixed spacing for diagonal
            for (let x = -dimensions.height; x < dimensions.width; x += spacing) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x + dimensions.height, dimensions.height);
                ctx.stroke();
            }
            for (let x = 0; x < dimensions.width + dimensions.height; x += spacing) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x - dimensions.height, dimensions.height);
                ctx.stroke();
            }
        }
    },
    isometric: {
        name: 'Isometric',
        draw: (ctx, config, dimensions) => {
            const spacing = 8; // Fixed spacing for isometric
            const height30 = dimensions.height * Math.sqrt(3) / 2;
            
            // Vertical lines
            for (let x = 0; x <= dimensions.width; x += spacing) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, dimensions.height);
                ctx.stroke();
            }
            
            // 30-degree lines
            for (let y = -dimensions.width; y < dimensions.height; y += spacing) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(dimensions.width, y + height30);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(0, y + height30);
                ctx.lineTo(dimensions.width, y);
                ctx.stroke();
            }
        }
    }
};

function drawGrid() {
    drawGridUtil(ctx, config, gridConfig, canvas);
}

// Initialize buttons and UI controls
function initializeButtons() {
    // Initialize the Squint button
    const squintBtn = document.querySelector('button:has(svg[data-lucide="eye"])');
    if (squintBtn) {
        squintBtn.addEventListener('click', () => {
            const blurFilter = filterManager.getFilter('blur');
            if (blurFilter) {
                // Toggle the blur filter
                blurFilter.active = !blurFilter.active;
                
                // Update the UI
                const blurToggle = document.getElementById('blurFilterToggle');
                if (blurToggle) {
                    blurToggle.checked = blurFilter.active;
                }
                
                // Update button appearance
                if (blurFilter.active) {
                    squintBtn.classList.add('text-indigo-400', 'bg-zinc-800/75');
                    squintBtn.classList.remove('text-zinc-400');
                } else {
                    squintBtn.classList.remove('text-indigo-400', 'bg-zinc-800/75');
                    squintBtn.classList.add('text-zinc-400');
                }
                
                // Disable original view if active
                disableOriginalViewIfActive();
                
                // Update the preview
                filterManager.cache.needsUpdate = true;
                drawCanvas();
            }
        });
    }

    // Initialize the Show Original button
    const showOriginalBtn = document.querySelector('button:has(svg[data-lucide="image"])');
    if (showOriginalBtn) {
        showOriginalBtn.addEventListener('click', () => {
            if (!currentImage) return;
            
            // Store current view state before switching
            storeCurrentViewState(getZoom(), getPanX(), getPanY());
            
            // Toggle between original and filtered view
            const showingOriginal = toggleOriginalImage();
            
            // Update button appearance
            if (showingOriginal) {
                showOriginalBtn.classList.add('text-indigo-400', 'bg-zinc-800/75');
                showOriginalBtn.classList.remove('text-zinc-400');
            } else {
                showOriginalBtn.classList.remove('text-indigo-400', 'bg-zinc-800/75');
                showOriginalBtn.classList.add('text-zinc-400');
            }
            
            // Redraw canvas
            drawCanvas();
        });
    }

    // Initialize the Fit to Screen button
    if (fitToScreenBtn) {
        fitToScreenBtn.addEventListener('click', () => {
            fitToScreen();
        });
        // Set initial visibility
        fitToScreenBtn.style.display = config.viewMode === 'full' ? 'inline-flex' : 'none';
    }

    // Initialize the Zoom 100% button
    if (zoom100Btn) {
        zoom100Btn.addEventListener('click', () => {
            zoomTo100();
        });
        // Set initial visibility
        zoom100Btn.style.display = config.viewMode === 'full' ? 'inline-flex' : 'none';
    }

    // Initialize the Reset Zoom button
    if (resetZoomBtn) {
        resetZoomBtn.addEventListener('click', () => {
            resetZoomAndPan();
        });
        // Set initial visibility
        resetZoomBtn.style.display = config.viewMode === 'canvas' ? 'inline-flex' : 'none';
    }

    // Initialize the Export button
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportCanvas();
        });
    }

    // Initialize view mode controls
    if (showAllBtn && cropToCanvasBtn) {
        // Set initial state for the buttons - ensure canvas mode is active by default
        showAllBtn.setAttribute('data-active', 'false');
        cropToCanvasBtn.setAttribute('data-active', 'true');
        
        // Set up event listeners
        showAllBtn.addEventListener('click', () => updateViewMode(true));
        cropToCanvasBtn.addEventListener('click', () => updateViewMode(false));
        
        // Make sure config is consistent with UI
        config.viewMode = 'canvas';
        
        // Update button visibility based on initial view mode
        if (fitToScreenBtn) fitToScreenBtn.style.display = 'none';
        if (zoom100Btn) zoom100Btn.style.display = 'none';
        if (resetZoomBtn) resetZoomBtn.style.display = 'inline-flex';
    }
}

// Add this just before the main DOMContentLoaded listener
function setupEventListeners() {
    // Add event listener for 100% zoom button
    const zoom100Button = document.getElementById('zoom100Btn');
    if (zoom100Button) {
        zoom100Button.addEventListener('click', () => zoomTo100(currentImage, drawCanvas, config));
    }
    
    // Other event listeners that need explicit initialization can go here
}

// Main initialization - consolidated from multiple listeners
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Wait for all resources to be loaded
        await new Promise(resolve => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });

        // Initialize canvas unit display
        updateCanvasUnitDisplay();
        
        // Set initial grid spacing to 5px in full mode
        config.gridSpacing = 5;
        
        // Set default grid style for initial render
        setDefaultGridStyle(config.viewMode);
        
        // Update grid spacing and canvas size
        updateGridSpacing();
        updateCanvasSize();
        
        // Initialize grid style listeners and update preview
        initGridStyleListeners(drawCanvas);
        updateGridPreview();
        
        // Update grid controls visibility
        updateGridControlsVisibility(gridConfig.type);
        
        // Initialize buttons and view mode controls
        initializeButtons();
        
        // Set up all event listeners
        setupEventListeners();
        
        // Initial resize
        resizeCanvasToFit();
        
        // Draw initial canvas
        drawCanvas();
        
        // Initialize orientation manager
        orientationManager = new OrientationManager(config, updateCanvasSize, drawCanvas);
        orientationManager.init();
    } catch (error) {
        console.error('Initialization error:', error);
    }
});

// Modify the drawCanvas function to use preview image and cached filters
function drawCanvas() {
    // Skip redraw if canvas has 0 width or height
    if (canvas.width === 0 || canvas.height === 0) return;
    
    // Clear canvas with dark background
    ctx.fillStyle = '#2c2c2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw image if one is loaded
    if (currentImage) {
        if (config.viewMode === 'full') {
            // Full image mode
            ctx.save();

            // Reset transform
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            // Apply centre translation
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            ctx.translate(centerX, centerY);

            // Apply zoom and pan
            const userZoom = getZoom();
            ctx.scale(userZoom, userZoom);
            ctx.translate(getPanX(), getPanY());

            // Center the image
            ctx.translate(-currentImage.naturalWidth / 2, -currentImage.naturalHeight / 2);

            // Choose source image: original vs filtered based on toggle state
            const sourceImage = isShowingOriginal() ? getOriginalImage() : currentImage;

            // Create a temporary canvas for the image and filters
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = sourceImage.width;
            tempCanvas.height = sourceImage.height;
            tempCtx.drawImage(sourceImage, 0, 0);

            // Apply filters if any are active and not showing original
            if (!isShowingOriginal() && filterManager.areFiltersActive()) {
                filterManager.applyFilters(tempCtx, tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
            }

            // Draw final image
            ctx.drawImage(tempCanvas, 0, 0, currentImage.naturalWidth, currentImage.naturalHeight);
            
            // Restore transform now that we're done with the image
            ctx.restore();
            
            // Draw grid using the current grid type if not showing original
            if (!isShowingOriginal()) {
                const gridType = getCurrentGridType();
                if (gridType && gridConfig.type !== 'none') {
                    try {
                        ctx.save();
                        
                        // Set up grid styling for full image mode
                        ctx.strokeStyle = gridConfig.color || '#ffffff';
                        ctx.globalAlpha = gridConfig.opacity || 0.5;
                        ctx.lineWidth = parseFloat(gridConfig.lineWeight) || 1; 
                        
                        // Calculate grid dimensions for full image
                        const zoom = getZoom();
                        const panX = getPanX();
                        const panY = getPanY();
                        
                        // Calculate visible area of the image
                        const centerX = canvas.width / 2;
                        const centerY = canvas.height / 2;
                        
                        // Transform grid to match image position
                        ctx.translate(centerX, centerY);
                        ctx.scale(zoom, zoom);
                        ctx.translate(panX, panY);
                        ctx.translate(-currentImage.naturalWidth / 2, -currentImage.naturalHeight / 2);
                        
                        // Draw the grid directly on the image
                        const dimensions = {
                            width: currentImage.naturalWidth,
                            height: currentImage.naturalHeight,
                            gridSpacing: config.gridSpacing || 20 // Fallback to 20px if not set
                        };
                        
                        gridType.draw(ctx, gridConfig, dimensions);
                        ctx.restore();
                    } catch (e) {
                        console.error('Error drawing grid in full image mode:', e);
                        ctx.restore(); // Ensure we restore in case of error
                    }
                }
            }
        } else {
            // Canvas mode - optimized logic
            const scale = Math.min(
                config.canvasWidth / currentImage.width,
                config.canvasHeight / currentImage.height
            );
            
            const baseWidth = currentImage.width * scale;
            const baseHeight = currentImage.height * scale;
            const centerX = (config.canvasWidth - baseWidth) / 2;
            const centerY = (config.canvasHeight - baseHeight) / 2;
            
            const finalWidth = baseWidth * getZoom();
            const finalHeight = baseHeight * getZoom();
            const x = centerX + getPanX();
            const y = centerY + getPanY();
            
            // Choose source image: original vs filtered based on toggle state
            const sourceImage = isShowingOriginal() ? getOriginalImage() : (previewImage || currentImage);
            
            // Create a temporary canvas for the image and filters
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = sourceImage.width;
            tempCanvas.height = sourceImage.height;
            tempCtx.drawImage(sourceImage, 0, 0);
            
            // Apply filters if any are active and not showing original
            if (!isShowingOriginal() && filterManager.areFiltersActive()) {
                filterManager.applyFilters(tempCtx, tempCanvas, 0, 0, sourceImage.width, sourceImage.height);
            }
            
            // Draw the image with high-quality scaling
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(tempCanvas, x, y, finalWidth, finalHeight);
            
            // Draw grid using the current grid type if not showing original
            if (!isShowingOriginal()) {
                const gridType = getCurrentGridType();
                if (gridType && gridConfig.type !== 'none') {
                    try {
                        ctx.save();
                        
                        // Set up grid styling
                        ctx.strokeStyle = gridConfig.color || '#ffffff';
                        ctx.globalAlpha = gridConfig.opacity || 0.5;
                        ctx.lineWidth = parseFloat(gridConfig.lineWeight) || 1;
                        
                        // For canvas mode, the grid should align to the canvas edges
                        // Draw grid covering the entire canvas
                        const dimensions = {
                            width: config.canvasWidth,
                            height: config.canvasHeight,
                            gridSpacing: config.gridSpacing || 20 // Fallback to 20px if not set
                        };
                        
                        gridType.draw(ctx, gridConfig, dimensions);
                        ctx.restore();
                    } catch (e) {
                        console.error('Error drawing grid in canvas mode:', e);
                        ctx.restore(); // Ensure we restore in case of error
                    }
                }
            }
        }
    }
    
    ctx.globalAlpha = 1; // Reset opacity
}

// View mode control functionality
const showAllBtn = document.getElementById('showAllBtn');
const cropToCanvasBtn = document.getElementById('cropToCanvasBtn');
const canvasWidth = document.getElementById('canvasWidth');
const canvasHeight = document.getElementById('canvasHeight');

// Initialize slider interaction manager for all panels
const panelManagers = {
    filters: new SliderInteractionManager('#filtersPanel', {
        fadeDuration: 200,
        fadeOpacity: 0,
        backgroundClass: 'bg-zinc-850',
        borderClass: 'border-zinc-800'
    }),
    grid: new SliderInteractionManager('#gridPanel', {
        fadeDuration: 200,
        fadeOpacity: 0,
        backgroundClass: 'bg-zinc-850'
    }),
    canvas: new SliderInteractionManager('#canvasPanel', {
        fadeDuration: 200,
        fadeOpacity: 0,
        backgroundClass: 'bg-zinc-850'        
    })
};

// Add event listeners for filter value displays
const filterValueDisplays = document.querySelectorAll('[id$="Value"]');
filterValueDisplays.forEach(display => {
    display.addEventListener('click', () => {
        const resetValue = display.getAttribute('data-reset-value');
        const sliderId = display.id.replace('Value', '');
        const slider = document.getElementById(sliderId);
        
        if (slider) {
            slider.value = resetValue;
            slider.dispatchEvent(new Event('input'));
            slider.dispatchEvent(new Event('change'));
        }
    });
});

