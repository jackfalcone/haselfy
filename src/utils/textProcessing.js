import Tesseract from 'tesseract.js';
import stringSimilarity from 'string-similarity';

// Remove top-level await
let worker = null;

async function initializeWorker() {
  if (!worker) {
    worker = await Tesseract.createWorker();
    await worker.loadLanguage('deu');
    await worker.initialize('deu');
  }
  return worker;
}

const TESSERACT_CONFIG = {
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzäöüÄÖÜß.-_0123456789: ',
}

// Add dictionary constants
const EXPECTED_WORDS = [
  'Melden', 'bei', 'der', 'Pflege', 'Aktivierungsspaziergang', 'Selbstmanagement',
  'Eintrittsdiagnostik', 'Bedarfsvisite', 'Termin', 'Station', 'Mittagessen', 'Gruppentherapie', 'Einzeltherapie', 'Forum', 'STAIR-AR', 'Einführung',
'Psychoed.', 'Sucht', 'RPT', 'Einzel', 'Sozialdienst', 'Willkommensrunde',
'Ergotherapie', 'S.T.A.R.K.', 'Erstgespräch', 'Aufnahme', 'Ärztl.',
'Patientenadministration', 'Abendessen', 'mit', 'Götti', 'Sporttherapie',
'Kunsttherapie', 'Begleitung', 'Haushaltstraining'
  // ... rest of the activity words ...
];

const LOCATIONS = [
  'Arztzimmer', 'Hauptgebäude', 'GR', 'Matterhorn', 'Schulungsraum', 'ARTelier',
'Auditorium_Go', 'Haupteingang', 'Ergotherapieraum', 'Fitnessraum', 'Sitzungszimmer',
'Venus', 'Soz.-Dienstzimmer', 'TZ', '22', 'Eingangshalle'
  // ... rest of the locations ...
];

const ORGANIZERS = [
  'S. Castano', 'M. Alicioglu', 'Dr. med. S. Berend', 'I. Butko', 'D. Günes',
'S. Capaul', 'C. Jordi', 'C. Nied', 'E. Bütler', 'U. Sundberg', 'L. Amrein',
'L. Autilio', 'Dr. W. Breit', 'J. Brömmer', 'C. De Filippo', 'G. Koch',
'N. Koch', 'S. Hierzer', 'B. Köse Kusluk', 'N. Müller-Welti', 'M. Beer',
'L. Del Guercio', 'C. Holenweg', 'C. Imboden', 'S. Mahendran', 'S. Scheumann',
'S. Widmer', 'E. Mallien'
  // ... rest of the organizers ...
];

const TIME_PATTERN = /([0-1]?[0-9]|2[0-3]):[0-5][0-9]/;
const WEEKDAYS = ['Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.'];

function findBestMatch(word, dictionary) {
  const matches = dictionary.map(dict => ({
    text: dict,
    similarity: stringSimilarity.compareTwoStrings(word.toLowerCase(), dict.toLowerCase())
  }));
  
  const bestMatch = matches.reduce((best, current) => 
    current.similarity > best.similarity ? current : best
  );
  
  return bestMatch.similarity > 0.8 ? bestMatch.text : word;
}

export async function extractAndCombineText(processedImages, onProgress) {
  const totalImages = processedImages.length;
  console.log('Starting OCR process with', totalImages, 'images');
  const tesseractWorker = await initializeWorker();
  
  try {
    // Extract text from each image with confidence scores
    console.log('Beginning image processing');
    const ocrResults = [];  // Change to regular array instead of Promise.all

    // Process images sequentially instead of parallel
    for (let index = 0; index < processedImages.length; index++) {
      const imageUrl = processedImages[index];
      console.log(`Processing image ${index + 1}/${totalImages}`);
      
      if (onProgress) {
        const startProgress = (index / totalImages) * 80;  // Scale to 80%
        onProgress(Math.round(startProgress));
      }

      const result = await tesseractWorker.recognize(imageUrl, TESSERACT_CONFIG);
      console.log(`Completed OCR for image ${index + 1}`);
      
      const cleanedText = result.data.text
        .replace(/[[\]\\/_|]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      ocrResults.push({
        text: cleanedText,
        words: result.data.words.map(w => ({
          ...w,
          text: w.text.replace(/[[\]\\/_|]+/g, '').trim()
        })),
        confidence: result.data.confidence
      });
    }

    console.log('Starting post-processing');
    if (onProgress) onProgress(85);

    // Combine words from all results with improved handling
    console.log('Starting word mapping phase');
    const wordMap = new Map();
    ocrResults.forEach(result => {
      result.words
        .filter(word => word.confidence > 30) // Filter out very low confidence words
        .forEach(word => {
          const key = word.text.toLowerCase();
          
          // Skip single characters unless they are numbers
          if (key.length === 1 && !(/\d/.test(key))) {
            return;
          }

          if (!wordMap.has(key)) {
            wordMap.set(key, {
              text: word.text,
              occurrences: 0,
              confidences: [],
              positions: [],
              originalTexts: new Set() // Track different variations
            });
          }
          
          const entry = wordMap.get(key);
          entry.occurrences++;
          entry.confidences.push(word.confidence);
          entry.positions.push({ x: word.bbox.x0, y: word.bbox.y0 });
          entry.originalTexts.add(word.text);
    });
  });

  // Process similar words with improved matching
  console.log('Starting dictionary matching phase');
  const finalWords = [];
  const processed = new Set();

  // Process times and dictionary matches
  for (const [key, data] of wordMap.entries()) {
    if (processed.has(key)) continue;

    // Special handling for times
    if (TIME_PATTERN.test(key)) {
      finalWords.push({
        text: Array.from(data.originalTexts)[0], // Use the original time format
        confidence: data.confidences.reduce((a, b) => a + b, 0) / data.confidences.length,
        occurrences: data.occurrences,
        positions: data.positions
      });
      processed.add(key);
      continue;
    }

    // Enhanced dictionary matching
    let bestMatch = key;
    let highestSimilarity = 0;
    let matchedDictionary = null;

    // Prioritized dictionary checking
    const dictionaries = [
      { dict: WEEKDAYS, threshold: 0.85 },
      { dict: ORGANIZERS, threshold: 0.9 },
      { dict: LOCATIONS, threshold: 0.85 },
      { dict: EXPECTED_WORDS, threshold: 0.8 }
    ];

    for (const { dict, threshold } of dictionaries) {
      const match = findBestMatch(key, dict);
      const similarity = stringSimilarity.compareTwoStrings(key.toLowerCase(), match.toLowerCase());
      
      if (similarity > threshold && similarity > highestSimilarity) {
        bestMatch = match;
        highestSimilarity = similarity;
        matchedDictionary = dict;
      }
    }

    // Update the word text if a better match was found
    if (bestMatch !== key) {
      const entry = wordMap.get(key);
      entry.text = bestMatch;
      entry.confidence = Math.min(100, entry.confidence * 1.2); // Boost confidence for matched words
    }
  }

  for (const [key, data] of wordMap.entries()) {
    if (processed.has(key)) continue;

    // Find similar words with improved context awareness
    const similarWords = Array.from(wordMap.keys())
      .filter(k => !processed.has(k) && k !== key)
      .filter(k => {
        const similarity = stringSimilarity.compareTwoStrings(key, k);
        
        // Higher threshold for short words
        if (key.length <= 3 || k.length <= 3) {
          return similarity > 0.9;
        }
        
        // Check if words appear in similar vertical positions
        const keyY = data.positions[0].y;
        const compareY = wordMap.get(k).positions[0].y;
        const closePosition = Math.abs(keyY - compareY) < 30;
        
        return similarity > 0.8 && closePosition;
      });

    // Combine similar words with smart text selection
    const combinedData = {
      text: data.text,
      occurrences: data.occurrences,
      confidences: [...data.confidences],
      positions: [...data.positions],
      originalTexts: new Set([...data.originalTexts])
    };

    similarWords.forEach(similarKey => {
      const similarData = wordMap.get(similarKey);
      combinedData.occurrences += similarData.occurrences;
      combinedData.confidences.push(...similarData.confidences);
      combinedData.positions.push(...similarData.positions);
      similarData.originalTexts.forEach(t => combinedData.originalTexts.add(t));
      processed.add(similarKey);
    });

    // Smart text variant selection
    const avgConfidence = combinedData.confidences.reduce((a, b) => a + b, 0) / combinedData.confidences.length;
    
    if (combinedData.occurrences >= 2 && avgConfidence > 60) {
      // Choose the most frequent variant from original texts
      const textVariants = Array.from(combinedData.originalTexts);
      const variantCounts = textVariants.map(variant => ({
        text: variant,
        count: ocrResults.reduce((count, result) => 
          count + result.words.filter(w => w.text === variant).length, 0
        )
      }));
      
      const bestVariant = variantCounts.reduce((best, current) => 
        current.count > best.count ? current : best
      );

      finalWords.push({
        text: bestVariant.text,
        confidence: avgConfidence,
        occurrences: combinedData.occurrences,
        positions: combinedData.positions
      });
    }
  }

  // Improved position-based sorting
  finalWords.sort((a, b) => {
    const aY = a.positions.reduce((sum, pos) => sum + pos.y, 0) / a.positions.length;
    const bY = b.positions.reduce((sum, pos) => sum + pos.y, 0) / b.positions.length;
    
    // Increased line height threshold and smarter X-position handling
    const lineThreshold = 25;
    if (Math.abs(aY - bY) < lineThreshold) {
      const aX = a.positions.reduce((sum, pos) => sum + pos.x, 0) / a.positions.length;
      const bX = b.positions.reduce((sum, pos) => sum + pos.x, 0) / b.positions.length;
      return aX - bX;
    }
    return aY - bY;
  });

  // Format final text with improved spacing
  const text = finalWords
    .map(w => w.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/(\d{2}:\d{2})\s+(\d{2}:\d{2})/g, '$1-$2') // Format time ranges
    .trim();

  return { text, words: finalWords, ocrResults };
  } catch (error) {
    console.error('Error during OCR processing:', error);
    throw error;
  } finally {
    console.log('Cleaning up');
    await tesseractWorker.terminate();  // Always terminate the worker
  }
}