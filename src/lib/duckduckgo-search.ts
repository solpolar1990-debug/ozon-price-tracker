/**
 * Поиск через DuckDuckGo (бесплатно, без API ключей)
 */

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

/**
 * Выполняет поиск через DuckDuckGo HTML
 */
export async function duckDuckGoSearch(query: string, num: number = 5): Promise<SearchResult[]> {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' site:ozon.ru')}`;
  
  console.log(`🔍 DuckDuckGo Search: ${query}`);
  
  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html',
      'Accept-Language': 'ru-RU,ru;q=0.9',
    },
  });
  
  const html = await response.text();
  
  // Парсим результаты из HTML
  const results: SearchResult[] = [];
  
  // Ищем блоки результатов
  const resultRegex = /<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([^<]*)<\/a>/gi;
  
  let match;
  while ((match = resultRegex.exec(html)) !== null && results.length < num) {
    const link = match[1];
    const title = match[2].trim();
    const snippet = match[3].trim();
    
    // Декодируем URL DuckDuckGo
    const realUrl = decodeDuckDuckGoUrl(link);
    
    results.push({
      title,
      link: realUrl,
      snippet,
    });
  }
  
  console.log(`Found ${results.length} results`);
  return results;
}

/**
 * Декодирует URL DuckDuckGo
 */
function decodeDuckDuckGoUrl(url: string): string {
  try {
    // DuckDuckGo перенаправляет через uddg параметр
    const match = url.match(/uddg=([^&]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
    return url;
  } catch {
    return url;
  }
}
