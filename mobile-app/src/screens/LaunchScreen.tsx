import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput as RNTextInput,
} from 'react-native';
import {
  Button,
  Card,
  Text,
  Snackbar,
  Modal,
  Portal,
} from 'react-native-paper';
import { useAppStore } from '../store';
import { createTransaction } from '../services/api';

interface TransactionPreview {
  amount: number;
  category: string;
  description?: string;
  mode: 'camera' | 'audio' | 'text';
}

export function LaunchScreen({ navigation }: any) {
  const { addTransaction, setIsLoading, isLoading } = useAppStore();

  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [preview, setPreview] = useState<TransactionPreview | null>(null);
  const [snackbar, setSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbar(true);
  };

  const handleCameraMode = async () => {
    // Placeholder: In production, use expo-camera to capture receipt
    showSnackbar('Modo câmera - Implementação em progresso');
    Alert.alert(
      'Câmera',
      'Tire uma foto do recibo para ser processado via OCR',
      [
        {
          text: 'Cancelar',
          onPress: () => {},
        },
        {
          text: 'Simular',
          onPress: () => {
            setPreview({
              amount: 45.99,
              category: 'Alimentação',
              description: 'Recibo fotografado',
              mode: 'camera',
            });
          },
        },
      ]
    );
  };

  const handleAudioMode = async () => {
    // Placeholder: In production, use expo-av to record and transcribe
    showSnackbar('Modo áudio - Implementação em progresso');
    Alert.alert(
      'Áudio',
      'Grave um áudio para ser transcrito e processado',
      [
        {
          text: 'Cancelar',
          onPress: () => {},
        },
        {
          text: 'Simular',
          onPress: () => {
            setPreview({
              amount: 120.0,
              category: 'Transporte',
              description: 'Áudio transcrito',
              mode: 'audio',
            });
          },
        },
      ]
    );
  };

  const handleTextMode = () => {
    setShowTextInput(true);
  };

  const parseTextInput = () => {
    // Simple parser: "R$ 50 Alimentação" or "50 alimentação"
    const match = textInput.match(/(\d+[.,]?\d*)\s+(.+)/);
    if (!match) {
      showSnackbar('Formato inválido. Use: "R$ 50 Alimentação"');
      return;
    }

    const amount = parseFloat(match[1].replace(',', '.'));
    const category = match[2].trim();

    setPreview({
      amount,
      category,
      description: textInput,
      mode: 'text',
    });
    setShowTextInput(false);
  };

  const confirmTransaction = async () => {
    if (!preview) return;

    setIsLoading(true);
    try {
      const result = await createTransaction({
        amount: -Math.abs(preview.amount),
        category: preview.category,
        description: preview.description,
      });

      if (result?.data) {
        addTransaction(result.data);
        showSnackbar('Lançamento confirmado!');
        setPreview(null);
        setTextInput('');

        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      showSnackbar('Erro ao confirmar lançamento');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Como você quer lançar?</Text>
        <Text style={styles.subtitle}>Escolha o modo mais rápido para você</Text>

        {/* Camera Button */}
        <Button
          mode="contained"
          icon="camera"
          onPress={handleCameraMode}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          📷 Fotografar Recibo
        </Button>

        {/* Audio Button */}
        <Button
          mode="contained"
          icon="microphone"
          onPress={handleAudioMode}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          🎤 Gravar Áudio
        </Button>

        {/* Text Button */}
        <Button
          mode="contained"
          icon="text-box"
          onPress={handleTextMode}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          💬 Digitar
        </Button>

        {/* Preview Card */}
        {preview && (
          <Card style={styles.previewCard}>
            <Card.Content>
              <Text style={styles.previewTitle}>
                Confirmar Lançamento
              </Text>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Valor:</Text>
                <Text style={styles.previewValue}>
                  R$ {preview.amount.toFixed(2).replace('.', ',')}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Categoria:</Text>
                <Text style={styles.previewValue}>
                  {preview.category}
                </Text>
              </View>
              {preview.description && (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Descrição:</Text>
                  <Text style={styles.previewValue}>
                    {preview.description}
                  </Text>
                </View>
              )}

              <View style={styles.previewActions}>
                <Button
                  mode="outlined"
                  onPress={() => setPreview(null)}
                  style={styles.previewButton}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={confirmTransaction}
                  loading={isLoading}
                  disabled={isLoading}
                  style={styles.previewButton}
                >
                  ✅ Confirmar
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Text Input Modal */}
      <Portal>
        <Modal
          visible={showTextInput}
          onDismiss={() => setShowTextInput(false)}
          contentContainerStyle={styles.modal}
        >
          <Card style={styles.textInputCard}>
            <Card.Content>
              <Text style={styles.modalTitle}>
                Digitar Lançamento
              </Text>
              <Text style={styles.modalSubtitle}>
                Formato: R$ 50 Alimentação
              </Text>
              <RNTextInput
                style={styles.textInput}
                placeholder="R$ 0,00 Categoria"
                value={textInput}
                onChangeText={setTextInput}
                placeholderTextColor="#ccc"
              />
              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setShowTextInput(false);
                    setTextInput('');
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={parseTextInput}
                  disabled={!textInput.trim()}
                >
                  Próximo
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      {/* Snackbar */}
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
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  previewCard: {
    marginTop: 24,
    elevation: 4,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  previewValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 8,
  },
  previewButton: {
    flex: 1,
  },
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  textInputCard: {
    width: '100%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
});
