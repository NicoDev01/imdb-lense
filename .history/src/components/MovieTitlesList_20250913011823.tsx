import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Film, Copy, Trash2, ExternalLink, Loader2, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBatchImdbIds } from '@/hooks/useTmdb';
import { useBatchImdbRatingsFromTitles } from '@/hooks/useOmdb';
import type { MovieWithImdbId } from '@/types/tmdb';

interface MovieTitlesListProps {
  titles: string[];
  onClear: () => void;
}

export const MovieTitlesList = ({ titles, onClear }: MovieTitlesListProps) => {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'titles' | 'imdb' | 'ratings'>('titles');

  // TMDB + OMDb integration for complete movie data
  const { data: movieData, isLoading: isLoadingImdb, isError: hasImdbError } = useBatchImdbIds(
    titles,
    { language: 'de-DE', region: 'DE' }
  );

  // OMDb ratings for movies with IMDb IDs
  const { data: ratingsData, isLoading: isLoadingRatings, isError: hasRatingsError } = useBatchImdbRatingsFromTitles(titles);

  const copyToClipboard = async (text: string, description: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Kopiert!',
        description,
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
    const allTitles = titles.join('\n');
    await copyToClipboard(allTitles, `${titles.length} Titel wurden in die Zwischenablage kopiert`);
  };

  const copyAllImdbIds = async () => {
    if (!movieData || movieData.length === 0) return;

    const imdbIds = movieData
      .map(movie => movie.imdbId)
      .filter(id => id !== null)
      .join('\n');

    if (imdbIds) {
      await copyToClipboard(imdbIds, `${movieData.length} IMDb-IDs wurden in die Zwischenablage kopiert`);
    }
  };

  const copyAllRatings = async () => {
    if (!ratingsData || ratingsData.length === 0) return;

    const ratings = ratingsData
      .map(movie => movie.rating ? `${movie.title}: ${movie.rating}/10` : null)
      .filter(rating => rating !== null)
      .join('\n');

    if (ratings) {
      await copyToClipboard(ratings, `${ratingsData.length} Bewertungen wurden in die Zwischenablage kopiert`);
    }
  };

  const openImdbPage = (imdbId: string) => {
    window.open(`https://www.imdb.com/title/${imdbId}`, '_blank');
  };

  const getConfidenceColor = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const getConfidenceLabel = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high': return 'Hoch';
      case 'medium': return 'Mittel';
      case 'low': return 'Niedrig';
      default: return 'Unbekannt';
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
          <div className="flex gap-1">
            <Button
              variant={viewMode === 'titles' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('titles')}
              className="text-xs"
            >
              Titel
            </Button>
            <Button
              variant={viewMode === 'imdb' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('imdb')}
              className="text-xs"
            >
              IMDb
            </Button>
            <Button
              variant={viewMode === 'ratings' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('ratings')}
              className="text-xs"
            >
              <Star className="w-3 h-3 mr-1" />
              Ratings
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={
              viewMode === 'titles' ? copyAllTitles :
              viewMode === 'imdb' ? copyAllImdbIds :
              copyAllRatings
            }
            className="hover:bg-secondary"
            disabled={
              (viewMode === 'imdb' && (!movieData || movieData.length === 0)) ||
              (viewMode === 'ratings' && (!ratingsData || ratingsData.length === 0))
            }
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

      {hasImdbError && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">
            Fehler beim Laden der IMDb-IDs. Überprüfe deine Internetverbindung.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {titles.map((title, index) => {
          const movieInfo = movieData?.find(movie =>
            movie.title.toLowerCase().includes(title.toLowerCase()) ||
            title.toLowerCase().includes(movie.title.toLowerCase())
          );

          const ratingInfo = ratingsData?.find(movie =>
            movie.title.toLowerCase().includes(title.toLowerCase()) ||
            title.toLowerCase().includes(movie.title.toLowerCase())
          );

          const renderContent = () => {
            switch (viewMode) {
              case 'titles':
                return <span className="font-medium">{title}</span>;

              case 'imdb':
                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{title}</span>
                      {isLoadingImdb && (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {movieInfo && (
                      <div className="flex items-center gap-2 text-sm">
                        {movieInfo.imdbId ? (
                          <>
                            <Badge
                              variant="outline"
                              className={`text-xs ${getConfidenceColor(movieInfo.confidence)}`}
                            >
                              {getConfidenceLabel(movieInfo.confidence)}
                            </Badge>
                            <code className="bg-background px-2 py-1 rounded text-xs font-mono">
                              {movieInfo.imdbId}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openImdbPage(movieInfo.imdbId!)}
                              className="h-6 px-2"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            IMDb-ID nicht gefunden
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );

              case 'ratings':
                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{title}</span>
                      {isLoadingRatings && (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {ratingInfo && (
                      <div className="flex items-center gap-2 text-sm">
                        {ratingInfo.rating ? (
                          <>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold text-lg">
                                {ratingInfo.rating}
                              </span>
                              <span className="text-muted-foreground">/10</span>
                            </div>
                            {ratingInfo.votes && (
                              <span className="text-muted-foreground text-xs">
                                ({ratingInfo.votes} votes)
                              </span>
                            )}
                            {ratingInfo.imdbId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openImdbPage(ratingInfo.imdbId!)}
                                className="h-6 px-2"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            Bewertung nicht verfügbar
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );

              default:
                return <span className="font-medium">{title}</span>;
            }
          };

          const getCopyText = () => {
            switch (viewMode) {
              case 'titles':
                return title;
              case 'imdb':
                return movieInfo?.imdbId || title;
              case 'ratings':
                return ratingInfo?.rating ? `${title}: ${ratingInfo.rating}/10` : title;
              default:
                return title;
            }
          };

          const getCopyDescription = () => {
            switch (viewMode) {
              case 'titles':
                return `"${title}" wurde in die Zwischenablage kopiert`;
              case 'imdb':
                return movieInfo?.imdbId
                  ? `IMDb-ID "${movieInfo.imdbId}" kopiert`
                  : `"${title}" wurde in die Zwischenablage kopiert`;
              case 'ratings':
                return ratingInfo?.rating
                  ? `Bewertung "${title}: ${ratingInfo.rating}/10" kopiert`
                  : `"${title}" wurde in die Zwischenablage kopiert`;
              default:
                return `"${title}" wurde in die Zwischenablage kopiert`;
            }
          };

          return (
            <div
              key={index}
              className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  {renderContent()}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(getCopyText(), getCopyDescription())}
                  className="ml-2 hover:bg-primary/10"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
