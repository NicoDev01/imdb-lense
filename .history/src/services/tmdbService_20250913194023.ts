import type {
  TMDBMovieSearchResult,
  TMDBSearchResponse,
  TMDBMovieDetails,
  TMDBExternalIds,
  TMDBError,
  MovieWithImdbId,
  TMDBSearchOptions
} from '@/types/tmdb';

// TMDB API Configuration
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;

if (!TMDB_API_KEY) {
  console.warn('VITE_TMDB_API_KEY not found. TMDB integration will not work.');
}

// Generic TMDB API fetch function with error handling
async function tmdbFetch<T>(
  endpoint: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);

  // Add API key as query parameter (fallback for v3 auth)
  url.searchParams.set('api_key', TMDB_API_KEY);

  // Add additional params
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limit exceeded - wait and retry
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return tmdbFetch<T>(endpoint, params);
      }

      const errorData: TMDBError = await response.json().catch(() => ({
        status_message: `HTTP ${response.status}`,
        status_code: response.status,
        success: false
      }));

      throw new Error(`TMDB API Error: ${errorData.status_message}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error while fetching from TMDB');
  }
}

// Enhanced text normalization for better matching
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD') // Unicode normalization
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Generate query variations for better matching
function generateQueryVariations(query: string): string[] {
  const normalized = normalizeText(query);
  const variations = [normalized];

  // Add version with different punctuation patterns
  variations.push(normalized.replace(/\s+/g, ', ')); // "title, subtitle"
  variations.push(normalized.replace(/\s+/g, ' - ')); // "title - subtitle"
  variations.push(normalized.replace(/\s+/g, ': ')); // "title: subtitle"

  // Add version without common prefixes/suffixes
  const withoutPrefix = normalized.replace(/^(the|a|an)\s+/i, '');
  if (withoutPrefix !== normalized) {
    variations.push(withoutPrefix);
  }

  return [...new Set(variations)]; // Remove duplicates
}

// Calculate match score for best result selection
function calculateMatchScore(
  movie: TMDBMovieSearchResult,
  queryTitle: string
): number {
  const query = normalizeText(queryTitle);
  const title = normalizeText(movie.title || '');
  const originalTitle = normalizeText(movie.original_title || '');

  let score = 0;

  // Exact matches get highest score
  if (title === query || originalTitle === query) {
    score += 100;
  }
  // Starts with query
  else if (title.startsWith(query) || originalTitle.startsWith(query)) {
    score += 60;
  }
  // Contains query
  else if (title.includes(query) || originalTitle.includes(query)) {
    score += 40;
  }

  // Popularity and vote count as tie-breakers
  const popularityScore = Math.min(20, Math.log10((movie.popularity || 0) + 1) * 5);
  const voteScore = Math.min(30, Math.log10((movie.vote_count || 0) + 1) * 10);

  return score + popularityScore + voteScore;
}

// Select best matching movie from search results
function selectBestMatch(
  results: TMDBMovieSearchResult[],
  queryTitle: string
): TMDBMovieSearchResult | null {
  if (results.length === 0) return null;

  const scored = results.map(movie => ({
    movie,
    score: calculateMatchScore(movie, queryTitle)
  }));

  scored.sort((a, b) => b.score - a.score);

  // Return best match if score is above threshold
  return scored[0].score > 20 ? scored[0].movie : null;
}

// Search for movies by title
export async function searchMovies(
  query: string,
  options: TMDBSearchOptions = {}
): Promise<TMDBMovieSearchResult[]> {
  const {
    language = 'de-DE',
    region = 'DE',
    year,
    includeAdult = false
  } = options;

  const params: Record<string, string> = {
    query: query.trim(),
    language,
    region,
    include_adult: includeAdult.toString(),
    page: '1'
  };

  if (year) {
    params.primary_release_year = year.toString();
  }

  const response: TMDBSearchResponse = await tmdbFetch('/search/movie', params);
  return response.results || [];
}

// Get movie details including IMDb ID
export async function getMovieDetails(
  movieId: number,
  language = 'de-DE'
): Promise<TMDBMovieDetails> {
  return tmdbFetch<TMDBMovieDetails>(`/movie/${movieId}`, {
    language,
    append_to_response: 'external_ids'
  });
}

// Get external IDs for a movie
export async function getMovieExternalIds(movieId: number): Promise<TMDBExternalIds> {
  return tmdbFetch<TMDBExternalIds>(`/movie/${movieId}/external_ids`);
}

// Main function: Get IMDb ID for a movie title
export async function getImdbIdForTitle(
  title: string,
  options: TMDBSearchOptions = {}
): Promise<MovieWithImdbId | null> {
  try {
    // 1. Search for movies
    const searchResults = await searchMovies(title, options);

    if (searchResults.length === 0) {
      return null;
    }

    // 2. Select best match
    const bestMatch = selectBestMatch(searchResults, title);

    if (!bestMatch) {
      return null;
    }

    // 3. Get detailed information including IMDb ID
    const details = await getMovieDetails(bestMatch.id, options.language);

    // Calculate confidence based on match score
    const matchScore = calculateMatchScore(bestMatch, title);
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (matchScore >= 80) confidence = 'high';
    else if (matchScore >= 40) confidence = 'medium';

    return {
      title: bestMatch.title || bestMatch.original_title || title,
      imdbId: details.imdb_id || null,
      tmdbId: bestMatch.id,
      confidence,
      year: bestMatch.release_date ? new Date(bestMatch.release_date).getFullYear() : undefined
    };

  } catch (error) {
    console.error('Error getting IMDb ID for title:', title, error);
    return null;
  }
}

// Batch processing for multiple titles
export async function getImdbIdsForTitles(
  titles: string[],
  options: TMDBSearchOptions = {}
): Promise<MovieWithImdbId[]> {
  const results: MovieWithImdbId[] = [];

  // Process in batches to avoid rate limits
  const batchSize = 3;
  for (let i = 0; i < titles.length; i += batchSize) {
    const batch = titles.slice(i, i + batchSize);

    const batchPromises = batch.map(title => getImdbIdForTitle(title, options));
    const batchResults = await Promise.all(batchPromises);

    results.push(...batchResults.filter((result): result is MovieWithImdbId => result !== null));

    // Small delay between batches to be respectful to the API
    if (i + batchSize < titles.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}
