# Artist Grid Reference Tool

A web-based tool for artists to analyze and manipulate reference images with various filters and grid overlays.

## Features

- Image upload and manipulation
- Grid overlay system with customizable units
- Multiple filter effects:
  - Light adjustments (exposure, contrast, highlights, shadows)
  - Hue/Saturation adjustments
  - Shape analysis filters
  - Edge detection
  - Blur effects
- Real-time preview
- Responsive design

## Development Guide

### Adding New Filters

1. **Create the Filter Class**
```javascript
// js/filters/NewFilter.js
import { BaseFilter } from './BaseFilter.js';

export class NewFilter extends BaseFilter {
    constructor() {
        super('newFilter'); // Name must match what we'll use in the UI
        this.properties = {
            propertyName: 0  // Initialize all properties with default values
        };
    }

    // Required: Handle property updates
    updateProperties(newProperties) {
        Object.assign(this.properties, newProperties);
    }

    // Required: Process the image data
    _process(imageData) {
        if (!this.active) return imageData;

        // Process the image data
        // IMPORTANT: Modify imageData.data directly or use imageData.data.set()
        // Return the modified imageData
        return imageData;
    }

    // Required: Reset filter state
    reset() {
        this.active = false;
        // Reset all properties to default values
        this.properties.propertyName = 0;
    }

    // Optional: Override to better detect when filter has an effect
    hasChanged() {
        return this.active && this.properties.propertyName !== 0;
    }
}
```

2. **Register the Filter**
```javascript
// js/filters/init.js
import { NewFilter } from './NewFilter.js';

// Add to imports
export function initFilters(drawCanvas) {
    // ... existing filters ...

    // Create and register new filter
    const newFilter = new NewFilter();
    filterManager.registerFilter(newFilter);

    // Initialize UI controls
    filterUIManager.initFilterControls('newFilter', [
        { id: 'propertyName', min: 0, max: 100, step: 1 }
    ]);
}
```

3. **Add UI Elements**
```html
<!-- index.html -->
<!-- Add to filter tabs -->
<button class="tab-button" data-tab="newFilterTab">New Filter</button>

<!-- Add tab content -->
<div id="newFilterTab" class="tab-content hidden">
    <!-- Toggle switch -->
    <div class="flex items-center justify-between mb-4">
        <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="newFilterToggle" class="sr-only peer">
            <!-- ... toggle switch HTML ... -->
        </label>
        <button id="newFilterReset" class="text-xs text-zinc-400 hover:text-zinc-200">
            Reset
        </button>
    </div>
    
    <!-- Slider -->
    <div class="space-y-2">
        <div class="flex items-center justify-between">
            <label class="text-xs text-zinc-400">Property Name</label>
            <span class="text-xs text-zinc-400" id="propertyNameValue">0</span>
        </div>
        <input type="range" id="propertyName" min="0" max="100" step="1" value="0"
               class="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer">
    </div>
</div>
```

### Key Implementation Rules

- Always extend `BaseFilter`
- Use consistent property names between UI and filter class
- Modify `imageData.data` directly in `_process`
- Implement `updateProperties` to handle property changes
- Override `hasChanged` if the default behavior isn't sufficient
- Register the filter in `init.js`
- Initialize UI controls with proper slider configurations
- Match HTML element IDs with the property names

### Common Issues to Avoid

- Don't return new ImageData objects, modify the input
- Don't forget to implement `updateProperties`
- Don't use different property names in UI vs filter class
- Don't forget to register the filter in `init.js`
- Don't forget to initialize UI controls

### Testing Checklist

- Toggle switch activates/deactivates filter
- Slider updates preview in real-time
- Reset button works
- Filter state persists correctly
- Preview updates when adjusting values
- No performance issues with filter application

## Project Structure

```
├── index.html              # Main HTML file
├── js/
│   ├── filters/           # Filter implementations
│   │   ├── BaseFilter.js  # Base filter class
│   │   ├── init.js        # Filter initialization
│   │   └── ...           # Individual filter implementations
│   ├── utils/            # Utility functions
│   └── script.js         # Main application logic
└── styles/               # CSS styles
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 