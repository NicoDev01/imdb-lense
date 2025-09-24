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

// Hook for batch processing with individual queries - OPTIMIZED for new titles only
export const useBatchImdbIds = (
  titles: string[],
  options: TMDBSearchOptions = {},
  processedTitles: Set<string> = new Set()
) => {
  // Process ALL titles - React Query handles caching automatically
  console.log('🎯 Processing ALL titles:', {
    totalTitles: titles.length,
    processedTitles: processedTitles.size,
    allTitles: titles
  });

  const queries = useQueries({
    queries: titles.map(title => {
      // Extract year from title for better search accuracy
      const { title: cleanTitle, year } = extractYearFromTitle(title);

      return {
        queryKey: ['tmdb', 'imdbId', cleanTitle, year, options],
        queryFn: async () => {
          // Try search WITH year first
          if (year) {
            console.log('🎯 Trying search WITH year:', cleanTitle, year);
            const resultWithYear = await getImdbIdForTitle(cleanTitle, { ...options, year });
            if (resultWithYear) {
              console.log('✅ Found with year:', resultWithYear.title);
              // Return with original OCR title for matching
              return { ...resultWithYear, ocrTitle: title };
            }
            console.log('❌ No results with year, trying WITHOUT year...');
          }

          // Fallback: Search WITHOUT year
          const resultWithoutYear = await getImdbIdForTitle(cleanTitle, options);
          if (resultWithoutYear) {
            console.log('✅ Found without year:', resultWithoutYear.title);
            // Return with original OCR title for matching
            return { ...resultWithoutYear, ocrTitle: title };
          } else {
            console.log('❌ No results found for:', cleanTitle);
          }
          return null;
        },
        enabled: !!cleanTitle?.trim(),
        staleTime: 1000 * 60 * 60, // 1 hour
        retry: (failureCount, error) => {
          if (error instanceof Error && error.message.includes('404')) {
            return false;
          }
          return failureCount < 2;
        },
      };
    })
  });

  const isLoading = queries.some(query => query.isLoading);
  const isError = queries.some(query => query.isError);
  const errors = queries.map(query => query.error).filter(Boolean);

  // Collect all successful data from queries
  const newData = queries
    .map(query => query.data)
    .filter(data => data !== null && data !== undefined) as MovieWithImdbId[];

  console.log('🔍 useBatchImdbIds results for ALL titles:', {
    totalTitles: titles.length,
    queriesCount: queries.length,
    successfulQueries: queries.filter(q => q.data).length,
    dataCount: newData.length,
    isLoading,
    isError,
    data: newData.map(d => ({ title: d.title, imdbId: d.imdbId }))
  });

  // Return all processed data
  return {
    data: newData, // All processed data
    allTitles: titles, // All titles (for UI to know total count)
    isLoading,
    isError,
    errors,
    queries,
    processedTitlesCount: processedTitles.size,
    totalTitlesCount: titles.length,
    hasData: newData.length > 0
  };
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
