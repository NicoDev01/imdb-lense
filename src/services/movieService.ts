import { getImdbIdForTitle } from '@/services/tmdbService';
import { getImdbRatingByImdbId } from '@/services/omdbService';
import { extractYearFromTitle } from '@/services/ocrService';

export const fetchMovieData = async (title: string) => {
  const { title: cleanTitle, year } = extractYearFromTitle(title);

  // 1. Fetch TMDB data
  let movieData = null;
  if (year) {
    movieData = await getImdbIdForTitle(cleanTitle, { year });
  }
  if (!movieData) {
    movieData = await getImdbIdForTitle(cleanTitle);
  }

  if (!movieData?.imdbId) {
    return { ocrTitle: title, ...movieData, rating: null, votes: null };
  }

  // 2. Fetch OMDb data if IMDb ID exists
  const ratingData = await getImdbRatingByImdbId(movieData.imdbId);

  return {
    ocrTitle: title,
    ...movieData,
    rating: ratingData?.rating ?? null,
    votes: ratingData?.votes ?? null,
  };
};
