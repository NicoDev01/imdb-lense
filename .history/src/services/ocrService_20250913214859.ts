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
          }
        );
        console.log(`OCR pipeline initialized successfully with ${model.name} (${model.fallbackDevice.toUpperCase()})`);
        return ocrPipeline;
      } catch (fallbackError) {
        console.warn(`${model.name} (${model.fallbackDevice}) also failed:`, fallbackError);
        continue;
      }
    }
  }

  throw new Error("OCR-Modell konnte nicht geladen werden. Bitte überprüfen Sie Ihre Internetverbindung.");
};

export const extractTextFromImage = async (imageUrl: string): Promise<string[]> => {
  try {
    if (!ocrPipeline) {
      console.log("Initializing OCR pipeline...");
      await initializeOCR();
    }

    console.log("Starting text extraction from image...");
    console.log("Image URL:", imageUrl.substring(0, 50) + "...");
    
    // Process the image multiple times for better results
    const results = [];
    
    try {
      console.log("Processing image with OCR...");
      const result = await ocrPipeline(imageUrl, {
        max_new_tokens: 50,
        do_sample: false,
        num_beams: 1,
      });
      
      console.log("OCR Result:", result);
      console.log("OCR Result keys:", Object.keys(result));
      console.log("OCR Result full:", JSON.stringify(result, null, 2));
      results.push(result);
    } catch (ocrError) {
      console.error("OCR processing failed:", ocrError);
      return [];
    }
    
    // Extract and clean text from all results
    const allTitles = [];
    
    for (const result of results) {
      if (result && result.generated_text) {
        console.log("🔍 Generated text found:", JSON.stringify(result.generated_text));

        const rawText = result.generated_text;

        // Try multiple splitting strategies
        const splitVariants = [
          rawText.split(/\s+/), // Split by whitespace
          rawText.split(/[,;|\/\\]+/), // Split by punctuation
          rawText.split(/\n/), // Split by newlines
          [rawText.trim()] // Use whole text
        ];

        console.log("📝 Split variants:", splitVariants);

        for (const variant of splitVariants) {
          console.log("🔄 Processing variant:", variant);

          const cleanTitles = variant
            .map((text: string) => text.trim())
            .filter((text: string) => {
              const isValid = text.length >= 2 && text.length <= 100;
              if (!isValid) {
                console.log(`❌ Filtered out "${text}" - length: ${text.length}`);
              }
              return isValid;
            })
            .filter((text: string) => {
              const isOnlyNumbers = /^\d+(\.\d+)?$/.test(text);
              if (isOnlyNumbers) {
                console.log(`❌ Filtered out "${text}" - only numbers`);
              }
              return !isOnlyNumbers;
            })
            .map((text: string) => {
              const cleaned = cleanMovieTitle(text);
              if (cleaned !== text) {
                console.log(`🧹 Cleaned "${text}" → "${cleaned}"`);
              }
              return cleaned;
            })
            .filter((text: string) => {
              const isValidAfterClean = text.length >= 2;
              if (!isValidAfterClean) {
                console.log(`❌ Filtered out after cleaning "${text}"`);
              }
              return isValidAfterClean;
            });

          console.log("✅ Clean titles from this variant:", cleanTitles);
          allTitles.push(...cleanTitles);
        }
      } else {
        console.log("❌ No generated_text in result:", result);
      }
    }
    
    // Remove duplicates and return
    const uniqueTitles = [...new Set(allTitles)];
    console.log("Final extracted titles:", uniqueTitles);
    
    if (uniqueTitles.length === 0) {
      console.log("No valid titles found. Raw results were:", results);
      // Return empty array instead of hardcoded fallback titles
      return [];
    }
    
    return uniqueTitles;
  } catch (error) {
    console.error("Error in extractTextFromImage:", error);
    return [];
  }
};

export const cleanMovieTitle = (title: string): string => {
  // Clean up movie title text
  return title
    .replace(/[^\w\s\-:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};
