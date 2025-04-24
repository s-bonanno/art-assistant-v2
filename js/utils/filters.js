// Filter state object
export const filters = {
    light: {
        active: false,
        exposure: 0,
        contrast: 0,
        highlights: 0,
        shadows: 0
    },
    hueSaturation: {
        active: false,
        hue: 0,         // -180 to +180
        saturation: 0,  // -100 to +100
        temperature: 0  // -100 to +100
    }
};

// Filter cache
export const filterCache = {
    image: null,
    width: 0,
    height: 0,
    needsUpdate: true,
    lastLightValues: { active: false, exposure: 0, contrast: 0, highlights: 0, shadows: 0 },
    lastHueSatValues: { active: false, hue: 0, saturation: 0, temperature: 0 },
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
    
    // Check hue/saturation values
    if (filters.hueSaturation) {
        // If filter isn't active, no need to check values
        if (!filters.hueSaturation.active && !filterCache.lastHueSatValues.active) return false;
        
        // If active state changed, filters have changed
        if (filters.hueSaturation.active !== filterCache.lastHueSatValues.active) return true;
        
        // Only check values if filter is active
        if (filters.hueSaturation.active) {
            if (filters.hueSaturation.hue !== filterCache.lastHueSatValues.hue) return true;
            if (filters.hueSaturation.saturation !== filterCache.lastHueSatValues.saturation) return true;
            if (filters.hueSaturation.temperature !== filterCache.lastHueSatValues.temperature) return true;
        }
    }
    
    return false;
}

// Helper function to check if any filters are actually active and have non-zero values
export function areFiltersActive() {
    return (
        (filters.light && filters.light.active && (
            filters.light.exposure !== 0 || 
            filters.light.contrast !== 0 || 
            filters.light.highlights !== 0 || 
            filters.light.shadows !== 0
        )) ||
        (filters.hueSaturation && filters.hueSaturation.active && (
            filters.hueSaturation.hue !== 0 || 
            filters.hueSaturation.saturation !== 0 || 
            filters.hueSaturation.temperature !== 0
        ))
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
    
    // Apply hue/saturation adjustments if active
    if (filters.hueSaturation && filters.hueSaturation.active) {
        applyHueSaturationAdjustments(data, filters.hueSaturation);
        // Update last hue/sat values
        Object.assign(filterCache.lastHueSatValues, filters.hueSaturation);
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
    
    // Remap contrast from slider range (-100 to +100) to effective range (-60 to +65)
    const remappedContrast = lightValues.contrast > 0 
        ? (lightValues.contrast / 100) * 65  // Positive values map to 0 to +65
        : (lightValues.contrast / 100) * 60; // Negative values map to 0 to -60
    
    const contrastValue = remappedContrast;
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

        // Apply enhanced contrast with smoother steps
        if (contrastValue !== 0) {
            // Use a progressive factor that increases more gradually
            // For small values (0-20), apply minimal contrast
            // For medium values (20-60), apply moderate contrast
            // For high values (60-100), apply stronger contrast
            
            let factor;
            const absContrast = Math.abs(contrastValue);
            
            if (absContrast <= 20) {
                // Very subtle contrast changes for small values
                factor = 1 + (contrastValue / 200); // Range: 0.9 to 1.1 for -20 to 20
            } else if (absContrast <= 60) {
                // Medium contrast changes
                const baseChange = contrastValue > 0 ? 0.1 : -0.1;
                const additionalChange = (contrastValue / 100) * 0.8; // More gradual increase
                factor = 1 + baseChange + additionalChange;
            } else {
                // Stronger contrast for high values
                factor = 1 + (contrastValue / 50); // Range: 0 to 3 for -100 to 100
            }
            
            // Apply contrast with 128 as midpoint
            newR = Math.min(255, Math.max(0, 128 + (newR - 128) * factor));
            newG = Math.min(255, Math.max(0, 128 + (newG - 128) * factor));
            newB = Math.min(255, Math.max(0, 128 + (newB - 128) * factor));
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

// HSL/RGB conversion helpers - Highly optimized versions
function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    
    // Fast path for grayscale
    if (max === min) {
        return [0, 0, l * 100];
    }
    
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    let h;
    if (max === r) {
        h = (g - b) / d + (g < b ? 6 : 0);
    } else if (max === g) {
        h = (b - r) / d + 2;
    } else {
        h = (r - g) / d + 4;
    }
    
    h = (h / 6) * 360;
    return [h, s * 100, l * 100];
}

function hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    
    // Fast path for grayscale
    if (s === 0) {
        const v = Math.round(l * 255);
        return [v, v, v];
    }
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    // Optimize by avoiding function calls
    let tr = h + 1/3;
    let tg = h;
    let tb = h - 1/3;
    
    // Normalize hue components
    tr = tr < 0 ? tr + 1 : tr > 1 ? tr - 1 : tr;
    tg = tg < 0 ? tg + 1 : tg > 1 ? tg - 1 : tg;
    tb = tb < 0 ? tb + 1 : tb > 1 ? tb - 1 : tb;
    
    // Calculate RGB - optimized version with fewer branches
    let r, g, b;
    
    // Red
    r = tr < 1/6 ? p + (q - p) * 6 * tr :
        tr < 1/2 ? q :
        tr < 2/3 ? p + (q - p) * (2/3 - tr) * 6 : p;
        
    // Green
    g = tg < 1/6 ? p + (q - p) * 6 * tg :
        tg < 1/2 ? q :
        tg < 2/3 ? p + (q - p) * (2/3 - tg) * 6 : p;
        
    // Blue
    b = tb < 1/6 ? p + (q - p) * 6 * tb :
        tb < 1/2 ? q :
        tb < 2/3 ? p + (q - p) * (2/3 - tb) * 6 : p;
    
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Apply hue/saturation adjustments
function applyHueSaturationAdjustments(data, hueSatValues) {
    // Quick check to avoid processing when no adjustments are needed
    if (hueSatValues.hue === 0 && hueSatValues.saturation === 0 && hueSatValues.temperature === 0) {
        return;
    }
    
    // Performance optimization: Pre-calculate adjustments
    const hueShift = hueSatValues.hue;
    const satFactor = 1 + (hueSatValues.saturation / 100);
    const tempValue = hueSatValues.temperature;
    
    // Fast path for temperature-only adjustments - optimized for performance
    if (hueSatValues.hue === 0 && hueSatValues.saturation === 0 && hueSatValues.temperature !== 0) {
        // Pre-calculate constants for more efficient loop
        const isWarm = tempValue > 0;
        const tempStrength = Math.min(1, Math.abs(tempValue) / 120);
        
        // Warm and cool reference colors (pre-divided by 255 for faster blending)
        const warmColors = [1.0, 0.784, 0.47]; // Normalized warm color
        const coolColors = [0.51, 0.686, 0.94]; // Normalized cool color
        
        // Performance optimization: create tables for common operations
        const length = data.length;
        
        // Process pixels in blocks for better performance
        for (let i = 0; i < length; i += 4) {
            // Skip transparent pixels
            const alpha = data[i + 3];
            if (alpha === 0) continue;
            
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Fast luminance approximation (perceptual weights)
            // Faster than full HSL conversion when we only need luminance
            const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
            
            let newR, newG, newB;
            
            if (isWarm) {
                // WARM LIGHT - Optimized version
                // Highlights get warmer, shadows mostly preserved
                
                // Calculate highlight influence with fewer operations
                // Use power curve with fewer operations
                const highlightInfluence = luminance * luminance * tempStrength;
                
                // Direct RGB blending for warm light (faster than HSL conversion)
                const blend = 0.25 * highlightInfluence;
                
                // Simple RGB blending
                newR = r * (1 - blend) + 255 * warmColors[0] * blend;
                newG = g * (1 - blend) + 255 * warmColors[1] * blend;
                newB = b * (1 - blend) + 255 * warmColors[2] * blend;
                
                // Apply subtle contrast enhancement to warm areas for a sunlit effect
                if (luminance > 0.5) {
                    // Boost highlights slightly
                    const brightBoost = 1 + (0.1 * highlightInfluence);
                    newR *= brightBoost;
                    newG *= brightBoost;
                    newB *= brightBoost;
                }
            } else {
                // COOL LIGHT - Optimized version
                // Shadows get cooler, highlights mostly preserved
                
                // Calculate shadow influence with fewer operations
                const shadowInfluence = (1 - luminance) * tempStrength;
                
                // Direct RGB blending for cool light
                const blend = 0.25 * shadowInfluence;
                
                // Simple RGB blending
                newR = r * (1 - blend) + 255 * coolColors[0] * blend;
                newG = g * (1 - blend) + 255 * coolColors[1] * blend;
                newB = b * (1 - blend) + 255 * coolColors[2] * blend;
                
                // Apply subtle darkening to shadows for a cool light effect
                if (luminance < 0.5) {
                    // Darken shadows slightly
                    const shadowDarken = 1 - (0.05 * shadowInfluence);
                    newR *= shadowDarken;
                    newG *= shadowDarken;
                    newB *= shadowDarken;
                }
            }
            
            // Fast clamp and update
            data[i] = newR < 0 ? 0 : newR > 255 ? 255 : newR;
            data[i + 1] = newG < 0 ? 0 : newG > 255 ? 255 : newG;
            data[i + 2] = newB < 0 ? 0 : newB > 255 ? 255 : newB;
        }
        return;
    }
    
    // Fast path for hue-only adjustments
    if (hueSatValues.hue !== 0 && hueSatValues.saturation === 0 && hueSatValues.temperature === 0) {
        // Standard hue adjustment (relatively fast)
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;
            
            let [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
            h = (h + hueShift + 360) % 360;
            
            let [newR, newG, newB] = hslToRgb(h, s, l);
            
            data[i] = newR;
            data[i + 1] = newG;
            data[i + 2] = newB;
        }
        return;
    }
    
    // Fast path for saturation-only adjustments
    if (hueSatValues.hue === 0 && hueSatValues.saturation !== 0 && hueSatValues.temperature === 0) {
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;
            
            let [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
            s = Math.max(0, Math.min(100, s * satFactor));
            
            let [newR, newG, newB] = hslToRgb(h, s, l);
            
            data[i] = newR;
            data[i + 1] = newG;
            data[i + 2] = newB;
        }
        return;
    }
    
    // Combined adjustments path - optimized version
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Only do full HSL conversion once
        let [h, s, l] = rgbToHsl(r, g, b);
        let newR, newG, newB;
        
        // Apply hue shift if needed
        if (hueShift !== 0) {
            h = (h + hueShift + 360) % 360;
        }
        
        // Apply saturation adjustment if needed
        if (hueSatValues.saturation !== 0) {
            s = Math.max(0, Math.min(100, s * satFactor));
        }
        
        // Apply temperature adjustment if needed
        if (tempValue !== 0) {
            const isWarm = tempValue > 0;
            const tempStrength = Math.min(1, Math.abs(tempValue) / 120);
            const luminance = l / 100; // Already calculated in HSL conversion
            
            // Get RGB first for blending
            [newR, newG, newB] = hslToRgb(h, s, l);
            
            if (isWarm) {
                // Simplified warm light effect
                const highlightInfluence = luminance * luminance * tempStrength;
                const blend = 0.25 * highlightInfluence;
                
                // Warm light blending
                newR = newR * (1 - blend) + 255 * blend;
                newG = newG * (1 - blend) + 200 * blend;
                newB = newB * (1 - blend) + 120 * blend;
                
                // Boost highlights
                if (luminance > 0.5) {
                    const brightBoost = 1 + (0.1 * highlightInfluence);
                    newR *= brightBoost;
                    newG *= brightBoost;
                    newB *= brightBoost;
                }
            } else {
                // Simplified cool light effect
                const shadowInfluence = (1 - luminance) * tempStrength;
                const blend = 0.25 * shadowInfluence;
                
                // Cool light blending
                newR = newR * (1 - blend) + 130 * blend;
                newG = newG * (1 - blend) + 175 * blend;
                newB = newB * (1 - blend) + 240 * blend;
                
                // Darken shadows
                if (luminance < 0.5) {
                    const shadowDarken = 1 - (0.05 * shadowInfluence);
                    newR *= shadowDarken;
                    newG *= shadowDarken;
                    newB *= shadowDarken;
                }
            }
        } else {
            // No temperature adjustment, just convert back to RGB
            [newR, newG, newB] = hslToRgb(h, s, l);
        }
        
        // Update with fast clamping
        data[i] = newR < 0 ? 0 : newR > 255 ? 255 : newR;
        data[i + 1] = newG < 0 ? 0 : newG > 255 ? 255 : newG;
        data[i + 2] = newB < 0 ? 0 : newB > 255 ? 255 : newB;
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

    // Hue/Saturation filter configuration
    const hueSatSliderConfigs = [
        { id: 'hue', min: -180, max: 180, step: 1 },
        { id: 'saturation', min: -100, max: 100, step: 1 },
        { id: 'temperature', min: -100, max: 100, step: 1 }
    ];

    // Initialize light filter controls
    createFilterToggleListener('light', filters.light, drawCanvas);
    createFilterResetListener('light', filters.light, lightSliderConfigs, drawCanvas);
    createFilterSliderListeners('light', filters.light, lightSliderConfigs, drawCanvas);
    
    // Initialize hue/saturation filter controls
    createFilterToggleListener('hueSaturation', filters.hueSaturation, drawCanvas);
    createFilterResetListener('hueSaturation', filters.hueSaturation, hueSatSliderConfigs, drawCanvas);
    createFilterSliderListeners('hueSaturation', filters.hueSaturation, hueSatSliderConfigs, drawCanvas);
} 