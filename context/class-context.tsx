/* ───────────────────────────── class-context.tsx ─────────────────────────────
 *  Contexto central de clases – versión “extendida” con comentarios completos.
 *  Se añaden:
 *    • removeClaseFromList(id) – para sacar una clase del estado local al instante
 *    • Salida/borrado de clase llaman a ese helper para que la lista se actualice
 * --------------------------------------------------------------------------- */
import { supabase } from '@/config/supabase';
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Alert } from 'react-native';
import { useAuth } from './auth-context';

/* ─────────────────── Tipos ─────────────────── */
export interface Clase {
  id: string;
  codigo_acceso: string;
  nombre_clase: string;
  materia: string | null;
  profesor_id: string;
  fecha_creacion?: string | null;
}

interface ClassContextType {
  clases: Clase[];
  loading: boolean;
  crearClase: (nombre: string, materia: string) => Promise<string>;
  unirseClase: (codigo: string) => Promise<void>;
  salirClase: (claseId: string) => Promise<void>;
  obtenerMisClases: () => Promise<Clase[]>;
  /* helper para refrescar UI local sin volver a consultar BD */
  removeClaseFromList: (claseId: string) => void;
}

const ClassContext = createContext<ClassContextType | undefined>(undefined);

/* ─────────────────── Provider ─────────────────── */
export function ClassProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [clases, setClases] = useState<Clase[]>([]);
  const [loading, setLoading] = useState(false);

  /* Cargar de inicio y cuando cambie el usuario */
  useEffect(() => {
    if (user) cargarClases();
    else setClases([]);
  }, [user]);

  /* ─────────── Helpers internos ─────────── */
  const generarCodigo = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  /** Quita una clase del estado local (para refrescar lista sin ir al backend) */
  const removeClaseFromList = (claseId: string) =>
    setClases(prev => prev.filter(c => c.id !== claseId));

  /* ─────────── CRUD ─────────── */

  /** Lee todas las clases donde soy profesor o estoy inscrito */
  const cargarClases = async () => {
    if (!user) return;
    setLoading(true);
    try {
      /* ids donde estoy inscrito */
      const { data: insc, error: errInsc } = await supabase
        .from('inscripciones')
        .select('clase_id')
        .eq('estudiante_id', user.id);

      if (errInsc) throw errInsc;
      const idsInsc = insc?.map(i => i.clase_id) ?? [];

      const { data: clasesRaw, error } = await supabase.from('clases').select('*');
      if (error) throw error;

      const misClases = (clasesRaw as Clase[]).filter(
        c => c.profesor_id === user.id || idsInsc.includes(c.id),
      );
      setClases(misClases);
    } catch (e) {
      console.error('Error cargando clases:', e);
      Alert.alert('Error', 'No se pudieron cargar las clases');
    } finally {
      setLoading(false);
    }
  };

  /** Crea una clase y devuelve el código de acceso */
  const crearClase = async (nombre: string, materia: string): Promise<string> => {
    if (!user) throw new Error('Usuario no autenticado');

    /* Generar un código único */
    let codigo = generarCodigo();
    while (
      (await supabase
        .from('clases')
        .select('id')
        .eq('codigo_acceso', codigo)
        .maybeSingle()).data
    ) {
      codigo = generarCodigo();
    }

    const { data: clase, error } = await supabase
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

    if (error) throw error;

    /* inscribimos al propio profesor */
    await supabase.from('inscripciones').insert([
      { clase_id: clase.id, estudiante_id: user.id },
    ]);

    setClases(prev => [...prev, clase as Clase]);
    return codigo;
  };

  /** Unirse a una clase por código */
  const unirseClase = async (codigo: string) => {
    if (!user) throw new Error('Usuario no autenticado');

    const { data: clase } = await supabase
      .from('clases')
      .select('*')
      .eq('codigo_acceso', codigo.trim().toUpperCase())
      .single();

    if (!clase) throw new Error('Código de clase inválido');

    const ya = await supabase
      .from('inscripciones')
      .select('id')
      .eq('clase_id', clase.id)
      .eq('estudiante_id', user.id)
      .maybeSingle();

    if (ya.data) throw new Error('Ya estás unido a esta clase');

    const { error } = await supabase
      .from('inscripciones')
      .insert([{ clase_id: clase.id, estudiante_id: user.id }]);
    if (error) throw error;

    setClases(p => [...p, clase as Clase]);
    Alert.alert('✓ Éxito', 'Te has unido a la clase');
  };

  /** Salir de la clase (alumno) o quitarse si es profe pero quiere ocultarla) */
  const salirClase = async (claseId: string) => {
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await supabase
      .from('inscripciones')
      .delete()
      .eq('clase_id', claseId)
      .eq('estudiante_id', user.id);

    if (error) throw error;

    removeClaseFromList(claseId);
    Alert.alert('✓ Éxito', 'Has salido de la clase');
  };

  /** Para pantallas que quieran forzar refresh manual */
  const obtenerMisClases = async (): Promise<Clase[]> => {
    await cargarClases();
    return clases;
  };

  /* ─────────── Render provider ─────────── */
  return (
    <ClassContext.Provider
      value={{
        clases,
        loading,
        crearClase,
        unirseClase,
        salirClase,
        obtenerMisClases,
        removeClaseFromList,
      }}>
      {children}
    </ClassContext.Provider>
  );
}

/* ─────────── Hook de conveniencia ─────────── */
export function useClases() {
  const ctx = useContext(ClassContext);
  if (!ctx) throw new Error('useClases debe usarse dentro de ClassProvider');
  return ctx;
}