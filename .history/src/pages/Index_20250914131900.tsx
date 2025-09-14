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
  const [processedTitles, setProcessedTitles] = useState<Set<string>>(new Set());
  const [movieData, setMovieData] = useState<any[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleTitlesExtracted = (titles: string[]) => {
    setMovieTitles(prevTitles => {
      const allTitles = [...prevTitles, ...titles];
      // Remove duplicates
      return [...new Set(allTitles)];
    });

    // Mark new titles as processed (they will be processed by the hook)
    setProcessedTitles(prev => {
      const newProcessed = new Set(prev);
      titles.forEach(title => newProcessed.add(title));
      return newProcessed;
    });
  };

  const clearTitles = () => {
    setMovieTitles([]);
  };

  const capturePhoto = async () => {
    try {
      setIsCapturing(true);

      const image = await Camera.getPhoto({
        quality: 85, // Leicht niedriger für schnellere Verarbeitung
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        correctOrientation: true,
        presentationStyle: 'fullscreen',
        saveToGallery: false,
        width: 1920, // Konsistente Auflösung für schnellere OCR
        height: 1080,
        promptLabelHeader: 'Film Scanner',
        promptLabelCancel: 'Abbrechen',
        promptLabelPhoto: 'Foto aufnehmen',
      });

      if (image.base64String) {
        const imageUrl = `data:image/jpeg;base64,${image.base64String}`;
        await processImage(imageUrl);
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      toast({
        title: 'Fehler',
        description: 'Foto konnte nicht aufgenommen werden',
        variant: 'destructive',
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const processImage = async (imageUrl: string) => {
    try {
      setIsProcessing(true);

      toast({
        title: 'Verarbeitung läuft...',
        description: 'Filmtitel werden erkannt...',
      });

      const extractedTitles = await extractTextFromImage(imageUrl);

      if (extractedTitles.length > 0) {
        handleTitlesExtracted(extractedTitles);
        toast({
          title: 'Erfolgreich!',
          description: `${extractedTitles.length} Filmtitel gefunden`,
        });
      } else {
        toast({
          title: 'Keine Titel gefunden',
          description: 'Versuche es mit einem anderen Bild',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: 'Verarbeitungsfehler',
        description: 'Bild konnte nicht verarbeitet werden',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isReady) {
    return <LoadingScreen onReady={() => setIsReady(true)} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Film Liste - nimmt verfügbaren Platz ein und ist scrollable */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-4 pb-20 overflow-y-auto">
          <div className="max-w-md mx-auto">
            <MovieTitlesList
              titles={movieTitles}
              onClear={clearTitles}
              processedTitles={processedTitles}
            />
          </div>
        </div>
      </div>

      {/* Sticky Foto Button - schmaler und pillenförmig */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe-area-inset-bottom pointer-events-none">
        <div className="flex justify-center">
          <Button
            onClick={capturePhoto}
            disabled={isCapturing || isProcessing}
            size="lg"
            className="pointer-events-auto max-w-xs bg-gradient-primary hover:shadow-glow transition-all duration-300 transform hover:scale-105 shadow-lg rounded-full px-8 py-3"
          >
            {isCapturing || isProcessing ? (
              <>
                <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />
                {isCapturing ? 'Fotografiere...' : 'Verarbeite...'}
              </>
            ) : (
              <>
                <CameraIcon className="w-5 h-5 mr-2" />
                Foto aufnehmen
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
