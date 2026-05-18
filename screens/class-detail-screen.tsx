import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/config/supabase';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTareas } from '@/context/task-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Tipo que refleja los campos REALES de la tabla 'clases' en Supabase
type ClaseReal = {
  id: string;
  nombre_clase: string;
  codigo_acceso: string;
  descripcion?: string;
  materia?: string;
  profesor_id: string;
  color_tema?: string;
  portada_url?: string;
  fecha_creacion?: string;
};

type Anuncio = {
  id: string;
  clase_id: string;
  autor_id: string;
  contenido: string;
  archivo_adjunto_url: string | null;
  fecha_publicacion?: string;
  autor_nombre?: string;
};

export function ClassDetailScreen() {
  const router = useRouter();
  const { claseId } = useLocalSearchParams<{ claseId: string }>();
  const { user } = useAuth();
  const { crearTarea } = useTareas();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [clase, setClase] = useState<ClaseReal | null>(null);
  const [tareasPorClase, setTareasPorClase] = useState<any[]>([]);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [miembrosCount, setMiembrosCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [esProfesor, setEsProfesor] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [nuevoTituloTarea, setNuevoTituloTarea] = useState('');
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [nuevosPuntos, setNuevosPuntos] = useState('100');
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [creando, setCreando] = useState(false);

  const [tabActivo, setTabActivo] = useState<'tareas' | 'anuncios'>('tareas');
  const [nuevoAnuncio, setNuevoAnuncio] = useState('');
  const [enviandoAnuncio, setEnviandoAnuncio] = useState(false);

  useEffect(() => {
    if (claseId) {
      cargarClase();
    }
  }, [claseId]);

  const cargarClase = async () => {
    setLoading(true);
    try {
      // Cargamos directo desde Supabase para tener los campos reales
      const { data: claseData, error } = await supabase
        .from('clases')
        .select('*')
        .eq('id', claseId)
        .single();

      if (error || !claseData) throw new Error('Clase no encontrada');

      setClase(claseData as ClaseReal);
      setEsProfesor(claseData.profesor_id === user?.id);

      const { data: tareas } = await supabase
        .from('tareas')
        .select('*')
        .eq('clase_id', claseId);
      setTareasPorClase(tareas || []);

      const { data: inscritos } = await supabase
        .from('inscripciones')
        .select('id')
        .eq('clase_id', claseId);
      setMiembrosCount((inscritos || []).length);

      await cargarAnuncios();
    } catch (error) {
      console.error('Error cargando clase:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarAnuncios = async () => {
    try {
      const { data, error } = await supabase
        .from('anuncios')
        .select(`*, usuarios(nombre, apellido)`)
        .eq('clase_id', claseId)
        .order('fecha_publicacion', { ascending: false });

      if (error) throw error;

      const anunciosConNombre = (data || []).map((a: any) => ({
        ...a,
        autor_nombre: a.usuarios
          ? `${a.usuarios.nombre} ${a.usuarios.apellido}`
          : 'Usuario',
      }));

      setAnuncios(anunciosConNombre);
    } catch (error) {
      console.error('Error cargando anuncios:', error);
    }
  };

  const handleEliminarAnuncio = (anuncioId: string) => {
    Alert.alert(
      'Eliminar anuncio',
      '¿Estás seguro que deseas eliminar este anuncio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('anuncios')
              .delete()
              .eq('id', anuncioId);
            if (error) {
              Alert.alert('Error', 'No se pudo eliminar el anuncio');
            } else {
              await cargarAnuncios();
            }
          },
        },
      ]
    );
  };

  const handlePublicarAnuncio = async () => {
    if (!nuevoAnuncio.trim()) {
      Alert.alert('Error', 'Escribe algo antes de publicar');
      return;
    }
    setEnviandoAnuncio(true);
    try {
      const { error } = await supabase.from('anuncios').insert({
        clase_id: claseId,
        autor_id: user?.id,
        contenido: nuevoAnuncio.trim(),
      });
      if (error) throw error;
      setNuevoAnuncio('');
      await cargarAnuncios();
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setEnviandoAnuncio(false);
    }
  };

  const handleCrearTarea = async () => {
    if (!nuevoTituloTarea.trim()) {
      Alert.alert('Error', 'Ingresa el título de la tarea');
      return;
    }
    setCreando(true);
    try {
      await crearTarea(
        claseId,
        nuevoTituloTarea,
        nuevaDescripcion,
        parseInt(nuevosPuntos) || 100,
        nuevaFecha || new Date().toISOString()
      );
      setNuevoTituloTarea('');
      setNuevaDescripcion('');
      setNuevosPuntos('100');
      setNuevaFecha('');
      setModalVisible(false);
      await cargarClase();
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setCreando(false);
    }
  };

  const handleTareaPress = (tarea: any) => {
    router.push({
      pathname: '/task-detail',
      params: {
        tareaId: tarea.id,
        claseId: tarea.clase_id,
        esProfesor: esProfesor.toString(),
      },
    });
  };

  if (loading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  if (!clase) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText>Clase no encontrada</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: clase.color_tema ?? colors.tint }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={[styles.claseName, { color: '#fff' }]} type="title">
            {clase.nombre_clase}
          </ThemedText>
          <ThemedText style={[styles.classCode, { color: 'rgba(255,255,255,0.8)' }]}>
            Código: {clase.codigo_acceso}
          </ThemedText>
        </View>
      </View>

      {/* Info Bar */}
      <View style={[styles.infoBar, { backgroundColor: colors.tint + '10', borderBottomColor: colors.tint + '20' }]}>
        <View style={styles.infoItem}>
          <IconSymbol name="doc.text.fill" size={16} color={colors.tint} />
          <ThemedText style={styles.infoText}>{tareasPorClase.length} tareas</ThemedText>
        </View>
        <View style={styles.infoItem}>
          <IconSymbol name="person.2.fill" size={16} color={colors.tint} />
          <ThemedText style={styles.infoText}>{miembrosCount} miembros</ThemedText>
        </View>
        {clase.materia && (
          <View style={styles.infoItem}>
            <IconSymbol name="book.fill" size={16} color={colors.tint} />
            <ThemedText style={styles.infoText}>{clase.materia}</ThemedText>
          </View>
        )}
      </View>

      {/* Descripción */}
      {clase.descripcion ? (
        <View style={styles.descContainer}>
          <ThemedText style={styles.descTitle} type="defaultSemiBold">
            Descripción
          </ThemedText>
          <ThemedText style={styles.descText}>{clase.descripcion}</ThemedText>
        </View>
      ) : null}

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: colors.tint + '30' }]}>
        <TouchableOpacity
          style={[styles.tab, tabActivo === 'tareas' && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
          onPress={() => setTabActivo('tareas')}>
          <ThemedText style={[styles.tabText, tabActivo === 'tareas' && { color: colors.tint, fontWeight: 'bold' }]}>
            Tareas
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tabActivo === 'anuncios' && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
          onPress={() => setTabActivo('anuncios')}>
          <ThemedText style={[styles.tabText, tabActivo === 'anuncios' && { color: colors.tint, fontWeight: 'bold' }]}>
            Anuncios
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* ── TAB TAREAS ── */}
      {tabActivo === 'tareas' ? (
        <View style={styles.tabContent}>
          {esProfesor && (
            <TouchableOpacity
              style={[styles.createTaskBtn, { backgroundColor: colors.tint }]}
              onPress={() => setModalVisible(true)}>
              <IconSymbol name="plus.circle.fill" size={20} color="#fff" />
              <ThemedText style={styles.createTaskBtnText}>Crear Tarea</ThemedText>
            </TouchableOpacity>
          )}

          {tareasPorClase.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol name="doc.text" size={48} color={colors.tint + '40'} />
              <ThemedText style={styles.emptyText}>No hay tareas aún</ThemedText>
            </View>
          ) : (
            <FlatList
              data={tareasPorClase}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.taskCard, { borderColor: colors.tint + '30' }]}
                  onPress={() => handleTareaPress(item)}>
                  <View style={[styles.taskIcon, { backgroundColor: colors.tint + '20' }]}>
                    <IconSymbol name="doc.text.fill" size={20} color={colors.tint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.taskTitle} type="defaultSemiBold">
                      {item.titulo}
                    </ThemedText>
                    <ThemedText style={styles.taskDesc}>{item.descripcion}</ThemedText>
                    <View style={styles.taskMeta}>
                      <IconSymbol name="star.fill" size={12} color={colors.tint} />
                      <ThemedText style={styles.metaText}>{item.puntos_maximos} puntos</ThemedText>
                      <View style={styles.metaDot} />
                      <IconSymbol name="calendar" size={12} color={colors.text + '80'} />
                      <ThemedText style={styles.metaText}>
                        {new Date(item.fecha_entrega).toLocaleDateString()}
                      </ThemedText>
                    </View>
                  </View>
                  <IconSymbol name="chevron.right" size={20} color={colors.text + '60'} />
                </TouchableOpacity>
              )}
              scrollEnabled={true}
              nestedScrollEnabled={true}
            />
          )}
        </View>
      ) : (
        /* ── TAB ANUNCIOS ── */
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={80}>
          <FlatList
            data={anuncios}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.anunciosList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <IconSymbol name="megaphone" size={48} color={colors.tint + '40'} />
                <ThemedText style={styles.emptyText}>No hay anuncios aún</ThemedText>
              </View>
            }
            renderItem={({ item }) => {
              const esMio = item.autor_id === user?.id;
              const puedeEliminar = esProfesor || esMio;
              return (
                <View style={[styles.anuncioCard, { backgroundColor: colors.tint + '08', borderColor: colors.tint + '20' }]}>
                  <View style={styles.anuncioHeader}>
                    <View style={[styles.anuncioAvatar, { backgroundColor: colors.tint }]}>
                      <ThemedText style={styles.anuncioAvatarText}>
                        {(item.autor_nombre ?? 'U')[0].toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.anuncioAutor} type="defaultSemiBold">
                        {esMio ? `${item.autor_nombre} (Tú)` : item.autor_nombre ?? 'Usuario'}
                      </ThemedText>
                      {item.fecha_publicacion && (
                        <ThemedText style={styles.anuncioFecha}>
                          {new Date(item.fecha_publicacion).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </ThemedText>
                      )}
                    </View>
                    {puedeEliminar && (
                      <TouchableOpacity
                        onPress={() => handleEliminarAnuncio(item.id)}
                        style={styles.deleteBtn}>
                        <IconSymbol name="trash" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <ThemedText style={styles.anuncioContenido}>{item.contenido}</ThemedText>
                </View>
              );
            }}
          />

          {/* Input publicar anuncio */}
          <View style={[styles.inputAnuncioContainer, { borderTopColor: colors.tint + '20', backgroundColor: colors.background }]}>
            <TextInput
              style={[styles.inputAnuncio, { borderColor: colors.tint + '50', color: colors.text, backgroundColor: colors.tint + '08' }]}
              placeholder="Escribe un anuncio..."
              placeholderTextColor={colors.text + '60'}
              value={nuevoAnuncio}
              onChangeText={setNuevoAnuncio}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: nuevoAnuncio.trim() ? colors.tint : colors.tint + '40' }]}
              onPress={handlePublicarAnuncio}
              disabled={enviandoAnuncio || !nuevoAnuncio.trim()}>
              {enviandoAnuncio ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <IconSymbol name="paperplane.fill" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Modal crear tarea */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title">Crear Tarea</ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <ThemedText style={styles.label} type="defaultSemiBold">
                Título *
              </ThemedText>
              <TextInput
                style={[styles.input, { borderColor: colors.tint, color: colors.text }]}
                placeholder="Ej: Ejercicio de Algebra"
                placeholderTextColor={colors.text + '80'}
                value={nuevoTituloTarea}
                onChangeText={setNuevoTituloTarea}
              />

              <ThemedText style={styles.label} type="defaultSemiBold">
                Descripción
              </ThemedText>
              <TextInput
                style={[styles.input, { borderColor: colors.tint, color: colors.text, minHeight: 80 }]}
                placeholder="Detalles de la tarea..."
                placeholderTextColor={colors.text + '80'}
                value={nuevaDescripcion}
                onChangeText={setNuevaDescripcion}
                multiline
                textAlignVertical="top"
              />

              <ThemedText style={styles.label} type="defaultSemiBold">
                Puntos Máximos
              </ThemedText>
              <TextInput
                style={[styles.input, { borderColor: colors.tint, color: colors.text }]}
                placeholder="100"
                placeholderTextColor={colors.text + '80'}
                value={nuevosPuntos}
                onChangeText={setNuevosPuntos}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: colors.tint }]}
                onPress={handleCrearTarea}
                disabled={creando}>
                {creando ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.createBtnText}>Crear Tarea</ThemedText>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  claseName: { fontSize: 20, fontWeight: 'bold' },
  classCode: { fontSize: 12, marginTop: 4 },
  infoBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 8,
  },
  infoItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 12, fontWeight: '500' },
  descContainer: { paddingHorizontal: 20, marginBottom: 12 },
  descTitle: { marginBottom: 8 },
  descText: { fontSize: 14, opacity: 0.7, lineHeight: 20 },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabText: { fontSize: 14, opacity: 0.6 },
  tabContent: { flex: 1, paddingHorizontal: 16 },
  createTaskBtn: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  createTaskBtnText: { color: '#fff', fontWeight: 'bold' },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 12,
  },
  taskIcon: { width: 44, height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  taskTitle: { fontSize: 15, marginBottom: 4 },
  taskDesc: { fontSize: 13, opacity: 0.6, marginBottom: 6 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, opacity: 0.6 },
  metaDot: { width: 2, height: 2, borderRadius: 1, backgroundColor: 'rgba(0,0,0,0.2)', marginHorizontal: 4 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { marginTop: 12, opacity: 0.6 },
  anunciosList: { paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  anuncioCard: { borderWidth: 1, borderRadius: 12, padding: 14 },
  anuncioHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  anuncioAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  anuncioAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  anuncioAutor: { fontSize: 13 },
  anuncioFecha: { fontSize: 11, opacity: 0.5, marginTop: 1 },
  anuncioContenido: { fontSize: 14, lineHeight: 20 },
  deleteBtn: { padding: 6 },
  inputAnuncioContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  inputAnuncio: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', paddingTop: 20 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalForm: { paddingHorizontal: 20, paddingBottom: 30 },
  label: { marginTop: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  createBtn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 20, marginBottom: 20 },
  createBtnText: { color: '#fff', fontWeight: 'bold' },
});