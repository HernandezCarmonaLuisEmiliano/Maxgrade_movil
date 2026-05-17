import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth-context';

export interface Tarea {
  id: string;
  clase_id: string;
  titulo: string;
  descripcion: string;
  puntos_maximos: number;
  fecha_entrega: string;
  profesor_id: string;
  created_at?: string;
}

export interface Entrega {
  id: string;
  tarea_id: string;
  estudiante_id: string;
  estado: 'pendiente' | 'entregado' | 'calificado';
  archivo_url?: string;
  nombre_archivo?: string;
  fecha_entrega?: string;
  calificacion?: number;
  comentarios_profesor?: string;
}

export interface Comentario {
  id: string;
  entrega_id: string;
  autor_id: string;
  autor_nombre: string;
  contenido: string;
  fecha_creacion: string;
}

interface TaskContextType {
  tareas: Tarea[];
  loading: boolean;
  crearTarea: (claseId: string, titulo: string, descripcion: string, puntosMaximos: number, fechaEntrega: string) => Promise<void>;
  eliminarTarea: (tareaId: string) => Promise<void>;
  obtenerTareasPorClase: (claseId: string) => Promise<Tarea[]>;
  entregarTarea: (tareaId: string, estudianteId: string, archivo: string, nombreArchivo: string) => Promise<void>;
  obtenerEntrega: (tareaId: string, estudianteId: string) => Promise<Entrega | null>;
  calificarEntrega: (entregaId: string, calificacion: number, comentario: string) => Promise<void>;
  anularEntrega: (tareaId: string, estudianteId: string) => Promise<void>;
  eliminarArchivo: (tareaId: string, estudianteId: string) => Promise<void>;
  agregarComentario: (entregaId: string, autorId: string, autorNombre: string, contenido: string) => Promise<void>;
  obtenerComentarios: (entregaId: string) => Promise<Comentario[]>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      cargarTareas();
    }
  }, [user]);

  const cargarTareas = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('tareas')
        .select('*');

      if (error) throw error;
      setTareas((data as Tarea[]) || []);
    } catch (error) {
      console.error('Error cargando tareas:', error);
    } finally {
      setLoading(false);
    }
  };

  const crearTarea = async (
    claseId: string,
    titulo: string,
    descripcion: string,
    puntosMaximos: number,
    fechaEntrega: string
  ) => {
    try {
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('tareas')
        .insert([
          {
            clase_id: claseId,
            titulo: titulo.trim(),
            descripcion: descripcion.trim(),
            puntos_maximos: puntosMaximos,
            fecha_entrega: fechaEntrega,
            profesor_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setTareas([...tareas, data as Tarea]);
      }

      Alert.alert('Éxito', 'Tarea creada correctamente');
    } catch (error: any) {
      console.error('Error creando tarea:', error.message);
      throw error;
    }
  };

  const eliminarTarea = async (tareaId: string) => {
    try {
      const { error } = await supabase
        .from('tareas')
        .delete()
        .eq('id', tareaId);

      if (error) throw error;

      setTareas(tareas.filter((t) => t.id !== tareaId));
      Alert.alert('Éxito', 'Tarea eliminada');
    } catch (error: any) {
      throw error;
    }
  };

  const obtenerTareasPorClase = async (claseId: string): Promise<Tarea[]> => {
    try {
      const { data, error } = await supabase
        .from('tareas')
        .select('*')
        .eq('clase_id', claseId);

      if (error) throw error;
      return (data as Tarea[]) || [];
    } catch (error) {
      console.error('Error obteniendo tareas:', error);
      return [];
    }
  };

  const entregarTarea = async (
    tareaId: string,
    estudianteId: string,
    archivo: string,
    nombreArchivo: string
  ) => {
    try {
      // Verificar si ya existe una entrega
      const { data: entregaExistente } = await supabase
        .from('entregas')
        .select('id')
        .eq('tarea_id', tareaId)
        .eq('estudiante_id', estudianteId)
        .maybeSingle();

      if (entregaExistente) {
        // Actualizar entrega existente
        const { error } = await supabase
          .from('entregas')
          .update({
            archivo_url: archivo,
            nombre_archivo: nombreArchivo,
            fecha_entrega: new Date().toISOString(),
            estado: 'entregado',
          })
          .eq('id', entregaExistente.id);

        if (error) throw error;
      } else {
        // Crear nueva entrega
        const { error } = await supabase
          .from('entregas')
          .insert([
            {
              tarea_id: tareaId,
              estudiante_id: estudianteId,
              estado: 'entregado',
              archivo_url: archivo,
              nombre_archivo: nombreArchivo,
              fecha_entrega: new Date().toISOString(),
            },
          ]);

        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Error entregando tarea:', error.message);
      throw error;
    }
  };

  const obtenerEntrega = async (
    tareaId: string,
    estudianteId: string
  ): Promise<Entrega | null> => {
    try {
      const { data, error } = await supabase
        .from('entregas')
        .select('*')
        .eq('tarea_id', tareaId)
        .eq('estudiante_id', estudianteId)
        .maybeSingle();

      if (error) throw error;
      return (data as Entrega) || null;
    } catch (error) {
      console.error('Error obteniendo entrega:', error);
      return null;
    }
  };

  const calificarEntrega = async (
    entregaId: string,
    calificacion: number,
    comentario: string
  ) => {
    try {
      const { error } = await supabase
        .from('entregas')
        .update({
          calificacion,
          comentarios_profesor: comentario,
          estado: 'calificado',
        })
        .eq('id', entregaId);

      if (error) throw error;
      Alert.alert('Éxito', 'Tarea calificada correctamente');
    } catch (error: any) {
      throw error;
    }
  };

  const anularEntrega = async (tareaId: string, estudianteId: string) => {
    try {
      const { error } = await supabase
        .from('entregas')
        .update({
          estado: 'pendiente',
          archivo_url: null,
          nombre_archivo: null,
          fecha_entrega: null,
        })
        .eq('tarea_id', tareaId)
        .eq('estudiante_id', estudianteId);

      if (error) throw error;
      Alert.alert('Éxito', 'Entrega anulada');
    } catch (error: any) {
      throw error;
    }
  };

  const eliminarArchivo = async (tareaId: string, estudianteId: string) => {
    try {
      const { error } = await supabase
        .from('entregas')
        .update({
          archivo_url: null,
          nombre_archivo: null,
          estado: 'pendiente',
        })
        .eq('tarea_id', tareaId)
        .eq('estudiante_id', estudianteId);

      if (error) throw error;
      Alert.alert('Éxito', 'Archivo eliminado');
    } catch (error: any) {
      throw error;
    }
  };

  const agregarComentario = async (
    entregaId: string,
    autorId: string,
    autorNombre: string,
    contenido: string
  ) => {
    try {
      const { error } = await supabase
        .from('comentarios')
        .insert([
          {
            entrega_id: entregaId,
            autor_id: autorId,
            autor_nombre: autorNombre,
            contenido,
            fecha_creacion: new Date().toISOString(),
          },
        ]);

      if (error) throw error;
      Alert.alert('Éxito', 'Comentario agregado');
    } catch (error: any) {
      throw error;
    }
  };

  const obtenerComentarios = async (entregaId: string): Promise<Comentario[]> => {
    try {
      const { data, error } = await supabase
        .from('comentarios')
        .select('*')
        .eq('entrega_id', entregaId)
        .order('fecha_creacion', { ascending: true });

      if (error) throw error;
      return (data as Comentario[]) || [];
    } catch (error) {
      console.error('Error obteniendo comentarios:', error);
      return [];
    }
  };

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

export function useTareas() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTareas debe ser usado dentro de TaskProvider');
  }
  return context;
}
