import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  FAB,
  List,
  Divider,
} from 'react-native-paper';
import { useAppStore } from '../store';
import { getBalance, getTransactions } from '../services/api';

export function HomeScreen({ navigation }: any) {
  const {
    balance,
    transactions,
    setBalance,
    setTransactions,
    isLoading,
    setIsLoading,
    getTodayExpense,
    getMonthExpense,
  } = useAppStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [balanceData, transactionsData] = await Promise.all([
        getBalance(),
        getTransactions(),
      ]);

      if (balanceData?.data) {
        setBalance(balanceData.data.balance);
      }
      if (transactionsData?.data) {
        setTransactions(transactionsData.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const recentTransactions = transactions.slice(0, 3);
  const todayExpense = getTodayExpense();
  const monthExpense = getMonthExpense();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Balance Card */}
        <Card style={styles.balanceCard}>
          <Card.Content>
            <Text style={styles.balanceLabel}>Saldo Atual</Text>
            <Text style={styles.balanceAmount}>
              R$ {balance.toFixed(2).replace('.', ',')}
            </Text>
          </Card.Content>
        </Card>

        {/* Expenses Summary */}
        <Card style={styles.summaryCard}>
          <Card.Content>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>Hoje</Text>
                <Text style={styles.summaryAmount}>
                  R$ {todayExpense.toFixed(2).replace('.', ',')}
                </Text>
              </View>
              <Divider style={styles.divider} />
              <View>
                <Text style={styles.summaryLabel}>Este Mês</Text>
                <Text style={styles.summaryAmount}>
                  R$ {monthExpense.toFixed(2).replace('.', ',')}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Recent Transactions */}
        <Text style={styles.sectionTitle}>Últimos Lançamentos</Text>
        <Card style={styles.transactionsCard}>
          {recentTransactions.length > 0 ? (
            <FlatList
              data={recentTransactions}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <List.Item
                  title={item.category}
                  description={
                    new Date(item.date).toLocaleDateString('pt-BR')
                  }
                  right={() => (
                    <Text
                      style={[
                        styles.transactionAmount,
                        item.amount < 0
                          ? styles.negative
                          : styles.positive,
                      ]}
                    >
                      {item.amount < 0 ? '-' : '+'}R$
                      {Math.abs(item.amount).toFixed(2).replace('.', ',')}
                    </Text>
                  )}
                />
              )}
            />
          ) : (
            <Card.Content>
              <Text style={styles.emptyText}>
                Nenhum lançamento ainda
              </Text>
            </Card.Content>
          )}
        </Card>

        {/* View All Transactions Button */}
        {transactions.length > 3 && (
          <Button
            mode="text"
            onPress={() => navigation.navigate('Transactions')}
            style={styles.viewAllButton}
          >
            Ver Todos os Lançamentos
          </Button>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('Launch')}
        label="Lançar"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  balanceCard: {
    marginBottom: 16,
    elevation: 4,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  summaryCard: {
    marginBottom: 24,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  divider: {
    height: 40,
    width: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginLeft: 4,
  },
  transactionsCard: {
    marginBottom: 24,
  },
  transactionAmount: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  negative: {
    color: '#d32f2f',
  },
  positive: {
    color: '#388e3c',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
  },
  viewAllButton: {
    marginBottom: 80,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
