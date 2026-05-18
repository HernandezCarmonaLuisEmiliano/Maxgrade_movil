import { supabase } from '@/config/supabase';
import { useAuth } from '@/context/auth-context';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    registrarToken();
  }, [user]);

  async function registrarToken() {
    if (!Device.isDevice) return; // no funciona en simulador

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'TU_PROJECT_ID', // 👈 lo encuentras en app.json -> expo.extra.eas.projectId
    });

    // Guardar en Supabase
    await supabase
      .from('usuarios')
      .update({ expo_push_token: tokenData.data })
      .eq('id', user!.id);
  }
}