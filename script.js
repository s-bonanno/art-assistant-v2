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
import { gridConfig, updateColorSwatchSelection, setDefaultGridStyle, initGridStyleListeners } from './js/utils/gridStyle.js';
import { filters, filterCache, applyFilters, initFilterListeners } from './js/utils/filters.js';
import { getZoom, setZoom, getPanX, setPanX, getPanY, setPanY, resetZoomAndPan, zoomTo100, initZoomPanListeners, calculateGridSizeLimits } from './js/utils/zoomPan.js';

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
    
    // Update grid size limits after resizing
    updateGridSizeLimits();
    
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
    if (currentImage) {
        if (config.viewMode === 'full') {
            // Full image mode - use image dimensions in pixels
            const longestSide = Math.max(currentImage.naturalWidth, currentImage.naturalHeight);
            const defaultGridSize = Math.floor(longestSide / 5);
            
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
initZoomPanListeners(canvas, currentImage, drawCanvas);

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
    
    // Update input step
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
        gridSizeSlider.value = config.gridSizeCm;
        gridSizeValue.textContent = `${config.gridSizeCm} cm`;
    }
}

// Add fit to screen functionality
function fitToScreen() {
    if (config.viewMode !== 'full' || !currentImage) return;
    
    // Get the main container and its dimensions
    const mainContainer = document.querySelector('.relative.w-full');
    const availableWidth = mainContainer.clientWidth;
    const availableHeight = mainContainer.clientHeight;
    
    // Calculate the scale needed to fit the image
    const scale = Math.min(
        (availableWidth - 64) / currentImage.naturalWidth,
        (availableHeight - 64) / currentImage.naturalHeight
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
                currentImage = img;
                // Create preview version
                previewImage = createPreviewImage(img);
                // Reset transform when loading new image
                setZoom(1);
                setPanX(0);
                setPanY(0);
                config.imageOffsetXPercent = 0;
                config.imageOffsetYPercent = 0;
                filterCache.needsUpdate = true;
                
                // Set default grid style when loading new image
                setDefaultGridStyle(config.viewMode);
                
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
                
                drawCanvas();
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
        gridSizeValue.textContent = `${config.gridSpacing} px`;
        unitSelect.value = 'px';
    } else {
        // Canvas mode - existing logic
        const gridSizeInCm = unitSelect.value === 'in' ? 
            parseFloat(gridSquareSizeInput.value) * CM_PER_INCH : 
            parseFloat(gridSquareSizeInput.value);
        
        // Calculate pixels per centimeter
        const pixelsPerCm = config.canvasWidth / config.canvasWidthCm;
        
        // Set grid spacing in pixels
        config.gridSpacing = gridSizeInCm * pixelsPerCm;
        
        // Update slider value to match input
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

// Mouse wheel zoom handler
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (!currentImage) return;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(Math.min(Math.max(0.1, getZoom() * zoomFactor), 10));
    
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
        initialZoom = getZoom();
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
        setZoom(Math.min(Math.max(0.1, initialZoom * scale), 10));
        
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
    
    setPanX(getPanX() + deltaX);
    setPanY(getPanY() + deltaY);
    
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
            console.log('Applying filters during export:', filters);
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
        const finalWidth = baseWidth * getZoom() * scaleFactor;
        const finalHeight = baseHeight * getZoom() * scaleFactor;
        const x = (centerX + getPanX()) * scaleFactor;
        const y = (centerY + getPanY()) * scaleFactor;
        
        // Create a temporary canvas for the image and filters
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = finalWidth;
        tempCanvas.height = finalHeight;

        // Draw the scaled image to temp canvas
        tempCtx.drawImage(currentImage, 0, 0, finalWidth, finalHeight);

        // Apply filters to temp canvas if any filters are active
        const hasActiveFilters = Object.values(filters).some(f => 
            (f.enabled !== undefined && f.enabled) || // For filters with enabled property
            (f.exposure !== undefined && (f.exposure !== 0 || f.contrast !== 0 || f.highlights !== 0 || f.shadows !== 0)) // For light adjustments
        );

        if (hasActiveFilters) {
            console.log('Applying filters during export:', filters);
            applyFilters(tempCtx, tempCanvas, 0, 0, finalWidth, finalHeight);
        }

        // Draw the filtered image to export canvas
        exportCtx.drawImage(tempCanvas, x, y);
        
        // Draw high-resolution grid with styling
        exportCtx.beginPath();
        exportCtx.strokeStyle = gridConfig.color;
        exportCtx.globalAlpha = gridConfig.opacity;
        exportCtx.lineWidth = gridConfig.lineWeight;
        
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

// Modify the drawCanvas function to use preview image and cached filters
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
            
            // Reset transform
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            
            // Apply transforms in the correct order
            ctx.translate(centerX, centerY);
            ctx.scale(getZoom(), getZoom());
            ctx.translate(getPanX(), getPanY());
            ctx.translate(-currentImage.naturalWidth / 2, -currentImage.naturalHeight / 2);
            
            // Check if we need to update the filter cache
            if (filterCache.needsUpdate || !filterCache.image || 
                JSON.stringify(filters) !== JSON.stringify(filterCache.filters)) {
                
                // Create a temporary canvas for the image and filters
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                
                // Use original image if zoomed to 100%, otherwise use preview
                const sourceImage = getZoom() === 1 ? currentImage : previewImage;
                tempCanvas.width = sourceImage.width;
                tempCanvas.height = sourceImage.height;

                // Draw the image to temp canvas
                tempCtx.drawImage(sourceImage, 0, 0);

                // Apply filters to temp canvas
                applyFilters(tempCtx, tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height);

                // Cache the filtered result
                filterCache.image = tempCanvas;
                filterCache.filters = JSON.parse(JSON.stringify(filters));
                filterCache.needsUpdate = false;
            }

            // Draw the cached filtered image to the main canvas
            ctx.drawImage(filterCache.image, 0, 0, currentImage.naturalWidth, currentImage.naturalHeight);
            
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
            
            const finalWidth = baseWidth * getZoom();
            const finalHeight = baseHeight * getZoom();
            const x = centerX + getPanX();
            const y = centerY + getPanY();
            
            // Create a temporary canvas for the image and filters
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = finalWidth;
            tempCanvas.height = finalHeight;

            // Draw the scaled image to temp canvas
            tempCtx.drawImage(currentImage, 0, 0, finalWidth, finalHeight);

            // Apply filters to temp canvas
            applyFilters(tempCtx, tempCanvas, 0, 0, finalWidth, finalHeight);

            // Draw the filtered image to the main canvas at the correct position
            ctx.drawImage(tempCanvas, x, y);
            
            // Draw grid
            ctx.beginPath();
            ctx.strokeStyle = gridConfig.color;
            ctx.globalAlpha = gridConfig.opacity;
            
            // Calculate preview scale based on current canvas size vs export size
            const previewScale = config.canvasWidth / EXPORT_SIZE;
            // Apply line width scaling consistently
            ctx.lineWidth = Math.max(0.5, gridConfig.lineWeight * previewScale);
            
            const gridSpacing = config.gridSpacing;
            const numVerticalLines = Math.ceil(config.canvasWidth / gridSpacing) + 1;
            const numHorizontalLines = Math.ceil(config.canvasHeight / gridSpacing) + 1;
            
            // Ensure lines are drawn on pixel boundaries for crisp rendering
            ctx.translate(0.5, 0.5);
            
            for (let i = 0; i < numVerticalLines; i++) {
                const x = Math.floor(i * gridSpacing);
                ctx.moveTo(x, -0.5);
                ctx.lineTo(x, config.canvasHeight - 0.5);
            }
            
            for (let i = 0; i < numHorizontalLines; i++) {
                const y = Math.floor(i * gridSpacing);
                ctx.moveTo(-0.5, y);
                ctx.lineTo(config.canvasWidth - 0.5, y);
            }
            
            ctx.stroke();
            ctx.translate(-0.5, -0.5);
        }
    }
    
    ctx.globalAlpha = 1; // Reset opacity
}

// Initial setup
updateCanvasUnitDisplay();
// Set initial grid spacing to 5px in full mode
config.gridSpacing = 5;
// Set default grid style for initial render
setDefaultGridStyle(config.viewMode);
updateGridSpacing();
updateCanvasSize();

// Initial resize
window.addEventListener('load', () => {
    resizeCanvasToFit();
});

// Add event listener for 100% zoom button
document.getElementById('zoom100Btn').addEventListener('click', () => zoomTo100(currentImage, drawCanvas, config));

// View mode control functionality
const showAllBtn = document.getElementById('showAllBtn');
const cropToCanvasBtn = document.getElementById('cropToCanvasBtn');
const canvasWidth = document.getElementById('canvasWidth');
const canvasHeight = document.getElementById('canvasHeight');

function updateViewMode(showAll) {
    if (!showAllBtn || !cropToCanvasBtn) return; // Guard against null elements
    
    showAllBtn.setAttribute('data-active', showAll);
    cropToCanvasBtn.setAttribute('data-active', !showAll);
    
    // Enable/disable canvas size controls
    if (canvasWidth) canvasWidth.disabled = showAll;
    if (canvasHeight) canvasHeight.disabled = showAll;
    if (canvasUnitSelect) canvasUnitSelect.disabled = showAll;

    // Update view mode in config
    config.viewMode = showAll ? 'full' : 'canvas';
    
    // Update UI based on view mode
    fitToScreenBtn.style.display = showAll ? 'inline-flex' : 'none';
    zoom100Btn.style.display = showAll ? 'inline-flex' : 'none';
    resetZoomBtn.style.display = showAll ? 'none' : 'inline-flex';
    
    // Update canvas if we have an image
    if (currentImage) {
        // Set default grid size for the new mode
        setDefaultGridSize();
        
        // Update grid size limits and fit to view
        updateGridSizeLimits();
        if (showAll) {
            fitToScreen();
        } else {
            fitToCanvas();
        }
        drawCanvas();
        resizeCanvasToFit();
    }
    
    // Add cache invalidation when switching modes
    filterCache.needsUpdate = true;
}

// Initialize view mode controls
document.addEventListener('DOMContentLoaded', () => {
    if (showAllBtn && cropToCanvasBtn) {
        showAllBtn.addEventListener('click', () => updateViewMode(true));
        cropToCanvasBtn.addEventListener('click', () => updateViewMode(false));
        updateViewMode(false); // Initialize with Crop to Canvas mode
    }
});

// Add event listeners for filter changes
const filterInputs = document.querySelectorAll('#filtersPanel input[type="range"], #filtersPanel input[type="checkbox"]');
filterInputs.forEach(input => {
    input.addEventListener('change', () => {
        filterCache.needsUpdate = true;
        drawCanvas();
    });
}); 