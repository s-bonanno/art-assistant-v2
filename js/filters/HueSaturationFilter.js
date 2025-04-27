import { BaseFilter } from './BaseFilter.js';

export class HueSaturationFilter extends BaseFilter {
    constructor() {
        super('hueSaturation');
        this.properties = {
            hue: 0,
            saturation: 0,
            temperature: 0
        };
    }

    _process(imageData) {
        const data = imageData.data;
        
        // Quick check to avoid processing when no adjustments are needed
        if (this.properties.hue === 0 && this.properties.saturation === 0 && this.properties.temperature === 0) {
            return imageData;
        }
        
        // Performance optimization: Pre-calculate adjustments
        const hueShift = this.properties.hue;
        const satFactor = 1 + (this.properties.saturation / 100);
        const tempValue = this.properties.temperature;
        
        // Fast path for temperature-only adjustments
        if (this.properties.hue === 0 && this.properties.saturation === 0 && this.properties.temperature !== 0) {
            this._applyTemperatureAdjustment(data, tempValue);
            return imageData;
        }
        
        // Fast path for hue-only adjustments
        if (this.properties.hue !== 0 && this.properties.saturation === 0 && this.properties.temperature === 0) {
            this._applyHueAdjustment(data, hueShift);
            return imageData;
        }
        
        // Fast path for saturation-only adjustments
        if (this.properties.hue === 0 && this.properties.saturation !== 0 && this.properties.temperature === 0) {
            this._applySaturationAdjustment(data, satFactor);
            return imageData;
        }
        
        // Combined adjustments path
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;
            
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Convert to HSL
            let [h, s, l] = this._rgbToHsl(r, g, b);
            
            // Apply hue shift if needed
            if (hueShift !== 0) {
                h = (h + hueShift + 360) % 360;
            }
            
            // Apply saturation adjustment if needed
            if (this.properties.saturation !== 0) {
                s = Math.max(0, Math.min(100, s * satFactor));
            }
            
            // Convert back to RGB
            const [newR, newG, newB] = this._hslToRgb(h, s, l);
            
            data[i] = newR;
            data[i + 1] = newG;
            data[i + 2] = newB;
        }
        
        return imageData;
    }

    _applyTemperatureAdjustment(data, tempValue) {
        const isWarm = tempValue > 0;
        const tempStrength = Math.min(1, Math.abs(tempValue) / 120);
        
        // Warm and cool reference colors (pre-divided by 255 for faster blending)
        const warmColors = [1.0, 0.784, 0.47]; // Normalized warm color
        const coolColors = [0.51, 0.686, 0.94]; // Normalized cool color
        
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;
            
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Fast luminance approximation
            const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
            
            let newR, newG, newB;
            
            if (isWarm) {
                const highlightInfluence = luminance * luminance * tempStrength;
                const blend = 0.25 * highlightInfluence;
                
                newR = r * (1 - blend) + 255 * warmColors[0] * blend;
                newG = g * (1 - blend) + 255 * warmColors[1] * blend;
                newB = b * (1 - blend) + 255 * warmColors[2] * blend;
                
                if (luminance > 0.5) {
                    const brightBoost = 1 + (0.1 * highlightInfluence);
                    newR *= brightBoost;
                    newG *= brightBoost;
                    newB *= brightBoost;
                }
            } else {
                const shadowInfluence = (1 - luminance) * tempStrength;
                const blend = 0.25 * shadowInfluence;
                
                newR = r * (1 - blend) + 255 * coolColors[0] * blend;
                newG = g * (1 - blend) + 255 * coolColors[1] * blend;
                newB = b * (1 - blend) + 255 * coolColors[2] * blend;
                
                if (luminance < 0.5) {
                    const shadowDarken = 1 - (0.05 * shadowInfluence);
                    newR *= shadowDarken;
                    newG *= shadowDarken;
                    newB *= shadowDarken;
                }
            }
            
            data[i] = Math.min(255, Math.max(0, newR));
            data[i + 1] = Math.min(255, Math.max(0, newG));
            data[i + 2] = Math.min(255, Math.max(0, newB));
        }
    }

    _applyHueAdjustment(data, hueShift) {
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;
            
            let [h, s, l] = this._rgbToHsl(data[i], data[i + 1], data[i + 2]);
            h = (h + hueShift + 360) % 360;
            
            let [newR, newG, newB] = this._hslToRgb(h, s, l);
            
            data[i] = newR;
            data[i + 1] = newG;
            data[i + 2] = newB;
        }
    }

    _applySaturationAdjustment(data, satFactor) {
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;
            
            let [h, s, l] = this._rgbToHsl(data[i], data[i + 1], data[i + 2]);
            s = Math.max(0, Math.min(100, s * satFactor));
            
            let [newR, newG, newB] = this._hslToRgb(h, s, l);
            
            data[i] = newR;
            data[i + 1] = newG;
            data[i + 2] = newB;
        }
    }

    _rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            
            h /= 6;
        }
        
        return [h * 360, s * 100, l * 100];
    }

    _hslToRgb(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;
        
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
} 