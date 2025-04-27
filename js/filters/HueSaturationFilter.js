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
    }

    _process(imageData) {
        const data = imageData.data;
        const len = data.length;
        
        // Quick check to avoid processing when no adjustments are needed
        if (this.properties.saturation === 0 && this.properties.temperature === 0) {
            return imageData;
        }
        
        // Performance optimization: Pre-calculate adjustments
        const satFactor = 1 + (this.properties.saturation * 0.01);
        const tempValue = this.properties.temperature;
        
        // Fast path for temperature-only adjustments
        if (this.properties.saturation === 0 && tempValue !== 0) {
            this._applyTemperatureAdjustment(data, len, tempValue);
            return imageData;
        }
        
        // Fast path for saturation-only adjustments
        if (this.properties.saturation !== 0 && tempValue === 0) {
            this._applySaturationFast(data, len, satFactor);
            return imageData;
        }
        
        // Combined adjustments path
        for (let i = 0; i < len; i += 4) {
            if (data[i + 3] === 0) continue;
            
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Apply saturation first
            const gray = (r * 0.299 + g * 0.587 + b * 0.114 + 0.5) | 0;
            let newR = (gray + (r - gray) * satFactor + 0.5) | 0;
            let newG = (gray + (g - gray) * satFactor + 0.5) | 0;
            let newB = (gray + (b - gray) * satFactor + 0.5) | 0;
            
            // Then apply temperature
            const luminance = (newR * 0.299 + newG * 0.587 + newB * 0.114) * (1/255);
            const tempStrength = Math.min(1, Math.abs(tempValue) * 0.00833); // 1/120
            
            if (tempValue > 0) {
                // Warm
                const highlightInfluence = luminance * luminance * tempStrength;
                const blend = 0.25 * highlightInfluence;
                const invBlend = 1 - blend;
                
                newR = (newR * invBlend + 255 * this._warmColors[0] * blend + 0.5) | 0;
                newG = (newG * invBlend + 255 * this._warmColors[1] * blend + 0.5) | 0;
                newB = (newB * invBlend + 255 * this._warmColors[2] * blend + 0.5) | 0;
                
                if (luminance > 0.5) {
                    const brightBoost = 1 + (0.1 * highlightInfluence);
                    newR = (newR * brightBoost + 0.5) | 0;
                    newG = (newG * brightBoost + 0.5) | 0;
                    newB = (newB * brightBoost + 0.5) | 0;
                }
            } else if (tempValue < 0) {
                // Cool
                const shadowInfluence = (1 - luminance) * tempStrength;
                const blend = 0.25 * shadowInfluence;
                const invBlend = 1 - blend;
                
                newR = (newR * invBlend + 255 * this._coolColors[0] * blend + 0.5) | 0;
                newG = (newG * invBlend + 255 * this._coolColors[1] * blend + 0.5) | 0;
                newB = (newB * invBlend + 255 * this._coolColors[2] * blend + 0.5) | 0;
                
                if (luminance < 0.5) {
                    const shadowDarken = 1 - (0.05 * shadowInfluence);
                    newR = (newR * shadowDarken + 0.5) | 0;
                    newG = (newG * shadowDarken + 0.5) | 0;
                    newB = (newB * shadowDarken + 0.5) | 0;
                }
            }
            
            // Update pixel data with bounds checking
            data[i] = newR < 0 ? 0 : newR > 255 ? 255 : newR;
            data[i + 1] = newG < 0 ? 0 : newG > 255 ? 255 : newG;
            data[i + 2] = newB < 0 ? 0 : newB > 255 ? 255 : newB;
        }
        
        return imageData;
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

    _applyTemperatureAdjustment(data, len, tempValue) {
        const isWarm = tempValue > 0;
        const tempStrength = Math.min(1, Math.abs(tempValue) * 0.00833); // 1/120
        
        for (let i = 0; i < len; i += 4) {
            if (data[i + 3] === 0) continue;
            
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Fast luminance approximation
            const luminance = (r * 0.299 + g * 0.587 + b * 0.114) * (1/255);
            
            if (isWarm) {
                const highlightInfluence = luminance * luminance * tempStrength;
                const blend = 0.25 * highlightInfluence;
                const invBlend = 1 - blend;
                
                let newR = (r * invBlend + 255 * this._warmColors[0] * blend + 0.5) | 0;
                let newG = (g * invBlend + 255 * this._warmColors[1] * blend + 0.5) | 0;
                let newB = (b * invBlend + 255 * this._warmColors[2] * blend + 0.5) | 0;
                
                if (luminance > 0.5) {
                    const brightBoost = 1 + (0.1 * highlightInfluence);
                    newR = (newR * brightBoost + 0.5) | 0;
                    newG = (newG * brightBoost + 0.5) | 0;
                    newB = (newB * brightBoost + 0.5) | 0;
                }
                
                data[i] = newR < 0 ? 0 : newR > 255 ? 255 : newR;
                data[i + 1] = newG < 0 ? 0 : newG > 255 ? 255 : newG;
                data[i + 2] = newB < 0 ? 0 : newB > 255 ? 255 : newB;
            } else {
                const shadowInfluence = (1 - luminance) * tempStrength;
                const blend = 0.25 * shadowInfluence;
                const invBlend = 1 - blend;
                
                let newR = (r * invBlend + 255 * this._coolColors[0] * blend + 0.5) | 0;
                let newG = (g * invBlend + 255 * this._coolColors[1] * blend + 0.5) | 0;
                let newB = (b * invBlend + 255 * this._coolColors[2] * blend + 0.5) | 0;
                
                if (luminance < 0.5) {
                    const shadowDarken = 1 - (0.05 * shadowInfluence);
                    newR = (newR * shadowDarken + 0.5) | 0;
                    newG = (newG * shadowDarken + 0.5) | 0;
                    newB = (newB * shadowDarken + 0.5) | 0;
                }
                
                data[i] = newR < 0 ? 0 : newR > 255 ? 255 : newR;
                data[i + 1] = newG < 0 ? 0 : newG > 255 ? 255 : newG;
                data[i + 2] = newB < 0 ? 0 : newB > 255 ? 255 : newB;
            }
        }
    }
} 