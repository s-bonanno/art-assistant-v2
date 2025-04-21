// Filter state object
export const filters = {
    light: {
        exposure: 0,
        contrast: 0,
        highlights: 0,
        shadows: 0
    },
    posterise: { enabled: false, levels: 4 },
    edges: { enabled: false, strength: 2, opacity: 1 },
    lightSplit: { enabled: false, shadow: 30, highlight: 70 }
};

// Filter cache
export const filterCache = {
    image: null,
    width: 0,
    height: 0,
    needsUpdate: true,
    lastLightValues: { exposure: 0, contrast: 0, highlights: 0, shadows: 0 },
    lastFilters: null
};

// Helper function to check if filters have changed
function haveFiltersChanged() {
    if (!filterCache.lastFilters) return true;
    
    // Check enabled filters
    if (filters.posterise?.enabled !== filterCache.lastFilters.posterise?.enabled) return true;
    if (filters.edges?.enabled !== filterCache.lastFilters.edges?.enabled) return true;
    if (filters.lightSplit?.enabled !== filterCache.lastFilters.lightSplit?.enabled) return true;
    
    // Check light values
    if (filters.light) {
        if (filters.light.exposure !== filterCache.lastLightValues.exposure) return true;
        if (filters.light.contrast !== filterCache.lastLightValues.contrast) return true;
        if (filters.light.highlights !== filterCache.lastLightValues.highlights) return true;
        if (filters.light.shadows !== filterCache.lastLightValues.shadows) return true;
    }
    
    return false;
}

// Apply filters to canvas
export function applyFilters(ctx, canvas, x, y, width, height) {
    // Check if we need to update the cache
    if (!filterCache.needsUpdate && 
        filterCache.width === width && 
        filterCache.height === height && 
        !haveFiltersChanged()) {
        return; // Use cached result
    }
    
    const imageData = ctx.getImageData(x, y, width, height);
    const data = imageData.data;
    
    // Apply filters in sequence
    if (filters.posterise && filters.posterise.enabled) {
        applyPosterise(data, filters.posterise.levels);
    }
    
    if (filters.edges && filters.edges.enabled) {
        applyEdgeDetection(data, width, height, filters.edges.strength, filters.edges.opacity);
    }
    
    if (filters.lightSplit && filters.lightSplit.enabled) {
        applyLightSplit(data, filters.lightSplit.shadow, filters.lightSplit.highlight);
    }
    
    // Apply light adjustments last
    if (filters.light) {
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

// Apply light adjustments
function applyLightAdjustments(data, lightValues) {
    for (let i = 0; i < data.length; i += 4) {
        // Store original values
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Calculate luminance for highlights/shadows
        const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

        // Apply exposure (convert from percentage to factor)
        const exposureFactor = 1 + (lightValues.exposure / 100);
        let newR = Math.min(255, Math.max(0, r * exposureFactor));
        let newG = Math.min(255, Math.max(0, g * exposureFactor));
        let newB = Math.min(255, Math.max(0, b * exposureFactor));

        // Apply contrast (convert from percentage to factor)
        const contrastFactor = 1 + (lightValues.contrast / 100);
        const avg = (newR + newG + newB) / 3;
        newR = Math.min(255, Math.max(0, avg + (newR - avg) * contrastFactor));
        newG = Math.min(255, Math.max(0, avg + (newG - avg) * contrastFactor));
        newB = Math.min(255, Math.max(0, avg + (newB - avg) * contrastFactor));

        // Apply highlights and shadows
        if (luminance > 0.5) {
            // Highlights
            const highlightFactor = 1 + (lightValues.highlights / 100);
            newR = Math.min(255, Math.max(0, newR * highlightFactor));
            newG = Math.min(255, Math.max(0, newG * highlightFactor));
            newB = Math.min(255, Math.max(0, newB * highlightFactor));
        } else {
            // Shadows
            const shadowFactor = 1 + (lightValues.shadows / 100);
            newR = Math.min(255, Math.max(0, newR * shadowFactor));
            newG = Math.min(255, Math.max(0, newG * shadowFactor));
            newB = Math.min(255, Math.max(0, newB * shadowFactor));
        }

        // Update the pixel data
        data[i] = newR;
        data[i + 1] = newG;
        data[i + 2] = newB;
    }
}

// Apply posterise filter
function applyPosterise(data, levels) {
    const step = 255 / (levels - 1);
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.round(data[i] / step) * step;     // R
        data[i + 1] = Math.round(data[i + 1] / step) * step; // G
        data[i + 2] = Math.round(data[i + 2] / step) * step; // B
    }
}

// Apply edge detection filter
function applyEdgeDetection(data, width, height, strength, opacity) {
    // Create a copy of the data for the original image
    const originalData = new Uint8ClampedArray(data);
    
    // Apply Sobel operator for edge detection
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            
            // Calculate gradients using Sobel operator
            let gx = 0, gy = 0;
            
            // Horizontal gradient
            gx += originalData[idx - width * 4 - 4] * -1;
            gx += originalData[idx - width * 4 + 4] * 1;
            gx += originalData[idx - 4] * -2;
            gx += originalData[idx + 4] * 2;
            gx += originalData[idx + width * 4 - 4] * -1;
            gx += originalData[idx + width * 4 + 4] * 1;
            
            // Vertical gradient
            gy += originalData[idx - width * 4 - 4] * -1;
            gy += originalData[idx - width * 4] * -2;
            gy += originalData[idx - width * 4 + 4] * -1;
            gy += originalData[idx + width * 4 - 4] * 1;
            gy += originalData[idx + width * 4] * 2;
            gy += originalData[idx + width * 4 + 4] * 1;
            
            // Calculate magnitude
            const magnitude = Math.sqrt(gx * gx + gy * gy) * (strength / 2);
            
            // Apply edge detection with opacity
            const edgeValue = Math.min(255, magnitude);
            data[idx] = data[idx + 1] = data[idx + 2] = edgeValue;
            data[idx + 3] = 255 * opacity;
        }
    }
}

// Apply light split filter
function applyLightSplit(data, shadowThreshold, highlightThreshold) {
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
}

// Initialize filter listeners
export function initFilterListeners(drawCanvas) {
    // Light section toggle
    const lightSectionToggle = document.getElementById('lightSectionToggle');
    const lightSectionContent = document.getElementById('lightSectionContent');
    
    if (lightSectionToggle && lightSectionContent) {
        let isLightSectionOpen = true;

        lightSectionToggle.addEventListener('click', () => {
            isLightSectionOpen = !isLightSectionOpen;
            lightSectionContent.style.display = isLightSectionOpen ? 'block' : 'none';
            const icon = lightSectionToggle.querySelector('i');
            if (icon) {
                icon.setAttribute('data-lucide', isLightSectionOpen ? 'chevron-down' : 'chevron-up');
                lucide.createIcons();
            }
        });
    }

    // Light adjustment sliders
    const lightSliders = ['exposure', 'contrast', 'highlights', 'shadows'];
    lightSliders.forEach(sliderId => {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(`${sliderId}Value`);

        if (slider && valueDisplay) {
            slider.addEventListener('input', (e) => {
                filters.light[sliderId] = parseInt(e.target.value);
                valueDisplay.textContent = e.target.value;
                filterCache.needsUpdate = true;
                drawCanvas();
            });
        }
    });

    // Posterise filter
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

    // Edge detection filter
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

    // Light split filter
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
} 