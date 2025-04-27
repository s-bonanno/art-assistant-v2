export class FilterManager {
    constructor() {
        this.filters = new Map();
        this.cache = {
            imageData: null,
            width: 0,
            height: 0,
            needsUpdate: true,
            lastFilterStates: new Map()
        };
        this._debouncedDraw = null;
        
        // Create reusable temporary canvas and context
        this._tempCanvas = document.createElement('canvas');
        this._tempCtx = this._tempCanvas.getContext('2d', { willReadFrequently: true });
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
        this.filters.set(filter.name, filter);
        this.cache.lastFilterStates.set(filter.name, {
            active: filter.active,
            properties: { ...filter.properties }
        });
    }

    // Apply all active filters to the image data
    applyFilters(ctx, canvas, x, y, width, height) {
        // Check if we need to update the cache
        if (this.cache.needsUpdate || 
            this.cache.width !== width || 
            this.cache.height !== height) {
            
            // Resize temporary canvas if needed
            if (this._tempCanvas.width !== width || this._tempCanvas.height !== height) {
                this._tempCanvas.width = width;
                this._tempCanvas.height = height;
            }
            
            // Draw the current content to the temporary canvas
            this._tempCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height);
            
            // Get the image data
            const imageData = this._tempCtx.getImageData(0, 0, width, height);
            
            // Apply all active filters
            for (const [name, filter] of this.filters) {
                if (filter.active) {
                    filter.apply(imageData);
                }
            }
            
            // Update the cache
            this.cache.imageData = imageData;
            this.cache.width = width;
            this.cache.height = height;
            this.cache.needsUpdate = false;
            
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

            // Only check properties that are actually used by the filter
            const relevantProps = Object.keys(filter.properties);
            for (const prop of relevantProps) {
                if (filter.properties[prop] !== lastState.properties[prop]) return true;
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
            timeout = setTimeout(() => callback.apply(context, args), 16); // Match 60fps
        };
    }

    // Trigger a debounced draw
    triggerDebouncedDraw() {
        if (this._debouncedDraw) {
            this._debouncedDraw();
        }
    }
} 