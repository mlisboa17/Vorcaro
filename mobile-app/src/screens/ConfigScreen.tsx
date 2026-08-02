import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  Switch,
  Divider,
  Avatar,
} from 'react-native-paper';
import { useAppStore } from '../store';

export function ConfigScreen({ navigation }: any) {
  const { userId, logout, token } = useAppStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Sair da Conta',
      'Tem certeza de que deseja sair?',
      [
        {
          text: 'Cancelar',
          onPress: () => {},
        },
        {
          text: 'Sair',
          onPress: async () => {
            await logout();
            navigation.navigate('Auth');
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handlePrivacy = () => {
    Alert.alert(
      'Privacidade',
      'Leia nossa política de privacidade em nosso site.',
      [{ text: 'OK', onPress: () => {} }]
    );
  };

  const handleTerms = () => {
    Alert.alert(
      'Termos de Uso',
      'Leia os termos de uso em nosso site.',
      [{ text: 'OK', onPress: () => {} }]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* User Profile Section */}
        <Card style={styles.profileCard}>
          <Card.Content>
            <View style={styles.profileContainer}>
              <Avatar.Text
                size={64}
                label={userId ? userId.substring(0, 2).toUpperCase() : 'U'}
                style={styles.avatar}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {userId ? userId : 'Usuário'}
                </Text>
                <Text style={styles.profileEmail}>
                  {token ? 'Conectado' : 'Desconectado'}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Preferences Section */}
        <Text style={styles.sectionTitle}>Preferências</Text>
        <Card style={styles.preferencesCard}>
          <Card.Content>
            <View style={styles.preferenceRow}>
              <View>
                <Text style={styles.preferenceLabel}>Notificações</Text>
                <Text style={styles.preferenceSubtitle}>
                  Receba alertas de gastos
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
              />
            </View>
            <Divider style={styles.divider} />

            <View style={styles.preferenceRow}>
              <View>
                <Text style={styles.preferenceLabel}>
                  Autenticação Biométrica
                </Text>
                <Text style={styles.preferenceSubtitle}>
                  Use biometria para entrar
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={setBiometricEnabled}
              />
            </View>
          </Card.Content>
        </Card>

        {/* App Info Section */}
        <Text style={styles.sectionTitle}>Sobre o App</Text>
        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Versão</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <Divider style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Build</Text>
              <Text style={styles.infoValue}>2026.08.01</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Actions Section */}
        <Text style={styles.sectionTitle}>Ações</Text>
        <Button
          mode="outlined"
          onPress={handlePrivacy}
          style={styles.actionButton}
        >
          Política de Privacidade
        </Button>

        <Button
          mode="outlined"
          onPress={handleTerms}
          style={styles.actionButton}
        >
          Termos de Uso
        </Button>

        <Button
          mode="contained-tonal"
          onPress={handleLogout}
          style={[styles.actionButton, styles.logoutButton]}
          textColor="#d32f2f"
        >
          Sair da Conta
        </Button>

        {/* Footer */}
        <Text style={styles.footer}>
          Vorcaro - Seu Companheiro Financeiro
        </Text>
      </ScrollView>
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
  profileCard: {
    marginBottom: 24,
    elevation: 4,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 16,
    backgroundColor: '#1976d2',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  profileEmail: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 4,
  },
  preferencesCard: {
    marginBottom: 24,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  preferenceSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  infoCard: {
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  divider: {
    marginVertical: 8,
  },
  actionButton: {
    marginBottom: 12,
  },
  logoutButton: {
    marginTop: 12,
    borderColor: '#d32f2f',
  },
  footer: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginTop: 32,
    marginBottom: 32,
  },
});
