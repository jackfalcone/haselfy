const getImageData = async (imageUrl) => {
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(ctx.getImageData(0, 0, img.width, img.height));
        } catch (err) {
          reject({ success: false, issues: ['Failed to process image data'] });
        }
      };
      img.onerror = () => reject({ success: false, issues: ['Failed to load image'] });
      img.src = imageUrl;
    });
  } catch (error) {
    return { success: false, issues: [error.message || 'Image processing failed'] };
  }
};

export const isImageSharp = async (imageUrl) => {
  const imageData = await getImageData(imageUrl);
  const { data, width, height } = imageData;
  let sobelSum = 0;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      
      // Calculate grayscale values for 3x3 kernel
      const grayValues = [];
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const i = ((y + ky) * width + (x + kx)) * 4;
          grayValues.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        }
      }
      
      // Sobel operators
      const gx = grayValues[0] - grayValues[2] + 2 * grayValues[3] - 2 * grayValues[5] + grayValues[6] - grayValues[8];
      const gy = grayValues[0] + 2 * grayValues[1] + grayValues[2] - grayValues[6] - 2 * grayValues[7] - grayValues[8];
      
      sobelSum += Math.sqrt(gx * gx + gy * gy);
    }
  }
  
  const sharpnessScore = sobelSum / (width * height);

  return {
    isSharp: sharpnessScore >20,
    sharpnessScore
  }
};

export const isBrightnessGood = async (imageUrl) => {
  const imageData = await getImageData(imageUrl);
  const { data } = imageData;
  const histogram = new Array(256).fill(0);
  const pixelCount = data.length / 4;
  
  // Build histogram
  for (let i = 0; i < data.length; i += 4) {
    const luminance = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    histogram[luminance]++;
  }
  
  // Calculate percentiles
  let sum = 0;
  const p5 = pixelCount * 0.05;
  const p95 = pixelCount * 0.95;
  let darkPixels = 0;
  let brightPixels = 0;
  
  for (let i = 0; i < 256; i++) {
    sum += histogram[i];
    if (sum < p5) darkPixels += histogram[i];
    if (sum > p95) brightPixels += histogram[i];
  }
  
  const darkRatio = darkPixels / pixelCount;
  const brightRatio = brightPixels / pixelCount;
  
  return {
    isGood: darkRatio < 0.15 && brightRatio < 0.15,
    darkRatio,
    brightRatio
  }
};

export const isMotionBlurLow = async (imageUrl) => {
  const imageData = await getImageData(imageUrl);
  const { data, width, height } = imageData;
  let horizontalBlur = 0;
  let verticalBlur = 0;
  
  // Check for directional blur
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      
      // Horizontal gradient
      const hDiff = Math.abs(
        data[i] - data[i + 4] +
        data[i + 1] - data[i + 5] +
        data[i + 2] - data[i + 6]
      );
      
      // Vertical gradient
      const vDiff = Math.abs(
        data[i] - data[i + width * 4] +
        data[i + 1] - data[i + width * 4 + 1] +
        data[i + 2] - data[i + width * 4 + 2]
      );
      
      horizontalBlur += hDiff;
      verticalBlur += vDiff;
    }
  }
  
  const totalPixels = (width - 2) * (height - 2);
  const blurScore = Math.min(horizontalBlur, verticalBlur) / totalPixels;
  
  return {
    isNotBlurred: blurScore < 15,
    blurScore
  }
};
  
  
  