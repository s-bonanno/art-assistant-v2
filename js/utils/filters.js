// Filter state object
export const filters = {
    light: {
        active: false,
        exposure: 0,
        contrast: 0,
        highlights: 0,
        shadows: 0
    }
};

// Filter cache
export const filterCache = {
    image: null,
    width: 0,
    height: 0,
    needsUpdate: true,
    lastLightValues: { active: false, exposure: 0, contrast: 0, highlights: 0, shadows: 0 },
    lastFilters: null
};

// Debounce function to improve performance
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Helper function to check if filters have changed
function haveFiltersChanged() {
    if (!filterCache.lastFilters) return true;
    
    // Check light values
    if (filters.light) {
        // If filter isn't active, no need to check values
        if (!filters.light.active && !filterCache.lastLightValues.active) return false;
        
        // If active state changed, filters have changed
        if (filters.light.active !== filterCache.lastLightValues.active) return true;
        
        // Only check values if filter is active
        if (filters.light.active) {
            if (filters.light.exposure !== filterCache.lastLightValues.exposure) return true;
            if (filters.light.contrast !== filterCache.lastLightValues.contrast) return true;
            if (filters.light.highlights !== filterCache.lastLightValues.highlights) return true;
            if (filters.light.shadows !== filterCache.lastLightValues.shadows) return true;
        }
    }
    
    return false;
}

// Helper function to check if any filters are actually active and have non-zero values
export function areFiltersActive() {
    return filters.light && filters.light.active && (
        filters.light.exposure !== 0 || 
        filters.light.contrast !== 0 || 
        filters.light.highlights !== 0 || 
        filters.light.shadows !== 0
    );
}

// Apply filters to canvas
export function applyFilters(ctx, canvas, x, y, width, height) {
    // First check if any filters are actually active
    if (!areFiltersActive()) {
        // No active filters, skip processing
        return;
    }
    
    // Check if we need to update the cache
    if (!filterCache.needsUpdate && 
        filterCache.width === width && 
        filterCache.height === height && 
        !haveFiltersChanged()) {
        return; // Use cached result
    }
    
    // Get image data only once
    const imageData = ctx.getImageData(x, y, width, height);
    const data = imageData.data;
    
    // Apply light adjustments if active
    if (filters.light && filters.light.active) {
        applyLightAdjustments(data, filters.light);
        // Update last light values
        Object.assign(filterCache.lastLightValues, filters.light);
    }
    
    ctx.putImageData(imageData, x, y);
    
    // Update cache
    filterCache.width = width;
    filterCache.height = height;
    filterCache.lastFilters = JSON.parse(JSON.stringify(filters));
    filterCache.needsUpdate = false;
}

// Apply light adjustments with optimized processing
function applyLightAdjustments(data, lightValues) {
    // Quick check to avoid processing when no adjustments are needed
    if (lightValues.exposure === 0 && lightValues.contrast === 0 && 
        lightValues.highlights === 0 && lightValues.shadows === 0) {
        return;
    }
    
    // Pre-calculate factors to avoid repeated calculations in the loop
    const exposureFactor = 1 + (lightValues.exposure / 100);
    const contrastFactor = 1 + (lightValues.contrast / 100);
    const shadowFactor = 1 + (lightValues.shadows / 100);
    const highlightFactor = 1 + (lightValues.highlights / 100);
    
    // Use optimized version if only exposure is active
    if (lightValues.contrast === 0 && lightValues.highlights === 0 && lightValues.shadows === 0) {
        // Fast path for exposure-only adjustment
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, data[i] * exposureFactor));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * exposureFactor));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * exposureFactor));
        }
        return;
    }
    
    // Full processing path
    for (let i = 0; i < data.length; i += 4) {
        // Store original values
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Calculate luminance for highlights/shadows
        const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

        // Apply exposure (convert from percentage to factor)
        let newR = Math.min(255, Math.max(0, r * exposureFactor));
        let newG = Math.min(255, Math.max(0, g * exposureFactor));
        let newB = Math.min(255, Math.max(0, b * exposureFactor));

        // Apply contrast (convert from percentage to factor)
        if (contrastFactor !== 1) {
            const avg = (newR + newG + newB) / 3;
            newR = Math.min(255, Math.max(0, avg + (newR - avg) * contrastFactor));
            newG = Math.min(255, Math.max(0, avg + (newG - avg) * contrastFactor));
            newB = Math.min(255, Math.max(0, avg + (newB - avg) * contrastFactor));
        }

        // Calculate smooth blending weights for highlights and shadows
        // Only calculate these if either highlights or shadows are active
        if (highlightFactor !== 1 || shadowFactor !== 1) {
            const shadowWeight = Math.pow(Math.max(0, 1 - luminance * 2), 1.5); // 1 → 0 as luminance goes from 0 → 0.5
            const highlightWeight = Math.pow(Math.max(0, (luminance - 0.5) * 2), 1.5); // 0 → 1 as luminance goes from 0.5 → 1

            // Calculate adjustment factors
            const blendFactor = 1 + (shadowWeight * (shadowFactor - 1)) + (highlightWeight * (highlightFactor - 1));

            // Apply the blended adjustment
            newR = Math.min(255, Math.max(0, newR * blendFactor));
            newG = Math.min(255, Math.max(0, newG * blendFactor));
            newB = Math.min(255, Math.max(0, newB * blendFactor));
        }

        // Update the pixel data
        data[i] = newR;
        data[i + 1] = newG;
        data[i + 2] = newB;
    }
}

// Helper function to create filter toggle listener
function createFilterToggleListener(filterId, filterState, drawCanvas) {
    const toggleElement = document.getElementById(`${filterId}FilterToggle`);
    if (toggleElement) {
        toggleElement.checked = filterState.active;
        toggleElement.addEventListener('change', (e) => {
            filterState.active = e.target.checked;
            filterCache.needsUpdate = true;
            drawCanvas();
        });
    }
    return toggleElement;
}

// Helper function to create filter reset listener
function createFilterResetListener(filterId, filterState, sliderConfigs, drawCanvas) {
    const resetElement = document.getElementById(`${filterId}FilterReset`);
    if (resetElement) {
        resetElement.addEventListener('click', () => {
            // Reset all values in the filter state
            Object.keys(filterState).forEach(key => {
                if (key !== 'active') {
                    filterState[key] = 0;
                }
            });
            
            // Update UI for all sliders
            sliderConfigs.forEach(({ id }) => {
                const slider = document.getElementById(id);
                const valueDisplay = document.getElementById(`${id}Value`);
                if (slider && valueDisplay) {
                    slider.value = 0;
                    valueDisplay.textContent = '0';
                }
            });
            
            filterCache.needsUpdate = true;
            drawCanvas();
        });
    }
    return resetElement;
}

// Helper function to create filter slider listeners
function createFilterSliderListeners(filterId, filterState, sliderConfigs, drawCanvas) {
    const toggle = document.getElementById(`${filterId}FilterToggle`);
    
    // Create a debounced draw function
    const debouncedDraw = debounce(() => {
        filterCache.needsUpdate = true;
        requestAnimationFrame(drawCanvas);
    }, 16); // Debounce to match 60fps
    
    sliderConfigs.forEach(({ id, min, max, step }) => {
        const slider = document.getElementById(id);
        const valueDisplay = document.getElementById(`${id}Value`);

        if (slider && valueDisplay) {
            // Set initial values
            slider.value = filterState[id];
            valueDisplay.textContent = filterState[id];

            // Handle realtime preview with input event (when dragging)
            slider.addEventListener('input', (e) => {
                // Update the visual display immediately for better UX
                valueDisplay.textContent = e.target.value;
                
                // Auto-activate the filter if it's inactive and a slider is moved
                if (!filterState.active && toggle) {
                    filterState.active = true;
                    toggle.checked = true;
                }
                
                // Update the filter state
                filterState[id] = parseInt(e.target.value);
                
                // Use the debounced draw function for smoother performance
                debouncedDraw();
            });
            
            // Also handle change event (when released) to ensure final state is captured
            slider.addEventListener('change', (e) => {
                filterState[id] = parseInt(e.target.value);
                filterCache.needsUpdate = true;
                drawCanvas();
            });
        }
    });
}

// Initialize filter listeners
export function initFilterListeners(drawCanvas) {
    // Light filter configuration
    const lightSliderConfigs = [
        { id: 'exposure', min: -100, max: 100, step: 1 },
        { id: 'contrast', min: -100, max: 100, step: 1 },
        { id: 'highlights', min: -100, max: 100, step: 1 },
        { id: 'shadows', min: -100, max: 100, step: 1 }
    ];

    // Initialize light filter controls
    createFilterToggleListener('light', filters.light, drawCanvas);
    createFilterResetListener('light', filters.light, lightSliderConfigs, drawCanvas);
    createFilterSliderListeners('light', filters.light, lightSliderConfigs, drawCanvas);
} 