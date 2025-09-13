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

export const MovieTitlesList = React.memo<MovieTitlesListProps>(function MovieTitlesList({ titles, onClear }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Such- und Filter-States
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'rating' | 'hasImdb' | 'none'>('none');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Debounced search mit useDeferredValue
  const deferredSearchTerm = useDeferredValue(searchTerm);

  // TMDB + OMDb integration for complete movie data
  const { data: movieData, isLoading: isLoadingImdb, isError: hasImdbError } = useBatchImdbIds(
    titles,
    { language: 'de-DE', region: 'DE' }
  );

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
      // Neue Sortierung
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  }, [sortBy, sortOrder]);

  // Enhanced matching function for OCR titles to TMDB results
  const findBestMatch = useCallback((ocrTitle: string, candidates: any[]) => {
    if (!candidates || candidates.length === 0) return null;

    const ocrNormalized = ocrTitle.toLowerCase().trim();

    // Find best match using multiple strategies
    let bestMatch = null;
    let bestScore = 0;

    for (const candidate of candidates) {
      const tmdbTitle = candidate.title?.toLowerCase().trim() || '';
      let score = 0;

      // Strategy 1: OCR title is contained in TMDB title (most common case)
      if (tmdbTitle.includes(ocrNormalized)) {
        score = 100;
      }
      // Strategy 2: TMDB title is contained in OCR title (less common)
      else if (ocrNormalized.includes(tmdbTitle)) {
        score = 80;
      }
      // Strategy 3: Fuzzy matching - count common words
      else {
        const ocrWords = ocrNormalized.split(/\s+/);
        const tmdbWords = tmdbTitle.split(/\s+/);
        const commonWords = ocrWords.filter(word =>
          tmdbWords.some(tmdbWord =>
            tmdbWord.includes(word) || word.includes(tmdbWord)
          )
        );
        score = (commonWords.length / Math.max(ocrWords.length, tmdbWords.length)) * 60;
      }

      // Boost score for exact word matches
      const exactWordMatches = ocrNormalized.split(/\s+/).filter(word =>
        tmdbTitle.includes(word)
      ).length;
      score += exactWordMatches * 10;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    return bestScore >= 30 ? bestMatch : null; // Minimum threshold
  }, []);

  // useMemo für teure Film-Matching Berechnungen (außerhalb der map!)
  const movieMatches = useMemo(() => {
    const matches: Record<string, any> = {};
    titles.forEach(title => {
      matches[title] = findBestMatch(title, movieData || []);
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
            comparison = ratingA - ratingB;
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

  return (
    <Card className="bg-gradient-card shadow-card border-border p-4">
      {/* Header - kompakter */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-primary" />
          <h3 className="text-lg font-semibold">Filme</h3>
          <Badge variant="secondary" className="text-xs">
            {titles.length}
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyAllTitles}
            className="h-7 px-2 text-xs hover:bg-secondary"
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-7 px-2 text-xs hover:bg-destructive/10 text-destructive"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Suchleiste und Steuerung */}
      <div className="mb-4 space-y-3">
        {/* Suchleiste */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Filme suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm('')}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            >
              ✕
            </Button>
          )}
        </div>

        {/* Sortier- und Refresh-Controls */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <Button
              variant={sortBy === 'title' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleSort('title')}
              className="h-7 px-2 text-xs"
            >
              <ArrowUpDown className="w-3 h-3 mr-1" />
              Titel
              {sortBy === 'title' && (
                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
              )}
            </Button>

            <Button
              variant={sortBy === 'rating' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleSort('rating')}
              className="h-7 px-2 text-xs"
            >
              <Star className="w-3 h-3 mr-1" />
              Rating
              {sortBy === 'rating' && (
                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
              )}
            </Button>

            <Button
              variant={sortBy === 'hasImdb' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleSort('hasImdb')}
              className="h-7 px-2 text-xs"
            >
              IMDb
              {sortBy === 'hasImdb' && (
                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
              )}
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-7 px-2 text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh
          </Button>
        </div>

        {/* Suchergebnisse Info */}
        {deferredSearchTerm && (
          <div className="text-xs text-muted-foreground">
            {filteredAndSortedTitles.length} von {titles.length} Filmen gefunden
          </div>
        )}
      </div>

      {/* Error Banner - kompakter */}
      {(hasImdbError || hasRatingsError) && (
        <div className="mb-3 p-2 rounded bg-destructive/5 border border-destructive/20">
          <p className="text-xs text-destructive">Verbindungsfehler</p>
        </div>
      )}

      {/* Film Liste - mit Skeleton Loading */}
      <div className="space-y-2">
        {filteredAndSortedTitles.map((title, index) => {
          // Verwende die vorberechneten Matches
          const movieInfo = movieMatches[title];
          const ratingInfo = ratingMatches[title];

          const isLoading = isLoadingImdb || isLoadingRatings;
          const hasData = movieInfo?.imdbId || ratingInfo?.rating;

          // Skeleton Loading für bessere UX
          if (isLoading && !hasData) {
            return <MovieSkeleton key={index} />;
          }

          return (
            <div
              key={index}
              className="group p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-all duration-200 border border-transparent hover:border-secondary"
            >
              {/* Titel + Loading in einer Zeile */}
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm flex-1 truncate pr-2">{title}</h4>
                {isLoading && (
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground flex-shrink-0" />
                )}
              </div>

              {/* IMDb-ID und Rating inline */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {movieInfo?.imdbId ? (
                    <>
                      <code className="bg-background/50 px-1.5 py-0.5 rounded text-xs font-mono text-muted-foreground border">
                        {movieInfo.imdbId}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openImdbPage(movieInfo.imdbId!)}
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </>
                  ) : hasData ? (
                    <span className="text-xs text-muted-foreground">Kein IMDb-Eintrag</span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {ratingInfo?.rating ? (
                    <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded-full">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold text-sm text-yellow-700 dark:text-yellow-300">
                        {ratingInfo.rating}
                      </span>
                    </div>
                  ) : hasData ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : null}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(
                      `${title}${movieInfo?.imdbId ? ` (${movieInfo.imdbId})` : ''}${ratingInfo?.rating ? ` ★${ratingInfo.rating}` : ''}`,
                      `"${title}" kopiert`
                    )}
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
});
