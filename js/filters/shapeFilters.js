/**
 * Shape Filters Module
 * Contains filters that transform images into simplified shape-based representations
 */

import { BaseFilter } from './BaseFilter.js';

export class ShapeFilter extends BaseFilter {
    constructor() {
        super('shape');
        this.properties = {
            filterType: 'blockIn', // 'blockIn', 'colorBlocks', or 'invertMask'
            blockBandDepth: 0, // Default to 0 (off)
            totalBands: 6, // Total number of bands to divide image into
            shapeOpacity: 100
        };
        this.originalImageData = null;
    }

    _process(imageData) {
        // Always store a fresh copy of the original image data
        this.originalImageData = new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );

        // Create a temporary canvas to apply the filter
        const canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        // Put the image data onto the temporary canvas
        ctx.putImageData(imageData, 0, 0);
        
        let modifiedImageData;
        
        // If blockBandDepth is 0, effectively turn off the filter by returning original image
        if (this.properties.blockBandDepth === 0) {
            return imageData;
        }
        
        // Apply the appropriate filter
        if (this.properties.filterType === 'blockIn') {
            // Apply the Block in filter (grayscale version)
            modifiedImageData = applyShapeToneFilter(
                imageData, 
                this.properties.blockBandDepth,
                this.properties.totalBands
            );
        } else if (this.properties.filterType === 'colorBlocks') {
            // Apply the Mask filter
            modifiedImageData = applyMaskFilter(
                imageData, 
                this.properties.blockBandDepth,
                this.properties.totalBands
            );
        } else if (this.properties.filterType === 'invertMask') {
            // Apply the Invert Mask filter
            modifiedImageData = applyInvertMaskFilter(
                imageData, 
                this.properties.blockBandDepth,
                this.properties.totalBands
            );
        }
        
        // Convert opacity from 0-100 range to 0.0-1.0 range for blending
        const opacity = this.properties.shapeOpacity / 100;
        
        // Blend with original image based on opacity
        blendWithOriginal(modifiedImageData, this.originalImageData, opacity);
        
        // Copy the blended data back to the original imageData
        imageData.data.set(modifiedImageData.data);
        
        return imageData;
    }

    reset() {
        this.active = false;
        this.properties.filterType = 'blockIn';
        this.properties.blockBandDepth = 1;
        this.properties.totalBands = 6;
        this.properties.shapeOpacity = 100;
        this.originalImageData = null;
    }
}

/**
 * Applies the Block In filter to divide an image into fixed tonal bands
 * @param {ImageData} imageData - The source image data
 * @param {number} bandDepth - How many bands to reveal (default: 1)
 * @param {number} totalBands - Total number of bands to divide image into (default: 6)
 * @returns {ImageData} The filtered image data
 */
function applyShapeToneFilter(imageData, bandDepth = 1, totalBands = 6) {
  const output = new Uint8ClampedArray(imageData.data.length);
  const bandSize = 256 / totalBands;

  // Store the band for each pixel
  const bandMap = [];

  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    const avg = 0.2126 * r + 0.7152 * g + 0.0722 * b; // perceived luminance
    const band = Math.floor(avg / bandSize);

    bandMap.push(band);
  }

  // For slider value 0, filter is off (handled in _process)
  // For values 1+, show that many levels
  const effectiveBandDepth = bandDepth;
  
  // Determine which bands to show based on current depth
  // Show from dark to light (lowest bands first)
  const maxBand = Math.min(totalBands - 1, effectiveBandDepth - 1);

  for (let i = 0, p = 0; i < bandMap.length; i++, p += 4) {
    const band = bandMap[i];

    if (band <= maxBand) {
      // Map band to grayscale value (darker = lower band)
      const tone = Math.floor((band + 0.5) * bandSize);
      output[p] = output[p + 1] = output[p + 2] = tone;
      output[p + 3] = imageData.data[p + 3]; // Preserve original alpha
    } else {
      // Use white for bands outside the current depth
      output[p] = output[p + 1] = output[p + 2] = 255;
      output[p + 3] = imageData.data[p + 3]; // Preserve original alpha
    }
  }

  return new ImageData(output, imageData.width, imageData.height);
}

/**
 * Applies the Mask filter to show original colors only in visible bands
 * @param {ImageData} imageData - The source image data
 * @param {number} bandDepth - How many bands to reveal (default: 1)
 * @param {number} totalBands - Total number of bands to divide image into (default: 6)
 * @returns {ImageData} The filtered image data
 */
function applyMaskFilter(imageData, bandDepth = 1, totalBands = 6) {
    const output = new Uint8ClampedArray(imageData.data.length);
    const bandSize = 256 / totalBands;
    const width = imageData.width;
    const height = imageData.height;
    
    // For slider value 0, filter is off (handled in _process)
    // For values 1+, show that many levels
    const effectiveBandDepth = bandDepth;
    
    // Determine which bands to show based on current depth
    // Show from dark to light (lowest bands first)
    const maxBand = Math.min(totalBands - 1, effectiveBandDepth - 1);
    
    // First pass: Determine the tonal band for each pixel
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            const alpha = imageData.data[i + 3];
            
            // Skip fully transparent pixels
            if (alpha === 0) {
                output[i] = output[i + 1] = output[i + 2] = output[i + 3] = 0;
                continue;
            }
            
            // Calculate luminance and determine band
            const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            const band = Math.floor(luminance / bandSize);
            
            if (band <= maxBand) {
                // Show original colors for visible bands
                output[i] = r;
                output[i + 1] = g;
                output[i + 2] = b;
                output[i + 3] = alpha;
            } else {
                // Hide colors for masked bands
                output[i] = output[i + 1] = output[i + 2] = 255;
                output[i + 3] = alpha;
            }
        }
    }
    
    return new ImageData(output, width, height);
}

/**
 * Applies the Invert Mask filter to show original colors only in hidden bands
 * @param {ImageData} imageData - The source image data
 * @param {number} bandDepth - How many bands to reveal (default: 1)
 * @param {number} totalBands - Total number of bands to divide image into (default: 6)
 * @returns {ImageData} The filtered image data
 */
function applyInvertMaskFilter(imageData, bandDepth = 1, totalBands = 6) {
    const output = new Uint8ClampedArray(imageData.data.length);
    const bandSize = 256 / totalBands;
    const width = imageData.width;
    const height = imageData.height;
    
    // For slider value 0, filter is off (handled in _process)
    // For values 1+, show that many levels
    const effectiveBandDepth = bandDepth;
    
    // Determine which bands to show based on current depth
    // Show from dark to light (lowest bands first)
    const maxBand = Math.min(totalBands - 1, effectiveBandDepth - 1);
    
    // First pass: Determine the tonal band for each pixel
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            const alpha = imageData.data[i + 3];
            
            // Skip fully transparent pixels
            if (alpha === 0) {
                output[i] = output[i + 1] = output[i + 2] = output[i + 3] = 0;
                continue;
            }
            
            // Calculate luminance and determine band
            const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            const band = Math.floor(luminance / bandSize);
            
            if (band <= maxBand) {
                // Show black for visible bands (inverted from regular mask)
                output[i] = output[i + 1] = output[i + 2] = 0;
                output[i + 3] = alpha;
            } else {
                // Show original colors for hidden bands (inverted from regular mask)
                output[i] = r;
                output[i + 1] = g;
                output[i + 2] = b;
                output[i + 3] = alpha;
            }
        }
    }
    
    return new ImageData(output, width, height);
}

/**
 * Blends the filtered image with the original image based on opacity
 * @param {ImageData} filteredData - The filtered image data
 * @param {ImageData} originalData - The original image data
 * @param {number} opacity - The opacity value (0.0 to 1.0)
 */
function blendWithOriginal(filteredData, originalData, opacity) {
    const filtered = filteredData.data;
    const original = originalData.data;
    
    for (let i = 0; i < filtered.length; i += 4) {
        // Skip fully transparent pixels
        if (filtered[i + 3] === 0) continue;
        
        // Blend RGB channels
        filtered[i] = Math.round(filtered[i] * opacity + original[i] * (1 - opacity));     // R
        filtered[i + 1] = Math.round(filtered[i + 1] * opacity + original[i + 1] * (1 - opacity)); // G
        filtered[i + 2] = Math.round(filtered[i + 2] * opacity + original[i + 2] * (1 - opacity)); // B
        // Alpha channel (filtered[i + 3]) is preserved
    }
}

/**
 * Calculates threshold values for each band
 * @param {number} bands - Number of bands to split the image into
 * @returns {number[]} Array of threshold values
 */
function calculateThresholds(bands) {
    const thresholds = [];
    const step = 255 / bands;
    
    for (let i = 1; i < bands; i++) {
        thresholds.push(Math.round(step * i));
    }
    
    return thresholds;
}

/**
 * Finds the appropriate band value for a given brightness
 * @param {number} brightness - The pixel brightness (0-255)
 * @param {number[]} thresholds - Array of threshold values
 * @param {number} bands - Number of bands (for value calculation)
 * @returns {number} The band value (0-255)
 */
function findBandValue(brightness, thresholds, bands) {
    // If no thresholds, return black or white based on brightness
    if (thresholds.length === 0) {
        return brightness > 127 ? 255 : 0;
    }
    
    // Find the appropriate band
    for (let i = 0; i < thresholds.length; i++) {
        if (brightness < thresholds[i]) {
            return Math.round((255 * i) / bands);
        }
    }
    
    // If brightness is above all thresholds, return white
    return 255;
}

/**
 * Threshold Mapping Explanation:
 * 
 * The Notan filter works by:
 * 1. Dividing the 0-255 brightness range into equal intervals based on the number of bands
 * 2. For each interval, assigning a flat greyscale value
 * 3. Mapping each pixel's brightness to the nearest band value
 * 
 * Example with 3 bands:
 * - Band 1: 0-85 → Black (0)
 * - Band 2: 86-170 → Mid-grey (127)
 * - Band 3: 171-255 → White (255)
 * 
 * The thresholds array contains the upper bounds of each band (excluding the last band),
 * making it easy to determine which band a pixel belongs to.
 */ 