import * as ImageManipulator from 'expo-image-manipulator';
import { alignImages, stackImages } from '../utils/imageProcessing';

export async function enhanceImages(images) {
  try {
    // Align multiple images
    const alignedImages = await alignImages(images);
    
    // Stack aligned images for better quality
    const stackedImage = await stackImages(alignedImages);
    
    // Enhance the final image
    const enhanced = await ImageManipulator.manipulateAsync(
      stackedImage,
      [
        { brightness: 1.1 },
        { contrast: 1.2 },
        { sharpen: 0.5 }
      ],
      { format: 'png', compress: 0.8 }
    );

    return enhanced;
  } catch (error) {
    console.error('Image enhancement failed:', error);
    // Return the best single image if enhancement fails
    return images[0];
  }
}