/**
 * Сервис отслеживания цен
 * Проверяет цены и отправляет уведомления
 */

import { db } from '@/lib/db';
import { fetchOzonProduct, calculatePriceChangePercent } from './ozon-parser';
import { sendPriceChangeNotification } from './bot';

// Порог изменения цены для уведомления (10%)
const PRICE_CHANGE_THRESHOLD = 10;

/**
 * Проверяет цены для всех товаров и отправляет уведомления
 */
export async function checkAllPrices(): Promise<{
  totalChecked: number;
  notificationsSent: number;
  errors: string[];
}> {
  const result = {
    totalChecked: 0,
    notificationsSent: 0,
    errors: [] as string[],
  };

  console.log('🔍 Starting price check for all products...');

  const products = await db.product.findMany({
    include: {
      user: true,
    },
  });

  console.log(`📦 Found ${products.length} products to check`);

  for (const product of products) {
    result.totalChecked++;

    try {
      const productInfo = await fetchOzonProduct(product.url);

      if (!productInfo) {
        result.errors.push(`Failed to fetch price for product ${product.id}`);
        continue;
      }

      const oldPrice = product.currentPrice;
      const newPrice = productInfo.price;

      // Обновляем товар (цену и название если оно было дефолтным)
      const updateData: any = {
        lastCheckedAt: new Date(),
      };
      
      if (newPrice > 0) {
        updateData.currentPrice = newPrice;
      }
      
      if (product.name === 'Товар Ozon' && productInfo.name !== 'Товар Ozon') {
        updateData.name = productInfo.name;
      }

      await db.product.update({
        where: { id: product.id },
        data: updateData,
      });

      if (newPrice > 0) {
        await db.priceHistory.create({
          data: {
            productId: product.id,
            price: newPrice,
          },
        });
      }

      const percentChange = calculatePriceChangePercent(oldPrice, newPrice);

      console.log(
        `💰 Product ${product.id}: ${oldPrice / 100}₽ → ${newPrice / 100}₽ (${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%)`
      );

      // Если изменение цены >= порога, отправляем уведомление
      if (newPrice > 0 && Math.abs(percentChange) >= PRICE_CHANGE_THRESHOLD) {
        const sent = await sendPriceChangeNotification(
          product.user.telegramId,
          {
            id: product.id,
            name: productInfo.name || product.name,
            url: product.url,
            currentPrice: newPrice,
            image: product.image,
          },
          oldPrice,
          percentChange
        );

        if (sent) {
          await db.notification.create({
            data: {
              productId: product.id,
              oldPrice,
              newPrice,
              percentChange,
            },
          });

          result.notificationsSent++;
        }
      }
    } catch (error) {
      const errorMsg = `Error checking product ${product.id}: ${error}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
    }
  }

  console.log(
    `✅ Price check complete. Checked: ${result.totalChecked}, Notifications: ${result.notificationsSent}, Errors: ${result.errors.length}`
  );

  return result;
}

/**
 * Проверяет цены для конкретного пользователя
 */
export async function checkUserPrices(userId: string): Promise<{
  checked: number;
  updated: number;
  errors: string[];
}> {
  const result = {
    checked: 0,
    updated: 0,
    errors: [] as string[],
  };

  const products = await db.product.findMany({
    where: { userId },
    include: { user: true },
  });

  for (const product of products) {
    result.checked++;

    try {
      const productInfo = await fetchOzonProduct(product.url);

      if (!productInfo) {
        result.errors.push(`Не найден: ${product.name.slice(0, 30)}`);
        continue;
      }

      const updateData: any = {
        lastCheckedAt: new Date(),
      };
      
      let hasUpdate = false;

      // Обновляем цену если нашли
      if (productInfo.price > 0) {
        updateData.currentPrice = productInfo.price;
        updateData.initialPrice = product.initialPrice === 0 ? productInfo.price : product.initialPrice;
        hasUpdate = true;
        
        await db.priceHistory.create({
          data: {
            productId: product.id,
            price: productInfo.price,
          },
        });
      }

      // Обновляем название если было дефолтным
      if (product.name === 'Товар Ozon' && productInfo.name !== 'Товар Ozon') {
        updateData.name = productInfo.name;
        hasUpdate = true;
      }

      if (hasUpdate) {
        await db.product.update({
          where: { id: product.id },
          data: updateData,
        });
        result.updated++;
      }

    } catch (error) {
      result.errors.push(`Ошибка: ${product.name.slice(0, 30)} - ${error}`);
    }
  }

  return result;
}

/**
 * Получает статистику отслеживания
 */
export async function getTrackingStats() {
  const [
    totalProducts,
    totalUsers,
    totalNotifications,
  ] = await Promise.all([
    db.product.count(),
    db.telegramUser.count(),
    db.notification.count(),
  ]);

  return {
    totalProducts,
    totalUsers,
    totalNotifications,
  };
}
