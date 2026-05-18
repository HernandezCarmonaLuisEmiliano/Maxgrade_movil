import { supabase } from '@/config/supabase';
import { useAuth } from '@/context/auth-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ClassDetailScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

  // Parámetros que se reciben al presionar la clase en la lista
  const { id, nombre_clase, descripcion } = useLocalSearchParams<{
    id: string;
    nombre_clase: string;
    descripcion: string;
  }>();

  // Estados de control de Rol e Interfaz
  const [esProfesor, setEsProfesor] = useState(false);
  const [loading, setLoading] = useState(true);

  // Estados del Muro (Anuncios + Tareas)
  const [anuncios, setAnuncios] = useState<any[]>([]);
  const [tareas, setTareas] = useState<any[]>([]);
  const [entregas, setEntregas] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [nuevoAnuncio, setNuevoAnuncio] = useState('');
  const [publicando, setPublicando] = useState(false);

  if (!user || !id) {
    useEffect(() => {
      router.back();
    }, []);
    return null;
  }

  useEffect(() => {
    verificarRolYDatos();
  }, [id]);

  const verificarRolYDatos = async () => {
    setLoading(true);
    try {
      // 1. Detectar el rol consultando si el usuario actual es el dueño (profesor) de la clase
      const { data: claseData, error: claseError } = await supabase
        .from('clases')
        .select('profesor_id')
        .eq('id', id)
        .single();

      if (!claseError && claseData) {
        // Si el id del usuario autenticado coincide con profesor_id, es maestro
        const maestro = claseData.profesor_id === user.id;
        setEsProfesor(maestro);
      }

      // 2. Cargar el resto de la información en paralelo
      await Promise.all([cargarTareas(), cargarAnuncios(), cargarMisEntregas()]);
    } catch (err) {
      console.error('Error al inicializar la clase:', err);
    } finally {
      setLoading(false);
    }
  };

  const cargarTareas = async () => {
    try {
      const { data, error } = await supabase
        .from('tareas')
        .select('*')
        .eq('clase_id', id);
      if (!error && data) setTareas(data);
    } catch (err) {
      console.error(err);
    }
  };

  const cargarAnuncios = async () => {
    try {
      const { data, error } = await supabase
        .from('anuncios')
        .select('*, usuarios(nombre, apellido)')
        .eq('clase_id', id);
      if (!error && data) setAnuncios(data);
    } catch (err) {
      console.error(err);
    }
  };

  const cargarMisEntregas = async () => {
    try {
      const { data, error } = await supabase
        .from('entregas')
        .select('tarea_id, estado')
        .eq('estudiante_id', user.id);
      if (!error && data) setEntregas(data);
    } catch (err) {
      console.error(err);
    }
  };

  const publicarAnuncio = async () => {
    if (nuevoAnuncio.trim() === '') return;
    setPublicando(true);
    try {
      const { error } = await supabase.from('anuncios').insert([
        {
          clase_id: id,
          autor_id: user.id,
          contenido: nuevoAnuncio.trim(),
          fecha_publicacion: new Date().toISOString(),
        },
      ]);

      if (error) {
        Alert.alert('Error', 'No se pudo publicar el anuncio');
      } else {
        setNuevoAnuncio('');
        setModalVisible(false);
        await cargarAnuncios();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPublicando(false);
    }
  };

  const confirmarEliminacion = (anuncioId: number) => {
    Alert.alert(
      'Eliminar anuncio',
      '¿Estás seguro de que quieres borrar este mensaje?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => ejecutarEliminacion(anuncioId) },
      ]
    );
  };

  const ejecutarEliminacion = async (anuncioId: number) => {
    const { error } = await supabase.from('anuncios').delete().eq('id', anuncioId);
    if (error) {
      Alert.alert('Error', 'No se pudo borrar');
    } else {
      cargarAnuncios();
    }
  };

  // Une y ordena de manera cronológica inversa para el feed del muro
  const datosMuro = [
    ...anuncios.map((a) => ({ ...a, tipoItem: 'anuncio' })),
    ...tareas.map((t) => ({ ...t, tipoItem: 'tarea' })),
  ].sort((a, b) => {
    const fechaA = new Date(a.fecha_publicacion || a.created_at || 0).getTime();
    const fechaB = new Date(b.fecha_publicacion || b.created_at || 0).getTime();
    return fechaB - fechaA;
  });

  const renderItemMuro = ({ item }: { item: any }) => {
    if (item.tipoItem === 'anuncio') {
      return (
        <View style={[styles.cardAnuncio, { borderColor: colors.tint + '30' }]}>
          <View style={styles.headerCard}>
            <View style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}>
              <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
                <ThemedText style={styles.avatarText}>
                  {item.usuarios?.nombre ? item.usuarios.nombre[0].toUpperCase() : '?'}
                </ThemedText>
              </View>
              <View>
                <ThemedText style={styles.nombreAutor} type="defaultSemiBold">
                  {item.usuarios?.nombre} {item.usuarios?.apellido}
                </ThemedText>
                <ThemedText style={styles.fechaCard}>
                  {new Date(item.fecha_publicacion).toLocaleDateString()}
                </ThemedText>
              </View>
            </View>
            {(item.autor_id === user.id || esProfesor) && (
              <TouchableOpacity style={styles.menuOptions} onPress={() => confirmarEliminacion(item.id)}>
                <ThemedText style={styles.menuOptionsText}>⋮</ThemedText>
              </TouchableOpacity>
            )}
          </View>
          <ThemedText style={styles.contenidoAnuncio}>{item.contenido}</ThemedText>
        </View>
      );
    }

    const miEntrega = entregas.find((e) => e.tarea_id === item.id);
    return (
      <TouchableOpacity
      >
        <View style={[styles.tareaIconContainer, { backgroundColor: colors.tint + '15' }]}>
          <IconSymbol name="doc.text.fill" size={20} color={colors.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.tareaTitulo} type="defaultSemiBold">
            {item.titulo}
          </ThemedText>
          <ThemedText style={styles.tareaFecha}>Nueva tarea asignada</ThemedText>
        </View>

        {/* Muestra insignias dinámicas según si eres Maestro o Alumno */}
        {esProfesor ? (
          <View style={[styles.statusBadge, { backgroundColor: colors.tint + '15' }]}>
            <ThemedText style={{ color: colors.tint, fontSize: 11, fontWeight: 'bold' }}>
              Revisar
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: miEntrega ? '#E8F5E9' : '#FFF4E5' }]}>
            <ThemedText style={{ color: miEntrega ? '#2E7D32' : '#D84315', fontSize: 11, fontWeight: 'bold' }}>
              {miEntrega ? 'Entregado' : 'Asignada'}
            </ThemedText>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <IconSymbol name="chevron.left" size={24} color="#fff" />
      </TouchableOpacity>

      {loading && (
        <View style={styles.absoluteLoader}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      )}

      <FlatList
        data={datosMuro}
        keyExtractor={(item) => item.id.toString() + item.tipoItem}
        renderItem={renderItemMuro}
        ListHeaderComponent={
          <>
            <View style={[styles.banner, { backgroundColor: colors.tint }]}>
              <ThemedText style={styles.bannerTitulo}>{nombre_clase}</ThemedText>
              <ThemedText style={styles.bannerSubtitulo}>
                {descripcion || 'Sin descripción'} — {esProfesor ? 'Profesor' : 'Alumno'}
              </ThemedText>
            </View>

            <TouchableOpacity style={[styles.fakeInput, { backgroundColor: '#FFFFFF' + '08' }]} onPress={() => setModalVisible(true)}>
              <View style={[styles.avatarSmall, { backgroundColor: colors.tint }]}>
                <ThemedText style={styles.avatarTextSmall}>
                  {user.nombre ? user.nombre[0].toUpperCase() : '?'}
                </ThemedText>
              </View>
              <ThemedText style={styles.placeholderText}>Anunciar algo a la clase...</ThemedText>
            </TouchableOpacity>
          </>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background || '#fff' }]}>
            <ThemedText style={styles.modalTitle} type="subtitle">Compartir con la clase</ThemedText>
            <TextInput
              style={[styles.inputAnuncio, { color: colors.text, borderBottomColor: colors.tint }]}
              placeholder="Escribe tu mensaje..."
              placeholderTextColor={colors.text + '50'}
              multiline
              value={nuevoAnuncio}
              onChangeText={setNuevoAnuncio}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Button title="Cancelar" color="#5F6368" onPress={() => setModalVisible(false)} />
              <Button title={publicando ? 'Publicando...' : 'Publicar'} color={colors.tint} onPress={publicarAnuncio} disabled={publicando} />
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 55,
    left: 15,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  banner: {
    height: 150,
    justifyContent: 'flex-end',
    padding: 20,
    marginTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 5 : 45,
    marginHorizontal: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bannerTitulo: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  bannerSubtitulo: { fontSize: 14, color: '#fff', opacity: 0.8, marginTop: 4 },
  fakeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginHorizontal: 10,
    marginTop: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  placeholderText: { fontSize: 14, marginLeft: 12, opacity: 0.6 },
  avatarSmall: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  avatarTextSmall: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  cardAnuncio: { padding: 16, marginHorizontal: 10, marginBottom: 12, borderRadius: 10, borderWidth: 1 },
  headerCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  nombreAutor: { fontSize: 14 },
  fechaCard: { fontSize: 11, opacity: 0.5, marginTop: 2 },
  menuOptions: { padding: 5 },
  menuOptionsText: { fontSize: 20, opacity: 0.6 },
  contenidoAnuncio: { fontSize: 14, opacity: 0.8, lineHeight: 20 },
  cardTarea: { flexDirection: 'row', alignItems: 'center', padding: 14, marginHorizontal: 10, marginBottom: 12, borderRadius: 10, borderWidth: 1 },
  tareaIconContainer: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  tareaTitulo: { fontSize: 14 },
  tareaFecha: { fontSize: 11, opacity: 0.5, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  absoluteLoader: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -12 }, { translateY: -12 }], zIndex: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 14, padding: 22, elevation: 5 },
  modalTitle: { fontWeight: 'bold', marginBottom: 12 },
  inputAnuncio: { minHeight: 90, textAlignVertical: 'top', fontSize: 15, marginBottom: 20, borderBottomWidth: 1 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
});