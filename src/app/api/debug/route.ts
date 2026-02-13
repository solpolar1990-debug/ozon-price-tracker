/**
 * Debug endpoint для тестирования парсера
 */

import { NextResponse } from 'next/server';
import ZAIClient from '@/lib/zai-client';
import { extractOzonProductId, extractProductName } from '@/lib/telegram/ozon-parser';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const testUrl = searchParams.get('url') || 'https://www.ozon.ru/product/dzhinsy-wearelsts-shirokie-truby-1616074886/';
  
  try {
    const zai = await ZAIClient.create();
    
    const productId = extractOzonProductId(testUrl);
    const productName = extractProductName(testUrl);
    
    console.log('Testing URL:', testUrl);
    console.log('Product ID:', productId);
    console.log('Product Name:', productName);
    
    const searchQuery = `${productName} купить цена Ozon`;
    console.log('Search query:', searchQuery);
    
    const searchResult = await zai.webSearch(searchQuery, 3);
    
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
