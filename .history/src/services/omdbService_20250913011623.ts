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

