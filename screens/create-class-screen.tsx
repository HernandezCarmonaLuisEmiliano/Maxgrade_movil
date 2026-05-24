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

export function CreateClassScreen() {
  const [nombre, setNombre] = useState('');
  const [materia, setMateria] = useState('');
  const [loading, setLoading] = useState(false);
  const { crearClase } = useClases();
  const router = useRouter();

  const handleCreateClass = async () => {
    console.log('🔵 handleCreateClass llamado');
    if (!nombre.trim()) {
      Alert.alert('Error', 'Por favor ingresa el nombre de la clase');
      return;
    }
    setLoading(true);
    try {
      console.log('📝 Creando clase:', { nombre, materia });
      const codigo = await crearClase(nombre, materia);
      console.log('✅ Clase creada con código:', codigo);
      Alert.alert('Éxito', `Clase creada. Código: ${codigo}`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('❌ Error al crear clase:', error);
      Alert.alert('Error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

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
            <ThemedText style={styles.title}>Crear Clase</ThemedText>
          </View>

          {/* Icono decorativo */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#5b6bff', '#6b7bff']}
              style={styles.iconBox}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}>
              <IconSymbol name="plus.circle.fill" size={36} color="#fff" />
            </LinearGradient>
            <ThemedText style={styles.iconSubtitle}>Nueva clase para tus estudiantes</ThemedText>
          </View>

          {/* Formulario */}
          <View style={styles.form}>
            <ThemedText style={styles.label}>NOMBRE DE LA CLASE</ThemedText>
            <View style={styles.inputWrapper}>
              <IconSymbol
                name="book.fill"
                size={16}
                color="#5b6bff"
                style={{ marginRight: 10 }}
              />
              <TextInput
                style={styles.input}
                placeholder="Ej: Matemáticas 101"
                placeholderTextColor="#999999"
                value={nombre}
                onChangeText={setNombre}
                editable={!loading}
                autoCapitalize="words"
              />
            </View>

            <ThemedText style={[styles.label, { marginTop: 16 }]}>
              MATERIA (OPCIONAL)
            </ThemedText>
            <View
              style={[styles.inputWrapper, { alignItems: 'flex-start', paddingTop: 12 }]}>
              <IconSymbol
                name="text.alignleft"
                size={16}
                color="#5b6bff"
                style={{ marginRight: 10, marginTop: 2 }}
              />
              <TextInput
                style={[styles.input, { minHeight: 90 }]}
                placeholder="Añade una materia..."
                placeholderTextColor="#999999"
                value={materia}
                onChangeText={setMateria}
                editable={!loading}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Botón crear */}
            <LinearGradient
              colors={['#5b6bff', '#6b7bff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}>
              <TouchableOpacity
                style={styles.button}
                onPress={handleCreateClass}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.buttonText}>Crear Clase</ThemedText>
                )}
              </TouchableOpacity>
            </LinearGradient>
          </View>
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

  iconContainer: { alignItems: 'center', marginBottom: 32 },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconSubtitle: { color: '#7a9aaa', fontSize: 14 },

  form: {},
  label: { color: '#7a9aaa', fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 14,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  input: { flex: 1, color: '#1a3a4a', fontSize: 15 },

  buttonGradient: { borderRadius: 14, marginTop: 28 },
  button: { height: 52, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});