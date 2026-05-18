import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, View } from 'react-native';

export default function ExploreScreen() {
  const secciones = [
    {
      icon: 'book.fill',
      titulo: 'Sobre MaxGrade',
      texto: 'Una aplicación minimalista para gestionar clases, crear tus propias clases y unirte a otras usando códigos de 6 caracteres.',
      color: ['#32c4b8', '#32e880'] as [string, string],
    },
    {
      icon: 'plus.circle.fill',
      titulo: 'Crear una Clase',
      texto: 'Presiona el botón "Crear Clase" en la pantalla principal, ingresa el nombre y descripción. Recibirás un código único de 6 caracteres.',
      color: ['#32a4d8', '#32c4b8'] as [string, string],
    },
    {
      icon: 'checkmark.circle.fill',
      titulo: 'Unirse a una Clase',
      texto: 'Presiona el botón "Unirse" e ingresa el código de 6 caracteres proporcionado por tu profesor.',
      color: ['#32c4d8', '#32e880'] as [string, string],
    },
    {
      icon: 'power',
      titulo: 'Cerrar Sesión',
      texto: 'Toca tu avatar en la esquina superior derecha de la pantalla de clases para abrir el menú y cerrar sesión.',
      color: ['#32a4b8', '#32c4d8'] as [string, string],
    },
  ];

  return (
    <LinearGradient colors={['#e0f7fa', '#f0fff4', '#e8f5fe']} style={{ flex: 1 }}>
      {/* Header */}
      <LinearGradient
        colors={['#32c4d8', '#32e880']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.header}>
        <ThemedText style={styles.headerTitle}>Ayuda</ThemedText>
        <ThemedText style={styles.headerSubtitle}>Todo lo que necesitas saber</ThemedText>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Logo decorativo */}
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={['#32c4b8', '#32e880']}
            style={styles.logoBox}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <ThemedText style={styles.logoLetter}>M</ThemedText>
          </LinearGradient>
          <ThemedText style={styles.logoMax}>Max</ThemedText>
          <ThemedText style={styles.logoGrade}>Grade</ThemedText>
        </View>

        {/* Secciones */}
        {secciones.map((s, i) => (
          <View key={i} style={styles.card}>
            <LinearGradient
              colors={s.color}
              style={styles.cardIcon}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <IconSymbol name={s.icon as any} size={22} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.cardTitle}>{s.titulo}</ThemedText>
              <ThemedText style={styles.cardText}>{s.texto}</ThemedText>
            </View>
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.versionBadge}>
            <ThemedText style={styles.versionText}>Versión 1.0.0</ThemedText>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 24,
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  content: { padding: 16, paddingBottom: 36 },

  logoContainer: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    marginVertical: 24,
  },
  logoBox: {
    width: 40, height: 40, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  logoLetter: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  logoMax: { fontSize: 22, fontWeight: 'bold', color: '#32a4b8' },
  logoGrade: { fontSize: 22, fontWeight: 'bold', color: '#32b880' },

  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 16, borderWidth: 1.5, borderColor: '#d0eaf2',
    padding: 16, marginBottom: 12,
    shadowColor: '#32c4b8', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  cardIcon: {
    width: 46, height: 46, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1a3a4a', marginBottom: 6 },
  cardText: { fontSize: 13, color: '#7a9aaa', lineHeight: 20 },

  footer: { alignItems: 'center', marginTop: 12 },
  versionBadge: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6,
    borderWidth: 1, borderColor: '#d0eaf2',
  },
  versionText: { fontSize: 12, color: '#7a9aaa' },
});