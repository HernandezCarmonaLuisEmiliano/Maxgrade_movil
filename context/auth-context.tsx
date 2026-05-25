/* ────────────────  auth-context.tsx  ──────────────── */
import { supabase } from '@/config/supabase';
import React, {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useState,
} from 'react';
import { Alert } from 'react-native';

/* ──────────────────────────────────────────
 *  Tipos
 * ────────────────────────────────────────── */
export interface User {
  id: string;
  nombre: string;
  apellido: string;
  email: string;                       // ← tu tabla tiene «email»
  avatar_url?: string | null;
  expo_push_token?: string | null;
  recordatorio_frecuencia?: string | null;
  recordatorio_intervalo_horas?: number | null;
  hora_preferida?: number | null;
}

export interface AuthContextType {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;   // 👈 ahora expuesto
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  registro: (
    nombre: string,
    apellido: string,
    email: string,
    password: string
  ) => Promise<void>;
  editarPerfil: (payload: {
    nombre?: string;
    apellido?: string;
    email?: string;
    avatarUri?: string;
  }) => Promise<void>;
  borrarCuenta: () => Promise<void>;
  logout: () => Promise<void>;
}

/* ───────────────  Contexto  ─────────────── */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ────────── helper: subir avatar a Storage ────────── */
async function uploadAvatar(uri: string, userId: string): Promise<string> {
  const bucket = supabase.storage.from('avatars');
  const path   = `${userId}/${Date.now()}.jpg`;
  const blob   = await fetch(uri).then(r => r.blob());

  const { error } = await bucket.upload(path, blob, { upsert: true });
  if (error) throw error;

  const { publicUrl } = bucket.getPublicUrl(path).data;
  return publicUrl;
}

/* ─────────────  Provider  ───────────── */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  /* ---------- LOGIN ---------- */
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email.trim())
        .eq('password', password.trim())
        .single();

      if (error || !data) {
        Alert.alert('Error', 'Correo o contraseña incorrectos');
        return;
      }

      setUser({
        id: data.id,
        nombre: data.nombre,
        apellido: data.apellido,
        email: data.email,
        avatar_url: data.avatar_url,
        expo_push_token: data.expo_push_token,
        recordatorio_frecuencia: data.recordatorio_frecuencia,
        recordatorio_intervalo_horas: data.recordatorio_intervalo_horas,
        hora_preferida: data.hora_preferida,
      });
    } catch {
      Alert.alert('Error', 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  /* ---------- REGISTRO ---------- */
  const registro = async (nombre: string, apellido: string, email: string, password: string) => {
    try {
      setLoading(true);

      const { data: dup } = await supabase
        .from('usuarios')
        .select('email')
        .eq('email', email.trim())
        .maybeSingle();

      if (dup) {
        Alert.alert('Error', 'Este correo ya está registrado');
        return;
      }

      const { data, error } = await supabase
        .from('usuarios')
        .insert([
          {
            nombre   : nombre.trim(),
            apellido : apellido.trim(),
            email    : email.trim(),
            password : password.trim(),
            recordatorio_frecuencia     : 'diario',
            recordatorio_intervalo_horas: 24,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setUser({
        id: data.id,
        nombre: data.nombre,
        apellido: data.apellido,
        email: data.email,
      });
      Alert.alert('✓ Éxito', '¡Usuario registrado!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo registrar');
    } finally {
      setLoading(false);
    }
  };

  /* ---------- EDITAR PERFIL ---------- */
  const editarPerfil = async (updates: {
    nombre?: string;
    apellido?: string;
    email?: string;
    avatarUri?: string;
  }) => {
    try {
      if (!user) throw new Error('Usuario no autenticado');

      let avatar_url = user.avatar_url;
      if (updates.avatarUri) {
        avatar_url = await uploadAvatar(updates.avatarUri, user.id);
      }

      const { data, error } = await supabase
        .from('usuarios')
        .update({
          nombre  : updates.nombre   ?? user.nombre,
          apellido: updates.apellido ?? user.apellido,
          email   : updates.email    ?? user.email,
          avatar_url,
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      /* refleja cambios en estado */
      setUser(prev => prev ? {
        ...prev,
        nombre : data.nombre,
        apellido: data.apellido,
        email  : data.email,
        avatar_url,
      } : prev);

      Alert.alert('✓ Éxito', 'Perfil actualizado');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo actualizar el perfil');
    }
  };

  /* ---------- BORRAR CUENTA ---------- */
  const borrarCuenta = async () => new Promise<void>((resolve) => {
    Alert.alert(
      'Eliminar cuenta',
      'Esta acción es irreversible. ¿Deseas continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text : 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user) throw new Error('Usuario no autenticado');

              await supabase.from('inscripciones').delete().eq('estudiante_id', user.id);
              await supabase.from('entregas').delete().eq('estudiante_id', user.id);
              const { error } = await supabase.from('usuarios').delete().eq('id', user.id);
              if (error) throw error;

              setUser(null);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'No se pudo eliminar la cuenta');
            } finally {
              resolve();
            }
          },
        },
      ]
    );
  });

  /* ---------- LOGOUT ---------- */
  const logout = async () => setUser(null);

  /* ---------- Provider ---------- */
  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,           // 👈 ahora disponible en los consumidores
        loading,
        login,
        registro,
        editarPerfil,
        borrarCuenta,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

/* ───────────────  Hook  ─────────────── */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}