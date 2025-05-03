export class FilterUIManager {
    constructor(filterManager) {
        this.filterManager = filterManager;
        this.controls = new Map();
        this.onFilterChange = null;
        this._initFilterTabs();
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
                            const resetValue = valueDisplay.dataset.resetValue || "0";
                            element.value = resetValue;
                            
                            // Display "All colours" when blockBandDepth is set to 1
                            if (element.id === 'blockBandDepth' && resetValue === "1") {
                                valueDisplay.textContent = "All colours";
                            } else if (element.id === 'shapeOpacity' && resetValue !== "0") {
                                valueDisplay.textContent = `${resetValue}%`;
                            } else {
                                valueDisplay.textContent = resetValue;
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
                
                // Special display for blockBandDepth value 1
                if (id === 'blockBandDepth' && filter.getProperty(id) === 1) {
                    valueDisplay.textContent = "All colours";
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

                    // For blockBandDepth values 0 and 1, both should turn off the filter
                    let value = parseInt(e.target.value);
                    
                    filter.setProperty(id, value);
                    
                    // Update display value
                    if (id === 'blockBandDepth' && value === 1) {
                        valueDisplay.textContent = "All colours";
                    } else if (id === 'shapeOpacity') {
                        valueDisplay.textContent = `${e.target.value}%`;
                    } else {
                        valueDisplay.textContent = value;
                    }
                    
                    this.filterManager.cache.needsUpdate = true;
                    if (this.onFilterChange) {
                        this.onFilterChange();
                    }
                });
            }
        });
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
                
                // Force refresh of sliders by replacing them
                this._refreshBlockBandDepthSlider(filter, value);
                this._refreshNotanBandsSlider(filter, value);
                
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
        newSlider.min = '1';
        newSlider.max = maxValue.toString();
        newSlider.step = '1';
        newSlider.value = currentValue.toString();
        newSlider.className = 'w-full';
        
        // Clone the event listeners
        newSlider.addEventListener('input', (e) => {
            let value = parseInt(e.target.value);
            filter.setProperty('blockBandDepth', value);
            
            if (value === 1) {
                oldValueDisplay.textContent = "All colours";
            } else {
                oldValueDisplay.textContent = value;
            }
            
            this.filterManager.cache.needsUpdate = true;
            if (this.onFilterChange) {
                this.onFilterChange();
            }
        });
        
        // Update display value
        if (currentValue === 1) {
            oldValueDisplay.textContent = "All colours";
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
    
    _refreshNotanBandsSlider(filter, maxValue) {
        const sliderContainer = document.getElementById('notanControls');
        if (!sliderContainer) return;
        
        // Get the current slider and value display
        const oldSlider = document.getElementById('notanBands');
        const oldValueDisplay = document.getElementById('notanBandsValue');
        
        if (!oldSlider || !oldValueDisplay) return;
        
        // Get current value and ensure it doesn't exceed the new max
        let currentValue = parseInt(oldSlider.value);
        if (currentValue > maxValue) {
            currentValue = maxValue;
            filter.setProperty('notanBands', currentValue);
        }
        
        // Create a new slider with the updated max value
        const newSlider = document.createElement('input');
        newSlider.type = 'range';
        newSlider.id = 'notanBands';
        newSlider.min = '0';
        newSlider.max = maxValue.toString();
        newSlider.step = '1';
        newSlider.value = currentValue.toString();
        newSlider.className = 'w-full';
        
        // Clone the event listeners
        newSlider.addEventListener('input', (e) => {
            let value = parseInt(e.target.value);
            filter.setProperty('notanBands', value);
            oldValueDisplay.textContent = value;
            
            this.filterManager.cache.needsUpdate = true;
            if (this.onFilterChange) {
                this.onFilterChange();
            }
        });
        
        // Update display value
        oldValueDisplay.textContent = currentValue;
        
        // Replace the old slider with the new one
        oldSlider.parentNode.replaceChild(newSlider, oldSlider);
        
        // Update the control references in the map
        const controls = this.controls.get('shape');
        if (controls && controls.sliders) {
            for (let i = 0; i < controls.sliders.length; i++) {
                if (controls.sliders[i].element && controls.sliders[i].element.id === 'notanBands') {
                    controls.sliders[i].element = newSlider;
                    break;
                }
            }
        }
    }

    _initShapeFilterTypeControls(filter) {
        const notanBtn = document.getElementById('notanFilterTypeBtn');
        const blockInBtn = document.getElementById('blockInFilterTypeBtn');
        const notanControls = document.getElementById('notanControls');
        const blockInControls = document.getElementById('blockInControls');
        
        if (notanBtn && blockInBtn) {
            // Set initial state based on filter.properties.filterType
            this._updateShapeFilterTypeUI(filter.properties.filterType);
            
            // Setup button click handlers
            notanBtn.addEventListener('click', () => {
                filter.setProperty('filterType', 'notan');
                this._updateShapeFilterTypeUI('notan');
                
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
        }
    }

    _updateShapeFilterTypeUI(filterType) {
        const notanBtn = document.getElementById('notanFilterTypeBtn');
        const blockInBtn = document.getElementById('blockInFilterTypeBtn');
        const notanControls = document.getElementById('notanControls');
        const blockInControls = document.getElementById('blockInControls');
        
        if (filterType === 'notan') {
            // Update buttons
            notanBtn.setAttribute('data-active', 'true');
            blockInBtn.setAttribute('data-active', 'false');
            
            // Update controls visibility
            notanControls.classList.remove('hidden');
            blockInControls.classList.add('hidden');
        } else if (filterType === 'blockIn') {
            // Update buttons
            notanBtn.setAttribute('data-active', 'false');
            blockInBtn.setAttribute('data-active', 'true');
            
            // Update controls visibility
            notanControls.classList.add('hidden');
            blockInControls.classList.remove('hidden');
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
            { id: 'notanBands', min: 0, max: 8, step: 1 },
            { id: 'blockBandDepth', min: 1, max: 6, step: 1 },
            { id: 'shapeOpacity', min: 0, max: 100, step: 1 }
        ];

        this.initFilterControls('light', lightSliderConfigs);
        this.initFilterControls('hueSaturation', hueSaturationSliderConfigs);
        this.initFilterControls('shape', shapeSliderConfigs);
    }

    // Set the callback for when filters change
    setOnFilterChange(callback) {
        this.onFilterChange = callback;
    }
} 