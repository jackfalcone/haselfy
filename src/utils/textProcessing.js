import stringSimilarity from 'string-similarity';
import { dictionaries } from '../data/dictionaries';

function findBestMatch(word, dictionaries) {
  let bestMatch = word;
  let highestSimilarity = 0;

  for (const { dict, threshold } of dictionaries) {
    for (const dictWord of dict) {
      const similarity = stringSimilarity.compareTwoStrings(
        word.toLowerCase(), 
        dictWord.toLowerCase()
      );
      if (similarity > threshold && similarity > highestSimilarity) {
        bestMatch = dictWord;
        highestSimilarity = similarity;
      }
    }
  }
  return bestMatch;
}

function cleanText(text) {
  return text
    .replace(/[\r\n]+/g, '\n')           
    .replace(/[^\S\n]+/g, ' ')           
    .replace(/[Y"_.']{2,}.*Patientenplan.*\n/, 'Patientenplan\n')  // Remove garbage header
    .replace(/^[^a-zA-Z0-9()\däöüÄÖÜß\s-]+/gm, '') // Keep more useful characters at line start
    .replace(/\n{3,}/g, '\n\n')          
    .replace(/[„""]/g, '"')              
    .replace(/[''‚]/g, "'")              
    .replace(/[−–]/g, '-')               
    .replace(/\(([^\n)]*)\n([^)]*)/g, '($1 $2)')  // Join parentheses content across lines
    .replace(/\(([^)]*$)/g, '($1)')      // Close any remaining unclosed parentheses
    .replace(/(\d{2}):(\d{2})\.(\d{4})/g, '$1.$2.$3')  // Fix date format
    .replace(/^[a-z]\{\s*/gm, '')        // Remove single letter with curly brace
    .replace(/^[a-z]\s+(?=\d)/gmi, '')   // Remove single letters before numbers
    .replace(/(?<=\d)'(?=\s|$)/g, '')    // Remove single quotes after numbers
    .replace(/(?<=\d)°(?=\s|$)/g, '')    // Remove degree symbols after numbers
    .replace(/\s+([.,])/g, '$1')         // Fix spacing around punctuation
    .replace(/\s*\|\s*/g, ' | ')         // Normalize pipe spacing
    .replace(/[^\x20-\x7E\äöüÄÖÜß\n()]/g, '') // Remove non-printable chars but keep parentheses
    .replace(/^m TT.*\n/, '')                 // Remove the ID line
    .replace(/^[A-Z]\s+(?=Fr\.|Do\.)/, '')   // Remove single letters before weekdays
    .replace(/^.*?(?=[A-Z][a-z]\.\s+\d{2}\.\d{2}\.\d{4})/gm, '')  // Remove everything before dates (after format fix)
    .replace(/^.*?(?=\d{2}[:\.]\d{2}\s+\d{2}[:\.]\d{2}\s+[A-Za-z])/gm, '')  // Remove everything before time ranges that have text after them
    .replace(/(?<=\d{2}:\d{2})\s+\d{2}(?=\s|$)/, '')  // Remove duration numbers
    .replace(/^[A-Z]{1,2}\s+(?=\d)/, '')     // Remove prefixes like 'CN', 'E'
    .replace(/^(?:an|x)$\n?/gm, '')          // Remove 'an' and 'x' lines
    .replace(/(?<=\d)\.$/, '')               // Remove trailing dots after numbers
    .trim();
}

function isGeneralInfoLine(line) {
  const generalInfoKeywords = [
    'Medikamentenabgabe',
    'Essenszeiten',
    'Pausen',
    'Frühstück',
    'Brunch',
    'Mittagessen Mo-Fr',
    'Abendessen Mo-So',
    'NA-Meeting',
    'Mo - Fr Alle',
    'Mittagspause',
    'Gruppe 1',  // Add specific group headers
    'Gruppe 2',
    'Gruppe 3'
  ];
  
  // Check for exact matches or group number patterns
  return generalInfoKeywords.some(keyword => line.includes(keyword)) ||
         line.match(/^Gruppe\s+\d/) ||  // Match group headers specifically
         line.match(/^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/) ||
         line.match(/\|\s*\d{2}:\d{2}/) ||
         line.match(/^[A-Z][a-z]\s+\d{2}:\d{2}\s*-/);
}

export function processText(text) {
  const cleanedText = cleanText(text);
  const lines = cleanedText.split('\n').map(line => 
    line.trim()
      .replace(/[„""]/g, '"')          
      .replace(/[''‚]/g, "'")          
      .replace(/[−–]/g, '-')           
      .replace(/\s+/g, ' ')            
      .replace(/^\W+|\W+$/g, '')       
  ).filter(line => {
    return line.length > 0 && 
           !line.match(/^(BED|klinik|Patientenplan|FB|TT|EBE|We,|e m AA)/i) &&
           !line.match(/^[A-Z]{1,2}$/) &&
           !isGeneralInfoLine(line);
  });

  // Process each line
  const processedLines = lines.map(line => {
    // Skip header/footer lines
    if (line.match(/^(BED|klinik|Patientenplan|FB|TT|EBE)$/i)) {
      return null;
    }

    // In processText:
    // Format times consistently (only match times at start of line or after space)
    line = line.replace(/(?:^|\s)(\d{1,2})[:.](\d{2})(?!\.\d{4})/g, (match, h, m) => 
      match.startsWith(' ') ? ` ${h.padStart(2, '0')}:${m}` : `${h.padStart(2, '0')}:${m}`
    );

    // Correct common OCR mistakes using dictionaries
    const words = line.split(' ').map(word => findBestMatch(word, dictionaries));

    return words.join(' ');
  }).filter(line => line !== null);

  return processedLines.join('\n');
}

export function extractAppointments(text) {
  const processedText = processText(text);
  // We'll implement this later when working on AppointmentList
  return processedText;
}