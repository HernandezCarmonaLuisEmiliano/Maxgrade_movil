import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { Comentario, Entrega, Tarea, useTareas } from '@/context/task-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as DocumentPicker from 'expo-document-picker';
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
    View
} from 'react-native';

export function TaskDetailScreen() {
  const router = useRouter();
  const { tareaId, claseId, esProfesor: esProfesorParam } = useLocalSearchParams<{
    tareaId: string;
    claseId: string;
    esProfesor: string;
  }>();
  
  const { user } = useAuth();
  const { tareas, entregarTarea, obtenerEntrega, calificarEntrega, anularEntrega, eliminarArchivo, agregarComentario, obtenerComentarios } = useTareas();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

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

  useEffect(() => {
    if (tareaId) {
      cargarDatos();
    }
  }, [tareaId]);

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

  const handleSeleccionarArchivo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });

      if (!result.canceled && result.assets && result.assets.length > 0) {
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
    Alert.alert('Anular entrega', '¿Estás seguro de que deseas anular tu entrega?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Anular',
        style: 'destructive',
        onPress: async () => {
          try {
            await anularEntrega(tareaId, user!.id);
            Alert.alert('Éxito', 'Entrega anulada');
            await cargarDatos();
          } catch (error) {
            Alert.alert('Error', (error as Error).message);
          }
        },
      },
    ]);
  };

  const handleEliminarArchivo = () => {
    Alert.alert('Eliminar archivo', '¿Estás seguro de que deseas eliminar el archivo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await eliminarArchivo(tareaId, user!.id);
            Alert.alert('Éxito', 'Archivo eliminado');
            await cargarDatos();
          } catch (error) {
            Alert.alert('Error', (error as Error).message);
          }
        },
      },
    ]);
  };

  const handleCalificar = async () => {
    if (!calificacion.trim()) {
      Alert.alert('Error', 'Ingresa la calificación');
      return;
    }

    setCalificando(true);
    try {
      await calificarEntrega(entrega!.id, parseFloat(calificacion), nuevoComentario);
      Alert.alert('Éxito', 'Tarea calificada correctamente');
      setCalificacion('');
      setNuevoComentario('');
      setMostrarCalificar(false);
      await cargarDatos();
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setCalificando(false);
    }
  };

  const handleAgregarComentario = async () => {
    if (!nuevoComentario.trim()) {
      Alert.alert('Error', 'Escribe un comentario');
      return;
    }

    try {
      await agregarComentario(entrega!.id, user!.id, `${user?.nombre} ${user?.apellido}`, nuevoComentario);
      Alert.alert('Éxito', 'Comentario agregado');
      setNuevoComentario('');
      setMostrarComentario(false);
      await cargarDatos();
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  if (!tarea) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText>Tarea no encontrada</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.tint }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: '#fff' }]} type="title">
          {tarea.titulo}
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.tint + '10', borderColor: colors.tint + '30' }]}>
          <View style={styles.infoRow}>
            <IconSymbol name="star.fill" size={18} color={colors.tint} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.infoLabel}>Puntos máximos</ThemedText>
              <ThemedText style={styles.infoValue} type="defaultSemiBold">
                {tarea.puntos_maximos}
              </ThemedText>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.text + '15' }]} />

          <View style={styles.infoRow}>
            <IconSymbol name="calendar" size={18} color={colors.tint} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.infoLabel}>Fecha de entrega</ThemedText>
              <ThemedText style={styles.infoValue} type="defaultSemiBold">
                {new Date(tarea.fecha_entrega).toLocaleDateString()}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Descripción */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="subtitle">
            Descripción
          </ThemedText>
          <ThemedText style={styles.description}>{tarea.descripcion || 'Sin descripción adicional'}</ThemedText>
        </View>

        {/* ALUMNO VIEW */}
        {!esProfesor && (
          <>
            {/* Estado de Entrega */}
            {entrega && (
              <View
                style={[
                  styles.statusCard,
                  {
                    backgroundColor:
                      entrega.estado === 'entregado'
                        ? '#10B98140'
                        : entrega.estado === 'calificado'
                        ? '#3B82F640'
                        : '#FCA5A540',
                    borderColor:
                      entrega.estado === 'entregado'
                        ? '#10B981'
                        : entrega.estado === 'calificado'
                        ? '#3B82F6'
                        : '#F97316',
                  },
                ]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <IconSymbol
                    name={
                      entrega.estado === 'entregado'
                        ? 'checkmark.circle.fill'
                        : entrega.estado === 'calificado'
                        ? 'star.fill'
                        : 'clock.fill'
                    }
                    size={20}
                    color={
                      entrega.estado === 'entregado'
                        ? '#10B981'
                        : entrega.estado === 'calificado'
                        ? '#3B82F6'
                        : '#F97316'
                    }
                  />
                  <View>
                    <ThemedText
                      type="defaultSemiBold"
                      style={{
                        color:
                          entrega.estado === 'entregado'
                            ? '#10B981'
                            : entrega.estado === 'calificado'
                            ? '#3B82F6'
                            : '#F97316',
                      }}>
                      {entrega.estado === 'entregado'
                        ? 'Entregado'
                        : entrega.estado === 'calificado'
                        ? 'Calificado'
                        : 'Pendiente'}
                    </ThemedText>
                    {entrega.fecha_entrega && (
                      <ThemedText style={styles.statusDate}>
                        {new Date(entrega.fecha_entrega).toLocaleDateString()}
                      </ThemedText>
                    )}
                  </View>
                </View>

                {entrega.calificacion && (
                  <View style={styles.gradeContainer}>
                    <ThemedText type="defaultSemiBold" style={styles.grade}>
                      {entrega.calificacion}/{tarea.puntos_maximos}
                    </ThemedText>
                  </View>
                )}
              </View>
            )}

            {/* Acciones Alumno */}
            <View style={styles.actionsContainer}>
              {!entrega || entrega.estado === 'pendiente' ? (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.tint }]} onPress={handleSeleccionarArchivo} disabled={subiendo}>
                  <IconSymbol name="doc.badge.plus" size={18} color="#fff" />
                  <ThemedText style={styles.actionBtnText}>{subiendo ? 'Subiendo...' : 'Subir Archivo'}</ThemedText>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.tint }]} onPress={handleSeleccionarArchivo} disabled={subiendo}>
                    <IconSymbol name="arrow.clockwise" size={18} color="#fff" />
                    <ThemedText style={styles.actionBtnText}>Resubir</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#EF444440' }]}
                    onPress={handleAnularEntrega}>
                    <IconSymbol name="xmark.circle" size={18} color="#EF4444" />
                    <ThemedText style={[styles.actionBtnText, { color: '#EF4444' }]}>Anular</ThemedText>
                  </TouchableOpacity>
                </>
              )}

              {entrega?.nombre_archivo && (
                <View style={[styles.fileCard, { backgroundColor: colors.text + '08', borderColor: colors.tint }]}>
                  <IconSymbol name="doc.fill" size={24} color={colors.tint} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.fileName} type="defaultSemiBold">
                      {entrega.nombre_archivo}
                    </ThemedText>
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

            {/* Comentarios */}
            {entrega && (
              <View style={styles.commentsSection}>
                <ThemedText style={styles.sectionTitle} type="subtitle">
                  Comentarios
                </ThemedText>

                {entrega.comentarios_profesor && (
                  <View style={[styles.commentCard, { backgroundColor: colors.tint + '10', borderColor: colors.tint }]}>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                      <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
                        <IconSymbol name="person.fill" size={16} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="defaultSemiBold">Profesor</ThemedText>
                        <ThemedText style={styles.commentText}>{entrega.comentarios_profesor}</ThemedText>
                      </View>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.commentBtn, { backgroundColor: colors.tint + '20', borderColor: colors.tint }]}
                  onPress={() => setMostrarComentario(true)}>
                  <IconSymbol name="plus.circle" size={18} color={colors.tint} />
                  <ThemedText style={{ color: colors.tint }}>Agregar comentario</ThemedText>
                </TouchableOpacity>

                {comentarios.map((c) => (
                  <View key={c.id} style={[styles.commentCard, { backgroundColor: colors.text + '08' }]}>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                      <View style={[styles.avatar, { backgroundColor: colors.text + '30' }]}>
                        <ThemedText style={{ fontSize: 10 }}>{c.autor_nombre[0]}</ThemedText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="defaultSemiBold">{c.autor_nombre}</ThemedText>
                        <ThemedText style={styles.commentText}>{c.contenido}</ThemedText>
                        <ThemedText style={styles.commentDate}>{new Date(c.fecha_creacion).toLocaleDateString()}</ThemedText>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* PROFESOR VIEW */}
        {esProfesor && (
          <View style={styles.teacherSection}>
            <ThemedText style={styles.sectionTitle} type="subtitle">
              Entregas de Estudiantes
            </ThemedText>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.tint }]} onPress={() => setMostrarCalificar(true)}>
              <IconSymbol name="pencil.circle" size={18} color="#fff" />
              <ThemedText style={styles.actionBtnText}>Ver Entregas</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal Agregar Comentario */}
      <Modal visible={mostrarComentario} transparent animationType="slide">
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title">Nuevo Comentario</ThemedText>
              <TouchableOpacity onPress={() => setMostrarComentario(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.commentInput, { color: colors.text, borderColor: colors.tint }]}
              placeholder="Escribe tu comentario..."
              placeholderTextColor={colors.text + '80'}
              value={nuevoComentario}
              onChangeText={setNuevoComentario}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.tint }]}
              onPress={handleAgregarComentario}>
              <ThemedText style={styles.submitBtnText}>Enviar</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </Modal>

      {/* Modal Calificar */}
      <Modal visible={mostrarCalificar} transparent animationType="slide">
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title">Calificar Tarea</ThemedText>
              <TouchableOpacity onPress={() => setMostrarCalificar(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.tint }]}
              placeholder="Calificación"
              placeholderTextColor={colors.text + '80'}
              value={calificacion}
              onChangeText={setCalificacion}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.commentInput, { color: colors.text, borderColor: colors.tint }]}
              placeholder="Comentario del profesor..."
              placeholderTextColor={colors.text + '80'}
              value={nuevoComentario}
              onChangeText={setNuevoComentario}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.tint }]}
              onPress={handleCalificar}
              disabled={calificando}>
              {calificando ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.submitBtnText}>Calificar</ThemedText>}
            </TouchableOpacity>
          </View>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  infoValue: {
    fontSize: 15,
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.7,
  },
  statusCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusDate: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 2,
  },
  gradeContainer: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  grade: {
    fontSize: 14,
  },
  actionsContainer: {
    marginBottom: 20,
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  fileName: {
    fontSize: 14,
  },
  fileDate: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 2,
  },
  commentsSection: {
    marginTop: 20,
  },
  commentCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  commentBtn: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  commentText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  commentDate: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teacherSection: {
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 100,
    marginBottom: 16,
  },
  submitBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
