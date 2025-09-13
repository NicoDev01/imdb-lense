import { useQuery } from '@tanstack/react-query';
import { getImdbRatingByImdbId, getImdbRatingsForIds } from '@/services/omdbService';
import type { MovieRating } from '@/types/omdb';

// Hook for single IMDb rating lookup
export const useImdbRating = (
  imdbId: string | undefined
) => {
  return useQuery({
    queryKey: ['omdb', 'rating', imdbId],
    queryFn: () => imdbId ? getImdbRatingByImdbId(imdbId) : null,
    enabled: !!imdbId,
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: (failureCount, error) => {
      // Don't retry on certain OMDb errors
      if (error instanceof Error && error.message.includes('Movie not found')) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

// Hook for multiple IMDb ratings lookup
export const useImdbRatings = (
  imdbIds: string[]
) => {
  return useQuery({
    queryKey: ['omdb', 'ratings', imdbIds],
    queryFn: () => getImdbRatingsForIds(imdbIds),
    enabled: imdbIds.length > 0,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

// Dependent query hook: Title → IMDb ID → Rating
export const useImdbRatingFromTitle = (
  title: string | undefined
) => {
  // First query: Get IMDb ID from title (using existing TMDB hook)
  const { data: imdbData, isLoading: isLoadingImdb, isError: hasImdbError } = useQuery({
    queryKey: ['tmdb', 'imdbId', title],
    queryFn: async () => {
      if (!title) return null;
      const { getImdbIdForTitle } = await import('@/services/tmdbService');
      return getImdbIdForTitle(title, { language: 'de-DE', region: 'DE' });
    },
    enabled: !!title?.trim(),
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
  });

  const imdbId = imdbData?.imdbId;

  // Second query: Get rating from IMDb ID (dependent on first query)
  const { data: ratingData, isLoading: isLoadingRating, isError: hasRatingError } = useQuery({
    queryKey: ['omdb', 'rating', imdbId],
    queryFn: () => imdbId ? getImdbRatingByImdbId(imdbId) : null,
    enabled: !!imdbId,
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
  });

  return {
    // TMDB query status
    imdbQuery: {
      data: imdbData,
      isLoading: isLoadingImdb,
      isError: hasImdbError
    },
    // OMDb query status
    ratingQuery: {
      data: ratingData,
      isLoading: isLoadingRating,
      isError: hasRatingError
    },
    // Combined data
    title,
    imdbId,
    rating: ratingData?.rating ?? null,
    votes: ratingData?.votes ?? null,
    confidence: imdbData?.confidence ?? 'low',
    // Overall status
    isLoading: isLoadingImdb || isLoadingRating,
    isError: hasImdbError || hasRatingError,
    hasData: !!(imdbData && ratingData)
  };
};

// Hook for batch processing: Multiple titles → IMDb IDs → Ratings
export const useBatchImdbRatingsFromTitles = (
  titles: string[]
) => {
  // First: Get all IMDb IDs
  const { data: imdbData, isLoading: isLoadingImdb, isError: hasImdbError } = useQuery({
    queryKey: ['tmdb', 'batchImdbIds', titles],
    queryFn: async () => {
      const { getImdbIdsForTitles } = await import('@/services/tmdbService');
      return getImdbIdsForTitles(titles, { language: 'de-DE', region: 'DE' });
    },
    enabled: titles.length > 0,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // Extract valid IMDb IDs
  const validImdbIds = imdbData?.map(item => item.imdbId).filter((id): id is string => id !== null) ?? [];

  // Second: Get ratings for all valid IMDb IDs
  const { data: ratingsData, isLoading: isLoadingRatings, isError: hasRatingsError } = useQuery({
    queryKey: ['omdb', 'batchRatings', validImdbIds],
    queryFn: () => getImdbRatingsForIds(validImdbIds),
    enabled: validImdbIds.length > 0,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // Combine TMDB and OMDb data
  const combinedData = imdbData?.map(imdbItem => {
    const ratingItem = ratingsData?.find(rating => rating.imdbId === imdbItem.imdbId);
    return {
      ...imdbItem,
      rating: ratingItem?.rating ?? null,
      votes: ratingItem?.votes ?? null
    };
  }) ?? [];

  return {
    data: combinedData,
    isLoading: isLoadingImdb || isLoadingRatings,
    isError: hasImdbError || hasRatingsError,
    imdbQuery: { data: imdbData, isLoading: isLoadingImdb, isError: hasImdbError },
    ratingsQuery: { data: ratingsData, isLoading: isLoadingRatings, isError: hasRatingsError }
  };
};
