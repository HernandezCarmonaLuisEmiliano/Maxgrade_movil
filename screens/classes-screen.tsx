import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useClases } from '@/context/class-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFocusEffect as useNavFocusEffect } from '@react-navigation/native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';

interface ClasseCardProps {
  clase: any;
  onPress: () => void;
  colorScheme: 'light' | 'dark';
}

function ClasseCard({ clase, onPress, colorScheme }: ClasseCardProps) {
    
  const colors = Colors[(colorScheme ?? 'light') as keyof typeof Colors];

  return (
    <TouchableOpacity
      style={[styles.cardContainer, { backgroundColor: '#FFFFFF' + '08', borderColor: colors.tint }]}
      onPress={onPress}>
      <View>
        <ThemedText style={styles.cardTitle} type="defaultSemiBold">
          {clase.nombre}
        </ThemedText>
        <ThemedText style={styles.cardDesc}>{clase.descripcion}</ThemedText>
        <ThemedText style={styles.cardCode}>Código: {clase.codigo}</ThemedText>
        <ThemedText style={styles.cardMembers}>{clase.miembros.length} miembros</ThemedText>
      </View>
      <IconSymbol name="chevron.right" size={24} color={colors.tint} />
    </TouchableOpacity>
  );
}

interface ClassesScreenProps {
  onCreateClass: () => void;
  onJoinClass: () => void;
}

export function ClassesScreen({ onCreateClass, onJoinClass }: ClassesScreenProps) {
  const [loading, setLoading] = useState(false);
  const { user, logout } = useAuth();
  const { clases, obtenerMisClases } = useClases();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useNavFocusEffect(
    React.useCallback(() => {
      cargarClases();
    }, [])
  );

  const cargarClases = async () => {
    setLoading(true);
    try {
      await obtenerMisClases();
    } catch (error) {
      console.error('Error cargando clases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro que deseas cerrar sesión?', [
      { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
      {
        text: 'Sí',
        onPress: async () => {
          await logout();
        },
        style: 'destructive',
      },
    ]);
  };

  const handleClassPress = (clase: any) => {
    // Aquí puedes navegar a la pantalla de detalles de la clase
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.tint + '20' }]}>
        <View>
          <ThemedText type="title">Mis Clases</ThemedText>
          <ThemedText style={styles.greeting}>
            {user?.nombre} {user?.apellido}
          </ThemedText>
        </View>
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: colors.text + '08' }]}
          onPress={handleLogout}>
          <IconSymbol name="power" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.tint, flex: 1, marginRight: 10 }]}
          onPress={onCreateClass}>
          <IconSymbol name="plus.circle.fill" size={20} color="#fff" />
          <ThemedText style={styles.actionButtonText}>Crear Clase</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.tint + '40', flex: 1 }]}
          onPress={onJoinClass}>
          <IconSymbol name="plus.circle" size={20} color={colors.tint} />
          <ThemedText style={[styles.actionButtonText, { color: colors.tint }]}>Unirse</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Classes List */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : clases.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="book.closed" size={48} color={colors.tint + '40'} />
          <ThemedText style={styles.emptyText}>No tienes clases aún</ThemedText>
          <ThemedText style={styles.emptySubtext}>Crea una nueva o únete con un código</ThemedText>
        </View>
      ) : (
        <FlatList
          data={clases}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ClasseCard clase={item} onPress={() => handleClassPress(item)} colorScheme={colorScheme ?? 'light'} />
          )}
          contentContainerStyle={styles.listContainer}
          scrollEnabled={true}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  greeting: {
    opacity: 0.7,
    fontSize: 14,
    marginTop: 4,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cardContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 8,
  },
  cardCode: {
    fontSize: 12,
    opacity: 0.5,
    marginBottom: 2,
  },
  cardMembers: {
    fontSize: 12,
    opacity: 0.5,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 8,
  },
});
