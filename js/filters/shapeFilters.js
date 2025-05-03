/**
 * Shape Filters Module
 * Contains filters that transform images into simplified shape-based representations
 */

import { BaseFilter } from './BaseFilter.js';

export class ShapeFilter extends BaseFilter {
    constructor() {
        super('shape');
        this.properties = {
            filterType: 'blockIn', // 'blockIn' or 'colorBlocks' 
            blockBandDepth: 1, // Default to 1 (off)
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
        
        // If blockBandDepth is 0 or 1, effectively turn off the filter by returning original image
        if (this.properties.blockBandDepth <= 1) {
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
            // Apply the Color Blocks filter
            modifiedImageData = applyColorBlocksFilter(
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

  // For slider value 0 or 1, filter is off (handled in _process)
  // For value 2, show 1 level (black and white)
  // For value 3+, show (value-1) levels
  const effectiveBandDepth = bandDepth - 1;
  
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
 * Applies the Color Blocks filter to divide an image into tonal bands while preserving local color variations
 * @param {ImageData} imageData - The source image data
 * @param {number} bandDepth - How many bands to reveal (default: 1)
 * @param {number} totalBands - Total number of bands to divide image into (default: 6)
 * @returns {ImageData} The filtered image data
 */
function applyColorBlocksFilter(imageData, bandDepth = 1, totalBands = 6) {
  const output = new Uint8ClampedArray(imageData.data.length);
  const bandSize = 256 / totalBands;
  const width = imageData.width;
  const height = imageData.height;
  
  // For slider value 0 or 1, filter is off (handled in _process)
  // For value 2, show 1 level
  // For value 3+, show (value-1) levels
  const effectiveBandDepth = bandDepth - 1;
  
  // Determine which bands to show based on current depth
  // Show from dark to light (lowest bands first)
  const maxBand = Math.min(totalBands - 1, effectiveBandDepth - 1);
  
  // Define region size for local color analysis
  // Smaller regions = more varied colors but less simplification
  // Larger regions = more simplification but less color variation
  const regionSize = Math.max(16, Math.floor(Math.min(width, height) / 20));
  
  // Create a map to store pixel information
  const pixelInfo = new Array(width * height);
  
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
        pixelInfo[y * width + x] = { band: -1 }; // Mark as transparent
        continue;
      }
      
      // Calculate luminance and determine band
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const band = Math.floor(luminance / bandSize);
      
      // Store pixel info
      pixelInfo[y * width + x] = {
        band,
        r,
        g,
        b,
        regionX: Math.floor(x / regionSize),
        regionY: Math.floor(y / regionSize)
      };
    }
  }
  
  // Second pass: Identify dominant colors in each region for each band
  const regionColors = new Map(); // Map of "regionX,regionY,band" -> [color1, color2, ...]
  
  // Process each pixel again to find color clusters in each region
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const info = pixelInfo[idx];
      
      // Skip transparent or out-of-range band pixels
      if (info.band === -1 || info.band > maxBand) continue;
      
      // Create a key for this region and band
      const regionKey = `${info.regionX},${info.regionY},${info.band}`;
      
      // Initialize colors array for this region if needed
      if (!regionColors.has(regionKey)) {
        regionColors.set(regionKey, []);
      }
      
      // Add this pixel's color to the region
      regionColors.get(regionKey).push({ r: info.r, g: info.g, b: info.b });
    }
  }
  
  // Third pass: Find representative colors for each region and band
  const colorMap = new Map(); // Map of "regionX,regionY,band" -> [representative colors]
  
  for (const [regionKey, colors] of regionColors.entries()) {
    // Skip if no colors in this region/band
    if (colors.length === 0) continue;
    
    // If few pixels, just use average color
    if (colors.length < 10) {
      let r = 0, g = 0, b = 0;
      for (const color of colors) {
        r += color.r;
        g += color.g;
        b += color.b;
      }
      colorMap.set(regionKey, [{
        r: Math.round(r / colors.length),
        g: Math.round(g / colors.length),
        b: Math.round(b / colors.length)
      }]);
      continue;
    }
    
    // For larger regions, identify color clusters
    const clusters = findColorClusters(colors);
    colorMap.set(regionKey, clusters);
  }
  
  // Final pass: Apply representative colors to output
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const info = pixelInfo[idx];
      const i = idx * 4;
      
      // Handle transparent pixels
      if (info.band === -1) {
        output[i] = 0;
        output[i + 1] = 0;
        output[i + 2] = 0;
        output[i + 3] = 0;
        continue;
      }
      
      // If band is within visible range
      if (info.band <= maxBand) {
        // Get region key and representative colors
        const regionKey = `${info.regionX},${info.regionY},${info.band}`;
        const repColors = colorMap.get(regionKey);
        
        if (repColors && repColors.length > 0) {
          // Find the closest representative color to this pixel
          const origColor = { r: info.r, g: info.g, b: info.b };
          const closestColor = findClosestColor(origColor, repColors);
          
          // Apply the color
          output[i] = closestColor.r;
          output[i + 1] = closestColor.g;
          output[i + 2] = closestColor.b;
        } else {
          // Fallback to grayscale if no representative colors found
          const tone = Math.floor((info.band + 0.5) * bandSize);
          output[i] = output[i + 1] = output[i + 2] = tone;
        }
      } else {
        // Use white for bands outside the current depth
        output[i] = 255;
        output[i + 1] = 255;
        output[i + 2] = 255;
      }
      
      // Preserve original alpha
      output[i + 3] = imageData.data[i + 3];
    }
  }
  
  return new ImageData(output, imageData.width, imageData.height);
}

/**
 * Find representative color clusters from a set of colors
 * A simplified, threshold-based clustering approach
 * @param {Array} colors - Array of {r,g,b} objects
 * @returns {Array} Array of representative {r,g,b} colors
 */
function findColorClusters(colors) {
  // Convert to array for easier manipulation
  const colorArray = colors.map(c => [c.r, c.g, c.b]);
  
  // If few colors, return them all
  if (colorArray.length <= 3) {
    return colors;
  }
  
  // Parameters for clustering
  const colorThreshold = 40; // Color distance threshold for creating a new cluster
  const clusters = [];
  
  // Process each color
  for (const color of colorArray) {
    // Check if this color is close to any existing cluster
    let foundCluster = false;
    
    for (const cluster of clusters) {
      // Calculate color distance to cluster center
      const dr = color[0] - cluster.center[0];
      const dg = color[1] - cluster.center[1];
      const db = color[2] - cluster.center[2];
      const distance = Math.sqrt(dr*dr + dg*dg + db*db);
      
      // If close enough, add to this cluster
      if (distance < colorThreshold) {
        cluster.colors.push(color);
        // Update cluster center (average)
        cluster.center[0] = Math.round((cluster.center[0] * cluster.count + color[0]) / (cluster.count + 1));
        cluster.center[1] = Math.round((cluster.center[1] * cluster.count + color[1]) / (cluster.count + 1));
        cluster.center[2] = Math.round((cluster.center[2] * cluster.count + color[2]) / (cluster.count + 1));
        cluster.count++;
        foundCluster = true;
        break;
      }
    }
    
    // If no matching cluster, create a new one
    if (!foundCluster) {
      clusters.push({
        center: [...color], // Clone the color array
        colors: [color],
        count: 1
      });
    }
  }
  
  // Sort clusters by size (largest first)
  clusters.sort((a, b) => b.count - a.count);
  
  // Take up to 3 largest clusters or all if fewer
  const topClusters = clusters.slice(0, Math.min(3, clusters.length));
  
  // Convert clusters to representative colors
  return topClusters.map(cluster => ({
    r: cluster.center[0],
    g: cluster.center[1],
    b: cluster.center[2]
  }));
}

/**
 * Find the closest color from a set of colors
 * @param {Object} targetColor - {r,g,b} object
 * @param {Array} colors - Array of {r,g,b} objects
 * @returns {Object} The closest color as {r,g,b}
 */
function findClosestColor(targetColor, colors) {
  let minDistance = Infinity;
  let closestColor = colors[0];
  
  for (const color of colors) {
    const dr = targetColor.r - color.r;
    const dg = targetColor.g - color.g;
    const db = targetColor.b - color.b;
    const distance = dr*dr + dg*dg + db*db;
    
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = color;
    }
  }
  
  return closestColor;
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