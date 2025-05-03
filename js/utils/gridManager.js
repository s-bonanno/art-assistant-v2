// Grid management functionality
export function updateGridSizeDisplay(unitSelect, config, gridSizeDisplay) {
    const unit = unitSelect.value;
    const size = convertToUnit(config.gridSizeCm, unit);
    gridSizeDisplay.textContent = `${size.toFixed(unit === 'in' ? 2 : 1)} ${unit}`;
}

export function updateGridSpacing(config, unitSelect, gridSquareSizeInput, gridSizeSlider, gridSizeValue, drawCanvas, currentImage) {
    if (config.viewMode === 'full') {
        // In full image mode, use pixels directly
        // Use input value if it exists, otherwise use slider value
        const newValue = gridSquareSizeInput ? parseFloat(gridSquareSizeInput.value) : parseFloat(gridSizeSlider.value);
        config.gridSpacing = newValue;
        
        // Update both input and slider to match
        if (gridSquareSizeInput) {
            gridSquareSizeInput.value = newValue;
        }
        if (gridSizeSlider) {
            gridSizeSlider.value = newValue;
        }
        if (gridSizeValue) {
            gridSizeValue.textContent = `${newValue} px`;
        }
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
    
    // Redraw canvas if an image is loaded
    if (currentImage) {
        drawCanvas();
    }
}

export function updateGridSliderUI(config, unitSelect, gridSizeValue, gridSizeSlider, gridSquareSizeInput) {
    // Update the slider display based on current mode and grid size
    if (config.viewMode === 'full') {
        // In full image mode, show pixels
        if (gridSizeValue) {
            gridSizeValue.textContent = `${config.gridSpacing} px`;
        }
        
        if (gridSizeSlider) {
            gridSizeSlider.value = config.gridSpacing;
        }
        
        if (gridSquareSizeInput) {
            gridSquareSizeInput.value = config.gridSpacing;
        }
    } else {
        // In canvas mode, show cm/in
        const unit = unitSelect ? unitSelect.value : 'cm';
        const displayValue = unit === 'in' ? 
            (config.gridSizeCm / CM_PER_INCH).toFixed(2) : 
            config.gridSizeCm.toFixed(1);
            
        if (gridSizeValue) {
            gridSizeValue.textContent = `${displayValue} ${unit}`;
        }
        
        if (gridSizeSlider) {
            gridSizeSlider.value = unit === 'in' ? 
                (config.gridSizeCm / CM_PER_INCH) : 
                config.gridSizeCm;
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
            if (gridSquareSizeInput) gridSquareSizeInput.value = defaultGridSize.toFixed(1);
            if (gridSizeSlider) gridSizeSlider.value = defaultGridSize;
            
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
            const maxSize = Math.max(currentImage.naturalWidth, currentImage.naturalHeight);
            const minSize = 10; // Minimum 10 pixels
            
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
        // Canvas mode - use centimeters
        const maxSize = Math.max(config.canvasWidthCm, config.canvasHeightCm);
        const minSize = 1; // Minimum 1 cm
        
        if (gridSizeSlider) {
            gridSizeSlider.min = minSize;
            gridSizeSlider.max = maxSize;
            gridSizeSlider.step = 0.1;
        }
        
        if (gridSquareSizeInput) {
            gridSquareSizeInput.min = minSize;
            gridSquareSizeInput.max = maxSize;
            gridSquareSizeInput.step = 0.1;
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