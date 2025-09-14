import type { OmdbMovieResponse, OmdbError, MovieRating } from '@/types/omdb';

// OMDb API Configuration
const OMDB_BASE_URL = 'https://www.omdbapi.com/';
const OMDB_API_KEY = import.meta.env.VITE_OMDB_API_KEY;

if (!OMDB_API_KEY) {
  console.warn('VITE_OMDB_API_KEY not found. OMDb integration will not work.');
}

// Generic OMDb API fetch function with error handling
async function omdbFetch<T>(
  endpoint: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(OMDB_BASE_URL);

  // Add API key
  url.searchParams.set('apikey', OMDB_API_KEY);

  // Add additional params
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  // Add endpoint if provided
  if (endpoint) {
    url.searchParams.set('i', endpoint); // For IMDb ID queries
  }

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`OMDb API Error: ${response.status}`);
    }

    const data = await response.json();

    // Check for OMDb-specific error response
    if (data.Response === 'False') {
      const errorData = data as OmdbError;
      throw new Error(`OMDb API Error: ${errorData.Error}`);
    }

    return data as T;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error while fetching from OMDb');
  }
}

// Get movie details by IMDb ID
export async function getMovieByImdbId(imdbId: string): Promise<OmdbMovieResponse> {
  return omdbFetch<OmdbMovieResponse>(imdbId);
}

// Extract IMDb rating from movie data
export function extractImdbRating(movieData: OmdbMovieResponse): number | null {
  if (!movieData.imdbRating || movieData.imdbRating === 'N/A') {
    return null;
  }

  const rating = parseFloat(movieData.imdbRating);
  return Number.isFinite(rating) ? rating : null;
}

// Extract IMDb votes from movie data
export function extractImdbVotes(movieData: OmdbMovieResponse): string | null {
  if (!movieData.imdbVotes || movieData.imdbVotes === 'N/A') {
    return null;
  }

  return movieData.imdbVotes;
}

// Main function: Get IMDb rating for a movie by IMDb ID
export async function getImdbRatingByImdbId(imdbId: string): Promise<MovieRating | null> {
  try {
    console.log('🔍 OMDB: Requesting rating for IMDb ID:', imdbId);
    const movieData = await getMovieByImdbId(imdbId);
    console.log('📊 OMDB Response for', imdbId, ':', {
      title: movieData.Title,
      imdbRating: movieData.imdbRating,
      imdbVotes: movieData.imdbVotes,
      response: movieData.Response
    });

    const rating = extractImdbRating(movieData);
    const votes = extractImdbVotes(movieData);

    const result = {
      imdbId,
      rating,
      votes,
      source: 'omdb'
    };

    console.log('✅ OMDB: Extracted rating for', imdbId, ':', result);
    return result;
  } catch (error) {
    console.error('❌ OMDB Error for ID:', imdbId, error);
    return null;
  }
}

// Batch processing for multiple IMDb IDs
export async function getImdbRatingsForIds(
  imdbIds: string[]
): Promise<MovieRating[]> {
  const results: MovieRating[] = [];

  // Process in batches to avoid rate limits
  const batchSize = 5; // OMDb has more generous limits than TMDB
  for (let i = 0; i < imdbIds.length; i += batchSize) {
    const batch = imdbIds.slice(i, i + batchSize);

    const batchPromises = batch.map(id => getImdbRatingByImdbId(id));
    const batchResults = await Promise.all(batchPromises);

    results.push(...batchResults.filter((result): result is MovieRating => result !== null));

    // Small delay between batches to be respectful to the API
    if (i + batchSize < imdbIds.length) {
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }

  return results;
}

// Search movies by title (alternative to TMDB if needed)
export async function searchMoviesByTitle(
  title: string,
  options: { type?: 'movie' | 'series' | 'episode'; year?: number } = {}
): Promise<any[]> {
  const params: Record<string, string> = {
    s: title,
    type: options.type || 'movie'
  };

  if (options.year) {
    params.y = options.year.toString();
  }

  const response = await omdbFetch<any>('', params);
  return response.Search || [];
}

// Get full movie details by title (alternative approach)
export async function getMovieByTitle(
  title: string,
  options: { type?: 'movie' | 'series' | 'episode'; year?: number } = {}
): Promise<OmdbMovieResponse> {
  const params: Record<string, string> = {
    t: title,
    type: options.type || 'movie'
  };

  if (options.year) {
    params.y = options.year.toString();
  }

  return omdbFetch<OmdbMovieResponse>('', params);
}
