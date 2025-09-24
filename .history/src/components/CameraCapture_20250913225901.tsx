import { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CameraIcon, Loader2Icon, ZapIcon, ZapOffIcon } from 'lucide-react';
import { extractTextFromImage } from '@/services/ocrService';

interface CameraCaptureProps {
  onTitlesExtracted: (titles: string[]) => void;
}

export const CameraCapture = ({ onTitlesExtracted }: CameraCaptureProps) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const capturePhoto = async () => {
    try {
      setIsCapturing(true);

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        correctOrientation: true,
      });

      if (image.base64String) {
        const imageUrl = `data:image/jpeg;base64,${image.base64String}`;
        await processImage(imageUrl);
        const imageUrl = `data:image/jpeg;base64,${image.base64String}`;
        setCapturedImage(imageUrl);
        setPhotoCount(prev => prev + 1);

        // Clear previous image after 2 seconds in continuous mode for smooth flow
        if (continuousMode) {
          setTimeout(() => setCapturedImage(null), 2000);
        }

        await processImage(imageUrl);

        // Auto-trigger next capture in continuous mode after successful processing
        if (continuousMode && !isProcessing) {
          setTimeout(() => {
            if (continuousMode) capturePhoto();
          }, 500); // Small delay for smooth UX
        }
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
        onTitlesExtracted(extractedTitles);
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

  return (
    <div className="flex justify-center p-4">
      <Button
        onClick={capturePhoto}
        disabled={isCapturing || isProcessing}
        size="lg"
        className="bg-gradient-primary hover:shadow-glow transition-all duration-300 transform hover:scale-105"
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
  );
};
