import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export interface PendingTransaction {
  id: string;
  amount: number;
  category: string;
  description?: string;
  date: string;
  paymentMethod?: string;
  status: 'pending' | 'synced' | 'failed';
  syncedAt?: string;
  error?: string;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncedAt?: string;
  pendingCount: number;
  failedCount: number;
}

const KEYS = {
  PENDING_TRANSACTIONS: '@vorcaro/pending_transactions',
  SYNC_STATUS: '@vorcaro/sync_status',
  CACHE_TRANSACTIONS: '@vorcaro/cache_transactions',
  CACHE_BALANCE: '@vorcaro/cache_balance',
  CACHE_ALERTS: '@vorcaro/cache_alerts',
};

export class OfflineStorageService {
  /**
   * Verificar se está online
   */
  static async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  }

  /**
   * Armazenar transação offline
   */
  static async savePendingTransaction(transaction: Partial<PendingTransaction>): Promise<void> {
    try {
      const pending = await this.getPendingTransactions();
      const newTransaction: PendingTransaction = {
        id: transaction.id || `offline_${Date.now()}`,
        amount: transaction.amount || 0,
        category: transaction.category || 'Outro',
        description: transaction.description,
        date: transaction.date || new Date().toISOString(),
        status: 'pending',
      };

      pending.push(newTransaction);
      await AsyncStorage.setItem(KEYS.PENDING_TRANSACTIONS, JSON.stringify(pending));
    } catch (error) {
      console.error('Error saving pending transaction:', error);
    }
  }

  /**
   * Obter transações pendentes
   */
  static async getPendingTransactions(): Promise<PendingTransaction[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.PENDING_TRANSACTIONS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting pending transactions:', error);
      return [];
    }
  }

  /**
   * Sincronizar transações pendentes com servidor
   */
  static async syncPendingTransactions(
    syncFn: (transaction: PendingTransaction) => Promise<any>
  ): Promise<SyncStatus> {
    try {
      const isOnline = await this.isOnline();
      if (!isOnline) {
        return {
          isSyncing: false,
          pendingCount: (await this.getPendingTransactions()).length,
          failedCount: 0,
        };
      }

      const pending = await this.getPendingTransactions();
      let synced = 0;
      let failed = 0;

      for (const transaction of pending) {
        try {
          await syncFn(transaction);
          transaction.status = 'synced';
          transaction.syncedAt = new Date().toISOString();
          synced++;
        } catch (error) {
          transaction.status = 'failed';
          transaction.error = String(error);
          failed++;
        }
      }

      // Remover transações sincronizadas
      const remaining = pending.filter((t) => t.status !== 'synced');
      if (remaining.length === 0) {
        await AsyncStorage.removeItem(KEYS.PENDING_TRANSACTIONS);
      } else {
        await AsyncStorage.setItem(KEYS.PENDING_TRANSACTIONS, JSON.stringify(remaining));
      }

      const status: SyncStatus = {
        isSyncing: false,
        lastSyncedAt: new Date().toISOString(),
        pendingCount: remaining.filter((t) => t.status === 'pending').length,
        failedCount: remaining.filter((t) => t.status === 'failed').length,
      };

      console.log(`✅ Sync complete: ${synced} synced, ${failed} failed`);
      return status;
    } catch (error) {
      console.error('Sync error:', error);
      return {
        isSyncing: false,
        pendingCount: (await this.getPendingTransactions()).length,
        failedCount: 0,
      };
    }
  }

  /**
   * Cachear transações
   */
  static async cacheTransactions(transactions: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.CACHE_TRANSACTIONS, JSON.stringify(transactions));
    } catch (error) {
      console.error('Error caching transactions:', error);
    }
  }

  /**
   * Obter transações cacheadas
   */
  static async getCachedTransactions(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.CACHE_TRANSACTIONS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting cached transactions:', error);
      return [];
    }
  }

  /**
   * Cachear saldo
   */
  static async cacheBalance(balance: number): Promise<void> {
    try {
      await AsyncStorage.setItem(
        KEYS.CACHE_BALANCE,
        JSON.stringify({
          amount: balance,
          cachedAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error('Error caching balance:', error);
    }
  }

  /**
   * Obter saldo cacheado
   */
  static async getCachedBalance(): Promise<{ amount: number; cachedAt: string } | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.CACHE_BALANCE);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting cached balance:', error);
      return null;
    }
  }

  /**
   * Cachear alertas
   */
  static async cacheAlerts(alerts: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.CACHE_ALERTS, JSON.stringify(alerts));
    } catch (error) {
      console.error('Error caching alerts:', error);
    }
  }

  /**
   * Obter alertas cacheados
   */
  static async getCachedAlerts(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.CACHE_ALERTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting cached alerts:', error);
      return [];
    }
  }

  /**
   * Limpar todos os dados offline
   */
  static async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        KEYS.PENDING_TRANSACTIONS,
        KEYS.SYNC_STATUS,
        KEYS.CACHE_TRANSACTIONS,
        KEYS.CACHE_BALANCE,
        KEYS.CACHE_ALERTS,
      ]);
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  }

  /**
   * Obter status de sincronização
   */
  static async getSyncStatus(): Promise<SyncStatus> {
    const pending = await this.getPendingTransactions();
    return {
      isSyncing: false,
      pendingCount: pending.filter((t) => t.status === 'pending').length,
      failedCount: pending.filter((t) => t.status === 'failed').length,
    };
  }
}

export default OfflineStorageService;
