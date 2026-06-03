/**
 * Capacidade futura de undo pós-efetivação (5s).
 * Não implementado — apenas contrato para evolução sem rollback complexo.
 */
export type InboxEfetivacaoUndoEntry = {
  inboxItemIds: string[];
  transactionIds: string[];
  expiresAt: number;
};

export type InboxUndoStack = {
  push: (entry: InboxEfetivacaoUndoEntry) => void;
  peek: () => InboxEfetivacaoUndoEntry | null;
  clear: () => void;
};

export function createInboxUndoStack(): InboxUndoStack {
  let current: InboxEfetivacaoUndoEntry | null = null;

  return {
    push(entry) {
      current = entry;
    },
    peek() {
      if (!current) return null;
      if (Date.now() > current.expiresAt) {
        current = null;
        return null;
      }
      return current;
    },
    clear() {
      current = null;
    },
  };
}

export const INBOX_UNDO_WINDOW_MS = 5000;
