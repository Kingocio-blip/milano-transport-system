// ============================================
// MILANO - Comunicacion v3.0
// Notificaciones, Gestor de Tareas (Kanban avanzado), Chat, Mailing
// Features: Drag&drop, etiquetas, asignados, dependencias, chatter persistente,
//           edicion completa, subtareas, asignacion a usuarios, timeline moderno
// ============================================

import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useUIStore, useAuthStore } from '../store';
import { notificacionesApi, userTasksApi, usersApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Checkbox } from '../components/ui/checkbox';
import {
  Bell, CheckCircle2, Trash2, Plus, Loader2, AlertTriangle, Clock,
  MessageSquare, Mail, ListTodo, Filter, Inbox, Send, X,
  Calendar, ArrowRight, FileText, Shield,
  Users, Link2, GripVertical, Eye,
  Pencil, Check
} from 'lucide-react';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';

const fmtDate = (d: string | Date | undefined): string => {
  if (!d) return '-';
  try { const p = typeof d === 'string' ? parseISO(d) : d; return isValid(p) ? format(p, 'dd/MM/yyyy HH:mm') : '-'; } catch { return '-'; }
};
const fmtDateShort = (d: string | Date | undefined): string => {
  if (!d) return '-';
  try { const p = typeof d === 'string' ? parseISO(d) : d; return isValid(p) ? format(p, 'dd/MM') : '-'; } catch { return '-'; }
};

const ESTADOS_TAREA = [
  { value: 'pendiente', label: 'Pendiente', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', dot: 'bg-amber-400' },
  { value: 'en_progreso', label: 'En progreso', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', dot: 'bg-blue-400' },
  { value: 'completada', label: 'Completada', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', dot: 'bg-green-400' },
  { value: 'cancelada', label: 'Cancelada', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400', dot: 'bg-slate-400' },
];

const PRIORIDADES_TAREA = [
  { value: 'baja', label: 'Baja', color: 'text-slate-500', bg: 'bg-slate-100' },
  { value: 'media', label: 'Media', color: 'text-blue-500', bg: 'bg-blue-100' },
  { value: 'alta', label: 'Alta', color: 'text-orange-500', bg: 'bg-orange-100' },
  { value: 'urgente', label: 'Urgente', color: 'text-red-500', bg: 'bg-red-100' },
];

const COLORES_ETIQUETA = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#6b7280'];

const CATEGORIAS_TAREA = [
  { value: 'general', label: 'General' },
  { value: 'flota', label: 'Flota' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'conductores', label: 'Conductores' },
  { value: 'facturacion', label: 'Facturacion' },
];

const TIPOS_CHATTER = [
  { value: 'mensaje', label: 'Mensaje', icon: MessageSquare, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'actividad', label: 'Actividad', icon: FileText, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'cambio_estado', label: 'Cambio', icon: ArrowRight, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
];

export default function Comunicacion() {
  const location = useLocation();
  const { showToast } = useUIStore();
  const { usuario } = useAuthStore();

  // Tab activa
  const [activeTab, setActiveTab] = useState('notificaciones');

  // NOTIFICACIONES
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [notifResumen, setNotifResumen] = useState({ total: 0, no_leidas: 0, alertas_criticas: 0, alertas_aviso: 0 });
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifFiltro, setNotifFiltro] = useState<'todas' | 'no_leidas'>('todas');

  // TAREAS
  const [tareas, setTareas] = useState<any[]>([]);
  const [tareaResumen, setTareaResumen] = useState({ total: 0, pendientes: 0, en_progreso: 0, completadas: 0, urgentes: 0, vencidas: 0 });
  const [tareaLoading, setTareaLoading] = useState(false);
  const [tareaEstadoFiltro, setTareaEstadoFiltro] = useState<string>('todos');

  // USUARIOS (para asignacion)
  const [usuarios, setUsuarios] = useState<any[]>([]);

  // Creacion rapida inline
  const [creandoRapidoEn, setCreandoRapidoEn] = useState<string>('');
  const [tituloRapido, setTituloRapido] = useState('');

  // Drag & drop
  const [draggingTarea, setDraggingTarea] = useState<any>(null);

  // Modal nueva tarea (completa)
  const [isNuevaTareaOpen, setIsNuevaTareaOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nuevaTarea, setNuevaTarea] = useState<Record<string, any>>({
    titulo: '', descripcion: '', prioridad: 'media', fecha_limite: '', categoria: 'general', etiquetas: [] as string[], asignados: [] as number[]
  });
  const [etiquetaInput, setEtiquetaInput] = useState('');

  // Modal ver/editar tarea
  const [tareaSeleccionada, setTareaSeleccionada] = useState<any>(null);
  const [isVerTareaOpen, setIsVerTareaOpen] = useState(false);
  const [tareaTab, setTareaTab] = useState('detalle');
  const [modoEdicion, setModoEdicion] = useState(false);
  const [tareaEditando, setTareaEditando] = useState<Record<string, any>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Chatter
  const [chatterMsgs, setChatterMsgs] = useState<any[]>([]);
  const [chatterInput, setChatterInput] = useState('');
  const [chatterTipo, setChatterTipo] = useState('mensaje');
  const [chatterLoading, setChatterLoading] = useState(false);

  // Subtareas creacion rapida
  const [subtareaInput, setSubtareaInput] = useState('');

  // Modal nueva notificacion manual
  const [isNuevaNotifOpen, setIsNuevaNotifOpen] = useState(false);
  const [nuevaNotif, setNuevaNotif] = useState({
    titulo: '', mensaje: '', tipo: 'sistema', rol_destino: '', permiso_requerido: ''
  });

  // Leer tab de URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) setActiveTab(tab);
  }, [location.search]);

  // Cargar usuarios
  const cargarUsuarios = async () => {
    try {
      const res = await usersApi.getAll();
      const arr = Array.isArray(res) ? res : (res.data || []);
      setUsuarios(arr);
    } catch { /* ignorar */ }
  };

  // Cargar notificaciones
  const cargarNotificaciones = async () => {
    setNotifLoading(true);
    try {
      const [lista, resumen] = await Promise.all([
        notificacionesApi.getAll({ soloNoLeidas: notifFiltro === 'no_leidas' }),
        notificacionesApi.getResumen(),
      ]);
      setNotificaciones(Array.isArray(lista) ? lista : (lista.data || []));
      setNotifResumen(resumen || { total: 0, no_leidas: 0, alertas_criticas: 0, alertas_aviso: 0 });
    } catch { /* ignorar */ }
    finally { setNotifLoading(false); }
  };

  // Cargar tareas
  const cargarTareas = async () => {
    setTareaLoading(true);
    try {
      const [lista, resumen] = await Promise.all([
        userTasksApi.getAll({ 
          estado: tareaEstadoFiltro !== 'todos' ? tareaEstadoFiltro : undefined,
          asignado_a_mi: true,
        }),
        userTasksApi.getResumen(),
      ]);
      const arr = Array.isArray(lista) ? lista : (lista.data || []);
      setTareas(normalizarTareas(arr));
      setTareaResumen(resumen || { total: 0, pendientes: 0, en_progreso: 0, completadas: 0, urgentes: 0, vencidas: 0 });
    } catch { /* ignorar */ }
    finally { setTareaLoading(false); }
  };

  const normalizarTareas = (arr: any[]) => arr.map((t: any) => ({
    id: t.id,
    titulo: t.titulo,
    descripcion: t.descripcion,
    estado: t.estado,
    prioridad: t.prioridad,
    fechaLimite: t.fecha_limite || t.fechaLimite,
    fechaCreacion: t.fecha_creacion || t.fechaCreacion,
    fechaCompletada: t.fecha_completada || t.fechaCompletada,
    categoria: t.categoria,
    referenciaId: t.referencia_id || t.referenciaId,
    referenciaTipo: t.referencia_tipo || t.referenciaTipo,
    userId: t.user_id || t.userId,
    creadoPor: t.creado_por || t.creadoPor,
    parentId: t.parent_id || t.parentId,
    etiquetas: (t.etiquetas_rel || t.etiquetas || []).map((e: any) => ({
      id: e.id, etiqueta: e.etiqueta, color: e.color
    })),
    asignados: (t.asignados_rel || t.asignados || []).map((a: any) => ({
      id: a.id, userId: a.user_id || a.userId, esResponsable: a.es_responsable || a.esResponsable
    })),
    seguidores: (t.seguidores_rel || t.seguidores || []).map((s: any) => ({
      id: s.id, userId: s.user_id || s.userId
    })),
    dependencias: (t.dependencias_rel || t.dependencias || []).map((d: any) => ({
      id: d.id, dependeDeId: d.depende_de_id || d.dependeDeId
    })),
    chatter: (t.chatter_rel || t.chatter || []).map((c: any) => ({
      id: c.id, userId: c.user_id || c.userId, tipo: c.tipo, contenido: c.contenido,
      fechaCreacion: c.fecha_creacion || c.fechaCreacion
    })),
  }));

  useEffect(() => { cargarNotificaciones(); }, [notifFiltro]);
  useEffect(() => { cargarTareas(); cargarUsuarios(); }, [tareaEstadoFiltro]);

  // Prioridad auto-detectada por ! al final del titulo
  const detectarPrioridad = (titulo: string): string => {
    if (titulo.endsWith('!!!')) return 'urgente';
    if (titulo.endsWith('!!')) return 'alta';
    if (titulo.endsWith('!')) return 'media';
    return 'baja';
  };
  const limpiarTitulo = (titulo: string): string => {
    return titulo.replace(/!+$/, '').trim();
  };

  // CREACION RAPIDA INLINE
  const crearTareaRapida = async (estadoDestino: string) => {
    if (!tituloRapido.trim()) return;
    const prioridad = detectarPrioridad(tituloRapido);
    const tituloLimpio = limpiarTitulo(tituloRapido);
    try {
      await userTasksApi.create({
        titulo: tituloLimpio,
        estado: estadoDestino,
        prioridad,
        categoria: 'general',
        etiquetas: prioridad === 'urgente' ? ['urgente'] : [],
      });
      showToast('Tarea creada', 'success');
      setTituloRapido('');
      setCreandoRapidoEn('');
      cargarTareas();
    } catch (err: any) { showToast(`Error: ${err.message}`, 'error'); }
  };

  // CREACION COMPLETA (modal)
  const crearTareaCompleta = async () => {
    if (!nuevaTarea.titulo?.trim()) { showToast('El titulo es obligatorio', 'error'); return; }
    setIsSubmitting(true);
    try {
      const prioridad = detectarPrioridad(nuevaTarea.titulo);
      const tituloLimpio = limpiarTitulo(nuevaTarea.titulo);
      await userTasksApi.create({
        titulo: tituloLimpio,
        descripcion: nuevaTarea.descripcion || null,
        prioridad,
        estado: 'pendiente',
        fecha_limite: nuevaTarea.fecha_limite ? nuevaTarea.fecha_limite + 'T00:00:00' : null,
        categoria: nuevaTarea.categoria || 'general',
        etiquetas: nuevaTarea.etiquetas || [],
        asignados: nuevaTarea.asignados?.length > 0 ? nuevaTarea.asignados : undefined,
      });
      showToast('Tarea creada', 'success');
      setIsNuevaTareaOpen(false);
      setNuevaTarea({ titulo: '', descripcion: '', prioridad: 'media', fecha_limite: '', categoria: 'general', etiquetas: [], asignados: [] });
      cargarTareas();
    } catch (err: any) { showToast(`Error: ${err.message}`, 'error'); }
    finally { setIsSubmitting(false); }
  };

  // DRAG & DROP
  const handleDragStart = (tarea: any) => { setDraggingTarea(tarea); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = async (e: React.DragEvent, estadoDestino: string) => {
    e.preventDefault();
    if (!draggingTarea || draggingTarea.estado === estadoDestino) { setDraggingTarea(null); return; }
    const depsPendientes = draggingTarea.dependencias?.filter((d: any) => {
      const tDep = tareas.find(t => t.id === d.dependeDeId);
      return tDep && tDep.estado !== 'completada';
    });
    if (estadoDestino === 'completada' && depsPendientes?.length > 0) {
      showToast(`No se puede completar: tiene ${depsPendientes.length} dependencia(s) pendiente(s)`, 'error');
      setDraggingTarea(null);
      return;
    }
    try {
      await userTasksApi.update(String(draggingTarea.id), { estado: estadoDestino });
      showToast(`Tarea movida a ${ESTADOS_TAREA.find(e => e.value === estadoDestino)?.label}`, 'success');
      setDraggingTarea(null);
      cargarTareas();
    } catch { showToast('Error al mover tarea', 'error'); setDraggingTarea(null); }
  };

  const cambiarEstadoTarea = async (id: string, nuevoEstado: string) => {
    try {
      await userTasksApi.update(id, { estado: nuevoEstado });
      showToast(`Estado cambiado`, 'success');
      cargarTareas();
    } catch { showToast('Error', 'error'); }
  };

  const eliminarTarea = async (id: string) => {
    if (!window.confirm('Eliminar tarea?')) return;
    try { await userTasksApi.delete(id); showToast('Tarea eliminada', 'success'); cargarTareas(); }
    catch { showToast('Error', 'error'); }
  };

  // CHATTER (persistente via API)
  const cargarChatter = async (taskId: string) => {
    setChatterLoading(true);
    try {
      const res = await userTasksApi.getChatter(taskId);
      const arr = Array.isArray(res) ? res : (res.data || []);
      setChatterMsgs(arr.map((c: any) => ({
        id: c.id,
        userId: c.user_id || c.userId,
        tipo: c.tipo,
        contenido: c.contenido,
        fechaCreacion: c.fecha_creacion || c.fechaCreacion,
      })));
    } catch { /* ignorar */ }
    finally { setChatterLoading(false); }
  };

  const enviarChatter = async () => {
    if (!chatterInput.trim() || !tareaSeleccionada) return;
    setChatterLoading(true);
    try {
      await userTasksApi.addChatter(String(tareaSeleccionada.id), {
        contenido: chatterInput,
        tipo: chatterTipo,
      });
      setChatterInput('');
      await cargarChatter(String(tareaSeleccionada.id));
      // Refrescar tarea para que aparezca el nuevo chatter en la lista
      await refrescarTareaSeleccionada();
    } catch (err: any) { showToast(`Error al enviar mensaje: ${err.message}`, 'error'); }
    finally { setChatterLoading(false); }
  };

  // SEGUIDORES (persistente via API)
  const toggleSeguir = async (tarea: any) => {
    if (!tarea) return;
    const siguiendo = tarea.seguidores?.some((s: any) => s.userId === usuario?.id);
    try {
      if (siguiendo) {
        await userTasksApi.dejarSeguir(String(tarea.id));
        showToast('Dejaste de seguir', 'success');
      } else {
        await userTasksApi.seguir(String(tarea.id));
        showToast('Ahora sigues esta tarea', 'success');
      }
      await refrescarTareaSeleccionada();
      cargarTareas();
    } catch (err: any) { showToast(`Error: ${err.message}`, 'error'); }
  };

  // REFRESCAR TAREA SELECCIONADA
  const refrescarTareaSeleccionada = async () => {
    if (!tareaSeleccionada) return;
    try {
      const res = await userTasksApi.getById(String(tareaSeleccionada.id));
      const t = res.data || res;
      if (t) {
        const normalizada = normalizarTareas([t])[0];
        setTareaSeleccionada(normalizada);
        setChatterMsgs(normalizada.chatter || []);
      }
    } catch { /* ignorar */ }
  };

  // VER / EDITAR TAREA
  const abrirTarea = (t: any) => {
    setTareaSeleccionada(t);
    setChatterMsgs(t.chatter || []);
    setTareaTab('detalle');
    setModoEdicion(false);
    setIsVerTareaOpen(true);
    cargarChatter(String(t.id));
  };

  const iniciarEdicion = () => {
    if (!tareaSeleccionada) return;
    setTareaEditando({
      titulo: tareaSeleccionada.titulo || '',
      descripcion: tareaSeleccionada.descripcion || '',
      prioridad: tareaSeleccionada.prioridad || 'media',
      estado: tareaSeleccionada.estado || 'pendiente',
      fecha_limite: tareaSeleccionada.fechaLimite ? tareaSeleccionada.fechaLimite.slice(0, 10) : '',
      categoria: tareaSeleccionada.categoria || 'general',
      etiquetas: tareaSeleccionada.etiquetas?.map((e: any) => e.etiqueta) || [],
      asignados: tareaSeleccionada.asignados?.map((a: any) => a.userId) || [],
    });
    setModoEdicion(true);
  };

  const guardarEdicion = async () => {
    if (!tareaSeleccionada || !tareaEditando.titulo?.trim()) return;
    setEditSubmitting(true);
    try {
      await userTasksApi.update(String(tareaSeleccionada.id), {
        titulo: tareaEditando.titulo,
        descripcion: tareaEditando.descripcion || null,
        prioridad: tareaEditando.prioridad,
        estado: tareaEditando.estado,
        fecha_limite: tareaEditando.fecha_limite ? tareaEditando.fecha_limite + 'T00:00:00' : null,
        categoria: tareaEditando.categoria || 'general',
        etiquetas: tareaEditando.etiquetas || [],
        asignados: tareaEditando.asignados?.length > 0 ? tareaEditando.asignados : [],
      });
      showToast('Tarea actualizada', 'success');
      setModoEdicion(false);
      await refrescarTareaSeleccionada();
      cargarTareas();
    } catch (err: any) { showToast(`Error: ${err.message}`, 'error'); }
    finally { setEditSubmitting(false); }
  };

  // SUBTAREAS
  const subtareasDeTarea = useMemo(() => {
    if (!tareaSeleccionada) return [];
    return tareas.filter(t => t.parentId === tareaSeleccionada.id);
  }, [tareas, tareaSeleccionada]);

  const crearSubtarea = async () => {
    if (!subtareaInput.trim() || !tareaSeleccionada) return;
    const prioridad = detectarPrioridad(subtareaInput);
    const tituloLimpio = limpiarTitulo(subtareaInput);
    try {
      await userTasksApi.create({
        titulo: tituloLimpio,
        estado: 'pendiente',
        prioridad,
        categoria: tareaSeleccionada.categoria || 'general',
        parent_id: tareaSeleccionada.id,
      });
      showToast('Subtarea creada', 'success');
      setSubtareaInput('');
      cargarTareas();
    } catch (err: any) { showToast(`Error: ${err.message}`, 'error'); }
  };

  const completarSubtarea = async (subId: string, completada: boolean) => {
    try {
      await userTasksApi.update(subId, { estado: completada ? 'completada' : 'pendiente' });
      cargarTareas();
    } catch { showToast('Error', 'error'); }
  };

  // Helpers usuarios
  const nombreUsuario = (uid: number) => {
    const u = usuarios.find(u => u.id === uid);
    return u ? (u.nombre_completo || u.username) : `Usuario #${uid}`;
  };

  // Tareas agrupadas
  const tareasPorEstado = useMemo(() => {
    const grupos: Record<string, any[]> = { pendiente: [], en_progreso: [], completada: [], cancelada: [] };
    tareas.forEach(t => { if (!t.parentId) { const e = t.estado || 'pendiente'; if (grupos[e]) grupos[e].push(t); } });
    return grupos;
  }, [tareas]);

  const diasRestantes = (fecha: string | undefined): number | null => {
    if (!fecha) return null;
    try { return differenceInDays(parseISO(fecha), new Date()); } catch { return null; }
  };

  const marcarNotifLeida = async (id: number) => {
    try {
      await notificacionesApi.marcarLeida(id);
      setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
      setNotifResumen(prev => ({ ...prev, no_leidas: Math.max(0, prev.no_leidas - 1) }));
      showToast('Notificacion marcada', 'success');
    } catch { showToast('Error', 'error'); }
  };

  const crearNotificacionManual = async () => {
    if (!nuevaNotif.titulo.trim() || !nuevaNotif.mensaje.trim()) { showToast('Titulo y mensaje son obligatorios', 'error'); return; }
    setIsSubmitting(true);
    try {
      await notificacionesApi.create({
        tipo: nuevaNotif.tipo,
        titulo: nuevaNotif.titulo,
        mensaje: nuevaNotif.mensaje,
        rol_destino: nuevaNotif.rol_destino || null,
        permiso_requerido: nuevaNotif.permiso_requerido || null,
      });
      showToast('Notificacion enviada', 'success');
      setIsNuevaNotifOpen(false);
      setNuevaNotif({ titulo: '', mensaje: '', tipo: 'sistema', rol_destino: '', permiso_requerido: '' });
      cargarNotificaciones();
    } catch (err: any) { showToast(`Error: ${err.message}`, 'error'); }
    finally { setIsSubmitting(false); }
  };

  const revisarDocumentacion = async () => {
    try {
      const res = await notificacionesApi.revisarDocumentacion();
      showToast(res.message || 'Revision completada', 'success');
      cargarNotificaciones();
    } catch (err: any) { showToast(`Error: ${err.message}`, 'error'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Comunicacion</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Notificaciones, tareas, chat y mailing</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="dark:bg-slate-800">
          <TabsTrigger value="notificaciones" className="flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            Notificaciones
            {notifResumen.no_leidas > 0 && (
              <span className="ml-1 text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5">{notifResumen.no_leidas}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="tareas" className="flex items-center gap-1.5">
            <ListTodo className="h-3.5 w-3.5" />
            Mis Tareas
            {tareaResumen.pendientes > 0 && (
              <span className="ml-1 text-[10px] bg-amber-500 text-white rounded-full px-1.5 py-0.5">{tareaResumen.pendientes}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="mailing" className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Mailing
          </TabsTrigger>
        </TabsList>

        {/* ============== TAB: NOTIFICACIONES ============== */}
        <TabsContent value="notificaciones" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total', value: notifResumen.total, icon: Inbox },
              { label: 'No leidas', value: notifResumen.no_leidas, icon: Bell, color: 'text-red-500' },
              { label: 'Alertas criticas', value: notifResumen.alertas_criticas, icon: AlertTriangle, color: 'text-red-500' },
              { label: 'Avisos', value: notifResumen.alertas_aviso, icon: Clock, color: 'text-amber-500' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center gap-3">
                <s.icon className={`h-5 w-5 ${s.color || 'text-slate-500'}`} />
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{s.value}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button size="sm" variant={notifFiltro === 'todas' ? 'default' : 'outline'} onClick={() => setNotifFiltro('todas')} className="h-8 text-xs dark:border-slate-600">Todas</Button>
              <Button size="sm" variant={notifFiltro === 'no_leidas' ? 'default' : 'outline'} onClick={() => setNotifFiltro('no_leidas')} className="h-8 text-xs dark:border-slate-600">No leidas</Button>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={revisarDocumentacion} className="h-8 text-xs dark:border-slate-600">
                <Shield className="h-3.5 w-3.5 mr-1" />Revisar doc.
              </Button>
              <Button size="sm" onClick={() => setIsNuevaNotifOpen(true)} className="h-8 text-xs bg-[#1e3a5f] dark:bg-blue-600">
                <Plus className="h-3.5 w-3.5 mr-1" />Nueva alerta
              </Button>
            </div>
          </div>

          {notifLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}</div>
          ) : notificaciones.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500"><Bell className="h-10 w-10 mx-auto mb-3" /><p className="text-sm">Sin notificaciones</p></div>
          ) : (
            <div className="space-y-2">
              {notificaciones.map(n => {
                let destino = 'Todos';
                if (n.user_id) destino = `Usuario #${n.user_id}`;
                else if (n.rol_destino) destino = `Rol: ${n.rol_destino}`;
                else if (n.permiso_requerido) destino = `Permiso: ${n.permiso_requerido}`;
                return (
                  <div key={n.id} className={`rounded-lg border p-3 ${n.leida ? 'opacity-60' : ''} bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${n.tipo === 'taller' ? 'bg-amber-100 text-amber-700' : n.tipo === 'averia' ? 'bg-red-100 text-red-700' : n.tipo === 'documentacion' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>{n.tipo}</span>
                          <span className="text-[10px] text-slate-400">Para: {destino}</span>
                          {!n.leida && <span className="h-2 w-2 bg-blue-500 rounded-full" />}
                        </div>
                        <h4 className="text-sm font-medium dark:text-slate-200">{n.titulo}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{n.mensaje}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{fmtDate(n.fecha_creacion)}</p>
                      </div>
                      {!n.leida && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => marcarNotifLeida(n.id)}>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ============== TAB: TAREAS (KANBAN AVANZADO) ============== */}
        <TabsContent value="tareas" className="space-y-4 pt-4">
          {/* Stats modernas */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total', value: tareaResumen.total },
              { label: 'Pendientes', value: tareaResumen.pendientes, color: 'text-amber-600' },
              { label: 'En progreso', value: tareaResumen.en_progreso, color: 'text-blue-600' },
              { label: 'Completadas', value: tareaResumen.completadas, color: 'text-green-600' },
              { label: 'Urgentes', value: tareaResumen.urgentes, color: 'text-red-600' },
              { label: 'Vencidas', value: tareaResumen.vencidas, color: 'text-red-600' },
            ].map(s => (
              <div key={s.label} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-center">
                <p className={`text-xl font-bold ${s.color || 'text-slate-900 dark:text-slate-100'}`}>{s.value}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Select value={tareaEstadoFiltro} onValueChange={setTareaEstadoFiltro}>
                <SelectTrigger className="h-8 w-36 text-xs dark:bg-slate-900 dark:border-slate-600">
                  <Filter className="h-3 w-3 mr-1" />{tareaEstadoFiltro === 'todos' ? 'Todos' : ESTADOS_TAREA.find(e => e.value === tareaEstadoFiltro)?.label}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {ESTADOS_TAREA.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={() => setIsNuevaTareaOpen(true)} className="h-8 text-xs bg-[#1e3a5f] dark:bg-blue-600">
              <Plus className="h-3.5 w-3.5 mr-1" />Nueva tarea
            </Button>
          </div>

          {/* Kanban Board */}
          {tareaLoading ? (
            <div className="grid grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-64 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {ESTADOS_TAREA.map(estado => (
                <div
                  key={estado.value}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-3"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, estado.value)}
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold dark:text-slate-200 flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${estado.dot}`} />
                      {estado.label}
                    </h3>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400 font-medium bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">{tareasPorEstado[estado.value].length}</span>
                      <button
                        className="h-6 w-6 rounded flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                        onClick={() => setCreandoRapidoEn(estado.value)}
                        title="Crear tarea rapida"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Creacion rapida inline */}
                  {creandoRapidoEn === estado.value && (
                    <div className="mb-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                      <Input
                        autoFocus
                        placeholder="Titulo (! para prioridad)..."
                        value={tituloRapido}
                        onChange={e => setTituloRapido(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') crearTareaRapida(estado.value);
                          if (e.key === 'Escape') { setCreandoRapidoEn(''); setTituloRapido(''); }
                        }}
                        className="h-8 text-xs dark:bg-slate-900 dark:border-slate-600 mb-1"
                      />
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => { setCreandoRapidoEn(''); setTituloRapido(''); }}>Cancelar</Button>
                        <Button size="sm" className="h-6 text-[10px] px-2 bg-[#1e3a5f]" onClick={() => crearTareaRapida(estado.value)}>Agregar</Button>
                      </div>
                    </div>
                  )}

                  {/* Cards */}
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {tareasPorEstado[estado.value].length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">Sin tareas</p>
                    )}
                    {tareasPorEstado[estado.value].map(t => {
                      const dias = diasRestantes(t.fechaLimite);
                      const vencida = dias !== null && dias < 0 && t.estado !== 'completada' && t.estado !== 'cancelada';
                      const bloqueada = t.dependencias?.some((d: any) => {
                        const dep = tareas.find(x => x.id === d.dependeDeId);
                        return dep && dep.estado !== 'completada';
                      });
                      const subtareasCount = tareas.filter(st => st.parentId === t.id).length;
                      return (
                        <div
                          key={t.id}
                          draggable
                          onDragStart={() => handleDragStart(t)}
                          onClick={() => abrirTarea(t)}
                          className={`rounded-lg border p-3 cursor-pointer hover:shadow-md transition-all group ${
                            bloqueada ? 'border-red-200 dark:border-red-700 bg-red-50/30 dark:bg-red-900/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                          } ${vencida ? 'ring-1 ring-red-200' : ''}`}
                        >
                          <div className="flex items-start gap-1.5">
                            <GripVertical className="h-3.5 w-3.5 text-slate-300 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex-1 min-w-0">
                              {/* Etiquetas */}
                              {t.etiquetas?.length > 0 && (
                                <div className="flex gap-1 mb-1.5 flex-wrap">
                                  {t.etiquetas.map((e: any) => (
                                    <span key={e.id} className="text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: e.color || '#6b7280' }}>
                                      {e.etiqueta}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {/* Titulo */}
                              <div className="flex items-start gap-1.5">
                                {t.prioridad === 'urgente' && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />}
                                {bloqueada && <Link2 className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />}
                                <h4 className="text-sm font-medium dark:text-slate-200 line-clamp-2">{t.titulo}</h4>
                              </div>
                              {/* Descripcion */}
                              {t.descripcion && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{t.descripcion}</p>}
                              {/* Meta info */}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className={`text-[10px] font-medium ${PRIORIDADES_TAREA.find(p => p.value === t.prioridad)?.color || ''}`}>{t.prioridad}</span>
                                {t.categoria && <Badge className="text-[9px] bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">{t.categoria}</Badge>}
                                {subtareasCount > 0 && (
                                  <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                                    <CheckCircle2 className="h-3 w-3" />{subtareasCount}
                                  </span>
                                )}
                              </div>
                              {/* Asignados + fecha */}
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex -space-x-1">
                                  {t.asignados?.slice(0, 3).map((a: any, i: number) => (
                                    <div key={i} className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 text-[8px] flex items-center justify-center border border-white dark:border-slate-700" title={a.esResponsable ? 'Responsable' : 'Asignado'}>
                                      {a.userId}
                                    </div>
                                  ))}
                                  {t.asignados?.length > 3 && <span className="text-[8px] text-slate-400 ml-1">+{t.asignados.length - 3}</span>}
                                </div>
                                {t.fechaLimite && (
                                  <p className={`text-[10px] flex items-center gap-1 ${vencida ? 'text-red-500 font-medium' : dias !== null && dias <= 2 ? 'text-amber-500' : 'text-slate-400'}`}>
                                    <Calendar className="h-3 w-3" />
                                    {vencida ? `Vencida (${Math.abs(dias)}d)` : dias !== null ? `${dias}d` : fmtDateShort(t.fechaLimite)}
                                  </p>
                                )}
                              </div>
                              {/* Dependencias */}
                              {t.dependencias?.length > 0 && (
                                <p className="text-[9px] text-red-500 mt-1 flex items-center gap-1">
                                  <Link2 className="h-3 w-3" />
                                  {t.dependencias.length} dependencia(s)
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Chat y Mailing placeholders */}
        <TabsContent value="chat" className="pt-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200 mb-2">Chat interno</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">Mensajeria entre usuarios del equipo. Proximamente.</p>
          </div>
        </TabsContent>
        <TabsContent value="mailing" className="pt-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-12 text-center">
            <Mail className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200 mb-2">Mailing</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">Envio de correos. Proximamente.</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* ============== DIALOG: NUEVA TAREA ============== */}
      <Dialog open={isNuevaTareaOpen} onOpenChange={setIsNuevaTareaOpen}>
        <DialogContent className="max-w-lg dark:border-slate-700 dark:bg-slate-800" style={{ maxWidth: '520px' }}>
          <DialogHeader><DialogTitle className="dark:text-slate-100">Nueva tarea</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Titulo * <span className="text-xs text-slate-400">(usa !, !!, !!! para prioridad)</span></Label>
              <Input value={nuevaTarea.titulo} onChange={e => setNuevaTarea(p => ({ ...p, titulo: e.target.value }))} placeholder="Ej: Revisar documentacion!!" className="dark:bg-slate-900 dark:border-slate-600" />
            </div>
            <div className="space-y-2"><Label>Descripcion</Label><Textarea value={nuevaTarea.descripcion} onChange={e => setNuevaTarea(p => ({ ...p, descripcion: e.target.value }))} rows={2} className="dark:bg-slate-900 dark:border-slate-600" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={nuevaTarea.categoria} onValueChange={v => setNuevaTarea(p => ({ ...p, categoria: v }))}>
                  <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIAS_TAREA.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Fecha limite</Label><Input type="date" value={nuevaTarea.fecha_limite} onChange={e => setNuevaTarea(p => ({ ...p, fecha_limite: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
            </div>
            {/* Asignados */}
            <div className="space-y-2">
              <Label>Asignar a</Label>
              <div className="flex flex-wrap gap-1">
                {usuarios.filter(u => u.activo !== false).map(u => {
                  const selected = nuevaTarea.asignados?.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        setNuevaTarea(prev => ({
                          ...prev,
                          asignados: selected
                            ? (prev.asignados || []).filter((id: number) => id !== u.id)
                            : [...(prev.asignados || []), u.id]
                        }));
                      }}
                      className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${selected ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700' : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600'}`}
                    >
                      {u.nombre_completo || u.username}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Etiquetas */}
            <div className="space-y-2">
              <Label>Etiquetas</Label>
              <div className="flex items-center gap-2">
                <Input value={etiquetaInput} onChange={e => setEtiquetaInput(e.target.value)} placeholder="Ej: urgente, revisar" className="h-8 text-xs dark:bg-slate-900 dark:border-slate-600" onKeyDown={e => {
                  if (e.key === 'Enter' && etiquetaInput.trim()) {
                    setNuevaTarea(p => ({ ...p, etiquetas: [...(p.etiquetas || []), etiquetaInput.trim()] }));
                    setEtiquetaInput('');
                  }
                }} />
                <Button size="sm" variant="outline" className="h-8 text-xs dark:border-slate-600" onClick={() => {
                  if (etiquetaInput.trim()) {
                    setNuevaTarea(p => ({ ...p, etiquetas: [...(p.etiquetas || []), etiquetaInput.trim()] }));
                    setEtiquetaInput('');
                  }
                }}>Añadir</Button>
              </div>
              <div className="flex gap-1 flex-wrap">
                {(nuevaTarea.etiquetas || []).map((tag: string, i: number) => (
                  <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 flex items-center gap-1">
                    {tag}
                    <button onClick={() => setNuevaTarea(p => ({ ...p, etiquetas: (p.etiquetas || []).filter((_: string, idx: number) => idx !== i) }))} className="hover:text-red-500"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsNuevaTareaOpen(false)} className="dark:border-slate-600">Cancelar</Button>
              <Button size="sm" onClick={crearTareaCompleta} disabled={isSubmitting} className="bg-[#1e3a5f] dark:bg-blue-600">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear tarea'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============== DIALOG: VER / EDITAR TAREA ============== */}
      <Dialog open={isVerTareaOpen} onOpenChange={(open) => {
        if (!open) { setIsVerTareaOpen(false); setModoEdicion(false); }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800" style={{ maxWidth: '700px' }}>
          {tareaSeleccionada && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2 dark:text-slate-100 flex-1 min-w-0">
                    {tareaSeleccionada.prioridad === 'urgente' && <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />}
                    <span className="truncate">{tareaSeleccionada.titulo}</span>
                  </DialogTitle>
                  {!modoEdicion && (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0" onClick={iniciarEdicion} title="Editar tarea">
                      <Pencil className="h-4 w-4 text-slate-500" />
                    </Button>
                  )}
                </div>
              </DialogHeader>

              {modoEdicion ? (
                /* ===== MODO EDICION ===== */
                <div className="space-y-3 py-2">
                  <div className="space-y-2">
                    <Label>Titulo *</Label>
                    <Input value={tareaEditando.titulo} onChange={e => setTareaEditando(p => ({ ...p, titulo: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                  <div className="space-y-2">
                    <Label>Descripcion</Label>
                    <Textarea value={tareaEditando.descripcion} onChange={e => setTareaEditando(p => ({ ...p, descripcion: e.target.value }))} rows={2} className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Prioridad</Label>
                      <Select value={tareaEditando.prioridad} onValueChange={v => setTareaEditando(p => ({ ...p, prioridad: v }))}>
                        <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PRIORIDADES_TAREA.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Select value={tareaEditando.estado} onValueChange={v => setTareaEditando(p => ({ ...p, estado: v }))}>
                        <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ESTADOS_TAREA.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Select value={tareaEditando.categoria} onValueChange={v => setTareaEditando(p => ({ ...p, categoria: v }))}>
                        <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                        <SelectContent>{CATEGORIAS_TAREA.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha limite</Label>
                      <Input type="date" value={tareaEditando.fecha_limite} onChange={e => setTareaEditando(p => ({ ...p, fecha_limite: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" />
                    </div>
                  </div>
                  {/* Asignados edicion */}
                  <div className="space-y-2">
                    <Label>Asignados</Label>
                    <div className="flex flex-wrap gap-1">
                      {usuarios.filter(u => u.activo !== false).map(u => {
                        const selected = tareaEditando.asignados?.includes(u.id);
                        return (
                          <button
                            key={u.id}
                            onClick={() => {
                              setTareaEditando((prev: any) => ({
                                ...prev,
                                asignados: selected
                                  ? (prev.asignados || []).filter((id: number) => id !== u.id)
                                  : [...(prev.asignados || []), u.id]
                              }));
                            }}
                            className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${selected ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700' : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600'}`}
                          >
                            {u.nombre_completo || u.username}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setModoEdicion(false)} className="dark:border-slate-600">Cancelar</Button>
                    <Button size="sm" onClick={guardarEdicion} disabled={editSubmitting} className="bg-[#1e3a5f] dark:bg-blue-600">
                      {editSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-3.5 w-3.5 mr-1" />Guardar</>}
                    </Button>
                  </div>
                </div>
              ) : (
                /* ===== MODO VISUALIZACION ===== */
                <Tabs value={tareaTab} onValueChange={setTareaTab}>
                  <TabsList className="dark:bg-slate-900">
                    <TabsTrigger value="detalle">Detalle</TabsTrigger>
                    <TabsTrigger value="chatter">Chatter ({chatterMsgs.length})</TabsTrigger>
                    <TabsTrigger value="subtareas">Subtareas ({subtareasDeTarea.length})</TabsTrigger>
                  </TabsList>

                  {/* Detalle */}
                  <TabsContent value="detalle" className="pt-4 space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={ESTADOS_TAREA.find(e => e.value === tareaSeleccionada.estado)?.color}>{ESTADOS_TAREA.find(e => e.value === tareaSeleccionada.estado)?.label}</Badge>
                      <span className={`text-xs font-medium ${PRIORIDADES_TAREA.find(p => p.value === tareaSeleccionada.prioridad)?.color}`}>{tareaSeleccionada.prioridad}</span>
                      {tareaSeleccionada.categoria && <Badge className="text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-700">{tareaSeleccionada.categoria}</Badge>}
                    </div>
                    {tareaSeleccionada.etiquetas?.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {tareaSeleccionada.etiquetas.map((e: any) => (
                          <span key={e.id} className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: e.color }}>{e.etiqueta}</span>
                        ))}
                      </div>
                    )}
                    {tareaSeleccionada.descripcion && <p className="text-sm text-slate-600 dark:text-slate-400">{tareaSeleccionada.descripcion}</p>}
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <div><span className="text-slate-400">Creada:</span> {fmtDate(tareaSeleccionada.fechaCreacion)}</div>
                      {tareaSeleccionada.fechaLimite && <div><span className="text-slate-400">Limite:</span> {fmtDate(tareaSeleccionada.fechaLimite)}</div>}
                      {tareaSeleccionada.fechaCompletada && <div><span className="text-slate-400">Completada:</span> {fmtDate(tareaSeleccionada.fechaCompletada)}</div>}
                      {tareaSeleccionada.creadoPor && <div><span className="text-slate-400">Creado por:</span> {nombreUsuario(tareaSeleccionada.creadoPor)}</div>}
                    </div>

                    {/* Asignados */}
                    {tareaSeleccionada.asignados?.length > 0 && (
                      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1"><Users className="h-3.5 w-3.5" />Asignados</p>
                        <div className="flex flex-wrap gap-2">
                          {tareaSeleccionada.asignados.map((a: any) => (
                            <div key={a.id} className="flex items-center gap-1.5 text-xs">
                              <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center">{a.userId}</div>
                              <span className="text-slate-600 dark:text-slate-400">{nombreUsuario(a.userId)}</span>
                              {a.esResponsable && <Badge className="text-[9px] bg-amber-100 text-amber-700">Responsable</Badge>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Seguidores */}
                    {tareaSeleccionada.seguidores?.length > 0 && (
                      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1"><Eye className="h-3.5 w-3.5" />Seguidores ({tareaSeleccionada.seguidores.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {tareaSeleccionada.seguidores.map((s: any) => (
                            <div key={s.id} className="flex items-center gap-1.5 text-xs">
                              <div className="h-6 w-6 rounded-full bg-slate-100 text-slate-600 text-[10px] flex items-center justify-center">{s.userId}</div>
                              <span className="text-slate-600 dark:text-slate-400">{nombreUsuario(s.userId)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dependencias */}
                    {tareaSeleccionada.dependencias?.length > 0 && (
                      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1"><Link2 className="h-3.5 w-3.5" />Dependencias</p>
                        {tareaSeleccionada.dependencias.map((d: any) => {
                          const depTarea = tareas.find(t => t.id === d.dependeDeId);
                          const completada = depTarea?.estado === 'completada';
                          return (
                            <div key={d.id} className={`text-xs flex items-center gap-2 py-1 ${completada ? 'text-green-600 line-through' : 'text-red-600'}`}>
                              <span className={`h-2 w-2 rounded-full ${completada ? 'bg-green-400' : 'bg-red-400'}`} />
                              {depTarea ? depTarea.titulo : `Tarea #${d.dependeDeId}`}
                              {completada && <CheckCircle2 className="h-3 w-3" />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Cambiar estado */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-500 mb-2">Cambiar estado:</p>
                      <div className="flex gap-1 flex-wrap">
                        {ESTADOS_TAREA.filter(e => e.value !== tareaSeleccionada.estado).map(e => (
                          <Button key={e.value} size="sm" variant="outline" className="h-7 text-xs dark:border-slate-600" onClick={() => { cambiarEstadoTarea(String(tareaSeleccionada.id), e.value); setIsVerTareaOpen(false); }}>{e.label}</Button>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between pt-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs dark:border-slate-600" onClick={() => toggleSeguir(tareaSeleccionada)}>
                        <Eye className="h-3 w-3 mr-1" />
                        {tareaSeleccionada.seguidores?.some((s: any) => s.userId === usuario?.id) ? 'Dejar de seguir' : 'Seguir'}
                      </Button>
                      <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => { eliminarTarea(String(tareaSeleccionada.id)); setIsVerTareaOpen(false); }}>
                        <Trash2 className="h-3 w-3 mr-1" />Eliminar
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Chatter (Timeline moderno) */}
                  <TabsContent value="chatter" className="pt-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Select value={chatterTipo} onValueChange={setChatterTipo}>
                        <SelectTrigger className="h-8 w-32 text-xs dark:bg-slate-900 dark:border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_CHATTER.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input value={chatterInput} onChange={e => setChatterInput(e.target.value)} placeholder="Escribe un mensaje..." className="h-8 text-xs dark:bg-slate-900 dark:border-slate-600" onKeyDown={e => { if (e.key === 'Enter') enviarChatter(); }} />
                      <Button size="sm" className="h-8 px-2 bg-[#1e3a5f]" onClick={enviarChatter} disabled={chatterLoading}>
                        {chatterLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {chatterMsgs.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Sin mensajes</p>}
                      {chatterMsgs.map((m: any, idx: number) => {
                        const tipoConfig = TIPOS_CHATTER.find(t => t.value === m.tipo) || TIPOS_CHATTER[0];
                        const TipoIcon = tipoConfig.icon;
                        const isMe = m.userId === usuario?.id;
                        return (
                          <div key={m.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-medium ${isMe ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                              {isMe ? 'Yo' : (m.userId || '?')}
                            </div>
                            <div className={`max-w-[80%] rounded-lg p-2.5 text-xs ${isMe ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800' : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700'}`}>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${tipoConfig.color}`}>
                                  <TipoIcon className="h-3 w-3" />{m.tipo}
                                </span>
                                <span className="text-[9px] text-slate-400">{nombreUsuario(m.userId)}</span>
                                <span className="text-[9px] text-slate-400 ml-auto">{fmtDate(m.fechaCreacion)}</span>
                              </div>
                              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{m.contenido}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>

                  {/* Subtareas */}
                  <TabsContent value="subtareas" className="pt-4 space-y-4">
                    {/* Crear subtarea */}
                    <div className="flex items-center gap-2">
                      <Input
                        value={subtareaInput}
                        onChange={e => setSubtareaInput(e.target.value)}
                        placeholder="Nueva subtarea..."
                        className="h-8 text-xs dark:bg-slate-900 dark:border-slate-600"
                        onKeyDown={e => { if (e.key === 'Enter') crearSubtarea(); }}
                      />
                      <Button size="sm" className="h-8 px-2 bg-[#1e3a5f]" onClick={crearSubtarea} disabled={!subtareaInput.trim()}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Lista subtareas */}
                    <div className="space-y-1">
                      {subtareasDeTarea.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-4">Sin subtareas</p>
                      )}
                      {subtareasDeTarea.map((sub: any) => (
                        <div key={sub.id} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-sm transition-shadow">
                          <Checkbox
                            checked={sub.estado === 'completada'}
                            onCheckedChange={(v) => completarSubtarea(String(sub.id), !!v)}
                            className="h-4 w-4"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium dark:text-slate-200 ${sub.estado === 'completada' ? 'line-through text-slate-400' : ''}`}>{sub.titulo}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[9px] ${PRIORIDADES_TAREA.find(p => p.value === sub.prioridad)?.color || ''}`}>{sub.prioridad}</span>
                              <span className="text-[9px] text-slate-400">{fmtDateShort(sub.fechaCreacion)}</span>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => eliminarTarea(String(sub.id))}>
                            <X className="h-3 w-3 text-slate-400" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ============== DIALOG: NUEVA NOTIFICACION ============== */}
      <Dialog open={isNuevaNotifOpen} onOpenChange={setIsNuevaNotifOpen}>
        <DialogContent className="max-w-lg dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader><DialogTitle className="dark:text-slate-100">Nueva alerta</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2"><Label>Titulo *</Label><Input value={nuevaNotif.titulo} onChange={e => setNuevaNotif(p => ({ ...p, titulo: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
            <div className="space-y-2"><Label>Mensaje *</Label><Textarea value={nuevaNotif.mensaje} onChange={e => setNuevaNotif(p => ({ ...p, mensaje: e.target.value }))} rows={2} className="dark:bg-slate-900 dark:border-slate-600" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={nuevaNotif.tipo} onValueChange={v => setNuevaNotif(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sistema">Sistema</SelectItem>
                    <SelectItem value="taller">Taller</SelectItem>
                    <SelectItem value="documentacion">Documentacion</SelectItem>
                    <SelectItem value="servicio">Servicio</SelectItem>
                    <SelectItem value="averia">Averia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rol destino</Label>
                <Select value={nuevaNotif.rol_destino || 'todos'} onValueChange={v => setNuevaNotif(p => ({ ...p, rol_destino: v === 'todos' ? '' : v }))}>
                  <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="coordinador">Coordinador</SelectItem>
                    <SelectItem value="operario">Operario</SelectItem>
                    <SelectItem value="conductor">Conductor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Permiso requerido (alternativa a rol)</Label>
              <Select value={nuevaNotif.permiso_requerido || 'ninguno'} onValueChange={v => setNuevaNotif(p => ({ ...p, permiso_requerido: v === 'ninguno' ? '' : v }))}>
                <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ninguno">Ninguno</SelectItem>
                  <SelectItem value="vehiculos.ver">Flota</SelectItem>
                  <SelectItem value="servicios.ver">Servicios</SelectItem>
                  <SelectItem value="conductores.ver">Conductores</SelectItem>
                  <SelectItem value="clientes.ver">Clientes</SelectItem>
                  <SelectItem value="facturacion.ver">Facturacion</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsNuevaNotifOpen(false)} className="dark:border-slate-600">Cancelar</Button>
              <Button size="sm" onClick={crearNotificacionManual} disabled={isSubmitting} className="bg-[#1e3a5f] dark:bg-blue-600">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar alerta'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
