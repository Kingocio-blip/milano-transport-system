// ============================================
// MILANO - Panel del Conductor (Rediseñado)
// Moderno, stats cards, dark mode, auth JWT
// ============================================

import { useState, useEffect, useMemo } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Separator } from '../components/ui/separator';
import {
  Bus, Clock, MapPin, User, Calendar, CheckCircle2, AlertCircle,
  Loader2, LogOut, Play, Square, Fuel, Wrench, FileText, TrendingUp,
  Settings, Route, ChevronRight, Navigation, Shield, Award, Eye, EyeOff,
  Briefcase, Euro, Star, Bell, Phone, Mail
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { removeTokens, authApi } from '../lib/api';
import { useConductoresStore, useServiciosStore, useUIStore } from '../store';
import { format, parseISO, differenceInMinutes, differenceInHours, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

// Tipos extendidos para el panel
type EstadoFichaje = 'no_fichado' | 'fichado_entrada' | 'en_ruta' | 'fichado_salida';
type TareaServicio = { id: string; nombre: string; completada: boolean; tipo: 'conductor' | 'sistema' };
type GastoServicio = { id: string; tipo: 'gasoil' | 'peaje' | 'aparcamiento' | 'otro'; cantidad: number; precio: number; notas?: string };
type RevisionBus = { id: string; tipo: 'limpieza' | 'neumaticos' | 'aceite' | 'luces' | 'otro'; estado: 'ok' | 'ko' | 'na'; notas?: string };

const ESTADO_LABELS: Record<string, string> = {
  planificando: 'Planificando', asignado: 'Asignado', en_curso: 'En Curso',
  completado: 'Completado', facturado: 'Facturado', cancelado: 'Cancelado',
};
const ESTADO_COLORS: Record<string, string> = {
  planificando: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  asignado: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  en_curso: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  completado: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  facturado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelado: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

// Helpers
const parseDateSafe = (date: string | Date | undefined): Date | null => {
  if (!date) return null;
  try {
    const parsed = typeof date === 'string' ? parseISO(date) : date;
    return isValid(parsed) ? parsed : null;
  } catch { return null; }
};
const formatDateSafe = (date: string | Date | undefined, fmt = 'dd/MM/yyyy'): string => {
  const d = parseDateSafe(date);
  return d ? format(d, fmt, { locale: es }) : '-';
};
const formatTiempo = (min: number) => `${Math.floor(min / 60)}h ${min % 60}m`;

export default function PanelConductor() {
  const navigate = useNavigate();
  const { showToast } = useUIStore();
  const { conductores, updateConductor, fetchConductores } = useConductoresStore();
  const { servicios, updateServicio, fetchServicios } = useServiciosStore();

  const [usuarioActual, setUsuarioActual] = useState<any>(null);
  const [conductorActual, setConductorActual] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('servicios');

  // Fichaje
  const [estadoFichaje, setEstadoFichaje] = useState<EstadoFichaje>('no_fichado');
  const [servicioActivo, setServicioActivo] = useState<any>(null);
  const [horaFichaje, setHoraFichaje] = useState<Date | null>(null);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);

  // Dialogs
  const [dialogGasto, setDialogGasto] = useState(false);
  const [dialogRevision, setDialogRevision] = useState(false);
  const [dialogRuta, setDialogRuta] = useState(false);
  const [dialogDisponibilidad, setDialogDisponibilidad] = useState(false);

  // Forms
  const [nuevoGasto, setNuevoGasto] = useState<Partial<GastoServicio>>({ tipo: 'gasoil', cantidad: 0, precio: 0 });
  const [nuevaRevision, setNuevaRevision] = useState<Partial<RevisionBus>>({ tipo: 'limpieza', estado: 'ok' });
  const [nuevaRuta, setNuevaRuta] = useState({ kmInicio: 0, kmFin: 0, rutaAlternativa: '' });
  const [disponibilidadEdit, setDisponibilidadEdit] = useState<any>(null);

  // Cargar datos
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const me = await authApi.me();
        setUsuarioActual(me);
        await Promise.all([fetchConductores(), fetchServicios()]);
      } catch (err) {
        console.error('Error cargando datos:', err);
        showToast('Error cargando datos', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    const interval = setInterval(() => {
      if (horaFichaje && estadoFichaje !== 'no_fichado') {
        setTiempoTranscurrido(differenceInMinutes(new Date(), horaFichaje));
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchConductores, fetchServicios, horaFichaje, estadoFichaje]);

  // Vincular conductor al usuario
  useEffect(() => {
    if (!usuarioActual || conductores.length === 0) return;
    const uid = String(usuarioActual.id);
    let c = conductores.find(c => String(c.usuarioId) === uid || c.usuarioId === uid);
    if (!c && usuarioActual.email) c = conductores.find(c => c.email?.toLowerCase() === usuarioActual.email.toLowerCase());
    if (!c && usuarioActual.nombre_completo) {
      const parts = usuarioActual.nombre_completo.toLowerCase().trim();
      c = conductores.find(c => `${c.nombre || ''} ${c.apellidos || ''}`.toLowerCase().trim() === parts);
    }
    if (!c && conductores.length > 0) c = conductores[0]; // fallback dev
    if (c) {
      setConductorActual(c);
      setDisponibilidadEdit(c.disponibilidad || { dias: [1, 2, 3, 4, 5], horaInicio: '08:00', horaFin: '18:00' });
    }
  }, [usuarioActual, conductores]);

  // Servicios del conductor
  const misServicios = useMemo(() => {
    if (!conductorActual) return [];
    const cid = String(conductorActual.id);
    return servicios.filter(s =>
      s.conductoresAsignados?.some((id: string | number) => String(id) === cid)
    ).sort((a, b) => {
      const fa = parseDateSafe(a.fechaInicio)?.getTime() || 0;
      const fb = parseDateSafe(b.fechaInicio)?.getTime() || 0;
      return fa - fb;
    });
  }, [servicios, conductorActual]);

  const hoy = format(new Date(), 'yyyy-MM-dd');
  const serviciosHoy = useMemo(() => misServicios.filter(s => {
    const f = parseDateSafe(s.fechaInicio);
    return f && format(f, 'yyyy-MM-dd') === hoy && ['planificando', 'asignado', 'en_curso'].includes(s.estado);
  }), [misServicios, hoy]);

  const serviciosPendientes = useMemo(() => misServicios.filter(s => ['planificando', 'asignado'].includes(s.estado)), [misServicios]);
  const serviciosCompletados = useMemo(() => misServicios.filter(s => ['completado', 'facturado'].includes(s.estado)), [misServicios]);

  const stats = useMemo(() => ({
    serviciosHoy: serviciosHoy.length,
    pendientes: serviciosPendientes.length,
    completadosMes: serviciosCompletados.filter(s => {
      const f = parseDateSafe(s.fechaFin);
      return f && f.getMonth() === new Date().getMonth();
    }).length,
    horasMes: serviciosCompletados.reduce((sum, s) => {
      const i = parseDateSafe(s.fechaInicio);
      const f = parseDateSafe(s.fechaFin);
      return i && f ? sum + differenceInHours(f, i) : sum;
    }, 0),
    ingresosEst: serviciosCompletados.reduce((sum, s) => sum + ((s.precio || 0) * 0.3), 0),
  }), [serviciosHoy, serviciosPendientes, serviciosCompletados]);

  // Handlers
  const handleLogout = () => { removeTokens(); navigate('/login'); };

  const handleFicharEntrada = async (servicio: any) => {
    const ahora = new Date();
    setEstadoFichaje('fichado_entrada');
    setHoraFichaje(ahora);
    setServicioActivo(servicio);
    await updateServicio(servicio.id, { estado: 'en_curso', horaInicioReal: ahora.toISOString() });
    showToast('Fichaje de entrada registrado', 'success');
  };

  const handleFicharSalida = async () => {
    const ahora = new Date();
    setEstadoFichaje('fichado_salida');
    const horas = horaFichaje ? differenceInHours(ahora, horaFichaje) : 0;
    await updateServicio(servicioActivo.id, { estado: 'completado', horaFinReal: ahora.toISOString(), horasReales: horas });
    await updateConductor(String(conductorActual.id), {
      totalHorasMes: (conductorActual.totalHorasMes || 0) + horas,
      totalServiciosMes: (conductorActual.totalServiciosMes || 0) + 1,
    });
    showToast('Servicio completado', 'success');
    setDialogGasto(true);
  };

  const handleGuardarGasto = async () => {
    if (!servicioActivo) return;
    const gasto: GastoServicio = { id: `g${Date.now()}`, tipo: nuevoGasto.tipo || 'gasoil', cantidad: nuevoGasto.cantidad || 0, precio: nuevoGasto.precio || 0, notas: nuevoGasto.notas };
    await updateServicio(servicioActivo.id, { gastos: [...(servicioActivo.gastos || []), gasto] });
    setDialogGasto(false);
    setNuevoGasto({ tipo: 'gasoil', cantidad: 0, precio: 0 });
    if (estadoFichaje === 'fichado_salida') {
      setTimeout(() => { setEstadoFichaje('no_fichado'); setServicioActivo(null); setHoraFichaje(null); setTiempoTranscurrido(0); }, 2000);
    }
    showToast('Gasto registrado', 'success');
  };

  const handleGuardarRevision = async () => {
    const rev: RevisionBus = { id: `r${Date.now()}`, tipo: nuevaRevision.tipo || 'limpieza', estado: nuevaRevision.estado || 'ok', notas: nuevaRevision.notas };
    await updateServicio(servicioActivo.id, { revisiones: [...(servicioActivo.revisiones || []), rev] });
    setDialogRevision(false);
    setNuevaRevision({ tipo: 'limpieza', estado: 'ok' });
    showToast('Revision registrada', 'success');
  };

  const handleGuardarDisponibilidad = async () => {
    await updateConductor(String(conductorActual.id), { disponibilidad: disponibilidadEdit });
    setDialogDisponibilidad(false);
    showToast('Disponibilidad actualizada', 'success');
  };

  const handleGuardarRuta = async () => {
    await updateServicio(servicioActivo.id, { kmInicio: nuevaRuta.kmInicio, rutaTomada: nuevaRuta.rutaAlternativa || 'Ruta estandar' });
    setDialogRuta(false);
    showToast('Ruta iniciada', 'success');
  };

  const handleFinalizarRuta = async () => {
    await updateServicio(servicioActivo.id, { kmFin: nuevaRuta.kmFin, kmTotal: nuevaRuta.kmFin - nuevaRuta.kmInicio });
    showToast('Ruta finalizada', 'success');
  };

  const handleCompletarTarea = async (t: TareaServicio) => {
    const upd = (servicioActivo.tareas || []).map((x: TareaServicio) => x.id === t.id ? { ...x, completada: !x.completada } : x);
    await updateServicio(servicioActivo.id, { tareas: upd });
    showToast(t.completada ? 'Tarea desmarcada' : 'Tarea completada', 'success');
  };

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-12 w-12 animate-spin text-[#1e3a5f] dark:text-blue-400" />
      </div>
    );
  }

  // Sin conductor vinculado
  if (!conductorActual) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center shadow-lg">
          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
            <User className="h-10 w-10 text-slate-400 dark:text-slate-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Conductor no vinculado</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Tu usuario <strong className="dark:text-slate-300">@{usuarioActual?.username || 'desconocido'}</strong> no esta vinculado a ningun conductor.
            Contacta con un administrador.
          </p>
          <Button onClick={handleLogout} variant="outline" className="dark:border-slate-600 dark:text-slate-300">
            <LogOut className="mr-2 h-4 w-4" /> Cerrar sesion
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* ===== HEADER ===== */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#1e3a5f] dark:bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                {conductorActual.nombre?.charAt(0)}{conductorActual.apellidos?.charAt(0)}
              </div>
              <div>
                <h1 className="font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  {conductorActual.nombre} {conductorActual.apellidos}
                </h1>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{conductorActual.codigo}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Award className="h-3 w-3" />{conductorActual.licencia?.tipo || '-'}</span>
                  {usuarioActual && <><span>·</span><span>@{usuarioActual.username}</span></>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {estadoFichaje !== 'no_fichado' && (
                <div className="hidden sm:block text-right mr-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Tiempo</p>
                  <p className="font-mono font-bold text-lg text-[#1e3a5f] dark:text-blue-400 leading-tight">{formatTiempo(tiempoTranscurrido)}</p>
                </div>
              )}
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ===== STATS BAR ===== */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Hoy', value: stats.serviciosHoy, icon: Calendar, color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' },
            { label: 'Pendientes', value: stats.pendientes, icon: Clock, color: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' },
            { label: 'Mes', value: stats.completadosMes, icon: Briefcase, color: 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400' },
            { label: 'Horas', value: `${stats.horasMes}h`, icon: Clock, color: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400' },
            { label: 'Ingresos', value: `${stats.ingresosEst.toFixed(0)} EUR`, icon: Euro, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 flex items-center gap-3">
              <div className={`rounded-lg p-2 ${s.color}`}><s.icon className="h-4 w-4" /></div>
              <div>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">{s.value}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <main className="max-w-7xl mx-auto px-4 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 dark:bg-slate-800 mb-4">
            <TabsTrigger value="servicios" className="dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100">
              Mis Servicios {serviciosHoy.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] dark:bg-slate-600">{serviciosHoy.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="activo" className="dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100">
              En Curso {servicioActivo && <span className="ml-1 w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />}
            </TabsTrigger>
            <TabsTrigger value="historial" className="dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100">Historial</TabsTrigger>
            <TabsTrigger value="perfil" className="dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100">Mi Perfil</TabsTrigger>
          </TabsList>

          {/* ===== TAB: SERVICIOS ===== */}
          <TabsContent value="servicios" className="space-y-4">
            {/* Servicios de hoy */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2 dark:text-slate-100">
                  <Calendar className="h-4 w-4 text-blue-500" /> Servicios de Hoy
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
                </span>
              </div>
              <div className="p-4 space-y-3">
                {serviciosHoy.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                    <CheckCircle2 className="mx-auto h-10 w-10 mb-2 opacity-50" />
                    <p className="text-sm">No tienes servicios asignados para hoy</p>
                  </div>
                ) : serviciosHoy.map(s => (
                  <div key={s.id} className="rounded-lg border dark:border-slate-600 p-4 hover:shadow-md transition-all dark:bg-slate-700/30">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{s.codigo}</span>
                          <Badge className={ESTADO_COLORS[s.estado] || ''}>{ESTADO_LABELS[s.estado] || s.estado}</Badge>
                        </div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{s.titulo}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{s.clienteNombre}</p>
                      </div>
                      {s.estado !== 'en_curso' ? (
                        <Button size="sm" onClick={() => handleFicharEntrada(s)} className="bg-green-600 hover:bg-green-700">
                          <Play className="mr-1 h-3.5 w-3.5" />Fichar
                        </Button>
                      ) : servicioActivo?.id === s.id ? (
                        <Button size="sm" onClick={handleFicharSalida} variant="destructive">
                          <Square className="mr-1 h-3.5 w-3.5" />Finalizar
                        </Button>
                      ) : (
                        <Badge variant="outline" className="dark:border-slate-500 dark:text-slate-400">Ocupado</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.horaInicio || '--:--'} - {s.horaFin || '--:--'}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.origen || 'Sin origen'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Proximos */}
            {serviciosPendientes.filter(s => !serviciosHoy.includes(s)).length > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="font-semibold flex items-center gap-2 dark:text-slate-100">
                    <Clock className="h-4 w-4 text-amber-500" /> Proximos Servicios
                  </h3>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {serviciosPendientes.filter(s => !serviciosHoy.includes(s)).slice(0, 5).map(s => (
                    <div key={s.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <div>
                        <p className="font-medium text-sm dark:text-slate-200">{s.codigo} - {s.titulo}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateSafe(s.fechaInicio)} · {s.horaInicio}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ===== TAB: EN CURSO ===== */}
          <TabsContent value="activo" className="space-y-4">
            {!servicioActivo ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-12 text-center">
                <Clock className="mx-auto h-14 w-14 text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">No tienes ningun servicio activo</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Ve a &quot;Mis Servicios&quot; para fichar entrada</p>
              </div>
            ) : (
              <>
                {/* Card principal activo */}
                <div className="rounded-xl border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Bus className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <span className="font-bold text-lg text-green-800 dark:text-green-200">{servicioActivo.codigo}</span>
                      </div>
                      <p className="text-green-700 dark:text-green-300 font-medium">{servicioActivo.titulo}</p>
                      <p className="text-sm text-green-600 dark:text-green-400">{servicioActivo.clienteNombre}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold font-mono text-green-800 dark:text-green-200">{formatTiempo(tiempoTranscurrido)}</p>
                      <p className="text-xs text-green-600 dark:text-green-400">Transcurrido</p>
                    </div>
                  </div>

                  {/* Botones de accion */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button onClick={() => setDialogRuta(true)} variant="outline" className="h-auto py-3 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                      <Navigation className="mr-2 h-4 w-4" />
                      <div className="text-left"><p className="font-medium text-sm">Ruta</p><p className="text-[10px] text-slate-500 dark:text-slate-400">{nuevaRuta.kmInicio > 0 ? 'En progreso' : 'Iniciar'}</p></div>
                    </Button>
                    <Button onClick={() => setDialogRevision(true)} variant="outline" className="h-auto py-3 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                      <Wrench className="mr-2 h-4 w-4" />
                      <div className="text-left"><p className="font-medium text-sm">Revision</p><p className="text-[10px] text-slate-500 dark:text-slate-400">Bus y limpieza</p></div>
                    </Button>
                    <Button onClick={() => setDialogGasto(true)} variant="outline" className="h-auto py-3 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                      <Fuel className="mr-2 h-4 w-4" />
                      <div className="text-left"><p className="font-medium text-sm">Gasto</p><p className="text-[10px] text-slate-500 dark:text-slate-400">Gasoil, peaje...</p></div>
                    </Button>
                    <Button onClick={handleFicharSalida} variant="destructive" className="h-auto py-3">
                      <Square className="mr-2 h-4 w-4" />
                      <div className="text-left"><p className="font-medium text-sm">Finalizar</p><p className="text-[10px] text-white/70">Fichar salida</p></div>
                    </Button>
                  </div>
                </div>

                {/* Tareas */}
                {servicioActivo.tareas?.length > 0 && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-2">
                    <h4 className="font-medium text-sm dark:text-slate-300">Tareas</h4>
                    {servicioActivo.tareas.map((t: TareaServicio) => (
                      <div key={t.id} onClick={() => handleCompletarTarea(t)}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          t.completada ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-50 dark:bg-slate-700/50 border dark:border-slate-600'
                        }`}>
                        <div className={`h-5 w-5 rounded flex items-center justify-center ${t.completada ? 'bg-green-500' : 'border-2 border-slate-300 dark:border-slate-500'}`}>
                          {t.completada && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                        <span className={`text-sm ${t.completada ? 'line-through text-slate-500 dark:text-slate-400' : 'dark:text-slate-200'}`}>{t.nombre}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Detalles */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3 text-sm">
                  <h4 className="font-medium dark:text-slate-200">Detalles del Servicio</h4>
                  {[
                    { icon: MapPin, label: 'Origen', value: servicioActivo.origen },
                    { icon: MapPin, label: 'Destino', value: servicioActivo.destino },
                    { icon: FileText, label: 'Descripcion', value: servicioActivo.descripcion },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3">
                      <item.icon className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">{item.label}</p>
                        <p className="dark:text-slate-200">{item.value || 'No especificado'}</p>
                      </div>
                    </div>
                  ))}
                  {servicioActivo.notasInternas && (
                    <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-amber-600 dark:text-amber-400">Notas internas</p>
                        <p className="text-amber-700 dark:text-amber-300">{servicioActivo.notasInternas}</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          {/* ===== TAB: HISTORIAL ===== */}
          <TabsContent value="historial" className="space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-semibold flex items-center gap-2 dark:text-slate-100">
                  <TrendingUp className="h-4 w-4 text-purple-500" /> Servicios Completados
                </h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {serviciosCompletados.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 dark:text-slate-500">
                    <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aun no has completado ningun servicio</p>
                  </div>
                ) : serviciosCompletados.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div>
                      <p className="font-medium text-sm dark:text-slate-200">{s.codigo} - {s.titulo}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDateSafe(s.fechaInicio)} · {s.horaInicioReal || s.horaInicio} - {s.horaFinReal || s.horaFin}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600 dark:text-green-400 text-sm">{(s.horasReales || 0) * (conductorActual.tarifaHora || 18)} EUR</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{s.horasReales || 0}h</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ===== TAB: PERFIL ===== */}
          <TabsContent value="perfil" className="space-y-4">
            {/* Info personal */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2 dark:text-slate-100">
                  <User className="h-4 w-4 text-blue-500" /> Mi Informacion
                </h3>
                <Button variant="outline" size="sm" onClick={() => setDialogDisponibilidad(true)} className="dark:border-slate-600 dark:text-slate-300">
                  <Settings className="mr-1 h-3.5 w-3.5" />Editar
                </Button>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs text-slate-500 dark:text-slate-400">Nombre</Label><p className="font-medium dark:text-slate-200">{conductorActual.nombre} {conductorActual.apellidos}</p></div>
                  <div><Label className="text-xs text-slate-500 dark:text-slate-400">DNI</Label><p className="font-medium dark:text-slate-200">{conductorActual.dni}</p></div>
                </div>
                <Separator className="dark:bg-slate-700" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span className="dark:text-slate-300">{conductorActual.telefono || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span className="dark:text-slate-300">{conductorActual.email || '-'}</span>
                  </div>
                </div>
                <Separator className="dark:bg-slate-700" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><Award className="h-3 w-3" />Licencia</Label>
                    <p className="font-medium dark:text-slate-200">Tipo {conductorActual.licencia?.tipo || '-'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Caduca: {formatDateSafe(conductorActual.licencia?.fechaCaducidad)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><Shield className="h-3 w-3" />CAP</Label>
                    <p className="font-medium dark:text-slate-200">{conductorActual.licencia?.cap?.numero || 'Sin CAP'}</p>
                    {conductorActual.licencia?.cap?.fechaVencimiento && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">Vence: {formatDateSafe(conductorActual.licencia.cap.fechaVencimiento)}</p>
                    )}
                  </div>
                </div>
                <Separator className="dark:bg-slate-700" />
                <div>
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Disponibilidad</Label>
                  <p className="text-sm dark:text-slate-300">
                    {conductorActual.disponibilidad?.dias?.map((d: number) => DIAS_SEMANA[d]).join(', ')}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {conductorActual.disponibilidad?.horaInicio} - {conductorActual.disponibilidad?.horaFin}
                  </p>
                </div>
                {conductorActual.nomina && (
                  <>
                    <Separator className="dark:bg-slate-700" />
                    <div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><Euro className="h-3 w-3" />Nomina</Label>
                      <p className="text-sm dark:text-slate-300">
                        {conductorActual.nomina.tipo === 'tarifa_hora' && `Tarifa: ${conductorActual.nomina.tarifaHora || conductorActual.tarifaHora || 18} EUR/h`}
                        {conductorActual.nomina.tipo === 'convenio' && `Convenio: ${conductorActual.nomina.horasContratadas || 40}h semanales`}
                        {conductorActual.nomina.tipo === 'bloques' && 'Bloques de disponibilidad'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* ===== DIALOG: Gasto ===== */}
      <Dialog open={dialogGasto} onOpenChange={setDialogGasto}>
        <DialogContent className="dark:bg-slate-800 dark:border-slate-700">
          <DialogHeader><DialogTitle className="flex items-center gap-2 dark:text-slate-100"><Fuel className="h-5 w-5" />Registrar Gasto</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="dark:text-slate-300">Tipo</Label>
              <Select value={nuevoGasto.tipo} onValueChange={v => setNuevoGasto({...nuevoGasto, tipo: v as any})}>
                <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="gasoil">Gasoil</SelectItem><SelectItem value="peaje">Peaje</SelectItem><SelectItem value="aparcamiento">Aparcamiento</SelectItem><SelectItem value="otro">Otro</SelectItem></SelectContent>
              </Select>
            </div>
            {nuevoGasto.tipo === 'gasoil' && (
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Litros</Label>
                <Input type="number" step="0.01" value={nuevoGasto.cantidad || ''}
                  onChange={e => { const l = parseFloat(e.target.value) || 0; setNuevoGasto({...nuevoGasto, cantidad: l, precio: Math.round(l * 1.6 * 100) / 100 }); }}
                  placeholder="45.5" className="dark:bg-slate-900 dark:border-slate-600" />
              </div>
            )}
            <div className="space-y-2">
              <Label className="dark:text-slate-300">Importe (EUR)</Label>
              <Input type="number" step="0.01" value={nuevoGasto.precio || ''}
                onChange={e => setNuevoGasto({...nuevoGasto, precio: parseFloat(e.target.value) || 0})}
                className="dark:bg-slate-900 dark:border-slate-600" />
            </div>
            <div className="space-y-2">
              <Label className="dark:text-slate-300">Notas</Label>
              <Textarea value={nuevoGasto.notas || ''} onChange={e => setNuevoGasto({...nuevoGasto, notas: e.target.value})}
                placeholder="Estacion de servicio..." className="dark:bg-slate-900 dark:border-slate-600" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogGasto(false)} className="dark:border-slate-600">Cancelar</Button>
            <Button onClick={handleGuardarGasto} className="bg-[#1e3a5f] dark:bg-blue-600">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: Revision ===== */}
      <Dialog open={dialogRevision} onOpenChange={setDialogRevision}>
        <DialogContent className="dark:bg-slate-800 dark:border-slate-700">
          <DialogHeader><DialogTitle className="flex items-center gap-2 dark:text-slate-100"><Wrench className="h-5 w-5" />Revision del Vehiculo</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="dark:text-slate-300">Tipo</Label>
              <Select value={nuevaRevision.tipo} onValueChange={v => setNuevaRevision({...nuevaRevision, tipo: v as any})}>
                <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="limpieza">Limpieza</SelectItem><SelectItem value="neumaticos">Neumaticos</SelectItem>
                  <SelectItem value="aceite">Aceite</SelectItem><SelectItem value="luces">Luces</SelectItem><SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="dark:text-slate-300">Estado</Label>
              <div className="flex gap-2">
                {[{v:'ok',l:'OK',c:'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'},
                  {v:'ko',l:'KO',c:'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'},
                  {v:'na',l:'N/A',c:'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}]
                  .map(o => (
                    <button key={o.v} onClick={() => setNuevaRevision({...nuevaRevision, estado: o.v as any})}
                      className={`flex-1 p-3 rounded-lg border-2 transition-all ${nuevaRevision.estado === o.v ? 'border-[#1e3a5f] ' + o.c : 'border-transparent bg-slate-50 dark:bg-slate-700'}`}>
                      {o.l}
                    </button>
                  ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="dark:text-slate-300">Notas</Label>
              <Textarea value={nuevaRevision.notas || ''} onChange={e => setNuevaRevision({...nuevaRevision, notas: e.target.value})}
                placeholder="Incidencias..." className="dark:bg-slate-900 dark:border-slate-600" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogRevision(false)} className="dark:border-slate-600">Cancelar</Button>
            <Button onClick={handleGuardarRevision} className="bg-[#1e3a5f] dark:bg-blue-600">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: Disponibilidad ===== */}
      <Dialog open={dialogDisponibilidad} onOpenChange={setDialogDisponibilidad}>
        <DialogContent className="dark:bg-slate-800 dark:border-slate-700">
          <DialogHeader><DialogTitle className="dark:text-slate-100">Editar Disponibilidad</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-wrap gap-3">
              {DIAS_SEMANA.map((dia, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <Checkbox id={`d-${idx}`} checked={disponibilidadEdit?.dias?.includes(idx)}
                    onCheckedChange={c => { const cur = disponibilidadEdit?.dias || []; setDisponibilidadEdit({...disponibilidadEdit, dias: c ? [...cur, idx] : cur.filter((d:number) => d !== idx) }); }} />
                  <Label htmlFor={`d-${idx}`} className="text-sm cursor-pointer dark:text-slate-300">{dia}</Label>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Hora Inicio</Label>
                <Input type="time" value={disponibilidadEdit?.horaInicio || '08:00'}
                  onChange={e => setDisponibilidadEdit({...disponibilidadEdit, horaInicio: e.target.value})}
                  className="dark:bg-slate-900 dark:border-slate-600" />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Hora Fin</Label>
                <Input type="time" value={disponibilidadEdit?.horaFin || '18:00'}
                  onChange={e => setDisponibilidadEdit({...disponibilidadEdit, horaFin: e.target.value})}
                  className="dark:bg-slate-900 dark:border-slate-600" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogDisponibilidad(false)} className="dark:border-slate-600">Cancelar</Button>
            <Button onClick={handleGuardarDisponibilidad} className="bg-[#1e3a5f] dark:bg-blue-600">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: Ruta ===== */}
      <Dialog open={dialogRuta} onOpenChange={setDialogRuta}>
        <DialogContent className="dark:bg-slate-800 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 dark:text-slate-100">
              <Route className="h-5 w-5" />{nuevaRuta.kmInicio > 0 ? 'Finalizar Ruta' : 'Iniciar Ruta'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {nuevaRuta.kmInicio === 0 ? (
              <>
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">KM Inicio</Label>
                  <Input type="number" value={nuevaRuta.kmInicio || ''}
                    onChange={e => setNuevaRuta({...nuevaRuta, kmInicio: parseInt(e.target.value) || 0})}
                    placeholder="KM del cuentakilometros" className="dark:bg-slate-900 dark:border-slate-600" />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Ruta alternativa</Label>
                  <Textarea value={nuevaRuta.rutaAlternativa}
                    onChange={e => setNuevaRuta({...nuevaRuta, rutaAlternativa: e.target.value})}
                    placeholder="Desvios, atascos..." className="dark:bg-slate-900 dark:border-slate-600" />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <Label className="text-xs text-slate-500 dark:text-slate-400">KM Inicio</Label>
                    <p className="font-medium dark:text-slate-200">{nuevaRuta.kmInicio}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-slate-300">KM Final</Label>
                    <Input type="number" value={nuevaRuta.kmFin || ''}
                      onChange={e => setNuevaRuta({...nuevaRuta, kmFin: parseInt(e.target.value) || 0})}
                      placeholder="KM al finalizar" className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                </div>
                {nuevaRuta.kmFin > nuevaRuta.kmInicio && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-xs text-green-600 dark:text-green-400">Total recorrido</p>
                    <p className="text-2xl font-bold text-green-800 dark:text-green-300">{nuevaRuta.kmFin - nuevaRuta.kmInicio} km</p>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogRuta(false)} className="dark:border-slate-600">Cancelar</Button>
            <Button onClick={nuevaRuta.kmInicio === 0 ? handleGuardarRuta : handleFinalizarRuta} className="bg-[#1e3a5f] dark:bg-blue-600">
              {nuevaRuta.kmInicio === 0 ? 'Iniciar' : 'Finalizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
