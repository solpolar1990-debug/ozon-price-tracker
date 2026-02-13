/**
 * Cron Endpoint для проверки цен
 * Вызывается автоматически Vercel Cron 3 раза в день
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkAllPrices, getTrackingStats } from '@/lib/telegram/price-tracker';

export async function GET(request: NextRequest) {
  try {
    // Проверяем авторизацию от Vercel Cron
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Vercel Cron отправляет специальный заголовок
    const isVercelCron = request.headers.get('x-vercel-cron') === 'true';

    // В development режиме разрешаем без авторизации
    const isDevelopment = process.env.NODE_ENV !== 'production';

    // Проверяем авторизацию
    if (!isDevelopment && !isVercelCron) {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('🔄 Cron job started: checking prices...');

    // Запускаем проверку цен
    const result = await checkAllPrices();

    // Получаем статистику
    const stats = await getTrackingStats();

    console.log('✅ Cron job completed:', result);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
      stats,
    });
  } catch (error) {
    console.error('❌ Cron job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST тоже поддерживаем для ручного запуска
export async function POST(request: NextRequest) {
  return GET(request);
}
