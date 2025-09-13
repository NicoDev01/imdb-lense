import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize Gemini AI
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('VITE_GEMINI_API_KEY not found. Gemini OCR will not work.');
}

let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

export const initializeGemini = async () => {
  if (model) return model;

  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API Key nicht gefunden. Bitte VITE_GEMINI_API_KEY in .env setzen.');
  }

  try {
    console.log('Initializing Gemini AI...');
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    // Use gemini-2.5-flash-lite for optimal performance
    model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    console.log('Gemini AI initialized successfully');
    return model;
  } catch (error) {
    console.error('Failed to initialize Gemini AI:', error);
    throw new Error('Gemini AI konnte nicht initialisiert werden. Bitte API Key überprüfen.');
  }
};

export const extractTextFromImage = async (imageUrl: string): Promise<string[]> => {
  try {
    if (!model) {
      console.log('Initializing Gemini AI...');
      await initializeGemini();
    }

    console.log('Starting text extraction from image...');
    console.log('Image URL:', imageUrl.substring(0, 50) + '...');

    // Extract base64 data from data URL
    let base64Data: string;
    let mimeType: string;

    if (imageUrl.startsWith('data:')) {
      const [mimePart, dataPart] = imageUrl.split(',');
      mimeType = mimePart.split(':')[1].split(';')[0];
      base64Data = dataPart;
    } else {
      throw new Error('Unsupported image format. Expected data URL.');
    }

    console.log('Processing image with Gemini...');

    // Create the prompt for movie title extraction
    const prompt = `Analysiere dieses Bild und extrahiere alle sichtbaren Filmtitel.
    Gib nur die Filmtitel zurück, einen pro Zeile.
    Ignoriere alle anderen Texte wie Schauspielernamen, Regisseure, Genres, etc.
    Wenn mehrere Filme auf dem Bild sind, liste jeden Titel separat auf.
    Antworte nur mit den Titeln, keine zusätzlichen Erklärungen.`;

    // Prepare the image part
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };

    // Generate content
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    console.log('Gemini Response:', text);

    if (!text || text.trim().length === 0) {
      console.log('No text extracted from image');
      return [];
    }

    // Parse the response and extract titles
    const extractedTitles = parseGeminiResponse(text);
    const cleanedTitles = extractedTitles
      .map(cleanMovieTitle)
      .filter(title => title.length >= 2 && title.length <= 100)
      .filter(title => !/^\d+(\.\d+)?$/.test(title)) // Filter out numbers only
      .filter(title => title.trim().length > 0);

    // Remove duplicates
    const uniqueTitles = [...new Set(cleanedTitles)];

    console.log('Final extracted titles:', uniqueTitles);

    if (uniqueTitles.length === 0) {
      console.log('No valid titles found in Gemini response');
      return [];
    }

    return uniqueTitles;
  } catch (error) {
    console.error('Error in extractTextFromImage:', error);

    // Handle specific Gemini errors
    if (error instanceof Error) {
      if (error.message.includes('API_KEY')) {
        throw new Error('Gemini API Key ist ungültig oder fehlt.');
      }
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        throw new Error('Gemini API Quota überschritten. Bitte später versuchen.');
      }
      if (error.message.includes('blocked')) {
        throw new Error('Inhalt wurde von Gemini blockiert.');
      }
    }

    return [];
  }
};

// Parse Gemini response to extract movie titles
function parseGeminiResponse(response: string): string[] {
  // Split by newlines and clean up
  const lines = response.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const titles: string[] = [];

  for (const line of lines) {
    // Skip lines that are clearly not movie titles
    if (line.toLowerCase().includes('keine filme gefunden') ||
        line.toLowerCase().includes('no movies found') ||
        line.toLowerCase().includes('error') ||
        line.startsWith('- ') && line.length < 5) {
      continue;
    }

    // Remove common prefixes that Gemini might add
    let cleanLine = line
      .replace(/^[-•*]\s*/, '') // Remove bullet points
      .replace(/^\d+\.\s*/, '') // Remove numbered lists
      .replace(/^["']|["']$/g, '') // Remove quotes
      .trim();

    if (cleanLine.length >= 2) {
      titles.push(cleanLine);
    }
  }

  return titles;
}

export const cleanMovieTitle = (title: string): string => {
  // Clean up movie title text
  return title
    .replace(/[^\w\s\-:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};
