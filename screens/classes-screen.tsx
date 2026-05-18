import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/context/auth-context';
import { useClases } from '@/context/class-context';
import { useFocusEffect as useNavFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
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
  View,
} from 'react-native';

interface ClasseCardProps {
  clase: any;
  onPress: () => void;
}

function ClasseCard({ clase, onPress }: ClasseCardProps) {
  return (
    <TouchableOpacity style={styles.cardContainer} onPress={onPress}>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <ThemedText style={styles.cardTitle}>
          {clase.nombre_clase || 'Clase sin nombre'}
        </ThemedText>
        <ThemedText style={styles.cardDesc}>{clase.materia || 'Sin descripción'}</ThemedText>
        <ThemedText style={styles.cardCode}>Código: {clase.codigo_acceso}</ThemedText>
      </View>
      <IconSymbol name="chevron.right" size={20} color="#32a4b8" />
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
      { text: 'Sí', onPress: async () => await logout(), style: 'destructive' },
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
    } catch {
      Alert.alert('Error', 'No se pudo guardar la hora');
    } finally {
      setGuardandoHora(false);
    }
  };

  const handleClassPress = (clase: any) => {
    router.push({ pathname: '/class-detail', params: { claseId: clase.id } });
  };

  return (
    <LinearGradient colors={['#e0f7fa', '#f0fff4', '#e8f5fe']} style={{ flex: 1 }}>
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.headerTitle}>Mis Clases</ThemedText>
          <ThemedText style={styles.greeting}>
            {user?.nombre} {user?.apellido}
          </ThemedText>
        </View>
        <TouchableOpacity onPress={() => setDrawerVisible(true)}>
          <LinearGradient
            colors={['#32c4b8', '#32e880']}
            style={styles.profileBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}>
            <ThemedText style={styles.profileInitial}>
              {(user?.nombre?.[0] ?? '?').toUpperCase()}
            </ThemedText>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonsContainer}>
        <LinearGradient
          colors={['#32c4d8', '#32e880']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.actionGradient, { marginRight: 8 }]}>
          <TouchableOpacity style={styles.actionButton} onPress={onCreateClass}>
            <IconSymbol name="plus.circle.fill" size={18} color="#fff" />
            <ThemedText style={styles.actionButtonText}>Crear Clase</ThemedText>
          </TouchableOpacity>
        </LinearGradient>

        <TouchableOpacity
          style={styles.actionButtonOutline}
          onPress={onJoinClass}>
          <IconSymbol name="plus.circle" size={18} color="#32a4b8" />
          <ThemedText style={styles.actionButtonOutlineText}>Unirse</ThemedText>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#32a4b8" />
        </View>
      ) : clases.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="book.closed" size={52} color="#32a4b840" />
          <ThemedText style={styles.emptyText}>No tienes clases aún</ThemedText>
          <ThemedText style={styles.emptySubtext}>Crea una nueva o únete con un código</ThemedText>
        </View>
      ) : (
        <FlatList
          data={clases}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ClasseCard clase={item} onPress={() => handleClassPress(item)} />
          )}
          contentContainerStyle={styles.listContainer}
        />
      )}

      <Modal visible={drawerVisible} transparent animationType="none">
        <TouchableWithoutFeedback onPress={() => setDrawerVisible(false)}>
          <View style={styles.drawerOverlay} />
        </TouchableWithoutFeedback>

        <View style={styles.drawer}>
          <LinearGradient
            colors={['#e0f7fa', '#f0fff4']}
            style={styles.drawerProfile}>
            <LinearGradient
              colors={['#32c4b8', '#32e880']}
              style={styles.drawerAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}>
              <ThemedText style={styles.drawerAvatarText}>
                {(user?.nombre?.[0] ?? '?').toUpperCase()}
              </ThemedText>
            </LinearGradient>
            <View>
              <ThemedText style={styles.drawerName}>
                {user?.nombre} {user?.apellido}
              </ThemedText>
              <ThemedText style={styles.drawerEmail}>{user?.correo}</ThemedText>
            </View>
          </LinearGradient>

          <View style={styles.drawerSection}>
            <View style={styles.drawerSectionHeader}>
              <IconSymbol name="bell.fill" size={16} color="#32a4b8" />
              <ThemedText style={styles.drawerSectionTitle}>Hora de recordatorio</ThemedText>
            </View>
            <ThemedText style={styles.drawerSectionSubtitle}>
              Recibirás notificaciones de tareas pendientes a esta hora
            </ThemedText>

            {guardandoHora ? (
              <ActivityIndicator color="#32a4b8" style={{ marginTop: 12 }} />
            ) : (
              <ScrollView style={styles.horasList} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                {HORAS.map((h) => (
                  <TouchableOpacity
                    key={h.value}
                    style={[
                      styles.horaItem,
                      horaPreferida === h.value && styles.horaItemActive,
                    ]}
                    onPress={() => handleGuardarHora(h.value)}>
                    <ThemedText
                      style={[
                        styles.horaText,
                        horaPreferida === h.value && styles.horaTextActive,
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

          <TouchableOpacity style={styles.logoutItem} onPress={handleLogout}>
            <IconSymbol name="power" size={18} color="#ef4444" />
            <ThemedText style={styles.logoutText}>Cerrar sesión</ThemedText>
          </TouchableOpacity>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // Comosuicidarsebuscar
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#1a3a4a' },
  greeting: { fontSize: 13, color: '#7a9aaa', marginTop: 2 },
  profileBtn: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  profileInitial: { color: '#fff', fontWeight: 'bold', fontSize: 18 },

  buttonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  actionGradient: { flex: 1, borderRadius: 12 },
  actionButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13,
  },
  actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  actionButtonOutline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#32a4b8', backgroundColor: 'rgba(255,255,255,0.6)',
  },
  actionButtonOutlineText: { color: '#32a4b8', fontWeight: 'bold', fontSize: 14 },

  listContainer: { paddingHorizontal: 20, paddingBottom: 24 },
  cardContainer: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 16, borderWidth: 1.5, borderColor: '#d0eaf2',
    padding: 16, marginBottom: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#32c4b8', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1a3a4a', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#7a9aaa', marginBottom: 6 },
  cardCode: { fontSize: 12, color: '#32a4b8' },

  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#1a3a4a', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#7a9aaa', marginTop: 8, textAlign: 'center' },

  drawerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  drawer: {
    position: 'absolute', top: 0, right: 0, bottom: 0, width: '78%',
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 10,
  },
  drawerProfile: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 24, paddingTop: 60,
  },
  drawerAvatar: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
  },
  drawerAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 22 },
  drawerName: { fontSize: 16, fontWeight: '600', color: '#1a3a4a' },
  drawerEmail: { fontSize: 12, color: '#7a9aaa', marginTop: 2 },
  drawerSection: { flex: 1, padding: 20 },
  drawerSectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  drawerSectionTitle: { fontSize: 15, fontWeight: '600', color: '#1a3a4a', marginLeft: 8 },
  drawerSectionSubtitle: { fontSize: 12, color: '#7a9aaa', marginBottom: 14, lineHeight: 18 },
  horasList: { flex: 1 },
  horaItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#d0eaf2',
    backgroundColor: '#f0f8fb', marginBottom: 6,
  },
  horaItemActive: { backgroundColor: '#32a4b8', borderColor: '#32a4b8' },
  horaText: { fontSize: 14, color: '#1a3a4a' },
  horaTextActive: { color: '#fff' },
  logoutItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 20, borderTopWidth: 1, borderTopColor: '#d0eaf2',
  },
  logoutText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
});