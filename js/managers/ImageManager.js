import { disableOriginalViewIfActive } from '../utils/originalImage.js';

class ImageManager {
    _initImageControls() {
        // Zoom controls
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const zoomResetBtn = document.getElementById('zoomResetBtn');

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                this.zoomIn();
                disableOriginalViewIfActive();
            });
        }

        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                this.zoomOut();
                disableOriginalViewIfActive();
            });
        }

        if (zoomResetBtn) {
            zoomResetBtn.addEventListener('click', () => {
                this.resetZoom();
                disableOriginalViewIfActive();
            });
        }

        // Pan controls
        const panLeftBtn = document.getElementById('panLeftBtn');
        const panRightBtn = document.getElementById('panRightBtn');
        const panUpBtn = document.getElementById('panUpBtn');
        const panDownBtn = document.getElementById('panDownBtn');
        const panResetBtn = document.getElementById('panResetBtn');

        if (panLeftBtn) {
            panLeftBtn.addEventListener('click', () => {
                this.panLeft();
                disableOriginalViewIfActive();
            });
        }

        if (panRightBtn) {
            panRightBtn.addEventListener('click', () => {
                this.panRight();
                disableOriginalViewIfActive();
            });
        }

        if (panUpBtn) {
            panUpBtn.addEventListener('click', () => {
                this.panUp();
                disableOriginalViewIfActive();
            });
        }

        if (panDownBtn) {
            panDownBtn.addEventListener('click', () => {
                this.panDown();
                disableOriginalViewIfActive();
            });
        }

        if (panResetBtn) {
            panResetBtn.addEventListener('click', () => {
                this.resetPan();
                disableOriginalViewIfActive();
            });
        }
    }
} 