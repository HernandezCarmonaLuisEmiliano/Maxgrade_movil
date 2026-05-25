/* ──────────────────────────────────────────────────────────────
   TaskDetailScreen.tsx
   Pantalla de detalle de tarea (alumno y profesor)
   ────────────────────────────────────────────────────────────── */
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/context/auth-context';
import { Entrega, Tarea, useTareas } from '@/context/task-context';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

/* ────────────────  Tipos auxiliares  ──────────────── */
type EntregaAlumno = {
  estudiante_id: string;
  nombre: string;
  apellido: string;
  estado: 'entregado' | 'calificado' | 'no_entregado';
  calificacion?: number;
  archivo_entrega_url?: string | null;
  fecha_envio?: string | null;
  entrega_id?: string;
};

const FILTROS = ['Todos', 'Entregado', 'Calificado', 'No entregado'] as const;
type Filtro = typeof FILTROS[number];

/* ────────────────  Componente  ──────────────── */
export function TaskDetailScreen() {
  const router = useRouter();
  const {
    tareaId,
    claseId,
    esProfesor: esProfesorParam,
  } = useLocalSearchParams<{ tareaId: string; claseId: string; esProfesor: string }>();

  const { user } = useAuth();
  const {
    tareas,
    entregarTarea,
    obtenerEntrega,
    calificarEntrega,
    anularEntrega,
    eliminarArchivo,
    agregarComentarioAlumno,
  } = useTareas();

  const esProfesor = esProfesorParam === 'true';

  /* ────────────────  State  ──────────────── */
  const [tarea, setTarea] = useState<Tarea | null>(null);
  const [entrega, setEntrega] = useState<Entrega | null>(null);

  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);

  /* Profesor / Alumno */
  const [calificando, setCalificando] = useState(false);
  const [mostrarCalificar, setMostrarCalificar] = useState(false);
  const [calificacion, setCalificacion] = useState('');
  const [nuevoComentario, setNuevoComentario] = useState('');

  /* Profesor: listado de entregas */
  const [mostrarEntregas, setMostrarEntregas] = useState(false);
  const [entregasAlumnos, setEntregasAlumnos] = useState<EntregaAlumno[]>([]);
  const [cargandoEntregas, setCargandoEntregas] = useState(false);
  const [filtroActivo, setFiltroActivo] = useState<Filtro>('Todos');
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<EntregaAlumno | null>(null);
  const [mostrarCalificarAlumno, setMostrarCalificarAlumno] = useState(false);
  const [calificacionAlumno, setCalificacionAlumno] = useState('');
  const [comentarioAlumno, setComentarioAlumno] = useState('');
  const [calificandoAlumno, setCalificandoAlumno] = useState(false);

  /* Alumno: modal comentario */
  const [mostrarComentario, setMostrarComentario] = useState(false);

  /* ────────────────  Init ─────────────── */
  useEffect(() => {
    if (tareaId) cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tareaId]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const tareaEncontrada = tareas.find(t => t.id === tareaId);
      if (tareaEncontrada) {
        setTarea(tareaEncontrada);

        if (!esProfesor && user) {
          const entregaCargada = await obtenerEntrega(tareaId, user.id);
          if (entregaCargada) setEntrega(entregaCargada);
        }
      }
    } catch (error) {
      console.error('Error cargando tarea:', error);
    } finally {
      setLoading(false);
    }
  };

  /* ────────────────  Entregas profesor  ──────────────── */
  const cargarEntregasAlumnos = async () => {
    setCargandoEntregas(true);
    try {
      const { data: inscritos, error: errorInscritos } = await supabase
        .from('inscripciones')
        .select('usuarios(id, nombre, apellido)')
        .eq('clase_id', claseId);
      if (errorInscritos) throw errorInscritos;

      const { data: entregas, error: errorEntregas } = await supabase
        .from('entregas')
        .select('*')
        .eq('tarea_id', tareaId);
      if (errorEntregas) throw errorEntregas;

      const resultado: EntregaAlumno[] = (inscritos ?? [])
        .filter((i: any) => i.usuarios?.id !== user?.id)
        .map((i: any) => {
          const u = i.usuarios;
          const entregaDelAlumno = (entregas ?? []).find(
            (e: any) => e.estudiante_id === u.id,
          );

          const estadoAlumno: 'entregado' | 'calificado' | 'no_entregado' =
            entregaDelAlumno
              ? (entregaDelAlumno.estado as 'entregado' | 'calificado')
              : 'no_entregado';

          return {
            estudiante_id       : u.id,
            nombre              : u.nombre,
            apellido            : u.apellido,
            estado              : estadoAlumno,
            calificacion        : entregaDelAlumno?.calificacion ?? undefined,
            archivo_entrega_url : entregaDelAlumno?.archivo_entrega_url ?? undefined,
            fecha_envio         : entregaDelAlumno?.fecha_envio ?? undefined,
            entrega_id          : entregaDelAlumno?.id ?? undefined,
          };
        })
        .sort((a, b) => {
          const orden = { calificado: 0, entregado: 1, no_entregado: 2 };
          return orden[a.estado] - orden[b.estado];
        });

      setEntregasAlumnos(resultado);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar las entregas');
    } finally {
      setCargandoEntregas(false);
    }
  };

  /* ────────────────  Helpers de UI  ──────────────── */
  const entregasFiltradas = entregasAlumnos.filter(e => {
    if (filtroActivo === 'Todos') return true;
    if (filtroActivo === 'Entregado') return e.estado === 'entregado';
    if (filtroActivo === 'Calificado') return e.estado === 'calificado';
    if (filtroActivo === 'No entregado') return e.estado === 'no_entregado';
    return true;
  });

  const conteo = {
    entregado: entregasAlumnos.filter(e => e.estado === 'entregado').length,
    calificado: entregasAlumnos.filter(e => e.estado === 'calificado').length,
    no_entregado: entregasAlumnos.filter(e => e.estado === 'no_entregado').length,
  };

  const getEstadoColor = (estado: string | null) =>
    estado === 'entregado' ? '#10B981' : estado === 'calificado' ? '#5b6bff' : '#F97316';
  const getEstadoIcon = (estado: string | null): any =>
    estado === 'entregado' ? 'checkmark.circle.fill' : estado === 'calificado' ? 'star.fill' : 'clock.fill';
  const getEstadoLabel = (estado: string | null) =>
    estado === 'entregado' ? 'Entregado' : estado === 'calificado' ? 'Calificado' : estado === 'no_entregado' ? 'No entregado' : 'Pendiente';

  /* ────────────────  Acciones alumno  ──────────────── */
  const handleSeleccionarArchivo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled && result.assets?.length) {
        const archivo = result.assets[0];
        setSubiendo(true);
        try {
          await entregarTarea(tareaId, user!.id, archivo.uri, archivo.name);
          Alert.alert('Éxito', 'Archivo subido correctamente');
          await cargarDatos();
        } catch (err: any) {
          Alert.alert('Error', err.message);
        } finally {
          setSubiendo(false);
        }
      }
    } catch (err) {
      console.error('Error seleccionando archivo:', err);
    }
  };

  const handleEntregarSinArchivo = () => {
    Alert.alert('Confirmar entrega', '¿Deseas entregar la tarea sin adjuntar un archivo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Entregar',
        onPress: async () => {
          setSubiendo(true);
          try {
            await entregarTarea(tareaId, user!.id, null, null);
            Alert.alert('Éxito', 'Tarea entregada correctamente');
            await cargarDatos();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          } finally {
            setSubiendo(false);
          }
        },
      },
    ]);
  };

  const handleAnularEntrega = () =>
    Alert.alert('Anular entrega', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Anular',
        style: 'destructive',
        onPress: async () => {
          try {
            await anularEntrega(tareaId, user!.id);
            Alert.alert('✓ Éxito', 'Entrega anulada');
            await cargarDatos();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);

  const handleEliminarArchivo = () =>
    Alert.alert('Eliminar archivo', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await eliminarArchivo(tareaId, user!.id);
            Alert.alert('✓ Éxito', 'Archivo eliminado');
            await cargarDatos();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);

  const handleAgregarComentario = async () => {
    if (!nuevoComentario.trim()) return Alert.alert('Error', 'Escribe un comentario');
    try {
      await agregarComentarioAlumno(entrega!.id, nuevoComentario.trim());
      setNuevoComentario('');
      setMostrarComentario(false);
      await cargarDatos();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  /* ────────────────  Acciones profesor  ──────────────── */
  const handleCalificar = async () => {
    if (!calificacion.trim()) return Alert.alert('Error', 'Ingresa la calificación');
    setCalificando(true);
    try {
      await calificarEntrega(entrega!.id, parseFloat(calificacion), nuevoComentario.trim());
      setCalificacion('');
      setNuevoComentario('');
      setMostrarCalificar(false);
      await cargarDatos();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setCalificando(false);
    }
  };

  const handleCalificarAlumno = async () => {
    if (!calificacionAlumno.trim()) return Alert.alert('Error', 'Ingresa la calificación');
    if (!alumnoSeleccionado?.entrega_id) return Alert.alert('Error', 'Este alumno no tiene entrega aún');
    setCalificandoAlumno(true);
    try {
      await calificarEntrega(alumnoSeleccionado.entrega_id, parseFloat(calificacionAlumno), comentarioAlumno.trim());
      setCalificacionAlumno('');
      setComentarioAlumno('');
      setMostrarCalificarAlumno(false);
      setAlumnoSeleccionado(null);
      await cargarEntregasAlumnos();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setCalificandoAlumno(false);
    }
  };

  /* ────────────────  Navegación profesor  ──────────────── */
  const handleAbrirEntregas = () =>
    router.push({
      pathname: '/calificar',
      params: {
        tareaId,
        claseId,
        tareaTitulo: tarea?.titulo ?? '',
        puntosMaximos: tarea?.puntos_maximos?.toString() ?? '100',
      },
    });

  /* ────────────────  Abrir archivo guía  ──────────────── */
  const handleAbrirArchivoGuia = async () => {
    if (!tarea?.archivo_guia_url) return;
    try {
      await Linking.openURL(tarea.archivo_guia_url);
    } catch {
      Alert.alert('Error', 'No se pudo abrir el archivo');
    }
  };

  /* ────────────────  Render  ──────────────── */
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5b6bff" />
      </View>
    );
  }

  if (!tarea) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText>Tarea no encontrada</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ------------- Cabecera ------------- */}
      <LinearGradient
        colors={['#5b6bff', '#6b7bff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>{tarea.titulo}</ThemedText>
      </LinearGradient>

      {/* ------------- Contenido scroll ------------- */}
      <ScrollView contentContainerStyle={styles.scrollContent} style={{ backgroundColor: '#f5f5f5' }}>
        {/* ---------- Tarjeta info ---------- */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <IconSymbol name="star.fill" size={17} color="#5b6bff" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.infoLabel}>Puntos máximos</ThemedText>
              <ThemedText style={styles.infoValue}>{tarea.puntos_maximos}</ThemedText>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <IconSymbol name="calendar" size={17} color="#5b6bff" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.infoLabel}>Fecha de entrega</ThemedText>
              <ThemedText style={styles.infoValue}>
                {new Date(tarea.fecha_entrega).toLocaleDateString()}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* ---------- Descripción ---------- */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Descripción</ThemedText>
          <ThemedText style={styles.description}>
            {tarea.descripcion || 'Sin descripción adicional'}
          </ThemedText>
        </View>

        {/* ---------- Archivo guía ---------- */}
        {tarea.archivo_guia_url && (
          <View style={styles.guiaCard}>
            <View style={styles.guiaIconBox}>
              <IconSymbol name="doc.text.fill" size={20} color="#5b6bff" />
            </View>

            <View style={{ flex: 1 }}>
              <ThemedText style={styles.guiaLabel}>ARCHIVO GUÍA</ThemedText>
              <ThemedText style={styles.guiaNombre} numberOfLines={1}>
                {tarea.archivo_guia_url.split('/').pop()?.split('?')[0] ?? 'Ver archivo'}
              </ThemedText>
            </View>

            <TouchableOpacity style={styles.guiaBtn} onPress={handleAbrirArchivoGuia}>
              <IconSymbol name="arrow.down.circle.fill" size={15} color="#fff" />
              <ThemedText style={styles.guiaBtnText}>Abrir</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* ───────────────────────  BLOQUE ALUMNO  ─────────────────────── */}
        {!esProfesor && (
          <>
            {/* ---------- Estado de la entrega ---------- */}
            {entrega && (
              <View
                style={[
                  styles.statusCard,
                  {
                    backgroundColor: `${getEstadoColor(entrega.estado)}15`,
                    borderColor: `${getEstadoColor(entrega.estado)}60`,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <IconSymbol
                    name={getEstadoIcon(entrega.estado)}
                    size={22}
                    color={getEstadoColor(entrega.estado)}
                  />
                  <View>
                    <ThemedText style={[styles.estadoLabel, { color: getEstadoColor(entrega.estado) }]}>
                      {getEstadoLabel(entrega.estado)}
                    </ThemedText>
                    {entrega.fecha_envio && (
                      <ThemedText style={styles.statusDate}>
                        {new Date(entrega.fecha_envio).toLocaleDateString()}
                      </ThemedText>
                    )}
                  </View>
                </View>

                {entrega.calificacion != null && (
                  <View
                    style={[
                      styles.gradeContainer,
                      { backgroundColor: `${getEstadoColor(entrega.estado)}20` },
                    ]}
                  >
                    <ThemedText style={[styles.grade, { color: getEstadoColor(entrega.estado) }]}>
                      {entrega.calificacion}/{tarea.puntos_maximos}
                    </ThemedText>
                  </View>
                )}
              </View>
            )}

            {/* ---------- Acciones ---------- */}
            <View style={styles.actionsContainer}>
              {/* Entregar / Resubir */}
              {!entrega || entrega.estado === 'pendiente' ? (
                <View style={{ gap: 10 }}>
                  <LinearGradient
                    colors={['#5b6bff', '#6b7bff']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionGradient}
                  >
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={handleSeleccionarArchivo}
                      disabled={subiendo}
                    >
                      <IconSymbol name="doc.badge.plus" size={18} color="#fff" />
                      <ThemedText style={styles.actionBtnText}>
                        {subiendo ? 'Subiendo...' : 'Subir Archivo'}
                      </ThemedText>
                    </TouchableOpacity>
                  </LinearGradient>

                  <TouchableOpacity
                    style={styles.actionBtnOutlineBlue}
                    onPress={handleEntregarSinArchivo}
                    disabled={subiendo}
                  >
                    <IconSymbol name="checkmark.circle" size={18} color="#5b6bff" />
                    <ThemedText style={[styles.actionBtnText, { color: '#5b6bff' }]}>
                      Entregar sin archivo
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  <LinearGradient
                    colors={['#5b6bff', '#6b7bff']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionGradient}
                  >
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={handleSeleccionarArchivo}
                      disabled={subiendo}
                    >
                      <IconSymbol name="arrow.clockwise" size={18} color="#fff" />
                      <ThemedText style={styles.actionBtnText}>Resubir</ThemedText>
                    </TouchableOpacity>
                  </LinearGradient>

                  <TouchableOpacity style={styles.actionBtnOutline} onPress={handleAnularEntrega}>
                    <IconSymbol name="xmark.circle" size={18} color="#EF4444" />
                    <ThemedText style={[styles.actionBtnText, { color: '#EF4444' }]}>
                      Anular entrega
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}

              {/* Archivo entregado */}
              {entrega?.archivo_entrega_url && (
                <View style={styles.fileCard}>
                  <View style={styles.fileIconBox}>
                    <IconSymbol name="doc.fill" size={20} color="#5b6bff" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.fileName}>
                      {entrega.archivo_entrega_url}
                    </ThemedText>
                    {entrega.fecha_envio && (
                      <ThemedText style={styles.fileDate}>
                        {new Date(entrega.fecha_envio).toLocaleDateString()}
                      </ThemedText>
                    )}
                  </View>

                  <TouchableOpacity onPress={handleEliminarArchivo}>
                    <IconSymbol name="trash" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* ---------- Comentarios ---------- */}
            {entrega && (
              <View style={styles.commentsSection}>
                <ThemedText style={styles.sectionTitle}>Comentarios</ThemedText>

                {/* Comentario del profesor */}
                {entrega.comentario_profesor && (
                  <View style={styles.commentCardProfe}>
                    <LinearGradient
                      colors={['#5b6bff', '#6b7bff']}
                      style={styles.commentAvatar}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <IconSymbol name="person.fill" size={14} color="#fff" />
                    </LinearGradient>

                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.commentAuthor}>Profesor</ThemedText>
                      <ThemedText style={styles.commentText}>
                        {entrega.comentario_profesor}
                      </ThemedText>
                    </View>
                  </View>
                )}

                {/* Comentario del alumno (si ya existe) */}
                {entrega.comentario_alumno && (
                  <View style={styles.commentCard}>
                    <View
                      style={[
                        styles.commentAvatar,
                        { backgroundColor: '#ede9ff' },
                      ]}
                    >
                      <ThemedText style={{ fontSize: 13, fontWeight: 'bold', color: '#5b6bff' }}>
                        {user?.nombre?.[0] ?? 'A'}
                      </ThemedText>
                    </View>

                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.commentAuthor}>Tú</ThemedText>
                      <ThemedText style={styles.commentText}>
                        {entrega.comentario_alumno}
                      </ThemedText>
                    </View>
                  </View>
                )}

                {/* Botón agregar / editar comentario */}
                <TouchableOpacity
                  style={styles.addCommentBtn}
                  onPress={() => {
                    setNuevoComentario(entrega.comentario_alumno ?? '');
                    setMostrarComentario(true);
                  }}
                >
                  <IconSymbol name="plus.circle" size={18} color="#5b6bff" />
                  <ThemedText
                    style={{ color: '#5b6bff', fontWeight: '600', fontSize: 14 }}
                  >
                    {entrega.comentario_alumno ? 'Editar comentario' : 'Agregar comentario'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ───────────────────────  BLOQUE PROFESOR  ─────────────────────── */}
        {esProfesor && (
          <View style={styles.teacherSection}>
            <ThemedText style={styles.sectionTitle}>Entregas de Estudiantes</ThemedText>

            <LinearGradient
              colors={['#5b6bff', '#6b7bff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionGradient}
            >
              <TouchableOpacity style={styles.actionBtn} onPress={handleAbrirEntregas}>
                <IconSymbol name="person.2.fill" size={18} color="#fff" />
                <ThemedText style={styles.actionBtnText}>Ver Entregas</ThemedText>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}
      </ScrollView>

      {/* ───────────────────────  MODALES  ─────────────────────── */}

      {/* ---------- Modal comentario alumno ---------- */}
      <Modal visible={mostrarComentario} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#5b6bff', '#1AC952']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modalHeader}
            >
              <ThemedText style={styles.modalTitle}>
                {entrega?.comentario_alumno ? 'Editar comentario' : 'Nuevo Comentario'}
              </ThemedText>
              <TouchableOpacity onPress={() => setMostrarComentario(false)}>
                <IconSymbol name="xmark" size={22} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={{ padding: 20 }}>
              <View style={styles.modalInputWrapper}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Escribe tu comentario..."
                  placeholderTextColor="#aaa"
                  value={nuevoComentario}
                  onChangeText={setNuevoComentario}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <LinearGradient
                colors={['#5b6bff', '#1AC952']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                <TouchableOpacity style={styles.submitBtn} onPress={handleAgregarComentario}>
                  <ThemedText style={styles.submitBtnText}>
                    {entrega?.comentario_alumno ? 'Guardar' : 'Enviar'}
                  </ThemedText>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------- Modal calificar (profesor viendo su propia tarea) ---------- */}
      <Modal visible={mostrarCalificar} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#5b6bff', '#1AC952']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modalHeader}
            >
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
                  placeholderTextColor="#aaa"
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
                  placeholderTextColor="#aaa"
                  value={nuevoComentario}
                  onChangeText={setNuevoComentario}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <LinearGradient
                colors={['#5b6bff', '#1AC952']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                <TouchableOpacity style={styles.submitBtn} onPress={handleCalificar} disabled={calificando}>
                  {calificando ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.submitBtnText}>Calificar</ThemedText>
                  )}
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------- Modal calificar alumno seleccionado ---------- */}
      <Modal visible={mostrarCalificarAlumno} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '60%' }]}>
            <LinearGradient
              colors={['#5b6bff', '#6b7bff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modalHeader}
            >
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.modalTitle}>Calificar</ThemedText>
                <ThemedText style={styles.modalSubtitle}>
                  {alumnoSeleccionado?.nombre} {alumnoSeleccionado?.apellido}
                </ThemedText>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setMostrarCalificarAlumno(false);
                  setAlumnoSeleccionado(null);
                }}
              >
                <IconSymbol name="xmark" size={22} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={{ padding: 20 }}>
              <ThemedText style={styles.modalLabel}>
                CALIFICACIÓN (máx. {tarea.puntos_maximos})
              </ThemedText>
              <View style={styles.modalInputWrapper}>
                <TextInput
                  style={[styles.modalInput, { minHeight: 0, paddingVertical: 12 }]}
                  placeholder={`Ej: ${tarea.puntos_maximos}`}
                  placeholderTextColor="#aaa"
                  value={calificacionAlumno}
                  onChangeText={setCalificacionAlumno}
                  keyboardType="decimal-pad"
                />
              </View>

              <ThemedText style={[styles.modalLabel, { marginTop: 12 }]}>COMENTARIO (opcional)</ThemedText>
              <View style={styles.modalInputWrapper}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Retroalimentación para el alumno..."
                  placeholderTextColor="#aaa"
                  value={comentarioAlumno}
                  onChangeText={setComentarioAlumno}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <LinearGradient
                colors={['#5b6bff', '#1AC952']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.submitGradient, { marginTop: 16 }]}
              >
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleCalificarAlumno}
                  disabled={calificandoAlumno}
                >
                  {calificandoAlumno ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.submitBtnText}>Guardar Calificación</ThemedText>
                  )}
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------- Modal listado entregas (profesor) ---------- */}
      <Modal visible={mostrarEntregas} transparent animationType="slide" onShow={cargarEntregasAlumnos}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#5b6bff', '#6b7bff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modalHeader}
            >
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.modalTitle}>Entregas</ThemedText>
                <ThemedText style={styles.modalSubtitle}>{tarea.titulo}</ThemedText>
              </View>
              <TouchableOpacity onPress={() => setMostrarEntregas(false)}>
                <IconSymbol name="xmark" size={22} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            {/* --------- Conteo --------- */}
            {!cargandoEntregas && (
              <View style={styles.conteoRow}>
                <View
                  style={[
                    styles.conteoBadge,
                    { backgroundColor: '#10B98112', borderColor: '#10B98160' },
                  ]}
                >
                  <ThemedText style={[styles.conteoNum, { color: '#10B981' }]}>
                    {conteo.entregado}
                  </ThemedText>
                  <ThemedText style={[styles.conteoLabel, { color: '#10B981' }]}>Entregado</ThemedText>
                </View>

                <View
                  style={[
                    styles.conteoBadge,
                    { backgroundColor: '#5b6bff12', borderColor: '#5b6bff60' },
                  ]}
                >
                  <ThemedText style={[styles.conteoNum, { color: '#5b6bff' }]}>
                    {conteo.calificado}
                  </ThemedText>
                  <ThemedText style={[styles.conteoLabel, { color: '#5b6bff' }]}>
                    Calificado
                  </ThemedText>
                </View>

                <View
                  style={[
                    styles.conteoBadge,
                    { backgroundColor: '#F9731612', borderColor: '#F9731660' },
                  ]}
                >
                  <ThemedText style={[styles.conteoNum, { color: '#F97316' }]}>
                    {conteo.no_entregado}
                  </ThemedText>
                  <ThemedText style={[styles.conteoLabel, { color: '#F97316' }]}>
                    Pendiente
                  </ThemedText>
                </View>
              </View>
            )}

            {/* --------- Filtros --------- */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filtrosScroll}
              contentContainerStyle={styles.filtrosContainer}
            >
              {FILTROS.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filtroBtn, filtroActivo === f && styles.filtroBtnActive]}
                  onPress={() => setFiltroActivo(f)}
                >
                  <ThemedText style={[styles.filtroText, filtroActivo === f && styles.filtroTextActive]}>
                    {f}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* --------- Listado alumnos --------- */}
            {cargandoEntregas ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#5b6bff" />
              </View>
            ) : (
              <ScrollView style={styles.alumnosList} showsVerticalScrollIndicator={false}>
                {entregasFiltradas.length === 0 ? (
                  <View style={styles.emptyEntregas}>
                    <IconSymbol name="tray" size={40} color="#5b6bff30" />
                    <ThemedText style={styles.emptyEntregasText}>Sin resultados</ThemedText>
                  </View>
                ) : (
                  entregasFiltradas.map(alumno => (
                    <View key={alumno.estudiante_id} style={styles.alumnoCard}>
                      <View
                        style={[
                          styles.alumnoAvatar,
                          { backgroundColor: `${getEstadoColor(alumno.estado)}20` },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.alumnoAvatarText,
                            { color: getEstadoColor(alumno.estado) },
                          ]}
                        >
                          {alumno.nombre[0].toUpperCase()}
                        </ThemedText>
                      </View>

                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.alumnoNombre}>
                          {alumno.nombre} {alumno.apellido}
                        </ThemedText>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                          <IconSymbol name={getEstadoIcon(alumno.estado)} size={12} color={getEstadoColor(alumno.estado)} />
                          <ThemedText style={[styles.alumnoEstado, { color: getEstadoColor(alumno.estado) }]}>
                            {getEstadoLabel(alumno.estado)}
                          </ThemedText>

                          {alumno.calificacion != null && (
                            <ThemedText style={styles.alumnoCalif}>
                              · {alumno.calificacion}/{tarea.puntos_maximos} pts
                            </ThemedText>
                          )}
                        </View>

                        {alumno.archivo_entrega_url && (
                          <ThemedText style={styles.alumnoArchivo} numberOfLines={1}>
                            📎 {alumno.archivo_entrega_url}
                          </ThemedText>
                        )}
                      </View>

                      {alumno.estado === 'entregado' && (
                        <TouchableOpacity
                          onPress={() => {
                            setAlumnoSeleccionado(alumno);
                            setMostrarCalificarAlumno(true);
                          }}
                        >
                          <LinearGradient
                            colors={['#5b6bff', '#6b7bff']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.calificarBtnGradient}
                          >
                            <IconSymbol name="pencil" size={13} color="#fff" />
                            <ThemedText style={styles.calificarBtnText}>Calificar</ThemedText>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* -------------- StyleSheet abajo (sin cambios) -------------- */
export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 20,
    gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#fff' },

  scrollContent: { padding: 16, paddingBottom: 36 },

  infoCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5,
    borderColor: '#e0e0e0', padding: 16, marginBottom: 14,
    shadowColor: '#5b6bff', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#ede9ff', justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: 11, color: '#9a9aaa', letterSpacing: 0.4 },
  infoValue: { fontSize: 16, fontWeight: '600', color: '#1a1a2e', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 12 },

  section: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5,
    borderColor: '#e0e0e0', padding: 16, marginBottom: 14,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#5b6bff', marginBottom: 8, letterSpacing: 0.3 },
  description: { fontSize: 14, lineHeight: 22, color: '#1a1a2e' },

  guiaCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5,
    borderColor: '#c4b8ff', padding: 14, marginBottom: 14,
    shadowColor: '#5b6bff', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  guiaIconBox: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#ede9ff', justifyContent: 'center', alignItems: 'center' },
  guiaLabel: { fontSize: 10, color: '#9a9aaa', letterSpacing: 0.8, marginBottom: 2 },
  guiaNombre: { fontSize: 13, fontWeight: '600', color: '#1a1a2e' },
  guiaBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#5b6bff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  guiaBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  statusCard: {
    borderWidth: 1.5, borderRadius: 16, padding: 16, marginBottom: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff',
  },
  estadoLabel: { fontSize: 14, fontWeight: '700' },
  statusDate: { fontSize: 11, color: '#9a9aaa', marginTop: 2 },
  gradeContainer: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 },
  grade: { fontSize: 15, fontWeight: '700' },

  actionsContainer: { marginBottom: 14, gap: 10 },
  actionGradient: { borderRadius: 14 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  actionBtnOutline: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13, borderRadius: 14, borderWidth: 1.5,
    borderColor: '#EF4444', backgroundColor: '#FEF2F2',
  },
  actionBtnOutlineBlue: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13, borderRadius: 14, borderWidth: 1.5,
    borderColor: '#5b6bff', backgroundColor: '#ede9ff50',
  },

  fileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5,
    borderColor: '#e0e0e0', padding: 14,
  },
  fileIconBox: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#ede9ff', justifyContent: 'center', alignItems: 'center' },
  fileName: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  fileDate: { fontSize: 11, color: '#9a9aaa', marginTop: 2 },

  commentsSection: { marginTop: 4 },
  commentCardProfe: {
    flexDirection: 'row', gap: 10, backgroundColor: '#ede9ff',
    borderRadius: 14, borderWidth: 1.5, borderColor: '#c4b8ff',
    padding: 14, marginBottom: 10,
  },
  commentCard: {
    flexDirection: 'row', gap: 10, backgroundColor: '#fff',
    borderRadius: 14, borderWidth: 1.5, borderColor: '#e0e0e0',
    padding: 14, marginBottom: 10,
  },
  commentAvatar: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  commentAuthor: { fontSize: 13, fontWeight: '600', color: '#1a1a2e' },
  commentText: { fontSize: 13, lineHeight: 18, color: '#1a1a2e', marginTop: 4 },
  commentDate: { fontSize: 11, color: '#9a9aaa', marginTop: 4 },
  addCommentBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: '#5b6bff', backgroundColor: '#ede9ff50',
  },

  teacherSection: { marginTop: 4 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  modalTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  modalSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  modalLabel: { color: '#9a9aaa', fontSize: 11, letterSpacing: 0.8, marginBottom: 8 },
  modalInputWrapper: { backgroundColor: '#f5f5f5', borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12, marginBottom: 8 },
  modalInput: { paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#1a1a2e', minHeight: 90 },
  submitGradient: { borderRadius: 14, marginTop: 4 },
  submitBtn: { height: 52, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  conteoRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  conteoBadge: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  conteoNum: { fontSize: 20, fontWeight: 'bold' },
  conteoLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  filtrosScroll: { maxHeight: 50 },
  filtrosContainer: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  filtroBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: '#f5f5f5' },
  filtroBtnActive: { backgroundColor: '#5b6bff', borderColor: '#5b6bff' },
  filtroText: { fontSize: 13, color: '#9a9aaa', fontWeight: '500' },
  filtroTextActive: { color: '#fff', fontWeight: '700' },

  loadingContainer: { justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },

  alumnosList: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  alumnoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5,
    borderColor: '#e0e0e0', padding: 14, marginBottom: 10,
    shadowColor: '#5b6bff', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  alumnoAvatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  alumnoAvatarText: { fontSize: 17, fontWeight: 'bold' },
  alumnoNombre: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  alumnoEstado: { fontSize: 12, fontWeight: '600' },
  alumnoCalif: { fontSize: 12, color: '#9a9aaa' },
  alumnoArchivo: { fontSize: 11, color: '#9a9aaa', marginTop: 3 },

  emptyEntregas: { alignItems: 'center', paddingVertical: 40 },
  emptyEntregasText: { color: '#9a9aaa', marginTop: 10 },

  calificarBtnGradient: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  calificarBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});