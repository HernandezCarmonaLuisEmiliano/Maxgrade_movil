import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { StyleSheet, View } from 'react-native';

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.tint + '20' }]}>
        <ThemedText type="title">Ayuda</ThemedText>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <IconSymbol name="book.fill" size={32} color={colors.tint} />
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Sobre Classroom
          </ThemedText>
          <ThemedText style={styles.sectionText}>
            Una aplicación minimalista para gestionar clases, crear tus propias clases y unirte a
            otras usando códigos de 6 caracteres.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <IconSymbol name="plus.circle.fill" size={32} color={colors.tint} />
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Crear una Clase
          </ThemedText>
          <ThemedText style={styles.sectionText}>
            Presiona el botón &#34;Crear Clase&#34; en la pantalla principal, ingresa el nombre y
            descripción. Recibirás un código único de 6 caracteres.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <IconSymbol name="checkmark.circle.fill" size={32} color={colors.tint} />
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Unirse a una Clase
          </ThemedText>
          <ThemedText style={styles.sectionText}>
            Presiona el botón &#34;Unirse&#34; e ingresa el código de 6 caracteres proporcionado por tu
            profesor.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <IconSymbol name="power" size={32} color={colors.tint} />
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Cerrar Sesión
          </ThemedText>
          <ThemedText style={styles.sectionText}>
            Toca el icono de poder en la esquina superior derecha de la pantalla de clases para
            cerrar sesión.
          </ThemedText>
        </View>
      </View>

      <View style={styles.footer}>
        <ThemedText style={styles.version}>Versión 1.0.0</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  version: {
    opacity: 0.5,
    fontSize: 12,
  },
});
