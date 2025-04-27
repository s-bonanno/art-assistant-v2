export class FilterManager {
    constructor() {
        this.filters = new Map();
        this.cache = {
            imageData: null,
            width: 0,
            height: 0,
            needsUpdate: true,
            lastFilterStates: new Map(),
            lastCanvasSize: { width: 0, height: 0 }
        };
        this._debouncedDraw = null;
        
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
        const data = imageData.data;
        
        // Get active filters
        const lightFilter = this.filters.get('light');
        const hueSatFilter = this.filters.get('hueSaturation');
        const shapeFilter = this.filters.get('shape');
        
        // Apply shape filter first if active
        if (shapeFilter?.active) {
            shapeFilter.apply(imageData);
        }
        
        // Then apply light adjustments if active
        if (lightFilter?.active) {
            lightFilter.apply(imageData);
        }
        
        // Finally apply color adjustments if active
        if (hueSatFilter?.active) {
            hueSatFilter.apply(imageData);
        }
        
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
                Object.assign(filter.properties, properties);
            }
            // Always invalidate cache for shape filter changes
            if (filterName === 'shape') {
                this.cache.needsUpdate = true;
            }
            this.invalidateCache();
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

            if (filter.active !== lastState.active) return true;

            // Check all properties, not just the relevant ones
            const currentProps = filter.properties;
            const lastProps = lastState.properties;
            
            // Check if any properties have changed
            for (const prop in currentProps) {
                if (currentProps[prop] !== lastProps[prop]) {
                    return true;
                }
            }
            
            // Check if any properties were removed
            for (const prop in lastProps) {
                if (!(prop in currentProps)) {
                    return true;
                }
            }
        }
        return false;
    }

    // Update the cached filter states
    _updateFilterStates() {
        for (const [name, filter] of this.filters) {
            this.cache.lastFilterStates.set(name, {
                active: filter.active,
                properties: { ...filter.properties }
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
        this._debouncedDraw = this._createDebouncedDraw(callback);
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
        if (this._debouncedDraw) {
            this._debouncedDraw();
        }
    }
} 