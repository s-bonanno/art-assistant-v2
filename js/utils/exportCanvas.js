/**
 * Export utility for canvas elements
 * Handles both mobile and desktop export scenarios
 */

// Mobile browser detection
function isMobileBrowser() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const platform = navigator.platform;
    const maxTouchPoints = navigator.maxTouchPoints;
    
    // Check for mobile keywords in user agent
    const isMobileUA = /android|iphone|ipad|ipod|mobile/i.test(userAgent.toLowerCase());
    
    // Check for mobile platform
    const isMobilePlatform = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(platform);
    
    // Check for touch capability and viewport size
    const isSmallTouchDevice = maxTouchPoints > 0 && window.innerWidth <= 768;
    
    return isMobileUA || isMobilePlatform || isSmallTouchDevice;
}

// Create a temporary HTML page for mobile export
function createMobileExportPage(imageData) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    margin: 0;
                    padding: 20px;
                    background: #1f1f23;
                    color: white;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    text-align: center;
                }
                img {
                    max-width: 100%;
                    height: auto;
                    margin: 20px 0;
                    border-radius: 8px;
                }
                .instructions {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 15px;
                    border-radius: 8px;
                    margin-top: 20px;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <img src="${imageData}" alt="Your artwork">
            <div class="instructions">
                <p>To save your artwork:</p>
                <p>1. Touch and hold the image above</p>
                <p>2. Select "Save Image" from the menu</p>
            </div>
        </body>
        </html>
    `;
}

// Main export function
function exportCanvas(canvas) {
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
        throw new Error('Invalid canvas element provided');
    }

    const isMobile = isMobileBrowser();
    
    if (isMobile) {
        // For mobile, create a temporary iframe
        const imageData = canvas.toDataURL('image/png');
        const exportPage = createMobileExportPage(imageData);
        
        // Create and configure the iframe
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.zIndex = '9999';
        iframe.style.backgroundColor = '#1f1f23';
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.position = 'fixed';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
        closeButton.style.zIndex = '10000';
        closeButton.style.background = 'rgba(255, 255, 255, 0.1)';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '50%';
        closeButton.style.width = '40px';
        closeButton.style.height = '40px';
        closeButton.style.fontSize = '24px';
        closeButton.style.cursor = 'pointer';
        
        // Add click handler to close
        closeButton.onclick = () => {
            document.body.removeChild(iframe);
            document.body.removeChild(closeButton);
        };
        
        // Append elements to body
        document.body.appendChild(iframe);
        document.body.appendChild(closeButton);
        
        // Write the content to the iframe
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(exportPage);
        iframe.contentWindow.document.close();
    } else {
        // For desktop, use direct download
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = 'artwork.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Make the function available globally
window.exportCanvas = exportCanvas; 