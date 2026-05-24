
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/context/auth-context';
import { useTareas } from '@/context/task-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AlumnoEntrega = {
  estudiante_id: string;
  nombre: string;
  apellido: string;
  estado: 'entregado' | 'calificado' | 'no_entregado';
  calificacion?: number;
  comentario_profesor?: string;
  nombre_archivo?: string;
  fecha_entrega?: string;
  entrega_id?: string;
};

export function CalificarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tareaId, claseId, tareaTitulo, puntosMaximos } = useLocalSearchParams<{
    tareaId: string;
    claseId: string;
    tareaTitulo: string;
    puntosMaximos: string;
  }>();

  const { user } = useAuth();
  const { calificarEntrega } = useTareas();

  const [alumnos, setAlumnos] = useState<AlumnoEntrega[]>([]);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<AlumnoEntrega | null>(null);
  const [cargando, setCargando] = useState(true);
  const [calificacion, setCalificacion] = useState('');
  const [comentario, setComentario] = useState('');
  const [guardando, setGuardando] = useState(false);

  const maxPuntos = parseInt(puntosMaximos ?? '100');

  useEffect(() => { cargarAlumnos(); }, []);

  const cargarAlumnos = async () => {
    setCargando(true);
    try {
      const { data: inscritos, error: errInscritos } = await supabase
        .from('inscripciones')
        .select('usuarios(id, nombre, apellido)')
        .eq('clase_id', claseId);
      if (errInscritos) throw errInscritos;

      const { data: entregas, error: errEntregas } = await supabase
        .from('entregas')
        .select('*')
        .eq('tarea_id', tareaId);
      if (errEntregas) throw errEntregas;

      const lista: AlumnoEntrega[] = (inscritos || [])
        .filter((i: any) => i.usuarios?.id !== user?.id)
        .map((i: any) => {
          const u = i.usuarios;
          const e = (entregas || []).find((x: any) => x.estudiante_id === u.id);
          return {
            estudiante_id: u.id,
            nombre: u.nombre,
            apellido: u.apellido,
            estado: e ? (e.estado as 'entregado' | 'calificado') : 'no_entregado',
            calificacion: e?.calificacion,
            comentario_profesor: e?.comentario_profesor,
            nombre_archivo: e?.nombre_archivo,
            fecha_entrega: e?.fecha_entrega,
            entrega_id: e?.id,
          };
        });

      lista.sort((a, b) => {
        const orden = { entregado: 0, calificado: 1, no_entregado: 2 };
        return orden[a.estado] - orden[b.estado];
      });

      setAlumnos(lista);
      if (lista.length > 0) seleccionarAlumno(lista[0]);
    } catch (err) {
      Alert.alert('Error', 'No se pudieron cargar los alumnos');
    } finally {
      setCargando(false);
    }
  };

  const seleccionarAlumno = (alumno: AlumnoEntrega) => {
    setAlumnoSeleccionado(alumno);
    setCalificacion(alumno.calificacion?.toString() ?? '');
    setComentario(alumno.comentario_profesor ?? '');
  };

  const handleGuardar = async () => {
    if (!calificacion.trim()) { Alert.alert('Error', 'Ingresa una calificación'); return; }
    const valor = parseFloat(calificacion);
    if (isNaN(valor) || valor < 0 || valor > maxPuntos) {
      Alert.alert('Error', `La calificación debe ser entre 0 y ${maxPuntos}`); return;
    }
    if (!alumnoSeleccionado?.entrega_id) {
      Alert.alert('Error', 'Este alumno no ha entregado la tarea'); return;
    }
    setGuardando(true);
    try {
      await calificarEntrega(alumnoSeleccionado.entrega_id, valor, comentario);
      const actualizados = alumnos.map((a) =>
        a.estudiante_id === alumnoSeleccionado.estudiante_id
          ? { ...a, estado: 'calificado' as const, calificacion: valor, comentario_profesor: comentario }
          : a
      );
      setAlumnos(actualizados);
      setAlumnoSeleccionado({ ...alumnoSeleccionado, estado: 'calificado', calificacion: valor, comentario_profesor: comentario });
      Alert.alert('✓ Guardado', `${alumnoSeleccionado.nombre} calificado con ${valor}/${maxPuntos}`);
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    } finally { setGuardando(false); }
  };

  const getEstadoColor = (estado: string) => {
    if (estado === 'entregado') return '#10B981';
    if (estado === 'calificado') return '#5b6bff';
    return '#d0d0d0';
  };

  const getEstadoLabel = (estado: string) => {
    if (estado === 'entregado') return 'Entregado';
    if (estado === 'calificado') return 'Calificado';
    return 'Sin entregar';
  };

  if (cargando) {
    return (
      <LinearGradient colors={['#f5f5f5', '#ffffff', '#f9f9f9']} style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5b6bff" />
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header con gradiente que cubre hasta el status bar */}
      <LinearGradient
        colors={['#5b6bff', '#6b7bff']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.headerTitle}>{tareaTitulo}</ThemedText>
          <ThemedText style={styles.headerSub}>Calificar entregas · {maxPuntos} pts</ThemedText>
        </View>
      </LinearGradient>

      {/* Cuerpo dividido */}
      <View style={styles.body}>

        {/* Sidebar */}
        <View style={styles.sidebar}>
          <ThemedText style={styles.sidebarTitle}>ALUMNOS</ThemedText>
          <ScrollView showsVerticalScrollIndicator={false}>
            {alumnos.map((alumno) => {
              const activo = alumnoSeleccionado?.estudiante_id === alumno.estudiante_id;
              return (
                <TouchableOpacity
                  key={alumno.estudiante_id}
                  style={[styles.sidebarItem, activo && styles.sidebarItemActive]}
                  onPress={() => seleccionarAlumno(alumno)}>
                  <View style={[
                    styles.avatar,
                    { backgroundColor: activo ? '#5b6bff' : getEstadoColor(alumno.estado) + '25' },
                  ]}>
                    <ThemedText style={[
                      styles.avatarText,
                      { color: activo ? '#fff' : getEstadoColor(alumno.estado) },
                    ]}>
                      {alumno.nombre[0].toUpperCase()}
                    </ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText
                      style={[styles.sidebarName, activo && { color: '#5b6bff', fontWeight: '700' }]}
                      numberOfLines={1}>
                      {alumno.nombre}
                    </ThemedText>
                    <ThemedText style={[styles.sidebarEstado, { color: getEstadoColor(alumno.estado) }]}>
                      {getEstadoLabel(alumno.estado)}
                      {alumno.calificacion != null ? ` · ${alumno.calificacion}` : ''}
                    </ThemedText>
                  </View>
                  {activo && <View style={styles.activeDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Panel derecho */}
        <View style={styles.panel}>
          {!alumnoSeleccionado ? (
            <View style={styles.panelEmpty}>
              <IconSymbol name="person.crop.circle" size={48} color="#e0e0e0" />
              <ThemedText style={styles.panelEmptyText}>Selecciona un alumno</ThemedText>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

              {/* Info alumno */}
              <View style={styles.panelHeader}>
                <LinearGradient
                  colors={['#5b6bff', '#6b7bff']}
                  style={styles.panelAvatar}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <ThemedText style={styles.panelAvatarText}>
                    {alumnoSeleccionado.nombre[0].toUpperCase()}
                  </ThemedText>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.panelNombre}>
                    {alumnoSeleccionado.nombre} {alumnoSeleccionado.apellido}
                  </ThemedText>
                  <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(alumnoSeleccionado.estado) + '20' }]}>
                    <ThemedText style={[styles.estadoBadgeText, { color: getEstadoColor(alumnoSeleccionado.estado) }]}>
                      {getEstadoLabel(alumnoSeleccionado.estado)}
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Archivo */}
              {alumnoSeleccionado.nombre_archivo ? (
                <View style={styles.archivoCard}>
                  <View style={styles.archivoIconBox}>
                    <IconSymbol name="doc.fill" size={18} color="#5b6bff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.archivoNombre} numberOfLines={1}>
                      {alumnoSeleccionado.nombre_archivo}
                    </ThemedText>
                    {alumnoSeleccionado.fecha_entrega && (
                      <ThemedText style={styles.archivoFecha}>
                        {new Date(alumnoSeleccionado.fecha_entrega).toLocaleDateString('es-MX', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </ThemedText>
                    )}
                  </View>
                </View>
              ) : (
                <View style={styles.sinArchivoCard}>
                  <IconSymbol name="tray" size={20} color="#999999" />
                  <ThemedText style={styles.sinArchivoText}>Sin archivo entregado</ThemedText>
                </View>
              )}

              {/* Calificación */}
              <ThemedText style={styles.fieldLabel}>CALIFICACIÓN</ThemedText>
              <View style={styles.calificacionRow}>
                <View style={styles.calificacionInputWrapper}>
                  <TextInput
                    style={styles.calificacionInput}
                    placeholder="0"
                    placeholderTextColor="#999999"
                    value={calificacion}
                    onChangeText={setCalificacion}
                    keyboardType="decimal-pad"
                    editable={alumnoSeleccionado.estado !== 'no_entregado'}
                  />
                </View>
                <ThemedText style={styles.calificacionSep}>/</ThemedText>
                <ThemedText style={styles.calificacionMax}>{maxPuntos}</ThemedText>
              </View>

              {/* Comentarios */}
              <ThemedText style={[styles.fieldLabel, { marginTop: 16 }]}>COMENTARIOS</ThemedText>
              <View style={styles.comentarioWrapper}>
                <TextInput
                  style={styles.comentarioInput}
                  placeholder="Escribe retroalimentación para el alumno..."
                  placeholderTextColor="#999999"
                  value={comentario}
                  onChangeText={setComentario}
                  multiline
                  textAlignVertical="top"
                  editable={alumnoSeleccionado.estado !== 'no_entregado'}
                />
              </View>

              {/* Botón */}
              {alumnoSeleccionado.estado !== 'no_entregado' ? (
                <LinearGradient
                  colors={['#5b6bff', '#1AC952']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.guardarGradient}>
                  <TouchableOpacity style={styles.guardarBtn} onPress={handleGuardar} disabled={guardando}>
                    {guardando ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <IconSymbol name="arrow.up.circle.fill" size={18} color="#fff" />
                        <ThemedText style={styles.guardarBtnText}>Subir calificación</ThemedText>
                      </>
                    )}
                  </TouchableOpacity>
                </LinearGradient>
              ) : (
                <View style={styles.noEntregadoNote}>
                  <IconSymbol name="exclamationmark.circle" size={16} color="#999999" />
                  <ThemedText style={styles.noEntregadoText}>El alumno no ha entregado</ThemedText>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
}


export const styles = StyleSheet.create({
  /* ───────── Layout roots ───────── */
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* ───────── Header ───────── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  /* ───────── Body split ───────── */
  body: { flex: 1, flexDirection: 'row' },

  /* ───────── Sidebar (lista de alumnos) ───────── */
  sidebar: {
    width: 120,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    paddingTop: 12,
  },
  sidebarTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7a9aaa',
    letterSpacing: 1,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 8,
    position: 'relative',
  },
  sidebarItemActive: { backgroundColor: '#f5f5f5' },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 14, fontWeight: 'bold' },

  sidebarName: { fontSize: 12, color: '#1a3a4a', fontWeight: '500' },
  sidebarEstado: { fontSize: 10, marginTop: 1 },

  activeDot: {
    position: 'absolute',
    right: 0,
    top: '50%',
    width: 3,
    height: 24,
    borderRadius: 2,
    backgroundColor: '#5b6bff',
    marginTop: -12,
  },

  /* ───────── Panel de calificación ───────── */
  panel: { flex: 1, padding: 16 },

  /* estado “nada seleccionado” */
  panelEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  panelEmptyText: { color: '#7a9aaa', fontSize: 14 },

  /* cabecera con avatar + nombre */
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    padding: 14,
    marginBottom: 12,
  },
  panelAvatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  panelAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  panelNombre: { fontSize: 15, fontWeight: '700', color: '#1a3a4a', marginBottom: 5 },

  /* badge de estado */
  estadoBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  estadoBadgeText: { fontSize: 11, fontWeight: '600' },

  /* archivo entregado */
  archivoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    padding: 12,
    marginBottom: 16,
  },
  archivoIconBox: { width: 36, height: 36, borderRadius: 9, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
  archivoNombre: { fontSize: 13, fontWeight: '600', color: '#1a3a4a' },
  archivoFecha: { fontSize: 11, color: '#7a9aaa', marginTop: 2 },

  /* sin archivo */
  sinArchivoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    padding: 12,
    marginBottom: 16,
    justifyContent: 'center',
  },
  sinArchivoText: { fontSize: 13, color: '#7a9aaa' },

  /* etiquetas */
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7a9aaa',
    letterSpacing: 1,
    marginBottom: 8,
  },

  /* calificación */
  calificacionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calificacionInputWrapper: {
    width: 80,
    height: 52,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calificacionInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a3a4a',
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  calificacionSep: { fontSize: 24, color: '#999999', fontWeight: '300' },
  calificacionMax: { fontSize: 20, color: '#7a9aaa', fontWeight: '600' },

  /* comentarios */
  comentarioWrapper: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    marginBottom: 20,
  },
  comentarioInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a3a4a',
    minHeight: 90,
    maxHeight: 140,
  },

  /* botón guardar */
  guardarGradient: { borderRadius: 14 },
  guardarBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 14 },
  guardarBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  /* nota “no entregado” */
  noEntregadoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  noEntregadoText: { fontSize: 13, color: '#7a9aaa' },
});
