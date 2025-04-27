export class FilterUIManager {
    constructor(filterManager) {
        this.filterManager = filterManager;
        this.controls = new Map();
        this.onFilterChange = null;
    }

    // Initialize UI controls for a filter
    initFilterControls(filterName, sliderConfigs) {
        const filter = this.filterManager.getFilter(filterName);
        if (!filter) return;

        // Create toggle control
        this._createToggleControl(filterName, filter);

        // Create reset control
        this._createResetControl(filterName, filter, sliderConfigs);

        // Create slider controls
        this._createSliderControls(filterName, filter, sliderConfigs);

        // Store the controls for this filter
        this.controls.set(filterName, {
            toggle: document.getElementById(`${filterName}FilterToggle`),
            reset: document.getElementById(`${filterName}FilterReset`),
            sliders: sliderConfigs.map(config => ({
                element: document.getElementById(config.id),
                valueDisplay: document.getElementById(`${config.id}Value`)
            }))
        });
    }

    _createToggleControl(filterName, filter) {
        const toggleElement = document.getElementById(`${filterName}FilterToggle`);
        if (toggleElement) {
            toggleElement.checked = filter.active;
            toggleElement.addEventListener('change', (e) => {
                filter.active = e.target.checked;
                this.filterManager.cache.needsUpdate = true;
                if (this.onFilterChange) {
                    this.onFilterChange();
                }
            });
        }
    }

    _createResetControl(filterName, filter, sliderConfigs) {
        const resetElement = document.getElementById(`${filterName}FilterReset`);
        if (resetElement) {
            resetElement.addEventListener('click', () => {
                filter.reset();
                filter.active = false;

                // Update UI
                const controls = this.controls.get(filterName);
                if (controls) {
                    controls.toggle.checked = false;
                    controls.sliders.forEach(({ element, valueDisplay }) => {
                        if (element && valueDisplay) {
                            element.value = 0;
                            valueDisplay.textContent = '0';
                        }
                    });
                }

                this.filterManager.cache.needsUpdate = true;
                if (this.onFilterChange) {
                    this.onFilterChange();
                }
            });
        }
    }

    _createSliderControls(filterName, filter, sliderConfigs) {
        sliderConfigs.forEach(({ id, min, max, step }) => {
            const slider = document.getElementById(id);
            const valueDisplay = document.getElementById(`${id}Value`);

            if (slider && valueDisplay) {
                // Set initial values
                slider.value = filter.getProperty(id);
                valueDisplay.textContent = filter.getProperty(id);

                // Set min, max, and step attributes
                slider.min = min;
                slider.max = max;
                slider.step = step;

                slider.addEventListener('input', (e) => {
                    // Auto-activate the filter if it's inactive
                    if (!filter.active) {
                        filter.active = true;
                        const controls = this.controls.get(filterName);
                        if (controls && controls.toggle) {
                            controls.toggle.checked = true;
                        }
                    }

                    filter.setProperty(id, parseInt(e.target.value));
                    valueDisplay.textContent = e.target.value;
                    this.filterManager.cache.needsUpdate = true;
                    if (this.onFilterChange) {
                        this.onFilterChange();
                    }
                });
            }
        });
    }

    // Initialize all filter controls
    initAllFilterControls() {
        // Light filter configuration
        const lightSliderConfigs = [
            { id: 'exposure', min: -100, max: 100, step: 1 },
            { id: 'contrast', min: -100, max: 100, step: 1 },
            { id: 'highlights', min: -100, max: 100, step: 1 },
            { id: 'shadows', min: -100, max: 100, step: 1 }
        ];

        this.initFilterControls('light', lightSliderConfigs);

        // Add other filter configurations here as needed
    }

    // Set the callback for when filters change
    setOnFilterChange(callback) {
        this.onFilterChange = callback;
    }
} 