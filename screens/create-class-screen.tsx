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

export function CreateClassScreen() {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const { crearClase } = useClases();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleCreateClass = async () => {
    if (!nombre.trim()) {
      Alert.alert('Error', 'Por favor ingresa el nombre de la clase');
      return;
    }

    setLoading(true);
    try {
      const codigo = await crearClase(nombre, descripcion);
      Alert.alert('Éxito', `Clase creada. Código: ${codigo}`, [
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
            Crear Clase
          </ThemedText>
        </View>

        <View style={styles.form}>
          <ThemedText style={styles.label} type="defaultSemiBold">
            Nombre de la clase
          </ThemedText>
          <TextInput
            style={[styles.input, { borderColor: colors.tint, color: colors.text }]}
            placeholder="Ej: Matemáticas 101"
            placeholderTextColor={colors.text + '80'}
            value={nombre}
            onChangeText={setNombre}
            editable={!loading}
            autoCapitalize="words"
          />

          <ThemedText style={[styles.label, { marginTop: 20 }]} type="defaultSemiBold">
            Descripción (opcional)
          </ThemedText>
          <TextInput
            style={[styles.input, { borderColor: colors.tint, color: colors.text, minHeight: 100 }]}
            placeholder="Añade una descripción de la clase..."
            placeholderTextColor={colors.text + '80'}
            value={descripcion}
            onChangeText={setDescripcion}
            editable={!loading}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.tint }]}
            onPress={handleCreateClass}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>Crear Clase</ThemedText>
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
  form: {
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
