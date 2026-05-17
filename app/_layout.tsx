import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { ClassProvider } from '@/context/class-context';
import { TaskProvider } from '@/context/task-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthScreen } from '@/screens/auth-screen';
import { ActivityIndicator, View } from 'react-native';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const { user, loading } = useAuth();
  const colors = Colors[colorScheme ?? 'light'];

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {user ? (
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="create-class"
            options={{ presentation: 'modal', headerShown: false, animationEnabled: true }}
          />
          <Stack.Screen
            name="join-class"
            options={{ presentation: 'modal', headerShown: false, animationEnabled: true }}
          />
          <Stack.Screen
            name="class-detail"
            options={{ headerShown: false, animationEnabled: true }}
          />
          <Stack.Screen
            name="task-detail"
            options={{ headerShown: false, animationEnabled: true }}
          />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
      ) : (
        <AuthScreen />
      )}
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ClassProvider>
        <TaskProvider>
          <RootLayoutContent />
        </TaskProvider>
      </ClassProvider>
    </AuthProvider>
  );
}
