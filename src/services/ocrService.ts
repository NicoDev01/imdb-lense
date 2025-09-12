import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

let ocrPipeline: any = null;

export const initializeOCR = async () => {
  if (ocrPipeline) return ocrPipeline;
  
  try {
    console.log('Initializing OCR pipeline...');
    ocrPipeline = await pipeline(
      'image-to-text',
      'Xenova/trocr-base-printed',
      { device: 'webgpu' }
    );
    console.log('OCR pipeline initialized successfully');
    return ocrPipeline;
  } catch (error) {
    console.error('Error initializing OCR:', error);
    throw error;
  }
};

export const extractTextFromImage = async (imageUrl: string): Promise<string[]> => {
  try {
    if (!ocrPipeline) {
      await initializeOCR();
    }

    console.log('Extracting text from image...');
    const result = await ocrPipeline(imageUrl);
    
    if (result && result.generated_text) {
      // Split text into potential movie titles
      const titles = result.generated_text
        .split(/[\n\r,;]+/)
        .map((title: string) => title.trim())
        .filter((title: string) => title.length > 2 && title.length < 100)
        .filter((title: string) => !title.match(/^\d+$/)); // Remove pure numbers
      
      return titles;
    }
    
    return [];
  } catch (error) {
    console.error('Error extracting text from image:', error);
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