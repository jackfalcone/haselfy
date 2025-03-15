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

/**
 * Analyzes the brightness and contrast of an image to determine if it's suitable for OCR.
 * 
 * **Returned values:**
 * - `brightnessScore`: 
 *    - Values close to `0` indicate a very dark image.  
 *    - Values close to `1` indicate a very bright image.  
 *    - The ideal range is between `0.25` and `0.75`.  
 * - `contrastScore`:
 *    - Low values (`< 0.35`) indicate low contrast (text may be hard to read).  
 *    - High values (`> 0.35`) indicate good contrast for OCR.  
 * - `p5Value`: The brightness value of the darkest 5% of pixels.  
 * - `p95Value`: The brightness value of the brightest 5% of pixels.  
 *
 * **Thresholds for `isGood`:**
 * - `contrastScore` must be greater than `0.35` (minimum contrast threshold).  
 * - `brightnessScore` must be between `0.25` and `0.75` (to avoid under- or overexposure).  
 */
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

  // Calculate cumulative distribution
  const cumulativeHist = new Array(256).fill(0);
  cumulativeHist[0] = histogram[0];
  for (let i = 1; i < 256; i++) {
    cumulativeHist[i] = cumulativeHist[i - 1] + histogram[i];
  }

  // Find 5% and 95% percentiles
  const p5Target = pixelCount * 0.05;
  const p95Target = pixelCount * 0.95;
  let p5Value = 10, p95Value = 245;
  
  for (let i = 0; i < 256; i++) {
    if (cumulativeHist[i] >= p5Target && p5Value === 0) p5Value = i;
    if (cumulativeHist[i] >= p95Target) {
      p95Value = i;
      break;
    }
  }

  // Calculate brightness and contrast scores
  const brightnessScore = (p95Value + p5Value) / 2 / 255;
  const contrastScore = Math.max((p95Value - p5Value) / 255, 0.01);

  // Thresholds for different image qualities
  const CONTRAST_MIN = 0.35;    // Minimum acceptable contrast
  const BRIGHTNESS_MIN = 0.25;   // Minimum acceptable brightness
  const BRIGHTNESS_MAX = 0.75;   // Maximum acceptable brightness

  return {
    isGood: contrastScore > CONTRAST_MIN && 
            brightnessScore > BRIGHTNESS_MIN && 
            brightnessScore < BRIGHTNESS_MAX,
    brightnessScore
  };
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
  
  
  