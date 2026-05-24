import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export function HelloWave() {
  // Creamos un valor compartido para controlar la rotación (empieza en 0 grados)
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Cuando el componente se monta, ejecutamos la animación en bucle
    rotation.value = withRepeat(
      withSequence(
        withTiming(25, { duration: 150 }), // Rota 25 grados a la derecha
        withTiming(0, { duration: 150 })   // Regresa a 0 grados
      ),
      4, // Cantidad de veces que se repite el saludo (4 ciclos)
      true // Al terminar, regresa suavemente a la posición inicial
    );
  }, []);

  // Vinculamos el valor de la rotación directamente al estilo transform de React Native
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.Text style={[styles.text, animatedStyle]}>
      👋
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 28,
    lineHeight: 32,
    marginTop: -6,
  },
});
