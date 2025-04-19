// Filter state object
export const filters = {
    posterise: { enabled: false, levels: 4 },
    edges: { enabled: false, strength: 2, opacity: 1 },
    lightSplit: { enabled: false, shadow: 30, highlight: 70 }
};

// Filter cache
export const filterCache = {
    image: null,
    width: 0,
    height: 0,
    needsUpdate: true
};

// Apply filters to canvas
export function applyFilters(ctx, canvas, x, y, width, height) {
    if (!canvas) return;

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

// Apply posterise filter
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

// Apply edge detection filter
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

// Apply light split filter
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

// Initialize filter event listeners
export function initFilterListeners(drawCanvas) {
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