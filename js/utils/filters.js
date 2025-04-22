// Filter state object
export const filters = {
    light: {
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
    lastLightValues: { exposure: 0, contrast: 0, highlights: 0, shadows: 0 },
    lastFilters: null
};

// Helper function to check if filters have changed
function haveFiltersChanged() {
    if (!filterCache.lastFilters) return true;
    
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
    
    // Apply light adjustments
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

        // Calculate smooth blending weights for highlights and shadows
        const shadowWeight = Math.pow(Math.max(0, 1 - luminance * 2), 1.5); // 1 → 0 as luminance goes from 0 → 0.5
        const highlightWeight = Math.pow(Math.max(0, (luminance - 0.5) * 2), 1.5); // 0 → 1 as luminance goes from 0.5 → 1

        // Calculate adjustment factors
        const shadowFactor = 1 + (lightValues.shadows / 100);
        const highlightFactor = 1 + (lightValues.highlights / 100);

        // Apply smooth blending
        const blendFactor = 1 + (shadowWeight * (shadowFactor - 1)) + (highlightWeight * (highlightFactor - 1));

        // Apply the blended adjustment
        newR = Math.min(255, Math.max(0, newR * blendFactor));
        newG = Math.min(255, Math.max(0, newG * blendFactor));
        newB = Math.min(255, Math.max(0, newB * blendFactor));

        // Update the pixel data
        data[i] = newR;
        data[i + 1] = newG;
        data[i + 2] = newB;
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
} 