/* eslint-disable max-lines */
/* ────────────────  ClassDetailScreen.tsx  ──────────────── */
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/context/auth-context';
import { useClases } from '@/context/class-context';
import { useTareas } from '@/context/task-context';

import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
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

/* ──────────────────────────── TIPOS ──────────────────────────── */
type ClaseReal = {
  id:            string;
  nombre_clase:  string;
  codigo_acceso: string;
  materia?:      string;
  profesor_id:   string;
  color_tema?:   string;
  portada_url?:  string;
  fecha_creacion?: string;
};

type Anuncio = {
  id:             string;
  clase_id:       string;
  autor_id:       string;
  contenido:      string;
  archivo_adjunto_url: string | null;
  fecha_publicacion?: string;
  autor_nombre?:  string;
};

type Miembro = {
  id:        string;
  nombre:    string;
  apellido:  string;
  correo:    string;
  esProfesor:boolean;
};

/* ───────────────────────── RENDIMIENTO ───────────────────────── */
function RendimientoTab({
  claseId,
  tareasPorClase,
  miembros,
}: {
  claseId: string;
  tareasPorClase: any[];
  miembros: Miembro[];
}) {
  const alumnos = miembros.filter(m => !m.esProfesor);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<Miembro | null>(alumnos[0] ?? null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [entregas, setEntregas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [statsClase, setStatsClase] = useState({
    promedio: 0,
    entregas: 0,
    noEntregadas: 0,
    porcentajeEntrega: 0,
  });

  useEffect(() => { cargarStatsClase(); }, [tareasPorClase]);
  useEffect(() => { if (alumnoSeleccionado) cargarEntregasAlumno(alumnoSeleccionado.id); }, [alumnoSeleccionado]);

  const cargarStatsClase = async () => {
    if (tareasPorClase.length === 0 || alumnos.length === 0) return;
    try {
      const { data } = await supabase
        .from('entregas')
        .select('*')
        .in('tarea_id', tareasPorClase.map(t => t.id));
      const totalPosibles = tareasPorClase.length * alumnos.length;
      const entregadas = (data || []).filter(e => e.estado === 'entregado' || e.estado === 'calificado').length;
      const calificadas = (data || []).filter(e => e.calificacion != null);
      const promedio = calificadas.length > 0
        ? calificadas.reduce((sum, e) => sum + (e.calificacion ?? 0), 0) / calificadas.length
        : 0;
      setStatsClase({
        promedio: Math.round(promedio * 100) / 100,
        entregas: entregadas,
        noEntregadas: totalPosibles - entregadas,
        porcentajeEntrega: totalPosibles > 0 ? Math.round((entregadas / totalPosibles) * 1000) / 10 : 0,
      });
    } catch (e) { console.error(e); }
  };

  const cargarEntregasAlumno = async (alumnoId: string) => {
    setCargando(true);
    try {
      const { data } = await supabase
        .from('entregas')
        .select('*')
        .in('tarea_id', tareasPorClase.map(t => t.id))
        .eq('estudiante_id', alumnoId);
      setEntregas(data || []);
    } catch (e) { console.error(e); }
    finally { setCargando(false); }
  };

  const totalTareas = tareasPorClase.length;
  const entregadasAlumno = entregas.filter(e => e.estado === 'entregado' || e.estado === 'calificado');
  const calificadasAlumno = entregas.filter(e => e.calificacion != null);
  const promedioAlumno = calificadasAlumno.length > 0
    ? calificadasAlumno.reduce((s, e) => s + e.calificacion, 0) / calificadasAlumno.length
    : 0;
  const porcentajeAlumno = totalTareas > 0 ? Math.round((entregadasAlumno.length / totalTareas) * 1000) / 10 : 0;
  const aTiempo = entregadasAlumno.filter(e => {
    const tarea = tareasPorClase.find(t => t.id === e.tarea_id);
    if (!tarea || !e.fecha_entrega) return false;
    return new Date(e.fecha_entrega) <= new Date(tarea.fecha_entrega);
  }).length;
  const tarde = entregadasAlumno.length - aTiempo;
  const noEntregadasAlumno = totalTareas - entregadasAlumno.length;

  const StatCard = ({ label, value, icon, iconBg }: {
    label: string; value: string | number; icon: string; iconBg: string;
  }) => (
    <View style={rendStyles.statCard}>
      <ThemedText style={rendStyles.statLabel}>{label}</ThemedText>
      <View style={rendStyles.statRow}>
        <ThemedText style={rendStyles.statValue}>{value}</ThemedText>
        <View style={[rendStyles.statIconBox, { backgroundColor: iconBg }]}>
          <IconSymbol name={icon as any} size={18} color="#fff" />
        </View>
      </View>
    </View>
  );

  const BarStat = ({ label, value, total, color }: {
    label: string; value: number; total: number; color: string;
  }) => {
    const pct = total > 0 ? value / total : 0;
    return (
      <View style={rendStyles.barCard}>
        <ThemedText style={rendStyles.statLabel}>{label}</ThemedText>
        <ThemedText style={rendStyles.barValue}>{value}</ThemedText>
        <View style={rendStyles.barTrack}>
          <View style={[rendStyles.barFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={rendStyles.container} showsVerticalScrollIndicator={false}>
      {/* Título + badge */}
      <View style={rendStyles.titleRow}>
        <View>
          <ThemedText style={rendStyles.title}>Rendimiento de clase</ThemedText>
          <ThemedText style={rendStyles.subtitle}>Métricas de entrega y calificación.</ThemedText>
        </View>
        <View style={rendStyles.badge}>
          <ThemedText style={rendStyles.badgeText}>{alumnos.length} alumnos</ThemedText>
        </View>
      </View>

      {/* Stats globales */}
      <View style={rendStyles.grid}>
        <StatCard label="Promedio"      value={statsClase.promedio}                icon="star.fill"         iconBg="#f59e0b" />
        <StatCard label="Entregas"      value={statsClase.entregas}                icon="checkmark"         iconBg="#06b6d4" />
        <StatCard label="No entregadas" value={statsClase.noEntregadas}            icon="minus.circle.fill" iconBg="#ef4444" />
        <StatCard label="% Entrega"     value={`${statsClase.porcentajeEntrega}%`} icon="percent"           iconBg="#10b981" />
      </View>

      {/* Selector de alumno */}
      <ThemedText style={rendStyles.selectorLabel}>Seleccionar alumno</ThemedText>
      <TouchableOpacity style={rendStyles.dropdown} onPress={() => setDropdownOpen(!dropdownOpen)}>
        <ThemedText style={rendStyles.dropdownText}>
          {alumnoSeleccionado
            ? `${alumnoSeleccionado.apellido} ${alumnoSeleccionado.nombre}`
            : 'Selecciona un alumno'}
        </ThemedText>
        <IconSymbol name="chevron.down" size={16} color="#7a9aaa" />
      </TouchableOpacity>

      {dropdownOpen && (
        <View style={rendStyles.dropdownList}>
          {alumnos.map(a => (
            <TouchableOpacity
              key={a.id}
              style={rendStyles.dropdownItem}
              onPress={() => { setAlumnoSeleccionado(a); setDropdownOpen(false); }}>
              <ThemedText style={rendStyles.dropdownItemText}>
                {a.apellido} {a.nombre}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Stats alumno */}
      {cargando ? (
        <ActivityIndicator color="#5b6bff" style={{ marginTop: 20 }} />
      ) : alumnoSeleccionado ? (
        <>
          <View style={rendStyles.grid}>
            <StatCard label="Promedio"    value={Math.round(promedioAlumno * 100) / 100} icon="star.fill"  iconBg="#f59e0b" />
            <StatCard label="Entregadas"  value={entregadasAlumno.length}                icon="checkmark"  iconBg="#06b6d4" />
            <StatCard label="% Entrega"   value={`${porcentajeAlumno}%`}                icon="percent"    iconBg="#10b981" />
            <StatCard label="Calificadas" value={calificadasAlumno.length}              icon="doc.fill"   iconBg="#5b6bff" />
          </View>

          <View style={rendStyles.barGrid}>
            <BarStat label="A tiempo"      value={aTiempo}                  total={totalTareas} color="#10b981" />
            <BarStat label="Tarde"         value={tarde}                    total={totalTareas} color="#f59e0b" />
            <BarStat label="No entregadas" value={noEntregadasAlumno}       total={totalTareas} color="#ef4444" />
            <BarStat label="Calificadas"   value={calificadasAlumno.length} total={totalTareas} color="#5b6bff" />
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const rendStyles = StyleSheet.create({
  container:       { padding: 16, paddingBottom: 32 },
  titleRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title:           { fontSize: 17, fontWeight: '700', color: '#1a3a4a' },
  subtitle:        { fontSize: 12, color: '#7a9aaa', marginTop: 2 },
  badge:           { backgroundColor: '#e0f7fa', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText:       { fontSize: 12, color: '#32a4b8', fontWeight: '600' },
  grid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard:        { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#e0e0e0', shadowColor: '#5b6bff', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  statLabel:       { fontSize: 11, color: '#7a9aaa', marginBottom: 8 },
  statRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statValue:       { fontSize: 22, fontWeight: '700', color: '#1a3a4a' },
  statIconBox:     { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  selectorLabel:   { fontSize: 13, fontWeight: '600', color: '#1a3a4a', marginBottom: 8 },
  dropdown:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#e0e0e0', paddingHorizontal: 16, paddingVertical: 14, marginBottom: 4 },
  dropdownText:    { fontSize: 14, color: '#1a3a4a' },
  dropdownList:    { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#e0e0e0', marginBottom: 16, overflow: 'hidden' },
  dropdownItem:    { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f4f6' },
  dropdownItemText:{ fontSize: 14, color: '#1a3a4a' },
  barGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  barCard:         { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#e0e0e0' },
  barValue:        { fontSize: 22, fontWeight: '700', color: '#1a3a4a', marginBottom: 8 },
  barTrack:        { height: 6, backgroundColor: '#e0e0e0', borderRadius: 3, overflow: 'hidden' },
  barFill:         { height: 6, borderRadius: 3 },
});

/* ───────────────────────── COMPONENTE PRINCIPAL ───────────────────────── */
export function ClassDetailScreen() {
  const router         = useRouter();
  const { claseId }    = useLocalSearchParams<{ claseId: string }>();
  const { user }       = useAuth();
  const { salirClase } = useClases();
  const { crearTarea } = useTareas();

  const [clase,          setClase]          = useState<ClaseReal | null>(null);
  const [tareasPorClase, setTareasPorClase] = useState<any[]>([]);
  const [anuncios,       setAnuncios]       = useState<Anuncio[]>([]);
  const [miembros,       setMiembros]       = useState<Miembro[]>([]);
  const [miembrosCount,  setMiembrosCount]  = useState(0);
  const [loading,        setLoading]        = useState(true);
  const [esProfesor,     setEsProfesor]     = useState(false);

  const [modalVisible,         setModalVisible]         = useState(false);
  const [menuVisible,          setMenuVisible]          = useState(false);
  const [modalEditDescripcion, setModalEditDescripcion] = useState(false);

  const [nuevoTituloTarea,   setNuevoTituloTarea]   = useState('');
  const [nuevaDescripcion,   setNuevaDescripcion]   = useState('');
  const [nuevosPuntos,       setNuevosPuntos]       = useState('100');
  const [nuevaFecha,         setNuevaFecha]         = useState<string | null>(null);
  const [creando,            setCreando]            = useState(false);
  const [fechaPickerVisible, setFechaPickerVisible] = useState(false);
  const [archivoUri,         setArchivoUri]         = useState<string | undefined>();
  const [archivoNombre,      setArchivoNombre]      = useState<string | undefined>();

  const [tabActivo, setTabActivo] = useState<'tareas' | 'miembros' | 'anuncios' | 'rendimiento'>('tareas');

  const [nuevoAnuncio,    setNuevoAnuncio]    = useState('');
  const [enviandoAnuncio, setEnviandoAnuncio] = useState(false);

  const [nuevaDescripcionClase, setNuevaDescripcionClase] = useState('');
  const [editandoDescripcion,   setEditandoDescripcion]   = useState(false);

  useEffect(() => { if (claseId) cargarClase(); }, [claseId]);

  const cargarClase = async () => {
    setLoading(true);
    try {
      const { data: c, error: errClase } = await supabase
        .from('clases').select('*').eq('id', claseId).single();
      if (errClase || !c) throw errClase ?? new Error('Clase no encontrada');
      setClase(c as ClaseReal);
      setEsProfesor(c.profesor_id === user?.id);
      const { data: tareas } = await supabase.from('tareas').select('*').eq('clase_id', claseId);
      setTareasPorClase(tareas || []);
      const { data: ins } = await supabase.from('inscripciones').select('id').eq('clase_id', claseId);
      setMiembrosCount((ins || []).length);
      await Promise.all([cargarAnuncios(), cargarMiembros(c.profesor_id)]);
    } catch (e) { console.error(e); }
    finally     { setLoading(false); }
  };

  const cargarMiembros = async (profesorId: string) => {
    try {
      const { data, error } = await supabase
        .from('inscripciones')
        .select('usuarios(id,nombre,apellido,email)')
        .eq('clase_id', claseId);
      if (error) throw error;
      const list: Miembro[] = (data || []).map((i: any) => ({
        id:         i.usuarios.id,
        nombre:     i.usuarios.nombre,
        apellido:   i.usuarios.apellido,
        correo:     i.usuarios.email,
        esProfesor: i.usuarios.id === profesorId,
      }));
      list.sort((a, b) => (a.esProfesor ? -1 : b.esProfesor ? 1 : 0));
      setMiembros(list);
    } catch (e) { console.error(e); }
  };

  const cargarAnuncios = async () => {
    try {
      const { data, error } = await supabase
        .from('anuncios')
        .select('*, usuarios(nombre,apellido)')
        .eq('clase_id', claseId)
        .order('fecha_publicacion', { ascending: false });
      if (error) throw error;
      setAnuncios((data || []).map((a: any) => ({
        ...a,
        autor_nombre: a.usuarios ? `${a.usuarios.nombre} ${a.usuarios.apellido}` : 'Usuario',
      })));
    } catch (e) { console.error(e); }
  };

  const handlePublicarAnuncio = async () => {
    if (!nuevoAnuncio.trim()) { Alert.alert('Error', 'Escribe algo'); return; }
    setEnviandoAnuncio(true);
    try {
      const { error } = await supabase.from('anuncios').insert({
        clase_id: claseId, autor_id: user?.id, contenido: nuevoAnuncio.trim(),
      });
      if (error) throw error;
      setNuevoAnuncio('');
      await cargarAnuncios();
    } catch (e) { Alert.alert('Error', (e as Error).message); }
    finally    { setEnviandoAnuncio(false); }
  };

  const handleEliminarClase = () => {
    setMenuVisible(false);
    Alert.alert('⚠️ Eliminar clase', 'Esta acción eliminará la clase, sus tareas y sus inscripciones. ¿Deseas continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('tareas').delete().eq('clase_id', claseId);
            await supabase.from('inscripciones').delete().eq('clase_id', claseId);
            await supabase.from('anuncios').delete().eq('clase_id', claseId);
            const { error } = await supabase.from('clases').delete().eq('id', claseId);
            if (error) throw error;
            Alert.alert('✓ Eliminada', 'La clase se eliminó correctamente');
            router.back();
          } catch (e: any) {
            Alert.alert('Error', e.message ?? 'No se pudo eliminar la clase');
          }
        },
      },
    ]);
  };

  const handleSalirClase = () => {
    setMenuVisible(false);
    Alert.alert('Salir de la clase', `¿Estás seguro que deseas salir de "${clase?.nombre_clase}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir', style: 'destructive',
        onPress: async () => {
          try { await salirClase(claseId); router.back(); }
          catch { Alert.alert('Error', 'No se pudo salir de la clase'); }
        },
      },
    ]);
  };

  const handleCrearTarea = async () => {
    if (!nuevoTituloTarea.trim()) { Alert.alert('Error', 'Ingresa título'); return; }
    setCreando(true);
    try {
      await crearTarea(
        claseId, nuevoTituloTarea, nuevaDescripcion,
        parseInt(nuevosPuntos) || 100,
        nuevaFecha ? new Date(nuevaFecha).toISOString() : new Date().toISOString(),
        archivoUri, archivoNombre,
      );
      setNuevoTituloTarea(''); setNuevaDescripcion(''); setNuevosPuntos('100');
      setNuevaFecha(null); setArchivoUri(undefined); setArchivoNombre(undefined);
      setModalVisible(false);
      await cargarClase();
    } catch (e) { Alert.alert('Error', (e as Error).message); }
    finally    { setCreando(false); }
  };

  const pickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false, type: '*/*' });
    if (res.canceled) return;
    const file = res.assets[0];
    setArchivoUri(file.uri);
    setArchivoNombre(file.name);
  };

  const handleEliminarAnuncio = (anuncioId: string) => {
    Alert.alert('Eliminar anuncio', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('anuncios').delete().eq('id', anuncioId);
          if (error) Alert.alert('Error', 'No se pudo eliminar el anuncio');
          else await cargarAnuncios();
        },
      },
    ]);
  };

  const handleEliminarAlumno = (alumnoId: string, nombre: string) => {
    Alert.alert('Eliminar alumno', `¿Deseas eliminar a ${nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('inscripciones').delete()
            .eq('clase_id', claseId).eq('estudiante_id', alumnoId);
          if (error) Alert.alert('Error', 'No se pudo eliminar al alumno');
          else { await cargarMiembros(clase!.profesor_id); setMiembrosCount(p => p - 1); }
        },
      },
    ]);
  };

  const handleVerCodigo = () => {
    setMenuVisible(false);
    Alert.alert('🔑 Código de la clase', clase?.codigo_acceso ?? '', [{ text: 'Cerrar', style: 'cancel' }]);
  };

  const handleTareaPress = (t: any) =>
    router.push({
      pathname: '/task-detail',
      params: { tareaId: t.id, claseId: t.clase_id, esProfesor: esProfesor.toString() },
    });

  if (loading) {
    return (
      <LinearGradient colors={['#f5f5f5', '#ffffff', '#f9f9f9']} style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5b6bff" />
      </LinearGradient>
    );
  }
  if (!clase) {
    return (
      <LinearGradient colors={['#f5f5f5', '#ffffff', '#f9f9f9']} style={styles.centerContainer}>
        <ThemedText>Clase no encontrada</ThemedText>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#f5f5f5', '#ffffff', '#f9f9f9']} style={{ flex: 1 }}>
      {/* Header */}
      <LinearGradient colors={['#5b6bff', '#6b7bff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.claseName}>{clase.nombre_clase}</ThemedText>
          <ThemedText style={styles.classCode}>Código: {clase.codigo_acceso}</ThemedText>
        </View>
        <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuVisible(true)}>
          <IconSymbol name="ellipsis" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <IconSymbol name="doc.text.fill" size={15} color="#5b6bff" />
          <ThemedText style={styles.infoText}>{tareasPorClase.length} tareas</ThemedText>
        </View>
        <View style={styles.infoItem}>
          <IconSymbol name="person.2.fill" size={15} color="#5b6bff" />
          <ThemedText style={styles.infoText}>{miembrosCount} miembros</ThemedText>
        </View>
        {clase.materia && (
          <View style={styles.infoItem}>
            <IconSymbol name="book.fill" size={15} color="#5b6bff" />
            <ThemedText style={styles.infoText}>{clase.materia}</ThemedText>
          </View>
        )}
      </View>

      {/* Descripción */}
      {clase.materia && (
        <View style={styles.descContainer}>
          <ThemedText style={styles.descTitle}>Materia</ThemedText>
          <ThemedText style={styles.descText}>{clase.materia}</ThemedText>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {(['tareas', 'miembros', 'anuncios'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tabActivo === t && styles.tabActive]}
            onPress={() => setTabActivo(t)}>
            <ThemedText style={[styles.tabText, tabActivo === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </ThemedText>
          </TouchableOpacity>
        ))}
        {esProfesor && (
          <TouchableOpacity
            style={[styles.tab, tabActivo === 'rendimiento' && styles.tabActive]}
            onPress={() => setTabActivo('rendimiento')}>
            <ThemedText style={[styles.tabText, tabActivo === 'rendimiento' && styles.tabTextActive]}>
              Rendimiento
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {/* TAB: TAREAS */}
      {tabActivo === 'tareas' && (
        <View style={styles.tabContent}>
          {esProfesor && (
            <LinearGradient colors={['#5b6bff', '#6b7bff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.createTaskGradient}>
              <TouchableOpacity style={styles.createTaskBtn} onPress={() => setModalVisible(true)}>
                <IconSymbol name="plus.circle.fill" size={18} color="#fff" />
                <ThemedText style={styles.createTaskBtnText}>Crear Tarea</ThemedText>
              </TouchableOpacity>
            </LinearGradient>
          )}
          {tareasPorClase.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol name="doc.text" size={48} color="#5b6bff40" />
              <ThemedText style={styles.emptyText}>No hay tareas aún</ThemedText>
            </View>
          ) : (
            <FlatList
              data={tareasPorClase}
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.taskCard} onPress={() => handleTareaPress(item)}>
                  <View style={styles.taskIcon}>
                    <IconSymbol name="doc.text.fill" size={20} color="#5b6bff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.taskTitle}>{item.titulo}</ThemedText>
                    <ThemedText style={styles.taskDesc}>{item.descripcion}</ThemedText>
                    <View style={styles.taskMeta}>
                      <IconSymbol name="star.fill" size={12} color="#5b6bff" />
                      <ThemedText style={styles.metaText}>{item.puntos_maximos} pts</ThemedText>
                      <View style={styles.metaDot} />
                      <IconSymbol name="calendar" size={12} color="#7a9aaa" />
                      <ThemedText style={styles.metaText}>
                        {new Date(item.fecha_entrega).toLocaleDateString()}
                      </ThemedText>
                    </View>
                  </View>
                  <IconSymbol name="chevron.right" size={18} color="#5b6bff" />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      {/* TAB: MIEMBROS */}
      {tabActivo === 'miembros' && (
        <View style={styles.tabContent}>
          {miembros.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol name="person" size={48} color="#5b6bff40" />
              <ThemedText style={styles.emptyText}>No hay miembros aún</ThemedText>
            </View>
          ) : (
            <ScrollView nestedScrollEnabled>
              {miembros.some(m => m.esProfesor) && (
                <>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionLine} />
                    <ThemedText style={styles.sectionTitle}>Profesor</ThemedText>
                    <View style={styles.sectionLine} />
                  </View>
                  {miembros.filter(m => m.esProfesor).map(m => (
                    <View key={m.id} style={[styles.miembroCard, styles.miembroCardProfesor]}>
                      <LinearGradient colors={['#ff6b6b', '#ee5a6f']} style={styles.miembroAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                        <ThemedText style={styles.miembroAvatarText}>{m.nombre[0]}</ThemedText>
                      </LinearGradient>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.miembroNombre}>{m.nombre} {m.apellido}</ThemedText>
                        <ThemedText style={styles.miembroCorreo}>{m.correo}</ThemedText>
                      </View>
                      <IconSymbol name="star.fill" size={16} color="#ff6b6b" />
                    </View>
                  ))}
                </>
              )}
              {miembros.some(m => !m.esProfesor) && (
                <>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionLine} />
                    <ThemedText style={styles.sectionTitle}>Alumnos</ThemedText>
                    <View style={styles.sectionLine} />
                  </View>
                  {miembros.filter(m => !m.esProfesor).map(m => (
                    <View key={m.id} style={styles.miembroCard}>
                      <LinearGradient colors={['#5b6bff', '#1AC952']} style={styles.miembroAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                        <ThemedText style={styles.miembroAvatarText}>{m.nombre[0]}</ThemedText>
                      </LinearGradient>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.miembroNombre}>{m.nombre} {m.apellido}</ThemedText>
                        <ThemedText style={styles.miembroCorreo}>{m.correo}</ThemedText>
                      </View>
                      {esProfesor && (
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleEliminarAlumno(m.id, `${m.nombre} ${m.apellido}`)}>
                          <IconSymbol name="person.badge.minus" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          )}
        </View>
      )}

      {/* TAB: ANUNCIOS */}
      {tabActivo === 'anuncios' && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
          <FlatList
            data={anuncios}
            keyExtractor={i => i.id}
            contentContainerStyle={styles.anunciosList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <IconSymbol name="megaphone" size={48} color="#5b6bff40" />
                <ThemedText style={styles.emptyText}>No hay anuncios aún</ThemedText>
              </View>
            }
            renderItem={({ item }) => {
              const esMio = item.autor_id === user?.id;
              const puedeEliminar = esProfesor || esMio;
              return (
                <View style={styles.anuncioCard}>
                  <View style={styles.anuncioHeader}>
                    <LinearGradient colors={['#5b6bff', '#1AC952']} style={styles.anuncioAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <ThemedText style={styles.anuncioAvatarText}>{item.autor_nombre?.[0] ?? 'U'}</ThemedText>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.anuncioAutor}>
                        {esMio ? `${item.autor_nombre} (Tú)` : item.autor_nombre}
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
              placeholderTextColor="#999"
              value={nuevoAnuncio}
              onChangeText={setNuevoAnuncio}
              multiline
            />
            <LinearGradient
              colors={nuevoAnuncio.trim() ? ['#5b6bff', '#1AC952'] : ['#e0e0e0', '#e0e0e0']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.sendBtnGradient}>
              <TouchableOpacity style={styles.sendBtn} disabled={enviandoAnuncio || !nuevoAnuncio.trim()} onPress={handlePublicarAnuncio}>
                {enviandoAnuncio
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <IconSymbol name="paperplane.fill" size={18} color="#fff" />}
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* TAB: RENDIMIENTO */}
      {tabActivo === 'rendimiento' && (
        <RendimientoTab
          claseId={claseId}
          tareasPorClase={tareasPorClase}
          miembros={miembros}
        />
      )}

      {/* MODAL: CREAR TAREA */}
      <Modal transparent animationType="slide" visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <LinearGradient colors={['#5b6bff', '#1AC952']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Crear Tarea</ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <IconSymbol name="xmark" size={22} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            <ScrollView style={styles.modalForm} keyboardShouldPersistTaps="handled">
              <ThemedText style={styles.label}>Título *</ThemedText>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Ejercicio de Álgebra"
                  placeholderTextColor="#999"
                  value={nuevoTituloTarea}
                  onChangeText={setNuevoTituloTarea}
                />
              </View>
              <ThemedText style={styles.label}>Descripción</ThemedText>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, { minHeight: 80 }]}
                  placeholder="Detalles de la tarea..."
                  placeholderTextColor="#999"
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
                  placeholderTextColor="#999"
                  value={nuevosPuntos}
                  onChangeText={setNuevosPuntos}
                  keyboardType="numeric"
                />
              </View>
              <ThemedText style={styles.label}>Fecha de entrega</ThemedText>
              <TouchableOpacity
                style={[styles.inputWrapper, { padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                onPress={() => setFechaPickerVisible(true)}>
                <ThemedText style={{ color: nuevaFecha ? '#1a3a4a' : '#999', fontSize: 15 }}>
                  {nuevaFecha ? new Date(nuevaFecha).toLocaleDateString() : 'Seleccionar fecha'}
                </ThemedText>
                <IconSymbol name="calendar" size={18} color="#5b6bff" />
              </TouchableOpacity>
              <ThemedText style={styles.label}>Archivo adjunto</ThemedText>
              <TouchableOpacity
                style={[styles.inputWrapper, { padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                onPress={pickDocument}>
                <ThemedText style={{ color: archivoNombre ? '#1a3a4a' : '#999', fontSize: 15 }} numberOfLines={1}>
                  {archivoNombre ?? 'Elegir archivo'}
                </ThemedText>
                <IconSymbol name="paperclip" size={18} color="#5b6bff" />
              </TouchableOpacity>
              <LinearGradient colors={['#5b6bff', '#1AC952']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.createBtnGradient}>
                <TouchableOpacity style={styles.createBtn} onPress={handleCrearTarea} disabled={creando}>
                  {creando ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.createBtnText}>Crear Tarea</ThemedText>}
                </TouchableOpacity>
              </LinearGradient>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* DateTimePicker */}
      {fechaPickerVisible && (
        <DateTimePicker
          value={nuevaFecha ? new Date(nuevaFecha) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
          minimumDate={new Date()}
          onChange={(_, selected) => {
            setFechaPickerVisible(false);
            if (selected) setNuevaFecha(selected.toISOString());
          }}
        />
      )}

      {/* MODAL: MENÚ OPCIONES */}
      <Modal transparent animationType="fade" visible={menuVisible} onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={handleVerCodigo}>
              <View style={[styles.menuItemIcon, { backgroundColor: '#f5f5f5' }]}>
                <IconSymbol name="key.fill" size={18} color="#5b6bff" />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.menuItemTitle}>Código de la clase</ThemedText>
                <ThemedText style={styles.menuItemSub}>{clase.codigo_acceso}</ThemedText>
              </View>
              <IconSymbol name="doc.on.doc" size={16} color="#5b6bff" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            {esProfesor && (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    setNuevaDescripcionClase(clase.materia || '');
                    setModalEditDescripcion(true);
                  }}>
                  <View style={[styles.menuItemIcon, { backgroundColor: '#e0f2ff' }]}>
                    <IconSymbol name="pencil" size={18} color="#5b6bff" />
                  </View>
                  <ThemedText style={styles.menuItemTitle}>Editar descripción</ThemedText>
                </TouchableOpacity>

                <View style={styles.menuDivider} />

                <TouchableOpacity style={styles.menuItem} onPress={handleEliminarClase}>
                  <View style={[styles.menuItemIcon, { backgroundColor: '#fff0f0' }]}>
                    <IconSymbol name="trash" size={18} color="#ef4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.menuItemTitle, { color: '#ef4444' }]}>Eliminar clase</ThemedText>
                    <ThemedText style={styles.menuItemSub}>Se eliminará de forma permanente</ThemedText>
                  </View>
                </TouchableOpacity>

                <View style={styles.menuDivider} />
              </>
            )}

            {!esProfesor && (
              <TouchableOpacity style={styles.menuItem} onPress={handleSalirClase}>
                <View style={[styles.menuItemIcon, { backgroundColor: '#fff0f0' }]}>
                  <IconSymbol name="rectangle.portrait.and.arrow.right" size={18} color="#ef4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.menuItemTitle, { color: '#ef4444' }]}>Salir de la clase</ThemedText>
                  <ThemedText style={styles.menuItemSub}>Dejarás de ver esta clase</ThemedText>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL: EDITAR DESCRIPCIÓN */}
      <Modal transparent animationType="slide" visible={modalEditDescripcion} onRequestClose={() => setModalEditDescripcion(false)}>
        <View style={styles.modalContainer}>
          <View style={[styles.descContainer, { width: '85%', maxHeight: 400, padding: 20 }]}>
            <ThemedText style={[styles.descTitle, { marginBottom: 16, fontSize: 16 }]}>
              Editar descripción de la clase
            </ThemedText>
            <TextInput
              style={[styles.descText, {
                borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 10,
                paddingHorizontal: 12, paddingVertical: 10,
                minHeight: 120, textAlignVertical: 'top', fontSize: 14, color: '#1a3a4a',
              }]}
              placeholder="Ej: Matemáticas Avanzadas - Semestre 2024"
              value={nuevaDescripcionClase}
              onChangeText={setNuevaDescripcionClase}
              multiline
              editable={!editandoDescripcion}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.cancelBtn, { flex: 1, paddingVertical: 12, backgroundColor: '#f5f5f5' }]}
                disabled={editandoDescripcion}
                onPress={() => setModalEditDescripcion(false)}>
                <ThemedText style={[styles.cancelBtnText, { color: '#1a3a4a' }]}>Cancelar</ThemedText>
              </TouchableOpacity>
              <LinearGradient colors={['#5b6bff', '#1AC952']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.createTaskGradient, { flex: 1 }]}>
                <TouchableOpacity
                  style={[styles.createTaskBtn, { paddingVertical: 12 }]}
                  disabled={editandoDescripcion}
                  onPress={async () => {
                    if (!nuevaDescripcionClase.trim()) { Alert.alert('Error', 'La descripción no puede estar vacía'); return; }
                    setEditandoDescripcion(true);
                    try {
                      const { error } = await supabase.from('clases').update({ materia: nuevaDescripcionClase.trim() }).eq('id', claseId);
                      if (error) throw error;
                      setClase(prev => (prev ? { ...prev, materia: nuevaDescripcionClase.trim() } : null));
                      setModalEditDescripcion(false);
                    } catch (e) { Alert.alert('Error', (e as Error).message); }
                    finally      { setEditandoDescripcion(false); }
                  }}>
                  {editandoDescripcion
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <ThemedText style={styles.createTaskBtnText}>Guardar</ThemedText>}
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

/* ───────────────────────── ESTILOS ───────────────────────── */
export const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 20, gap: 12 },
  backBtn:         { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.25)' },
  menuBtn:         { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.25)' },
  claseName:       { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  classCode:       { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  infoBar:         { flexDirection: 'row', marginHorizontal: 16, marginVertical: 12, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1.5, borderColor: '#e0e0e0' },
  infoItem:        { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText:        { fontSize: 12, fontWeight: '500', color: '#1a3a4a' },
  descContainer:   { marginHorizontal: 16, marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#e0e0e0' },
  descTitle:       { fontSize: 13, fontWeight: '600', color: '#5b6bff', marginBottom: 6 },
  descText:        { fontSize: 14, color: '#1a3a4a', lineHeight: 20 },
  tabsContainer:   { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 12, borderWidth: 1.5, borderColor: '#e0e0e0', overflow: 'hidden' },
  tab:             { flex: 1, alignItems: 'center', paddingVertical: 11 },
  tabActive:       { backgroundColor: 'rgba(91,107,255,0.15)' },
  tabText:         { fontSize: 13, color: '#7a9aaa' },
  tabTextActive:   { color: '#5b6bff', fontWeight: '700' },
  tabContent:      { flex: 1, paddingHorizontal: 16 },
  createTaskGradient: { borderRadius: 12, marginBottom: 12 },
  createTaskBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13 },
  createTaskBtnText:{ color: '#fff', fontWeight: 'bold', fontSize: 14 },
  taskCard:        { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 16, borderWidth: 1.5, borderColor: '#e0e0e0', paddingHorizontal: 14, paddingVertical: 14, marginBottom: 12, gap: 12, shadowColor: '#5b6bff', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  taskIcon:        { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
  taskTitle:       { fontSize: 15, fontWeight: '600', color: '#1a3a4a', marginBottom: 4 },
  taskDesc:        { fontSize: 13, color: '#7a9aaa', marginBottom: 6 },
  taskMeta:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:        { fontSize: 11, color: '#7a9aaa' },
  metaDot:         { width: 3, height: 3, borderRadius: 2, backgroundColor: '#e0e0e0', marginHorizontal: 4 },
  emptyContainer:  { alignItems: 'center', paddingVertical: 40 },
  emptyText:       { marginTop: 12, color: '#7a9aaa', fontSize: 15 },
  miembroCard:         { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginVertical: 8, paddingVertical: 12, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  miembroCardProfesor: { backgroundColor: 'rgba(255,107,107,0.08)', borderColor: '#ff6b6b' },
  miembroAvatar:       { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  miembroAvatarText:   { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  miembroNombre:       { fontSize: 15, fontWeight: '600', color: '#1a3a4a' },
  miembroCorreo:       { fontSize: 12, color: '#7a9aaa', marginTop: 4 },
  sectionHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 12, marginVertical: 16, gap: 12 },
  sectionLine:         { flex: 1, height: 1.5, backgroundColor: '#5b6bff' },
  sectionTitle:        { fontSize: 16, fontWeight: '700', color: '#5b6bff', paddingHorizontal: 8, letterSpacing: 0.5 },
  deleteBtn:           { padding: 6 },
  anunciosList:        { paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  anuncioCard:         { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 16, borderWidth: 1.5, borderColor: '#e0e0e0', padding: 14, shadowColor: '#5b6bff', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  anuncioHeader:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  anuncioAvatar:       { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  anuncioAvatarText:   { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  anuncioAutor:        { fontSize: 13, fontWeight: '600', color: '#1a3a4a' },
  anuncioFecha:        { fontSize: 11, color: '#7a9aaa', marginTop: 1 },
  anuncioContenido:    { fontSize: 14, color: '#1a3a4a', lineHeight: 20 },
  inputAnuncioContainer:{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#e0e0e0', backgroundColor: 'rgba(255,255,255,0.9)', gap: 8 },
  inputAnuncio:        { flex: 1, backgroundColor: '#f5f5f5', borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: '#1a3a4a', maxHeight: 100 },
  sendBtnGradient:     { width: 42, height: 42, borderRadius: 21 },
  sendBtn:             { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  modalContainer:      { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  modalContent:        { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', overflow: 'hidden' },
  modalHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18 },
  modalTitle:          { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalForm:           { paddingHorizontal: 20, paddingBottom: 30 },
  label:               { color: '#7a9aaa', fontSize: 11, letterSpacing: 0.8, marginTop: 16, marginBottom: 8 },
  inputWrapper:        { backgroundColor: '#f5f5f5', borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12 },
  input:               { paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1a3a4a' },
  createBtnGradient:   { borderRadius: 14, marginTop: 24, marginBottom: 20 },
  createBtn:           { height: 52, justifyContent: 'center', alignItems: 'center' },
  createBtnText:       { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  menuOverlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 110, paddingRight: 16 },
  menuCard:            { backgroundColor: '#fff', borderRadius: 16, minWidth: 240, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, overflow: 'hidden' },
  menuItem:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuItemIcon:        { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuItemTitle:       { fontSize: 15, fontWeight: '600', color: '#1a3a4a' },
  menuItemSub:         { fontSize: 12, color: '#7a9aaa', marginTop: 2 },
  menuDivider:         { height: 1, backgroundColor: '#f0f4f6', marginHorizontal: 16 },
  cancelBtn:           { borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText:       { fontSize: 15, fontWeight: '600' },
});