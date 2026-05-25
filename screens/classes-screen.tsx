/* ────────────────────────  ClassesScreen.tsx  ──────────────────────── */
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/context/auth-context';
import { useClases } from '@/context/class-context';
import { useFocusEffect as useNavFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

/* ─────────────  Colores base  ───────────── */
const BLUE    = '#5b6bff';
const PURPLE  = '#6b7bff';
const GRAY_BG = 'rgba(255,255,255,0.6)';

/* ─────────────  Card de clase  ───────────── */
function ClasseCard({ clase, onPress }: { clase: any; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.cardContainer} onPress={onPress}>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <ThemedText style={styles.cardTitle}>{clase.nombre_clase || 'Clase sin nombre'}</ThemedText>
        <ThemedText style={styles.cardDesc}>{clase.materia || 'Sin descripción'}</ThemedText>
        <ThemedText style={styles.cardCode}>Código: {clase.codigo_acceso}</ThemedText>
      </View>
      <IconSymbol name="chevron.right" size={20} color={BLUE} />
    </TouchableOpacity>
  );
}

/* horas 0-23 en formato AM/PM */
const HORAS = Array.from({ length: 24 }, (_, i) => {
  const ampm   = i < 12 ? 'AM' : 'PM';
  const hora12 = i === 0 ? 12 : i > 12 ? i - 12 : i;
  return { value: i, label: `${hora12}:00 ${ampm}` };
});

/* ──────────────────────────  Screen  ────────────────────────── */
export function ClassesScreen({
  onCreateClass,
  onJoinClass,
}: {
  onCreateClass: () => void;
  onJoinClass : () => void;
}) {
  const router                       = useRouter();
  const { user, logout, setUser }    = useAuth();        // ← setUser viene del AuthContext
  const { clases, obtenerMisClases } = useClases();      // clases se reactualiza vía contexto

  /* ---------- state UI ---------- */
  const [loading,        setLoading]        = useState(false);
  const [drawerVisible,  setDrawerVisible]  = useState(false);

  /* hora preferida */
  const [horaPreferida,  setHoraPreferida]  = useState<number>(user?.hora_preferida ?? 7);
  const [guardandoHora,  setGuardandoHora]  = useState(false);

  /* editar perfil */
  const [editModal,      setEditModal]      = useState(false);
  const [editNombre,     setEditNombre]     = useState(user?.nombre   ?? '');
  const [editApellido,   setEditApellido]   = useState(user?.apellido ?? '');
  const [editCorreo,     setEditCorreo]     = useState(user?.email    ?? '');
  const [guardandoPerfil,setGuardandoPerfil]= useState(false);

  /* cargar clases al enfocar pantalla */
  useNavFocusEffect(
    useCallback(() => { cargarClases(); }, [])
  );

  async function cargarClases() {
    setLoading(true);
    try   { await obtenerMisClases(); }          // actualiza el contexto
    catch (e) { console.error('Error cargando clases:', e); }
    finally { setLoading(false); }
  }

  /* ---------- acciones ---------- */
  async function handleLogout() {
    setDrawerVisible(false);
    Alert.alert('Cerrar sesión','¿Estás seguro que deseas cerrar sesión?',[
      { text:'Cancelar', style:'cancel' },
      { text:'Sí', style:'destructive', onPress:logout },
    ]);
  }

  async function handleGuardarHora(hora: number) {
    setHoraPreferida(hora);
    setGuardandoHora(true);
    try {
      const { error } = await supabase.from('usuarios').update({ hora_preferida: hora }).eq('id', user?.id);
      if (error) throw error;

      /* reflejar cambio en contexto */
      setUser(prev => prev ? { ...prev, hora_preferida: hora } : prev);
      Alert.alert('✓ Guardado', `Recibirás recordatorios a las ${HORAS[hora].label}`);
    } catch {
      Alert.alert('Error', 'No se pudo guardar la hora');
    } finally {
      setGuardandoHora(false);
    }
  }

  function handleClassPress(clase: any) {
    router.push({ pathname:'/class-detail', params:{ claseId: clase.id } });
  }

  /* --------- editar perfil --------- */
  async function guardarPerfil() {
    if (!editNombre.trim() || !editApellido.trim() || !editCorreo.trim()) {
      Alert.alert('Campos requeridos','Completa nombre, apellido y correo');
      return;
    }
    setGuardandoPerfil(true);
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          nombre  : editNombre.trim(),
          apellido: editApellido.trim(),
          email   : editCorreo.trim(),
        })
        .eq('id', user?.id);
      if (error) throw error;

      setUser(prev => prev ? { ...prev, nombre: editNombre.trim(), apellido: editApellido.trim(), email: editCorreo.trim() } : prev);
      Alert.alert('✓ Guardado', 'Tu información fue actualizada');
      setEditModal(false);
    } catch {
      Alert.alert('Error','No se pudo guardar');
    } finally { setGuardandoPerfil(false); }
  }

  /* --------- eliminar cuenta --------- */
  async function eliminarCuenta() {
    Alert.alert(
      '⚠️ Eliminar cuenta',
      'Esta acción es irreversible. Se borrarán tus datos y clases asociadas. ¿Deseas continuar?',
      [
        { text:'Cancelar', style:'cancel' },
        {
          text:'Eliminar',
          style:'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('usuarios').delete().eq('id', user?.id);
              if (error) throw error;
              const { error: authErr } = await supabase.auth.admin.deleteUser(user!.id);
              if (authErr) throw authErr;
              Alert.alert('Cuenta eliminada');
              await logout();
            } catch { Alert.alert('Error','No se pudo eliminar la cuenta'); }
          },
        },
      ],
    );
  }

  /* ──────────────────────────  Render  ────────────────────────── */
  return (
    <LinearGradient colors={['#f5f5f5','#ffffff','#f9f9f9']} style={{flex:1}}>
      {/* ---------- Header ---------- */}
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.headerTitle}>Mis Clases</ThemedText>
          <ThemedText style={styles.greeting}>{user?.nombre} {user?.apellido}</ThemedText>
        </View>

        <TouchableOpacity onPress={() => setDrawerVisible(true)}>
          <LinearGradient colors={[BLUE,PURPLE]} style={styles.profileBtn} start={{x:0,y:0}} end={{x:1,y:1}}>
            <ThemedText style={styles.profileInitial}>{(user?.nombre?.[0] ?? '?').toUpperCase()}</ThemedText>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ---------- Acciones ---------- */}
      <View style={styles.buttonsContainer}>
        <LinearGradient colors={[BLUE,PURPLE]} start={{x:0,y:0}} end={{x:1,y:0}} style={[styles.actionGradient,{marginRight:8}]}>
          <TouchableOpacity style={styles.actionButton} onPress={onCreateClass}>
            <IconSymbol name="plus.circle.fill" size={18} color="#fff" />
            <ThemedText style={styles.actionButtonText}>Crear Clase</ThemedText>
          </TouchableOpacity>
        </LinearGradient>

        <TouchableOpacity style={styles.actionButtonOutline} onPress={onJoinClass}>
          <IconSymbol name="plus.circle" size={18} color={BLUE} />
          <ThemedText style={styles.actionButtonOutlineText}>Unirse</ThemedText>
        </TouchableOpacity>
      </View>

      {/* ---------- Lista / estados ---------- */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={BLUE}/>
        </View>
      ) : clases.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="book.closed" size={52} color={`${BLUE}40`} />
          <ThemedText style={styles.emptyText}>No tienes clases aún</ThemedText>
          <ThemedText style={styles.emptySubtext}>Crea una nueva o únete con un código</ThemedText>
        </View>
      ) : (
        <FlatList
          data={clases}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ClasseCard clase={item} onPress={() => handleClassPress(item)} />}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* ---------- Drawer lateral ---------- */}
      <Modal visible={drawerVisible} transparent animationType="none">
        <TouchableWithoutFeedback onPress={() => setDrawerVisible(false)}>
          <View style={styles.drawerOverlay}/>
        </TouchableWithoutFeedback>

        <View style={styles.drawer}>
          {/* Perfil */}
          <LinearGradient colors={['#f5f5f5','#ffffff']} style={styles.drawerProfile}>
            <LinearGradient colors={[BLUE,PURPLE]} style={styles.drawerAvatar} start={{x:0,y:0}} end={{x:1,y:1}}>
              <ThemedText style={styles.drawerAvatarText}>{(user?.nombre?.[0] ?? '?').toUpperCase()}</ThemedText>
            </LinearGradient>
            <View>
              <ThemedText style={styles.drawerName}>{user?.nombre} {user?.apellido}</ThemedText>
              <ThemedText style={styles.drawerEmail}>{user?.email}</ThemedText>
            </View>
          </LinearGradient>

          {/* Hora preferida */}
          <View style={styles.drawerSection}>
            <View style={styles.drawerSectionHeader}>
              <IconSymbol name="bell.fill" size={16} color={BLUE}/>
              <ThemedText style={styles.drawerSectionTitle}>Hora de recordatorio</ThemedText>
            </View>
            <ThemedText style={styles.drawerSectionSubtitle}>
              Recibirás notificaciones de tareas pendientes a esta hora
            </ThemedText>

            {guardandoHora ? (
              <ActivityIndicator color={BLUE} style={{marginTop:12}}/>
            ) : (
              <ScrollView style={styles.horasList} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                {HORAS.map(h => (
                  <TouchableOpacity
                    key={h.value}
                    style={[styles.horaItem, horaPreferida === h.value && styles.horaItemActive]}
                    onPress={() => handleGuardarHora(h.value)}>
                    <ThemedText style={[styles.horaText, horaPreferida === h.value && styles.horaTextActive]}>
                      {h.label}
                    </ThemedText>
                    {horaPreferida === h.value && <IconSymbol name="checkmark" size={14} color="#fff"/>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Acciones cuenta */}
          <TouchableOpacity style={styles.drawerActionItem} onPress={() => setEditModal(true)}>
            <IconSymbol name="person.crop.circle.badge.checkmark" size={18} color={BLUE}/>
            <ThemedText style={styles.drawerActionText}>Editar información</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.drawerActionItem} onPress={eliminarCuenta}>
            <IconSymbol name="trash" size={18} color="#ef4444"/>
            <ThemedText style={[styles.drawerActionText,{color:'#ef4444'}]}>Eliminar cuenta</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutItem} onPress={handleLogout}>
            <IconSymbol name="power" size={18} color="#ef4444"/>
            <ThemedText style={styles.logoutText}>Cerrar sesión</ThemedText>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ---------- Modal editar perfil ---------- */}
      <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
        <View style={styles.editOverlay}>
          <View style={styles.editModal}>
            <ThemedText style={styles.editTitle}>Editar información</ThemedText>

            <TextInput style={styles.editInput} placeholder="Nombre" placeholderTextColor="#999" value={editNombre} onChangeText={setEditNombre}/>
            <TextInput style={styles.editInput} placeholder="Apellidos" placeholderTextColor="#999" value={editApellido} onChangeText={setEditApellido}/>
            <TextInput style={styles.editInput} placeholder="Correo" placeholderTextColor="#999" autoCapitalize="none" keyboardType="email-address" value={editCorreo} onChangeText={setEditCorreo}/>

            <View style={{flexDirection:'row',gap:10,marginTop:20}}>
              <TouchableOpacity style={[styles.editBtn,{backgroundColor:'#f5f5f5',borderWidth:1.5,borderColor:'#e0e0e0'}]} disabled={guardandoPerfil} onPress={()=>setEditModal(false)}>
                <ThemedText style={{color:'#1a3a4a',fontWeight:'600'}}>Cancelar</ThemedText>
              </TouchableOpacity>

              <LinearGradient colors={[BLUE,PURPLE]} style={[styles.editBtn,{flex:1}]} start={{x:0,y:0}} end={{x:1,y:0}}>
                <TouchableOpacity style={{flex:1,justifyContent:'center',alignItems:'center'}} disabled={guardandoPerfil} onPress={guardarPerfil}>
                  {guardandoPerfil ? <ActivityIndicator color="#fff"/> : <ThemedText style={{color:'#fff',fontWeight:'600'}}>Guardar</ThemedText>}
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

/* ──────────────────────────  Estilos  ────────────────────────── */
const styles = StyleSheet.create({
  /* Header */
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingTop:56,paddingBottom:16},
  headerTitle:{fontSize:26,fontWeight:'bold',color:'#1a3a4a'},
  greeting:{fontSize:13,color:'#7a9aaa',marginTop:2},
  profileBtn:{width:44,height:44,borderRadius:22,justifyContent:'center',alignItems:'center'},
  profileInitial:{color:'#fff',fontWeight:'bold',fontSize:18},

  /* Botones crear/unirse */
  buttonsContainer:{flexDirection:'row',paddingHorizontal:20,paddingBottom:16},
  actionGradient:{flex:1,borderRadius:12},
  actionButton:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,paddingVertical:13},
  actionButtonText:{color:'#fff',fontWeight:'bold',fontSize:14},
  actionButtonOutline:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,paddingVertical:13,borderRadius:12,borderWidth:1.5,borderColor:BLUE,backgroundColor:GRAY_BG},
  actionButtonOutlineText:{color:BLUE,fontWeight:'bold',fontSize:14},

  /* Lista */
  listContainer:{paddingHorizontal:20,paddingBottom:24},
  cardContainer:{backgroundColor:'rgba(255,255,255,0.85)',borderRadius:16,borderWidth:1.5,borderColor:'#e0e0e0',padding:16,marginBottom:12,flexDirection:'row',justifyContent:'space-between',alignItems:'center',shadowColor:BLUE,shadowOffset:{width:0,height:2},shadowOpacity:0.08,shadowRadius:8,elevation:3},
  cardTitle:{fontSize:16,fontWeight:'600',color:'#1a3a4a',marginBottom:4},
  cardDesc:{fontSize:13,color:'#7a9aaa',marginBottom:6},
  cardCode:{fontSize:12,color:BLUE},

  /* estados */
  loaderContainer:{flex:1,justifyContent:'center',alignItems:'center'},
  emptyContainer:{flex:1,justifyContent:'center',alignItems:'center',padding:40},
  emptyText:{fontSize:18,fontWeight:'bold',color:'#1a3a4a',marginTop:16},
  emptySubtext:{fontSize:14,color:'#7a9aaa',marginTop:8,textAlign:'center'},

  /* Drawer */
  drawerOverlay:{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.3)'},
  drawer:{position:'absolute',top:0,right:0,bottom:0,width:'78%',backgroundColor:'#fff',shadowColor:'#000',shadowOffset:{width:-2,height:0},shadowOpacity:0.15,shadowRadius:12,elevation:10},
  drawerProfile:{flexDirection:'row',alignItems:'center',gap:14,padding:24,paddingTop:60},
  drawerAvatar:{width:52,height:52,borderRadius:26,justifyContent:'center',alignItems:'center'},
  drawerAvatarText:{color:'#fff',fontWeight:'bold',fontSize:22},
  drawerName:{fontSize:16,fontWeight:'600',color:'#1a3a4a'},
  drawerEmail:{fontSize:12,color:'#7a9aaa',marginTop:2},

  drawerSection:{flex:1,padding:20},
  drawerSectionHeader:{flexDirection:'row',alignItems:'center',marginBottom:6},
  drawerSectionTitle:{fontSize:15,fontWeight:'600',color:'#1a3a4a',marginLeft:8},
  drawerSectionSubtitle:{fontSize:12,color:'#7a9aaa',marginBottom:14,lineHeight:18},

  horasList:{flex:1},
  horaItem:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:10,paddingHorizontal:14,borderRadius:10,borderWidth:1.5,borderColor:'#e0e0e0',backgroundColor:'#f5f5f5',marginBottom:6},
  horaItemActive:{backgroundColor:BLUE,borderColor:BLUE},
  horaText:{fontSize:14,color:'#1a3a4a'},
  horaTextActive:{color:'#fff'},

  drawerActionItem:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:20,paddingVertical:14},
  drawerActionText:{fontSize:15,fontWeight:'600',color:'#1a3a4a'},

  logoutItem:{flexDirection:'row',alignItems:'center',gap:10,padding:20,borderTopWidth:1,borderTopColor:'#e0e0e0'},
  logoutText:{color:'#ef4444',fontWeight:'600',fontSize:15},

  /* Modal editar */
  editOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.35)',justifyContent:'center',alignItems:'center'},
  editModal:{width:'85%',backgroundColor:'#fff',borderRadius:18,padding:20},
  editTitle:{fontSize:17,fontWeight:'700',color:'#1a3a4a',marginBottom:16,textAlign:'center'},
  editInput:{borderWidth:1.5,borderColor:'#e0e0e0',borderRadius:12,paddingHorizontal:14,paddingVertical:12,fontSize:15,color:'#1a3a4a',marginBottom:12},
  editBtn:{flex:1,height:48,borderRadius:12,justifyContent:'center',alignItems:'center'},
});