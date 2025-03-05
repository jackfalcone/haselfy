import Tesseract from 'tesseract.js';

export const processOCR = async (imageData) => {
  try {
    const { data: { text } } = await Tesseract.recognize(
      imageData,
      'deu',
      {
        logger: m => console.log(m)
      }
    );
    return text;
  } catch (error) {
    console.error('OCR processing failed:', error);
    throw error;
  }
};