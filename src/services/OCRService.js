import Tesseract from 'tesseract.js';
import { processText } from '../utils/textProcessing';

export const processOCR = async (imageData) => {
  try {
    const { data: { text, confidence } } = await Tesseract.recognize(
      imageData,
      'deu',
      {
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,()-/: äöüÄÖÜß',
        tessedit_pageseg_mode: '1',
        preserve_interword_spaces: '1',
        tessjs_create_pdf: '0',
        tessjs_create_hocr: '0',
        tessjs_create_tsv: '0'
      }
    );

    const processedText = processText(text);

    return {
      text: processedText,
      confidence
    };
  } catch (error) {
    console.error('OCR processing failed:', error);
    throw error;
  }
};