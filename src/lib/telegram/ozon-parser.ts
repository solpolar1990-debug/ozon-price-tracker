/**
 * Парсер цен с Ozon
 */

import ZAIClient from '@/lib/zai-client';

export interface OzonProductInfo {
  productId: string;
  name: string;
  price: number;
  originalPrice?: number;
  image?: string;
  inStock: boolean;
}

/**
 * Извлекает ID товара из ссылки Ozon
 */
export function extractOzonProductId(url: string): string | null {
  const patterns = [
    /\/product\/[^\/]*?(\d{7,})/i,
    /\/product\/(\d{7,})/i,
    /\/context\/detail\/id\/(\d{7,})/i,
    /\/item\/(\d{7,})/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Проверяет, является ли ссылка короткой ссылкой Ozon
 */
export function isShortOzonUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('ozon.ru') && urlObj.pathname.startsWith('/t/');
  } catch {
    return false;
  }
}

/**
 * Извлекает код из короткой ссылки Ozon
 */
export function extractShortCode(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/t\/([A-Za-z0-9]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Извлекает название товара из URL
 */
export function extractProductName(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    const match = pathname.match(/\/product\/([^\/]+?)(?:-\d+)?\/?$/);
    if (match) {
      const slug = match[1].replace(/-\d+$/, '');
      return slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  } catch {
    // ignore
  }
  return 'Товар Ozon';
}

/**
 * Проверяет, является ли ссылка валидной ссылкой на товар Ozon
 */
export function isValidOzonUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const validHosts = ['ozon.ru', 'www.ozon.ru', 'm.ozon.ru'];
    
    if (!validHosts.includes(urlObj.hostname)) {
      return false;
    }
    
    if (extractOzonProductId(url) !== null) {
      return true;
    }
    
    if (isShortOzonUrl(url)) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Парсит цену из текста - поддерживает разные форматы
 */
function parsePriceFromText(text: string): { price: number; originalPrice?: number } | null {
  const prices: number[] = [];
  
  // Формат "RUB 310,00" или "RUB 310.00"
  const rubMatches = text.matchAll(/RUB\s*(\d+(?:[.,]\d+)?)/gi);
  for (const match of rubMatches) {
    const price = parseFloat(match[1].replace(',', '.'));
    if (price > 100 && price < 100000) {
      prices.push(Math.round(price));
    }
  }
  
  // Формат "789 ₽" или "1 234 ₽"
  const priceMatches = text.matchAll(/(\d[\d\s]{2,})\s*₽/g);
  for (const match of priceMatches) {
    const price = parseInt(match[1].replace(/\s/g, ''), 10);
    if (price > 100 && price < 10000000) {
      prices.push(price);
    }
  }
  
  // Формат "789₽" без пробела
  const compactMatches = text.matchAll(/(\d{3,})₽/g);
  for (const match of compactMatches) {
    const price = parseInt(match[1], 10);
    if (price > 100 && price < 10000000) {
      prices.push(price);
    }
  }

  if (prices.length === 0) return null;

  const uniquePrices = [...new Set(prices)].sort((a, b) => a - b);

  const result: { price: number; originalPrice?: number } = {
    price: uniquePrices[0],
  };

  if (uniquePrices.length > 1 && uniquePrices[uniquePrices.length - 1] > uniquePrices[0] * 1.3) {
    result.originalPrice = uniquePrices[uniquePrices.length - 1];
  }

  return result;
}

/**
 * Получает информацию о товаре с Ozon
 */
export async function fetchOzonProduct(url: string): Promise<OzonProductInfo | null> {
  let productId = extractOzonProductId(url);
  let productName = extractProductName(url);
  
  if (!productId && isShortOzonUrl(url)) {
    const shortCode = extractShortCode(url);
    if (shortCode) {
      productId = shortCode;
      productName = 'Товар Ozon';
    }
  }
  
  if (!productId) {
    return null;
  }

  try {
    const zai = await ZAIClient.create();
    
    const searchQuery = productName !== 'Товар Ozon' 
      ? `${productName.slice(0, 60)} купить цена Ozon`
      : `Ozon product ${productId} цена`;
    
    console.log(`🔍 Searching for: ${searchQuery}`);

    const searchResult = await zai.webSearch(searchQuery, 5);

    if (Array.isArray(searchResult) && searchResult.length > 0) {
      let foundPrice: { price: number; originalPrice?: number } | null = null;
      let foundName = productName;
      let foundProductId = productId;

      for (const result of searchResult) {
        if (result.url) {
          const realId = extractOzonProductId(result.url);
          if (realId && realId.length > 7) {
            foundProductId = realId;
          }
        }

        if (result.snippet) {
          const priceInfo = parsePriceFromText(result.snippet);
          if (priceInfo && priceInfo.price > 0) {
            foundPrice = priceInfo;
          }
        }

        if (result.name && !foundPrice) {
          const priceInfo = parsePriceFromText(result.name);
          if (priceInfo && priceInfo.price > 0) {
            foundPrice = priceInfo;
          }
        }

        if (result.name) {
          const cleanName = result.name
            .replace(/\s*[-–]\s*OZON\s*$/i, '')
            .replace(/\s*[-–]\s*Ozon\s*$/i, '')
            .replace(/\s*купить.*$/i, '')
            .replace(/\s*на\s*OZON.*$/i, '')
            .replace(/\s*–\s*покупайте.*$/i, '')
            .trim();
          if (cleanName.length > 3 && cleanName.length < 150) {
            foundName = cleanName;
          }
        }

        if (foundPrice) break;
      }

      return {
        productId: foundProductId,
        name: foundName,
        price: foundPrice ? foundPrice.price * 100 : 0,
        originalPrice: foundPrice?.originalPrice ? foundPrice.originalPrice * 100 : undefined,
        inStock: true,
      };
    }

    return {
      productId,
      name: productName,
      price: 0,
      inStock: true,
    };

  } catch (error) {
    console.error('Error fetching Ozon product:', error);
    return {
      productId,
      name: productName,
      price: 0,
      inStock: true,
    };
  }
}

/**
 * Форматирует цену из копеек в рубли
 */
export function formatPrice(priceInKopecks: number): string {
  if (priceInKopecks === 0) return '⏳ уточняется';
  const rubles = priceInKopecks / 100;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rubles);
}

/**
 * Вычисляет процент изменения цены
 */
export function calculatePriceChangePercent(oldPrice: number, newPrice: number): number {
  if (oldPrice === 0 || newPrice === 0) return 0;
  return ((newPrice - oldPrice) / oldPrice) * 100;
}
