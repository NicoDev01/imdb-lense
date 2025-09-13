import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

let ocrPipeline: any = null;

export const initializeOCR = async () => {
  if (ocrPipeline) return ocrPipeline;

  try {
    console.log("Initializing OCR pipeline...");
    // Use proven working base model with better parameters
    ocrPipeline = await pipeline(
      "image-to-text",
      "Xenova/trocr-base-printed",
      {
        device: "webgpu",
        dtype: "fp32"
      }
    );
    console.log("OCR pipeline initialized successfully with trocr-base-printed (WebGPU)");
    return ocrPipeline;
  } catch (error) {
    console.error("WebGPU failed, trying WASM fallback:", error);
    try {
      // WASM fallback (works in all browsers)
      ocrPipeline = await pipeline(
        "image-to-text",
        "Xenova/trocr-base-printed",
        { device: "wasm" }
      );
      console.log("OCR pipeline initialized successfully with trocr-base-printed (WASM)");
      return ocrPipeline;
    } catch (fallbackError) {
      console.error("WASM failed, trying CPU fallback:", fallbackError);
      try {
        // CPU fallback as last resort
        ocrPipeline = await pipeline(
          "image-to-text",
          "Xenova/trocr-base-printed",
          { device: "cpu" }
        );
        console.log("OCR pipeline initialized successfully with trocr-base-printed (CPU)");
        return ocrPipeline;
      } catch (finalError) {
        console.error("All OCR models failed:", finalError);
        throw new Error("OCR-Modell konnte nicht geladen werden. Bitte überprüfen Sie Ihre Internetverbindung.");
      }
    }
  }
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
        
        for (const variant of splitVariants) {
          const cleanTitles = variant
            .map((text: string) => text.trim())
            .filter((text: string) => text.length >= 2 && text.length <= 100) // More lenient length check
            .filter((text: string) => !/^\d+(\.\d+)?$/.test(text)) // Filter out only numbers
            .map((text: string) => cleanMovieTitle(text))
            .filter((text: string) => text.length >= 2);

          allTitles.push(...cleanTitles);
        }
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
