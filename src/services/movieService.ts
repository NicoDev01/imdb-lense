import { getImdbIdForTitle } from '@/services/tmdbService';
import { getImdbRatingByImdbId } from '@/services/omdbService';
import { extractYearFromTitle } from '@/services/ocrService';

export const fetchMovieData = async (title: string) => {
  const { title: cleanTitle, year } = extractYearFromTitle(title);
  const options = { language: 'de-DE', region: 'DE' };

  // 1. Fetch TMDB data with error handling
  let movieData = null;
  try {
    if (year) {
      movieData = await getImdbIdForTitle(cleanTitle, { ...options, year });
    }
    if (!movieData) {
      movieData = await getImdbIdForTitle(cleanTitle, options);
    }
  } catch (error) {
    console.error(`Failed to fetch TMDB data for "${title}":`, error);
    // Return minimal data to avoid breaking the UI on TMDB error
    return { ocrTitle: title, rating: null, votes: null, imdbId: null };
  }

  // If no movie or IMDb ID is found, return what we have
  if (!movieData?.imdbId) {
    return { ocrTitle: title, ...movieData, rating: null, votes: null };
  }

  // 2. Fetch OMDb data if IMDb ID exists, with its own error handling
  let ratingData = null;
  try {
    ratingData = await getImdbRatingByImdbId(movieData.imdbId);
  } catch (error) {
    console.error(`Failed to fetch OMDb rating for "${title}" (IMDb ID: ${movieData.imdbId}):`, error);
    // On OMDb error, we can still proceed with just the TMDB data
  }

  return {
    ocrTitle: title,
    ...movieData,
    rating: ratingData?.rating ?? null,
    votes: ratingData?.votes ?? null,
  };
};
