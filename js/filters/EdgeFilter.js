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
        this.edgeData = null;  // Store the edge detection result
        this.originalImageData = null;  // Store the original image data
    }

    // Update properties and re-detect edges if needed
    updateProperties(newProperties) {
        const needsRedetect = 
            (newProperties.threshold !== undefined && newProperties.threshold !== this.properties.threshold) ||
            (newProperties.intensity !== undefined && newProperties.intensity !== this.properties.intensity);

        Object.assign(this.properties, newProperties);

        if (needsRedetect && this.originalImageData) {
            this._detectEdges();
        }
    }

    // Store the original image data
    setOriginalImage(imageData) {
        this.originalImageData = new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );
        this._detectEdges();
    }

    // Detect edges from the original image
    _detectEdges() {
        if (!this.originalImageData) return;

        const width = this.originalImageData.width;
        const height = this.originalImageData.height;
        const data = this.originalImageData.data;
        
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

        // Create edge data array
        this.edgeData = new Uint8ClampedArray(width * height * 4);

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
                const edgeValue = magnitude > threshold ? 
                    255 - Math.min(255, magnitude * intensity) : 255;
                
                // Store edge value in all channels
                const outputIdx = (y * width + x) * 4;
                this.edgeData[outputIdx] = edgeValue;     // R
                this.edgeData[outputIdx + 1] = edgeValue; // G
                this.edgeData[outputIdx + 2] = edgeValue; // B
                this.edgeData[outputIdx + 3] = 255;       // A
            }
        }
    }

    // Apply the stored edges to any image data
    apply(imageData) {
        if (!this.edgeData) return imageData;

        const data = imageData.data;
        const opacity = this.properties.opacity / 100;
        
        // Create a temporary array to store the result
        const result = new Uint8ClampedArray(data.length);
        
        for (let i = 0; i < data.length; i += 4) {
            if (this.properties.multiplyMode) {
                // In multiply mode, multiply the edge value with the image
                const factor = this.edgeData[i] / 255;
                result[i] = Math.round(data[i] * factor);
                result[i + 1] = Math.round(data[i + 1] * factor);
                result[i + 2] = Math.round(data[i + 2] * factor);
                result[i + 3] = data[i + 3]; // Keep original alpha
            } else {
                // In normal mode, blend the edge result with the image
                result[i] = Math.round(this.edgeData[i] * opacity + data[i] * (1 - opacity));
                result[i + 1] = Math.round(this.edgeData[i + 1] * opacity + data[i + 1] * (1 - opacity));
                result[i + 2] = Math.round(this.edgeData[i + 2] * opacity + data[i + 2] * (1 - opacity));
                result[i + 3] = data[i + 3]; // Keep original alpha
            }
        }
        
        // Copy the result back to the input imageData
        data.set(result);
        return imageData;
    }

    reset() {
        this.active = false;
        this.properties.threshold = 50;
        this.properties.intensity = 50;
        this.properties.opacity = 100;
        this.properties.multiplyMode = false;
        this.edgeData = null;
        this.originalImageData = null;
    }
} 