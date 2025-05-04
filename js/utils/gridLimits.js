/**
 * Calculates appropriate grid size limits based on dimensions and view mode
 * @param {number} width - Width in pixels
 * @param {number} height - Height in pixels
 * @param {string} viewMode - Either 'canvas' or 'full'
 * @param {Object} config - Configuration object containing canvas dimensions and other settings
 * @returns {Object} Object containing min, max, and mid grid sizes
 */
export function calculateGridSizeLimits(width, height, viewMode, config) {
    // Calculate both smaller and larger dimensions
    const smallerDimension = Math.min(width, height);
    const largerDimension = Math.max(width, height);
    
    // Set minimum grid size to 1/50th of the smaller dimension
    const minGridSize = Math.max(1, Math.floor(smallerDimension / 50));
    
    // Set maximum grid size to 1/3 of the larger dimension
    const maxGridSize = Math.floor(largerDimension / 3);
    
    // Calculate mid point for default grid size
    const midGridSize = Math.floor((minGridSize + maxGridSize) / 2);
    
    if (viewMode === 'canvas') {
        // Convert to cm/in based on canvas width
        const pixelsPerCm = width / config.canvasWidthCm;
        return {
            min: (minGridSize / pixelsPerCm).toFixed(1),
            max: (maxGridSize / pixelsPerCm).toFixed(1),
            mid: (midGridSize / pixelsPerCm).toFixed(1)
        };
    } else {
        // Full image mode - use pixels directly
        return {
            min: minGridSize,
            max: maxGridSize,
            mid: midGridSize
        };
    }
} 