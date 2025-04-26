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
const CM_PER_INCH = 2.54; // Conversion factor for inches to centimeters
import { convertToUnit, convertFromUnit } from './js/utils/unitConversion.js';
import { gridConfig, updateColorSwatchSelection, setDefaultGridStyle, initGridStyleListeners, getCurrentGridType, updateGridPreview } from './js/utils/gridStyle.js';
import { filters, filterCache, applyFilters, initFilterListeners, areFiltersActive } from './js/utils/filters.js';
import { getZoom, setZoom, getPanX, setPanX, getPanY, setPanY, resetZoomAndPan, zoomTo100, initZoomPanListeners, calculateGridSizeLimits } from './js/utils/zoomPan.js';
import { canvasSizePresets, initCanvasPresetSelector, resetPresetToCustom } from './js/utils/canvasPresets.js';
import { 
    updateGridSizeDisplay as updateGridSizeDisplayUtil,
    updateGridSpacing as updateGridSpacingUtil,
    updateGridSliderUI as updateGridSliderUIUtil,
    updateGridControlsVisibility as updateGridControlsVisibilityUtil,
    drawGrid as drawGridUtil
} from './js/utils/gridManager.js';

let currentImage = null;
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

// Initialize canvas size preset selector
if (canvasWidthInput && canvasHeightInput) {
    initCanvasPresetSelector(canvasWidthInput, canvasHeightInput, (size) => {
        // Update the config and redraw
        config.canvasWidthCm = size.width;
        config.canvasHeightCm = size.height;
        updateCanvasSize();
        drawCanvas();
        
        // Update orientation
        updateOrientation();
    });
}

// Add event listeners for width/height inputs to reset to custom
if (canvasWidthInput) {
    canvasWidthInput.addEventListener('input', () => {
        resetPresetToCustom();
        document.getElementById('canvasSizePreset').value = 'custom';
    });
}

if (canvasHeightInput) {
    canvasHeightInput.addEventListener('input', () => {
        resetPresetToCustom();
        document.getElementById('canvasSizePreset').value = 'custom';
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
        }
    }

    // Only recalculate grid spacing and update grid size limits if the canvas was resized
    if (needsResize) {
        // Recalculate grid spacing
        updateGridSpacing();

        // Update grid size limits after resizing
        updateGridSizeLimits();

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
    setDefaultGridSize();
    updateGridSizeLimits();
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
    if (currentImage) {
        if (config.viewMode === 'full') {
            // Full image mode - use image dimensions in pixels
            const longestSide = Math.max(currentImage.naturalWidth, currentImage.naturalHeight);
            const defaultGridSize = Math.round(longestSide / 5);
            
            // Update config and UI
            config.gridSpacing = defaultGridSize;
            gridSquareSizeInput.value = defaultGridSize;
            gridSizeSlider.value = defaultGridSize;
            gridSizeValue.textContent = `${defaultGridSize} px`;
            
            // Set unit to px in full image mode and disable selector
            unitSelect.value = 'px';
            unitSelect.disabled = true;
            
            // Update unit options for full image mode
            const pxOption = document.createElement('option');
            pxOption.value = 'px';
            pxOption.textContent = 'px';
            unitSelect.innerHTML = '';
            unitSelect.appendChild(pxOption);
            
            console.log("Set full image grid size to:", defaultGridSize, "px");
        } else {
            // Canvas mode - use canvas dimensions in cm
            const longestSideCm = Math.max(config.canvasWidthCm, config.canvasHeightCm);
            const defaultGridSizeCm = longestSideCm / 5;
            
            // Update config and UI
            config.gridSizeCm = defaultGridSizeCm;
            gridSquareSizeInput.value = defaultGridSizeCm.toFixed(1);
            gridSizeSlider.value = defaultGridSizeCm;
            
            // Enable unit selector and update options for canvas mode
            unitSelect.disabled = false;
            unitSelect.innerHTML = `
                <option value="cm">cm</option>
                <option value="in">in</option>
            `;
            
            // Set default unit to cm if not already set
            if (unitSelect.value !== 'cm' && unitSelect.value !== 'in') {
                unitSelect.value = 'cm';
            }
            
            const unit = unitSelect.value;
            const displayValue = unit === 'in' ? 
                (defaultGridSizeCm / CM_PER_INCH).toFixed(2) : 
                defaultGridSizeCm.toFixed(1);
            gridSizeValue.textContent = `${displayValue} ${unit}`;
            
            // Calculate pixels per cm for grid spacing
            const pixelsPerCm = config.canvasWidth / config.canvasWidthCm;
            config.gridSpacing = defaultGridSizeCm * pixelsPerCm;
            
            console.log("Set canvas grid size to:", defaultGridSizeCm, "cm");
        }
        
        // Update grid size limits for the current mode
        updateGridSizeLimits();
    }
}

// Initialize grid style listeners
initGridStyleListeners(drawCanvas);

// Initialize filter listeners
initFilterListeners(drawCanvas);

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
    currentImage = img;
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
    drawCanvas();
}

// Update grid size limits
function updateGridSizeLimits() {
    let width, height;
    
    if (config.viewMode === 'full' && currentImage) {
        width = currentImage.naturalWidth;
        height = currentImage.naturalHeight;
    } else {
        width = config.canvasWidth;
        height = config.canvasHeight;
    }
    
    const gridSizeLimits = calculateGridSizeLimits(
        width,
        height,
        config.viewMode,
        config
    );
    
    // Update slider and input settings
    gridSizeSlider.min = gridSizeLimits.min;
    gridSizeSlider.max = gridSizeLimits.max;
    gridSizeSlider.step = config.viewMode === 'full' ? '1' : '0.1';
    
    // If current grid size is outside new limits, adjust it
    if (config.viewMode === 'full') {
        if (config.gridSpacing < gridSizeLimits.min) {
            config.gridSpacing = gridSizeLimits.min;
        } else if (config.gridSpacing > gridSizeLimits.max) {
            config.gridSpacing = gridSizeLimits.max;
        }
        gridSizeSlider.value = config.gridSpacing;
        gridSizeValue.textContent = `${config.gridSpacing} px`;
    } else {
        const currentSizeCm = config.gridSizeCm;
        if (currentSizeCm < parseFloat(gridSizeLimits.min)) {
            config.gridSizeCm = parseFloat(gridSizeLimits.min);
        } else if (currentSizeCm > parseFloat(gridSizeLimits.max)) {
            config.gridSizeCm = parseFloat(gridSizeLimits.max);
        }
        
        // Update slider value
        gridSizeSlider.value = config.gridSizeCm;
        
        // Update display value based on selected unit
        const unit = unitSelect.value;
        const displayValue = unit === 'in' ? 
            (config.gridSizeCm / CM_PER_INCH).toFixed(2) : 
            config.gridSizeCm.toFixed(1);
        gridSizeValue.textContent = `${displayValue} ${unit}`;
        
        // Update input field value
        gridSquareSizeInput.value = displayValue;
        
        // Recalculate grid spacing with current dimensions
        const pixelsPerCm = config.canvasWidth / config.canvasWidthCm;
        config.gridSpacing = config.gridSizeCm * pixelsPerCm;
    }
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
});

gridSquareSizeInput.addEventListener('change', () => {
    updateGridSpacing();
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
                filterCache.needsUpdate = true;
                
                // Set default grid size based on image dimensions
                setDefaultGridSize();
                
                // Update grid size limits
                updateGridSizeLimits();
                
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
});

canvasHeightInput.addEventListener('change', () => {
    const value = parseFloat(canvasHeightInput.value);
    config.canvasHeightCm = convertFromUnit(value, canvasUnitSelect.value);
    updateCanvasSize();
});

canvasUnitSelect.addEventListener('change', () => {
    updateCanvasUnitDisplay();
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
        
        updateGridSpacing();
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
    if (config.viewMode === 'canvas') {
        fitToCanvas();
    } else {
        resetZoomAndPan(drawCanvas);
    }
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

        // Apply filters to temp canvas if any filters are active
        const hasActiveFilters = Object.values(filters).some(f => 
            (f.enabled !== undefined && f.enabled) || // For filters with enabled property
            (f.exposure !== undefined && (f.exposure !== 0 || f.contrast !== 0 || f.highlights !== 0 || f.shadows !== 0)) // For light adjustments
        );

        if (hasActiveFilters) {
            applyFilters(tempCtx, tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
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
                width: exportCanvas.width,
                height: exportCanvas.height,
                gridSpacing: config.gridSpacing
            };
            gridType.draw(exportCtx, gridConfig, dimensions);
            
            exportCtx.restore();
        }
        
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
        
        // Only apply filters if any are active
        const hasActiveFilters = Object.values(filters).some(f => 
            (f.enabled !== undefined && f.enabled) || 
            (f.exposure !== undefined && (f.exposure !== 0 || f.contrast !== 0 || f.highlights !== 0 || f.shadows !== 0))
        );
        
        if (hasActiveFilters) {
            applyFilters(tempCtx, tempCanvas, 0, 0, scaledWidth, scaledHeight);
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
                width: exportCanvas.width,
                height: exportCanvas.height,
                gridSpacing: config.gridSpacing * scaleFactor
            };
            gridType.draw(exportCtx, gridConfig, dimensions);
            
            exportCtx.restore();
        }
        
        exportCtx.globalAlpha = 1; // Reset opacity
    }
    
    // Create download link
    const link = document.createElement('a');
    link.download = 'grid-reference.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
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
    state.filterCache = filterCache.image;
    
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
        filterCache.image = state.filterCache;
        filterCache.needsUpdate = false;
    } else {
        filterCache.needsUpdate = true;
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
    
    // Update UI based on view mode - Make buttons visible/hidden
    if (fitToScreenBtn) fitToScreenBtn.style.display = showAll ? 'inline-flex' : 'none';
    if (zoom100Btn) zoom100Btn.style.display = showAll ? 'inline-flex' : 'none';
    if (resetZoomBtn) resetZoomBtn.style.display = showAll ? 'none' : 'inline-flex';
    
    // Update canvas if we have an image
    if (currentImage) {
        let needsRedraw = false;
        
        // Store current grid type before updating
        const currentGridType = gridConfig.type;
        
        // Always set default grid size when switching modes to ensure
        // it's 1/5 of the longest side
        setDefaultGridSize();
        needsRedraw = true;
        
        // Restore the previous grid type
        gridConfig.type = currentGridType;
        
        // Always mark filter cache as needing update when switching modes
        filterCache.needsUpdate = true;
        
        // Try to restore previous state for this mode (except for zoom in full mode)
        const targetState = showAll ? fullModeState : canvasModeState;
        
        // Only restore filter cache from previous state if it exists and matches current dimensions
        if (targetState.filterCache && 
            targetState.filterCache.width === (showAll ? currentImage.naturalWidth : previewImage.width) && 
            targetState.filterCache.height === (showAll ? currentImage.naturalHeight : previewImage.height)) {
            
            // Restore filter cache
            filterCache.image = targetState.filterCache;
            
            // Still mark cache as needing update to ensure filters are applied
            filterCache.needsUpdate = true;
        } else {
            // If we don't have saved state or dimensions don't match, make sure filters are updated
            filterCache.needsUpdate = true;
            filterCache.image = null;
        }
        
        // Restore grid settings if they exist
        if (targetState.gridSettings) {
            // Preserve grid type, color, opacity, and line weight
            if (targetState.gridSettings.color) {
                gridConfig.color = targetState.gridSettings.color;
            }
            
            if (typeof targetState.gridSettings.opacity === 'number') {
                gridConfig.opacity = targetState.gridSettings.opacity;
            }
            
            if (targetState.gridSettings.lineWeight) {
                gridConfig.lineWeight = targetState.gridSettings.lineWeight;
            }
            
            // Don't restore spacing - we want to use the default 1/5th rule
        }
        
        // For canvas mode, restore zoom/pan state if available
        if (!showAll && targetState.zoom && !isNaN(targetState.zoom)) {
            setZoom(targetState.zoom);
            setPanX(targetState.panX || 0);
            setPanY(targetState.panY || 0);
        } else {
            // Reset zoom and pan
            setZoom(1);
            setPanX(0);
            setPanY(0);
        }
        
        // For full image mode, always fit to screen
        // For canvas mode, always fit to canvas if no saved state
        if (showAll) {
            fitToScreen();
        } else if (!targetState.zoom || isNaN(targetState.zoom)) {
            fitToCanvas();
        }
        
        // Make sure grid settings are properly updated for the mode
        updateGridSpacing();
        
        // Only resize canvas if dimensions actually need to change
        // Use return value from resizeCanvasToFit to determine if canvas was resized
        const canvasResized = resizeCanvasToFit();
        needsRedraw = needsRedraw || canvasResized;
        
        // Update grid size limits if needed
        if (needsRedraw) {
            updateGridSizeLimits();
            
            // Also update the grid UI controls
            updateGridSliderUI();
            
            // Update grid type in UI to reflect current type
            const gridTypeSelect = document.getElementById('gridType');
            if (gridTypeSelect) {
                gridTypeSelect.value = currentGridType;
            }
        }
        
        // Only redraw if needed
        if (needsRedraw) {
            // Use requestAnimationFrame for smoother rendering
            requestAnimationFrame(() => {
                drawCanvas();
            });
        }
    }
}

// Helper function to update grid slider UI
function updateGridSliderUI() {
    updateGridSliderUIUtil(config, unitSelect, gridSizeValue, gridSizeSlider, gridSquareSizeInput);
}

// Add event listeners for filter changes
const filterInputs = document.querySelectorAll('#filtersPanel input[type="range"], #filtersPanel input[type="checkbox"]');
filterInputs.forEach(input => {
    input.addEventListener('change', () => {
        filterCache.needsUpdate = true;
        drawCanvas();
    });
});

function updateOrientation() {
    const landscapeBtn = document.getElementById('landscapeBtn');
    const portraitBtn = document.getElementById('portraitBtn');
    const width = parseFloat(canvasWidthInput.value);
    const height = parseFloat(canvasHeightInput.value);
    
    if (width === height) {
        // Square canvas - disable both buttons
        landscapeBtn.disabled = true;
        portraitBtn.disabled = true;
        landscapeBtn.setAttribute('data-active', 'false');
        portraitBtn.setAttribute('data-active', 'false');
    } else {
        // Enable buttons
        landscapeBtn.disabled = false;
        portraitBtn.disabled = false;
        
        // Set active state based on orientation
        const isLandscape = width > height;
        landscapeBtn.setAttribute('data-active', isLandscape);
        portraitBtn.setAttribute('data-active', !isLandscape);
    }
}

// Update grid controls visibility based on type
function updateGridControlsVisibility(gridType) {
    updateGridControlsVisibilityUtil(gridType);
}

// Modify the grid type change handler
const gridTypeSelect = document.getElementById('gridType');
if (gridTypeSelect) {
    gridTypeSelect.addEventListener('change', (e) => {
        gridConfig.type = e.target.value;
        updateGridControlsVisibility(gridConfig.type);
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
    // Ensure buttons are visible if they should be
    if (fitToScreenBtn) fitToScreenBtn.style.display = config.viewMode === 'full' ? 'inline-flex' : 'none';
    if (zoom100Btn) zoom100Btn.style.display = config.viewMode === 'full' ? 'inline-flex' : 'none';
    if (resetZoomBtn) resetZoomBtn.style.display = config.viewMode === 'canvas' ? 'inline-flex' : 'none';
    
    // Make sure buttons have event listeners
    if (fitToScreenBtn) {
        fitToScreenBtn.addEventListener('click', fitToScreen);
    }
    
    if (zoom100Btn) {
        zoom100Btn.addEventListener('click', () => zoomTo100(currentImage, drawCanvas, config));
    }
    
    if (resetZoomBtn) {
        resetZoomBtn.addEventListener('click', () => {
            if (config.viewMode === 'canvas') {
                fitToCanvas();
            } else {
                resetZoomAndPan(drawCanvas);
            }
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

            // Choose source image: original vs preview
            const sourceImage = userZoom === 1 ? currentImage : previewImage;

            // Update filter cache if needed
            if (
                filterCache.needsUpdate || 
                !filterCache.image || 
                filterCache.width !== sourceImage.width || 
                filterCache.height !== sourceImage.height
            ) {
                // Performance optimization: Check if any filters are active
                const hasActiveFilters = areFiltersActive();

                if (hasActiveFilters) {
                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d');

                    tempCanvas.width = sourceImage.width;
                    tempCanvas.height = sourceImage.height;
                    tempCtx.drawImage(sourceImage, 0, 0);
                    applyFilters(tempCtx, tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
                    filterCache.image = tempCanvas;
                } else {
                    // If no filters are active, just use the source image directly
                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCanvas.width = sourceImage.width;
                    tempCanvas.height = sourceImage.height;
                    tempCtx.drawImage(sourceImage, 0, 0);
                    filterCache.image = tempCanvas;
                }
                
                filterCache.width = sourceImage.width;
                filterCache.height = sourceImage.height;
                filterCache.needsUpdate = false;
                
                // Cache the filter state for this mode
                if (config.viewMode === 'full') {
                    fullModeState.filterCache = filterCache.image;
                } else {
                    canvasModeState.filterCache = filterCache.image;
                }
            }

            // Draw final filtered image
            ctx.drawImage(filterCache.image, 0, 0, currentImage.naturalWidth, currentImage.naturalHeight);
            
            // Restore transform now that we're done with the image
            ctx.restore();
            
            // Draw grid using the current grid type - fixed for full image mode
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
            
            // Choose source image: original vs preview based on zoom level
            const userZoom = getZoom();
            const sourceImage = userZoom === 1 ? currentImage : previewImage;
            
            // Check if we need to update the filter cache
            if (filterCache.needsUpdate || !filterCache.image || 
                filterCache.width !== sourceImage.width || 
                filterCache.height !== sourceImage.height) {
                
                // Performance optimization: Check if any filters are active
                const hasActiveFilters = areFiltersActive();
                
                if (hasActiveFilters) {
                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d');
                    
                    // Use the preview image's dimensions
                    tempCanvas.width = sourceImage.width;
                    tempCanvas.height = sourceImage.height;
                    
                    // Draw the source image
                    tempCtx.drawImage(sourceImage, 0, 0);
                    applyFilters(tempCtx, tempCanvas, 0, 0, sourceImage.width, sourceImage.height);
                    filterCache.image = tempCanvas;
                } else {
                    // If no filters are active, just use the source image directly
                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCanvas.width = sourceImage.width;
                    tempCanvas.height = sourceImage.height;
                    tempCtx.drawImage(sourceImage, 0, 0);
                    filterCache.image = tempCanvas;
                }
                
                filterCache.width = sourceImage.width;
                filterCache.height = sourceImage.height;
                filterCache.needsUpdate = false;
                
                // Cache the filter state for this mode
                if (config.viewMode === 'full') {
                    fullModeState.filterCache = filterCache.image;
                } else {
                    canvasModeState.filterCache = filterCache.image;
                }
            }
            
            // Draw the filtered image with high-quality scaling
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(filterCache.image, x, y, finalWidth, finalHeight);
            
            // Draw grid using the current grid type - fixed for canvas mode
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
    
    ctx.globalAlpha = 1; // Reset opacity
}

// View mode control functionality
const showAllBtn = document.getElementById('showAllBtn');
const cropToCanvasBtn = document.getElementById('cropToCanvasBtn');
const canvasWidth = document.getElementById('canvasWidth');
const canvasHeight = document.getElementById('canvasHeight');

// Update the function to use the renamed import
function updateGridSizeDisplay() {
    updateGridSizeDisplayUtil(unitSelect, config, gridSizeDisplay);
}

// ... rest of the code ... 