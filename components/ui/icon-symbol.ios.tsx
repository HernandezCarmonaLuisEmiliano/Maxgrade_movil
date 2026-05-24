import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolView, SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { Platform, StyleProp, TextStyle, ViewStyle } from 'react-native';

// Mapeo de nombres de SF Symbols a MaterialIcons para Android
const MAPPED_SYMBOLS = {
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'plus.circle.fill': 'add-circle',
  'plus.circle': 'add-circle-outline',
  'power': 'power-settings-new',
  'book.closed': 'menu-book',
  'star.fill': 'star',
  'calendar': 'calendar-today',
  'checkmark.circle.fill': 'check-circle',
  'clock.fill': 'access-time',
  'doc.badge.plus': 'note-add',
  'arrow.clockwise': 'refresh',
  'xmark.circle': 'cancel',
  'doc.fill': 'insert-drive-file',
  'trash': 'delete',
  'person.fill': 'person',
  'pencil.circle': 'pending-actions',
  'xmark': 'close',
  'lock.fill': 'lock',
} as Partial<Record<SymbolViewProps['name'], React.ComponentProps<typeof MaterialIcons>['name']>>;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: {
  name: SymbolViewProps['name'];
  size?: number;
  color: string;
  // 🌟 CAMBIO AQUÍ: Permitimos que acepte estilos tanto de texto como de contenedor
  style?: StyleProp<TextStyle | ViewStyle>;
  weight?: SymbolWeight;
}) {
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        weight={weight}
        tintColor={color}
        resizeMode="scaleAspectFit"
        name={name}
        style={[
          {
            width: size,
            height: size,
          },
          // Forzamos temporalmente el casteo a ViewStyle solo para iOS porque SymbolView lo requiere
          style as StyleProp<ViewStyle>,
        ]}
      />
    );
  }

  const androidIconName = MAPPED_SYMBOLS[name] || 'help-outline';

  return (
    <MaterialIcons
      name={androidIconName}
      size={size}
      color={color}
      // Forzamos el casteo a TextStyle para que MaterialIcons sepa procesar el estilo sin quejarse
      style={style as StyleProp<TextStyle>}
    />
  );
}
