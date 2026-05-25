/* ─────────────────────────  task-context.tsx  ─────────────────────────
   Contexto global para la gestión de tareas y entregas
   (versión completa con columnas `archivo_guia_url` y `creador_id`)
──────────────────────────────────────────────────────────────────────── */

import { supabase } from '@/config/supabase';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Alert } from 'react-native';
import { useAuth } from './auth-context';

/* ────────────────  Tipos  ──────────────── */
export interface Tarea {
  id: string;
  clase_id: string;
  titulo: string;
  descripcion: string;
  puntos_maximos: number;
  fecha_entrega: string;
  creador_id: string;           // ← antes era profesor_id
  created_at?: string;
  archivo_guia_url?: string;    // URL pública del material adjunto
}

export interface Entrega {
  id: string;
  tarea_id: string;
  estudiante_id: string;
  estado: 'pendiente' | 'entregado' | 'calificado';
  archivo_guia_url?: string;
  nombre_archivo?: string;
  fecha_entrega?: string;
  calificacion?: number;
  comentario_profesor?: string;
}

export interface Comentario {
  id: string;
  entrega_id: string;
  autor_id: string;
  autor_nombre: string;
  contenido: string;
  fecha_creacion: string;
}

/* ────────────────  Contexto  ──────────────── */
interface TaskContextType {
  tareas: Tarea[];
  loading: boolean;

  crearTarea: (
    claseId: string,
    titulo: string,
    descripcion: string,
    puntosMaximos: number,
    fechaEntrega: string,
    archivoUri?: string,
    archivoNombre?: string,
  ) => Promise<void>;

  eliminarTarea: (tareaId: string) => Promise<void>;
  obtenerTareasPorClase: (claseId: string) => Promise<Tarea[]>;

  entregarTarea: (
    tareaId: string,
    estudianteId: string,
    archivoUri: string,
    nombreArchivo: string,
  ) => Promise<void>;

  obtenerEntrega: (
    tareaId: string,
    estudianteId: string,
  ) => Promise<Entrega | null>;

  calificarEntrega: (
    entregaId: string,
    calificacion: number,
    comentario: string,
  ) => Promise<void>;

  anularEntrega: (tareaId: string, estudianteId: string) => Promise<void>;
  eliminarArchivo: (tareaId: string, estudianteId: string) => Promise<void>;

  agregarComentario: (
    entregaId: string,
    autorId: string,
    autorNombre: string,
    contenido: string,
  ) => Promise<void>;

  obtenerComentarios: (entregaId: string) => Promise<Comentario[]>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

/* ────────────────  Provider  ──────────────── */
export function TaskProvider({ children }: { children: ReactNode }) {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  /* Cargar todas las tareas del usuario logueado */
  useEffect(() => {
    if (user) cargarTareas();
  }, [user]);

  const cargarTareas = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('tareas').select('*');
      if (error) throw error;
      setTareas((data as Tarea[]) ?? []);
    } catch (err) {
      console.error('Error cargando tareas:', err);
    } finally {
      setLoading(false);
    }
  };

  /* ────────────────  Crear tarea  ──────────────── */
  const crearTarea: TaskContextType['crearTarea'] = async (
    claseId,
    titulo,
    descripcion,
    puntosMaximos,
    fechaEntrega,
    archivoUri,
    archivoNombre,
  ) => {
    try {
      if (!user) throw new Error('Usuario no autenticado');

      /* 1. Subir archivo guía (si se seleccionó uno) */
      let publicUrl: string | null = null;

      if (archivoUri && archivoNombre) {
  const path = `${claseId}/${Date.now()}_${archivoNombre}`;

  // ✅ Leer el archivo como base64 y convertirlo a ArrayBuffer
  const response = await fetch(archivoUri);
  const arrayBuffer = await response.arrayBuffer();

  const { error: upErr } = await supabase.storage
    .from('entregas')
    .upload(path, arrayBuffer, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'application/octet-stream',
    });
  if (upErr) throw upErr;

  const { data: pub } = await supabase.storage
    .from('entregas')
    .getPublicUrl(path);

  publicUrl = pub?.publicUrl ?? null;
}

      /* 2. Insertar la fila en la tabla `tareas` */
      const { data, error } = await supabase
        .from('tareas')
        .insert([
          {
            clase_id        : claseId,
            titulo          : titulo.trim(),
            descripcion     : descripcion.trim(),
            puntos_maximos  : puntosMaximos,
            fecha_entrega   : fechaEntrega,
            creador_id      : user.id,     // ← columna correcta
            archivo_guia_url: publicUrl,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      if (data) setTareas(prev => [...prev, data as Tarea]);

      Alert.alert('✓ Éxito', 'Tarea creada correctamente');
    } catch (err: any) {
      console.error('Error creando tarea:', err?.message ?? err);
      throw err; // se captura arriba en la pantalla
    }
  };

  /* ────────────────  Eliminar tarea  ──────────────── */
  const eliminarTarea = async (tareaId: string) => {
    try {
      const { error } = await supabase.from('tareas').delete().eq('id', tareaId);
      if (error) throw error;
      setTareas(prev => prev.filter(t => t.id !== tareaId));
      Alert.alert('✓ Éxito', 'Tarea eliminada');
    } catch (err) {
      throw err;
    }
  };

  /* ────────────────  Obtener tareas por clase  ──────────────── */
  const obtenerTareasPorClase = async (claseId: string) => {
    try {
      const { data, error } = await supabase
        .from('tareas')
        .select('*')
        .eq('clase_id', claseId);
      if (error) throw error;
      return (data as Tarea[]) ?? [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  /* ────────────────  Entregar tarea  ──────────────── */
  const entregarTarea: TaskContextType['entregarTarea'] = async (
    tareaId,
    estudianteId,
    archivoUri,
    nombreArchivo,
  ) => {
    try {
      const path = `${tareaId}/${estudianteId}_${Date.now()}_${nombreArchivo}`;
      const blob = await (await fetch(archivoUri)).blob();

      const { error: upErr } = await supabase.storage
        .from('entregas')
        .upload(path, blob, {
          upsert: true,
          contentType: blob.type || 'application/octet-stream',
        });
      if (upErr) throw upErr;

      const { data: pub } = await supabase.storage
        .from('entregas')
        .getPublicUrl(path);
      const publicUrl = pub?.publicUrl;

      /* ¿Existe una entrega previa? */
      const { data: existente } = await supabase
        .from('entregas')
        .select('id')
        .eq('tarea_id', tareaId)
        .eq('estudiante_id', estudianteId)
        .maybeSingle();

      if (existente) {
        const { error } = await supabase
          .from('entregas')
          .update({
            archivo_guia_url: publicUrl,
            nombre_archivo  : nombreArchivo,
            fecha_entrega   : new Date().toISOString(),
            estado          : 'entregado',
          })
          .eq('id', existente.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('entregas').insert([
          {
            tarea_id        : tareaId,
            estudiante_id   : estudianteId,
            archivo_guia_url: publicUrl,
            nombre_archivo  : nombreArchivo,
            fecha_entrega   : new Date().toISOString(),
            estado          : 'entregado',
          },
        ]);
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Error entregando tarea:', err?.message ?? err);
      throw err;
    }
  };

  /* ────────────────  Obtener entrega  ──────────────── */
  const obtenerEntrega = async (
    tareaId: string,
    estudianteId: string,
  ): Promise<Entrega | null> => {
    try {
      const { data, error } = await supabase
        .from('entregas')
        .select('*')
        .eq('tarea_id', tareaId)
        .eq('estudiante_id', estudianteId)
        .maybeSingle();
      if (error) throw error;
      return (data as Entrega) ?? null;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  /* ────────────────  Calificar entrega  ──────────────── */
  const calificarEntrega = async (
    entregaId: string,
    calificacion: number,
    comentario: string,
  ) => {
    try {
      const { error } = await supabase
        .from('entregas')
        .update({
          calificacion,
          comentario_profesor: comentario,
          estado: 'calificado',
        })
        .eq('id', entregaId);
      if (error) throw error;
      Alert.alert('✓ Éxito', 'Entrega calificada');
    } catch (err) {
      throw err;
    }
  };

  /* ────────────────  Anular entrega  ──────────────── */
  const anularEntrega = async (tareaId: string, estudianteId: string) => {
    try {
      const { error } = await supabase
        .from('entregas')
        .update({
          estado            : null,
          archivo_guia_url  : null,
          nombre_archivo    : null,
          fecha_entrega     : null,
          calificacion      : null,
          comentario_profesor: null,
        })
        .eq('tarea_id', tareaId)
        .eq('estudiante_id', estudianteId);
      if (error) throw error;
      Alert.alert('✓ Éxito', 'Entrega anulada');
    } catch (err) {
      throw err;
    }
  };

  /* ────────────────  Eliminar archivo  ──────────────── */
  const eliminarArchivo = async (tareaId: string, estudianteId: string) => {
    try {
      const { error } = await supabase
        .from('entregas')
        .update({
          archivo_guia_url: null,
          nombre_archivo  : null,
          estado          : null,
        })
        .eq('tarea_id', tareaId)
        .eq('estudiante_id', estudianteId);
      if (error) throw error;
      Alert.alert('✓ Éxito', 'Archivo eliminado');
    } catch (err) {
      throw err;
    }
  };

  /* ────────────────  Comentarios  ──────────────── */
  const agregarComentario = async (
    entregaId: string,
    autorId: string,
    autorNombre: string,
    contenido: string,
  ) => {
    try {
      const { error } = await supabase.from('comentarios').insert([
        {
          entrega_id : entregaId,
          autor_id   : autorId,
          autor_nombre: autorNombre,
          contenido,
          fecha_creacion: new Date().toISOString(),
        },
      ]);
      if (error) throw error;
      Alert.alert('✓ Éxito', 'Comentario agregado');
    } catch (err) {
      throw err;
    }
  };

  const obtenerComentarios = async (entregaId: string) => {
    try {
      const { data, error } = await supabase
        .from('comentarios')
        .select('*')
        .eq('entrega_id', entregaId)
        .order('fecha_creacion', { ascending: false });
      if (error) throw error;
      return (data as Comentario[]) ?? [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  /* ────────────────  Exponer contexto  ──────────────── */
  return (
    <TaskContext.Provider
      value={{
        tareas,
        loading,
        crearTarea,
        eliminarTarea,
        obtenerTareasPorClase,
        entregarTarea,
        obtenerEntrega,
        calificarEntrega,
        anularEntrega,
        eliminarArchivo,
        agregarComentario,
        obtenerComentarios,
      }}>
      {children}
    </TaskContext.Provider>
  );
}

/* ────────────────  Hook  ──────────────── */
export function useTareas() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTareas debe usarse dentro de TaskProvider');
  return ctx;
}