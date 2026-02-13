/**
 * Telegram Webhook Endpoint
 * Обрабатывает входящие сообщения от Telegram
 */

import { NextRequest, NextResponse } from 'next/server';
import { bot, setupBotHandlers } from '@/lib/telegram/bot';

// Инициализируем обработчики один раз
let handlersSetup = false;

export async function POST(request: NextRequest) {
  try {
    // Проверяем токен бота
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      console.error('TELEGRAM_BOT_TOKEN not configured');
      return NextResponse.json(
        { error: 'Bot not configured' },
        { status: 500 }
      );
    }

    // Настраиваем обработчики при первом запросе
    if (!handlersSetup) {
      setupBotHandlers();
      handlersSetup = true;
    }

    // Получаем тело запроса от Telegram
    const body = await request.json();

    // Обрабатываем обновление
    if (bot) {
      await bot.handleUpdate(body);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET для проверки работоспособности
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Telegram webhook endpoint is active',
    botConfigured: !!process.env.TELEGRAM_BOT_TOKEN,
  });
}
