/**
 * Google Custom Search API клиент
 */

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

interface SearchResponse {
  items?: SearchResult[];
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Выполняет поиск через Google Custom Search API
 */
export async function googleSearch(query: string, num: number = 5): Promise<SearchResult[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    throw new Error('Google API credentials not configured');
  }

  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('cx', searchEngineId);
  url.searchParams.set('q', query);
  url.searchParams.set('num', String(num));
  url.searchParams.set('hl', 'ru');
  url.searchParams.set('gl', 'ru');

  console.log(`🔍 Google Search: ${query}`);

  const response = await fetch(url.toString());
  const data: SearchResponse = await response.json();

  if (data.error) {
    throw new Error(`Google Search API error: ${data.error.message}`);
  }

  return (data.items || []).map(item => ({
    title: item.title,
    link: item.link,
    snippet: item.snippet,
  }));
}
