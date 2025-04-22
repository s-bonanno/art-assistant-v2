import { gridTypes } from './gridTypes.js';

// Grid configuration state
export const gridConfig = {
    color: '#000000',
    opacity: 0.5,
    lineWeight: 1,
    type: 'square' // Default to square grid
};

// Get grid styling elements
const gridLineWeight = document.getElementById('gridLineWeight');
const gridLineWeightValue = document.getElementById('gridLineWeightValue');
const gridOpacity = document.getElementById('gridOpacity');
const gridOpacityValue = document.getElementById('gridOpacityValue');
const colorSwatches = document.querySelectorAll('[data-color]');

// Update grid controls visibility based on type
function updateGridControlsVisibility(gridType) {
    const controls = document.querySelectorAll('.grid-control');
    controls.forEach(control => {
        control.style.display = gridType === 'none' ? 'none' : 'block';
    });
}

// Update color swatch selection
export function updateColorSwatchSelection(selectedButton) {
    // Remove selected state from all swatches
    document.querySelectorAll('[data-color]').forEach(button => {
        button.classList.remove('border-indigo-500');
        button.classList.add('border-zinc-700');
    });

    // Add selected state to clicked swatch
    selectedButton.classList.remove('border-zinc-700');
    selectedButton.classList.add('border-indigo-500');
}

// Set default grid style based on view mode
export function setDefaultGridStyle(viewMode) {
    if (viewMode === 'full') {
        gridConfig.opacity = 0.5;
        gridConfig.lineWeight = 1;
    } else {
        gridConfig.opacity = 0.5;
        gridConfig.lineWeight = 1;
    }

    // Initialize grid type dropdown if it exists
    const gridTypeSelect = document.getElementById('gridType');
    if (gridTypeSelect) {
        gridTypeSelect.value = gridConfig.type;
        updateGridControlsVisibility(gridConfig.type);
    }
}

// Initialize grid style event listeners
export function initGridStyleListeners(drawCanvas) {
    // Grid type selection
    const gridTypeSelect = document.getElementById('gridType');
    if (gridTypeSelect) {
        // Set initial value
        gridTypeSelect.value = gridConfig.type;
        updateGridControlsVisibility(gridConfig.type);

        gridTypeSelect.addEventListener('change', (e) => {
            gridConfig.type = e.target.value;
            updateGridControlsVisibility(gridConfig.type);
            drawCanvas();
        });
    }

    // Grid line weight slider
    if (gridLineWeight && gridLineWeightValue) {
        gridLineWeight.addEventListener('input', (e) => {
            gridConfig.lineWeight = parseFloat(e.target.value);
            gridLineWeightValue.textContent = `${gridConfig.lineWeight}px`;
            drawCanvas();
        });
    }

    // Grid opacity slider
    if (gridOpacity && gridOpacityValue) {
        gridOpacity.addEventListener('input', (e) => {
            gridConfig.opacity = parseFloat(e.target.value);
            gridOpacityValue.textContent = `${Math.round(gridConfig.opacity * 100)}%`;
            drawCanvas();
        });
    }

    // Grid color swatches
    document.querySelectorAll('[data-color]').forEach(button => {
        button.addEventListener('click', (e) => {
            gridConfig.color = e.target.dataset.color;
            updateColorSwatchSelection(e.target);
            drawCanvas();
        });
    });
}

// Export the current grid type
export function getCurrentGridType() {
    return gridTypes[gridConfig.type];
} 