import { TelegramClient } from 'gramjs';

export const PERSISTENT_MENU = {
  buttons: [
    [{ text: '🏠 Home', callback_data: 'cmd_home' }],
    [{ text: '📊 Resumo', callback_data: 'cmd_resumo' }],
    [{ text: '🚨 Alertas', callback_data: 'cmd_alertas' }],
    [{ text: '⚙️ Config', callback_data: 'cmd_config' }],
  ],
};

export function buildPersistentMenu() {
  return {
    inline_keyboard: PERSISTENT_MENU.buttons,
  };
}

export function formatTransactionConfirmation(data: {
  amount: number;
  category: string;
  paymentMethod?: string;
  account?: string;
  date?: Date;
}): string {
  return `✅ Registrei!
💰 R$ ${data.amount.toFixed(2)}
🏷️ ${data.category}
${data.paymentMethod ? `🏦 ${data.paymentMethod}\n` : ''}${data.account ? `🔐 Conta: ${data.account}\n` : ''}📅 ${data.date ? data.date.toLocaleDateString('pt-BR') : 'Hoje'}`;
}
