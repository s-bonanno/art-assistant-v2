import { disableOriginalViewIfActive } from '../utils/originalImage.js';

export class FilterUIManager {
    constructor(filterManager) {
        this.filterManager = filterManager;
        this.controls = new Map();
        this.onFilterChange = null;
        this._initFilterTabs();
        this._initLightFilter();
        this._initHueSaturationFilter();
        this._initShapeFilter();
        this._initEdgeFilter();
        this._initBlurFilter();
        this._initTabButtons();
        this._initResetAllButton();
    }

    _initFilterTabs() {
        const filterTabs = document.querySelectorAll('#filtersPanel .tab-button');
        const filterContents = document.querySelectorAll('#filtersPanel .tab-content');

        filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs and contents
                filterTabs.forEach(t => t.classList.remove('active'));
                filterContents.forEach(c => c.classList.add('hidden'));
                
                // Add active class to clicked tab and show corresponding content
                tab.classList.add('active');
                const contentId = tab.dataset.tab;
                document.getElementById(contentId).classList.remove('hidden');
            });
        });
        
        // Ensure proper tab selection when filter panel is opened
        document.querySelector('[data-panel="filtersPanel"]').addEventListener('click', () => {
            // Check if any tab is already active, if not select the Light tab by default
            const activeTab = document.querySelector('#filtersPanel .tab-button.active');
            if (!activeTab) {
                // Select the Light tab and its content
                const lightTab = document.querySelector('#filtersPanel .tab-button[data-tab="lightTab"]');
                const lightContent = document.getElementById('lightTab');
                
                if (lightTab && lightContent) {
                    // Activate the Light tab and show its content
                    filterTabs.forEach(t => t.classList.remove('active'));
                    filterContents.forEach(c => c.classList.add('hidden'));
                    
                    lightTab.classList.add('active');
                    lightContent.classList.remove('hidden');
                }
            }
        });
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

        // Initialize shape filter special controls if this is the shape filter
        if (filterName === 'shape') {
            this._initShapeFilterTypeControls(filter);
            this._initTotalBandsControl(filter);
        }

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

        // Add multiply mode toggle for edge filter
        if (filterName === 'edge') {
            const multiplyElement = document.getElementById(`${filterName}FilterMultiply`);
            if (multiplyElement) {
                multiplyElement.checked = filter.properties.multiplyMode;
                multiplyElement.addEventListener('change', (e) => {
                    filter.properties.multiplyMode = e.target.checked;
                    this.filterManager.cache.needsUpdate = true;
                    if (this.onFilterChange) {
                        this.onFilterChange();
                    }
                });
            }
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
                    // Reset multiply mode for edge filter
                    if (filterName === 'edge') {
                        const multiplyElement = document.getElementById(`${filterName}FilterMultiply`);
                        if (multiplyElement) {
                            multiplyElement.checked = false;
                        }
                    }
                    controls.sliders.forEach(({ element, valueDisplay }) => {
                        if (element && valueDisplay) {
                            // Get the default value from the filter's properties
                            const defaultValue = filter.properties[element.id] || 0;
                            element.value = defaultValue;
                            
                            // Update the display value
                            if (element.id === 'blockBandDepth' && defaultValue === 1) {
                                valueDisplay.textContent = "All";
                            } else if (element.id === 'shapeOpacity') {
                                valueDisplay.textContent = `${defaultValue}%`;
                            } else {
                                valueDisplay.textContent = defaultValue;
                            }
                        }
                    });
                }

                // For shape filter, also reset the dropdown and filter type UI
                if (filterName === 'shape') {
                    this._updateShapeFilterTypeUI(filter.properties.filterType);
                    
                    // Reset total bands dropdown
                    const totalBandsSelect = document.getElementById('totalBands');
                    if (totalBandsSelect) {
                        totalBandsSelect.value = filter.properties.totalBands;
                    }
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
                
                // Special display for blockBandDepth value 0
                if (id === 'blockBandDepth' && filter.getProperty(id) === 0) {
                    valueDisplay.textContent = "Off";
                } else if (id === 'shapeOpacity') {
                    valueDisplay.textContent = `${filter.getProperty(id)}%`;
                } else {
                    valueDisplay.textContent = filter.getProperty(id);
                }

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

                    // Update filter property
                    filter.setProperty(id, parseFloat(e.target.value));
                    
                    // Update display value
                    if (id === 'blockBandDepth' && e.target.value === '0') {
                        valueDisplay.textContent = "Off";
                    } else if (id === 'shapeOpacity') {
                        valueDisplay.textContent = `${e.target.value}%`;
                    } else {
                        valueDisplay.textContent = e.target.value;
                    }

                    // Disable original view if active
                    disableOriginalViewIfActive();

                    this.filterManager.cache.needsUpdate = true;
                    if (this.onFilterChange) {
                        this.onFilterChange();
                    }
                });
            }
        });
    }

    _initShapeFilterTypeControls(filter) {
        const colorBlocksBtn = document.getElementById('colorBlocksFilterTypeBtn');
        const blockInBtn = document.getElementById('blockInFilterTypeBtn');
        const invertMaskBtn = document.getElementById('invertMaskFilterTypeBtn');
        
        if (colorBlocksBtn && blockInBtn && invertMaskBtn) {
            // Set initial state based on filter.properties.filterType
            this._updateShapeFilterTypeUI(filter.properties.filterType);
            
            // Setup button click handlers
            colorBlocksBtn.addEventListener('click', () => {
                filter.setProperty('filterType', 'colorBlocks');
                this._updateShapeFilterTypeUI('colorBlocks');
                
                // Auto-activate the filter if it's inactive
                if (!filter.active) {
                    filter.active = true;
                    const controls = this.controls.get('shape');
                    if (controls && controls.toggle) {
                        controls.toggle.checked = true;
                    }
                }
                
                this.filterManager.cache.needsUpdate = true;
                if (this.onFilterChange) {
                    this.onFilterChange();
                }
            });
            
            blockInBtn.addEventListener('click', () => {
                filter.setProperty('filterType', 'blockIn');
                this._updateShapeFilterTypeUI('blockIn');
                
                // Auto-activate the filter if it's inactive
                if (!filter.active) {
                    filter.active = true;
                    const controls = this.controls.get('shape');
                    if (controls && controls.toggle) {
                        controls.toggle.checked = true;
                    }
                }
                
                this.filterManager.cache.needsUpdate = true;
                if (this.onFilterChange) {
                    this.onFilterChange();
                }
            });

            invertMaskBtn.addEventListener('click', () => {
                filter.setProperty('filterType', 'invertMask');
                this._updateShapeFilterTypeUI('invertMask');
                
                // Auto-activate the filter if it's inactive
                if (!filter.active) {
                    filter.active = true;
                    const controls = this.controls.get('shape');
                    if (controls && controls.toggle) {
                        controls.toggle.checked = true;
                    }
                }
                
                this.filterManager.cache.needsUpdate = true;
                if (this.onFilterChange) {
                    this.onFilterChange();
                }
            });
        }
    }

    _updateShapeFilterTypeUI(filterType) {
        const colorBlocksBtn = document.getElementById('colorBlocksFilterTypeBtn');
        const blockInBtn = document.getElementById('blockInFilterTypeBtn');
        const invertMaskBtn = document.getElementById('invertMaskFilterTypeBtn');
        
        if (filterType === 'colorBlocks') {
            // Update buttons
            colorBlocksBtn.setAttribute('data-active', 'true');
            blockInBtn.setAttribute('data-active', 'false');
            invertMaskBtn.setAttribute('data-active', 'false');
        } else if (filterType === 'blockIn') {
            // Update buttons
            colorBlocksBtn.setAttribute('data-active', 'false');
            blockInBtn.setAttribute('data-active', 'true');
            invertMaskBtn.setAttribute('data-active', 'false');
        } else if (filterType === 'invertMask') {
            // Update buttons
            colorBlocksBtn.setAttribute('data-active', 'false');
            blockInBtn.setAttribute('data-active', 'false');
            invertMaskBtn.setAttribute('data-active', 'true');
        }
    }

    _refreshBlockBandDepthSlider(filter, maxValue) {
        const sliderContainer = document.getElementById('blockInControls');
        if (!sliderContainer) return;
        
        // Get the current slider and value display
        const oldSlider = document.getElementById('blockBandDepth');
        const oldValueDisplay = document.getElementById('blockBandDepthValue');
        
        if (!oldSlider || !oldValueDisplay) return;
        
        // Get current value and ensure it doesn't exceed the new max
        let currentValue = parseInt(oldSlider.value);
        if (currentValue > maxValue) {
            currentValue = maxValue;
            filter.setProperty('blockBandDepth', currentValue);
        }
        
        // Create a new slider with the updated max value
        const newSlider = document.createElement('input');
        newSlider.type = 'range';
        newSlider.id = 'blockBandDepth';
        newSlider.min = '0';
        newSlider.max = maxValue.toString();
        newSlider.step = '1';
        newSlider.value = currentValue.toString();
        newSlider.className = 'w-full';
        
        // Clone the event listeners
        newSlider.addEventListener('input', (e) => {
            let value = parseInt(e.target.value);
            filter.setProperty('blockBandDepth', value);
            
            if (value === 0) {
                oldValueDisplay.textContent = "Off";
            } else {
                oldValueDisplay.textContent = value;
            }
            
            this.filterManager.cache.needsUpdate = true;
            if (this.onFilterChange) {
                this.onFilterChange();
            }
        });
        
        // Update display value
        if (currentValue === 0) {
            oldValueDisplay.textContent = "Off";
        } else {
            oldValueDisplay.textContent = currentValue;
        }
        
        // Replace the old slider with the new one
        oldSlider.parentNode.replaceChild(newSlider, oldSlider);
        
        // Update the control references in the map
        const controls = this.controls.get('shape');
        if (controls && controls.sliders) {
            for (let i = 0; i < controls.sliders.length; i++) {
                if (controls.sliders[i].element && controls.sliders[i].element.id === 'blockBandDepth') {
                    controls.sliders[i].element = newSlider;
                    break;
                }
            }
        }
    }

    _initTotalBandsControl(filter) {
        const totalBandsSelect = document.getElementById('totalBands');
        
        if (totalBandsSelect) {
            // Set initial value
            totalBandsSelect.value = filter.properties.totalBands;
            
            // Add event listener
            totalBandsSelect.addEventListener('change', (e) => {
                const value = parseInt(e.target.value);
                filter.setProperty('totalBands', value);
                
                // Force refresh of slider
                this._refreshBlockBandDepthSlider(filter, value);
                
                // Auto-activate the filter if it's inactive
                if (!filter.active) {
                    filter.active = true;
                    const controls = this.controls.get('shape');
                    if (controls && controls.toggle) {
                        controls.toggle.checked = true;
                    }
                }
                
                this.filterManager.cache.needsUpdate = true;
                if (this.onFilterChange) {
                    this.onFilterChange();
                }
            });
        }
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

        // Hue/Saturation filter configuration
        const hueSaturationSliderConfigs = [
            { id: 'saturation', min: -100, max: 100, step: 1 },
            { id: 'temperature', min: -100, max: 100, step: 1 }
        ];

        // Shape filter configuration
        const shapeSliderConfigs = [
            { id: 'blockBandDepth', min: 1, max: 6, step: 1 },
            { id: 'shapeOpacity', min: 0, max: 100, step: 1 }
        ];

        // Blur filter configuration
        const blurSliderConfigs = [
            { id: 'blurRadius', min: 0, max: 100, step: 1 }
        ];

        this.initFilterControls('light', lightSliderConfigs);
        this.initFilterControls('hueSaturation', hueSaturationSliderConfigs);
        this.initFilterControls('shape', shapeSliderConfigs);
        this.initFilterControls('blur', blurSliderConfigs);
    }

    // Set the callback for when filters change
    setOnFilterChange(callback) {
        this.onFilterChange = callback;
    }

    _initLightFilter() {
        // Implementation of _initLightFilter method
    }

    _initHueSaturationFilter() {
        // Implementation of _initHueSaturationFilter method
    }

    _initShapeFilter() {
        // Implementation of _initShapeFilter method
    }

    _initEdgeFilter() {
        // Implementation of _initEdgeFilter method
    }

    _initBlurFilter() {
        const blurSliderConfigs = [
            { id: 'blurRadius', min: 0, max: 100, step: 1 }
        ];
        this.initFilterControls('blur', blurSliderConfigs);
    }

    _initTabButtons() {
        // Implementation of _initTabButtons method
    }

    _initResetAllButton() {
        const resetAllBtn = document.getElementById('resetAllFiltersBtn');
        if (resetAllBtn) {
            resetAllBtn.addEventListener('click', () => {
                // Reset all filters
                this.filterManager.resetAllFilters();
                
                // Update UI for all filters
                for (const [filterName, controls] of this.controls) {
                    const filter = this.filterManager.getFilter(filterName);
                    if (!filter) continue;

                    if (controls.toggle) {
                        controls.toggle.checked = false;
                    }
                    
                    // Reset multiply mode for edge filter
                    if (filterName === 'edge') {
                        const multiplyElement = document.getElementById(`${filterName}FilterMultiply`);
                        if (multiplyElement) {
                            multiplyElement.checked = false;
                        }
                    }
                    
                    // Reset all sliders to their default values
                    controls.sliders.forEach(({ element, valueDisplay }) => {
                        if (element && valueDisplay) {
                            // Get the default value from the filter's properties
                            const defaultValue = filter.properties[element.id] || 0;
                            element.value = defaultValue;
                            
                            // Update the display value
                            if (element.id === 'blockBandDepth' && defaultValue === 1) {
                                valueDisplay.textContent = "All";
                            } else if (element.id === 'shapeOpacity') {
                                valueDisplay.textContent = `${defaultValue}%`;
                            } else {
                                valueDisplay.textContent = defaultValue;
                            }
                        }
                    });
                }
                
                // For shape filter, also reset the dropdown and filter type UI
                const shapeFilter = this.filterManager.getFilter('shape');
                if (shapeFilter) {
                    this._updateShapeFilterTypeUI(shapeFilter.properties.filterType);
                    
                    // Reset total bands dropdown
                    const totalBandsSelect = document.getElementById('totalBands');
                    if (totalBandsSelect) {
                        totalBandsSelect.value = shapeFilter.properties.totalBands;
                    }
                }
                
                // Trigger filter change callback
                if (this.onFilterChange) {
                    this.onFilterChange();
                }
            });
        }
    }
} 