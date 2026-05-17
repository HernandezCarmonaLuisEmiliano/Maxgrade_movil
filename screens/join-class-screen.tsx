import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useClases } from '@/context/class-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

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
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: colors.text + '08' }]}
            onPress={() => router.back()}>
            <IconSymbol name="xmark" size={20} color={colors.text} />
          </TouchableOpacity>
          <ThemedText style={styles.title} type="title">
            Unirse a Clase
          </ThemedText>
        </View>

        <View style={styles.icon}>
          <IconSymbol name="qrcode" size={80} color={colors.tint + '40'} />
        </View>

        <View style={styles.form}>
          <ThemedText style={styles.description}>
            Ingresa el código de clase de 6 caracteres que tu profesor compartió
          </ThemedText>

          <TextInput
            style={[styles.input, { borderColor: colors.tint, color: colors.text }]}
            placeholder="Ej: ABC123"
            placeholderTextColor={colors.text + '80'}
            value={codigo}
            onChangeText={(text) => setCodigo(text.toUpperCase())}
            editable={!loading}
            autoCapitalize="characters"
            maxLength={6}
            textAlign="center"
            selectionColor={colors.tint}
          />

          <ThemedText style={styles.hint}>El código es de 6 caracteres (letras y números)</ThemedText>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.tint }]}
            onPress={handleJoinClass}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>Unirse</ThemedText>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 24,
  },
  icon: {
    alignItems: 'center',
    marginVertical: 30,
  },
  form: {
    marginTop: 20,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    opacity: 0.7,
    lineHeight: 24,
  },
  input: {
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 16,
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    opacity: 0.5,
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
