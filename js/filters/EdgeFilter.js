import { BaseFilter } from './BaseFilter.js';

export class EdgeFilter extends BaseFilter {
    constructor() {
        super('edge');
        this.properties = {
            threshold: 50,  // Edge detection threshold (0-100)
            intensity: 50,  // Edge intensity (0-100)
            opacity: 100,   // Opacity of the edge effect (0-100)
            multiplyMode: false  // Whether to use multiply mode
        };
    }

    _process(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        
        // Convert to grayscale first
        const grayscale = new Uint8ClampedArray(width * height);
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            grayscale[i / 4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        }

        // Sobel kernels
        const sobelX = [
            -1, 0, 1,
            -2, 0, 2,
            -1, 0, 1
        ];
        
        const sobelY = [
            -1, -2, -1,
            0, 0, 0,
            1, 2, 1
        ];

        // Apply Sobel operator
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0;
                let gy = 0;
                
                // Convolve with Sobel kernels
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = (y + ky) * width + (x + kx);
                        const kernelIdx = (ky + 1) * 3 + (kx + 1);
                        gx += grayscale[idx] * sobelX[kernelIdx];
                        gy += grayscale[idx] * sobelY[kernelIdx];
                    }
                }
                
                // Calculate gradient magnitude
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                
                // Apply threshold and intensity
                const threshold = this.properties.threshold * 2.55; // Convert 0-100 to 0-255
                const intensity = this.properties.intensity / 100; // Convert 0-100 to 0-1
                
                // Calculate edge value
                let edgeValue;
                if (this.properties.multiplyMode) {
                    // For multiply mode, we want darker edges (lower values)
                    edgeValue = magnitude > threshold ? 
                        Math.max(0, 255 - magnitude * intensity) : 255;
                } else {
                    // For normal mode, we want white background with black edges
                    edgeValue = magnitude > threshold ? 
                        255 - Math.min(255, magnitude * intensity) : 255;
                }
                
                // Set output pixel
                const outputIdx = (y * width + x) * 4;
                if (this.properties.multiplyMode) {
                    // In multiply mode, multiply the edge value with the filtered image
                    const factor = edgeValue / 255;
                    data[outputIdx] = Math.round(data[outputIdx] * factor);     // R
                    data[outputIdx + 1] = Math.round(data[outputIdx + 1] * factor); // G
                    data[outputIdx + 2] = Math.round(data[outputIdx + 2] * factor); // B
                } else {
                    // In normal mode, just set the edge value
                    data[outputIdx] = edgeValue;     // R
                    data[outputIdx + 1] = edgeValue; // G
                    data[outputIdx + 2] = edgeValue; // B
                }
                data[outputIdx + 3] = 255;       // A
            }
        }

        return imageData;
    }

    reset() {
        this.active = false;
        this.properties.threshold = 50;
        this.properties.intensity = 50;
        this.properties.opacity = 100;
        this.properties.multiplyMode = false;
    }
} 