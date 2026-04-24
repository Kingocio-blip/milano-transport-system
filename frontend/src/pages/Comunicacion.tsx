// ============================================
// MILANO - Comunicacion
// Notificaciones, Gestor de Tareas (Kanban), Chat, Mailing
// ============================================

import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useUIStore } from '../store';
import { notificacionesApi, userTasksApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Bell, CheckCircle2, Trash2, Plus, Loader2, AlertTriangle, Clock,
  MessageSquare, Mail, ListTodo, Filter, Inbox, Send, X,
  Calendar, ChevronDown, ArrowRight, Wrench, FileText, Shield
} from 'lucide-react';
import { SkeletonPage } from '../components/LoadingScreen';
import { format, parseISO, isValid, isPast, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

const fmtDate = (d: string | Date | undefined): string => {
  if (!d) return '-';
  try { const p = typeof d === 'string' ? parseISO(d) : d; return isValid(p) ? format(p, 'dd/MM/yyyy') : '-'; } catch { return '-'; }
};

const ESTADOS_TAREA = [
  { value: 'pendiente', label: 'Pendiente', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'en_progreso', label: 'En progreso', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'completada', label: 'Completada', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'cancelada', label: 'Cancelada', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
];

const PRIORIDADES_TAREA = [
  { value: 'baja', label: 'Baja', color: 'text-slate-500' },
  { value: 'media', label: 'Media', color: 'text-blue-500' },
  { value: 'alta', label: 'Alta', color: 'text-orange-500' },
  { value: 'urgente', label: 'Urgente', color: 'text-red-500' },
];

const CATEGORIAS_TAREA = [
  { value: 'general', label: 'General' },
  { value: 'flota', label: 'Flota' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'conductores', label: 'Conductores' },
  { value: 'facturacion', label: 'Facturacion' },
];

export default function Comunicacion() {
  const location = useLocation();
  const { showToast } = useUIStore();

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
  const [tareaEstadoFiltro, setTareaEstadoFiltro] = useState<string>('');

  // Modal nueva tarea
  const [isNuevaTareaOpen, setIsNuevaTareaOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nuevaTarea, setNuevaTarea] = useState({
    titulo: '', descripcion: '', prioridad: 'media', fecha_limite: '', categoria: 'general'
  });

  // Modal nueva notificacion manual (broadcast)
  const [isNuevaNotifOpen, setIsNuevaNotifOpen] = useState(false);
  const [nuevaNotif, setNuevaNotif] = useState({
    titulo: '', mensaje: '', tipo: 'sistema', rol_destino: '', permiso_requerido: ''
  });

  // Modal ver tarea
  const [tareaSeleccionada, setTareaSeleccionada] = useState<any>(null);
  const [isVerTareaOpen, setIsVerTareaOpen] = useState(false);

  // Leer tab de URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) setActiveTab(tab);
  }, [location.search]);

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
        userTasksApi.getAll(tareaEstadoFiltro ? { estado: tareaEstadoFiltro } : undefined),
        userTasksApi.getResumen(),
      ]);
      const arr = Array.isArray(lista) ? lista : (lista.data || []);
      // Normalizar snake_case a camelCase
      setTareas(arr.map((t: any) => ({
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
      })));
      setTareaResumen(resumen || { total: 0, pendientes: 0, en_progreso: 0, completadas: 0, urgentes: 0, vencidas: 0 });
    } catch { /* ignorar */ }
    finally { setTareaLoading(false); }
  };

  useEffect(() => {
    cargarNotificaciones();
  }, [notifFiltro]);

  useEffect(() => {
    cargarTareas();
  }, [tareaEstadoFiltro]);

  const marcarNotifLeida = async (id: number) => {
    try {
      await notificacionesApi.marcarLeida(id);
      setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true, fecha_leida: new Date().toISOString() } : n));
      setNotifResumen(prev => ({ ...prev, no_leidas: Math.max(0, prev.no_leidas - 1) }));
      showToast('Notificacion marcada como leida', 'success');
    } catch { showToast('Error al marcar notificacion', 'error'); }
  };

  const crearTarea = async () => {
    if (!nuevaTarea.titulo.trim()) { showToast('El titulo es obligatorio', 'error'); return; }
    setIsSubmitting(true);
    try {
      await userTasksApi.create({
        titulo: nuevaTarea.titulo,
        descripcion: nuevaTarea.descripcion || null,
        prioridad: nuevaTarea.prioridad,
        estado: 'pendiente',
        fecha_limite: nuevaTarea.fecha_limite ? nuevaTarea.fecha_limite + 'T00:00:00' : null,
        categoria: nuevaTarea.categoria,
      });
      showToast('Tarea creada', 'success');
      setIsNuevaTareaOpen(false);
      setNuevaTarea({ titulo: '', descripcion: '', prioridad: 'media', fecha_limite: '', categoria: 'general' });
      cargarTareas();
    } catch (err: any) { showToast(`Error: ${err.message}`, 'error'); }
    finally { setIsSubmitting(false); }
  };

  const cambiarEstadoTarea = async (id: string, nuevoEstado: string) => {
    try {
      await userTasksApi.update(id, { estado: nuevoEstado });
      showToast(`Tarea movida a ${nuevoEstado}`, 'success');
      cargarTareas();
    } catch { showToast('Error al actualizar tarea', 'error'); }
  };

  const eliminarTarea = async (id: string) => {
    if (!window.confirm('Eliminar tarea?')) return;
    try { await userTasksApi.delete(id); showToast('Tarea eliminada', 'success'); cargarTareas(); }
    catch { showToast('Error al eliminar', 'error'); }
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

  // Tareas agrupadas por estado para Kanban
  const tareasPorEstado = useMemo(() => {
    const grupos: Record<string, any[]> = { pendiente: [], en_progreso: [], completada: [], cancelada: [] };
    tareas.forEach(t => { const e = t.estado || 'pendiente'; if (grupos[e]) grupos[e].push(t); });
    return grupos;
  }, [tareas]);

  const diasRestantes = (fecha: string | undefined): number | null => {
    if (!fecha) return null;
    try { return differenceInDays(parseISO(fecha), new Date()); } catch { return null; }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
          {/* Stats */}
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

          {/* Filtros y acciones */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button size="sm" variant={notifFiltro === 'todas' ? 'default' : 'outline'} onClick={() => setNotifFiltro('todas')} className="h-8 text-xs dark:border-slate-600">
                Todas
              </Button>
              <Button size="sm" variant={notifFiltro === 'no_leidas' ? 'default' : 'outline'} onClick={() => setNotifFiltro('no_leidas')} className="h-8 text-xs dark:border-slate-600">
                No leidas
              </Button>
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

          {/* Lista */}
          {notifLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}
            </div>
          ) : notificaciones.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
              <Bell className="h-10 w-10 mx-auto mb-3" />
              <p className="text-sm">Sin notificaciones</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notificaciones.map(n => {
                // Determinar destinatario
                let destino = 'Todos';
                if (n.user_id) destino = `Usuario #${n.user_id}`;
                else if (n.rol_destino) destino = `Rol: ${n.rol_destino}`;
                else if (n.permiso_requerido) destino = `Permiso: ${n.permiso_requerido}`;
                return (
                <div key={n.id} className={`rounded-lg border p-3 transition-all ${
                  n.leida ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-70' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                          n.tipo === 'taller' ? 'bg-amber-100 text-amber-700' :
                          n.tipo === 'averia' ? 'bg-red-100 text-red-700' :
                          n.tipo === 'documentacion' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>{n.tipo}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">Para: {destino}</span>
                        {!n.leida && <span className="h-2 w-2 bg-blue-500 rounded-full" />}
                      </div>
                      <h4 className="text-sm font-medium dark:text-slate-200">{n.titulo}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{n.mensaje}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{fmtDate(n.fecha_creacion)}</p>
                    </div>
                    {!n.leida && (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => marcarNotifLeida(n.id)} title="Marcar como leida">
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

        {/* ============== TAB: TAREAS (KANBAN) ============== */}
        <TabsContent value="tareas" className="space-y-4 pt-4">
          {/* Stats */}
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
              <Select value={tareaEstadoFiltro || 'todos'} onValueChange={(v) => setTareaEstadoFiltro(v === 'todos' ? '' : v)}>
                <SelectTrigger className="h-8 w-36 text-xs dark:bg-slate-900 dark:border-slate-600">
                  <Filter className="h-3 w-3 mr-1" />{tareaEstadoFiltro || 'Todos'}
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
                <div key={estado.value} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-3">
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold dark:text-slate-200 flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${estado.value === 'pendiente' ? 'bg-amber-400' : estado.value === 'en_progreso' ? 'bg-blue-400' : estado.value === 'completada' ? 'bg-green-400' : 'bg-slate-400'}`} />
                      {estado.label}
                    </h3>
                    <span className="text-xs text-slate-400">{tareasPorEstado[estado.value].length}</span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {tareasPorEstado[estado.value].length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">Sin tareas</p>
                    )}
                    {tareasPorEstado[estado.value].map(t => {
                      const dias = diasRestantes(t.fechaLimite);
                      const vencida = dias !== null && dias < 0 && t.estado !== 'completada' && t.estado !== 'cancelada';
                      return (
                        <div key={t.id} 
                          onClick={() => { setTareaSeleccionada(t); setIsVerTareaOpen(true); }}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 cursor-pointer hover:shadow-md transition-all group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-medium dark:text-slate-200 line-clamp-2">{t.titulo}</h4>
                            {t.prioridad === 'urgente' && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                          </div>
                          {t.descripcion && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{t.descripcion}</p>}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className={`text-[10px] ${PRIORIDADES_TAREA.find(p => p.value === t.prioridad)?.color || ''}`}>
                              {t.prioridad}
                            </span>
                            {t.categoria && <Badge className="text-[9px] bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">{t.categoria}</Badge>}
                          </div>
                          {t.fechaLimite && (
                            <p className={`text-[10px] mt-1.5 flex items-center gap-1 ${vencida ? 'text-red-500' : dias !== null && dias <= 2 ? 'text-amber-500' : 'text-slate-400'}`}>
                              <Calendar className="h-3 w-3" />
                              {vencida ? `Vencida (${Math.abs(dias)}d)` : dias !== null ? `${dias}d rest.` : fmtDate(t.fechaLimite)}
                            </p>
                          )}
                          {/* Acciones rápidas */}
                          <div className="flex gap-1 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                            {t.estado !== 'en_progreso' && t.estado !== 'completada' && t.estado !== 'cancelada' && (
                              <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={e => { e.stopPropagation(); cambiarEstadoTarea(String(t.id), 'en_progreso'); }}>
                                <ArrowRight className="h-3 w-3 mr-0.5" />En progreso
                              </Button>
                            )}
                            {t.estado !== 'completada' && t.estado !== 'cancelada' && (
                              <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-green-600" onClick={e => { e.stopPropagation(); cambiarEstadoTarea(String(t.id), 'completada'); }}>
                                <CheckCircle2 className="h-3 w-3 mr-0.5" />Completar
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-red-500 ml-auto" onClick={e => { e.stopPropagation(); eliminarTarea(String(t.id)); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
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

        {/* ============== TAB: CHAT ============== */}
        <TabsContent value="chat" className="pt-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200 mb-2">Chat interno</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
              Sistema de mensajeria entre usuarios del equipo. Podras enviar mensajes directos, 
              crear grupos de conversacion y compartir archivos.
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-400">
              <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700">Mensajes directos</span>
              <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700">Grupos de equipo</span>
              <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700">Archivos adjuntos</span>
              <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700">Notificaciones en tiempo real</span>
            </div>
          </div>
        </TabsContent>

        {/* ============== TAB: MAILING ============== */}
        <TabsContent value="mailing" className="pt-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-12 text-center">
            <Mail className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200 mb-2">Mailing</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
              Envio de correos electronicos a clientes y conductores. Integracion con SendGrid / AWS SES.
              Templates personalizables, programacion de envios y tracking de aperturas.
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-400">
              <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700">Templates de email</span>
              <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700">Envio masivo</span>
              <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700">Programacion</span>
              <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700">Tracking</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ============== DIALOG: NUEVA TAREA ============== */}
      <Dialog open={isNuevaTareaOpen} onOpenChange={setIsNuevaTareaOpen}>
        <DialogContent className="max-w-lg dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader><DialogTitle className="dark:text-slate-100">Nueva tarea</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2"><Label>Titulo *</Label><Input value={nuevaTarea.titulo} onChange={e => setNuevaTarea(p => ({ ...p, titulo: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
            <div className="space-y-2"><Label>Descripcion</Label><Textarea value={nuevaTarea.descripcion} onChange={e => setNuevaTarea(p => ({ ...p, descripcion: e.target.value }))} rows={2} className="dark:bg-slate-900 dark:border-slate-600" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select value={nuevaTarea.prioridad} onValueChange={v => setNuevaTarea(p => ({ ...p, prioridad: v }))}>
                  <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORIDADES_TAREA.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={nuevaTarea.categoria} onValueChange={v => setNuevaTarea(p => ({ ...p, categoria: v }))}>
                  <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIAS_TAREA.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Fecha limite</Label><Input type="date" value={nuevaTarea.fecha_limite} onChange={e => setNuevaTarea(p => ({ ...p, fecha_limite: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsNuevaTareaOpen(false)} className="dark:border-slate-600">Cancelar</Button>
              <Button size="sm" onClick={crearTarea} disabled={isSubmitting} className="bg-[#1e3a5f] dark:bg-blue-600">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear tarea'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============== DIALOG: VER TAREA ============== */}
      <Dialog open={isVerTareaOpen} onOpenChange={setIsVerTareaOpen}>
        <DialogContent className="max-w-lg dark:border-slate-700 dark:bg-slate-800">
          {tareaSeleccionada && (
            <>
              <DialogHeader><DialogTitle className="dark:text-slate-100">{tareaSeleccionada.titulo}</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={ESTADOS_TAREA.find(e => e.value === tareaSeleccionada.estado)?.color}>{ESTADOS_TAREA.find(e => e.value === tareaSeleccionada.estado)?.label}</Badge>
                  <span className={`text-xs font-medium ${PRIORIDADES_TAREA.find(p => p.value === tareaSeleccionada.prioridad)?.color}`}>{tareaSeleccionada.prioridad}</span>
                  {tareaSeleccionada.categoria && <Badge className="text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-700">{tareaSeleccionada.categoria}</Badge>}
                </div>
                {tareaSeleccionada.descripcion && <p className="text-sm text-slate-600 dark:text-slate-400">{tareaSeleccionada.descripcion}</p>}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <div><span className="text-slate-400">Creada:</span> {fmtDate(tareaSeleccionada.fechaCreacion)}</div>
                  {tareaSeleccionada.fechaLimite && <div><span className="text-slate-400">Limite:</span> {fmtDate(tareaSeleccionada.fechaLimite)}</div>}
                  {tareaSeleccionada.fechaCompletada && <div><span className="text-slate-400">Completada:</span> {fmtDate(tareaSeleccionada.fechaCompletada)}</div>}
                </div>
                {/* Cambiar estado */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 mb-2">Cambiar estado:</p>
                  <div className="flex gap-1 flex-wrap">
                    {ESTADOS_TAREA.filter(e => e.value !== tareaSeleccionada.estado).map(e => (
                      <Button key={e.value} size="sm" variant="outline" className="h-7 text-xs dark:border-slate-600" onClick={() => { cambiarEstadoTarea(String(tareaSeleccionada.id), e.value); setIsVerTareaOpen(false); }}>
                        {e.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => { eliminarTarea(String(tareaSeleccionada.id)); setIsVerTareaOpen(false); }}>
                    <Trash2 className="h-3 w-3 mr-1" />Eliminar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ============== DIALOG: NUEVA NOTIFICACION MANUAL ============== */}
      <Dialog open={isNuevaNotifOpen} onOpenChange={setIsNuevaNotifOpen}>
        <DialogContent className="max-w-lg dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader><DialogTitle className="dark:text-slate-100">Nueva alerta / notificacion</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2"><Label>Titulo *</Label><Input value={nuevaNotif.titulo} onChange={e => setNuevaNotif(p => ({ ...p, titulo: e.target.value }))} placeholder="Ej: Reunion de equipo" className="dark:bg-slate-900 dark:border-slate-600" /></div>
            <div className="space-y-2"><Label>Mensaje *</Label><Textarea value={nuevaNotif.mensaje} onChange={e => setNuevaNotif(p => ({ ...p, mensaje: e.target.value }))} rows={2} placeholder="Describe la alerta..." className="dark:bg-slate-900 dark:border-slate-600" /></div>
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
                    <SelectItem value="todos">Todos los usuarios</SelectItem>
                    <SelectItem value="admin">Administradores</SelectItem>
                    <SelectItem value="coordinador">Coordinadores</SelectItem>
                    <SelectItem value="operario">Operarios</SelectItem>
                    <SelectItem value="conductor">Conductores</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Permiso requerido (alternativa a rol)</Label>
              <Select value={nuevaNotif.permiso_requerido || 'ninguno'} onValueChange={v => setNuevaNotif(p => ({ ...p, permiso_requerido: v === 'ninguno' ? '' : v }))}>
                <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ninguno">Ninguno (usar rol)</SelectItem>
                  <SelectItem value="vehiculos.ver">Flota</SelectItem>
                  <SelectItem value="servicios.ver">Servicios</SelectItem>
                  <SelectItem value="conductores.ver">Conductores</SelectItem>
                  <SelectItem value="clientes.ver">Clientes</SelectItem>
                  <SelectItem value="facturacion.ver">Facturacion</SelectItem>
                  <SelectItem value="configuracion.ver">Configuracion</SelectItem>
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
