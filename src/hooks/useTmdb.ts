import { useQuery, useQueries } from '@tanstack/react-query';
import { getImdbIdForTitle, getImdbIdsForTitles } from '@/services/tmdbService';
import { extractYearFromTitle } from '@/services/ocrService';
import type { MovieWithImdbId, TMDBSearchOptions } from '@/types/tmdb';

// Hook for single title lookup
export const useImdbIdForTitle = (
  title: string | undefined,
  options: TMDBSearchOptions = {}
) => {
  return useQuery({
    queryKey: ['tmdb', 'imdbId', title, options],
    queryFn: () => title ? getImdbIdForTitle(title, options) : null,
    enabled: !!title?.trim(),
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: (failureCount, error) => {
      // Don't retry on 404s or client errors
      if (error instanceof Error && error.message.includes('404')) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

// Hook for multiple titles lookup
export const useImdbIdsForTitles = (
  titles: string[],
  options: TMDBSearchOptions = {}
) => {
  return useQuery({
    queryKey: ['tmdb', 'imdbIds', titles, options],
    queryFn: () => getImdbIdsForTitles(titles, options),
    enabled: titles.length > 0,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

// Hook for movie details
export const useMovieDetails = (
  tmdbId: number | undefined,
  language = 'de-DE'
) => {
  return useQuery({
    queryKey: ['tmdb', 'movie', tmdbId, language],
    queryFn: async () => {
      if (!tmdbId) return null;
      const { getMovieDetails } = await import('@/services/tmdbService');
      return getMovieDetails(tmdbId, language);
    },
    enabled: !!tmdbId,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};
