import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
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

interface LoginScreenProps {
  onSignUp: () => void;
}

export function LoginScreen({ onSignUp }: LoginScreenProps) {
  const [correo, setCorreo] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleLogin = async () => {
    if (!correo || !contraseña) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      await login(correo, contraseña);
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
  <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logoBox}>
          <ThemedText style={styles.logoLetter}>M</ThemedText>
        </View>
        <ThemedText style={styles.brand}>
          <ThemedText style={styles.brandMax}>Max</ThemedText>
          <ThemedText style={styles.brandGrade}>Grade</ThemedText>
        </ThemedText>
        <ThemedText style={styles.subtitle}>Inicia sesión en tu cuenta</ThemedText>
      </View>

      {/* Form */}
      <View style={styles.form}>
        <ThemedText style={styles.label}>CORREO ELECTRÓNICO</ThemedText>
        <View style={styles.inputWrapper}>
          <IconSymbol name="envelope" size={16} color="#8899aa" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.input}
            placeholder="correo@ejemplo.com"
            placeholderTextColor="#4a6080"
            value={correo}
            onChangeText={setCorreo}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        <ThemedText style={styles.label}>CONTRASEÑA</ThemedText>
        <View style={styles.inputWrapper}>
          <IconSymbol name="lock" size={16} color="#8899aa" style={{ marginRight: 10 }} />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="••••••••"
            placeholderTextColor="#4a6080"
            value={contraseña}
            onChangeText={setContraseña}
            secureTextEntry
            editable={!loading}
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <ThemedText style={styles.buttonText}>Iniciar Sesión</ThemedText>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <ThemedText style={styles.footerText}>¿No tienes cuenta? </ThemedText>
        <TouchableOpacity onPress={onSignUp}>
          <ThemedText style={styles.footerLink}>Regístrate</ThemedText>
        </TouchableOpacity>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>
);
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#0a1628' },
  logoContainer: { alignItems: 'center', marginBottom: 36 },
  logoBox: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: '#32a4b8', justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  logoLetter: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  brand: { fontSize: 24, fontWeight: 'bold', marginBottom: 6 },
  brandMax: { color: '#32a4b8', fontSize: 24, fontWeight: 'bold' },
  brandGrade: { color: '#32b880', fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#8899aa', fontSize: 13 },
  form: { marginBottom: 24 },
  label: { color: '#8899aa', fontSize: 11, letterSpacing: 0.8, marginBottom: 6, marginTop: 14 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a2d42', borderWidth: 1, borderColor: '#2a4060',
    borderRadius: 10, paddingHorizontal: 14, height: 48,
  },
  input: { flex: 1, color: '#fff', fontSize: 14 },
  button: {
    marginTop: 24, height: 50, borderRadius: 10,
    backgroundColor: '#32a4b8', justifyContent: 'center', alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: '#8899aa', fontSize: 13 },
  footerLink: { color: '#32a4b8', fontSize: 13, fontWeight: 'bold' },
});