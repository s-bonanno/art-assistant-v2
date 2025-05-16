export class BaseFilter {
    constructor(name) {
        this.name = name;
        this.active = false;
        this.properties = {};
    }

    // Method to apply the filter to image data
    apply(imageData) {
        if (!this.active) return imageData;
        return this._process(imageData);
    }

    // Abstract method to be implemented by specific filters
    _process(imageData) {
        throw new Error('_process method must be implemented by filter subclass');
    }

    // Method to reset all properties to their default values
    reset() {
        this.active = false;
        // Don't reset properties to 0, let each filter handle its own reset
    }

    // Method to update a property value
    setProperty(name, value) {
        if (name in this.properties) {
            this.properties[name] = value;
        }
    }

    // Method to get a property value
    getProperty(name) {
        return this.properties[name];
    }

    // Method to check if the filter has changed
    hasChanged() {
        return this.active && Object.values(this.properties).some(value => value !== 0);
    }
} 