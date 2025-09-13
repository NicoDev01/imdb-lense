import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Film, Copy, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBatchImdbIds } from '@/hooks/useTmdb';
import type { MovieWithImdbId } from '@/types/tmdb';

interface MovieTitlesListProps {
  titles: string[];
  onClear: () => void;
}

export const MovieTitlesList = ({ titles, onClear }: MovieTitlesListProps) => {
  const { toast } = useToast();

  const copyToClipboard = async (title: string) => {
    try {
      await navigator.clipboard.writeText(title);
      toast({
        title: 'Kopiert!',
        description: `"${title}" wurde in die Zwischenablage kopiert`,
      });
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Konnte nicht in die Zwischenablage kopieren',
        variant: 'destructive',
      });
    }
  };

  const copyAllTitles = async () => {
    try {
      const allTitles = titles.join('\n');
      await navigator.clipboard.writeText(allTitles);
      toast({
        title: 'Alle Titel kopiert!',
        description: `${titles.length} Titel wurden in die Zwischenablage kopiert`,
      });
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Konnte nicht in die Zwischenablage kopieren',
        variant: 'destructive',
      });
    }
  };

  if (titles.length === 0) {
    return (
      <Card className="bg-gradient-card shadow-card border-border p-8 text-center">
        <Film className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Noch keine Titel erkannt</h3>
        <p className="text-muted-foreground">
          Verwende die Kamera um Filmcover zu scannen
        </p>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card shadow-card border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-bold">Erkannte Filmtitel</h3>
          <Badge variant="secondary" className="ml-2">
            {titles.length}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copyAllTitles}
            className="hover:bg-secondary"
          >
            <Copy className="w-4 h-4 mr-1" />
            Alle kopieren
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            className="hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Löschen
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {titles.map((title, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <span className="font-medium flex-1">{title}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(title)}
              className="ml-2 hover:bg-primary/10"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};
