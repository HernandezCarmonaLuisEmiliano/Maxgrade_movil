import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/config/supabase';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { Clase, useClases } from '@/context/class-context';
import { useTareas } from '@/context/task-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export function ClassDetailScreen() {
  const router = useRouter();
  const { claseId } = useLocalSearchParams<{ claseId: string }>();
  const { user } = useAuth();
  const { clases } = useClases();
  const { crearTarea } = useTareas();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [clase, setClase] = useState<Clase | null>(null);
  const [tareasPorClase, setTareasPorClase] = useState<any[]>([]);
  const [miembrosCount, setMiembrosCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [esProfesor, setEsProfesor] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [nuevoTituloTarea, setNuevoTituloTarea] = useState('');
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [nuevosPuntos, setNuevosPuntos] = useState('100');
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    if (claseId) {
      cargarClase();
    }
  }, [claseId]);

  const cargarClase = async () => {
    setLoading(true);
    try {
      const claseEncontrada = clases.find((c) => c.id === claseId);
      if (claseEncontrada) {
        setClase(claseEncontrada);
        setEsProfesor(claseEncontrada.creador === user?.id);

        // Cargar tareas de esta clase desde Supabase
        const { data: tareas } = await supabase
          .from('tareas')
          .select('*')
          .eq('clase_id', claseId);
        setTareasPorClase(tareas || []);

        // Cargar cantidad de miembros (inscritos en la clase)
        const { data: inscritos } = await supabase
          .from('inscripciones')
          .select('id')
          .eq('clase_id', claseId);
        setMiembrosCount((inscritos || []).length);
      }
    } catch (error) {
      console.error('Error cargando clase:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearTarea = async () => {
    if (!nuevoTituloTarea.trim()) {
      Alert.alert('Error', 'Ingresa el título de la tarea');
      return;
    }

    setCreando(true);
    try {
      await crearTarea(
        claseId,
        nuevoTituloTarea,
        nuevaDescripcion,
        parseInt(nuevosPuntos) || 100,
        nuevaFecha || new Date().toISOString()
      );

      setNuevoTituloTarea('');
      setNuevaDescripcion('');
      setNuevosPuntos('100');
      setNuevaFecha('');
      setModalVisible(false);
      await cargarClase();
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setCreando(false);
    }
  };

  const handleTareaPress = (tarea: any) => {
    router.push({
      pathname: '/task-detail',
      params: {
        tareaId: tarea.id,
        claseId: tarea.clase_id,
        esProfesor: esProfesor.toString(),
      },
    });
  };

  if (loading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  if (!clase) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText>Clase no encontrada</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.tint }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={[styles.claseName, { color: '#fff' }]} type="title">
            {clase.nombre}
          </ThemedText>
          <ThemedText style={[styles.classCode, { color: 'rgba(255,255,255,0.8)' }]}>
            Código: {clase.codigo}
          </ThemedText>
        </View>
      </View>

      {/* Info Bar */}
      <View style={[styles.infoBar, { backgroundColor: colors.tint + '10', borderBottomColor: colors.tint + '20' }]}>
        <View style={styles.infoItem}>
          <IconSymbol name="doc.text.fill" size={16} color={colors.tint} />
          <ThemedText style={styles.infoText}>{tareasPorClase.length} tareas</ThemedText>
        </View>
        <View style={styles.infoItem}>
          <IconSymbol name="person.2.fill" size={16} color={colors.tint} />
          <ThemedText style={styles.infoText}>{miembrosCount} miembros</ThemedText>
        </View>
      </View>

      {/* Descripción */}
      <View style={styles.descContainer}>
        <ThemedText style={styles.descTitle} type="defaultSemiBold">
          Descripción
        </ThemedText>
        <ThemedText style={styles.descText}>{clase.descripcion || 'Sin descripción'}</ThemedText>
      </View>

      {/* Profesor Actions */}
      {esProfesor && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.createTaskBtn, { backgroundColor: colors.tint }]}
            onPress={() => setModalVisible(true)}>
            <IconSymbol name="plus.circle.fill" size={20} color="#fff" />
            <ThemedText style={styles.createTaskBtnText}>Crear Tarea</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Tasks List */}
      <View style={styles.tasksContainer}>
        <ThemedText style={styles.tasksTitle} type="subtitle">
          Tareas
        </ThemedText>

        {tareasPorClase.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol name="doc.text" size={48} color={colors.tint + '40'} />
            <ThemedText style={styles.emptyText}>No hay tareas aún</ThemedText>
          </View>
        ) : (
          <FlatList
            data={tareasPorClase}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.taskCard, { borderColor: colors.tint + '30' }]}
                onPress={() => handleTareaPress(item)}>
                <View style={[styles.taskIcon, { backgroundColor: colors.tint + '20' }]}>
                  <IconSymbol name="doc.text.fill" size={20} color={colors.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.taskTitle} type="defaultSemiBold">
                    {item.titulo}
                  </ThemedText>
                  <ThemedText style={styles.taskDesc}>{item.descripcion}</ThemedText>
                  <View style={styles.taskMeta}>
                    <IconSymbol name="star.fill" size={12} color={colors.tint} />
                    <ThemedText style={styles.metaText}>{item.puntos_maximos} puntos</ThemedText>
                    <View style={styles.metaDot} />
                    <IconSymbol name="calendar" size={12} color={colors.text + '80'} />
                    <ThemedText style={styles.metaText}>
                      {new Date(item.fecha_entrega).toLocaleDateString()}
                    </ThemedText>
                  </View>
                </View>
                <IconSymbol name="chevron.right" size={20} color={colors.text + '60'} />
              </TouchableOpacity>
            )}
            scrollEnabled={true}
            nestedScrollEnabled={true}
          />
        )}
      </View>

      {/* Modal crear tarea */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title">Crear Tarea</ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <ThemedText style={styles.label} type="defaultSemiBold">
                Título *
              </ThemedText>
              <TextInput
                style={[styles.input, { borderColor: colors.tint, color: colors.text }]}
                placeholder="Ej: Ejercicio de Algebra"
                placeholderTextColor={colors.text + '80'}
                value={nuevoTituloTarea}
                onChangeText={setNuevoTituloTarea}
              />

              <ThemedText style={styles.label} type="defaultSemiBold">
                Descripción
              </ThemedText>
              <TextInput
                style={[styles.input, { borderColor: colors.tint, color: colors.text, minHeight: 80 }]}
                placeholder="Detalles de la tarea..."
                placeholderTextColor={colors.text + '80'}
                value={nuevaDescripcion}
                onChangeText={setNuevaDescripcion}
                multiline
                textAlignVertical="top"
              />

              <ThemedText style={styles.label} type="defaultSemiBold">
                Puntos Máximos
              </ThemedText>
              <TextInput
                style={[styles.input, { borderColor: colors.tint, color: colors.text }]}
                placeholder="100"
                placeholderTextColor={colors.text + '80'}
                value={nuevosPuntos}
                onChangeText={setNuevosPuntos}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: colors.tint }]}
                onPress={handleCrearTarea}
                disabled={creando}>
                {creando ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.createBtnText}>Crear Tarea</ThemedText>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  claseName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  classCode: {
    fontSize: 12,
    marginTop: 4,
  },
  infoBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 8,
  },
  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dividerInfo: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  descContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  descTitle: {
    marginBottom: 8,
  },
  descText: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
  actionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  createTaskBtn: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createTaskBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  tasksContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tasksTitle: {
    marginBottom: 12,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 12,
  },
  taskIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: 15,
    marginBottom: 4,
  },
  taskDesc: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 6,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    opacity: 0.6,
  },
  metaDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginHorizontal: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    opacity: 0.6,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalForm: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  label: {
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  createBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  createBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
