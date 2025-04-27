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
        
        // Pre-calculate all factors
        const exposureFactor = 1 + (this.properties.exposure * 0.01);
        const contrastValue = this.properties.contrast;
        const shadowFactor = 1 + (this.properties.shadows * 0.01);
        const highlightFactor = 1 + (this.properties.highlights * 0.01);
        
        // Convert to fixed-point
        const expFactor = (exposureFactor * 256) | 0;
        const shadowFactorFixed = (shadowFactor * 256) | 0;
        const highlightFactorFixed = (highlightFactor * 256) | 0;
        
        // Update contrast LUT if needed
        if (contrastValue !== 0) {
            this._updateContrastLUT(contrastValue);
        }
        
        // Fast path for exposure/contrast only adjustments
        if (this.properties.shadows === 0 && this.properties.highlights === 0) {
            // Process 8 pixels at a time for better memory access patterns
            const alignedLength = len - (len % 32);
            let i = 0;
            
            if (contrastValue === 0) {
                // Ultra-fast path: exposure only
                for (; i < alignedLength; i += 32) {
                    // Load 8 pixels at once into local variables
                    let r0 = data[i], g0 = data[i + 1], b0 = data[i + 2];
                    let r1 = data[i + 4], g1 = data[i + 5], b1 = data[i + 6];
                    let r2 = data[i + 8], g2 = data[i + 9], b2 = data[i + 10];
                    let r3 = data[i + 12], g3 = data[i + 13], b3 = data[i + 14];
                    let r4 = data[i + 16], g4 = data[i + 17], b4 = data[i + 18];
                    let r5 = data[i + 20], g5 = data[i + 21], b5 = data[i + 22];
                    let r6 = data[i + 24], g6 = data[i + 25], b6 = data[i + 26];
                    let r7 = data[i + 28], g7 = data[i + 29], b7 = data[i + 30];
                    
                    // Process all channels using fixed-point arithmetic
                    r0 = Math.min(255, (r0 * expFactor) >> 8);
                    g0 = Math.min(255, (g0 * expFactor) >> 8);
                    b0 = Math.min(255, (b0 * expFactor) >> 8);
                    r1 = Math.min(255, (r1 * expFactor) >> 8);
                    g1 = Math.min(255, (g1 * expFactor) >> 8);
                    b1 = Math.min(255, (b1 * expFactor) >> 8);
                    r2 = Math.min(255, (r2 * expFactor) >> 8);
                    g2 = Math.min(255, (g2 * expFactor) >> 8);
                    b2 = Math.min(255, (b2 * expFactor) >> 8);
                    r3 = Math.min(255, (r3 * expFactor) >> 8);
                    g3 = Math.min(255, (g3 * expFactor) >> 8);
                    b3 = Math.min(255, (b3 * expFactor) >> 8);
                    r4 = Math.min(255, (r4 * expFactor) >> 8);
                    g4 = Math.min(255, (g4 * expFactor) >> 8);
                    b4 = Math.min(255, (b4 * expFactor) >> 8);
                    r5 = Math.min(255, (r5 * expFactor) >> 8);
                    g5 = Math.min(255, (g5 * expFactor) >> 8);
                    b5 = Math.min(255, (b5 * expFactor) >> 8);
                    r6 = Math.min(255, (r6 * expFactor) >> 8);
                    g6 = Math.min(255, (g6 * expFactor) >> 8);
                    b6 = Math.min(255, (b6 * expFactor) >> 8);
                    r7 = Math.min(255, (r7 * expFactor) >> 8);
                    g7 = Math.min(255, (g7 * expFactor) >> 8);
                    b7 = Math.min(255, (b7 * expFactor) >> 8);
                    
                    // Write back all results at once
                    data[i] = r0; data[i + 1] = g0; data[i + 2] = b0;
                    data[i + 4] = r1; data[i + 5] = g1; data[i + 6] = b1;
                    data[i + 8] = r2; data[i + 9] = g2; data[i + 10] = b2;
                    data[i + 12] = r3; data[i + 13] = g3; data[i + 14] = b3;
                    data[i + 16] = r4; data[i + 17] = g4; data[i + 18] = b4;
                    data[i + 20] = r5; data[i + 21] = g5; data[i + 22] = b5;
                    data[i + 24] = r6; data[i + 25] = g6; data[i + 26] = b6;
                    data[i + 28] = r7; data[i + 29] = g7; data[i + 30] = b7;
                }
            } else {
                // Fast path: exposure + contrast
                const lut = this._contrastLUT;
                for (; i < alignedLength; i += 32) {
                    // Load and process 8 pixels at once
                    let r0 = data[i], g0 = data[i + 1], b0 = data[i + 2];
                    let r1 = data[i + 4], g1 = data[i + 5], b1 = data[i + 6];
                    let r2 = data[i + 8], g2 = data[i + 9], b2 = data[i + 10];
                    let r3 = data[i + 12], g3 = data[i + 13], b3 = data[i + 14];
                    let r4 = data[i + 16], g4 = data[i + 17], b4 = data[i + 18];
                    let r5 = data[i + 20], g5 = data[i + 21], b5 = data[i + 22];
                    let r6 = data[i + 24], g6 = data[i + 25], b6 = data[i + 26];
                    let r7 = data[i + 28], g7 = data[i + 29], b7 = data[i + 30];
                    
                    // Apply exposure using fixed-point arithmetic
                    r0 = Math.min(255, (r0 * expFactor) >> 8);
                    g0 = Math.min(255, (g0 * expFactor) >> 8);
                    b0 = Math.min(255, (b0 * expFactor) >> 8);
                    r1 = Math.min(255, (r1 * expFactor) >> 8);
                    g1 = Math.min(255, (g1 * expFactor) >> 8);
                    b1 = Math.min(255, (b1 * expFactor) >> 8);
                    r2 = Math.min(255, (r2 * expFactor) >> 8);
                    g2 = Math.min(255, (g2 * expFactor) >> 8);
                    b2 = Math.min(255, (b2 * expFactor) >> 8);
                    r3 = Math.min(255, (r3 * expFactor) >> 8);
                    g3 = Math.min(255, (g3 * expFactor) >> 8);
                    b3 = Math.min(255, (b3 * expFactor) >> 8);
                    r4 = Math.min(255, (r4 * expFactor) >> 8);
                    g4 = Math.min(255, (g4 * expFactor) >> 8);
                    b4 = Math.min(255, (b4 * expFactor) >> 8);
                    r5 = Math.min(255, (r5 * expFactor) >> 8);
                    g5 = Math.min(255, (g5 * expFactor) >> 8);
                    b5 = Math.min(255, (b5 * expFactor) >> 8);
                    r6 = Math.min(255, (r6 * expFactor) >> 8);
                    g6 = Math.min(255, (g6 * expFactor) >> 8);
                    b6 = Math.min(255, (b6 * expFactor) >> 8);
                    r7 = Math.min(255, (r7 * expFactor) >> 8);
                    g7 = Math.min(255, (g7 * expFactor) >> 8);
                    b7 = Math.min(255, (b7 * expFactor) >> 8);
                    
                    // Apply contrast using LUT
                    data[i] = lut[r0]; data[i + 1] = lut[g0]; data[i + 2] = lut[b0];
                    data[i + 4] = lut[r1]; data[i + 5] = lut[g1]; data[i + 6] = lut[b1];
                    data[i + 8] = lut[r2]; data[i + 9] = lut[g2]; data[i + 10] = lut[b2];
                    data[i + 12] = lut[r3]; data[i + 13] = lut[g3]; data[i + 14] = lut[b3];
                    data[i + 16] = lut[r4]; data[i + 17] = lut[g4]; data[i + 18] = lut[b4];
                    data[i + 20] = lut[r5]; data[i + 21] = lut[g5]; data[i + 22] = lut[b5];
                    data[i + 24] = lut[r6]; data[i + 25] = lut[g6]; data[i + 26] = lut[b6];
                    data[i + 28] = lut[r7]; data[i + 29] = lut[g7]; data[i + 30] = lut[b7];
                }
            }
            
            // Handle remaining pixels
            for (; i < len; i += 4) {
                if (data[i + 3] === 0) continue;
                const r = Math.min(255, (data[i] * expFactor) >> 8);
                const g = Math.min(255, (data[i + 1] * expFactor) >> 8);
                const b = Math.min(255, (data[i + 2] * expFactor) >> 8);
                data[i] = contrastValue !== 0 ? this._contrastLUT[r] : r;
                data[i + 1] = contrastValue !== 0 ? this._contrastLUT[g] : g;
                data[i + 2] = contrastValue !== 0 ? this._contrastLUT[b] : b;
            }
            
            return imageData;
        }
        
        // Full processing path with shadows/highlights
        const alignedLength = len - (len % 32);
        let i = 0;
        
        for (; i < alignedLength; i += 32) {
            for (let j = 0; j < 32; j += 4) {
                // Skip fully transparent pixels
                if (data[i + j + 3] === 0) continue;
                
                // Process only RGB channels
                const [r, g, b] = this._processPixelFixed(
                    data[i + j], data[i + j + 1], data[i + j + 2],
                    expFactor, shadowFactorFixed, highlightFactorFixed
                );
                
                // Update only RGB channels, preserve alpha
                data[i + j] = r;
                data[i + j + 1] = g;
                data[i + j + 2] = b;
            }
        }
        
        // Handle remaining pixels
        for (; i < len; i += 4) {
            // Skip fully transparent pixels
            if (data[i + 3] === 0) continue;
            
            // Process only RGB channels
            const [r, g, b] = this._processPixelFixed(
                data[i], data[i + 1], data[i + 2],
                expFactor, shadowFactorFixed, highlightFactorFixed
            );
            
            // Update only RGB channels, preserve alpha
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
        }
        
        return imageData;
    }
    
    _processPixelFixed(r, g, b, expFactor, shadowFactorFixed, highlightFactorFixed) {
        // Apply exposure using fixed-point arithmetic
        r = (r * expFactor) >> 8;
        g = (g * expFactor) >> 8;
        b = (b * expFactor) >> 8;
        
        // Apply contrast using LUT if needed
        if (this.properties.contrast !== 0) {
            r = this._contrastLUT[Math.min(255, r)];
            g = this._contrastLUT[Math.min(255, g)];
            b = this._contrastLUT[Math.min(255, b)];
        }
        
        // Apply shadows/highlights using fixed-point arithmetic
        const luminance = ((r * 77 + g * 150 + b * 29) >> 8) / 255; // Faster luminance calculation
        const shadowWeight = Math.pow(Math.max(0, 1 - luminance * 2), 1.5);
        const highlightWeight = Math.pow(Math.max(0, (luminance - 0.5) * 2), 1.5);
        
        const blendFactor = ((256 + 
            (shadowWeight * (shadowFactorFixed - 256)) + 
            (highlightWeight * (highlightFactorFixed - 256))) | 0) / 256;
        
        r = (r * blendFactor + 0.5) | 0;
        g = (g * blendFactor + 0.5) | 0;
        b = (b * blendFactor + 0.5) | 0;
        
        // Bounds checking with proper alpha preservation
        return [
            r < 0 ? 0 : r > 255 ? 255 : r,
            g < 0 ? 0 : g > 255 ? 255 : g,
            b < 0 ? 0 : b > 255 ? 255 : b
        ];
    }
} 