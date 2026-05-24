import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useClases } from '@/context/class-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export function JoinClassScreen() {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const { unirseClase } = useClases();
  const router = useRouter();

  const handleJoinClass = async () => {
    if (!codigo.trim()) {
      Alert.alert('Error', 'Por favor ingresa un código de clase');
      return;
    }
    if (codigo.trim().length !== 6) {
      Alert.alert('Error', 'El código debe tener exactamente 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      await unirseClase(codigo.trim().toUpperCase());
      Alert.alert('Éxito', '¡Te has unido a la clase!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const letras = codigo.padEnd(6, ' ').split('');

  return (
    <LinearGradient colors={['#f5f5f5', '#ffffff', '#f9f9f9']} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
              <IconSymbol name="xmark" size={18} color="#5b6bff" />
            </TouchableOpacity>
            <ThemedText style={styles.title}>Unirse a Clase</ThemedText>
          </View>

          {/* Icono decorativo */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#5b6bff', '#6b7bff']}
              style={styles.iconBox}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}>
              <IconSymbol name="qrcode" size={36} color="#fff" />
            </LinearGradient>
            <ThemedText style={styles.iconTitle}>Ingresa el código de tu profesor</ThemedText>
            <ThemedText style={styles.iconSubtitle}>
              El código tiene 6 caracteres (letras y números)
            </ThemedText>
          </View>

          {/* Cuadros del código */}
          <View style={styles.codigosContainer}>
            {letras.map((letra, i) => (
              <View
                key={i}
                style={[styles.letraBox, letra.trim() !== '' && styles.letraBoxFilled]}>
                <ThemedText style={styles.letraText}>{letra.trim()}</ThemedText>
              </View>
            ))}
          </View>

          {/* Input real */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="ABC123"
              placeholderTextColor="#999999"
              value={codigo}
              onChangeText={(t) => setCodigo(t.toUpperCase())}
              editable={!loading}
              autoCapitalize="characters"
              maxLength={6}
              textAlign="center"
              selectionColor="#5b6bff"
              autoCorrect={false}
            />
          </View>

          {/* Botón */}
          <LinearGradient
            colors={
              codigo.trim().length === 6
                ? ['#5b6bff', '#6b7bff']
                : ['#e0e0e0', '#e0e0e0']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleJoinClass}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>Unirse a la Clase</ThemedText>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingTop: 52 },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    marginRight: 14,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a3a4a' },

  iconContainer: { alignItems: 'center', marginBottom: 36 },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconTitle: { fontSize: 16, fontWeight: '600', color: '#1a3a4a', marginBottom: 6 },
  iconSubtitle: { color: '#7a9aaa', fontSize: 13, textAlign: 'center' },

  codigosContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  letraBox: {
    width: 46,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
  },
  letraBoxFilled: { borderColor: '#5b6bff', backgroundColor: '#f5f5f5' },
  letraText: { fontSize: 22, fontWeight: 'bold', color: '#1a3a4a' },

  inputWrapper: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 14,
    marginBottom: 28,
    marginHorizontal: 20,
  },
  input: {
    paddingVertical: 14,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a3a4a',
    letterSpacing: 6,
    textAlign: 'center',
  },

  buttonGradient: { borderRadius: 14 },
  button: { height: 52, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});