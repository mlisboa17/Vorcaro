import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Transaction {
  id: string;
  amount: number;
  category: string;
  description?: string;
  date: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'success';
  date: string;
}

interface AppStore {
  // Auth
  token: string | null;
  userId: string | null;
  setToken: (token: string) => void;
  setUserId: (userId: string) => void;
  logout: () => void;

  // Balance & Transactions
  balance: number;
  transactions: Transaction[];
  setBalance: (balance: number) => void;
  addTransaction: (transaction: Transaction) => void;
  setTransactions: (transactions: Transaction[]) => void;
  getTodayExpense: () => number;
  getMonthExpense: () => number;

  // Chat
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;

  // Alerts
  alerts: Alert[];
  addAlert: (alert: Alert) => void;
  clearAlerts: () => void;

  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Auth
  token: null,
  userId: null,
  setToken: (token: string) => set({ token }),
  setUserId: (userId: string) => set({ userId }),
  logout: async () => {
    set({ token: null, userId: null, transactions: [], balance: 0, messages: [] });
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('userId');
  },

  // Balance & Transactions
  balance: 0,
  transactions: [],
  setBalance: (balance: number) => set({ balance }),
  addTransaction: (transaction: Transaction) =>
    set((state) => ({ transactions: [transaction, ...state.transactions] })),
  setTransactions: (transactions: Transaction[]) => set({ transactions }),
  getTodayExpense: () => {
    const { transactions } = get();
    const today = new Date().toDateString();
    return transactions
      .filter((t) => new Date(t.date).toDateString() === today && t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  },
  getMonthExpense: () => {
    const { transactions } = get();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return transactions
      .filter((t) => {
        const tDate = new Date(t.date);
        return (
          tDate.getMonth() === currentMonth &&
          tDate.getFullYear() === currentYear &&
          t.amount < 0
        );
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  },

  // Chat
  messages: [],
  addMessage: (message: ChatMessage) =>
    set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),

  // Alerts
  alerts: [],
  addAlert: (alert: Alert) =>
    set((state) => ({ alerts: [alert, ...state.alerts] })),
  clearAlerts: () => set({ alerts: [] }),

  // Loading
  isLoading: false,
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),
}));

// Initialize from AsyncStorage
export async function initializeStore() {
  const token = await AsyncStorage.getItem('authToken');
  const userId = await AsyncStorage.getItem('userId');

  if (token && userId) {
    useAppStore.setState({ token, userId });
  }
}
