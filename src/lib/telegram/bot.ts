/**
 * Telegram Bot для отслеживания цен на Ozon
 */

import { Telegraf, Context, Markup } from 'telegraf';
import { db } from '@/lib/db';
import {
  isValidOzonUrl,
  fetchOzonProduct,
  extractOzonProductId,
  formatPrice,
  calculatePriceChangePercent,
} from './ozon-parser';
import { checkUserPrices } from './price-tracker';

// Инициализация бота
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.warn('TELEGRAM_BOT_TOKEN not set! Bot will not work.');
}

export const bot = BOT_TOKEN ? new Telegraf(BOT_TOKEN) : null;

// Флаг для отслеживания установки команд
let commandsSet = false;

/**
 * Установка меню команд бота
 */
async function setBotCommands() {
  if (!bot || commandsSet) return;

  try {
    await bot.telegram.setMyCommands([
      { command: 'start', description: '🚀 Начать работу' },
      { command: 'add', description: '➕ Добавить товар' },
      { command: 'list', description: '📋 Мои товары' },
      { command: 'check', description: '🔄 Проверить цены' },
      { command: 'remove', description: '🗑 Удалить товар' },
      { command: 'help', description: '❓ Справка' },
    ]);
    commandsSet = true;
    console.log('✅ Bot commands menu set');
  } catch (error) {
    console.error('Failed to set bot commands:', error);
  }
}

/**
 * Регистрация или получение пользователя
 */
async function getOrCreateUser(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return null;

  const user = await db.telegramUser.upsert({
    where: { telegramId: String(telegramUser.id) },
    update: {
      username: telegramUser.username,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
    },
    create: {
      telegramId: String(telegramUser.id),
      username: telegramUser.username,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
    },
  });

  return user;
}

/**
 * Форматирование информации о товаре
 */
function formatProductInfo(product: {
  id: string;
  name: string;
  currentPrice: number;
  initialPrice: number;
  url: string;
  createdAt: Date;
}): string {
  const priceChange = calculatePriceChangePercent(product.initialPrice, product.currentPrice);
  const changeEmoji = priceChange > 0 ? '📈' : priceChange < 0 ? '📉' : '➡️';
  const changeSign = priceChange > 0 ? '+' : '';

  return `
📦 <b>${product.name.slice(0, 100)}${product.name.length > 100 ? '...' : ''}</b>

💰 Текущая цена: <b>${formatPrice(product.currentPrice)}</b>
📊 Начальная цена: ${formatPrice(product.initialPrice)}
${changeEmoji} Изменение: ${changeSign}${priceChange.toFixed(1)}%

🔗 <a href="${product.url}">Открыть на Ozon</a>
📅 Добавлен: ${product.createdAt.toLocaleDateString('ru-RU')}
`;
}

/**
 * Регистрация обработчиков команд бота
 */
export function setupBotHandlers() {
  if (!bot) {
    console.warn('Bot not initialized - skipping handler setup');
    return;
  }

  // Устанавливаем меню команд при первом запросе
  bot.use(async (ctx, next) => {
    await setBotCommands();
    return next();
  });

  // Команда /start
  bot.command('start', async (ctx) => {
    const user = await getOrCreateUser(ctx);
    if (!user) return;

    await ctx.reply(
      `👋 Привет, ${ctx.from?.first_name || 'друг'}!

Я бот для отслеживания цен на товары Ozon.

📝 <b>Что я умею:</b>
• Отслеживать цены на товары
• Уведомлять об изменении цены на 10% и более
• Показывать историю ваших товаров

💡 Просто отправьте ссылку на товар Ozon, чтобы добавить его в отслеживание!`,
      { parse_mode: 'HTML' }
    );
  });

  // Команда /help
  bot.command('help', async (ctx) => {
    await ctx.reply(
      `📚 <b>Справка по использованию бота</b>

<b>Как добавить товар:</b>
1️⃣ Скопируйте ссылку на товар с сайта Ozon
2️⃣ Отправьте ссылку боту или используйте /add [ссылка]

<b>Отслеживание цен:</b>
• Проверка цен происходит раз в день
• Уведомление приходит при изменении цены на 10%+`,
      { parse_mode: 'HTML' }
    );
  });

  // Команда /add
  bot.command('add', async (ctx) => {
    const user = await getOrCreateUser(ctx);
    if (!user) return;

    const messageText = ctx.message?.text || '';
    const urlMatch = messageText.match(/https?:\/\/[^\s]+/);

    if (!urlMatch) {
      await ctx.reply(
        '❌ Пожалуйста, укажите ссылку на товар Ozon.\n\nПример: /add https://www.ozon.ru/product/...',
        Markup.inlineKeyboard([
          [Markup.button.url('🌐 Открыть Ozon', 'https://www.ozon.ru')]
        ])
      );
      return;
    }

    const url = urlMatch[0];

    if (!isValidOzonUrl(url)) {
      await ctx.reply('❌ Неверная ссылка. Пожалуйста, отправьте ссылку на товар с сайта ozon.ru');
      return;
    }

    await ctx.reply('🔍 Получаю информацию о товаре...');

    const productInfo = await fetchOzonProduct(url);

    if (!productInfo) {
      await ctx.reply(
        '❌ Не удалось получить информацию о товаре. Проверьте правильность ссылки или попробуйте позже.'
      );
      return;
    }

    // Проверяем, не добавлен ли уже этот товар
    const existingProduct = await db.product.findFirst({
      where: {
        userId: user.id,
        ozonProductId: productInfo.productId,
      },
    });

    if (existingProduct) {
      await ctx.reply(
        `⚠️ Этот товар уже есть в вашем списке отслеживания!\n\n${formatProductInfo(existingProduct)}`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    // Создаем товар и записываем начальную цену в историю
    const product = await db.product.create({
      data: {
        userId: user.id,
        ozonProductId: productInfo.productId,
        url: url,
        name: productInfo.name,
        image: productInfo.image,
        currentPrice: productInfo.price,
        initialPrice: productInfo.price,
        priceHistory: {
          create: {
            price: productInfo.price,
          },
        },
      },
    });

    await ctx.reply(
      `✅ <b>Товар добавлен для отслеживания!</b>

📦 ${product.name.slice(0, 100)}
💰 Цена: ${formatPrice(product.currentPrice)}
🔗 <a href="${url}">Открыть на Ozon</a>

🔔 Вы получите уведомление, когда цена изменится на 10% и более.`,
      { parse_mode: 'HTML' }
    );
  });

  // Команда /list
  bot.command('list', async (ctx) => {
    const user = await getOrCreateUser(ctx);
    if (!user) return;

    const products = await db.product.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (products.length === 0) {
      await ctx.reply(
        '📭 У вас пока нет отслеживаемых товаров.\n\nОтправьте ссылку на товар Ozon для добавления!'
      );
      return;
    }

    let message = `📋 <b>Ваши отслеживаемые товары (${products.length})</b>\n\n`;

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const priceChange = calculatePriceChangePercent(product.initialPrice, product.currentPrice);
      const changeSign = priceChange > 0 ? '+' : '';
      const changeEmoji = priceChange > 0 ? '📈' : priceChange < 0 ? '📉' : '➡️';

      message += `<b>${i + 1}.</b> ${product.name.slice(0, 50)}${product.name.length > 50 ? '...' : ''}\n`;
      message += `   💰 ${formatPrice(product.currentPrice)} ${changeEmoji} ${changeSign}${priceChange.toFixed(1)}%\n\n`;

      if (message.length > 4000) {
        await ctx.reply(message, { parse_mode: 'HTML' });
        message = '';
      }
    }

    if (message) {
      await ctx.reply(message, { parse_mode: 'HTML' });
    }
  });

  // Команда /check - проверка цен
  bot.command('check', async (ctx) => {
    const user = await getOrCreateUser(ctx);
    if (!user) return;

    const products = await db.product.findMany({
      where: { userId: user.id },
    });

    if (products.length === 0) {
      await ctx.reply('📭 У вас нет отслеживаемых товаров.\n\nДобавьте товар отправив ссылку!');
      return;
    }

    await ctx.reply(`🔄 Проверяю цены на ${products.length} товаров...`);

    const result = await checkUserPrices(user.id);

    // Получаем обновлённый список
    const updatedProducts = await db.product.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    let message = `✅ <b>Проверка завершена!</b>\n\n`;
    message += `📋 Проверено: ${result.checked}\n`;
    message += `💰 Обновлено: ${result.updated}\n\n`;

    if (updatedProducts.length > 0) {
      message += `<b>Актуальные цены:</b>\n`;
      for (let i = 0; i < Math.min(updatedProducts.length, 5); i++) {
        const p = updatedProducts[i];
        message += `\n${i + 1}. ${p.name.slice(0, 40)}...\n`;
        message += `   💰 ${formatPrice(p.currentPrice)}\n`;
      }
    }

    await ctx.reply(message, { parse_mode: 'HTML' });
  });

  // Команда /remove
  bot.command('remove', async (ctx) => {
    const user = await getOrCreateUser(ctx);
    if (!user) return;

    const products = await db.product.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (products.length === 0) {
      await ctx.reply('📭 У вас нет отслеживаемых товаров для удаления.');
      return;
    }

    // Создаем inline-кнопки с товарами
    const buttons = products.map((product, index) => [
      Markup.button.callback(
        `${index + 1}. ${product.name.slice(0, 30)}...`,
        `remove_${product.id}`
      ),
    ]);

    await ctx.reply(
      '🗑 <b>Выберите товар для удаления:</b>',
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(buttons),
      }
    );
  });

  // Обработка callback для удаления
  bot.action(/remove_(.+)/, async (ctx) => {
    const productId = ctx.match[1];
    const user = await getOrCreateUser(ctx);
    if (!user) return;

    const product = await db.product.findFirst({
      where: { id: productId, userId: user.id },
    });

    if (!product) {
      await ctx.answerCbQuery('❌ Товар не найден');
      return;
    }

    await db.product.delete({
      where: { id: productId },
    });

    await ctx.editMessageText(
      `✅ Товар удалён из отслеживания:\n\n${product.name.slice(0, 100)}`,
      { parse_mode: 'HTML' }
    );
  });

  // Обработка обычных сообщений (ссылок)
  bot.on('text', async (ctx) => {
    const text = ctx.message?.text || '';

    // Игнорируем команды
    if (text.startsWith('/')) return;

    // Проверяем, является ли сообщение ссылкой на Ozon
    const urlMatch = text.match(/https?:\/\/[^\s]+/);

    if (urlMatch && isValidOzonUrl(urlMatch[0])) {
      const url = urlMatch[0];
      const user = await getOrCreateUser(ctx);
      if (!user) return;

      await ctx.reply('🔍 Получаю информацию о товаре...');

      const productInfo = await fetchOzonProduct(url);

      if (!productInfo) {
        await ctx.reply('❌ Не удалось получить информацию о товаре. Попробуйте позже.');
        return;
      }

      // Проверяем, не добавлен ли уже этот товар
      const existingProduct = await db.product.findFirst({
        where: {
          userId: user.id,
          ozonProductId: productInfo.productId,
        },
      });

      if (existingProduct) {
        await ctx.reply(
          `⚠️ Этот товар уже есть в вашем списке!\n\n💰 Текущая цена: ${formatPrice(existingProduct.currentPrice)}`,
          { parse_mode: 'HTML' }
        );
        return;
      }

      // Создаем товар
      const product = await db.product.create({
        data: {
          userId: user.id,
          ozonProductId: productInfo.productId,
          url: url,
          name: productInfo.name,
          image: productInfo.image,
          currentPrice: productInfo.price,
          initialPrice: productInfo.price,
          priceHistory: {
            create: {
              price: productInfo.price,
            },
          },
        },
      });

      await ctx.reply(
        `✅ <b>Товар добавлен!</b>

📦 ${product.name.slice(0, 100)}
💰 Цена: ${formatPrice(product.currentPrice)}

🔔 Уведомлю при изменении цены на 10%+`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    // Если это не ссылка, показываем подсказку
    if (!urlMatch) {
      await ctx.reply(
        '💡 Отправьте ссылку на товар Ozon для добавления в отслеживание!'
      );
    }
  });

  console.log('✅ Bot handlers registered');
}

/**
 * Отправка уведомления пользователю о изменении цены
 */
export async function sendPriceChangeNotification(
  telegramId: string,
  product: {
    id: string;
    name: string;
    url: string;
    currentPrice: number;
    image?: string | null;
  },
  oldPrice: number,
  percentChange: number
) {
  if (!bot) {
    console.error('Bot not initialized');
    return false;
  }

  const changeEmoji = percentChange < 0 ? '📉' : '📈';

  const message = `
${changeEmoji} <b>Цена изменилась!</b>

📦 <b>${product.name.slice(0, 100)}${product.name.length > 100 ? '...' : ''}</b>

💰 Была: ${formatPrice(oldPrice)}
💰 Стала: <b>${formatPrice(product.currentPrice)}</b>
📊 Изменение: ${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%

🔗 <a href="${product.url}">Открыть на Ozon</a>

${percentChange < 0 ? '🎉 Хорошая возможность для покупки!' : '⚠️ Цена выросла'}
`;

  try {
    if (product.image) {
      await bot.telegram.sendPhoto(telegramId, product.image, {
        caption: message,
        parse_mode: 'HTML',
      });
    } else {
      await bot.telegram.sendMessage(telegramId, message, { parse_mode: 'HTML' });
    }
    return true;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return false;
  }
}
