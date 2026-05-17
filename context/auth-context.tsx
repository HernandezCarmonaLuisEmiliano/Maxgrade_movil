import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
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
  const [loading, setLoading] = useState(true);

  // Verificar si hay usuario guardado al iniciar
  useEffect(() => {
    const checkUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('currentUser');
        if (userData) {
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const login = async (correo: string, contraseña: string) => {
    try {
      // Obtener todos los usuarios registrados
      const usersJson = await AsyncStorage.getItem('users');
      const users = usersJson ? JSON.parse(usersJson) : [];

      // Buscar usuario con correo y contraseña
      const foundUser = users.find(
        (u: any) => u.correo === correo && u.contraseña === contraseña
      );

      if (!foundUser) {
        throw new Error('Correo o contraseña incorrectos');
      }

      // Guardar usuario actual
      const currentUser = {
        id: foundUser.id,
        nombre: foundUser.nombre,
        apellido: foundUser.apellido,
        correo: foundUser.correo,
      };

      await AsyncStorage.setItem('currentUser', JSON.stringify(currentUser));
      setUser(currentUser);
    } catch (error) {
      throw error;
    }
  };

  const registro = async (
    nombre: string,
    apellido: string,
    correo: string,
    contraseña: string
  ) => {
    try {
      // Obtener usuarios existentes
      const usersJson = await AsyncStorage.getItem('users');
      const users = usersJson ? JSON.parse(usersJson) : [];

      // Verificar si el correo ya existe
      if (users.some((u: any) => u.correo === correo)) {
        throw new Error('Este correo ya está registrado');
      }

      // Crear nuevo usuario
      const newUser = {
        id: Date.now().toString(),
        nombre,
        apellido,
        correo,
        contraseña,
      };

      users.push(newUser);
      await AsyncStorage.setItem('users', JSON.stringify(users));

      // Hacer login automático
      const currentUser = {
        id: newUser.id,
        nombre: newUser.nombre,
        apellido: newUser.apellido,
        correo: newUser.correo,
      };

      await AsyncStorage.setItem('currentUser', JSON.stringify(currentUser));
      setUser(currentUser);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('currentUser');
      setUser(null);
    } catch (error) {
      console.error('Error logout:', error);
    }
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
