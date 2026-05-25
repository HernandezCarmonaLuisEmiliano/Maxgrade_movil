/* ────────────────  task-context.tsx  ──────────────── */
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

/* ────────────────────  Tipos  ──────────────────── */
export interface Tarea {
  id: string;
  clase_id: string;
  titulo: string;
  descripcion: string;
  puntos_maximos: number;
  fecha_entrega: string;
  creador_id: string;
  created_at?: string;
  archivo_guia_url?: string | null;
}

export interface Entrega {
  id: string;
  tarea_id: string;
  estudiante_id: string;
  estado: 'pendiente' | 'entregado' | 'calificado';
  archivo_entrega_url?: string | null;
  fecha_envio?: string | null;
  calificacion?: number | null;
  /** último comentario dejado por el profesor */
  comentario_profesor?: string | null;
  /** último comentario dejado por el alumno */
  comentario_alumno?: string | null;
}

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
    archivoUri: string | null,
    nombreArchivo: string | null,
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

  /** agrega o actualiza el comentario del alumno */
  agregarComentarioAlumno: (entregaId: string, contenido: string) => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

/* ────────────────────  Provider  ──────────────────── */
export function TaskProvider({ children }: { children: ReactNode }) {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  /* Cargar todas las tareas una vez autenticado */
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

  /* ────────────────  CRUD TAREAS  ──────────────── */
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

      let publicUrl: string | null = null;

      /* 1) Subir archivo guía (opcional) */
      if (archivoUri && archivoNombre) {
        const path = `${claseId}/${Date.now()}_${archivoNombre}`;
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

      /* 2) Insertar tarea */
      const { data, error } = await supabase
        .from('tareas')
        .insert([
          {
            clase_id: claseId,
            titulo: titulo.trim(),
            descripcion: descripcion.trim(),
            puntos_maximos: puntosMaximos,
            fecha_entrega: fechaEntrega,
            creador_id: user.id,
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
      throw err;
    }
  };

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

  /* ────────────────  ENTREGAS  ──────────────── */
  const entregarTarea: TaskContextType['entregarTarea'] = async (
    tareaId,
    estudianteId,
    archivoUri,
    nombreArchivo,
  ) => {
    try {
      let publicUrl: string | null = null;

      /* 1) subir archivo del alumno (opcional) */
      if (archivoUri && nombreArchivo) {
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
        publicUrl = pub?.publicUrl ?? null;
      }

      /* 2) insertar o actualizar entrega */
      const { data: existente } = await supabase
        .from('entregas')
        .select('id')
        .eq('tarea_id', tareaId)
        .eq('estudiante_id', estudianteId)
        .maybeSingle();

      const payload = {
        archivo_entrega_url: publicUrl,
        fecha_envio: new Date().toISOString(),
        estado: 'entregado' as const,
      };

      if (existente) {
        const { error } = await supabase
          .from('entregas')
          .update(payload)
          .eq('id', existente.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('entregas').insert([
          {
            tarea_id: tareaId,
            estudiante_id: estudianteId,
            ...payload,
          },
        ]);
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Error entregando tarea:', err?.message ?? err);
      throw err;
    }
  };

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

  const anularEntrega = async (tareaId: string, estudianteId: string) => {
    try {
      const { error } = await supabase
        .from('entregas')
        .update({
          estado: null,
          archivo_entrega_url: null,
          fecha_envio: null,
          calificacion: null,
          comentario_profesor: null,
          comentario_alumno: null,
        })
        .eq('tarea_id', tareaId)
        .eq('estudiante_id', estudianteId);
      if (error) throw error;
      Alert.alert('✓ Éxito', 'Entrega anulada');
    } catch (err) {
      throw err;
    }
  };

  const eliminarArchivo = async (tareaId: string, estudianteId: string) => {
    try {
      const { error } = await supabase
        .from('entregas')
        .update({
          archivo_entrega_url: null,
          estado: null,
        })
        .eq('tarea_id', tareaId)
        .eq('estudiante_id', estudianteId);
      if (error) throw error;
      Alert.alert('✓ Éxito', 'Archivo eliminado');
    } catch (err) {
      throw err;
    }
  };

  /* ────────────────  Comentario Alumno  ──────────────── */
  const agregarComentarioAlumno = async (
    entregaId: string,
    contenido: string,
  ) => {
    try {
      const { error } = await supabase
        .from('entregas')
        .update({ comentario_alumno: contenido })
        .eq('id', entregaId);
      if (error) throw error;
      Alert.alert('✓ Éxito', 'Comentario enviado');
    } catch (err) {
      throw err;
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
        agregarComentarioAlumno,
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