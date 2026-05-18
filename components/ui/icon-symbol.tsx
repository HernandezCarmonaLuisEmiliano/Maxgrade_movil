// Fallback for using MaterialIcons on Android and web.
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolView, SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, Platform, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * Todos los iconos de MaxGrade mapeados correctamente para Android:
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
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
  'plus.circle': 'add-circle-outline',
  'plus.circle.fill': 'add-circle',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle | ViewStyle>;
  weight?: SymbolWeight;
}) {
  // 1. Si en el futuro lo corres en iOS, usará SF Symbols de Apple
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        weight={weight}
        tintColor={color as string}
        resizeMode="scaleAspectFit"
        name={name}
        style={[
          {
            width: size,
            height: size,
          },
          style as StyleProp<ViewStyle>,
        ]}
      />
    );
  }

  // 2. Al estar en Android, buscará su equivalente en MaterialIcons
  const androidIconName = MAPPING[name] || 'help-outline';

  return (
    <MaterialIcons 
      color={color} 
      size={size} 
      name={androidIconName} 
      style={style as StyleProp<TextStyle>} 
    />
  );
}