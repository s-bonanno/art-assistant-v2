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

        const { width, height } = imageData;
        
        // Create a temporary canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const ctx = tempCanvas.getContext('2d');
        
        // Put the image data on the canvas
        ctx.putImageData(imageData, 0, 0);
        
        // Apply blur filter
        ctx.filter = `blur(${this.properties.blurRadius / 5}px)`;
        ctx.drawImage(tempCanvas, 0, 0);
        
        // Get the filtered image data
        const filteredData = ctx.getImageData(0, 0, width, height);
        
        // Copy the filtered data back to the input imageData
        imageData.data.set(filteredData.data);
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