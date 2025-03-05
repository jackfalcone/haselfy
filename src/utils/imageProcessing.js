import imageCompression from 'browser-image-compression';

export async function processImages(images) {
  try {
    const processedImages = await Promise.all(
      images.map(async (imageData) => {
        const blob = await fetch(imageData).then(r => r.blob());
        
        const canvas = document.createElement('canvas');
        const img = await createImageBitmap(blob);
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        // First pass: enhance overall text
        ctx.filter = 'contrast(1.4) brightness(1.05) saturate(0.7)';
        ctx.drawImage(img, 0, 0);
        
        // Second pass: slightly darken the right side (location area)
        ctx.filter = 'brightness(0.95)';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(canvas.width * 0.7, 0, canvas.width * 0.3, canvas.height);
        
        // Convert to binary with different thresholds for different regions
        const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = pixelData.data;
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            const avg = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
            
            // Different thresholds for different parts of the text
            let threshold = 128;
            if (x > canvas.width * 0.7) {  // Location area
              threshold = 120;  // Slightly more sensitive for location text
            } else if (x > canvas.width * 0.4) {  // Organizer area
              threshold = 125;  // Medium sensitivity for organizer names
            }
            
            const value = avg > threshold ? 255 : 0;
            data[i] = data[i + 1] = data[i + 2] = value;
          }
        }
        ctx.putImageData(pixelData, 0, 0);
        
        // Rest of the processing remains the same
        const enhancedBlob = await new Promise(resolve => {
          canvas.toBlob(resolve, 'image/png', 1.0);
        });
        
        const compressedFile = await imageCompression(enhancedBlob, {
          maxSizeMB: 4,
          maxWidthOrHeight: 3840,
          useWebWorker: true,
          fileType: 'png',
          initialQuality: 1,
          alwaysKeepResolution: true,
          onProgress: () => {}
        });

        return URL.createObjectURL(compressedFile);
      })
    );

    return processedImages[0];
  } catch (error) {
    console.error('Image processing failed:', error);
    return images[0];
  }
}