import { supabase } from '@/config/supabase';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './auth-context';

// 1. Limpiamos la interfaz removiendo por completo la propiedad 'miembros'
export interface Clase {
  id: string;
  codigo_acceso: string;
  nombre_clase: string;
  materia: string;
  profesor_id: string;
  fecha_creacion?: string;
}

interface ClassContextType {
  clases: Clase[];
  loading: boolean;
  crearClase: (nombre: string, materia: string) => Promise<string>;
  unirseClase: (codigo: string) => Promise<void>;
  salirClase: (claseId: string) => Promise<void>;
  obtenerMisClases: () => Promise<Clase[]>;
}

const ClassContext = createContext<ClassContextType | undefined>(undefined);

export function ClassProvider({ children }: { children: ReactNode }) {
  const [clases, setClases] = useState<Clase[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      cargarClases();
    } else {
      setClases([]);
    }
  }, [user]);

  // LEER CLASES (Filtra basándose únicamente en la tabla relacional 'inscripciones')
  const cargarClases = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: inscripciones, error: errorInsc } = await supabase
        .from('inscripciones')
        .select('clase_id')
        .eq('estudiante_id', user.id);

      if (errorInsc) throw errorInsc;

      const claseIds = inscripciones ? inscripciones.map((item) => item.clase_id) : [];

      const { data, error } = await supabase
        .from('clases')
        .select('*');

      if (error) throw error;

      // Un usuario ve la clase si es el profesor o si está inscrito (alumno)
      const misClases = (data as Clase[]).filter(
        (clase) => clase.profesor_id === user.id || claseIds.includes(clase.id)
      );

      setClases(misClases);
    } catch (error) {
      console.error('Error cargando clases:', error);
    } finally {
      setLoading(false);
    }
  };

  const generarCodigo = (): string => {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 6; i++) {
      codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return codigo;
  };

  // CREAR CLASE
  const crearClase = async (nombre: string, materia: string): Promise<string> => {
    try {
      console.log('📚 crearClase iniciado', { nombre, materia, userId: user?.id });
      if (!user) throw new Error('Usuario no autenticado');

      let codigo = generarCodigo();
      let codigoExistente = true;

      while (codigoExistente) {
        const { data } = await supabase
          .from('clases')
          .select('codigo_acceso')
          .eq('codigo_acceso', codigo)
          .maybeSingle();
        
        if (!data) {
          codigoExistente = false;
        } else {
          codigo = generarCodigo();
        }
      }

      console.log('🔑 Código generado:', codigo);

      // Insertamos la clase sin mandar ningún campo 'miembros'
      const { data: nuevaClase, error } = await supabase
        .from('clases')
        .insert([
          {
            codigo_acceso: codigo,
            nombre_clase: nombre.trim(),
            materia: materia.trim(),
            profesor_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('❌ Error inserting clase:', error);
        throw error;
      }

      console.log('✅ Clase insertada:', nuevaClase);

      if (nuevaClase) {
        // Vinculamos al profesor en la tabla inscripciones por consistencia escolar
        await supabase.from('inscripciones').insert([
          {
            clase_id: nuevaClase.id,
            estudiante_id: user.id,
          },
        ]);

        setClases((clasesActuales) => [...clasesActuales, nuevaClase as Clase]);
      }

      return codigo;
    } catch (error: any) {
      console.error('💥 Exception en crearClase:', error.message);
      Alert.alert('Error', error.message || 'No se pudo crear la clase');
      throw error;
    }
  };

  // UNIRSE A CLASE
  const unirseClase = async (codigo_acceso: string) => {
    try {
      if (!user) throw new Error('Usuario no autenticado');

      const { data: clase, error: fetchError } = await supabase
        .from('clases')
        .select('*')
        .eq('codigo_acceso', codigo_acceso.trim().toUpperCase())
        .maybeSingle();

      if (fetchError || !clase) {
        throw new Error('Código de clase inválido');
      }

      const { data: yaInscrito } = await supabase
        .from('inscripciones')
        .select('*')
        .eq('clase_id', clase.id)
        .eq('estudiante_id', user.id)
        .maybeSingle();

      if (yaInscrito) {
        throw new Error('Ya estás unido a esta clase');
      }

      // La inscripción ahora es una inserción pura en la tabla relacional
      const { error: insertError } = await supabase
        .from('inscripciones')
        .insert([
          {
            clase_id: clase.id,
            estudiante_id: user.id,
          },
        ]);

      if (insertError) throw insertError;

      await cargarClases();
      Alert.alert('Éxito', `Te has unido a: ${clase.nombre_clase}`);

    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo unir a la clase');
      throw error;
    }
  };

  // SALIR DE CLASE
  const salirClase = async (claseId: string) => {
    try {
      if (!user) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('inscripciones')
        .delete()
        .eq('clase_id', claseId)
        .eq('estudiante_id', user.id);

      if (error) throw error;

      setClases((clasesActuales) => clasesActuales.filter((c) => c.id !== claseId));
      Alert.alert('Éxito', 'Has salido de la clase correctamente');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo salir de la clase');
      throw error;
    }
  };

  // OBTENER MIS CLASES DIRECTO
  const obtenerMisClases = async (): Promise<Clase[]> => {
    if (!user) return [];
    try {
      const { data: inscripciones } = await supabase
        .from('inscripciones')
        .select('clase_id')
        .eq('estudiante_id', user.id);

      const claseIds = inscripciones ? inscripciones.map((item) => item.clase_id) : [];

      const { data } = await supabase.from('clases').select('*');
      if (!data) return [];

      return (data as Clase[]).filter(
        (clase) => clase.profesor_id === user.id || claseIds.includes(clase.id)
      );
    } catch (error) {
      console.error('Error en obtenerMisClases:', error);
      return [];
    }
  };

  return (
    <ClassContext.Provider
      value={{
        clases,
        loading,
        crearClase,
        unirseClase,
        salirClase,
        obtenerMisClases,
      }}>
      {children}
    </ClassContext.Provider>
  );
}

export function useClases() {
  const context = useContext(ClassContext);
  if (context === undefined) {
    throw new Error('useClases debe ser usado dentro de ClassProvider');
  }
  return context;
}