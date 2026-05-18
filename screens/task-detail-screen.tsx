import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/context/auth-context';
import { Comentario, Entrega, Tarea, useTareas } from '@/context/task-context';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export function TaskDetailScreen() {
  const router = useRouter();
  const { tareaId, claseId, esProfesor: esProfesorParam } = useLocalSearchParams<{
    tareaId: string; claseId: string; esProfesor: string;
  }>();

  const { user } = useAuth();
  const { tareas, entregarTarea, obtenerEntrega, calificarEntrega, anularEntrega, eliminarArchivo, agregarComentario, obtenerComentarios } = useTareas();

  const esProfesor = esProfesorParam === 'true';
  const [tarea, setTarea] = useState<Tarea | null>(null);
  const [entrega, setEntrega] = useState<Entrega | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [calificando, setCalificando] = useState(false);
  const [mostrarCalificar, setMostrarCalificar] = useState(false);
  const [mostrarComentario, setMostrarComentario] = useState(false);
  const [calificacion, setCalificacion] = useState('');
  const [nuevoComentario, setNuevoComentario] = useState('');

  useEffect(() => { if (tareaId) cargarDatos(); }, [tareaId]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const tareaEncontrada = tareas.find((t) => t.id === tareaId);
      if (tareaEncontrada) {
        setTarea(tareaEncontrada);
        if (!esProfesor && user) {
          const entregaCargada = await obtenerEntrega(tareaId, user.id);
          if (entregaCargada) {
            setEntrega(entregaCargada);
            const comentariosCargados = await obtenerComentarios(entregaCargada.id);
            setComentarios(comentariosCargados);
          }
        }
      }
    } catch (error) {
      console.error('Error cargando tarea:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarEntrega = async () => {
    if (!entrega || entrega.estado !== null) return;
    setEntrega((prev) => (prev ? { ...prev, estado: 'entregado' } as Entrega : prev));
    try {
      await entregarTarea(tareaId, user!.id, entrega.archivo_url || '', entrega.nombre_archivo || '');
      Alert.alert('Éxito', '¡Tu tarea ha sido entregada!');
      await cargarDatos();
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setEntrega(null);
    }
  };

  const handleSeleccionarArchivo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled && result.assets?.length > 0) {
        const archivo = result.assets[0];
        setSubiendo(true);
        try {
          await entregarTarea(tareaId, user!.id, archivo.uri, archivo.name);
          Alert.alert('Éxito', 'Archivo subido correctamente');
          await cargarDatos();
        } catch (error) {
          Alert.alert('Error', (error as Error).message);
        } finally {
          setSubiendo(false);
        }
      }
    } catch (error) {
      console.error('Error seleccionando archivo:', error);
    }
  };

  const handleAnularEntrega = () => {
    Alert.alert('Anular entrega', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Anular', style: 'destructive', onPress: async () => {
        try {
          await anularEntrega(tareaId, user!.id);
          Alert.alert('Éxito', 'Entrega anulada');
          await cargarDatos();
        } catch (error) { Alert.alert('Error', (error as Error).message); }
      }},
    ]);
  };

  const handleEliminarArchivo = () => {
    Alert.alert('Eliminar archivo', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          await eliminarArchivo(tareaId, user!.id);
          Alert.alert('Éxito', 'Archivo eliminado');
          await cargarDatos();
        } catch (error) { Alert.alert('Error', (error as Error).message); }
      }},
    ]);
  };

  const handleCalificar = async () => {
    if (!calificacion.trim()) { Alert.alert('Error', 'Ingresa la calificación'); return; }
    setCalificando(true);
    try {
      await calificarEntrega(entrega!.id, parseFloat(calificacion), nuevoComentario);
      Alert.alert('Éxito', 'Tarea calificada correctamente');
      setCalificacion(''); setNuevoComentario(''); setMostrarCalificar(false);
      await cargarDatos();
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally { setCalificando(false); }
  };

  const handleAgregarComentario = async () => {
    if (!nuevoComentario.trim()) { Alert.alert('Error', 'Escribe un comentario'); return; }
    try {
      await agregarComentario(entrega!.id, user!.id, `${user?.nombre} ${user?.apellido}`, nuevoComentario);
      Alert.alert('Éxito', 'Comentario agregado');
      setNuevoComentario(''); setMostrarComentario(false);
      await cargarDatos();
    } catch (error) { Alert.alert('Error', (error as Error).message); }
  };

  const getEstadoColor = (estado: string | null) => {
    if (estado === 'entregado') return '#10B981';
    if (estado === 'calificado') return '#3B82F6';
    return '#F97316';
  };

  const getEstadoIcon = (estado: string | null) => {
    if (estado === 'entregado') return 'checkmark.circle.fill';
    if (estado === 'calificado') return 'star.fill';
    return 'clock.fill';
  };

  const getEstadoLabel = (estado: string | null) => {
    if (estado === 'entregado') return 'Entregado';
    if (estado === 'calificado') return 'Calificado';
    return 'Pendiente';
  };

  if (loading) {
    return (
      <LinearGradient colors={['#e0f7fa', '#f0fff4', '#e8f5fe']} style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#32a4b8" />
      </LinearGradient>
    );
  }

  if (!tarea) {
    return (
      <LinearGradient colors={['#e0f7fa', '#f0fff4', '#e8f5fe']} style={styles.centerContainer}>
        <ThemedText>Tarea no encontrada</ThemedText>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#e0f7fa', '#f0fff4', '#e8f5fe']} style={{ flex: 1 }}>
      <LinearGradient
        colors={['#32c4d8', '#32e880']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>{tarea.titulo}</ThemedText>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <IconSymbol name="star.fill" size={18} color="#32a4b8" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.infoLabel}>Puntos máximos</ThemedText>
              <ThemedText style={styles.infoValue}>{tarea.puntos_maximos}</ThemedText>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <IconSymbol name="calendar" size={18} color="#32a4b8" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.infoLabel}>Fecha de entrega</ThemedText>
              <ThemedText style={styles.infoValue}>
                {new Date(tarea.fecha_entrega).toLocaleDateString()}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Descripción</ThemedText>
          <ThemedText style={styles.description}>
            {tarea.descripcion || 'Sin descripción adicional'}
          </ThemedText>
        </View>

        {!esProfesor && (
          <>
            {entrega && (
              <View style={[styles.statusCard, {
                backgroundColor: getEstadoColor(entrega.estado) + '20',
                borderColor: getEstadoColor(entrega.estado),
              }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <IconSymbol
                    name={getEstadoIcon(entrega.estado)}
                    size={22} color={getEstadoColor(entrega.estado)} />
                  <View>
                    <ThemedText style={[styles.estadoLabel, { color: getEstadoColor(entrega.estado) }]}>
                      {getEstadoLabel(entrega.estado)}
                    </ThemedText>
                    {entrega.fecha_entrega && (
                      <ThemedText style={styles.statusDate}>
                        {new Date(entrega.fecha_entrega).toLocaleDateString()}
                      </ThemedText>
                    )}
                  </View>
                </View>
                {entrega.calificacion && (
                  <View style={[styles.gradeContainer, { backgroundColor: getEstadoColor(entrega.estado) + '30' }]}>
                    <ThemedText style={[styles.grade, { color: getEstadoColor(entrega.estado) }]}>
                      {entrega.calificacion}/{tarea.puntos_maximos}
                    </ThemedText>
                  </View>
                )}
              </View>
            )}

            <View style={styles.actionsContainer}>
              {!entrega || entrega.estado === 'pendiente' ? (
                <LinearGradient
                  colors={['#32c4d8', '#32e880']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.actionGradient}>
                  <TouchableOpacity style={styles.actionBtn} onPress={handleSeleccionarArchivo} disabled={subiendo}>
                    <IconSymbol name="doc.badge.plus" size={18} color="#fff" />
                    <ThemedText style={styles.actionBtnText}>{subiendo ? 'Subiendo...' : 'Subir Archivo'}</ThemedText>
                  </TouchableOpacity>
                </LinearGradient>
              ) : (
                <View style={{ gap: 10 }}>
                  <LinearGradient
                    colors={['#32c4d8', '#32e880']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.actionGradient}>
                    <TouchableOpacity style={styles.actionBtn} onPress={handleSeleccionarArchivo} disabled={subiendo}>
                      <IconSymbol name="arrow.clockwise" size={18} color="#fff" />
                      <ThemedText style={styles.actionBtnText}>Resubir</ThemedText>
                    </TouchableOpacity>
                  </LinearGradient>
                  <TouchableOpacity style={styles.actionBtnOutline} onPress={handleAnularEntrega}>
                    <IconSymbol name="xmark.circle" size={18} color="#EF4444" />
                    <ThemedText style={[styles.actionBtnText, { color: '#EF4444' }]}>Anular entrega</ThemedText>
                  </TouchableOpacity>
                </View>
              )}

              {entrega?.nombre_archivo && (
                <View style={styles.fileCard}>
                  <View style={styles.fileIconBox}>
                    <IconSymbol name="doc.fill" size={22} color="#32a4b8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.fileName}>{entrega.nombre_archivo}</ThemedText>
                    {entrega.fecha_entrega && (
                      <ThemedText style={styles.fileDate}>
                        {new Date(entrega.fecha_entrega).toLocaleDateString()}
                      </ThemedText>
                    )}
                  </View>
                  <TouchableOpacity onPress={handleEliminarArchivo}>
                    <IconSymbol name="trash" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {entrega && (
              <View style={styles.commentsSection}>
                <ThemedText style={styles.sectionTitle}>Comentarios</ThemedText>

                {entrega.comentarios_profesor && (
                  <View style={styles.commentCardProfe}>
                    <LinearGradient
                      colors={['#32c4b8', '#32e880']}
                      style={styles.commentAvatar}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <IconSymbol name="person.fill" size={14} color="#fff" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.commentAuthor}>Profesor</ThemedText>
                      <ThemedText style={styles.commentText}>{entrega.comentarios_profesor}</ThemedText>
                    </View>
                  </View>
                )}

                <TouchableOpacity style={styles.addCommentBtn} onPress={() => setMostrarComentario(true)}>
                  <IconSymbol name="plus.circle" size={18} color="#32a4b8" />
                  <ThemedText style={{ color: '#32a4b8', fontWeight: '600', fontSize: 14 }}>
                    Agregar comentario
                  </ThemedText>
                </TouchableOpacity>

                {comentarios.map((c) => (
                  <View key={c.id} style={styles.commentCard}>
                    <View style={[styles.commentAvatar, { backgroundColor: '#d0eaf2' }]}>
                      <ThemedText style={{ fontSize: 13, fontWeight: 'bold', color: '#32a4b8' }}>
                        {c.autor_nombre[0]}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.commentAuthor}>{c.autor_nombre}</ThemedText>
                      <ThemedText style={styles.commentText}>{c.contenido}</ThemedText>
                      <ThemedText style={styles.commentDate}>
                        {new Date(c.fecha_creacion).toLocaleDateString()}
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {esProfesor && (
          <View style={styles.teacherSection}>
            <ThemedText style={styles.sectionTitle}>Entregas de Estudiantes</ThemedText>
            <LinearGradient
              colors={['#32c4d8', '#32e880']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.actionGradient}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setMostrarCalificar(true)}>
                <IconSymbol name="pencil.circle" size={18} color="#fff" />
                <ThemedText style={styles.actionBtnText}>Ver Entregas</ThemedText>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}
      </ScrollView>

      <Modal visible={mostrarComentario} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#32c4d8', '#32e880']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Nuevo Comentario</ThemedText>
              <TouchableOpacity onPress={() => setMostrarComentario(false)}>
                <IconSymbol name="xmark" size={22} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            <View style={{ padding: 20 }}>
              <View style={styles.modalInputWrapper}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Escribe tu comentario..."
                  placeholderTextColor="#aac0cc"
                  value={nuevoComentario}
                  onChangeText={setNuevoComentario}
                  multiline textAlignVertical="top"
                />
              </View>
              <LinearGradient
                colors={['#32c4d8', '#32e880']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.submitGradient}>
                <TouchableOpacity style={styles.submitBtn} onPress={handleAgregarComentario}>
                  <ThemedText style={styles.submitBtnText}>Enviar</ThemedText>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={mostrarCalificar} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#32c4d8', '#32e880']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Calificar Tarea</ThemedText>
              <TouchableOpacity onPress={() => setMostrarCalificar(false)}>
                <IconSymbol name="xmark" size={22} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            <View style={{ padding: 20 }}>
              <ThemedText style={styles.modalLabel}>Calificación</ThemedText>
              <View style={styles.modalInputWrapper}>
                <TextInput
                  style={[styles.modalInput, { minHeight: 0, paddingVertical: 12 }]}
                  placeholder="Ej: 95"
                  placeholderTextColor="#aac0cc"
                  value={calificacion}
                  onChangeText={setCalificacion}
                  keyboardType="decimal-pad"
                />
              </View>
              <ThemedText style={[styles.modalLabel, { marginTop: 12 }]}>Comentario</ThemedText>
              <View style={styles.modalInputWrapper}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Comentario del profesor..."
                  placeholderTextColor="#aac0cc"
                  value={nuevoComentario}
                  onChangeText={setNuevoComentario}
                  multiline textAlignVertical="top"
                />
              </View>
              <LinearGradient
                colors={['#32c4d8', '#32e880']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.submitGradient}>
                <TouchableOpacity style={styles.submitBtn} onPress={handleCalificar} disabled={calificando}>
                  {calificando
                    ? <ActivityIndicator color="#fff" />
                    : <ThemedText style={styles.submitBtnText}>Calificar</ThemedText>}
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 20, gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#fff' },

  scrollContent: { padding: 16, paddingBottom: 36 },

  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 16,
    borderWidth: 1.5, borderColor: '#d0eaf2', padding: 16, marginBottom: 16,
    shadowColor: '#32c4b8', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#e0f7fa', justifyContent: 'center', alignItems: 'center',
  },
  infoLabel: { fontSize: 11, color: '#7a9aaa', letterSpacing: 0.5 },
  infoValue: { fontSize: 16, fontWeight: '600', color: '#1a3a4a', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#d0eaf2', marginVertical: 12 },

  section: {
    backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 16,
    borderWidth: 1.5, borderColor: '#d0eaf2', padding: 16, marginBottom: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#32a4b8', marginBottom: 10 },
  description: { fontSize: 14, lineHeight: 22, color: '#1a3a4a' },

  statusCard: {
    borderWidth: 1.5, borderRadius: 16, padding: 16, marginBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  estadoLabel: { fontSize: 15, fontWeight: '700' },
  statusDate: { fontSize: 11, color: '#7a9aaa', marginTop: 2 },
  gradeContainer: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 },
  grade: { fontSize: 15, fontWeight: '700' },

  actionsContainer: { marginBottom: 16, gap: 10 },
  actionGradient: { borderRadius: 14 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, paddingVertical: 14,
  },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  actionBtnOutline: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#EF4444', backgroundColor: '#FEF2F2',
  },

  fileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#d0eaf2', padding: 14,
  },
  fileIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#e0f7fa', justifyContent: 'center', alignItems: 'center',
  },
  fileName: { fontSize: 14, fontWeight: '600', color: '#1a3a4a' },
  fileDate: { fontSize: 11, color: '#7a9aaa', marginTop: 2 },

  commentsSection: { marginTop: 4 },
  commentCardProfe: {
    flexDirection: 'row', gap: 10,
    backgroundColor: '#e0f7fa', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#b0dcea', padding: 14, marginBottom: 10,
  },
  commentCard: {
    flexDirection: 'row', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#d0eaf2', padding: 14, marginBottom: 10,
  },
  commentAvatar: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center',
  },
  commentAuthor: { fontSize: 13, fontWeight: '600', color: '#1a3a4a' },
  commentText: { fontSize: 13, lineHeight: 18, color: '#1a3a4a', marginTop: 4 },
  commentDate: { fontSize: 11, color: '#7a9aaa', marginTop: 4 },
  addCommentBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: '#32a4b8', backgroundColor: 'rgba(50,164,184,0.08)',
  },

  teacherSection: { marginTop: 4 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18,
  },
  modalTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  modalLabel: { color: '#7a9aaa', fontSize: 11, letterSpacing: 0.8, marginBottom: 8 },
  modalInputWrapper: {
    backgroundColor: '#f0f8fb', borderWidth: 1.5,
    borderColor: '#d0eaf2', borderRadius: 12, marginBottom: 8,
  },
  modalInput: {
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: '#1a3a4a', minHeight: 90,
  },
  submitGradient: { borderRadius: 14, marginTop: 16 },
  submitBtn: { height: 52, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});