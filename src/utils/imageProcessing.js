import imageCompression from 'browser-image-compression';

function applySharpness(data, width, height, amount) {
  const factor = amount * 0.1;
  const kernel = [
    [0, -factor, 0],
    [-factor, 1 + 4 * factor, -factor],
    [0, -factor, 0]
  ];
  
  const temp = new Uint8ClampedArray(data.length);
  temp.set(data);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        const i = (y * width + x) * 4 + c;
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += temp[idx] * kernel[ky + 1][kx + 1];
          }
        }
        data[i] = sum;
      }
    }
  }
}

export async function processImages(images) {
  try {
    const processedImages = await Promise.all(
      images.map(async (imgData) => {  // Changed from imageData to imgData
        const blob = await fetch(imgData).then(r => r.blob());
        
        const canvas = document.createElement('canvas');
        const img = await createImageBitmap(blob);
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        // First pass: optimize for printed text clarity
        ctx.filter = 'contrast(1.7) brightness(1.1) saturate(0.1) blur(0px)';  // Higher contrast for printed text
        ctx.drawImage(img, 0, 0);
        
        // Apply sharper kernel for printed text
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        applySharpness(imageData.data, canvas.width, canvas.height, 1.4);  // Increased sharpness for crisp letters
        ctx.putImageData(imageData, 0, 0);
        
        // Apply color temperature adjustment (4500K - slightly cool)
        ctx.fillStyle = 'rgba(184, 205, 255, 0.1)'; // Slight blue tint
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
        
        // Second pass: slightly darken the right side (location area)
        ctx.filter = 'brightness(0.95)';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(canvas.width * 0.7, 0, canvas.width * 0.3, canvas.height);
        
        // Convert to binary with different thresholds for different regions
        // Simplified thresholds optimized for printed text
        const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = pixelData.data;
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            const avg = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
            
            let threshold = 135; // Lower base threshold for consistent printed text
            if (x > canvas.width * 0.7) { // Location area
              threshold = 132; // More lenient for room numbers
            } else if (x > canvas.width * 0.4) { // Time/description area
              threshold = 134; // Adjusted for main content
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