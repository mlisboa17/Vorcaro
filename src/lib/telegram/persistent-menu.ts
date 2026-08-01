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

export function buildDuplicateConfirmKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '✅ Enviar mesmo assim', callback_data: 'dedup_override' },
        { text: '❌ Cancelar', callback_data: 'dedup_cancel' },
      ],
    ],
  };
}

export function formatTransactionConfirmation(data: {
  amount: number;
  category: string;
  paymentMethod?: string;
  account?: string;
  date?: string | Date;
}): string {
  const dateStr = typeof data.date === 'string'
    ? data.date
    : data.date?.toLocaleDateString('pt-BR') ?? 'Hoje';

  return `✅ Registrei!
💰 R$ ${data.amount.toFixed(2).replace('.', ',')}
🏷️ ${data.category}
${data.paymentMethod ? `🏦 ${data.paymentMethod}\n` : ''}${data.account ? `🔐 Conta: ${data.account}\n` : ''}📅 ${dateStr}`;
}
