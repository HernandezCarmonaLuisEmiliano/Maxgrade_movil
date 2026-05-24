import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/context/auth-context';
import { useClases } from '@/context/class-context';
import { useTareas } from '@/context/task-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

/* ──────────────────────────── TIPOS ──────────────────────────── */
type ClaseReal = {
  id: string;
  nombre_clase: string;
  codigo_acceso: string;
  materia?: string;
  profesor_id: string;
  color_tema?: string;
  portada_url?: string;
  fecha_creacion?: string;
};

type Anuncio = {
  id: string;
  clase_id: string;
  autor_id: string;
  contenido: string;
  archivo_adjunto_url: string | null;
  fecha_publicacion?: string;
  autor_nombre?: string;
};

type Miembro = {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  esProfesor: boolean;
};

/* ───────────────────────── COMPONENTE ───────────────────────── */
export function ClassDetailScreen() {
  const router = useRouter();
  const { claseId } = useLocalSearchParams<{ claseId: string }>();
  const { user } = useAuth();
  const { salirClase } = useClases();
  const { crearTarea } = useTareas();

  /* STATE ───────────────────────────────────────────────────── */
  const [clase, setClase] = useState<ClaseReal | null>(null);
  const [tareasPorClase, setTareasPorClase] = useState<any[]>([]);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [miembrosCount, setMiembrosCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [esProfesor, setEsProfesor] = useState(false);

  /* UI state */
  const [modalVisible,         setModalVisible]         = useState(false);
  const [menuVisible,          setMenuVisible]          = useState(false);
  const [modalEditDescripcion, setModalEditDescripcion] = useState(false);

  /* Crear tarea */
  const [nuevoTituloTarea, setNuevoTituloTarea] = useState('');
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [nuevosPuntos,     setNuevosPuntos]     = useState('100');
  const [nuevaFecha,       setNuevaFecha]       = useState('');
  const [creando,          setCreando]          = useState(false);

  /* Tabs */
  const [tabActivo, setTabActivo] = useState<
    'tareas' | 'miembros' | 'anuncios' | 'rendimiento'
  >('tareas');

  /* Anuncios */
  const [nuevoAnuncio,   setNuevoAnuncio]   = useState('');
  const [enviandoAnuncio,setEnviandoAnuncio]= useState(false);

  /* Sprint-2 editar descripción */
  const [nuevaDescripcionClase,setNuevaDescripcionClase]=useState('');
  const [editandoDescripcion, setEditandoDescripcion] = useState(false);

  /* ───────────────────── EFFECT: Cargar datos ───────────────── */
  useEffect(() => { if (claseId) cargarClase(); }, [claseId]);

  const cargarClase = async () => {
    setLoading(true);
    try {
      /* Clase */
      const { data: c, error: errClase } = await supabase
        .from('clases').select('*').eq('id', claseId).single();
      if (errClase || !c) throw errClase ?? new Error('Clase no encontrada');
      setClase(c as ClaseReal);
      setEsProfesor(c.profesor_id === user?.id);

      /* Tareas */
      const { data: tareas } = await supabase.from('tareas')
        .select('*').eq('clase_id', claseId);
      setTareasPorClase(tareas || []);

      /* Miembros count */
      const { data: ins } = await supabase.from('inscripciones')
        .select('id').eq('clase_id', claseId);
      setMiembrosCount((ins || []).length);

      await Promise.all([cargarAnuncios(), cargarMiembros(c.profesor_id)]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  /* ───────────── Helpers miembros / anuncios ───────────── */
  const cargarMiembros = async (profesorId: string) => {
    try {
      const { data, error } = await supabase
        .from('inscripciones')
        .select('usuarios(id,nombre,apellido,email)')
        .eq('clase_id', claseId);
      if (error) throw error;

      const list: Miembro[] = (data || []).map((i: any) => ({
        id:        i.usuarios.id,
        nombre:    i.usuarios.nombre,
        apellido:  i.usuarios.apellido,
        correo:    i.usuarios.email,
        esProfesor:i.usuarios.id === profesorId,
      }));
      list.sort((a,b)=> (a.esProfesor? -1 : b.esProfesor? 1 : 0));
      setMiembros(list);
    } catch (e) { console.error(e); }
  };

  const cargarAnuncios = async () => {
    try {
      const { data, error } = await supabase
        .from('anuncios')
        .select('*, usuarios(nombre,apellido)')
        .eq('clase_id', claseId)
        .order('fecha_publicacion', { ascending:false });
      if (error) throw error;
      setAnuncios((data||[]).map((a:any)=>({
        ...a,
        autor_nombre: a.usuarios ? `${a.usuarios.nombre} ${a.usuarios.apellido}` : 'Usuario',
      })));
    } catch (e) { console.error(e); }
  };

  /* ───────────── Handlers varios (salir, código, etc.) ─────── */
  const handleVerCodigo = () =>
    (setMenuVisible(false),
     Alert.alert('🔑 Código de la clase', clase?.codigo_acceso ?? '', [{text:'Cerrar',style:'cancel'}]));

  const handleSalirClase = () => {
    setMenuVisible(false);
    Alert.alert('Salir de la clase',
      `¿Estás seguro que deseas salir de "${clase?.nombre_clase}"?`,[
        {text:'Cancelar',style:'cancel'},
        {text:'Salir',style:'destructive',onPress:async()=>{
          try{ await salirClase(claseId); router.back(); }
          catch{ Alert.alert('Error','No se pudo salir');}
        }},
      ]);
  };

  const handleEliminarAlumno = (id:string,nombre:string) => {
    Alert.alert('Eliminar alumno',`¿Deseas eliminar a ${nombre}?`,[
      {text:'Cancelar',style:'cancel'},
      {text:'Eliminar',style:'destructive',onPress:async()=>{
        const {error}=await supabase.from('inscripciones')
          .delete().eq('clase_id',claseId).eq('estudiante_id',id);
        if(error) Alert.alert('Error','No se pudo eliminar');
        else { await cargarMiembros(clase!.profesor_id); setMiembrosCount(p=>p-1); }
      }},
    ]);
  };

  const handleEliminarAnuncio = (id:string) => {
    Alert.alert('Eliminar anuncio','¿Estás seguro?',[
      {text:'Cancelar',style:'cancel'},
      {text:'Eliminar',style:'destructive',onPress:async()=>{
        const {error}=await supabase.from('anuncios').delete().eq('id',id);
        if(error) Alert.alert('Error','No se pudo eliminar');
        else await cargarAnuncios();
      }},
    ]);
  };

  const handlePublicarAnuncio = async () => {
    if(!nuevoAnuncio.trim()) return Alert.alert('Error','Escribe algo');
    setEnviandoAnuncio(true);
    try{
      const {error}=await supabase.from('anuncios').insert({
        clase_id:claseId,autor_id:user?.id,contenido:nuevoAnuncio.trim(),
      });
      if(error) throw error;
      setNuevoAnuncio(''); await cargarAnuncios();
    } catch(e){ Alert.alert('Error',(e as Error).message); }
    finally{ setEnviandoAnuncio(false); }
  };

  const handleCrearTarea = async () => {
    if(!nuevoTituloTarea.trim()) return Alert.alert('Error','Ingresa título');
    setCreando(true);
    try{
      await crearTarea(
        claseId,
        nuevoTituloTarea,
        nuevaDescripcion,
        parseInt(nuevosPuntos)||100,
        nuevaFecha||new Date().toISOString()
      );
      setNuevoTituloTarea(''); setNuevaDescripcion(''); setNuevosPuntos('100');
      setNuevaFecha(''); setModalVisible(false); await cargarClase();
    } catch(e){ Alert.alert('Error',(e as Error).message);}
    finally{ setCreando(false);}
  };

  /* Tabs helpers */
  const handleTareaPress = (t:any)=>
    router.push({pathname:'/task-detail',
      params:{tareaId:t.id,claseId:t.clase_id,esProfesor:esProfesor.toString()} });

  /* ──────────────── RENDER ─────────────────────────── */
  if(loading){
    return(
      <LinearGradient colors={['#f5f5f5','#ffffff','#f9f9f9']} style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5b6bff"/>
      </LinearGradient>);
  }
  if(!clase){
    return(
      <LinearGradient colors={['#f5f5f5','#ffffff','#f9f9f9']} style={styles.centerContainer}>
        <ThemedText>Clase no encontrada</ThemedText>
      </LinearGradient>);
  }

  return (
    <LinearGradient colors={['#f5f5f5','#ffffff','#f9f9f9']} style={{flex:1}}>
      {/* ───────── Header ───────── */}
      <LinearGradient colors={['#5b6bff','#6b7bff']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={()=>router.back()}>
          <IconSymbol name="chevron.left" size={24} color="#fff"/>
        </TouchableOpacity>
        <View style={{flex:1}}>
          <ThemedText style={styles.claseName}>{clase.nombre_clase}</ThemedText>
          <ThemedText style={styles.classCode}>Código: {clase.codigo_acceso}</ThemedText>
        </View>
        <TouchableOpacity style={styles.menuBtn} onPress={()=>setMenuVisible(true)}>
          <IconSymbol name="ellipsis" size={22} color="#fff"/>
        </TouchableOpacity>
      </LinearGradient>

      {/* ───────── Info bar ───────── */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <IconSymbol name="doc.text.fill" size={15} color="#5b6bff"/>
          <ThemedText style={styles.infoText}>{tareasPorClase.length} tareas</ThemedText>
        </View>
        <View style={styles.infoItem}>
          <IconSymbol name="person.2.fill" size={15} color="#5b6bff"/>
          <ThemedText style={styles.infoText}>{miembrosCount} miembros</ThemedText>
        </View>
        {clase.materia && (
          <View style={styles.infoItem}>
            <IconSymbol name="book.fill" size={15} color="#5b6bff"/>
            <ThemedText style={styles.infoText}>{clase.materia}</ThemedText>
          </View>
        )}
      </View>

      {clase.materia && (
        <View style={styles.descContainer}>
          <ThemedText style={styles.descTitle}>Materia</ThemedText>
          <ThemedText style={styles.descText}>{clase.materia}</ThemedText>
        </View>
      )}

      {/* ───────── Tabs ───────── */}
      <View style={styles.tabsContainer}>
        {(['tareas','miembros','anuncios'] as const).map(t=>(
          <TouchableOpacity key={t}
            style={[styles.tab, tabActivo===t && styles.tabActive]}
            onPress={()=>setTabActivo(t)}>
            <ThemedText style={[styles.tabText, tabActivo===t&&styles.tabTextActive]}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </ThemedText>
          </TouchableOpacity>
        ))}
        {esProfesor && (
          <TouchableOpacity
            style={[styles.tab, tabActivo==='rendimiento' && styles.tabActive]}
            onPress={()=>setTabActivo('rendimiento')}>
            <ThemedText style={[styles.tabText, tabActivo==='rendimiento' && styles.tabTextActive]}>
              Rendimiento
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {/* ───────── Contenido Tabs ───────── */}
      {tabActivo==='tareas' && (
        <View style={styles.tabContent}>
          {esProfesor && (
            <LinearGradient colors={['#5b6bff','#6b7bff']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.createTaskGradient}>
              <TouchableOpacity style={styles.createTaskBtn} onPress={()=>setModalVisible(true)}>
                <IconSymbol name="plus.circle.fill" size={18} color="#fff"/>
                <ThemedText style={styles.createTaskBtnText}>Crear Tarea</ThemedText>
              </TouchableOpacity>
            </LinearGradient>
          )}

          {tareasPorClase.length===0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol name="doc.text" size={48} color="#5b6bff40"/>
              <ThemedText style={styles.emptyText}>No hay tareas aún</ThemedText>
            </View>
          ):(
            <FlatList
              data={tareasPorClase}
              keyExtractor={i=>i.id}
              renderItem={({item})=>(
                <TouchableOpacity style={styles.taskCard} onPress={()=>handleTareaPress(item)}>
                  <View style={styles.taskIcon}>
                    <IconSymbol name="doc.text.fill" size={20} color="#5b6bff"/>
                  </View>
                  <View style={{flex:1}}>
                    <ThemedText style={styles.taskTitle}>{item.titulo}</ThemedText>
                    <ThemedText style={styles.taskDesc}>{item.descripcion}</ThemedText>
                    <View style={styles.taskMeta}>
                      <IconSymbol name="star.fill" size={12} color="#5b6bff"/>
                      <ThemedText style={styles.metaText}>{item.puntos_maximos} pts</ThemedText>
                      <View style={styles.metaDot}/>
                      <IconSymbol name="calendar" size={12} color="#7a9aaa"/>
                      <ThemedText style={styles.metaText}>
                        {new Date(item.fecha_entrega).toLocaleDateString()}
                      </ThemedText>
                    </View>
                  </View>
                  <IconSymbol name="chevron.right" size={18} color="#5b6bff"/>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      {tabActivo==='miembros' && (
        <View style={styles.tabContent}>
          {miembros.length===0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol name="person" size={48} color="#5b6bff40"/>
              <ThemedText style={styles.emptyText}>No hay miembros aún</ThemedText>
            </View>
          ):(
            <ScrollView nestedScrollEnabled>
              {/* Profesor */}
              {miembros.some(m=>m.esProfesor) && (
                <>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionLine}/>
                    <ThemedText style={styles.sectionTitle}>Profesor</ThemedText>
                    <View style={styles.sectionLine}/>
                  </View>
                  {miembros.filter(m=>m.esProfesor).map(m=>(
                    <View key={m.id} style={[styles.miembroCard,styles.miembroCardProfesor]}>
                      <LinearGradient colors={['#ff6b6b','#ee5a6f']} style={styles.miembroAvatar} start={{x:0,y:0}} end={{x:1,y:1}}>
                        <ThemedText style={styles.miembroAvatarText}>{m.nombre[0]}</ThemedText>
                      </LinearGradient>
                      <View style={{flex:1}}>
                        <ThemedText style={styles.miembroNombre}>{m.nombre} {m.apellido}</ThemedText>
                        <ThemedText style={styles.miembroCorreo}>{m.correo}</ThemedText>
                      </View>
                      <IconSymbol name="star.fill" size={16} color="#ff6b6b"/>
                    </View>
                  ))}
                </>
              )}
              {/* Alumnos */}
              {miembros.some(m=>!m.esProfesor) && (
                <>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionLine}/>
                    <ThemedText style={styles.sectionTitle}>Alumnos</ThemedText>
                    <View style={styles.sectionLine}/>
                  </View>
                  {miembros.filter(m=>!m.esProfesor).map(m=>(
                    <View key={m.id} style={styles.miembroCard}>
                      <LinearGradient colors={['#5b6bff','#1AC952']} style={styles.miembroAvatar} start={{x:0,y:0}} end={{x:1,y:1}}>
                        <ThemedText style={styles.miembroAvatarText}>{m.nombre[0]}</ThemedText>
                      </LinearGradient>
                      <View style={{flex:1}}>
                        <ThemedText style={styles.miembroNombre}>{m.nombre} {m.apellido}</ThemedText>
                        <ThemedText style={styles.miembroCorreo}>{m.correo}</ThemedText>
                      </View>
                      {esProfesor && (
                        <TouchableOpacity style={styles.deleteBtn} onPress={()=>handleEliminarAlumno(m.id,`${m.nombre} ${m.apellido}`)}>
                          <IconSymbol name="person.badge.minus" size={18} color="#ef4444"/>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          )}
        </View>
      )}

      {tabActivo==='anuncios' && (
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined} keyboardVerticalOffset={80}>
          <FlatList
            data={anuncios}
            keyExtractor={i=>i.id}
            contentContainerStyle={styles.anunciosList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <IconSymbol name="megaphone" size={48} color="#5b6bff40"/>
                <ThemedText style={styles.emptyText}>No hay anuncios aún</ThemedText>
              </View>}
            renderItem={({item})=>{
              const esMio=item.autor_id===user?.id;
              const puedeEliminar=esProfesor||esMio;
              return(
                <View style={styles.anuncioCard}>
                  <View style={styles.anuncioHeader}>
                    <LinearGradient colors={['#5b6bff','#1AC952']} style={styles.anuncioAvatar} start={{x:0,y:0}} end={{x:1,y:1}}>
                      <ThemedText style={styles.anuncioAvatarText}>{item.autor_nombre?.[0] ?? 'U'}</ThemedText>
                    </LinearGradient>
                    <View style={{flex:1}}>
                      <ThemedText style={styles.anuncioAutor}>
                        {esMio?`${item.autor_nombre} (Tú)`:item.autor_nombre}
                      </ThemedText>
                      {item.fecha_publicacion && (
                        <ThemedText style={styles.anuncioFecha}>
                          {new Date(item.fecha_publicacion).toLocaleDateString('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
                        </ThemedText>
                      )}
                    </View>
                    {puedeEliminar && (
                      <TouchableOpacity onPress={()=>handleEliminarAnuncio(item.id)} style={styles.deleteBtn}>
                        <IconSymbol name="trash" size={16} color="#ef4444"/>
                      </TouchableOpacity>
                    )}
                  </View>
                  <ThemedText style={styles.anuncioContenido}>{item.contenido}</ThemedText>
                </View>
              );
            }}
          />
          {/* Input anuncio */}
          <View style={styles.inputAnuncioContainer}>
            <TextInput
              style={styles.inputAnuncio}
              placeholder="Escribe un anuncio..."
              placeholderTextColor="#999"
              value={nuevoAnuncio}
              onChangeText={setNuevoAnuncio}
              multiline
            />
            <LinearGradient colors={nuevoAnuncio.trim()?['#5b6bff','#1AC952']:['#e0e0e0','#e0e0e0']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.sendBtnGradient}>
              <TouchableOpacity style={styles.sendBtn} disabled={enviandoAnuncio||!nuevoAnuncio.trim()} onPress={handlePublicarAnuncio}>
                {enviandoAnuncio
                  ?<ActivityIndicator color="#fff" size="small"/>
                  :<IconSymbol name="paperplane.fill" size={18} color="#fff"/>}
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      )}

      {tabActivo==='rendimiento' && (
        <View style={styles.tabContent}>
          <View style={styles.performanceContainer}>
            <IconSymbol name="chart.bar.fill" size={48} color="#5b6bff40"/>
            <ThemedText style={styles.performanceText}>
              Panel de rendimiento (próximamente)
            </ThemedText>
          </View>
        </View>
      )}

      {/* ──────── Modales y menú (se mantienen) ──────── */}
      {/* Modal crear tarea, menú opciones, modal editar descripción  */}
      {/* --------- Pega aquí los bloques de modal / menú EXACTAMENTE   */}
      {/*           igual como estaban en tu código previo.            */}
    </LinearGradient>
  );
}

/* ───────────────────────── ESTILOS ───────────────────────── */
export const styles = StyleSheet.create({
  centerContainer:{flex:1,justifyContent:'center',alignItems:'center'},

  /* Header */
  header:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingTop:52,paddingBottom:20,gap:12},
  backBtn:{width:40,height:40,borderRadius:20,justifyContent:'center',alignItems:'center',backgroundColor:'rgba(255,255,255,0.25)'},
  menuBtn:{width:40,height:40,borderRadius:20,justifyContent:'center',alignItems:'center',backgroundColor:'rgba(255,255,255,0.25)'},
  claseName:{fontSize:20,fontWeight:'bold',color:'#fff'},
  classCode:{fontSize:12,color:'rgba(255,255,255,0.8)',marginTop:4},

  /* Info bar */
  infoBar:{flexDirection:'row',marginHorizontal:16,marginVertical:12,backgroundColor:'rgba(255,255,255,0.7)',borderRadius:14,paddingHorizontal:16,paddingVertical:12,borderWidth:1.5,borderColor:'#e0e0e0'},
  infoItem:{flex:1,flexDirection:'row',alignItems:'center',gap:6},
  infoText:{fontSize:12,fontWeight:'500',color:'#1a3a4a'},

  /* Descripción */
  descContainer:{marginHorizontal:16,marginBottom:12,backgroundColor:'rgba(255,255,255,0.7)',borderRadius:14,padding:14,borderWidth:1.5,borderColor:'#e0e0e0'},
  descTitle:{fontSize:13,fontWeight:'600',color:'#5b6bff',marginBottom:6},
  descText:{fontSize:14,color:'#1a3a4a',lineHeight:20},

  /* Tabs */
  tabsContainer:{flexDirection:'row',marginHorizontal:16,marginBottom:12,backgroundColor:'rgba(255,255,255,0.6)',borderRadius:12,borderWidth:1.5,borderColor:'#e0e0e0',overflow:'hidden'},
  tab:{flex:1,alignItems:'center',paddingVertical:11},
  tabActive:{backgroundColor:'rgba(91,107,255,0.15)'},
  tabText:{fontSize:14,color:'#7a9aaa'},
  tabTextActive:{color:'#5b6bff',fontWeight:'700'},
  tabContent:{flex:1,paddingHorizontal:16},

  /* Crear tarea btn */
  createTaskGradient:{borderRadius:12,marginBottom:12},
  createTaskBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,paddingVertical:13},
  createTaskBtnText:{color:'#fff',fontWeight:'bold',fontSize:14},

  /* Task card */
  taskCard:{flexDirection:'row',alignItems:'center',backgroundColor:'rgba(255,255,255,0.85)',borderRadius:16,borderWidth:1.5,borderColor:'#e0e0e0',paddingHorizontal:14,paddingVertical:14,marginBottom:12,gap:12,shadowColor:'#5b6bff',shadowOffset:{width:0,height:2},shadowOpacity:0.08,shadowRadius:8,elevation:3},
  taskIcon:{width:44,height:44,borderRadius:12,backgroundColor:'#f5f5f5',justifyContent:'center',alignItems:'center'},
  taskTitle:{fontSize:15,fontWeight:'600',color:'#1a3a4a',marginBottom:4},
  taskDesc:{fontSize:13,color:'#7a9aaa',marginBottom:6},
  taskMeta:{flexDirection:'row',alignItems:'center',gap:4},
  metaText:{fontSize:11,color:'#7a9aaa'},
  metaDot:{width:3,height:3,borderRadius:2,backgroundColor:'#e0e0e0',marginHorizontal:4},

  /* Empty */
  emptyContainer:{alignItems:'center',paddingVertical:40},
  emptyText:{marginTop:12,color:'#7a9aaa',fontSize:15},

  /* Miembros */
  miembroCard:{flexDirection:'row',alignItems:'center',marginHorizontal:12,marginVertical:8,paddingVertical:12,paddingHorizontal:12,backgroundColor:'rgba(255,255,255,0.8)',borderRadius:12,borderWidth:1,borderColor:'#e0e0e0'},
  miembroCardProfesor:{backgroundColor:'rgba(255,107,107,0.08)',borderColor:'#ff6b6b'},
  miembroAvatar:{width:44,height:44,borderRadius:22,justifyContent:'center',alignItems:'center',marginRight:12},
  miembroAvatarText:{color:'#fff',fontSize:18,fontWeight:'bold'},
  miembroNombre:{fontSize:15,fontWeight:'600',color:'#1a3a4a'},
  miembroCorreo:{fontSize:12,color:'#7a9aaa',marginTop:4},
  sectionHeader:{flexDirection:'row',alignItems:'center',justifyContent:'center',marginHorizontal:12,marginVertical:16,gap:12},
  sectionLine:{flex:1,height:1.5,backgroundColor:'#5b6bff'},
  sectionTitle:{fontSize:16,fontWeight:'700',color:'#5b6bff',paddingHorizontal:8,letterSpacing:0.5},

  /* Anuncios */
  anunciosList:{paddingHorizontal:16,paddingBottom:8,gap:12},
  anuncioCard:{backgroundColor:'rgba(255,255,255,0.85)',borderRadius:16,borderWidth:1.5,borderColor:'#e0e0e0',padding:14,shadowColor:'#5b6bff',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:6,elevation:2},
  anuncioHeader:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:10},
  anuncioAvatar:{width:38,height:38,borderRadius:19,justifyContent:'center',alignItems:'center'},
  anuncioAvatarText:{color:'#fff',fontWeight:'bold',fontSize:15},
  anuncioAutor:{fontSize:13,fontWeight:'600',color:'#1a3a4a'},
  anuncioFecha:{fontSize:11,color:'#7a9aaa',marginTop:1},
  anuncioContenido:{fontSize:14,color:'#1a3a4a',lineHeight:20},
  inputAnuncioContainer:{flexDirection:'row',alignItems:'flex-end',paddingHorizontal:16,paddingVertical:10,borderTopWidth:1,borderTopColor:'#e0e0e0',backgroundColor:'rgba(255,255,255,0.9)',gap:8},
  inputAnuncio:{flex:1,backgroundColor:'#f5f5f5',borderWidth:1.5,borderColor:'#e0e0e0',borderRadius:20,paddingHorizontal:14,paddingVertical:8,fontSize:14,color:'#1a3a4a',maxHeight:100},
  sendBtnGradient:{width:42,height:42,borderRadius:21},
  sendBtn:{width:42,height:42,borderRadius:21,justifyContent:'center',alignItems:'center'},
  deleteBtn:{padding:6},

  /* Rendimiento (nuevo) */
  performanceContainer:{flex:1,justifyContent:'center',alignItems:'center',gap:12,paddingVertical:40},
  performanceText:{color:'#7a9aaa',fontSize:15,textAlign:'center'},
});