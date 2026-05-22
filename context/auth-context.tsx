import { supabase } from '@/config/supabase';
import React, { createContext, ReactNode, useContext, useState } from 'react';
import { Alert } from 'react-native';

// Definimos la estructura del usuario basada en las columnas reales de tu tabla
interface User {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  expo_push_token?: string | null;
  recordatorio_frecuencia?: string | null;
  recordatorio_intervalo_horas?: number | null;
  hora_preferida?: number | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (correo: string, contraseña: string) => Promise<void>;
  registro: (nombre: string, apellido: string, correo: string, contraseña: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false); // No requiere carga inicial compleja en este flujo

  // INICIAR SESIÓN (Buscando directamente en la tabla con .eq)
  const login = async (correo: string, contraseña: string) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', correo.trim())
        .eq('password', contraseña.trim())
        .single(); // Trae un solo objeto en lugar de un array

      if (error || !data) {
        Alert.alert('Error', 'Correo o contraseña incorrectos');
        return;
      }

      // Guardamos en el estado global el usuario con todos sus campos de la tabla
      setUser({
        id: data.id,
        nombre: data.nombre,
        apellido: data.apellido,
        correo: data.email,
        expo_push_token: data.expo_push_token,
        recordatorio_frecuencia: data.recordatorio_frecuencia,
        recordatorio_intervalo_horas: data.recordatorio_intervalo_horas,
        hora_preferida: data.hora_preferida,
      });

    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Error al conectar con el servidor');
    }
  };

  // REGISTRAR NUEVO USUARIO (Insertando directamente en la tabla usuarios)
  const registro = async (
    nombre: string,
    apellido: string,
    correo: string,
    contraseña: string
  ) => {
    try {
      // 1. Primero verificamos si el correo ya existe en tu tabla para evitar duplicados
      const { data: existe } = await supabase
        .from('usuarios')
        .select('email')
        .eq('email', correo.trim())
        .maybeSingle();

      if (existe) {
        Alert.alert('Error', 'Este correo ya está registrado');
        return;
      }

      // 2. Insertamos el nuevo renglón con los campos obligatorios
      const { data: nuevosDatos, error } = await supabase
        .from('usuarios')
        .insert([
          {
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            email: correo.trim(),
            password: contraseña.trim(),
            recordatorio_frecuencia: 'diario',
            recordatorio_intervalo_horas: 24,
          },
        ])
        .select() // Le pedimos a Supabase que nos devuelva el registro creado (incluyendo su ID autogenerado)
        .single();

      if (error) throw error;

      // 3. Logeo automático: guardamos el usuario recién creado en el estado de la app
      if (nuevosDatos) {
        setUser({
          id: nuevosDatos.id,
          nombre: nuevosDatos.nombre,
          apellido: nuevosDatos.apellido,
          correo: nuevosDatos.email,
          recordatorio_frecuencia: nuevosDatos.recordatorio_frecuencia,
          recordatorio_intervalo_horas: nuevosDatos.recordatorio_intervalo_horas,
        });
        Alert.alert('Éxito', '¡Usuario registrado correctamente!');
      }

    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'No se pudo completar el registro');
    }
  };

  // CERRAR SESIÓN
  const logout = async () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, registro, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
}