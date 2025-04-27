import { FilterManager } from './FilterManager.js';
import { FilterUIManager } from './FilterUIManager.js';
import { LightFilter } from './LightFilter.js';
import { HueSaturationFilter } from './HueSaturationFilter.js';
import { ShapeFilter } from './shapeFilters.js';

// Create filter manager instance
export const filterManager = new FilterManager();

// Create filter UI manager instance
export const filterUIManager = new FilterUIManager(filterManager);

// Initialize filters
export function initFilters(drawCanvas) {
    // Create and register light filter
    const lightFilter = new LightFilter();
    filterManager.registerFilter(lightFilter);

    // Create and register hue/saturation filter
    const hueSaturationFilter = new HueSaturationFilter();
    filterManager.registerFilter(hueSaturationFilter);

    // Create and register shape filter
    const shapeFilter = new ShapeFilter();
    filterManager.registerFilter(shapeFilter);

    // Initialize UI controls for light filter
    filterUIManager.initFilterControls('light', [
        { id: 'exposure', min: -100, max: 100, step: 1 },
        { id: 'contrast', min: -100, max: 100, step: 1 },
        { id: 'highlights', min: -100, max: 100, step: 1 },
        { id: 'shadows', min: -100, max: 100, step: 1 }
    ]);

    // Initialize UI controls for hue/saturation filter
    filterUIManager.initFilterControls('hueSaturation', [
        { id: 'hue', min: -180, max: 180, step: 1 },
        { id: 'saturation', min: -100, max: 100, step: 1 },
        { id: 'temperature', min: -100, max: 100, step: 1 }
    ]);

    // Initialize UI controls for shape filter
    filterUIManager.initFilterControls('shape', [
        { id: 'notanBands', min: 2, max: 8, step: 1 },
        { id: 'shapeOpacity', min: 0, max: 100, step: 1 }
    ]);

    // Set the draw callback
    filterManager.setDebouncedDraw(drawCanvas);
    filterUIManager.setOnFilterChange(() => {
        filterManager.triggerDebouncedDraw();
    });
} 