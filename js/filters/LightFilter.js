import { BaseFilter } from './BaseFilter.js';

export class LightFilter extends BaseFilter {
    constructor() {
        super('light');
        this.properties = {
            exposure: 0,
            contrast: 0,
            highlights: 0,
            shadows: 0
        };
        // Pre-allocate LUTs for better performance
        this._contrastLUT = new Uint8Array(256);
        this._lastContrastValue = null;
    }

    _updateContrastLUT(contrastValue) {
        if (this._lastContrastValue === contrastValue) return;
        this._lastContrastValue = contrastValue;

        // If contrast is 0, create identity LUT
        if (contrastValue === 0) {
            for (let i = 0; i < 256; i++) {
                this._contrastLUT[i] = i;
            }
            return;
        }

        const center = 128;
        const factor = contrastValue > 0 
            ? 1 + (contrastValue / 50) // Range: 1 to 3 for 0 to 100
            : 1 / (1 + Math.abs(contrastValue) / 50); // Range: 1 to 0.33 for 0 to -100

        // Calculate LUT in one pass
        for (let i = 0; i < 256; i++) {
            const centered = i - center;
            const adjusted = centered * factor;
            this._contrastLUT[i] = Math.min(255, Math.max(0, adjusted + center));
        }
    }

    _process(imageData) {
        const data = imageData.data;
        const len = data.length;
        
        // Quick check to avoid processing when no adjustments are needed
        if (this.properties.exposure === 0 && this.properties.contrast === 0 && 
            this.properties.highlights === 0 && this.properties.shadows === 0) {
            return imageData;
        }
        
        // Pre-calculate factors
        const exposureFactor = 1 + (this.properties.exposure * 0.01);
        const contrastValue = this.properties.contrast;
        const shadowFactor = 1 + (this.properties.shadows * 0.01);
        const highlightFactor = 1 + (this.properties.highlights * 0.01);
        
        // Update contrast LUT if needed
        if (contrastValue !== 0) {
            this._updateContrastLUT(contrastValue);
        }
        
        // Use optimized version if only exposure is active
        if (contrastValue === 0 && highlightFactor === 1 && shadowFactor === 1) {
            // Fast path for exposure-only adjustment
            for (let i = 0; i < len; i += 4) {
                data[i] = (data[i] * exposureFactor + 0.5) | 0;
                data[i + 1] = (data[i + 1] * exposureFactor + 0.5) | 0;
                data[i + 2] = (data[i + 2] * exposureFactor + 0.5) | 0;
            }
            return imageData;
        }
        
        // Full processing path with optimized integer math
        for (let i = 0; i < len; i += 4) {
            // Apply exposure first
            let r = (data[i] * exposureFactor + 0.5) | 0;
            let g = (data[i + 1] * exposureFactor + 0.5) | 0;
            let b = (data[i + 2] * exposureFactor + 0.5) | 0;
            
            // Apply contrast using LUT
            if (contrastValue !== 0) {
                r = this._contrastLUT[r];
                g = this._contrastLUT[g];
                b = this._contrastLUT[b];
            }
            
            // Apply highlights/shadows if needed
            if (highlightFactor !== 1 || shadowFactor !== 1) {
                const luminance = (r * 0.299 + g * 0.587 + b * 0.114) * (1/255);
                const shadowWeight = Math.pow(Math.max(0, 1 - luminance * 2), 1.5);
                const highlightWeight = Math.pow(Math.max(0, (luminance - 0.5) * 2), 1.5);
                const blendFactor = 1 + (shadowWeight * (shadowFactor - 1)) + (highlightWeight * (highlightFactor - 1));
                
                r = (r * blendFactor + 0.5) | 0;
                g = (g * blendFactor + 0.5) | 0;
                b = (b * blendFactor + 0.5) | 0;
            }
            
            // Update pixel data with bounds checking
            data[i] = r < 0 ? 0 : r > 255 ? 255 : r;
            data[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
            data[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
        }
        
        return imageData;
    }
} 