import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

let ocrPipeline: any = null;

export const initializeOCR = async () => {
  if (ocrPipeline) return ocrPipeline;
  
  try {
    console.log('Initializing OCR pipeline for scene text...');
    // Using a better model for scene text recognition (like movie titles)
    ocrPipeline = await pipeline(
      'image-to-text',
      'Xenova/trocr-base-scene-text',
      { 
        device: 'webgpu',
        // Fallback to CPU if WebGPU fails
        dtype: 'fp32'
      }
    );
    console.log('OCR pipeline initialized successfully');
    return ocrPipeline;
  } catch (error) {
    console.error('Error initializing scene text OCR, trying fallback...', error);
    try {
      // Fallback to a more general OCR model
      ocrPipeline = await pipeline(
        'image-to-text',
        'Xenova/trocr-base-handwritten',
        { device: 'webgpu' }
      );
      console.log('Fallback OCR model loaded');
      return ocrPipeline;
    } catch (fallbackError) {
      console.error('Both OCR models failed:', fallbackError);
      throw fallbackError;
    }
  }
};

export const extractTextFromImage = async (imageUrl: string): Promise<string[]> => {
  try {
    if (!ocrPipeline) {
      await initializeOCR();
    }

    console.log('Extracting text from image...');
    console.log('Processing image for movie titles...');
    
    // Process the image with OCR
    const result = await ocrPipeline(imageUrl, {
      max_new_tokens: 100,
      do_sample: false,
      // Try to get more text segments
      return_tensors: false
    });
    
    console.log('OCR Raw result:', result);
    
    if (result && result.generated_text) {
      console.log('Generated text:', result.generated_text);
      
      // More aggressive text splitting and cleaning for movie titles
      const rawText = result.generated_text.toLowerCase();
      const titles = result.generated_text
        .split(/[\n\r,;|\/\\]+/) // Split on various delimiters
        .map((title: string) => title.trim())
        .filter((title: string) => title.length > 1 && title.length < 100)
        .filter((title: string) => !title.match(/^\d+$/)) // Remove pure numbers
        .filter((title: string) => !title.match(/^[^\w\s]*$/)) // Remove non-alphanumeric only
        .map(title => {
          // Clean up and format titles properly
          return title.replace(/[^\w\s\-'":]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
        })
        .filter(title => title.length > 1);
      
      console.log('Extracted titles:', titles);
      return titles;
    }
    
    console.log('No text generated from OCR');
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