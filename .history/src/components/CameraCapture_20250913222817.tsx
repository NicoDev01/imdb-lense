npmimport { useState } from 'react';
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
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [continuousMode, setContinuousMode] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const { toast } = useToast();

  const capturePhoto = async () => {
    try {
      setIsCapturing(true);

      const image = await Camera.getPhoto({
        quality: continuousMode ? 85 : 90, // Slightly lower quality for faster processing in continuous mode
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        correctOrientation: true,
        width: continuousMode ? 1920 : undefined, // Lower resolution for faster processing
        height: continuousMode ? 1080 : undefined,
      });

      if (image.base64String) {
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
    <Card className="bg-gradient-card shadow-card border-border p-6">
      <div className="text-center space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Film Scanner</h2>
          <p className="text-muted-foreground">
            Fotografiere Filmcover um Titel zu erkennen
          </p>
          {photoCount > 0 && (
            <p className="text-sm text-primary font-medium mt-2">
              📸 {photoCount} Foto{photoCount !== 1 ? 's' : ''} aufgenommen
            </p>
          )}
        </div>

        {capturedImage && (
          <div className="relative rounded-lg overflow-hidden shadow-card">
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full max-h-64 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-overlay pointer-events-none" />
          </div>
        )}

        <div className="space-y-3">
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
                {continuousMode ? 'Schnell-Scan aktiv' : 'Foto aufnehmen'}
              </>
            )}
          </Button>

          <Button
            onClick={() => setContinuousMode(!continuousMode)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {continuousMode ? (
              <>
                <ZapOffIcon className="w-4 h-4 mr-2" />
                Normal-Modus
              </>
            ) : (
              <>
                <ZapIcon className="w-4 h-4 mr-2" />
                Schnell-Scan Modus
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};
