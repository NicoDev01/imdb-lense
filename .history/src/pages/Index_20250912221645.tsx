import { useState } from 'react';
import { CameraCapture } from '@/components/CameraCapture';
import { MovieTitlesList } from '@/components/MovieTitlesList';
import { LoadingScreen } from '@/components/LoadingScreen';

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
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Film Scanner
          </h1>
          <p className="text-muted-foreground">
            Erkenne Filmtitel von Netflix & anderen Plattformen
          </p>
        </div>

        <CameraCapture onTitlesExtracted={handleTitlesExtracted} />
        
        <MovieTitlesList titles={movieTitles} onClear={clearTitles} />
      </div>
    </div>
  );
};

export default Index;
