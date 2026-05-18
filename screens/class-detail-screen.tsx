import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/context/auth-context';
import { useTareas } from '@/context/task-context';
import { LinearGradient } from 'expo-linear-gradient';
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
    if (claseId) cargarClase();
  }, [claseId]);

  const cargarClase = async () => {
    setLoading(true);
    try {
      const { data: claseData, error } = await supabase
        .from('clases').select('*').eq('id', claseId).single();
      if (error || !claseData) throw new Error('Clase no encontrada');
      setClase(claseData as ClaseReal);
      setEsProfesor(claseData.profesor_id === user?.id);
      const { data: tareas } = await supabase.from('tareas').select('*').eq('clase_id', claseId);
      setTareasPorClase(tareas || []);
      const { data: inscritos } = await supabase.from('inscripciones').select('id').eq('clase_id', claseId);
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
        .from('anuncios').select(`*, usuarios(nombre, apellido)`)
        .eq('clase_id', claseId).order('fecha_publicacion', { ascending: false });
      if (error) throw error;
      setAnuncios((data || []).map((a: any) => ({
        ...a,
        autor_nombre: a.usuarios ? `${a.usuarios.nombre} ${a.usuarios.apellido}` : 'Usuario',
      })));
    } catch (error) {
      console.error('Error cargando anuncios:', error);
    }
  };

  const handleEliminarAnuncio = (anuncioId: string) => {
    Alert.alert('Eliminar anuncio', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('anuncios').delete().eq('id', anuncioId);
          if (error) Alert.alert('Error', 'No se pudo eliminar');
          else await cargarAnuncios();
        },
      },
    ]);
  };

  const handlePublicarAnuncio = async () => {
    if (!nuevoAnuncio.trim()) { Alert.alert('Error', 'Escribe algo antes de publicar'); return; }
    setEnviandoAnuncio(true);
    try {
      const { error } = await supabase.from('anuncios').insert({
        clase_id: claseId, autor_id: user?.id, contenido: nuevoAnuncio.trim(),
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
    if (!nuevoTituloTarea.trim()) { Alert.alert('Error', 'Ingresa el título de la tarea'); return; }
    setCreando(true);
    try {
      await crearTarea(claseId, nuevoTituloTarea, nuevaDescripcion,
        parseInt(nuevosPuntos) || 100, nuevaFecha || new Date().toISOString());
      setNuevoTituloTarea(''); setNuevaDescripcion(''); setNuevosPuntos('100');
      setNuevaFecha(''); setModalVisible(false);
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
      params: { tareaId: tarea.id, claseId: tarea.clase_id, esProfesor: esProfesor.toString() },
    });
  };

  if (loading) {
    return (
      <LinearGradient colors={['#e0f7fa', '#f0fff4', '#e8f5fe']} style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#32a4b8" />
      </LinearGradient>
    );
  }

  if (!clase) {
    return (
      <LinearGradient colors={['#e0f7fa', '#f0fff4', '#e8f5fe']} style={styles.centerContainer}>
        <ThemedText>Clase no encontrada</ThemedText>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#e0f7fa', '#f0fff4', '#e8f5fe']} style={{ flex: 1 }}>
      {/* Header con gradiente */}
      <LinearGradient
        colors={['#32c4d8', '#32e880']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.claseName}>{clase.nombre_clase}</ThemedText>
          <ThemedText style={styles.classCode}>Código: {clase.codigo_acceso}</ThemedText>
        </View>
      </LinearGradient>

      {/* Info Bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <IconSymbol name="doc.text.fill" size={15} color="#32a4b8" />
          <ThemedText style={styles.infoText}>{tareasPorClase.length} tareas</ThemedText>
        </View>
        <View style={styles.infoItem}>
          <IconSymbol name="person.2.fill" size={15} color="#32a4b8" />
          <ThemedText style={styles.infoText}>{miembrosCount} miembros</ThemedText>
        </View>
        {clase.materia && (
          <View style={styles.infoItem}>
            <IconSymbol name="book.fill" size={15} color="#32a4b8" />
            <ThemedText style={styles.infoText}>{clase.materia}</ThemedText>
          </View>
        )}
      </View>

      {/* Descripción */}
      {clase.descripcion ? (
        <View style={styles.descContainer}>
          <ThemedText style={styles.descTitle}>Descripción</ThemedText>
          <ThemedText style={styles.descText}>{clase.descripcion}</ThemedText>
        </View>
      ) : null}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, tabActivo === 'tareas' && styles.tabActive]}
          onPress={() => setTabActivo('tareas')}>
          <ThemedText style={[styles.tabText, tabActivo === 'tareas' && styles.tabTextActive]}>
            Tareas
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tabActivo === 'anuncios' && styles.tabActive]}
          onPress={() => setTabActivo('anuncios')}>
          <ThemedText style={[styles.tabText, tabActivo === 'anuncios' && styles.tabTextActive]}>
            Anuncios
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Tab Tareas */}
      {tabActivo === 'tareas' ? (
        <View style={styles.tabContent}>
          {esProfesor && (
            <LinearGradient
              colors={['#32c4d8', '#32e880']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.createTaskGradient}>
              <TouchableOpacity style={styles.createTaskBtn} onPress={() => setModalVisible(true)}>
                <IconSymbol name="plus.circle.fill" size={18} color="#fff" />
                <ThemedText style={styles.createTaskBtnText}>Crear Tarea</ThemedText>
              </TouchableOpacity>
            </LinearGradient>
          )}

          {tareasPorClase.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol name="doc.text" size={48} color="#32a4b840" />
              <ThemedText style={styles.emptyText}>No hay tareas aún</ThemedText>
            </View>
          ) : (
            <FlatList
              data={tareasPorClase}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.taskCard} onPress={() => handleTareaPress(item)}>
                  <View style={styles.taskIcon}>
                    <IconSymbol name="doc.text.fill" size={20} color="#32a4b8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.taskTitle}>{item.titulo}</ThemedText>
                    <ThemedText style={styles.taskDesc}>{item.descripcion}</ThemedText>
                    <View style={styles.taskMeta}>
                      <IconSymbol name="star.fill" size={12} color="#32a4b8" />
                      <ThemedText style={styles.metaText}>{item.puntos_maximos} pts</ThemedText>
                      <View style={styles.metaDot} />
                      <IconSymbol name="calendar" size={12} color="#7a9aaa" />
                      <ThemedText style={styles.metaText}>
                        {new Date(item.fecha_entrega).toLocaleDateString()}
                      </ThemedText>
                    </View>
                  </View>
                  <IconSymbol name="chevron.right" size={18} color="#32a4b8" />
                </TouchableOpacity>
              )}
              scrollEnabled nestedScrollEnabled
            />
          )}
        </View>
      ) : (
        /* Tab Anuncios */
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
                <IconSymbol name="megaphone" size={48} color="#32a4b840" />
                <ThemedText style={styles.emptyText}>No hay anuncios aún</ThemedText>
              </View>
            }
            renderItem={({ item }) => {
              const esMio = item.autor_id === user?.id;
              const puedeEliminar = esProfesor || esMio;
              return (
                <View style={styles.anuncioCard}>
                  <View style={styles.anuncioHeader}>
                    <LinearGradient
                      colors={['#32c4b8', '#32e880']}
                      style={styles.anuncioAvatar}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <ThemedText style={styles.anuncioAvatarText}>
                        {(item.autor_nombre ?? 'U')[0].toUpperCase()}
                      </ThemedText>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.anuncioAutor}>
                        {esMio ? `${item.autor_nombre} (Tú)` : item.autor_nombre ?? 'Usuario'}
                      </ThemedText>
                      {item.fecha_publicacion && (
                        <ThemedText style={styles.anuncioFecha}>
                          {new Date(item.fecha_publicacion).toLocaleDateString('es-MX', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </ThemedText>
                      )}
                    </View>
                    {puedeEliminar && (
                      <TouchableOpacity onPress={() => handleEliminarAnuncio(item.id)} style={styles.deleteBtn}>
                        <IconSymbol name="trash" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <ThemedText style={styles.anuncioContenido}>{item.contenido}</ThemedText>
                </View>
              );
            }}
          />

          <View style={styles.inputAnuncioContainer}>
            <TextInput
              style={styles.inputAnuncio}
              placeholder="Escribe un anuncio..."
              placeholderTextColor="#aac0cc"
              value={nuevoAnuncio}
              onChangeText={setNuevoAnuncio}
              multiline
            />
            <LinearGradient
              colors={nuevoAnuncio.trim() ? ['#32c4d8', '#32e880'] : ['#d0eaf2', '#d0eaf2']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.sendBtnGradient}>
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={handlePublicarAnuncio}
                disabled={enviandoAnuncio || !nuevoAnuncio.trim()}>
                {enviandoAnuncio
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <IconSymbol name="paperplane.fill" size={18} color="#fff" />}
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Modal crear tarea */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#32c4d8', '#32e880']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Crear Tarea</ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <IconSymbol name="xmark" size={22} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalForm}>
              <ThemedText style={styles.label}>Título *</ThemedText>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Ejercicio de Álgebra"
                  placeholderTextColor="#aac0cc"
                  value={nuevoTituloTarea}
                  onChangeText={setNuevoTituloTarea}
                />
              </View>

              <ThemedText style={styles.label}>Descripción</ThemedText>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, { minHeight: 80 }]}
                  placeholder="Detalles de la tarea..."
                  placeholderTextColor="#aac0cc"
                  value={nuevaDescripcion}
                  onChangeText={setNuevaDescripcion}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <ThemedText style={styles.label}>Puntos Máximos</ThemedText>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="100"
                  placeholderTextColor="#aac0cc"
                  value={nuevosPuntos}
                  onChangeText={setNuevosPuntos}
                  keyboardType="numeric"
                />
              </View>

              <LinearGradient
                colors={['#32c4d8', '#32e880']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.createBtnGradient}>
                <TouchableOpacity style={styles.createBtn} onPress={handleCrearTarea} disabled={creando}>
                  {creando
                    ? <ActivityIndicator color="#fff" />
                    : <ThemedText style={styles.createBtnText}>Crear Tarea</ThemedText>}
                </TouchableOpacity>
              </LinearGradient>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 20, gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  claseName: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  classCode: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  // Info Bar
  infoBar: {
    flexDirection: 'row', marginHorizontal: 16, marginVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1.5, borderColor: '#d0eaf2',
  },
  infoItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 12, fontWeight: '500', color: '#1a3a4a' },

  // Desc
  descContainer: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14,
    padding: 14, borderWidth: 1.5, borderColor: '#d0eaf2',
  },
  descTitle: { fontSize: 13, fontWeight: '600', color: '#32a4b8', marginBottom: 6 },
  descText: { fontSize: 14, color: '#1a3a4a', lineHeight: 20 },

  // Tabs
  tabsContainer: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#d0eaf2', overflow: 'hidden',
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 11 },
  tabActive: { backgroundColor: 'rgba(50,164,184,0.15)' },
  tabText: { fontSize: 14, color: '#7a9aaa' },
  tabTextActive: { color: '#32a4b8', fontWeight: '700' },
  tabContent: { flex: 1, paddingHorizontal: 16 },

  // Crear tarea btn
  createTaskGradient: { borderRadius: 12, marginBottom: 12 },
  createTaskBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, paddingVertical: 13,
  },
  createTaskBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  // Task card
  taskCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 16, borderWidth: 1.5, borderColor: '#d0eaf2',
    paddingHorizontal: 14, paddingVertical: 14, marginBottom: 12, gap: 12,
    shadowColor: '#32c4b8', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  taskIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#e0f7fa', justifyContent: 'center', alignItems: 'center',
  },
  taskTitle: { fontSize: 15, fontWeight: '600', color: '#1a3a4a', marginBottom: 4 },
  taskDesc: { fontSize: 13, color: '#7a9aaa', marginBottom: 6 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: '#7a9aaa' },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#d0eaf2', marginHorizontal: 4 },

  // Empty
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { marginTop: 12, color: '#7a9aaa', fontSize: 15 },

  // Anuncios
  anunciosList: { paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  anuncioCard: {
    backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 16,
    borderWidth: 1.5, borderColor: '#d0eaf2', padding: 14,
    shadowColor: '#32c4b8', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  anuncioHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  anuncioAvatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  anuncioAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  anuncioAutor: { fontSize: 13, fontWeight: '600', color: '#1a3a4a' },
  anuncioFecha: { fontSize: 11, color: '#7a9aaa', marginTop: 1 },
  anuncioContenido: { fontSize: 14, color: '#1a3a4a', lineHeight: 20 },
  deleteBtn: { padding: 6 },

  // Input anuncio
  inputAnuncioContainer: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#d0eaf2',
    backgroundColor: 'rgba(255,255,255,0.9)', gap: 8,
  },
  inputAnuncio: {
    flex: 1, backgroundColor: '#f0f8fb',
    borderWidth: 1.5, borderColor: '#d0eaf2', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    fontSize: 14, color: '#1a3a4a', maxHeight: 100,
  },
  sendBtnGradient: { width: 42, height: 42, borderRadius: 21 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },

  // Modal
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%', overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18,
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalForm: { paddingHorizontal: 20, paddingBottom: 30 },
  label: { color: '#7a9aaa', fontSize: 11, letterSpacing: 0.8, marginTop: 16, marginBottom: 8 },
  inputWrapper: {
    backgroundColor: '#f0f8fb', borderWidth: 1.5, borderColor: '#d0eaf2', borderRadius: 12,
  },
  input: { paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1a3a4a' },
  createBtnGradient: { borderRadius: 14, marginTop: 24, marginBottom: 20 },
  createBtn: { height: 52, justifyContent: 'center', alignItems: 'center' },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});