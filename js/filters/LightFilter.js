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
    }

    _process(imageData) {
        const data = imageData.data;
        
        // Quick check to avoid processing when no adjustments are needed
        if (this.properties.exposure === 0 && this.properties.contrast === 0 && 
            this.properties.highlights === 0 && this.properties.shadows === 0) {
            return imageData;
        }
        
        // Pre-calculate factors to avoid repeated calculations in the loop
        const exposureFactor = 1 + (this.properties.exposure / 100);
        
        // Remap contrast from slider range (-100 to +100) to effective range (-60 to +65)
        const remappedContrast = this.properties.contrast > 0 
            ? (this.properties.contrast / 100) * 65  // Positive values map to 0 to +65
            : (this.properties.contrast / 100) * 60; // Negative values map to 0 to -60
        
        const contrastValue = remappedContrast;
        const shadowFactor = 1 + (this.properties.shadows / 100);
        const highlightFactor = 1 + (this.properties.highlights / 100);
        
        // Use optimized version if only exposure is active
        if (this.properties.contrast === 0 && this.properties.highlights === 0 && this.properties.shadows === 0) {
            // Fast path for exposure-only adjustment
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, Math.max(0, data[i] * exposureFactor));
                data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * exposureFactor));
                data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * exposureFactor));
            }
            return imageData;
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
        
        return imageData;
    }
} 