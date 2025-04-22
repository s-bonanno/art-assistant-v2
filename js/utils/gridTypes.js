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

// Grid type registry
const gridTypes = {
    square: new SquareGrid(),
    diagonal: new DiagonalGrid(),
    none: new NoGrid()
};

// Export the grid types and registry
export { gridTypes }; 