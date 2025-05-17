import { BaseFilter } from './BaseFilter.js';

export class BlurFilter extends BaseFilter {
    constructor() {
        super('blur');
        this.properties = {
            blurRadius: 0  // Start with 0 blur radius
        };
    }

    // Update properties and trigger redraw
    updateProperties(newProperties) {
        Object.assign(this.properties, newProperties);
    }

    // Apply blur using canvas filter
    _process(imageData) {
        if (this.properties.blurRadius <= 0) return imageData;

        const { width, height, data } = imageData;
        const radius = Math.floor(this.properties.blurRadius / 5); // Scale down the radius for better performance
        
        if (radius <= 0) return imageData;

        // Create temporary arrays for horizontal and vertical passes
        const tempData = new Uint8ClampedArray(data);
        const result = new Uint8ClampedArray(data);

        // Box blur algorithm
        const boxSize = radius * 2 + 1;
        const boxArea = boxSize * boxSize;
        
        // Horizontal pass
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, a = 0;
                let count = 0;
                
                // Sample the box
                for (let i = -radius; i <= radius; i++) {
                    const sampleX = Math.min(Math.max(x + i, 0), width - 1);
                    const idx = (y * width + sampleX) * 4;
                    
                    r += data[idx];
                    g += data[idx + 1];
                    b += data[idx + 2];
                    a += data[idx + 3];
                    count++;
                }
                
                // Average the samples
                const idx = (y * width + x) * 4;
                tempData[idx] = r / count;
                tempData[idx + 1] = g / count;
                tempData[idx + 2] = b / count;
                tempData[idx + 3] = a / count;
            }
        }
        
        // Vertical pass
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                let r = 0, g = 0, b = 0, a = 0;
                let count = 0;
                
                // Sample the box
                for (let i = -radius; i <= radius; i++) {
                    const sampleY = Math.min(Math.max(y + i, 0), height - 1);
                    const idx = (sampleY * width + x) * 4;
                    
                    r += tempData[idx];
                    g += tempData[idx + 1];
                    b += tempData[idx + 2];
                    a += tempData[idx + 3];
                    count++;
                }
                
                // Average the samples
                const idx = (y * width + x) * 4;
                result[idx] = r / count;
                result[idx + 1] = g / count;
                result[idx + 2] = b / count;
                result[idx + 3] = a / count;
            }
        }
        
        // Copy the result back to the input imageData
        imageData.data.set(result);
        return imageData;
    }

    reset() {
        super.reset();  // Call parent reset to set active to false
        this.properties.blurRadius = 0;  // Reset to 0
    }

    // Override hasChanged to properly detect changes
    hasChanged() {
        return this.active && this.properties.blurRadius > 0;
    }
} 