import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function getToken(): Promise<string | null> {
  return await AsyncStorage.getItem('authToken');
}

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Transaction APIs
export async function createTransaction(data: {
  amount: number;
  category: string;
  description?: string;
}) {
  return apiCall('/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getTransactions() {
  return apiCall('/transactions', {
    method: 'GET',
  });
}

export async function getBalance() {
  return apiCall('/balance', {
    method: 'GET',
  });
}

// Chat APIs
export async function chatWithCompanion(message: string): Promise<{
  response: string;
  suggestions?: string[];
}> {
  return apiCall('/companion/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

// Alerts APIs
export async function getAlerts() {
  return apiCall('/alerts', {
    method: 'GET',
  });
}

export async function dismissAlert(alertId: string) {
  return apiCall(`/alerts/${alertId}`, {
    method: 'DELETE',
  });
}

// Auth APIs
export async function verifyToken(token: string) {
  return apiCall('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function logout() {
  await AsyncStorage.removeItem('authToken');
  await AsyncStorage.removeItem('userId');
}
