import React, { useState, useCallback, useMemo, useDeferredValue } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Film, Copy, Trash2, ExternalLink, Loader2, Star, Search, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useBatchImdbIds } from '@/hooks/useTmdb';
import { useBatchImdbRatingsFromTitles } from '@/hooks/useOmdb';
import type { MovieWithImdbId } from '@/types/tmdb';

interface MovieTitlesListProps {
  titles: string[];
  onClear: () => void;
  processedTitles?: Set<string>;
  onTitlesProcessed?: (newTitles: string[]) => void;
  existingMovieData?: any[];
  onMovieDataUpdate?: (newData: any[]) => void;
}

// Skeleton Loading Component
const MovieSkeleton = () => (
  <div className="p-3 rounded-lg bg-secondary/30 border border-transparent">
    <div className="flex items-center justify-between mb-2">
      <div className="h-4 bg-secondary/50 rounded w-3/4 animate-pulse"></div>
      <div className="w-3 h-3 bg-secondary/50 rounded animate-pulse"></div>
    </div>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="h-5 bg-secondary/50 rounded w-20 animate-pulse"></div>
        <div className="w-5 h-5 bg-secondary/50 rounded animate-pulse"></div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-6 bg-secondary/50 rounded w-12 animate-pulse"></div>
        <div className="w-5 h-5 bg-secondary/50 rounded animate-pulse"></div>
      </div>
    </div>
  </div>
);

export const MovieTitlesList = React.memo<MovieTitlesListProps>(function MovieTitlesList({
  titles,
  onClear,
  processedTitles = new Set(),
  onTitlesProcessed,
  existingMovieData = [],
  onMovieDataUpdate
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Such- und Filter-States
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'rating' | 'hasImdb' | 'none'>('none');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showImdbIds, setShowImdbIds] = useState(false); // IMDb IDs standardmäßig ausblenden

  // Debounced search mit useDeferredValue
  const deferredSearchTerm = useDeferredValue(searchTerm);

  // TMDB + OMDb integration for complete movie data - OPTIMIZED for new titles only
  const {
    data: newMovieData,
    allTitles,
    isLoading: isLoadingImdb,
    isError: hasImdbError,
    newTitlesCount,
    hasNewData
  } = useBatchImdbIds(
    titles,
    { language: 'de-DE', region: 'DE' },
    processedTitles
  );

  // For now, just use new data - in a real app you'd combine with cached data
  const movieData = useMemo(() => {
    return newMovieData || [];
  }, [newMovieData]);

  // OMDb ratings for movies with IMDb IDs
  const { data: ratingsData, isLoading: isLoadingRatings, isError: hasRatingsError } = useBatchImdbRatingsFromTitles(titles);

  // Stable callbacks with useCallback
  const copyToClipboard = useCallback(async (text: string, description: string) => {
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
  }, [toast]);

  const copyAllTitles = useCallback(async () => {
    const allTitles = titles.join('\n');
    await copyToClipboard(allTitles, `${titles.length} Titel wurden in die Zwischenablage kopiert`);
  }, [titles, copyToClipboard]);

  const copyAllImdbIds = useCallback(async () => {
    if (!movieData || movieData.length === 0) return;

    const imdbIds = movieData
      .map(movie => movie.imdbId)
      .filter(id => id !== null)
      .join('\n');

    if (imdbIds) {
      await copyToClipboard(imdbIds, `${movieData.length} IMDb-IDs wurden in die Zwischenablage kopiert`);
    }
  }, [movieData, copyToClipboard]);

  const copyAllRatings = useCallback(async () => {
    if (!ratingsData || ratingsData.length === 0) return;

    const ratings = ratingsData
      .map(movie => movie.rating ? `${movie.title}: ${movie.rating}/10` : null)
      .filter(rating => rating !== null)
      .join('\n');

    if (ratings) {
      await copyToClipboard(ratings, `${ratingsData.length} Bewertungen wurden in die Zwischenablage kopiert`);
    }
  }, [ratingsData, copyToClipboard]);

  const openImdbPage = useCallback((imdbId: string) => {
    window.open(`https://www.imdb.com/title/${imdbId}`, '_blank');
  }, []);

  // Pull-to-Refresh Funktion
  const handleRefresh = useCallback(async () => {
    toast({
      title: 'Aktualisiere...',
      description: 'Daten werden neu geladen',
    });

    // Invalidate TMDB und OMDb Queries
    await queryClient.invalidateQueries({ queryKey: ['tmdb'] });
    await queryClient.invalidateQueries({ queryKey: ['omdb'] });

    toast({
      title: 'Aktualisiert!',
      description: 'Alle Daten wurden neu geladen',
    });
  }, [queryClient, toast]);

  // Sortierfunktionen
  const toggleSort = useCallback((newSortBy: 'title' | 'rating' | 'hasImdb') => {
    if (sortBy === newSortBy) {
      // Toggle Sortierrichtung
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Neue Sortierung - Rating standardmäßig absteigend (hohe Ratings zuerst)
      setSortBy(newSortBy);
      setSortOrder(newSortBy === 'rating' ? 'desc' : 'asc');
    }
  }, [sortBy, sortOrder]);

  // Enhanced matching function for OCR titles to TMDB results
  const findBestMatch = useCallback((ocrTitle: string, candidates: any[]) => {
    if (!candidates || candidates.length === 0) return null;

    const ocrNormalized = ocrTitle.toLowerCase().trim();
    const ocrWords = ocrNormalized.split(/\s+/).filter(word => word.length > 1);

    // Find best match using multiple strategies
    let bestMatch = null;
    let bestScore = 0;

    for (const candidate of candidates) {
      const tmdbTitle = (candidate.title || '').toLowerCase().trim();
      const tmdbOriginalTitle = (candidate.original_title || '').toLowerCase().trim();
      let score = 0;

      // Strategy 1: Exact match with title or original title
      if (tmdbTitle === ocrNormalized || tmdbOriginalTitle === ocrNormalized) {
        score = 100;
      }
      // Strategy 2: OCR title is contained in TMDB title
      else if (tmdbTitle.includes(ocrNormalized) || tmdbOriginalTitle.includes(ocrNormalized)) {
        score = 90;
      }
      // Strategy 3: TMDB title is contained in OCR title (more restrictive)
      else if (ocrNormalized.includes(tmdbTitle) && tmdbTitle.length > 3) {
        score = Math.max(60, 80 - Math.abs(ocrNormalized.length - tmdbTitle.length));
      }
      else if (ocrNormalized.includes(tmdbOriginalTitle) && tmdbOriginalTitle && tmdbOriginalTitle.length > 3) {
        score = Math.max(60, 80 - Math.abs(ocrNormalized.length - tmdbOriginalTitle.length));
      }
      // Strategy 4: Word-level matching (stricter)
      else {
        const tmdbWords = tmdbTitle.split(/\s+/).filter(w => w.length > 2);
        const tmdbOriginalWords = tmdbOriginalTitle ? tmdbOriginalTitle.split(/\s+/).filter(w => w.length > 2) : [];

        const commonWords = ocrWords.filter(word =>
          tmdbWords.some(tmdbWord =>
            tmdbWord.toLowerCase() === word.toLowerCase() || // Exact word match
            (tmdbWord.length > 4 && word.length > 4 && (
              tmdbWord.includes(word) || word.includes(tmdbWord)
            ))
          ) ||
          tmdbOriginalWords.some(tmdbWord =>
            tmdbWord.toLowerCase() === word.toLowerCase() || // Exact word match
            (tmdbWord.length > 4 && word.length > 4 && (
              tmdbWord.includes(word) || word.includes(tmdbWord)
            ))
          )
        );

        const wordMatchRatio = commonWords.length / Math.max(ocrWords.length, 1);
        score = wordMatchRatio * 60;

        // Penalty for very different lengths
        const lengthDiff = Math.abs(ocrNormalized.length - tmdbTitle.length);
        if (lengthDiff > 10) {
          score -= 20;
        }
      }

      // Boost score for exact word matches
      const exactWordMatches = ocrWords.filter(word =>
        tmdbTitle.includes(word) || tmdbOriginalTitle.includes(word)
      ).length;
      score += exactWordMatches * 5;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    return bestScore >= 40 ? bestMatch : null; // Higher threshold to avoid false matches
  }, []);

  // useMemo für teure Film-Matching Berechnungen (außerhalb der map!)
  const movieMatches = useMemo(() => {
    const matches: Record<string, any> = {};
    console.log('🎯 Building movie matches:', {
      titlesCount: titles.length,
      movieDataCount: movieData?.length || 0,
      movieData: movieData?.map(m => ({ title: m.title, imdbId: m.imdbId }))
    });

    titles.forEach(title => {
      const match = findBestMatch(title, movieData || []);
      console.log('🔍 Match result for:', title, '->', match ? match.title : 'NO MATCH');
      matches[title] = match;
    });
    return matches;
  }, [movieData, titles, findBestMatch]);

  const ratingMatches = useMemo(() => {
    const matches: Record<string, any> = {};
    titles.forEach(title => {
      matches[title] = findBestMatch(title, ratingsData || []);
    });
    return matches;
  }, [ratingsData, titles, findBestMatch]);

  // Gefilterte und sortierte Titel (nach den Matches!)
  const filteredAndSortedTitles = useMemo(() => {
    // Zuerst filtern nach Suchbegriff
    let filtered = titles.filter(title =>
      title.toLowerCase().includes(deferredSearchTerm.toLowerCase())
    );

    // Dann sortieren
    if (sortBy !== 'none') {
      filtered.sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case 'title':
            comparison = a.localeCompare(b, 'de', { sensitivity: 'base' });
            break;

          case 'rating':
            const ratingA = ratingMatches[a]?.rating || 0;
            const ratingB = ratingMatches[b]?.rating || 0;
            comparison = ratingB - ratingA; // Umgekehrte Subtraktion für korrekte Sortierung
            break;

          case 'hasImdb':
            const hasImdbA = !!movieMatches[a]?.imdbId;
            const hasImdbB = !!movieMatches[b]?.imdbId;
            comparison = hasImdbA === hasImdbB ? 0 : hasImdbA ? -1 : 1;
            break;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [titles, deferredSearchTerm, sortBy, sortOrder, movieMatches, ratingMatches]);

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

  // Remove the "no matches" screen - always show titles immediately
  const hasTitlesButNoMatches = false;

  // Check if OCR found only very short or numeric titles (poor quality recognition)
  const hasPoorQualityTitles = titles.length > 0 && titles.every(title =>
    title.length < 3 || /^\d+(\.\d+)?$/.test(title) || title === '0.00'
  );

  if (hasPoorQualityTitles) {
    return (
      <Card className="bg-gradient-card shadow-card border-border p-8 text-center">
        <Film className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <h3 className="text-lg font-semibold mb-2">Schlechte Bildqualität</h3>
        <p className="text-muted-foreground mb-4">
          Die OCR konnte nur kurze Texte oder Zahlen erkennen. Das Bild ist möglicherweise zu dunkel, verschwommen oder der Winkel ist ungünstig.
        </p>
        <div className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded mb-4">
          <strong>Erkannte Texte:</strong>
          <div className="mt-1 font-mono">"{titles.join('", "')}"</div>
        </div>
        <div className="text-xs text-muted-foreground mb-4">
          💡 <strong>Tipps für bessere Ergebnisse:</strong><br />
          • Verwende helleres Licht<br />
          • Halte die Kamera gerade über das Cover<br />
          • Fokussiere auf den Titelbereich<br />
          • Vermeide Spiegelungen
        </div>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          size="sm"
        >
          Neues Foto aufnehmen
        </Button>
      </Card>
    );
  }

  if (hasTitlesButNoMatches) {
    return (
      <Card className="bg-gradient-card shadow-card border-border p-8 text-center">
        <Film className="w-12 h-12 mx-auto mb-4 text-orange-500" />
        <h3 className="text-lg font-semibold mb-2">Titel erkannt, aber nicht gefunden</h3>
        <p className="text-muted-foreground mb-4">
          Die OCR hat Titel gefunden, aber TMDB konnte keine passenden Filme identifizieren.
        </p>
        <div className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded">
          <strong>Gefundene Titel:</strong>
          <div className="mt-1">{titles.join(', ')}</div>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="mt-4"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Erneut versuchen
        </Button>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card shadow-card border-border p-4 mb-4">
      {/* Minimaler Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
            {titles.length} Film{titles.length !== 1 ? 'e' : ''}
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyAllTitles}
            className="h-6 px-2 text-xs"
            title="Alle Titel kopieren"
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-6 px-2 text-xs text-destructive hover:bg-destructive/10"
            title="Alle löschen"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Minimal Controls */}
      <div className="mb-3 flex justify-end gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortBy(sortBy === 'rating' ? 'none' : 'rating')}
          className="h-7 px-2 text-xs"
        >
          <Star className="w-3 h-3 mr-1" />
          {sortBy === 'rating' ? 'Sortieren aus' : 'Nach Rating'}
        </Button>
      </div>

      {/* Error Banner - kompakter */}
      {(hasImdbError || hasRatingsError) && (
        <div className="mb-3 p-2 rounded bg-destructive/5 border border-destructive/20">
          <p className="text-xs text-destructive">Verbindungsfehler</p>
        </div>
      )}

      {/* Film Liste - ultra-kompakt */}
      <div className="space-y-1">
        {filteredAndSortedTitles.map((title, index) => {
          const movieInfo = movieMatches[title];
          const ratingInfo = ratingMatches[title];
          const isLoading = isLoadingImdb || isLoadingRatings;

          // Debug logging
          console.log('🎬 Rendering title:', title, {
            movieInfo: movieInfo ? 'EXISTS' : 'NULL',
            imdbId: movieInfo?.imdbId,
            ratingInfo: ratingInfo ? 'EXISTS' : 'NULL',
            rating: ratingInfo?.rating
          });

          return (
            <div
              key={index}
              className={`group flex items-center justify-between p-2 rounded-md hover:bg-secondary/50 transition-colors border border-transparent hover:border-secondary/30 ${
                ratingInfo?.rating >= 7 ? 'bg-green-50/30 dark:bg-green-900/10' : ''
              }`}
            >
              {/* Titel - prominent */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate flex-1">{title}</h4>
                {isLoading && (
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground flex-shrink-0" />
                )}
              </div>

              {/* IMDb-ID - nur wenn aktiviert */}
              {showImdbIds && movieInfo?.imdbId && (
                <code className="bg-background/30 px-1.5 py-0.5 rounded text-xs font-mono text-muted-foreground border flex-shrink-0 mr-2">
                  {movieInfo.imdbId}
                </code>
              )}

              {/* IMDb Link + Rating */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* IMDb Link - immer sichtbar */}
                {movieInfo?.imdbId ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openImdbPage(movieInfo.imdbId!)}
                    className="h-6 w-6 p-0 hover:bg-primary/10"
                    title="IMDb öffnen"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground w-6 text-center">—</span>
                )}

                {/* Rating - immer prominent */}
                {ratingInfo?.rating ? (
                  <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-full">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold text-sm text-yellow-700 dark:text-yellow-300">
                      {ratingInfo.rating}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground w-8 text-center">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
});
