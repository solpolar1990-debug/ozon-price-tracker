/**
 * Debug endpoint для тестирования парсера
 */

import { NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const testQuery = searchParams.get('q') || 'Ozon джинсы WeAreLSTS цена купить';
  
  try {
    const zai = await ZAI.create();
    
    console.log('Searching for:', testQuery);
    
    const searchResult = await zai.functions.invoke('web_search', {
      query: testQuery,
      num: 5,
    });

    // Ищем цены в результатах
    const pricePatterns = [
      /RUB\s*(\d+(?:[.,]\d+)?)/gi,
      /(\d[\d\s]+)\s*₽/g,
      /(\d{3,})₽/g,
    ];
    
    const foundPrices: any = {};
    
    if (Array.isArray(searchResult)) {
      for (const result of searchResult) {
        const text = `${result.name} ${result.snippet}`;
        const prices: number[] = [];
        
        for (const pattern of pricePatterns) {
          const matches = text.matchAll(pattern);
          for (const match of matches) {
            const price = parseFloat(match[1].replace(/\s/g, '').replace(',', '.'));
            if (price > 100 && price < 100000) {
              prices.push(Math.round(price));
            }
          }
        }
        
        foundPrices[result.url] = {
          name: result.name,
          snippet: result.snippet?.slice(0, 200),
          prices,
        };
      }
    }
    
    return NextResponse.json({
      query: testQuery,
      results: searchResult,
      foundPrices,
    });
  } catch (error) {
    return NextResponse.json({
      error: String(error),
    });
  }
}
