import { supabase } from '@/config/supabase';
import React, {
  createContext,
  ReactNode,
  useContext,
  useState
} from 'react';
import { Alert } from 'react-native';

/* ──────────────────────────────────────────────────────────────────────────
 *  Tipado de los registros y del contexto
 * ─────────────────────────────────────────────────────────────────────── */
export interface User {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  avatar_url?: string | null;
  expo_push_token?: string | null;
  recordatorio_frecuencia?: string | null;
  recordatorio_intervalo_horas?: number | null;
  hora_preferida?: number | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (correo: string, contraseña: string) => Promise<void>;
  registro: (
    nombre: string,
    apellido: string,
    correo: string,
    contraseña: string
  ) => Promise<void>;
  editarPerfil: (payload: {
    nombre?: string;
    apellido?: string;
    correo?: string;
    avatarUri?: string;
  }) => Promise<void>;
  borrarCuenta: () => Promise<void>;
  logout: () => Promise<void>;
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Creación del contexto
 * ─────────────────────────────────────────────────────────────────────── */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ──────────────────────────────────────────────────────────────────────────
 *  Helper: subir imagen a Storage → devuelve URL pública
 * ─────────────────────────────────────────────────────────────────────── */
async function uploadAvatar(uri: string, userId: string): Promise<string> {
  // Asegúrate de haber creado en Supabase un bucket "avatars" (lectura pública)
  const bucket = supabase.storage.from('avatars');
  const path = `${userId}/${Date.now()}.jpg`;

  // Convertimos la URI local a blob
  const blob = await fetch(uri).then((r) => r.blob());

  const { error } = await bucket.upload(path, blob, {
    upsert: true,
  });
  if (error) throw error;

  const { publicUrl } = bucket.getPublicUrl(path).data;
  return publicUrl;
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Provider
 * ─────────────────────────────────────────────────────────────────────── */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  /* ── LOGIN ──────────────────────────────────────────────────────────── */
  const login = async (correo: string, contraseña: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', correo.trim())
        .eq('password', contraseña.trim())
        .single();

      if (error || !data) {
        Alert.alert('Error', 'Correo o contraseña incorrectos');
        return;
      }

      setUser({
        id: data.id,
        nombre: data.nombre,
        apellido: data.apellido,
        correo: data.email,
        avatar_url: data.avatar_url,
        expo_push_token: data.expo_push_token,
        recordatorio_frecuencia: data.recordatorio_frecuencia,
        recordatorio_intervalo_horas: data.recordatorio_intervalo_horas,
        hora_preferida: data.hora_preferida,
      });
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  /* ── REGISTRO ───────────────────────────────────────────────────────── */
  const registro = async (
    nombre: string,
    apellido: string,
    correo: string,
    contraseña: string
  ) => {
    try {
      setLoading(true);
      // Verificar duplicados
      const { data: existe } = await supabase
        .from('usuarios')
        .select('email')
        .eq('email', correo.trim())
        .maybeSingle();

      if (existe) {
        Alert.alert('Error', 'Este correo ya está registrado');
        return;
      }

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
        .select()
        .single();

      if (error) throw error;

      setUser({
        id: nuevosDatos.id,
        nombre: nuevosDatos.nombre,
        apellido: nuevosDatos.apellido,
        correo: nuevosDatos.email,
      });
      Alert.alert('Éxito', '¡Usuario registrado correctamente!');
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message || 'No se pudo completar el registro');
    } finally {
      setLoading(false);
    }
  };

  /* ── EDITAR PERFIL ──────────────────────────────────────────────────── */
  const editarPerfil = async (updates: {
    nombre?: string;
    apellido?: string;
    correo?: string;
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
          nombre: updates.nombre ?? user.nombre,
          apellido: updates.apellido ?? user.apellido,
          email: updates.correo ?? user.correo,
          avatar_url,
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setUser({
        ...user,
        nombre: data.nombre,
        apellido: data.apellido,
        correo: data.email,
        avatar_url,
      });
      Alert.alert('✓ Éxito', 'Perfil actualizado');
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message || 'No se pudo actualizar el perfil');
    }
  };

  /* ── BORRAR CUENTA ──────────────────────────────────────────────────── */
  const borrarCuenta = async () => {
    return new Promise<void>((resolve) => {
      Alert.alert(
        'Eliminar cuenta',
        'Esta acción es irreversible. ¿Deseas continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              try {
                if (!user) throw new Error('Usuario no autenticado');

                /* Elimina dependencias críticas.  Añade tablas según necesidad */
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
  };

  /* ── LOGOUT ─────────────────────────────────────────────────────────── */
  const logout = async () => {
    setUser(null);
  };

  /* ── Mantener sesión en futuras versiones (opcional) ──────────────── */
  // Aquí podrías checar AsyncStorage o Supabase Auth para sesión persistente

  return (
    <AuthContext.Provider
      value={{ user, loading, login, registro, editarPerfil, borrarCuenta, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Hook de conveniencia
 * ─────────────────────────────────────────────────────────────────────── */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
