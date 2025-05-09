import { disableOriginalViewIfActive } from '../utils/originalImage.js';

class GridManager {
    _initGridControls() {
        // Grid size control
        const gridSizeControl = document.getElementById('gridSizeControl');
        if (gridSizeControl) {
            gridSizeControl.addEventListener('input', (e) => {
                this.setGridSize(parseInt(e.target.value));
                disableOriginalViewIfActive();
            });
        }

        // Grid opacity control
        const gridOpacityControl = document.getElementById('gridOpacityControl');
        if (gridOpacityControl) {
            gridOpacityControl.addEventListener('input', (e) => {
                this.setGridOpacity(parseFloat(e.target.value));
                disableOriginalViewIfActive();
            });
        }

        // Grid color control
        const gridColorControl = document.getElementById('gridColorControl');
        if (gridColorControl) {
            gridColorControl.addEventListener('input', (e) => {
                this.setGridColor(e.target.value);
                disableOriginalViewIfActive();
            });
        }
    }
} 