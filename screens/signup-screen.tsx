import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/context/auth-context';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert, Image, KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface SignupScreenProps {
  onLogin: () => void;
}

export function SignupScreen({ onLogin }: SignupScreenProps) {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { registro } = useAuth();

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
    <LinearGradient colors={['#e0f7fa', '#f0fff4', '#e8f5fe']} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.card}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/images/LogoPng.png')}
                style={styles.logoImage}
                resizeMode="contain"
/>
              <ThemedText style={styles.brand}>
                <ThemedText style={styles.brandMax}>Max</ThemedText>
                <ThemedText style={styles.brandGrade}>Grade</ThemedText>
              </ThemedText>
              <ThemedText style={styles.subtitle}>Crea tu cuenta</ThemedText>
            </View>

            <View style={styles.form}>
              <View style={styles.row}>
                <View style={[styles.inputWrapper, { flex: 1, marginRight: 8 }]}>
                  <IconSymbol name="person" size={18} color="#32a4b8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="Nombre"
                    placeholderTextColor="#aac0cc"
                    value={nombre}
                    onChangeText={setNombre}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>
                <View style={[styles.inputWrapper, { flex: 1 }]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Apellido"
                    placeholderTextColor="#aac0cc"
                    value={apellido}
                    onChangeText={setApellido}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>
              </View>

              <ThemedText style={styles.label}>CORREO ELECTRÓNICO</ThemedText>
              <View style={styles.inputWrapper}>
                <IconSymbol name="envelope" size={18} color="#32a4b8" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.input}
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor="#aac0cc"
                  value={correo}
                  onChangeText={setCorreo}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>

              <ThemedText style={styles.label}>CONTRASEÑA</ThemedText>
              <View style={styles.inputWrapper}>
                <IconSymbol name="lock" size={18} color="#32a4b8" style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Mínimo 8 caracteres"
                  placeholderTextColor="#aac0cc"
                  value={contraseña}
                  onChangeText={setContraseña}
                  secureTextEntry={!showPass}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                  <IconSymbol name={showPass ? 'eye.slash' : 'eye'} size={18} color="#32a4b8" />
                </TouchableOpacity>
              </View>

              <LinearGradient
                colors={['#32c4d8', '#32e880']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}>
                <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.buttonText}>Registrarse</ThemedText>
                  )}
                </TouchableOpacity>
              </LinearGradient>
            </View>

            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>¿Ya tienes cuenta? </ThemedText>
              <TouchableOpacity onPress={onLogin}>
                <ThemedText style={styles.footerLink}>Inicia sesión</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 28,
    padding: 28,
    shadowColor: '#32c4b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  logoContainer: { alignItems: 'center', marginBottom: 24 },
  logoBox: {
    width: 72, height: 72, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  logoLetter: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  brand: { fontSize: 26, fontWeight: 'bold', marginBottom: 6 },
  brandMax: { color: '#32a4b8', fontSize: 26, fontWeight: 'bold' },
  brandGrade: { color: '#32b880', fontSize: 26, fontWeight: 'bold' },
  subtitle: { color: '#7a9aaa', fontSize: 14 },
  form: { marginBottom: 20 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { color: '#7a9aaa', fontSize: 11, letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0f8fb', borderWidth: 1.5, borderColor: '#d0eaf2',
    borderRadius: 12, paddingHorizontal: 16, height: 52,
    marginBottom: 4,
  },
  input: { flex: 1, color: '#1a3a4a', fontSize: 15 },
  buttonGradient: { marginTop: 28, borderRadius: 14 },
  button: { height: 52, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  footerText: { color: '#7a9aaa', fontSize: 14 },
  footerLink: { color: '#32a4b8', fontSize: 14, fontWeight: 'bold' },
  logoImage: {        
    width: 90,
    height: 90,
    marginBottom: 14,
  },
});