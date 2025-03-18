import imageCompression from 'browser-image-compression';

function applySharpness(data, width, height, amount) {
  const factor = amount * 0.1;
  const temp = new Uint8ClampedArray(data.length);
  temp.set(data);
  
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const i = (y * width + x) * 4;

      for (let c = 0; c < 3; c++) {
        const center = temp[i + c];
        const top = temp[i - width * 4 + c];
        const bottom = temp[i + width * 4 + c];
        const left = temp[i - 4 + c];
        const right = temp[i + 4 + c];
        
        data[i + c] = center * (1 + 4 * factor) - factor * (top + bottom + left + right);
      }
    }
  }
}

function applyGamma(data, gamma) {
  const gammaCorrection = 1 / gamma;
  for (let i = 0; i < data.length; i += 4) {
    for (let j = 0; j < 3; j++) {
      data[i + j] = Math.pow(data[i + j] / 255, gammaCorrection) * 255;
    }
  }
}

function applySimpleThreshold(data, threshold) {
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const value = gray > threshold ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = value;
  }
}

function applyVignetteCorrection(data, width, height, centerStrength) {
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      
      const factor = 1 + Math.pow (distance / maxDistance, 0.5) * centerStrength;
      
      for (let c = 0; c < 3; c++) {
        data[i + c] = Math.min(255, data[i + c] * factor);
      }
    }
  }
}

export async function processImage(imageUrl, brightness, torchEnabled) {
  try {
    const blob = await fetch(imageUrl).then(r => r.blob());
    const img = await createImageBitmap(blob);

    let variations = [
      {
        name: 'standard',
        contrast: 1.8,
        brightness: 1.1,
        sharpness: 1.5,
        threshold: 135
      },
      {
        name: 'lowLight', // Enhances dark images
        contrast: 2.2,
        brightness: 1.3,
        sharpness: 1.5,
        threshold: 125
      },
      {
        name: 'highLight', // Enhances bright images
        contrast: 1.8,
        brightness: 0.85,
        sharpness: 1.7,
        threshold: 145
      },
      {
        name: 'shadow',
        contrast: 1.9,
        brightness: 1.15,
        sharpness: 1.6,
        threshold: 130,
        gamma: 1.15
      },
      {
        name: 'text',
        contrast: 1.7,
        brightness: 1.0,
        sharpness: 1.6,
        threshold: 130,
        gamma: 1.1
      },
      {
        name: 'flashCorrection',
        contrast: 1.3,
        brightness: 0.95,
        sharpness: 1.8,
        threshold: 150,
        gamma: 1.5,
        vignetteStrength: 1.2
      }
    ];

    // Remove lowLight variant for brighter images
    if (brightness.brightnessScore > 0.60) {
      variations = variations.filter(v => v.name !== 'lowLight');
    }
    // Remove highLight variant for darker images
    if (brightness.brightnessScore < 0.65) {
      variations = variations.filter(v => v.name !== 'highLight');
    }

    if (!torchEnabled) {
      variations = variations.filter(v => v.name !== 'flashCorrection')
    }

    const debugImages = [];
    const processedVariations = await Promise.all(
      variations.map(async (variation, index) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = img.width;
        canvas.height = img.height;

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.filter = `contrast(${variation.contrast}) brightness(${variation.brightness}) saturate(0)`;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        if (variation.name == 'flashCorrection') {
          applyVignetteCorrection(imageData.data, canvas.width, canvas.height, variation.vignetteStrength);
        }
        applySharpness(imageData.data, canvas.width, canvas.height, variation.sharpness);
        if (variation.gamma) {
          applyGamma(imageData.data, variation.gamma);
        }
        applySimpleThreshold(imageData.data, variation.threshold);
        
        ctx.putImageData(imageData, 0, 0);

        const debugBlog = await new Promise(resolve =>
          canvas.toBlob(resolve, 'image/png', 1.0));
        debugImages.push({
          name: variation.name,
          url: URL.createObjectURL(debugBlog)
        })

        return imageData;
      })
    );

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = img.width;
    finalCanvas.height = img.height;
    const finalCtx = finalCanvas.getContext('2d');
    const finalData = finalCtx.getImageData(0, 0, finalCanvas.width, finalCanvas.height);

    for (let i = 0; i < finalData.data.length; i += 4) {
      let votes = 0;
      for (const variation of processedVariations) {
        votes += variation.data[i] > 127 ? 1 : 0;
      }

      const value = votes > processedVariations.length / 2 ? 255 : 0;
      finalData.data[i] = finalData.data[i + 1] = finalData.data[i + 2] = value;
      finalData.data[i + 3] = 255;
    }

    finalCtx.putImageData(finalData, 0, 0);

    const enhancedBlob = await new Promise((resolve) => {
      finalCanvas.toBlob(resolve, 'image/png', 1.0);
    });

    const compressedFile = await imageCompression(enhancedBlob, {
      maxSizeMB: 2,
      maxWidthOrHeight: 2400,
      useWebWorker: true,
      fileType: 'png',
      initialQuality: 1.0,
      alwaysKeepResolution: true
    })

    return {
      final: URL.createObjectURL(compressedFile),
      variations: debugImages
    };
    
  } catch (error) {
    console.error('Image processing failed:', error);
    return {
      final: imageUrl,
      variations: []
    };
  }
}