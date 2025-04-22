// Grid type interface
class GridType {
    draw(ctx, config, dimensions) {
        // To be implemented by concrete classes
        throw new Error('draw method must be implemented');
    }
}

class SquareGrid extends GridType {
    draw(ctx, config, dimensions) {
        const { width, height, gridSpacing } = dimensions;
        
        ctx.beginPath();
        ctx.strokeStyle = config.color;
        ctx.globalAlpha = config.opacity;
        ctx.lineWidth = config.lineWeight;

        // Draw vertical lines
        const numVerticalLines = Math.ceil(width / gridSpacing) + 1;
        for (let i = 0; i < numVerticalLines; i++) {
            const x = i * gridSpacing;
            // Ensure the last line is exactly at the right edge
            const finalX = i === numVerticalLines - 1 ? width - 0.5 : x;
            ctx.moveTo(finalX, 0);
            ctx.lineTo(finalX, height);
        }

        // Draw horizontal lines
        const numHorizontalLines = Math.ceil(height / gridSpacing) + 1;
        for (let i = 0; i < numHorizontalLines; i++) {
            const y = i * gridSpacing;
            // Ensure the last line is exactly at the bottom edge
            const finalY = i === numHorizontalLines - 1 ? height - 0.5 : y;
            ctx.moveTo(0, finalY);
            ctx.lineTo(width, finalY);
        }

        ctx.stroke();
    }
}

class DiagonalGrid extends GridType {
    draw(ctx, config, dimensions) {
        const { width, height } = dimensions;
        
        ctx.beginPath();
        ctx.strokeStyle = config.color;
        ctx.globalAlpha = config.opacity;
        ctx.lineWidth = config.lineWeight;

        // Draw diagonal line from top-left to bottom-right
        ctx.moveTo(0, 0);
        ctx.lineTo(width, height);

        // Draw diagonal line from top-right to bottom-left
        ctx.moveTo(width, 0);
        ctx.lineTo(0, height);

        ctx.stroke();
    }
}

class NoGrid extends GridType {
    draw(ctx, config, dimensions) {
        // Do nothing - no grid to draw
    }
}

class GoldenRatioGrid extends GridType {
    draw(ctx, config, dimensions) {
        const { width, height } = dimensions;
        const phi = 1.618033988749895; // Golden ratio
        const phiInverse = 1 / phi;
        
        ctx.beginPath();
        ctx.strokeStyle = config.color;
        ctx.globalAlpha = config.opacity;
        ctx.lineWidth = config.lineWeight;
        
        // Vertical lines at golden ratio points
        const v1 = width * phiInverse;
        const v2 = width * (1 - phiInverse);
        
        ctx.moveTo(v1, 0);
        ctx.lineTo(v1, height);
        ctx.moveTo(v2, 0);
        ctx.lineTo(v2, height);
        
        // Horizontal lines at golden ratio points
        const h1 = height * phiInverse;
        const h2 = height * (1 - phiInverse);
        
        ctx.moveTo(0, h1);
        ctx.lineTo(width, h1);
        ctx.moveTo(0, h2);
        ctx.lineTo(width, h2);
        
        ctx.stroke();
    }
}

class RuleOfThirdsGrid extends GridType {
    draw(ctx, config, dimensions) {
        const { width, height } = dimensions;
        
        ctx.beginPath();
        ctx.strokeStyle = config.color;
        ctx.globalAlpha = config.opacity;
        ctx.lineWidth = config.lineWeight;
        
        // Vertical lines at thirds
        const v1 = width / 3;
        const v2 = (width * 2) / 3;
        
        ctx.moveTo(v1, 0);
        ctx.lineTo(v1, height);
        ctx.moveTo(v2, 0);
        ctx.lineTo(v2, height);
        
        // Horizontal lines at thirds
        const h1 = height / 3;
        const h2 = (height * 2) / 3;
        
        ctx.moveTo(0, h1);
        ctx.lineTo(width, h1);
        ctx.moveTo(0, h2);
        ctx.lineTo(width, h2);
        
        ctx.stroke();
    }
}

// Grid type registry
const gridTypes = {
    square: new SquareGrid(),
    diagonal: new DiagonalGrid(),
    none: new NoGrid(),
    golden: new GoldenRatioGrid(),
    thirds: new RuleOfThirdsGrid()
};

// Export the grid types and registry
export { gridTypes }; 