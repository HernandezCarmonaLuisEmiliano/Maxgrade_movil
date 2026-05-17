import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4'; // El azul que estás usando para destacar

export const Colors = {
  light: {
    text: '#11181C',          // Texto principal oscuro (pizarra)
    background: '#F8FAFC',    // Fondo general gris ultra-claro (muy limpio para listas)
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    // Duplicamos exactamente los mismos colores claros en el nodo "dark"
    // Así, si el sistema operativo está en modo oscuro, tu app seguirá pintándose clara.
    text: '#11181C',          
    background: '#F8FAFC',    
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
};

// Mantenemos tus fuentes intactas
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});