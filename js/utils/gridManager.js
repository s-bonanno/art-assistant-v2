import { calculateGridSizeLimits } from './gridLimits.js';
import { CM_PER_INCH } from './unitConversion.js';

// Grid management functionality
export function updateGridSizeDisplay(unitSelect, config, gridSizeDisplay) {
    const unit = unitSelect.value;
    const size = convertToUnit(config.gridSizeCm, unit);
    gridSizeDisplay.textContent = `${size.toFixed(unit === 'in' ? 2 : 1)} ${unit}`;
}

export function updateGridSpacing(config, unitSelect, gridSquareSizeInput, gridSizeSlider, gridSizeValue, drawCanvas, currentImage, isModeSwitch = false) {
    if (!currentImage) return;

    if (config.viewMode === 'full') {
        if (isModeSwitch) {
            // Reset grid size when switching to full mode
            const longestSide = Math.max(currentImage.naturalWidth, currentImage.naturalHeight);
            const defaultGridSize = Math.round(longestSide / 5);
            
            // Update config and UI
            config.gridSpacing = defaultGridSize;
            if (gridSquareSizeInput) gridSquareSizeInput.value = defaultGridSize;
            if (gridSizeSlider) gridSizeSlider.value = defaultGridSize;
            if (gridSizeValue) gridSizeValue.textContent = `${defaultGridSize} px`;
            
            // Set unit to px in full image mode and disable selector
            if (unitSelect) {
                unitSelect.value = 'px';
                unitSelect.disabled = true;
                
                // Update unit options for full image mode
                const pxOption = document.createElement('option');
                pxOption.value = 'px';
                pxOption.textContent = 'px';
                unitSelect.innerHTML = '';
                unitSelect.appendChild(pxOption);
            }
        } else {
            // Manual update in full mode
            const newValue = gridSquareSizeInput ? parseFloat(gridSquareSizeInput.value) : parseFloat(gridSizeSlider.value);
            config.gridSpacing = newValue;
            
            // Update both input and slider to match
            if (gridSquareSizeInput) gridSquareSizeInput.value = newValue;
            if (gridSizeSlider) gridSizeSlider.value = newValue;
            if (gridSizeValue) gridSizeValue.textContent = `${Math.round(newValue)} px`;
        }
    } else {
        if (isModeSwitch) {
            // Reset grid size when switching to canvas mode
            const defaultGridSize = Math.max(config.canvasWidthCm, config.canvasHeightCm) / 5;
            
            // Update config and UI
            config.gridSizeCm = defaultGridSize;
            
            // Enable unit selector and update options for canvas mode
            if (unitSelect) {
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
                    (defaultGridSize / CM_PER_INCH).toFixed(2) : 
                    defaultGridSize.toFixed(1);
                    
                if (gridSquareSizeInput) gridSquareSizeInput.value = displayValue;
                if (gridSizeSlider) gridSizeSlider.value = unit === 'in' ? 
                    (defaultGridSize / CM_PER_INCH) : 
                    defaultGridSize;
                if (gridSizeValue) gridSizeValue.textContent = `${displayValue} ${unit}`;
            }
            
            // Calculate pixels per cm for grid spacing
            const pixelsPerCm = config.canvasWidth / config.canvasWidthCm;
            config.gridSpacing = defaultGridSize * pixelsPerCm;
        } else {
            // Manual update in canvas mode
            const gridSizeInCm = unitSelect.value === 'in' ? 
                parseFloat(gridSquareSizeInput.value) * CM_PER_INCH : 
                parseFloat(gridSquareSizeInput.value);
            
            // Calculate pixels per centimeter
            const pixelsPerCm = config.canvasWidth / config.canvasWidthCm;
            
            // Set grid spacing in pixels
            config.gridSpacing = gridSizeInCm * pixelsPerCm;
            
            // Update UI with proper units
            const unit = unitSelect.value;
            const displayValue = unit === 'in' ? 
                (gridSizeInCm / CM_PER_INCH).toFixed(2) : 
                gridSizeInCm.toFixed(1);
                
            if (gridSquareSizeInput) gridSquareSizeInput.value = displayValue;
            if (gridSizeSlider) gridSizeSlider.value = unit === 'in' ? 
                (gridSizeInCm / CM_PER_INCH) : 
                gridSizeInCm;
            if (gridSizeValue) gridSizeValue.textContent = `${displayValue} ${unit}`;
        }
    }
    
    // Redraw canvas
    drawCanvas();
}

export function updateGridSliderUI(config, unitSelect, gridSizeValue, gridSizeSlider, gridSquareSizeInput) {
    // Update the slider display based on current mode and grid size
    if (config.viewMode === 'full') {
        // In full image mode, show pixels
        const pixelValue = Math.round(config.gridSpacing);
        if (gridSizeValue) {
            gridSizeValue.textContent = `${pixelValue} px`;
        }
        
        if (gridSizeSlider) {
            gridSizeSlider.value = pixelValue;
        }
        
        if (gridSquareSizeInput) {
            gridSquareSizeInput.value = pixelValue;
        }
    } else {
        // In canvas mode, show cm/in
        const unit = unitSelect ? unitSelect.value : 'cm';
        
        // Get the current value from the slider or input
        const currentValue = gridSizeSlider ? parseFloat(gridSizeSlider.value) : 
                            gridSquareSizeInput ? parseFloat(gridSquareSizeInput.value) : 0;
        
        // Convert to cm if needed
        const gridSizeInCm = unit === 'in' ? currentValue * CM_PER_INCH : currentValue;
        
        // Update config with the correct grid spacing
        const pixelsPerCm = config.canvasWidth / config.canvasWidthCm;
        config.gridSpacing = gridSizeInCm * pixelsPerCm;
        
        // Format display value
        const displayValue = unit === 'in' ? 
            currentValue.toFixed(2) : 
            currentValue.toFixed(1);
            
        if (gridSizeValue) {
            gridSizeValue.textContent = `${displayValue} ${unit}`;
        }
        
        if (gridSizeSlider) {
            gridSizeSlider.value = currentValue;
        }
        
        if (gridSquareSizeInput) {
            gridSquareSizeInput.value = displayValue;
        }
    }
}

export function updateGridControlsVisibility(gridType) {
    const controls = document.querySelectorAll('[data-grid-control="square-only"]');
    controls.forEach(control => {
        // Only show size controls for square grid
        control.style.display = gridType === 'square' ? 'block' : 'none';
    });
}

export function setDefaultGridSize(config, currentImage, unitSelect, gridSquareSizeInput, gridSizeSlider, gridSizeValue) {
    if (currentImage) {
        if (config.viewMode === 'full') {
            // Full image mode - use image dimensions in pixels
            const longestSide = Math.max(currentImage.naturalWidth, currentImage.naturalHeight);
            const defaultGridSize = Math.round(longestSide / 5);
            
            // Update config and UI
            config.gridSpacing = defaultGridSize;
            if (gridSquareSizeInput) gridSquareSizeInput.value = defaultGridSize;
            if (gridSizeSlider) gridSizeSlider.value = defaultGridSize;
            if (gridSizeValue) gridSizeValue.textContent = `${defaultGridSize} px`;
            
            // Set unit to px in full image mode and disable selector
            if (unitSelect) {
                unitSelect.value = 'px';
                unitSelect.disabled = true;
                
                // Update unit options for full image mode
                const pxOption = document.createElement('option');
                pxOption.value = 'px';
                pxOption.textContent = 'px';
                unitSelect.innerHTML = '';
                unitSelect.appendChild(pxOption);
            }
        } else {
            // Canvas mode - use configured dimensions
            const defaultGridSize = Math.max(config.canvasWidthCm, config.canvasHeightCm) / 5;
            
            // Update config and UI
            config.gridSizeCm = defaultGridSize;
            
            // Enable unit selector and update options for canvas mode
            if (unitSelect) {
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
                    (defaultGridSize / CM_PER_INCH).toFixed(2) : 
                    defaultGridSize.toFixed(1);
                    
                if (gridSquareSizeInput) gridSquareSizeInput.value = displayValue;
                if (gridSizeSlider) gridSizeSlider.value = unit === 'in' ? 
                    (defaultGridSize / CM_PER_INCH) : 
                    defaultGridSize;
                if (gridSizeValue) gridSizeValue.textContent = `${displayValue} ${unit}`;
            }
            
            // Calculate pixels per cm for grid spacing
            const pixelsPerCm = config.canvasWidth / config.canvasWidthCm;
            config.gridSpacing = defaultGridSize * pixelsPerCm;
        }
    }
}

export function updateGridSizeLimits(config, gridSizeSlider, gridSquareSizeInput, currentImage) {
    if (config.viewMode === 'full') {
        // Full image mode - use pixels
        if (currentImage) {
            const smallerDimension = Math.min(currentImage.naturalWidth, currentImage.naturalHeight);
            const largerDimension = Math.max(currentImage.naturalWidth, currentImage.naturalHeight);
            
            // Set minimum grid size to 1/50th of the smaller dimension
            const minSize = Math.max(1, Math.floor(smallerDimension / 50));
            
            // Set maximum grid size to 1/3 of the larger dimension
            const maxSize = Math.floor(largerDimension / 3);
            
            if (gridSizeSlider) {
                gridSizeSlider.min = minSize;
                gridSizeSlider.max = maxSize;
                gridSizeSlider.step = 1;
            }
            
            if (gridSquareSizeInput) {
                gridSquareSizeInput.min = minSize;
                gridSquareSizeInput.max = maxSize;
                gridSquareSizeInput.step = 1;
            }
        }
    } else {
        // Canvas mode - use cm/in
        if (config.pixelsPerCm) {
            const widthPx = config.canvasWidth;
            const heightPx = config.canvasHeight;
            
            const smallerDimension = Math.min(widthPx, heightPx);
            const largerDimension = Math.max(widthPx, heightPx);
            
            // Get current unit from the slider's parent form
            const unitSelect = document.getElementById('unitSelect');
            const unit = unitSelect ? unitSelect.value : 'cm';
            
            // Set minimum grid size to 1/50th of the smaller dimension
            let minSize = Math.max(0.1, (smallerDimension / 50) / config.pixelsPerCm);
            // Set maximum grid size to 1/3 of the larger dimension
            let maxSize = (largerDimension / 3) / config.pixelsPerCm;
            
            // Convert to inches if needed
            if (unit === 'in') {
                minSize = minSize / CM_PER_INCH;
                maxSize = maxSize / CM_PER_INCH;
            }
            
            if (gridSizeSlider) {
                gridSizeSlider.min = minSize;
                gridSizeSlider.max = maxSize;
                gridSizeSlider.step = unit === 'in' ? 0.01 : 0.1;
            }
            
            if (gridSquareSizeInput) {
                gridSquareSizeInput.min = minSize;
                gridSquareSizeInput.max = maxSize;
                gridSquareSizeInput.step = unit === 'in' ? 0.01 : 0.1;
            }
        }
    }
}

export function drawGrid(ctx, config, gridConfig, canvas) {
    if (!config.showGrid) return;

    const gridType = getCurrentGridType();
    if (!gridType) return;

    ctx.save();
    
    // Reset transform to draw grid in screen space
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Set up grid style
    ctx.strokeStyle = gridConfig.color;
    ctx.globalAlpha = gridConfig.opacity;
    ctx.lineWidth = 1;

    // Draw grid using the current grid type
    gridType.draw(ctx, gridConfig, {
        width: canvas.width,
        height: canvas.height,
        gridSpacing: config.gridSpacing
    });

    ctx.restore();
} 