import { LightFilter } from '../filters/LightFilter.js';

// Web Worker for filter processing
self.onmessage = function(e) {
    const { imageData, filterStates, width, height } = e.data;
    
    // Create a new ImageData object to avoid modifying the original
    const processedImageData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        width,
        height
    );
    
    // Create filter instances based on the filter states
    const lightFilter = new LightFilter();
    if (filterStates.light) {
        lightFilter.active = filterStates.light.active;
        lightFilter.properties = { ...filterStates.light.properties };
        processedImageData = lightFilter.apply(processedImageData);
    }
    
    // Send processed data back to main thread
    self.postMessage(processedImageData, [processedImageData.data.buffer]);
};

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
        const shadowWeight = Math.pow(Math.max(0, 1 - luminance * 2), 1.5);
        const highlightWeight = Math.pow(Math.max(0, (luminance - 0.5) * 2), 1.5);

        // Calculate adjustment factors
        const shadowFactor = 1 + (lightValues.shadows / 100);
        const highlightFactor = 1 + (lightValues.highlights / 100);

        // Apply smooth blending
        const blendFactor = 1 + (shadowWeight * (shadowFactor - 1)) + (highlightWeight * (highlightFactor - 1));
        
        // Apply final adjustments
        data[i] = Math.min(255, Math.max(0, newR * blendFactor));
        data[i + 1] = Math.min(255, Math.max(0, newG * blendFactor));
        data[i + 2] = Math.min(255, Math.max(0, newB * blendFactor));
    }
} 