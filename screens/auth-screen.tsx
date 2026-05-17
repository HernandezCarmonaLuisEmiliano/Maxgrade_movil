import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LoginScreen } from './login-screen';
import { SignupScreen } from './signup-screen';

export function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isLogin ? (
        <LoginScreen onSignUp={() => setIsLogin(false)} />
      ) : (
        <SignupScreen onLogin={() => setIsLogin(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
