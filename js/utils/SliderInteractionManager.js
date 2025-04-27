// Slider interaction manager for handling fade effects during slider interaction
export class SliderInteractionManager {
    constructor(containerSelector, options = {}) {
        this.container = document.querySelector(containerSelector);
        this.fadeDuration = options.fadeDuration || 200;
        this.fadeOpacity = options.fadeOpacity || 0;
        this.activeSlider = null;
        this.isDragging = false;
        this.backgroundClass = options.backgroundClass || 'bg-zinc-850';
        this.borderClass = options.borderClass || 'border-zinc-800';

        if (!this.container) {
            console.error(`Container not found: ${containerSelector}`);
            return;
        }
        
        this.initialize();
    }
    
    initialize() {
        // Find all sliders within the container
        this.sliders = this.container.querySelectorAll('input[type="range"]');
        
        // Add event listeners to each slider
        this.sliders.forEach(slider => {
            // Mouse events
            slider.addEventListener('mousedown', this.handleStart.bind(this));
            slider.addEventListener('mouseup', this.handleEnd.bind(this));
            slider.addEventListener('mouseleave', this.handleEnd.bind(this));
            
            // Touch events
            slider.addEventListener('touchstart', this.handleStart.bind(this));
            slider.addEventListener('touchend', this.handleEnd.bind(this));
            slider.addEventListener('touchcancel', this.handleEnd.bind(this));
            
            // Click events (for non-drag interactions)
            slider.addEventListener('click', this.handleClick.bind(this));
        });
    }
    
    handleStart(event) {
        if (this.isDragging) return;
        
        this.isDragging = true;
        this.activeSlider = event.target;
        
        // Fade out all elements except the active slider
        this.fadeOutUI();
    }
    
    handleEnd(event) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.activeSlider = null;
        
        // Fade in all elements
        this.fadeInUI();
    }
    
    handleClick(event) {
        // If we're not already dragging, simulate a quick fade out/in
        if (!this.isDragging) {
            this.handleStart(event);
            setTimeout(() => this.handleEnd(event), this.fadeDuration);
        }
    }
    
    fadeOutUI() {
        // Get all elements in the container except the active slider and its parent
        const elements = Array.from(this.container.querySelectorAll('*')).filter(
            element => {
                // Skip the active slider and its direct parent
                if (element === this.activeSlider || element === this.activeSlider.parentElement) {
                    return false;
                }
                // Skip elements that contain the active slider
                if (element.contains(this.activeSlider)) {
                    return false;
                }
                return true;
            }
        );
        
        // Apply fade effect to all elements including background
        elements.forEach(element => {
            // Only apply to elements that are visible and not already transparent
            if (element.offsetParent !== null && element.style.opacity !== '0') {
                element.style.transition = `opacity ${this.fadeDuration}ms ease-out`;
                element.style.opacity = this.fadeOpacity;
            }
        });
        
        // Handle container background and border
        if (this.container.classList.contains(this.backgroundClass)) {
            // Store original styles if not already stored
            if (!this.originalStyles) {
                const computedStyle = window.getComputedStyle(this.container);
                this.originalStyles = {
                    background: computedStyle.backgroundColor,
                    borderColor: computedStyle.borderColor
                };
            }
            
            // Convert background color to rgba and set opacity
            const bgRgba = this.originalStyles.background.match(/\d+/g);
            if (bgRgba && bgRgba.length >= 3) {
                this.container.style.transition = `background-color ${this.fadeDuration}ms ease-out, border-color ${this.fadeDuration}ms ease-out`;
                this.container.style.backgroundColor = `rgba(${bgRgba[0]}, ${bgRgba[1]}, ${bgRgba[2]}, ${this.fadeOpacity})`;
            }
            
            // Convert border color to rgba and set opacity
            const borderRgba = this.originalStyles.borderColor.match(/\d+/g);
            if (borderRgba && borderRgba.length >= 3) {
                this.container.style.borderColor = `rgba(${borderRgba[0]}, ${borderRgba[1]}, ${borderRgba[2]}, ${this.fadeOpacity})`;
            }
        }
        
        // Ensure active slider and its parent stay fully visible
        if (this.activeSlider) {
            this.activeSlider.style.opacity = '1';
            if (this.activeSlider.parentElement) {
                this.activeSlider.parentElement.style.opacity = '1';
            }
        }
    }
    
    fadeInUI() {
        // Get all elements in the container
        const elements = Array.from(this.container.querySelectorAll('*'));
        
        // Remove fade effect from all elements
        elements.forEach(element => {
            if (element.style.opacity !== '1') {
                element.style.transition = `opacity ${this.fadeDuration}ms ease-in`;
                element.style.opacity = '1';
            }
        });
        
        // Restore container background and border
        if (this.container.classList.contains(this.backgroundClass) && this.originalStyles) {
            this.container.style.transition = `background-color ${this.fadeDuration}ms ease-in, border-color ${this.fadeDuration}ms ease-in`;
            this.container.style.backgroundColor = this.originalStyles.background;
            this.container.style.borderColor = this.originalStyles.borderColor;
        }
    }
    
    // Cleanup method to remove event listeners
    destroy() {
        this.sliders.forEach(slider => {
            slider.removeEventListener('mousedown', this.handleStart);
            slider.removeEventListener('mouseup', this.handleEnd);
            slider.removeEventListener('mouseleave', this.handleEnd);
            slider.removeEventListener('touchstart', this.handleStart);
            slider.removeEventListener('touchend', this.handleEnd);
            slider.removeEventListener('touchcancel', this.handleEnd);
            slider.removeEventListener('click', this.handleClick);
        });
    }
} 