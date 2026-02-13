/**
 * Debug endpoint
 */

import { NextResponse } from 'next/server';
import { googleSearch } from '@/lib/google-search';
import { extractOzonProductId, extractProductName } from '@/lib/telegram/ozon-parser';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const testUrl = searchParams.get('url') || 'https://www.ozon.ru/product/dzhinsy-wearelsts-shirokie-truby-1616074886/';
  
  try {
    const productId = extractOzonProductId(testUrl);
    const productName = extractProductName(testUrl);
    
    const searchQuery = `${productName} цена Ozon`;
    
    const searchResult = await googleSearch(searchQuery, 3);
    
    return NextResponse.json({
      url: testUrl,
      productId,
      productName,
      searchQuery,
      searchResult,
    });
  } catch (error) {
    return NextResponse.json({
      error: String(error),
      url: testUrl,
    });
  }
}
