import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth-context';

export interface Clase {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  creador: string;
  fechaCreacion: string;
  miembros: string[];
}

interface ClassContextType {
  clases: Clase[];
  crearClase: (nombre: string, descripcion: string) => Promise<string>;
  unirseClase: (codigo: string) => Promise<void>;
  salirClase: (claseId: string) => Promise<void>;
  obtenerMisClases: () => Promise<Clase[]>;
}

const ClassContext = createContext<ClassContextType | undefined>(undefined);

export function ClassProvider({ children }: { children: ReactNode }) {
  const [clases, setClases] = useState<Clase[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      cargarClases();
    }
  }, [user]);

  const cargarClases = async () => {
    try {
      const clasesJson = await AsyncStorage.getItem('clases');
      const todasLasClases = clasesJson ? JSON.parse(clasesJson) : [];

      // Filtrar clases donde el usuario es miembro o creador
      const misClases = todasLasClases.filter(
        (clase: Clase) =>
          clase.creador === user?.id || clase.miembros.includes(user?.id || '')
      );

      setClases(misClases);
    } catch (error) {
      console.error('Error cargando clases:', error);
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

  const crearClase = async (nombre: string, descripcion: string): Promise<string> => {
    try {
      if (!user) throw new Error('Usuario no autenticado');

      const clasesJson = await AsyncStorage.getItem('clases');
      const todasLasClases = clasesJson ? JSON.parse(clasesJson) : [];

      let codigo = generarCodigo();
      // Verificar que el código sea único
      while (todasLasClases.some((c: Clase) => c.codigo === codigo)) {
        codigo = generarCodigo();
      }

      const nuevaClase: Clase = {
        id: Date.now().toString(),
        codigo,
        nombre,
        descripcion,
        creador: user.id,
        fechaCreacion: new Date().toISOString(),
        miembros: [user.id],
      };

      todasLasClases.push(nuevaClase);
      await AsyncStorage.setItem('clases', JSON.stringify(todasLasClases));
      setClases([...clases, nuevaClase]);

      return codigo;
    } catch (error) {
      throw error;
    }
  };

  const unirseClase = async (codigo: string) => {
    try {
      if (!user) throw new Error('Usuario no autenticado');

      const clasesJson = await AsyncStorage.getItem('clases');
      const todasLasClases = clasesJson ? JSON.parse(clasesJson) : [];

      const clase = todasLasClases.find((c: Clase) => c.codigo === codigo);

      if (!clase) {
        throw new Error('Código de clase inválido');
      }

      if (clase.miembros.includes(user.id)) {
        throw new Error('Ya eres miembro de esta clase');
      }

      clase.miembros.push(user.id);
      await AsyncStorage.setItem('clases', JSON.stringify(todasLasClases));
      setClases([...clases, clase]);
    } catch (error) {
      throw error;
    }
  };

  const salirClase = async (claseId: string) => {
    try {
      if (!user) throw new Error('Usuario no autenticado');

      const clasesJson = await AsyncStorage.getItem('clases');
      const todasLasClases = clasesJson ? JSON.parse(clasesJson) : [];

      const clase = todasLasClases.find((c: Clase) => c.id === claseId);

      if (clase) {
        clase.miembros = clase.miembros.filter((id: string) => id !== user.id);

        // Si no hay miembros y el usuario es el creador, eliminar la clase
        if (clase.miembros.length === 0 && clase.creador === user.id) {
          const index = todasLasClases.indexOf(clase);
          todasLasClases.splice(index, 1);
        }

        await AsyncStorage.setItem('clases', JSON.stringify(todasLasClases));
        setClases(clases.filter((c) => c.id !== claseId));
      }
    } catch (error) {
      throw error;
    }
  };

  const obtenerMisClases = async (): Promise<Clase[]> => {
    try {
      const clasesJson = await AsyncStorage.getItem('clases');
      const todasLasClases = clasesJson ? JSON.parse(clasesJson) : [];

      return todasLasClases.filter(
        (clase: Clase) =>
          clase.creador === user?.id || clase.miembros.includes(user?.id || '')
      );
    } catch (error) {
      console.error('Error obteniendo clases:', error);
      return [];
    }
  };

  return (
    <ClassContext.Provider
      value={{
        clases,
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
