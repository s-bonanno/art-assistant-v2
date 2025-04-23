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
        
        for (let i = 0; i < data.length; i += 4) {
            // Store original values
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Calculate luminance for highlights/shadows
            const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

            // Apply exposure (convert from percentage to factor)
            const exposureFactor = 1 + (this.properties.exposure / 100);
            let newR = Math.min(255, Math.max(0, r * exposureFactor));
            let newG = Math.min(255, Math.max(0, g * exposureFactor));
            let newB = Math.min(255, Math.max(0, b * exposureFactor));

            // Apply contrast (convert from percentage to factor)
            const contrastFactor = 1 + (this.properties.contrast / 100);
            const avg = (newR + newG + newB) / 3;
            newR = Math.min(255, Math.max(0, avg + (newR - avg) * contrastFactor));
            newG = Math.min(255, Math.max(0, avg + (newG - avg) * contrastFactor));
            newB = Math.min(255, Math.max(0, avg + (newB - avg) * contrastFactor));

            // Calculate smooth blending weights for highlights and shadows
            const shadowWeight = Math.pow(Math.max(0, 1 - luminance * 2), 1.5);
            const highlightWeight = Math.pow(Math.max(0, (luminance - 0.5) * 2), 1.5);

            // Calculate adjustment factors
            const shadowFactor = 1 + (this.properties.shadows / 100);
            const highlightFactor = 1 + (this.properties.highlights / 100);

            // Apply smooth blending
            const blendFactor = 1 + (shadowWeight * (shadowFactor - 1)) + (highlightWeight * (highlightFactor - 1));

            // Apply the blended adjustment
            data[i] = Math.min(255, Math.max(0, newR * blendFactor));
            data[i + 1] = Math.min(255, Math.max(0, newG * blendFactor));
            data[i + 2] = Math.min(255, Math.max(0, newB * blendFactor));
        }

        return imageData;
    }
} 