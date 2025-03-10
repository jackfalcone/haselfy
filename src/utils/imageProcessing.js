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
      images.map(async (imgData) => {
        const blob = await fetch(imgData).then(r => r.blob());
        
        const canvas = document.createElement('canvas');
        const img = await createImageBitmap(blob);
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        // Optimize for text clarity
        ctx.filter = 'contrast(1.8) brightness(1.15) saturate(0) blur(0px)';
        ctx.drawImage(img, 0, 0);
        
        // Apply sharpness
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        applySharpness(imageData.data, canvas.width, canvas.height, 1.6);
        ctx.putImageData(imageData, 0, 0);
        
        // Convert to binary
        const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = pixelData.data;
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            const avg = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
            const threshold = x > canvas.width * 0.7 ? 135 : 140;
            const value = avg > threshold ? 255 : 0;
            data[i] = data[i + 1] = data[i + 2] = value;
          }
        }
        ctx.putImageData(pixelData, 0, 0);
        
        const enhancedBlob = await new Promise(resolve => {
          canvas.toBlob(resolve, 'image/png', 1.0);
        });
        
        const compressedFile = await imageCompression(enhancedBlob, {
          maxSizeMB: 2,
          maxWidthOrHeight: 1920, // Reduced from 3840
          useWebWorker: true,
          fileType: 'png',
          initialQuality: 0.9, // Slightly reduced quality
          alwaysKeepResolution: false // Allow resizing
        });

        return URL.createObjectURL(compressedFile);
      })
    );

    return processedImages;
  } catch (error) {
    console.error('Image processing failed:', error);
    return [images[0]];
  }
}