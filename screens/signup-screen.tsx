import { ThemedText } from '@/components/themed-text';
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

interface SignupScreenProps {
  onLogin: () => void;
}

export function SignupScreen({ onLogin }: SignupScreenProps) {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [loading, setLoading] = useState(false);
  const { registro } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleSignup = async () => {
    if (!nombre || !apellido || !correo || !contraseña) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (contraseña.length < 4) {
      Alert.alert('Error', 'La contraseña debe tener al menos 4 caracteres');
      return;
    }

    setLoading(true);
    try {
      await registro(nombre, apellido, correo, contraseña);
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
          <ThemedText style={styles.title} type="title">
            Classroom
          </ThemedText>
          <ThemedText style={styles.subtitle}>Crea tu cuenta</ThemedText>
        </View>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, { borderColor: colors.tint, color: colors.text }]}
            placeholder="Nombre"
            placeholderTextColor={colors.text + '80'}
            value={nombre}
            onChangeText={setNombre}
            editable={!loading}
            autoCapitalize="words"
          />

          <TextInput
            style={[styles.input, { borderColor: colors.tint, color: colors.text }]}
            placeholder="Apellido"
            placeholderTextColor={colors.text + '80'}
            value={apellido}
            onChangeText={setApellido}
            editable={!loading}
            autoCapitalize="words"
          />

          <TextInput
            style={[styles.input, { borderColor: colors.tint, color: colors.text }]}
            placeholder="Correo electrónico"
            placeholderTextColor={colors.text + '80'}
            value={correo}
            onChangeText={setCorreo}
            editable={!loading}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={[styles.input, { borderColor: colors.tint, color: colors.text }]}
            placeholder="Contraseña"
            placeholderTextColor={colors.text + '80'}
            value={contraseña}
            onChangeText={setContraseña}
            secureTextEntry
            editable={!loading}
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.tint }]}
            onPress={handleSignup}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>Registrarse</ThemedText>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <ThemedText>¿Ya tienes cuenta? </ThemedText>
          <TouchableOpacity onPress={onLogin} disabled={loading}>
            <ThemedText style={{ color: colors.tint, fontWeight: 'bold' }}>Inicia sesión</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  form: {
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
