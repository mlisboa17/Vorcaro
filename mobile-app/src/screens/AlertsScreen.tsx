import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Animated,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  Snackbar,
  Chip,
} from 'react-native-paper';
import { useAppStore } from '../store';
import { getAlerts, dismissAlert } from '../services/api';

interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'success';
  date: string;
}

const ALERT_COLORS = {
  warning: '#ff9800',
  info: '#2196f3',
  success: '#4caf50',
};

const ALERT_ICONS = {
  warning: '⚠️',
  info: 'ℹ️',
  success: '✅',
};

export function AlertsScreen() {
  const { alerts, addAlert, setIsLoading, isLoading } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);
  const [localAlerts, setLocalAlerts] = useState<Alert[]>([]);
  const [snackbar, setSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setIsLoading(true);
    try {
      const result = await getAlerts();
      if (result?.data) {
        setLocalAlerts(result.data);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
      showSnackbar('Erro ao carregar alertas');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbar(true);
  };

  const handleDismissAlert = async (alertId: string) => {
    try {
      await dismissAlert(alertId);
      setLocalAlerts((prev) => prev.filter((a) => a.id !== alertId));
      showSnackbar('Alerta descartado');
    } catch (error) {
      console.error('Error dismissing alert:', error);
      showSnackbar('Erro ao descartar alerta');
    }
  };

  const renderAlert = ({ item }: { item: Alert }) => {
    const bgColor = ALERT_COLORS[item.type];
    const icon = ALERT_ICONS[item.type];

    return (
      <Card
        style={[
          styles.alertCard,
          {
            borderLeftWidth: 4,
            borderLeftColor: bgColor,
          },
        ]}
      >
        <Card.Content>
          <View style={styles.alertHeader}>
            <View style={styles.alertTitleContainer}>
              <Text style={styles.alertIcon}>{icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>{item.title}</Text>
                <Text style={styles.alertDate}>
                  {new Date(item.date).toLocaleDateString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
            <Chip
              label={item.type === 'warning' ? 'Aviso' : item.type === 'info' ? 'Info' : 'Sucesso'}
              style={{ backgroundColor: bgColor }}
              textStyle={{ color: 'white', fontSize: 12 }}
            />
          </View>

          <Text style={styles.alertMessage}>{item.message}</Text>

          <View style={styles.alertActions}>
            <Button
              mode="text"
              textColor={bgColor}
              onPress={() => handleDismissAlert(item.id)}
              loading={isLoading}
              disabled={isLoading}
            >
              Descartar
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {localAlerts.length === 0 && !refreshing && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>Tudo em Ordem</Text>
          <Text style={styles.emptyText}>
            Você não tem alertas no momento. Volte aqui para ficar atualizado.
          </Text>
          <Button
            mode="contained"
            onPress={onRefresh}
            style={styles.refreshButton}
          >
            Atualizar
          </Button>
        </View>
      )}

      <FlatList
        data={localAlerts}
        keyExtractor={(item) => item.id}
        renderItem={renderAlert}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        scrollEnabled={localAlerts.length > 0}
      />

      <Snackbar
        visible={snackbar}
        onDismiss={() => setSnackbar(false)}
        duration={2000}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  alertCard: {
    marginBottom: 12,
    elevation: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  alertTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  alertDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  alertMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  alertActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  refreshButton: {
    marginTop: 8,
  },
});
