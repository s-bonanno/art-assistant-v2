export class FilterManager {
    constructor() {
        this.filters = new Map();
        this.filterOrder = [
            'light',
            'hueSaturation',
            'shape',
            // 'edge',
            'blur'
        ];
        this.debouncedDraw = null;
        this.cache = {
            imageData: null,
            width: 0,
            height: 0,
            needsUpdate: true,
            lastFilterStates: new Map(),
            lastCanvasSize: { width: 0, height: 0 }
        };
        
        // Create reusable temporary canvas and context
        this._tempCanvas = document.createElement('canvas');
        this._tempCtx = this._tempCanvas.getContext('2d', { willReadFrequently: true });
        
        // Pre-allocate LUTs for better performance
        this._contrastLUT = new Uint8Array(256);
        this._lastContrastValue = null;
    }

    // Update contrast LUT if needed
    _updateContrastLUT(contrastValue) {
        if (this._lastContrastValue === contrastValue) return;
        this._lastContrastValue = contrastValue;

        if (contrastValue === 0) {
            for (let i = 0; i < 256; i++) this._contrastLUT[i] = i;
            return;
        }

        const center = 128;
        const factor = contrastValue > 0 
            ? 1 + (contrastValue / 50)
            : 1 / (1 + Math.abs(contrastValue) / 50);

        for (let i = 0; i < 256; i++) {
            const centered = i - center;
            const adjusted = centered * factor;
            this._contrastLUT[i] = Math.min(255, Math.max(0, adjusted + center));
        }
    }

    // Combined filter application in a single pass
    _applyAllFilters(imageData) {
        // Get active filters
        const lightFilter = this.filters.get('light');
        const hueSatFilter = this.filters.get('hueSaturation');
        const shapeFilter = this.filters.get('shape');
        const edgeFilter = this.filters.get('edge');
        const blurFilter = this.filters.get('blur');
        
        // Create a copy of the original image data
        const originalData = new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );
        
        // Create a copy for the filtered result
        let filteredData = new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );
        
        // Apply all non-edge filters first
        if (shapeFilter?.active) {
            shapeFilter.apply(filteredData);
        }
        
        if (lightFilter?.active) {
            lightFilter.apply(filteredData);
        }
        
        if (hueSatFilter?.active) {
            hueSatFilter.apply(filteredData);
        }

        if (blurFilter?.active) {
            blurFilter.apply(filteredData);
        }
        
        // Apply edge filter last, if active
        if (edgeFilter?.active) {
            // Store the original image data for edge detection if not already stored
            if (!edgeFilter.originalImageData) {
                edgeFilter.setOriginalImage(originalData);
            }
            
            // Apply the edge filter to the filtered result
            edgeFilter.apply(filteredData);
        }
        
        // Copy the final result back to the input imageData
        imageData.data.set(filteredData.data);
        return imageData;
    }

    // Add a method to invalidate cache when canvas dimensions change
    invalidateCache() {
        this.cache.imageData = null;
        this.cache.width = 0;
        this.cache.height = 0;
        this.cache.needsUpdate = true;
    }

    // Register a new filter
    registerFilter(filter) {
        if (!filter || typeof filter.apply !== 'function') {
            throw new Error('Invalid filter: must implement apply method');
        }
        
        this.filters.set(filter.name, filter);
        this.cache.lastFilterStates.set(filter.name, {
            active: filter.active,
            properties: { ...filter.properties }
        });
        this.invalidateCache();
    }

    // Update filter state
    updateFilterState(filterName, active, properties) {
        const filter = this.filters.get(filterName);
        if (filter) {
            filter.active = active;
            if (properties) {
                if (filter.updateProperties) {
                    filter.updateProperties(properties);
                } else {
                    Object.assign(filter.properties, properties);
                }
            }
            
            // Always invalidate cache for shape or edge filter changes
            if (filterName === 'shape' || filterName === 'edge') {
                this.cache.needsUpdate = true;
                this.cache.imageData = null; // Force a complete cache refresh
            }
            
            this.invalidateCache();
            
            // Force a redraw by triggering the debounced draw
            if (this.debouncedDraw) {
                this.debouncedDraw();
            }
        }
    }

    // Apply all active filters to the image data
    applyFilters(ctx, canvas, x, y, width, height) {
        // Check if we need to update the cache
        const filtersChanged = this._haveFiltersChanged();
        const sizeChanged = this.cache.width !== width || this.cache.height !== height;
        
        if (this.cache.needsUpdate || filtersChanged || sizeChanged) {
            // Resize temporary canvas if needed
            if (this._tempCanvas.width !== width || this._tempCanvas.height !== height) {
                this._tempCanvas.width = width;
                this._tempCanvas.height = height;
            }
            
            // Draw the current content to the temporary canvas
            this._tempCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height);
            
            // Get the image data and apply all filters in a single pass
            const imageData = this._tempCtx.getImageData(0, 0, width, height);
            this._applyAllFilters(imageData);
            
            // Update the cache
            this.cache.imageData = imageData;
            this.cache.width = width;
            this.cache.height = height;
            this.cache.needsUpdate = false;
            this._updateFilterStates();
            
            // Draw the processed image data back to the canvas
            ctx.putImageData(imageData, x, y);
        } else {
            // Use cached image data
            ctx.putImageData(this.cache.imageData, x, y);
        }
    }

    // Check if any filters have changed
    _haveFiltersChanged() {
        for (const [name, filter] of this.filters) {
            const lastState = this.cache.lastFilterStates.get(name);
            if (!lastState) return true;

            // Quick check for active state change
            if (filter.active !== lastState.active) return true;
            
            // Skip property checks if filter is not active
            if (!filter.active) continue;

            const currentProps = filter.properties;
            const lastProps = lastState.properties;
            
            // Only check properties that affect output
            switch (name) {
                case 'light':
                    if (currentProps.exposure !== lastProps.exposure ||
                        currentProps.contrast !== lastProps.contrast ||
                        currentProps.highlights !== lastProps.highlights ||
                        currentProps.shadows !== lastProps.shadows) {
                        return true;
                    }
                    break;
                    
                case 'hueSaturation':
                    if (currentProps.saturation !== lastProps.saturation ||
                        currentProps.temperature !== lastProps.temperature) {
                        return true;
                    }
                    break;
                    
                case 'shape':
                    if (currentProps.notanBands !== lastProps.notanBands ||
                        currentProps.shapeOpacity !== lastProps.shapeOpacity) {
                        return true;
                    }
                    break;

                case 'edge':
                    if (currentProps.threshold !== lastProps.threshold ||
                        currentProps.intensity !== lastProps.intensity ||
                        currentProps.multiplyMode !== lastProps.multiplyMode) {
                        return true;
                    }
                    break;

                case 'blur':
                    if (currentProps.blurRadius !== lastProps.blurRadius) {
                        return true;
                    }
                    break;
            }
        }
        return false;
    }

    // Update the cached filter states more efficiently
    _updateFilterStates() {
        for (const [name, filter] of this.filters) {
            // Only store properties that affect output
            const properties = {};
            switch (name) {
                case 'light':
                    properties.exposure = filter.properties.exposure;
                    properties.contrast = filter.properties.contrast;
                    properties.highlights = filter.properties.highlights;
                    properties.shadows = filter.properties.shadows;
                    break;
                    
                case 'hueSaturation':
                    properties.saturation = filter.properties.saturation;
                    properties.temperature = filter.properties.temperature;
                    break;
                    
                case 'shape':
                    properties.notanBands = filter.properties.notanBands;
                    properties.shapeOpacity = filter.properties.shapeOpacity;
                    break;

                case 'edge':
                    properties.threshold = filter.properties.threshold;
                    properties.intensity = filter.properties.intensity;
                    properties.multiplyMode = filter.properties.multiplyMode;
                    break;

                case 'blur':
                    properties.blurRadius = filter.properties.blurRadius;
                    break;
            }
            
            this.cache.lastFilterStates.set(name, {
                active: filter.active,
                properties
            });
        }
    }

    // Reset all filters
    resetAllFilters() {
        for (const filter of this.filters.values()) {
            filter.active = false;
            filter.reset();
        }
        this.cache.needsUpdate = true;
        this._updateFilterStates();
    }

    // Get a specific filter by name
    getFilter(name) {
        return this.filters.get(name);
    }

    // Check if any filters are active and have non-zero values
    areFiltersActive() {
        for (const filter of this.filters.values()) {
            if (filter.active && filter.hasChanged()) {
                return true;
            }
        }
        return false;
    }

    // Set the debounced draw callback
    setDebouncedDraw(callback) {
        this.debouncedDraw = this._createDebouncedDraw(callback);
    }

    // Create a debounced draw function
    _createDebouncedDraw(callback) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => callback.apply(context, args), 32); // Reduced to 30fps for better performance
        };
    }

    // Trigger a debounced draw
    triggerDebouncedDraw() {
        if (this.debouncedDraw) {
            this.debouncedDraw();
        }
    }

    applyFilters(imageData) {
        const originalData = new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );

        // Get a copy of the original data for edge detection
        // const edgeFilter = this.filters.get('edge');

        // Create a temporary canvas for intermediate results
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imageData.width;
        tempCanvas.height = imageData.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Start with the original image
        tempCtx.putImageData(originalData, 0, 0);
        let filteredData = tempCtx.getImageData(0, 0, imageData.width, imageData.height);

        // Apply all non-edge filters first
        for (const filterName of this.filterOrder) {
            const filter = this.filters.get(filterName);
            if (filter?.active) {
                filteredData = filter.apply(filteredData);
                tempCtx.putImageData(filteredData, 0, 0);
            }
        }

        // Apply edge filter last, if active
        // if (edgeFilter?.active) {
        //     // Store the original image data for edge detection if not already stored
        //     if (!edgeFilter.originalImageData) {
        //         edgeFilter.setOriginalImage(originalData);
        //     }

        //     // Apply the edge filter to the filtered result
        //     edgeFilter.apply(filteredData);
        // }

        return filteredData;
    }

    invalidateCache(filterName) {
        // Always invalidate cache for shape filter changes
        if (filterName === 'shape') {
            this.cache.imageData = null;
            this.cache.lastCanvasSize = { width: 0, height: 0 };
        }
    }

    getFilterConfig(filterName) {
        const filter = this.filters.get(filterName);
        if (!filter) return null;

        switch (filterName) {
            case 'light':
                return {
                    exposure: filter.exposure,
                    contrast: filter.contrast,
                    highlights: filter.highlights,
                    shadows: filter.shadows
                };
            case 'hueSaturation':
                return {
                    hue: filter.hue,
                    saturation: filter.saturation,
                    temperature: filter.temperature
                };
            case 'shape':
                return {
                    filterType: filter.filterType,
                    totalBands: filter.totalBands,
                    blockBandDepth: filter.blockBandDepth,
                    shapeOpacity: filter.shapeOpacity
                };
            // case 'edge':
            //     return {
            //         threshold: filter.threshold,
            //         intensity: filter.intensity,
            //         opacity: filter.opacity,
            //         multiply: filter.multiply
            //     };
            case 'blur':
                return {
                    radius: filter.radius
                };
            default:
                return null;
        }
    }
} 