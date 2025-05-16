import { FilterManager } from './FilterManager.js';
import { FilterUIManager } from './FilterUIManager.js';
import { LightFilter } from './LightFilter.js';
import { HueSaturationFilter } from './HueSaturationFilter.js';
import { ShapeFilter } from './shapeFilters.js';
import { EdgeFilter } from './EdgeFilter.js';
import { BlurFilter } from './BlurFilter.js';

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

    // Create and register edge filter
    // const edgeFilter = new EdgeFilter();
    // filterManager.registerFilter(edgeFilter);

    // Create and register blur filter
    const blurFilter = new BlurFilter();
    filterManager.registerFilter(blurFilter);

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
    const shapeSliderConfigs = [
        { id: 'blockBandDepth', min: 0, max: 6, step: 1 },
        { id: 'shapeOpacity', min: 0, max: 100, step: 1 }
    ];
    filterUIManager.initFilterControls('shape', shapeSliderConfigs);

    // Initialize UI controls for edge filter
    // filterUIManager.initFilterControls('edge', [
    //     { type: 'toggle', id: 'edgeFilterToggle' },
    //     { type: 'range', id: 'edgeFilterThreshold', min: 0, max: 100, value: 50 },
    //     { type: 'range', id: 'edgeFilterIntensity', min: 0, max: 100, value: 50 },
    //     { type: 'range', id: 'edgeFilterOpacity', min: 0, max: 100, value: 100 },
    //     { type: 'toggle', id: 'edgeFilterMultiply' }
    // ]);

    // Initialize UI controls for blur filter
    filterUIManager.initFilterControls('blur', [
        { type: 'toggle', id: 'blurFilterToggle' },
        { type: 'range', id: 'blurFilterAmount', min: 0, max: 100, value: 50 }
    ]);

    // Set the draw callback
    filterManager.setDebouncedDraw(drawCanvas);
    filterUIManager.setOnFilterChange(() => {
        filterManager.triggerDebouncedDraw();
    });
} 