import { BaseFilter } from './BaseFilter.js';

export class HueSaturationFilter extends BaseFilter {
    constructor() {
        super('hueSaturation');
        this.properties = {
            saturation: 0,
            temperature: 0
        };
        
        // Pre-calculate common values
        this._warmColors = [1.0, 0.784, 0.47];
        this._coolColors = [0.51, 0.686, 0.94];
        
        // Pre-calculate temperature adjustment curves
        this._tempCurve = new Float32Array(256);
        this._lastTempValue = null;
    }

    // Update temperature adjustment curve
    _updateTemperatureCurve(tempValue) {
        if (this._lastTempValue === tempValue) return;
        this._lastTempValue = tempValue;

        // Normalize temperature to [-1, 1] range
        const normalizedTemp = Math.max(-1, Math.min(1, tempValue / 100));
        
        // Create smooth curve for brightness-based adjustments
        for (let i = 0; i < 256; i++) {
            const x = i / 255;
            // Smooth curve that peaks at midtones and falls off at extremes
            const curve = 1 - Math.pow(2 * x - 1, 2);
            this._tempCurve[i] = curve;
        }
    }

    _adjustTemperature(r, g, b, tempValue) {
        // Get brightness-based adjustment factor
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        const curve = this._tempCurve[Math.floor(brightness * 255)];
        
        // Normalize temperature to [-1, 1] range
        const normalizedTemp = Math.max(-1, Math.min(1, tempValue / 100));
        
        // Calculate channel multipliers based on temperature
        // These values are carefully chosen to maintain perceptual balance
        let rMult, gMult, bMult;
        
        if (normalizedTemp > 0) {
            // Warming: boost red and green, reduce blue
            const strength = normalizedTemp * curve * 0.3; // Reduced strength for subtlety
            rMult = 1 + strength * 0.5;     // Stronger red boost
            gMult = 1 + strength * 0.3;     // Moderate green boost
            bMult = 1 - strength * 0.2;     // Slight blue reduction
        } else {
            // Cooling: boost blue, reduce red and green
            const strength = -normalizedTemp * curve * 0.3;
            rMult = 1 - strength * 0.3;     // Moderate red reduction
            gMult = 1 - strength * 0.1;     // Slight green reduction
            bMult = 1 + strength * 0.4;     // Stronger blue boost
        }
        
        // Apply multipliers with perceptual corrections
        let newR = (r * rMult + 0.5) | 0;
        let newG = (g * gMult + 0.5) | 0;
        let newB = (b * bMult + 0.5) | 0;
        
        // Preserve original luminance to maintain contrast
        const origLuminance = (r * 0.299 + g * 0.587 + b * 0.114);
        const newLuminance = (newR * 0.299 + newG * 0.587 + newB * 0.114);
        
        if (newLuminance > 0) {
            const lumRatio = origLuminance / newLuminance;
            newR = (newR * lumRatio + 0.5) | 0;
            newG = (newG * lumRatio + 0.5) | 0;
            newB = (newB * lumRatio + 0.5) | 0;
        }
        
        // Return bounds-checked values
        return [
            newR < 0 ? 0 : newR > 255 ? 255 : newR,
            newG < 0 ? 0 : newG > 255 ? 255 : newG,
            newB < 0 ? 0 : newB > 255 ? 255 : newB
        ];
    }

    _process(imageData) {
        const data = imageData.data;
        const len = data.length;
        
        // Quick check to avoid processing when no adjustments are needed
        if (this.properties.saturation === 0 && this.properties.temperature === 0) {
            return imageData;
        }
        
        // Fast path for saturation-only adjustments
        if (this.properties.temperature === 0) {
            const satFactor = (1 + (this.properties.saturation * 0.01)) * 256 | 0; // Fixed-point
            
            // Process 8 pixels at a time
            const alignedLength = len - (len % 32);
            let i = 0;
            
            for (; i < alignedLength; i += 32) {
                // Load 8 pixels at once
                let r0 = data[i], g0 = data[i + 1], b0 = data[i + 2];
                let r1 = data[i + 4], g1 = data[i + 5], b1 = data[i + 6];
                let r2 = data[i + 8], g2 = data[i + 9], b2 = data[i + 10];
                let r3 = data[i + 12], g3 = data[i + 13], b3 = data[i + 14];
                let r4 = data[i + 16], g4 = data[i + 17], b4 = data[i + 18];
                let r5 = data[i + 20], g5 = data[i + 21], b5 = data[i + 22];
                let r6 = data[i + 24], g6 = data[i + 25], b6 = data[i + 26];
                let r7 = data[i + 28], g7 = data[i + 29], b7 = data[i + 30];
                
                // Calculate grayscale using integer math (R*77 + G*150 + B*29) >> 8
                const gray0 = (r0 * 77 + g0 * 150 + b0 * 29) >> 8;
                const gray1 = (r1 * 77 + g1 * 150 + b1 * 29) >> 8;
                const gray2 = (r2 * 77 + g2 * 150 + b2 * 29) >> 8;
                const gray3 = (r3 * 77 + g3 * 150 + b3 * 29) >> 8;
                const gray4 = (r4 * 77 + g4 * 150 + b4 * 29) >> 8;
                const gray5 = (r5 * 77 + g5 * 150 + b5 * 29) >> 8;
                const gray6 = (r6 * 77 + g6 * 150 + b6 * 29) >> 8;
                const gray7 = (r7 * 77 + g7 * 150 + b7 * 29) >> 8;
                
                // Apply saturation using fixed-point arithmetic
                r0 = Math.min(255, Math.max(0, gray0 + (((r0 - gray0) * satFactor) >> 8)));
                g0 = Math.min(255, Math.max(0, gray0 + (((g0 - gray0) * satFactor) >> 8)));
                b0 = Math.min(255, Math.max(0, gray0 + (((b0 - gray0) * satFactor) >> 8)));
                
                r1 = Math.min(255, Math.max(0, gray1 + (((r1 - gray1) * satFactor) >> 8)));
                g1 = Math.min(255, Math.max(0, gray1 + (((g1 - gray1) * satFactor) >> 8)));
                b1 = Math.min(255, Math.max(0, gray1 + (((b1 - gray1) * satFactor) >> 8)));
                
                r2 = Math.min(255, Math.max(0, gray2 + (((r2 - gray2) * satFactor) >> 8)));
                g2 = Math.min(255, Math.max(0, gray2 + (((g2 - gray2) * satFactor) >> 8)));
                b2 = Math.min(255, Math.max(0, gray2 + (((b2 - gray2) * satFactor) >> 8)));
                
                r3 = Math.min(255, Math.max(0, gray3 + (((r3 - gray3) * satFactor) >> 8)));
                g3 = Math.min(255, Math.max(0, gray3 + (((g3 - gray3) * satFactor) >> 8)));
                b3 = Math.min(255, Math.max(0, gray3 + (((b3 - gray3) * satFactor) >> 8)));
                
                r4 = Math.min(255, Math.max(0, gray4 + (((r4 - gray4) * satFactor) >> 8)));
                g4 = Math.min(255, Math.max(0, gray4 + (((g4 - gray4) * satFactor) >> 8)));
                b4 = Math.min(255, Math.max(0, gray4 + (((b4 - gray4) * satFactor) >> 8)));
                
                r5 = Math.min(255, Math.max(0, gray5 + (((r5 - gray5) * satFactor) >> 8)));
                g5 = Math.min(255, Math.max(0, gray5 + (((g5 - gray5) * satFactor) >> 8)));
                b5 = Math.min(255, Math.max(0, gray5 + (((b5 - gray5) * satFactor) >> 8)));
                
                r6 = Math.min(255, Math.max(0, gray6 + (((r6 - gray6) * satFactor) >> 8)));
                g6 = Math.min(255, Math.max(0, gray6 + (((g6 - gray6) * satFactor) >> 8)));
                b6 = Math.min(255, Math.max(0, gray6 + (((b6 - gray6) * satFactor) >> 8)));
                
                r7 = Math.min(255, Math.max(0, gray7 + (((r7 - gray7) * satFactor) >> 8)));
                g7 = Math.min(255, Math.max(0, gray7 + (((g7 - gray7) * satFactor) >> 8)));
                b7 = Math.min(255, Math.max(0, gray7 + (((b7 - gray7) * satFactor) >> 8)));
                
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
            
            // Handle remaining pixels
            for (; i < len; i += 4) {
                if (data[i + 3] === 0) continue;
                
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                const gray = (r * 77 + g * 150 + b * 29) >> 8;
                data[i] = Math.min(255, Math.max(0, gray + (((r - gray) * satFactor) >> 8)));
                data[i + 1] = Math.min(255, Math.max(0, gray + (((g - gray) * satFactor) >> 8)));
                data[i + 2] = Math.min(255, Math.max(0, gray + (((b - gray) * satFactor) >> 8)));
            }
            
            return imageData;
        }
        
        // Update temperature curve if needed
        if (this.properties.temperature !== 0) {
            this._updateTemperatureCurve(this.properties.temperature);
        }
        
        // Pre-calculate fixed-point factors
        const satFactor = (1 + (this.properties.saturation * 0.01)) * 256 | 0;
        const tempValue = this.properties.temperature;
        
        // Process 8 pixels at a time for full adjustments
        const alignedLength = len - (len % 32);
        let i = 0;
        
        for (; i < alignedLength; i += 32) {
            for (let j = 0; j < 32; j += 4) {
                if (data[i + j + 3] === 0) continue;
                const [r, g, b] = this._processPixelFixed(
                    data[i + j], data[i + j + 1], data[i + j + 2],
                    satFactor, tempValue
                );
                data[i + j] = r;
                data[i + j + 1] = g;
                data[i + j + 2] = b;
            }
        }
        
        // Handle remaining pixels
        for (; i < len; i += 4) {
            if (data[i + 3] === 0) continue;
            const [r, g, b] = this._processPixelFixed(
                data[i], data[i + 1], data[i + 2],
                satFactor, tempValue
            );
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
        }
        
        return imageData;
    }
    
    _processPixelFixed(r, g, b, satFactor, tempValue) {
        // Apply saturation first using fixed-point arithmetic
        if (satFactor !== 256) { // 256 = 1.0 in fixed-point
            const gray = (r * 77 + g * 150 + b * 29) >> 8;
            r = Math.min(255, Math.max(0, gray + (((r - gray) * satFactor) >> 8)));
            g = Math.min(255, Math.max(0, gray + (((g - gray) * satFactor) >> 8)));
            b = Math.min(255, Math.max(0, gray + (((b - gray) * satFactor) >> 8)));
        }
        
        // Apply temperature adjustment if needed
        if (tempValue !== 0) {
            const brightness = (r * 77 + g * 150 + b * 29) >> 8;
            const curve = this._tempCurve[brightness];
            
            // Normalize temperature to [-1, 1] range
            const normalizedTemp = Math.max(-1, Math.min(1, tempValue / 100));
            
            // Calculate channel multipliers using fixed-point arithmetic
            let rMult, gMult, bMult;
            const strength = Math.abs(normalizedTemp) * curve * 0.3 * 256 | 0;
            
            if (normalizedTemp > 0) {
                // Warming
                rMult = 256 + ((strength * 128) >> 8);    // 0.5 boost
                gMult = 256 + ((strength * 77) >> 8);     // 0.3 boost
                bMult = 256 - ((strength * 51) >> 8);     // 0.2 reduction
            } else {
                // Cooling
                rMult = 256 - ((strength * 77) >> 8);     // 0.3 reduction
                gMult = 256 - ((strength * 26) >> 8);     // 0.1 reduction
                bMult = 256 + ((strength * 102) >> 8);    // 0.4 boost
            }
            
            // Apply multipliers with fixed-point arithmetic
            r = (r * rMult) >> 8;
            g = (g * gMult) >> 8;
            b = (b * bMult) >> 8;
            
            // Preserve original luminance
            const origLum = (r * 77 + g * 150 + b * 29) >> 8;
            const newLum = (r * 77 + g * 150 + b * 29) >> 8;
            
            if (newLum > 0) {
                const lumRatio = (origLum << 8) / newLum;
                r = (r * lumRatio) >> 8;
                g = (g * lumRatio) >> 8;
                b = (b * lumRatio) >> 8;
            }
        }
        
        // Bounds checking
        return [
            r < 0 ? 0 : r > 255 ? 255 : r,
            g < 0 ? 0 : g > 255 ? 255 : g,
            b < 0 ? 0 : b > 255 ? 255 : b
        ];
    }

    _applySaturationFast(data, len, satFactor) {
        for (let i = 0; i < len; i += 4) {
            if (data[i + 3] === 0) continue;
            
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Fast grayscale calculation
            const gray = (r * 0.299 + g * 0.587 + b * 0.114 + 0.5) | 0;
            
            // Linear interpolation between color and gray
            data[i] = (gray + (r - gray) * satFactor + 0.5) | 0;
            data[i + 1] = (gray + (g - gray) * satFactor + 0.5) | 0;
            data[i + 2] = (gray + (b - gray) * satFactor + 0.5) | 0;
        }
    }
} 