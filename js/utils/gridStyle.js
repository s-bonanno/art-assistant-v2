// Grid styling configuration
export const gridConfig = {
    lineWeight: undefined, // Will be set based on view mode
    opacity: undefined, // Will be set based on view mode
    color: '#000000'
};

// Get grid styling elements
const gridLineWeight = document.getElementById('gridLineWeight');
const gridLineWeightValue = document.getElementById('gridLineWeightValue');
const gridOpacity = document.getElementById('gridOpacity');
const gridOpacityValue = document.getElementById('gridOpacityValue');
const colorSwatches = document.querySelectorAll('[data-color]');

// Update color swatch selection
export function updateColorSwatchSelection() {
    colorSwatches.forEach(swatch => {
        if (swatch.dataset.color === gridConfig.color) {
            swatch.classList.add('border-indigo-500');
            swatch.classList.remove('border-zinc-700');
        } else {
            swatch.classList.remove('border-indigo-500');
            swatch.classList.add('border-zinc-700');
        }
    });
}

// Set initial grid style values
export function setDefaultGridStyle(viewMode) {
    // Set defaults based on view mode
    gridConfig.lineWeight = 1;
    gridConfig.opacity = 1;
    if (gridConfig.color === undefined) {
        gridConfig.color = '#000000';
    }
    
    // Update UI elements
    gridLineWeight.value = gridConfig.lineWeight;
    gridLineWeightValue.textContent = `${gridConfig.lineWeight}px`;
    gridOpacity.value = gridConfig.opacity;
    gridOpacityValue.textContent = `${Math.round(gridConfig.opacity * 100)}%`;
    
    updateColorSwatchSelection();
}

// Initialize grid style event listeners
export function initGridStyleListeners(drawCanvas) {
    // Update grid line weight
    gridLineWeight.addEventListener('input', () => {
        gridConfig.lineWeight = parseFloat(gridLineWeight.value);
        gridLineWeightValue.textContent = `${gridConfig.lineWeight}px`;
        drawCanvas();
    });

    // Update grid opacity
    gridOpacity.addEventListener('input', () => {
        gridConfig.opacity = parseFloat(gridOpacity.value);
        gridOpacityValue.textContent = `${Math.round(gridConfig.opacity * 100)}%`;
        drawCanvas();
    });

    // Handle color swatch clicks
    colorSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            gridConfig.color = swatch.dataset.color;
            updateColorSwatchSelection();
            drawCanvas();
        });
    });
} 