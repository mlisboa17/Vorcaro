/**
 * Sprint 0: Telegram UX Improvements
 *
 * Features:
 * 1. Persistent menu (4 buttons)
 * 2. Deduplication detection
 * 3. Clear transaction confirmation
 * 4. Multimodal feedback messages
 */

import { buildPersistentMenu, formatTransactionConfirmation } from './persistent-menu';
import { TelegramDeduplicationService } from './deduplication.service';
import { getMediaTypeMessage, MULTIMODAL_MESSAGES } from './multimodal-handlers';

export const sprintZeroConfig = {
  persistentMenu: buildPersistentMenu,
  dedup: new TelegramDeduplicationService(),
  formatConfirmation: formatTransactionConfirmation,
  mediaMessages: getMediaTypeMessage,
};

/**
 * Example integration in telegram-bot-adapter:
 *
 * // After creating transaction:
 * await client.sendMessage(chatId, {
 *   text: formatTransactionConfirmation({
 *     amount: 50,
 *     category: 'Comida',
 *     paymentMethod: 'Crédito',
 *     account: 'Nubank',
 *     date: new Date(),
 *   }),
 *   reply_markup: buildPersistentMenu(),
 * });
 *
 * // When receiving photo:
 * await client.sendMessage(chatId, {
 *   text: getMediaTypeMessage('photo'),
 *   reply_markup: buildPersistentMenu(),
 * });
 *
 * // Dedup check:
 * const { isDuplicate, minutesAgo } = await dedup.checkDuplicate(
 *   userId,
 *   amount,
 *   category
 * );
 * if (isDuplicate) {
 *   await client.sendMessage(chatId, {
 *     text: dedup.formatDuplicateWarning(amount, category, minutesAgo!),
 *     reply_markup: dedup.getDuplicateButtons(),
 *   });
 * }
 */

export default sprintZeroConfig;
