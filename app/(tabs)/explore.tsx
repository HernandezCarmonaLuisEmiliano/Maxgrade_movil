import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/context/auth-context';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const TIPOS_PROBLEMA = [
  'Problemas de cuenta y acceso',
  'Falla en la carga de datos/archivos',
  'No recibo notificaciones',
  'Errores de interfaz',
  'Sugerencia de mejora/comentarios',
  'Otro',
];

export default function ExploreScreen() {
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const secciones = [
    {
      icon: 'book.fill',
      titulo: 'Sobre MaxGrade',
      texto: 'La plataforma ideal para gestionar tus tareas escolares, recibir notificaciones personalizadas y conectar con tu grupo :)',
      color: ['#5b6bff', '#1AC952'] as [string, string],
    },
    {
      icon: 'plus.circle.fill',
      titulo: 'Crear una Clase',
      texto: 'Presiona el botón "Crear Clase" en la pantalla principal, ingresa el nombre y descripción. Recibirás un código único de 6 caracteres.',
      color: ['#5b6bff', '#1AC952'] as [string, string],
    },
    {
      icon: 'checkmark.circle.fill',
      titulo: 'Unirse a una Clase',
      texto: 'Presiona el botón "Unirse" e ingresa el código de 6 caracteres proporcionado por tu profesor.',
      color: ['#5b6bff', '#1AC952'] as [string, string],
    },
    {
      icon: 'bell.fill',
      titulo: 'Recordatorios',
      texto: 'Toca tu avatar en la esquina superior derecha de la pantalla de clases para configurar la hora en que recibirás recordatorios de tareas pendientes.',
      color: ['#5b6bff', '#1AC952'] as [string, string],
    },
  ];

  const handleEnviarReporte = async () => {
    if (!tipoSeleccionado) {
      Alert.alert('Error', 'Selecciona el tipo de problema');
      return;
    }
    if (!descripcion.trim()) {
      Alert.alert('Error', 'Escribe una descripción del problema');
      return;
    }

    setEnviando(true);
    try {
      const { error } = await supabase.from('reportes_soporte').insert({
        usuario_id: user?.id,
        tipo_problema: tipoSeleccionado,
        descripcion: descripcion.trim(),
        estado: 'pendiente',
      });

      if (error) throw error;

      setTipoSeleccionado('');
      setDescripcion('');
      setModalVisible(false);
      Alert.alert('✓ Enviado', 'Tu reporte fue enviado. Lo revisaremos pronto.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar el reporte. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const handleCancelar = () => {
    setTipoSeleccionado('');
    setDescripcion('');
    setDropdownVisible(false);
    setModalVisible(false);
  };

  return (
    <LinearGradient colors={['#f5f5f5', '#ffffff', '#f9f9f9']} style={{ flex: 1 }}>
      {/* Header */}
      <LinearGradient
        colors={['#5b6bff', '#1AC952']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.header}>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.headerTitle}>Ayuda</ThemedText>
          <ThemedText style={styles.headerSubtitle}>Todo lo que necesitas saber</ThemedText>
        </View>
        {/* Botón de soporte */}
        <TouchableOpacity
          style={styles.soporteBtn}
          onPress={() => setModalVisible(true)}>
          <IconSymbol name="questionmark.circle.fill" size={20} color="#fff" />
          <ThemedText style={styles.soporteBtnText}>Soporte</ThemedText>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Logo decorativo */}
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={['#5b6bff', '#1AC952']}
            style={styles.logoBox}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <ThemedText style={styles.logoLetter}>M</ThemedText>
          </LinearGradient>
          <ThemedText style={styles.logoMax}>Max</ThemedText>
          <ThemedText style={styles.logoGrade}>Grade</ThemedText>
        </View>

        {/* Secciones */}
        {secciones.map((s, i) => (
          <View key={i} style={styles.card}>
            <LinearGradient
              colors={s.color}
              style={styles.cardIcon}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <IconSymbol name={s.icon as any} size={22} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.cardTitle}>{s.titulo}</ThemedText>
              <ThemedText style={styles.cardText}>{s.texto}</ThemedText>
            </View>
          </View>
        ))}

        {/* Banner de soporte */}
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <LinearGradient
            colors={['#5b6bff', '#1AC952']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.soporteBanner}>
            <IconSymbol name="headphones" size={28} color="#fff" />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.bannerTitle}>¿Tienes un problema?</ThemedText>
              <ThemedText style={styles.bannerSub}>Envíanos un reporte y lo resolveremos</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={18} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.versionBadge}>
            <ThemedText style={styles.versionText}>Versión 1.0.0</ThemedText>
          </View>
        </View>
      </ScrollView>

      {/* ── MODAL SOPORTE ── */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Header del modal */}
            <LinearGradient
              colors={['#5b6bff', '#1AC952']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.modalHeader}>
              <IconSymbol name="headphones" size={22} color="#fff" />
              <ThemedText style={styles.modalTitle}>Soporte</ThemedText>
            </LinearGradient>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Tipo de problema */}
              <ThemedText style={styles.fieldLabel}>SELECCIONA EL TIPO DE PROBLEMA</ThemedText>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setDropdownVisible(!dropdownVisible)}>
                <ThemedText style={[styles.dropdownText, !tipoSeleccionado && { color: '#aac0cc' }]}>
                  {tipoSeleccionado || 'Elige una opción...'}
                </ThemedText>
                <IconSymbol
                  name={dropdownVisible ? 'chevron.up' : 'chevron.down'}
                  size={16}
                  color="#5b6bff"
                />
              </TouchableOpacity>

              {dropdownVisible && (
                <View style={styles.dropdownList}>
                  {TIPOS_PROBLEMA.map((tipo) => (
                    <TouchableOpacity
                      key={tipo}
                      style={[
                        styles.dropdownItem,
                        tipoSeleccionado === tipo && styles.dropdownItemSelected,
                      ]}
                      onPress={() => {
                        setTipoSeleccionado(tipo);
                        setDropdownVisible(false);
                      }}>
                      <ThemedText style={[
                        styles.dropdownItemText,
                        tipoSeleccionado === tipo && { color: '#5b6bff', fontWeight: '600' },
                      ]}>
                        {tipo}
                      </ThemedText>
                      {tipoSeleccionado === tipo && (
                        <IconSymbol name="checkmark" size={14} color="#5b6bff" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Descripción */}
              <ThemedText style={[styles.fieldLabel, { marginTop: 16 }]}>DESCRIPCIÓN DEL PROBLEMA</ThemedText>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textArea}
                  placeholder="Describe el problema con el mayor detalle posible..."
                  placeholderTextColor="#aac0cc"
                  value={descripcion}
                  onChangeText={setDescripcion}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {/* Botones */}
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelar}>
                  <ThemedText style={styles.cancelBtnText}>Cancelar</ThemedText>
                </TouchableOpacity>
                <LinearGradient
                  colors={['#32c4d8', '#32e880']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.enviarBtnGradient}>
                  <TouchableOpacity
                    style={styles.enviarBtn}
                    onPress={handleEnviarReporte}
                    disabled={enviando}>
                    {enviando
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <>
                          <IconSymbol name="paperplane.fill" size={16} color="#fff" />
                          <ThemedText style={styles.enviarBtnText}>Enviar</ThemedText>
                        </>
                    }
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 24,
    gap: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  soporteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  soporteBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  content: { padding: 16, paddingBottom: 36 },

  logoContainer: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, marginVertical: 24,
  },
  logoBox: {
    width: 40, height: 40, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  logoLetter: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  logoMax: { fontSize: 22, fontWeight: 'bold', color: '#32a4b8' },
  logoGrade: { fontSize: 22, fontWeight: 'bold', color: '#32b880' },

  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 16, borderWidth: 1.5, borderColor: '#d0eaf2',
    padding: 16, marginBottom: 12,
    shadowColor: '#32c4b8', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  cardIcon: {
    width: 46, height: 46, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1a3a4a', marginBottom: 6 },
  cardText: { fontSize: 13, color: '#7a9aaa', lineHeight: 20 },

  soporteBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, padding: 18, marginTop: 4, marginBottom: 16,
  },
  bannerTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  bannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 3 },

  footer: { alignItems: 'center', marginTop: 4 },
  versionBadge: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6,
    borderWidth: 1, borderColor: '#d0eaf2',
  },
  versionText: { fontSize: 12, color: '#7a9aaa' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalBody: { paddingHorizontal: 20, paddingTop: 8 },

  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7a9aaa',
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f8fb',
    borderWidth: 1.5,
    borderColor: '#d0eaf2',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dropdownText: { fontSize: 14, color: '#1a3a4a' },
  dropdownList: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#d0eaf2',
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f6',
  },
  dropdownItemSelected: { backgroundColor: '#e8f9fb' },
  dropdownItemText: { fontSize: 14, color: '#1a3a4a' },

  inputWrapper: {
    backgroundColor: '#f0f8fb',
    borderWidth: 1.5,
    borderColor: '#d0eaf2',
    borderRadius: 12,
  },
  textArea: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1a3a4a',
    minHeight: 110,
    maxHeight: 160,
  },

  modalBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 32,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f6',
    borderRadius: 14,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#7a9aaa' },
  enviarBtnGradient: { flex: 1, borderRadius: 14 },
  enviarBtn: {
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  enviarBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});