import { convertToUnit, convertFromUnit } from './unitConversion.js';

// Canvas size presets
export const canvasSizePresets = {
    // Standard Paper (in cm)
    'a5': { width: 14.8, height: 21.0, unit: 'cm' },
    'a4': { width: 21.0, height: 29.7, unit: 'cm' },
    'a3': { width: 29.7, height: 42.0, unit: 'cm' },
    'a2': { width: 42.0, height: 59.4, unit: 'cm' },
    'a1': { width: 59.4, height: 84.1, unit: 'cm' },
    'a0': { width: 84.1, height: 118.9, unit: 'cm' },
    
    // Common Painting - Rectangular (in inches)
    'rect-8x10': { width: 8, height: 10, unit: 'in' },
    'rect-9x12': { width: 9, height: 12, unit: 'in' },
    'rect-11x14': { width: 11, height: 14, unit: 'in' },
    'rect-12x16': { width: 12, height: 16, unit: 'in' },
    'rect-16x20': { width: 16, height: 20, unit: 'in' },
    'rect-18x24': { width: 18, height: 24, unit: 'in' },
    'rect-24x30': { width: 24, height: 30, unit: 'in' },
    'rect-24x36': { width: 24, height: 36, unit: 'in' },
    'rect-30x40': { width: 30, height: 40, unit: 'in' },
    'rect-36x48': { width: 36, height: 48, unit: 'in' },
    
    // Common Painting - Square (in inches)
    'square-8x8': { width: 8, height: 8, unit: 'in' },
    'square-10x10': { width: 10, height: 10, unit: 'in' },
    'square-12x12': { width: 12, height: 12, unit: 'in' },
    'square-16x16': { width: 16, height: 16, unit: 'in' },
    'square-20x20': { width: 20, height: 20, unit: 'in' },
    'square-24x24': { width: 24, height: 24, unit: 'in' },
    'square-30x30': { width: 30, height: 30, unit: 'in' }
};

export function initCanvasPresetSelector(canvasWidthInput, canvasHeightInput, onPresetSelected, config) {
    const canvasSizePreset = document.getElementById('canvasSizePreset');
    const canvasUnitSelect = document.getElementById('canvasUnitSelect');
    if (!canvasSizePreset || !canvasUnitSelect) return;

    // Helper function to format number with conditional decimals
    const formatNumber = (num, unit) => {
        const decimals = unit === 'in' ? 2 : 1;
        const formatted = num.toFixed(decimals);
        // Remove trailing zeros and decimal point if no decimals
        return formatted.replace(/\.?0+$/, '');
    };

    canvasSizePreset.addEventListener('change', (e) => {
        const preset = e.target.value;
        if (preset === 'custom') return;
        
        const size = canvasSizePresets[preset];
        if (size) {
            // Convert the dimensions to centimeters for storage
            const widthCm = convertFromUnit(size.width, size.unit);
            const heightCm = convertFromUnit(size.height, size.unit);
            
            // Update the config values in centimeters
            config.canvasWidthCm = widthCm;
            config.canvasHeightCm = heightCm;
            
            // Update the unit selector
            canvasUnitSelect.value = size.unit;
            
            // Update the display values in the current unit
            const displayWidth = convertToUnit(widthCm, size.unit);
            const displayHeight = convertToUnit(heightCm, size.unit);
            
            // Update the input values with conditional decimal places
            canvasWidthInput.value = formatNumber(displayWidth, size.unit);
            canvasHeightInput.value = formatNumber(displayHeight, size.unit);
            
            // Update step size
            canvasWidthInput.step = size.unit === 'in' ? '0.25' : '0.1';
            canvasHeightInput.step = size.unit === 'in' ? '0.25' : '0.1';
            
            // Call the callback with the converted centimeter values
            if (onPresetSelected) {
                onPresetSelected({
                    width: widthCm,
                    height: heightCm,
                    unit: size.unit
                });
            }
        }
    });
}

export function resetPresetToCustom() {
    const canvasSizePreset = document.getElementById('canvasSizePreset');
    if (canvasSizePreset) {
        canvasSizePreset.value = 'custom';
    }
} 