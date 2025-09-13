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

// Unified candidate structure for all media types
type Candidate = {
  id: number;
  media_type: 'movie' | 'tv';
  title: string;           // unified title field
  date?: string;           // release_date or first_air_date
  popularity?: number;
  vote_count?: number;
};

// Convert TMDB search results to unified candidates
function convertToCandidates(results: any[], mediaType: 'movie' | 'tv'): Candidate[] {
  return results.map(result => ({
    id: result.id,
    media_type: mediaType,
    title: mediaType === 'movie'
      ? (result.title || result.original_title || '')
      : (result.name || result.original_name || ''),
    date: mediaType === 'movie' ? result.release_date : result.first_air_date,
    popularity: result.popularity,
    vote_count: result.vote_count
  }));
}

// Convert multi-search results to candidates (filtering only movie/tv)
function convertMultiToCandidates(results: any[]): Candidate[] {
  return results
    .filter(result => result.media_type === 'movie' || result.media_type === 'tv')
    .map(result => ({
      id: result.id,
      media_type: result.media_type,
      title: result.media_type === 'movie'
        ? (result.title || result.original_title || '')
        : (result.name || result.original_name || ''),
      date: result.media_type === 'movie' ? result.release_date : result.first_air_date,
      popularity: result.popularity,
      vote_count: result.vote_count
    }));
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

// Search for TV shows by title
export async function searchTV(
  query: string,
  language: string = 'de-DE',
  year?: number
): Promise<Candidate[]> {
  const params: Record<string, string> = {
    query: query.trim(),
    language,
    page: '1'
  };

  if (year) {
    params.first_air_date_year = year.toString();
  }

  const response: TMDBSearchResponse = await tmdbFetch('/search/tv', params);
  return convertToCandidates(response.results || [], 'tv');
}

// Search across all media types (movie, tv, person)
export async function searchMulti(
  query: string,
  language: string = 'de-DE'
): Promise<Candidate[]> {
  const params: Record<string, string> = {
    query: query.trim(),
    language,
    page: '1'
  };

  const response: TMDBSearchResponse = await tmdbFetch('/search/multi', params);
  return convertMultiToCandidates(response.results || []);
}

// Get details with IMDb ID based on media type
async function getDetailsWithImdbId(
  candidate: Candidate,
  language: string
): Promise<{ imdb_id?: string; external_ids?: { imdb_id?: string } }> {
  if (candidate.media_type === 'movie') {
    return tmdbFetch(`/movie/${candidate.id}`, {
      language,
      append_to_response: 'external_ids'
    });
  } else {
    return tmdbFetch(`/tv/${candidate.id}`, {
      language,
      append_to_response: 'external_ids'
    });
  }
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

// Enhanced scoring for unified candidates
function calculateCandidateScore(candidate: Candidate, queryTitle: string): number {
  const query = normalizeText(queryTitle);
  const title = normalizeText(candidate.title);

  let score = 0;

  // Exact matches get highest score
  if (title === query) {
    score += 100;
  }
  // Starts with query
  else if (title.startsWith(query)) {
    score += 60;
  }
  // Contains query
  else if (title.includes(query)) {
    score += 40;
  }

  // Popularity and vote count as tie-breakers
  const popularityScore = Math.min(20, Math.log10((candidate.popularity || 0) + 1) * 5);
  const voteScore = Math.min(30, Math.log10((candidate.vote_count || 0) + 1) * 10);

  return score + popularityScore + voteScore;
}

// Select best candidate from unified results
function selectBestCandidate(candidates: Candidate[], queryTitle: string): Candidate | null {
  if (candidates.length === 0) return null;

  const scored = candidates.map(candidate => ({
    candidate,
    score: calculateCandidateScore(candidate, queryTitle)
  }));

  scored.sort((a, b) => b.score - a.score);

  // Return best match if score is above threshold
  return scored[0].score > 20 ? scored[0].candidate : null;
}

// Main function: Get IMDb ID for a movie title with enhanced search cascade
export async function getImdbIdForTitle(
  title: string,
  options: TMDBSearchOptions = {}
): Promise<MovieWithImdbId | null> {
  const normalizedTitle = normalizeText(title);
  const queryVariations = generateQueryVariations(title);
  const { language = 'de-DE', year } = options;

  // Language fallback: de-DE → en-US
  const languages = ['de-DE', 'en-US'];

  for (const lang of languages) {
    // Search cascade: movie → tv → multi
    const searchTypes = [
      { name: 'movie', func: (q: string) => searchMovies(q, { ...options, language: lang }) },
      { name: 'tv', func: (q: string) => searchTV(q, lang, year) },
      { name: 'multi', func: (q: string) => searchMulti(q, lang) }
    ];

    for (const searchType of searchTypes) {
      // Try all query variations
      for (const query of queryVariations) {
        try {
          let candidates: Candidate[] = [];

          if (searchType.name === 'movie') {
            // Convert movie results to candidates
            const results = await searchType.func(query) as TMDBMovieSearchResult[];
            candidates = convertToCandidates(results, 'movie');
          } else {
            // TV and Multi already return candidates
            candidates = await searchType.func(query) as Candidate[];
          }

          const bestCandidate = selectBestCandidate(candidates, normalizedTitle);

          if (bestCandidate) {
            // Get details with IMDb ID based on media type
            const details = await getDetailsWithImdbId(bestCandidate, lang);
            const imdbId = details.imdb_id ?? details.external_ids?.imdb_id ?? null;

            if (imdbId) {
              const matchScore = calculateCandidateScore(bestCandidate, normalizedTitle);
              const confidence = matchScore >= 80 ? 'high' : matchScore >= 40 ? 'medium' : 'low';

              return {
                title: bestCandidate.title,
                imdbId,
                tmdbId: bestCandidate.id,
                confidence,
                year: bestCandidate.date ? new Date(bestCandidate.date).getFullYear() : undefined
              };
            }
          }
        } catch (error) {
          console.warn(`Search failed for ${searchType.name} in ${lang}:`, error);
          continue;
        }
      }
    }
  }

  return null; // No results found
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
