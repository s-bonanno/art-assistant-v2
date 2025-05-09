// Store the original image state
let _originalImage = null;
let _isShowingOriginal = false;

// Store the current view state (zoom, pan, etc.)
let _currentViewState = {
    zoom: 1,
    panX: 0,
    panY: 0
};

// Getters and setters
export function getOriginalImage() { return _originalImage; }
export function setOriginalImage(image) { _originalImage = image; }
export function isShowingOriginal() { return _isShowingOriginal; }

// Store current view state before switching
export function storeCurrentViewState(zoom, panX, panY) {
    _currentViewState = {
        zoom,
        panX,
        panY
    };
}

// Get stored view state
export function getStoredViewState() {
    return _currentViewState;
}

// Toggle between original and filtered image
export function toggleOriginalImage() {
    _isShowingOriginal = !_isShowingOriginal;
    return _isShowingOriginal;
}

// Reset to filtered view
export function resetToFiltered() {
    _isShowingOriginal = false;
}

/**
 * Disables the original view if it's currently active
 * This should be called whenever grid or image controls are used
 */
export function disableOriginalViewIfActive() {
    if (_isShowingOriginal) {
        _isShowingOriginal = false;
        const showOriginalToggle = document.getElementById('viewModeToggle');
        if (showOriginalToggle) {
            showOriginalToggle.checked = false;
        }
        // Also update the button appearance
        const showOriginalBtn = document.querySelector('button:has(svg[data-lucide="image"])');
        if (showOriginalBtn) {
            showOriginalBtn.classList.remove('text-indigo-400', 'bg-zinc-800/75');
            showOriginalBtn.classList.add('text-zinc-400');
        }
    }
} 