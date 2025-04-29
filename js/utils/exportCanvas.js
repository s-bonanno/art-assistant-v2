/**
 * Export utility for canvas elements
 * Handles both mobile and desktop export scenarios
 */

// Mobile browser detection
const isMobileBrowser = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /android|iphone|ipad|ipod/i.test(userAgent.toLowerCase());
};

// Create a temporary HTML page for mobile export
const createMobileExportPage = (imageData) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    background: #000;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                .container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                    padding: 16px;
                    max-width: 100%;
                }
                img {
                    max-width: 100%;
                    height: auto;
                }
                .tip {
                    color: #a1a1aa;
                    font-size: 12px;
                    padding: 8px 16px;
                    background: #18181b;
                    border-radius: 6px;
                    border: 1px solid #27272a;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <img src="${imageData}" alt="Exported Canvas">
                <div class="tip">Tap and hold to save the image</div>
            </div>
        </body>
        </html>
    `;
    return html;
};

// Desktop export using toBlob
const desktopExport = (canvas) => {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Failed to create blob from canvas'));
                return;
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'artwork.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            resolve();
        }, 'image/png');
    });
};

// Mobile export by opening in new tab
const mobileExport = (canvas) => {
    return new Promise((resolve) => {
        const imageData = canvas.toDataURL('image/png');
        const exportPage = createMobileExportPage(imageData);
        const blob = new Blob([exportPage], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        URL.revokeObjectURL(url);
        resolve();
    });
};

// Main export function
export const exportCanvas = (canvas) => {
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
        throw new Error('Invalid canvas element provided');
    }

    if (isMobileBrowser()) {
        return mobileExport(canvas);
    } else {
        return desktopExport(canvas);
    }
}; 