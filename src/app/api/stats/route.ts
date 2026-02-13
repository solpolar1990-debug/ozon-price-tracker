/**
 * API Endpoint для статистики бота
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [totalProducts, totalUsers, totalNotifications] = await Promise.all([
      db.product.count(),
      db.telegramUser.count(),
      db.notification.count(),
    ]);

    return NextResponse.json({
      totalProducts,
      totalUsers,
      totalNotifications,
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
