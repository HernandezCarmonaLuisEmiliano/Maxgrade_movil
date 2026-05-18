import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/config/supabase';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useClases } from '@/context/class-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFocusEffect as useNavFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

interface ClasseCardProps {
  clase: any;
  onPress: () => void;
  colorScheme: 'light' | 'dark';
}

function ClasseCard({ clase, onPress, colorScheme }: ClasseCardProps) {
  const colors = Colors[(colorScheme ?? 'light') as keyof typeof Colors];
  return (
    <TouchableOpacity
      style={[styles.cardContainer, { backgroundColor: '#FFFFFF' + '08', borderColor: colors.tint }]}
      onPress={onPress}>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <ThemedText style={styles.cardTitle} type="defaultSemiBold">
          {clase.nombre_clase || 'Clase sin nombre'}
        </ThemedText>
        <ThemedText style={styles.cardDesc}>{clase.materia || 'Sin descripción'}</ThemedText>
        <ThemedText style={styles.cardCode}>Código: {clase.codigo_acceso}</ThemedText>
      </View>
      <IconSymbol name="chevron.right" size={24} color={colors.tint} />
    </TouchableOpacity>
  );
}

interface ClassesScreenProps {
  onCreateClass: () => void;
  onJoinClass: () => void;
}

const HORAS = Array.from({ length: 24 }, (_, i) => {
  const ampm = i < 12 ? 'AM' : 'PM';
  const hora12 = i === 0 ? 12 : i > 12 ? i - 12 : i;
  return { value: i, label: `${hora12}:00 ${ampm}` };
});

export function ClassesScreen({ onCreateClass, onJoinClass }: ClassesScreenProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { user, logout } = useAuth();
  const { clases, obtenerMisClases } = useClases();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [horaPreferida, setHoraPreferida] = useState<number>(user?.hora_preferida ?? 7);
  const [guardandoHora, setGuardandoHora] = useState(false);

  useNavFocusEffect(
    React.useCallback(() => {
      cargarClases();
    }, [])
  );

  const cargarClases = async () => {
    setLoading(true);
    try {
      await obtenerMisClases();
    } catch (error) {
      console.error('Error cargando clases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setDrawerVisible(false);
    Alert.alert('Cerrar sesión', '¿Estás seguro que deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sí',
        onPress: async () => await logout(),
        style: 'destructive',
      },
    ]);
  };

  const handleGuardarHora = async (hora: number) => {
    setHoraPreferida(hora);
    setGuardandoHora(true);
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ hora_preferida: hora })
        .eq('id', user?.id);
      if (error) throw error;
      Alert.alert('✓ Guardado', `Recibirás recordatorios a las ${HORAS[hora].label}`);
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la hora');
    } finally {
      setGuardandoHora(false);
    }
  };

  const handleClassPress = (clase: any) => {
    router.push({
      pathname: '/class-detail',
      params: { claseId: clase.id },
    });
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.tint + '20' }]}>
        <View>
          <ThemedText type="title">Mis Clases</ThemedText>
          <ThemedText style={styles.greeting}>
            {user?.nombre} {user?.apellido}
          </ThemedText>
        </View>
        <TouchableOpacity
          style={[styles.profileBtn, { backgroundColor: colors.tint }]}
          onPress={() => setDrawerVisible(true)}>
          <ThemedText style={styles.profileInitial}>
            {(user?.nombre?.[0] ?? '?').toUpperCase()}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.tint, flex: 1, marginRight: 10 }]}
          onPress={onCreateClass}>
          <IconSymbol name="plus.circle.fill" size={20} color="#fff" />
          <ThemedText style={styles.actionButtonText}>Crear Clase</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.tint + '40', flex: 1 }]}
          onPress={onJoinClass}>
          <IconSymbol name="plus.circle" size={20} color={colors.tint} />
          <ThemedText style={[styles.actionButtonText, { color: colors.tint }]}>Unirse</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Classes List */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : clases.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="book.closed" size={48} color={colors.tint + '40'} />
          <ThemedText style={styles.emptyText}>No tienes clases aún</ThemedText>
          <ThemedText style={styles.emptySubtext}>Crea una nueva o únete con un código</ThemedText>
        </View>
      ) : (
        <FlatList
          data={clases}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ClasseCard
              clase={item}
              onPress={() => handleClassPress(item)}
              colorScheme={colorScheme ?? 'light'}
            />
          )}
          contentContainerStyle={styles.listContainer}
          scrollEnabled={true}
        />
      )}

      {/* ── DRAWER LATERAL ── */}
      <Modal visible={drawerVisible} transparent animationType="none">
        <TouchableWithoutFeedback onPress={() => setDrawerVisible(false)}>
          <View style={styles.drawerOverlay} />
        </TouchableWithoutFeedback>

        <View style={[styles.drawer, { backgroundColor: colors.background }]}>
          {/* Perfil */}
          <View style={[styles.drawerProfile, { borderBottomColor: colors.tint + '20' }]}>
            <View style={[styles.drawerAvatar, { backgroundColor: colors.tint }]}>
              <ThemedText style={styles.drawerAvatarText}>
                {(user?.nombre?.[0] ?? '?').toUpperCase()}
              </ThemedText>
            </View>
            <View>
              <ThemedText type="defaultSemiBold" style={styles.drawerName}>
                {user?.nombre} {user?.apellido}
              </ThemedText>
              <ThemedText style={styles.drawerEmail}>{user?.correo}</ThemedText>
            </View>
          </View>

          {/* Hora de recordatorio */}
          <View style={styles.drawerSection}>
            <View style={styles.drawerSectionHeader}>
              <IconSymbol name="bell.fill" size={16} color={colors.tint} />
              <ThemedText type="defaultSemiBold" style={{ marginLeft: 8 }}>
                Hora de recordatorio
              </ThemedText>
            </View>
            <ThemedText style={styles.drawerSectionSubtitle}>
              Recibirás notificaciones de tareas pendientes a esta hora
            </ThemedText>

            {guardandoHora ? (
              <ActivityIndicator color={colors.tint} style={{ marginTop: 12 }} />
            ) : (
              <ScrollView
                style={styles.horasList}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled>
                {HORAS.map((h) => (
                  <TouchableOpacity
                    key={h.value}
                    style={[
                      styles.horaItem,
                      {
                        backgroundColor:
                          horaPreferida === h.value ? colors.tint : colors.tint + '10',
                        borderColor:
                          horaPreferida === h.value ? colors.tint : colors.tint + '30',
                      },
                    ]}
                    onPress={() => handleGuardarHora(h.value)}>
                    <ThemedText
                      style={[
                        styles.horaText,
                        { color: horaPreferida === h.value ? '#fff' : colors.text },
                      ]}>
                      {h.label}
                    </ThemedText>
                    {horaPreferida === h.value && (
                      <IconSymbol name="checkmark" size={14} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Cerrar sesión */}
          <TouchableOpacity
            style={[styles.logoutItem, { borderTopColor: colors.tint + '20' }]}
            onPress={handleLogout}>
            <IconSymbol name="power" size={18} color="#ef4444" />
            <ThemedText style={styles.logoutText}>Cerrar sesión</ThemedText>
          </TouchableOpacity>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  greeting: { opacity: 0.7, fontSize: 14, marginTop: 4 },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  buttonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  listContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  cardContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 16, marginBottom: 4 },
  cardDesc: { fontSize: 13, opacity: 0.6, marginBottom: 8 },
  cardCode: { fontSize: 12, opacity: 0.5, marginBottom: 2 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  emptySubtext: { fontSize: 14, opacity: 0.6, marginTop: 8 },

  // Drawer
  drawerOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '78%',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  drawerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  drawerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  drawerName: { fontSize: 16 },
  drawerEmail: { fontSize: 12, opacity: 0.5, marginTop: 2 },
  drawerSection: { flex: 1, padding: 20 },
  drawerSectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  drawerSectionSubtitle: { fontSize: 12, opacity: 0.5, marginBottom: 14, lineHeight: 18 },
  horasList: { flex: 1 },
  horaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  horaText: { fontSize: 14 },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 20,
    borderTopWidth: 1,
  },
  logoutText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
});