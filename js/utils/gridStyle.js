import { gridTypes } from './gridTypes.js';

// Grid configuration state
export const gridConfig = {
    type: 'square',
    spacing: 5,
    color: '#000000', // Set default color to black
    opacity: 0.5,
    lineWeight: 1
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
        // Hide all controls if grid is disabled
        if (gridType === 'none') {
            control.style.display = 'none';
            return;
        }
        
        // Hide size controls for non-square grid types
        if (control.hasAttribute('data-grid-control') && gridType !== 'square') {
            control.style.display = 'none';
        } else {
            control.style.display = 'block';
        }
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
    // Only reset opacity, preserve other settings
    gridConfig.opacity = 0.5;

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
            updateGridPreview();
            drawCanvas();
        });
    }

    // Grid line weight slider
    if (gridLineWeight && gridLineWeightValue) {
        gridLineWeight.value = gridConfig.lineWeight;
        gridLineWeightValue.textContent = `${gridConfig.lineWeight}px`;
        
        gridLineWeight.addEventListener('input', (e) => {
            gridConfig.lineWeight = parseFloat(e.target.value);
            gridLineWeightValue.textContent = `${gridConfig.lineWeight}px`;
            updateGridPreview();
            drawCanvas();
        });
    }

    // Grid opacity slider
    if (gridOpacity && gridOpacityValue) {
        gridOpacity.value = gridConfig.opacity;
        gridOpacityValue.textContent = `${Math.round(gridConfig.opacity * 100)}%`;
        
        gridOpacity.addEventListener('input', (e) => {
            gridConfig.opacity = parseFloat(e.target.value);
            gridOpacityValue.textContent = `${Math.round(gridConfig.opacity * 100)}%`;
            updateGridPreview();
            drawCanvas();
        });
    }

    // Grid color swatches
    document.querySelectorAll('[data-color]').forEach(button => {
        // Set initial selected state for black color
        if (button.dataset.color === gridConfig.color) {
            button.classList.remove('border-zinc-700');
            button.classList.add('border-indigo-500');
        }
        
        button.addEventListener('click', (e) => {
            gridConfig.color = e.target.dataset.color;
            updateColorSwatchSelection(e.target);
            updateGridPreview();
            drawCanvas();
        });
    });

    // Initial grid preview update
    updateGridPreview();
}

// Grid preview functionality
export function updateGridPreview() {
    const canvas = document.getElementById('gridPreview');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Always use the same dimensions
    const previewSize = 36; // 6rem * 6 (tailwind w-6)
    canvas.width = previewSize * dpr;
    canvas.height = previewSize * dpr;
    ctx.scale(dpr, dpr);
    
    // Clear canvas with a lighter background
    ctx.fillStyle = '#2c2c2e';
    ctx.fillRect(0, 0, previewSize, previewSize);
    
    // Get current grid type from dropdown
    const gridTypeSelect = document.getElementById('gridType');
    const currentType = gridTypeSelect ? gridTypeSelect.value : 'square';
    
    // Set up grid style with preview line weight (0.5x)
    ctx.strokeStyle = gridConfig.color;
    ctx.globalAlpha = gridConfig.opacity;
    ctx.lineWidth = gridConfig.lineWeight * 0.5;
    
    // Draw grid based on current type
    const gridType = gridTypes[currentType];
    if (gridType) {
        gridType.draw(ctx, gridConfig, {
            width: previewSize,
            height: previewSize,
            gridSpacing: currentType === 'square' ? previewSize / 3 : 8 // 3x3 grid for square, fixed spacing for others
        });
    }
}

// Export the current grid type
export function getCurrentGridType() {
    return gridTypes[gridConfig.type];
} 