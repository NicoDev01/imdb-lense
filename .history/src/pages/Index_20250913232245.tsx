import { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CameraIcon, Loader2Icon } from 'lucide-react';
import { MovieTitlesList } from '@/components/MovieTitlesList';
import { LoadingScreen } from '@/components/LoadingScreen';
import { extractTextFromImage } from '@/services/ocrService';

const Index = () => {
  const [isReady, setIsReady] = useState(false);
  const [movieTitles, setMovieTitles] = useState<string[]>([]);

  const handleTitlesExtracted = (titles: string[]) => {
    setMovieTitles(prevTitles => {
      const allTitles = [...prevTitles, ...titles];
      // Remove duplicates
      return [...new Set(allTitles)];
    });
  };

  const clearTitles = () => {
    setMovieTitles([]);
  };

  if (!isReady) {
    return <LoadingScreen onReady={() => setIsReady(true)} />;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        <CameraCapture onTitlesExtracted={handleTitlesExtracted} />

        <MovieTitlesList titles={movieTitles} onClear={clearTitles} />
      </div>
    </div>
  );
};

export default Index;
