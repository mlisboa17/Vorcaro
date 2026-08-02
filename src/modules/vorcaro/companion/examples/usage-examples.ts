/**
 * Companheiro Vorcaro: Usage Examples
 * Demonstra como usar o serviço em diferentes cenários
 */

import { PrismaClient } from '@prisma/client';
import { VorcaroCompanionService } from '../application/services/vorcaro-companion.service';
import { VorcaroCompanionMemoryService } from '../application/services/vorcaro-companion-memory.service';
import { extractCompanionIntent, generateIntentSuggestion } from '../domain/vorcaro-companion-intent';
import { TelegramCompanionAdapter } from '../adapters/telegram-companion-adapter';

const prisma = new PrismaClient();

/**
 * Exemplo 1: Chat Simples
 */
async function example1_simpleChat() {
  console.log('\n=== Exemplo 1: Chat Simples ===\n');

  const companion = new VorcaroCompanionService(prisma);

  const response = await companion.chat({
    userId: 'user-123',
    message: 'Gastei 150 com comida',
    channel: 'telegram',
  });

  console.log('Resposta:', response.answer);
  console.log('Intent detectado:', response.intent?.type);
  console.log('Confiança:', (response.intent?.confidence || 0) * 100 + '%');
  console.log('Sugestão:', response.suggestion);
}

/**
 * Exemplo 2: Gasto Compartilhado
 */
async function example2_sharedExpense() {
  console.log('\n=== Exemplo 2: Gasto Compartilhado ===\n');

  const intent = extractCompanionIntent('Gastei 300 com João e Maria no restaurante');

  console.log('Type:', intent.type);
  console.log('Amount:', intent.amount);
  console.log('Pessoas:', intent.isPeople);
  console.log('Categoria:', intent.category);

  const suggestion = generateIntentSuggestion(intent);
  console.log('Sugestão:', suggestion);
}

/**
 * Exemplo 3: Histórico de Conversa
 */
async function example3_conversationHistory() {
  console.log('\n=== Exemplo 3: Histórico de Conversa ===\n');

  const userId = 'user-456';
  const memory = new VorcaroCompanionMemoryService();

  // Simular conversa
  await memory.addMessage(userId, 'user', 'Quanto tenho gasto este mês?');
  await memory.addMessage(userId, 'assistant', 'Você gastou R$ 1.500 este mês.');
  await memory.addMessage(userId, 'user', 'Muita comida?');
  await memory.addMessage(userId, 'assistant', 'Sim, R$ 500 só em restaurante.');

  // Recuperar contexto
  const context = await memory.getContext(userId);

  console.log('Mensagens armazenadas:', context.messages.length);
  console.log('Histórico:');
  context.messages.forEach((msg) => {
    console.log(`  ${msg.role}: ${msg.content}`);
  });

  // Construir bloco de histórico para LLM
  const historyBlock = await memory.buildHistoryBlock(userId);
  console.log('\nBloco de histórico formatado:');
  console.log(historyBlock);
}

/**
 * Exemplo 4: Registrar Transação e Estatísticas
 */
async function example4_transactions() {
  console.log('\n=== Exemplo 4: Transações e Estatísticas ===\n');

  const userId = 'user-789';
  const memory = new VorcaroCompanionMemoryService();

  // Registrar algumas transações
  await memory.recordTransaction(userId, 'expense', 50, 'Alimentação');
  await memory.recordTransaction(userId, 'expense', 30, 'Transporte');
  await memory.recordTransaction(userId, 'income', 500, 'Freelance');
  await memory.recordTransaction(userId, 'expense', 100, 'Entretenimento');

  // Recuperar contexto
  const context = await memory.getContext(userId);

  console.log('Estatísticas:');
  console.log('  Total gasto:', 'R$', context.stats?.totalExpenses.toFixed(2));
  console.log('  Total recebido:', 'R$', context.stats?.totalIncome.toFixed(2));
  console.log('  Número de transações:', context.stats?.messageCount);
  console.log('\nÚltima transação:');
  console.log('  Tipo:', context.lastTransaction?.type);
  console.log('  Valor:', 'R$', context.lastTransaction?.amount.toFixed(2));
  console.log('  Categoria:', context.lastTransaction?.category);
}

/**
 * Exemplo 5: Intent Extraction - Todos os Tipos
 */
async function example5_allIntents() {
  console.log('\n=== Exemplo 5: Extração de Intents ===\n');

  const testMessages = [
    { msg: 'Gastei 150 em comida', expected: 'gasto' },
    { msg: 'Recebi 500 do freelance', expected: 'receita' },
    { msg: 'Qual meu saldo?', expected: 'pergunta' },
    { msg: 'Gasto muito em comida', expected: 'contexto' },
    { msg: 'Consegui economizar 200!', expected: 'celebracao' },
    { msg: 'Que desastre, quebrei tudo', expected: 'stresse' },
    { msg: 'Oi tudo bem?', expected: 'outro' },
  ];

  testMessages.forEach(({ msg, expected }) => {
    const intent = extractCompanionIntent(msg);
    const match = intent.type === expected ? '✓' : '✗';
    console.log(`${match} "${msg}"`);
    console.log(`   → ${intent.type} (confiança: ${(intent.confidence * 100).toFixed(0)}%)`);
  });
}

/**
 * Exemplo 6: Usando Telegram Adapter
 */
async function example6_telegramAdapter() {
  console.log('\n=== Exemplo 6: Telegram Adapter ===\n');

  // Verificar routing
  const testMessages = [
    { msg: 'Gastei 150', shouldRoute: true },
    { msg: '/status', shouldRoute: false },
    { msg: 'Recebi 500', shouldRoute: true },
    { msg: 'Oi', shouldRoute: false },
  ];

  testMessages.forEach(({ msg, shouldRoute }) => {
    const route = TelegramCompanionAdapter.shouldRouteToCompanion(msg);
    const match = route === shouldRoute ? '✓' : '✗';
    console.log(`${match} "${msg}" → ${route ? 'Companion' : 'Outro'}`);
  });
}

/**
 * Exemplo 7: Personalizações e Preferências
 */
async function example7_userPreferences() {
  console.log('\n=== Exemplo 7: Preferências do Usuário ===\n');

  const userId = 'user-999';
  const memory = new VorcaroCompanionMemoryService();

  // Definir preferências
  await memory.setUserPreference(userId, 'name', 'João');
  await memory.setUserPreference(userId, 'tone', 'amigável');
  await memory.setUserPreference(userId, 'currencyFormat', 'R$');

  // Recuperar
  const context = await memory.getContext(userId);

  console.log('Preferências do usuário:');
  console.log('  Nome:', context.userPreferences?.name);
  console.log('  Tom:', context.userPreferences?.tone);
  console.log('  Formato de moeda:', context.userPreferences?.currencyFormat);
}

/**
 * Exemplo 8: Sugestões Automáticas
 */
async function example8_autoSuggestions() {
  console.log('\n=== Exemplo 8: Sugestões Automáticas ===\n');

  const userId = 'user-suggest';
  const memory = new VorcaroCompanionMemoryService();

  // Simular vários gastos com comida
  for (let i = 0; i < 5; i++) {
    await memory.recordTransaction(userId, 'expense', 100, 'Alimentação');
    await memory.addMessage(userId, 'assistant', `Gasto de R$ 100 em Alimentação`);
  }

  // Pedir sugestão
  const suggestion = await memory.getSuggestion(userId);
  console.log('Sugestão automática:');
  console.log(suggestion || '(nenhuma sugestão neste momento)');
}

/**
 * Executar todos os exemplos
 */
async function runAllExamples() {
  try {
    await example1_simpleChat();
    await example2_sharedExpense();
    await example3_conversationHistory();
    await example4_transactions();
    await example5_allIntents();
    await example6_telegramAdapter();
    await example7_userPreferences();
    await example8_autoSuggestions();
  } catch (error) {
    console.error('Erro ao executar exemplos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se for o script principal
if (require.main === module) {
  runAllExamples();
}

export {
  example1_simpleChat,
  example2_sharedExpense,
  example3_conversationHistory,
  example4_transactions,
  example5_allIntents,
  example6_telegramAdapter,
  example7_userPreferences,
  example8_autoSuggestions,
};
