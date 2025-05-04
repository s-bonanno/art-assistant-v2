// Canvas size presets
export const canvasSizePresets = {
    // Standard Paper
    'a5': { width: 14.8, height: 21.0 },
    'a4': { width: 21.0, height: 29.7 },
    'a3': { width: 29.7, height: 42.0 },
    'a2': { width: 42.0, height: 59.4 },
    'a1': { width: 59.4, height: 84.1 },
    'a0': { width: 84.1, height: 118.9 },
    
    // Common Painting
    'small': { width: 20.0, height: 25.0 },
    'medium': { width: 30.0, height: 40.0 },
    'large': { width: 50.0, height: 70.0 },
    
    // Square
    'square-small': { width: 20.0, height: 20.0 },
    'square-medium': { width: 30.0, height: 30.0 },
    'square-large': { width: 50.0, height: 50.0 },
    
    // Common Ratios
    'ratio-16-9': { width: 32.0, height: 18.0 },
    'ratio-4-3': { width: 28.0, height: 21.0 },
    'ratio-8-10': { width: 24.0, height: 30.0 },
    'ratio-5-7': { width: 25.0, height: 35.0 },
    'ratio-3-4': { width: 30.0, height: 40.0 },
    
    // Traditional
    'quarter-imperial': { width: 22.9, height: 30.5 },
    'half-imperial': { width: 30.5, height: 45.7 },
    'imperial': { width: 45.7, height: 61.0 }
};

export function initCanvasPresetSelector(canvasWidthInput, canvasHeightInput, onPresetSelected) {
    const canvasSizePreset = document.getElementById('canvasSizePreset');
    if (!canvasSizePreset) return;

    canvasSizePreset.addEventListener('change', (e) => {
        const preset = e.target.value;
        if (preset === 'custom') return;
        
        const size = canvasSizePresets[preset];
        if (size) {
            // Update the width and height inputs
            canvasWidthInput.value = size.width;
            canvasHeightInput.value = size.height;
            
            // Call the callback with the selected size
            if (onPresetSelected) {
                onPresetSelected(size);
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