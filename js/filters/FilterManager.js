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
        if (!this.cache.needsUpdate && 
            this.cache.width === width && 
            this.cache.height === height && 
            !this._haveFiltersChanged()) {
            return; // Use cached result
        }

        const imageData = ctx.getImageData(x, y, width, height);
        let processedImageData = imageData;

        // Apply each active filter in sequence
        for (const filter of this.filters.values()) {
            if (filter.active) {
                processedImageData = filter.apply(processedImageData);
            }
        }

        ctx.putImageData(processedImageData, x, y);

        // Update cache
        this.cache.width = width;
        this.cache.height = height;
        this.cache.needsUpdate = false;
        this._updateFilterStates();
    }

    // Check if any filters have changed
    _haveFiltersChanged() {
        for (const [name, filter] of this.filters) {
            const lastState = this.cache.lastFilterStates.get(name);
            if (!lastState) return true;

            if (filter.active !== lastState.active) return true;

            for (const [prop, value] of Object.entries(filter.properties)) {
                if (value !== lastState.properties[prop]) return true;
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
} 