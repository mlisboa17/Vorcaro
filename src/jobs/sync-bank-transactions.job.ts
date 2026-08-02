import cron from 'node-cron';
import { OpenFinanceService } from '../lib/open-finance/open-finance.service';
import { CategorizerService } from '../lib/open-finance/categorizer.service';
import GupshupAdapter from '../adapters/gupshup-whatsapp-adapter';
import { Database } from '../database'; // Ajustar conforme seu setup

export interface SyncResult {
  userId: string;
  imported: number;
  categorized: number;
  errors: number;
  duration: number;
}

export class SyncBankTransactionsJob {
  constructor(
    private openFinance: OpenFinanceService,
    private categorizer: CategorizerService,
    private db: Database
  ) {}

  /**
   * Iniciar job de sincronização diária
   * Executa todo dia às 2:00 AM
   */
  start(): void {
    console.log('🏦 Starting daily bank sync job scheduler...');

    // Executar todo dia às 2:00 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('🔄 Daily bank sync started');
      const results = await this.syncAllUsers();
      console.log(`✅ Daily sync completed. Processed ${results.length} users`);
    });

    // Também executar a cada 6 horas (backup)
    cron.schedule('0 */6 * * *', async () => {
      console.log('🔄 6-hourly bank sync started');
      await this.syncAllUsers();
    });

    console.log('✅ Bank sync job scheduler initialized');
  }

  /**
   * Sincronizar todos os usuários com banco conectado
   */
  private async syncAllUsers(): Promise<SyncResult[]> {
    try {
      // Buscar usuários que têm banco conectado
      const users = await this.db.query(
        'SELECT id, phone FROM users WHERE bank_connected = true'
      );

      const results: SyncResult[] = [];

      for (const user of users) {
        const result = await this.syncUserTransactions(user.id, user.phone);
        results.push(result);
      }

      return results;
    } catch (error) {
      console.error('❌ Error syncing all users:', error);
      return [];
    }
  }

  /**
   * Sincronizar transações de um usuário específico
   */
  private async syncUserTransactions(userId: string, userPhone?: string): Promise<SyncResult> {
    const startTime = Date.now();
    let imported = 0;
    let categorized = 0;
    let errors = 0;

    try {
      // Validar token
      const isValid = await this.openFinance.isTokenValid(userId);
      if (!isValid) {
        console.warn(`⚠️ Invalid token for user ${userId}, skipping sync`);
        return { userId, imported: 0, categorized: 0, errors: 1, duration: 0 };
      }

      // Puxar transações do último 1 dia
      const bankTransactions = await this.openFinance.syncRecentTransactions(userId);

      if (bankTransactions.length === 0) {
        console.log(`ℹ️ No new transactions for user ${userId}`);
        return { userId, imported: 0, categorized: 0, errors: 0, duration: Date.now() - startTime };
      }

      // Categorizar
      const categorized_txs = this.categorizer.categorizeTransactions(bankTransactions);

      // Salvar no banco de dados
      for (const tx of categorized_txs) {
        try {
          const exists = await this.db.query(
            'SELECT id FROM transactions WHERE user_id = ? AND bank_id = ?',
            [userId, tx.id]
          );

          if (!exists || exists.length === 0) {
            await this.db.query(
              `INSERT INTO transactions
               (user_id, amount, category, description, date, source, bank_id, confidence)
               VALUES (?, ?, ?, ?, ?, 'bank_import', ?, ?)`,
              [userId, tx.amount, tx.category, tx.description, tx.date, tx.id, tx.confidence]
            );
            imported++;
          }
          categorized++;
        } catch (error) {
          console.error(`❌ Error saving transaction for user ${userId}:`, error);
          errors++;
        }
      }

      // Gerar insights
      const patterns = this.categorizer.detectPatterns(categorized_txs);
      const suggestions = this.categorizer.suggestSavings(categorized_txs);

      // Notificar usuário via WhatsApp se temos dados
      if (imported > 0 && userPhone) {
        await this.notifyUserSync(userPhone, imported, patterns, suggestions);
      }

      console.log(
        `✅ Sync completed for user ${userId}: ${imported} imported, ${categorized} categorized, ${errors} errors`
      );

      return {
        userId,
        imported,
        categorized,
        errors,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      console.error(`❌ Sync failed for user ${userId}:`, error);
      return { userId, imported: 0, categorized: 0, errors: 1, duration: Date.now() - startTime };
    }
  }

  /**
   * Notificar usuário sobre sincronização
   */
  private async notifyUserSync(
    userPhone: string,
    importedCount: number,
    patterns: any[],
    suggestions: any[]
  ): Promise<void> {
    try {
      // Construir mensagem
      let message = `📊 Importei ${importedCount} transação${importedCount > 1 ? 's' : ''} do seu banco!`;

      // Adicionar padrão mais urgente
      if (patterns.length > 0 && patterns[0].severity === 'high') {
        message += `\n\n${patterns[0].message}`;
      }

      // Adicionar sugestão de economia
      if (suggestions.length > 0) {
        message += `\n💡 ${suggestions[0].suggestion}`;
        message += `\nPotencial: R$ ${suggestions[0].potential.toFixed(2)}/mês`;
      }

      message += `\n\nVeja mais no app!`;

      // Enviar via WhatsApp
      const result = await GupshupAdapter.sendText(userPhone, message);

      if (result.success) {
        console.log(`✅ Notification sent to ${userPhone}`);
      } else {
        console.warn(`⚠️ Failed to notify ${userPhone}`);
      }
    } catch (error) {
      console.error('❌ Error notifying user:', error);
    }
  }

  /**
   * Sincronizar um usuário manualmente (on-demand)
   */
  async syncNow(userId: string): Promise<SyncResult> {
    const user = await this.db.query('SELECT phone FROM users WHERE id = ?', [userId]);
    return this.syncUserTransactions(userId, user?.[0]?.phone);
  }

  /**
   * Desconectar banco e parar sincronização
   */
  async disconnectBank(userId: string): Promise<void> {
    await this.openFinance.disconnectBank(userId);
    await this.db.query('UPDATE users SET bank_connected = false WHERE id = ?', [userId]);
    console.log(`✅ Bank disconnected for user ${userId}`);
  }
}

// Singleton instance
let syncJobInstance: SyncBankTransactionsJob | null = null;

export function initializeSyncJob(
  openFinance: OpenFinanceService,
  categorizer: CategorizerService,
  db: Database
): SyncBankTransactionsJob {
  if (!syncJobInstance) {
    syncJobInstance = new SyncBankTransactionsJob(openFinance, categorizer, db);
    syncJobInstance.start();
  }
  return syncJobInstance;
}

export function getSyncJob(): SyncBankTransactionsJob | null {
  return syncJobInstance;
}
