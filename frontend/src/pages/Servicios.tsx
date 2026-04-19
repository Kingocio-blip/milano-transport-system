// ============================================
// MILANO - Servicios (Rediseñado)
// Wizard en pasos + cards profesionales + dark mode
// ============================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, differenceInHours } from 'date-fns';
import { useServiciosStore, useClientesStore, useConductoresStore, useVehiculosStore, useUIStore } from '../store';
import type { Servicio, TipoServicio, EstadoServicio } from '@/types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Plus, Search, Loader2, Trash2, Edit3, Eye, Calendar, MapPin, User, Bus,
  DollarSign, Clock, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft,
  Route, Users, FileText, TrendingUp, X, Filter, LayoutGrid, List
} from 'lucide-react';
import { Link } from 'react-router-dom';

const ESTADOS: { value: EstadoServicio | 'todos'; label: string; color: string }[] = [
  { value: 'todos', label: 'Todos', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
  { value: 'solicitud', label: 'Solicitud', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'presupuesto', label: 'Presupuesto', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
  { value: 'negociacion', label: 'Negociacion', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  { value: 'planificando', label: 'Planificando', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'asignado', label: 'Asignado', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  { value: 'en_curso', label: 'En Curso', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  { value: 'completado', label: 'Completado', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'facturado', label: 'Facturado', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
];

const TIPOS: { value: TipoServicio | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'lanzadera', label: 'Lanzadera' },
  { value: 'discrecional', label: 'Discrecional' },
  { value: 'staff', label: 'Staff' },
  { value: 'ruta_programada', label: 'Ruta' },
];

const CONSUMO_LITROS_100KM = 35;
const PRECIO_GASOIL_LITRO = 1.6;
const TARIFA_CONDUCTOR_HORA = 18;
const TARIFA_COORDINADOR_HORA = 25;

export default function Servicios() {
  const { servicios, isLoading, addServicio, deleteServicio, fetchServicios } = useServiciosStore();
  const { clientes, fetchClientes } = useClientesStore();
  const { conductores, fetchConductores } = useConductoresStore();
  const { vehiculos, fetchVehiculos } = useVehiculosStore();
  const { showToast } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoServicio | 'todos'>('todos');
  const [tipoFiltro, setTipoFiltro] = useState<TipoServicio | 'todos'>('todos');
  const [vistaMode, setVistaMode] = useState<'lista' | 'cards'>('cards');
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null);
  const [isNuevoOpen, setIsNuevoOpen] = useState(false);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const [isEditarOpen, setIsEditarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Wizard step
  const [wizardStep, setWizardStep] = useState(1);

  // Auto-asignación
  const [autoConductor, setAutoConductor] = useState(false);
  const [autoVehiculo, setAutoVehiculo] = useState(false);
  const [incluirCoordinador, setIncluirCoordinador] = useState(false);

  const [nuevoServicio, setNuevoServicio] = useState<Partial<Servicio> & Record<string, any>>({
    tipo: 'lanzadera', estado: 'planificando', numeroVehiculos: 1,
    fechaInicio: format(new Date(), 'yyyy-MM-dd'), fechaFin: '',
    horaInicio: '', horaFin: '',
  });

  useEffect(() => {
    fetchServicios(); fetchClientes(); fetchConductores(); fetchVehiculos();
  }, [fetchServicios, fetchClientes, fetchConductores, fetchVehiculos]);

  const conductorDisp = useMemo(() => conductores.find(c => c.estado === 'activo'), [conductores]);
  const vehiculoDisp = useMemo(() => vehiculos.find(v => v.estado === 'operativo'), [vehiculos]);

  const costesEstimados = useMemo(() => {
    if (!nuevoServicio.fechaInicio || !nuevoServicio.horaInicio) return null;
    const fi = new Date(`${nuevoServicio.fechaInicio}T${nuevoServicio.horaInicio || '00:00'}`);
    const ff = nuevoServicio.fechaFin && nuevoServicio.horaFin
      ? new Date(`${nuevoServicio.fechaFin}T${nuevoServicio.horaFin}`)
      : new Date(fi.getTime() + 8 * 60 * 60 * 1000);
    const horas = Math.max(1, differenceInHours(ff, fi));
    const nv = nuevoServicio.numeroVehiculos || 1;
    const costeCond = TARIFA_CONDUCTOR_HORA * horas * nv;
    const costeCoord = incluirCoordinador ? TARIFA_COORDINADOR_HORA * horas : 0;
    const costeGasoil = (CONSUMO_LITROS_100KM / 100) * 100 * PRECIO_GASOIL_LITRO * nv;
    return {
      horas, costeConductor: Math.round(costeCond), costeCoordinador: Math.round(costeCoord),
      costeGasoil, total: Math.round(costeCond + costeCoord + costeGasoil),
      detalle: `${horas}h x ${nv} veh`
    };
  }, [nuevoServicio, incluirCoordinador]);

  const stats = useMemo(() => ({
    activos: servicios.filter(s => ['planificando','asignado','en_curso'].includes(s.estado)).length,
    pendientes: servicios.filter(s => ['solicitud','presupuesto','negociacion'].includes(s.estado)).length,
    completados: servicios.filter(s => s.estado === 'completado').length,
    totalFacturacion: servicios.filter(s => s.estado === 'facturado').reduce((sum, s) => sum + (s.precio || 0), 0),
  }), [servicios]);

  const filtrados = useMemo(() => servicios.filter(s => {
    const sq = searchQuery.toLowerCase().trim();
    const ms = sq === '' || s.titulo?.toLowerCase().includes(sq) || s.codigo?.toLowerCase().includes(sq) || s.clienteNombre?.toLowerCase().includes(sq);
    return ms && (estadoFiltro === 'todos' || s.estado === estadoFiltro) && (tipoFiltro === 'todos' || s.tipo === tipoFiltro);
  }), [servicios, searchQuery, estadoFiltro, tipoFiltro]);

  const resetWizard = () => {
    setIsNuevoOpen(false);
    setWizardStep(1);
    setNuevoServicio({ tipo: 'lanzadera', estado: 'planificando', numeroVehiculos: 1, fechaInicio: format(new Date(), 'yyyy-MM-dd') });
    setAutoConductor(false); setAutoVehiculo(false); setIncluirCoordinador(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoServicio.clienteId || !nuevoServicio.titulo || !nuevoServicio.fechaInicio) {
      showToast('Complete los campos obligatorios (*)', 'error'); return;
    }
    setIsSubmitting(true);
    try {
      const cliente = clientes.find(c => String(c.id) === nuevoServicio.clienteId);
      const success = await addServicio({
        codigo: `SRV-${Date.now().toString().slice(-6)}`,
        clienteId: nuevoServicio.clienteId, clienteNombre: cliente?.nombre || 'Cliente',
        tipo: nuevoServicio.tipo, estado: 'planificando', titulo: nuevoServicio.titulo,
        descripcion: nuevoServicio.descripcion,
        fechaInicio: new Date(`${nuevoServicio.fechaInicio}T${nuevoServicio.horaInicio || '00:00'}`).toISOString(),
        fechaFin: nuevoServicio.fechaFin ? new Date(`${nuevoServicio.fechaFin}T${nuevoServicio.horaFin || '23:59'}`).toISOString() : null,
        horaInicio: nuevoServicio.horaInicio, horaFin: nuevoServicio.horaFin,
        origen: nuevoServicio.origen, destino: nuevoServicio.destino,
        numeroVehiculos: nuevoServicio.numeroVehiculos || 1,
        vehiculosAsignados: autoVehiculo && vehiculoDisp ? [String(vehiculoDisp.id)] : [],
        conductoresAsignados: autoConductor && conductorDisp ? [String(conductorDisp.id)] : [],
        precio: nuevoServicio.precio || 0, costeEstimado: costesEstimados?.total || 0,
        costeReal: null, facturado: false,
        notasInternas: `Auto-calc: ${costesEstimados?.detalle || 'N/A'}`,
        tareas: [
          { id: `t${Date.now()}-1`, nombre: 'Recopilar informacion del evento', completada: false },
          { id: `t${Date.now()}-2`, nombre: 'Planificar rutas', completada: false },
          { id: `t${Date.now()}-3`, nombre: 'Asignar conductores', completada: autoConductor },
          { id: `t${Date.now()}-4`, nombre: 'Preparar vehiculos', completada: autoVehiculo },
          { id: `t${Date.now()}-5`, nombre: 'Confirmar detalles con cliente', completada: false },
        ],
      });
      if (success) { resetWizard(); showToast('Servicio creado correctamente', 'success'); }
      else showToast('Error al crear el servicio', 'error');
    } catch (err: any) { showToast(`Error: ${err.message || 'Desconocido'}`, 'error'); }
    finally { setIsSubmitting(false); }
  };

  const handleEliminar = async (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Eliminar este servicio?')) return;
    try { if (await deleteServicio(String(id))) { showToast('Eliminado', 'success'); if (servicioSeleccionado?.id === String(id)) { setIsDetalleOpen(false); setServicioSeleccionado(null); } } }
    catch (err: any) { showToast(`Error: ${err.message}`, 'error'); }
  };

  const getProgreso = useCallback((s: Servicio) => s.tareas?.length ? Math.round((s.tareas.filter(t => t.completada).length / s.tareas.length) * 100) : 0, []);
  const getMargen = useCallback((s: Servicio) => (s.precio || 0) - (s.costeEstimado || 0), []);

  if (isLoading && servicios.length === 0) return <div className="flex items-center justify-center h-96"><Loader2 className="h-12 w-12 animate-spin text-[#1e3a5f] dark:text-blue-400" /></div>;

  return (
    <div className="space-y-6">
      {/* Header con stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Servicios</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Gestion de proyectos de transporte</p>
        </div>
        <Button onClick={() => { setWizardStep(1); setIsNuevoOpen(true); }} className="bg-[#1e3a5f] hover:bg-[#152a45] shadow-sm dark:bg-blue-600 dark:hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Servicio
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Activos', value: stats.activos, icon: TrendingUp, color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' },
          { label: 'Pendientes', value: stats.pendientes, icon: Clock, color: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' },
          { label: 'Completados', value: stats.completados, icon: CheckCircle2, color: 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400' },
          { label: 'Facturacion', value: `${stats.totalFacturacion.toLocaleString()} EUR`, icon: DollarSign, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center gap-3">
            <div className={`rounded-lg p-2.5 ${s.color}`}><s.icon className="h-5 w-5" /></div>
            <div><p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{s.value}</p><p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar servicio..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 dark:bg-slate-900 dark:border-slate-700" />
        </div>
        <div className="flex gap-2">
          <Select value={estadoFiltro} onValueChange={(v) => setEstadoFiltro(v as EstadoServicio | 'todos')}>
            <SelectTrigger className="w-[160px] dark:bg-slate-900 dark:border-slate-700"><SelectValue /></SelectTrigger>
            <SelectContent>{ESTADOS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v as TipoServicio | 'todos')}>
            <SelectTrigger className="w-[140px] dark:bg-slate-900 dark:border-slate-700"><SelectValue /></SelectTrigger>
            <SelectContent>{TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex border rounded-lg overflow-hidden dark:border-slate-700">
            <button onClick={() => setVistaMode('cards')} className={`p-2 ${vistaMode === 'cards' ? 'bg-[#1e3a5f] text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}><LayoutGrid className="h-4 w-4" /></button>
            <button onClick={() => setVistaMode('lista')} className={`p-2 ${vistaMode === 'lista' ? 'bg-[#1e3a5f] text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}><List className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* Vista CARDS */}
      {vistaMode === 'cards' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.length === 0 ? (
            <div className="col-span-full flex flex-col items-center py-16 text-slate-400 dark:text-slate-500">
              <FileText className="h-12 w-12 mb-3" /><p className="text-sm">No hay servicios</p>
            </div>
          ) : filtrados.map(s => {
            const progreso = getProgreso(s);
            const margen = getMargen(s);
            const estadoConfig = ESTADOS.find(e => e.value === s.estado);
            return (
              <div key={s.id} onClick={() => { setServicioSeleccionado(s); setIsDetalleOpen(true); }}
                className="group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="font-mono text-xs text-[#1e3a5f] dark:text-blue-400 font-semibold">{s.codigo}</span>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 line-clamp-1">{s.titulo}</h3>
                  </div>
                  <Badge className={estadoConfig?.color || ''}>{estadoConfig?.label || s.estado}</Badge>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> {s.clienteNombre || 'Sin cliente'}
                </p>
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-3">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {s.fechaInicio ? format(new Date(s.fechaInicio), 'dd/MM/yyyy') : '-'}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {s.origen || '-'} {s.destino ? `-> ${s.destino}` : ''}</span>
                </div>
                {s.tareas && s.tareas.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500 dark:text-slate-400">Progreso</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{progreso}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1e3a5f] dark:bg-blue-500 rounded-full transition-all" style={{ width: `${progreso}%` }} />
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="text-sm">
                    <span className="text-slate-500 dark:text-slate-400">{(s.precio || 0).toLocaleString()} EUR</span>
                    {margen !== 0 && <span className={`ml-2 text-xs ${margen >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{margen >= 0 ? '+' : ''}{margen.toLocaleString()} EUR</span>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setServicioSeleccionado(s); setIsDetalleOpen(true); }}><Eye className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setServicioSeleccionado(s); setIsEditarOpen(true); }}><Edit3 className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={(e) => handleEliminar(s.id, e)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Vista LISTA (tabla) */
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-left">
                <tr><th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Codigo</th><th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Titulo</th><th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Cliente</th><th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Estado</th><th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Fecha</th><th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 text-right">Precio</th><th className="px-4 py-3"></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtrados.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500"><FileText className="h-10 w-10 mx-auto mb-2" />No hay servicios</td></tr>
                ) : filtrados.map(s => {
                  const e = ESTADOS.find(x => x.value === s.estado);
                  return (
                    <tr key={s.id} onClick={() => { setServicioSeleccionado(s); setIsDetalleOpen(true); }} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[#1e3a5f] dark:text-blue-400">{s.codigo}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{s.titulo}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{s.clienteNombre}</td>
                      <td className="px-4 py-3"><Badge className={e?.color || ''}>{e?.label}</Badge></td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{s.fechaInicio ? format(new Date(s.fechaInicio), 'dd/MM/yy') : '-'}</td>
                      <td className="px-4 py-3 text-right font-medium dark:text-slate-200">{(s.precio || 0).toLocaleString()} EUR</td>
                      <td className="px-4 py-3"><div className="flex gap-1 justify-end"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={(ev) => { ev.stopPropagation(); setServicioSeleccionado(s); setIsDetalleOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" className="h-7 w-7" onClick={(ev) => { ev.stopPropagation(); setServicioSeleccionado(s); setIsEditarOpen(true); }}><Edit3 className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={(ev) => handleEliminar(s.id, ev)}><Trash2 className="h-3.5 w-3.5" /></Button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DIALOG: Wizard Nuevo Servicio */}
      <Dialog open={isNuevoOpen} onOpenChange={(open) => { if (!open) resetWizard(); }}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">Nuevo Servicio</DialogTitle>
            <DialogDescription className="dark:text-slate-400">Paso {wizardStep} de 3</DialogDescription>
          </DialogHeader>

          {/* Wizard steps indicator */}
          <div className="flex items-center gap-2 mb-4">
            {['Informacion Basica', 'Fechas y Ubicacion', 'Asignacion y Precio'].map((label, i) => {
              const step = i + 1;
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                    step === wizardStep ? 'bg-[#1e3a5f] text-white' : step < wizardStep ? 'bg-green-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    {step < wizardStep ? <CheckCircle2 className="h-4 w-4" /> : step}
                  </div>
                  <span className={`ml-2 text-xs font-medium hidden sm:inline ${step === wizardStep ? 'text-[#1e3a5f] dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>{label}</span>
                  {step < 3 && <ChevronRight className="h-4 w-4 mx-2 text-slate-300 dark:text-slate-600" />}
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSubmit}>
            {/* PASO 1: Informacion Basica */}
            {wizardStep === 1 && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cliente *</Label>
                    <Select value={String(nuevoServicio.clienteId || '')} onValueChange={(v) => setNuevoServicio(p => ({...p, clienteId: v}))}>
                      <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                      <SelectContent>{clientes.filter(c => c.estado === 'activo').map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo *</Label>
                    <Select value={nuevoServicio.tipo} onValueChange={(v) => setNuevoServicio(p => ({...p, tipo: v as TipoServicio}))}>
                      <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lanzadera">Lanzadera</SelectItem>
                        <SelectItem value="discrecional">Discrecional</SelectItem>
                        <SelectItem value="staff">Movilidad Staff</SelectItem>
                        <SelectItem value="ruta_programada">Ruta Programada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Titulo *</Label>
                  <Input value={nuevoServicio.titulo || ''} onChange={(e) => setNuevoServicio(p => ({...p, titulo: e.target.value}))} placeholder="Ej: Transporte evento corporativo" className="dark:bg-slate-900 dark:border-slate-600" />
                </div>
                <div className="space-y-2">
                  <Label>Descripcion</Label>
                  <Textarea value={nuevoServicio.descripcion || ''} onChange={(e) => setNuevoServicio(p => ({...p, descripcion: e.target.value}))} placeholder="Detalles del servicio..." rows={3} className="dark:bg-slate-900 dark:border-slate-600" />
                </div>
              </div>
            )}

            {/* PASO 2: Fechas y Ubicacion */}
            {wizardStep === 2 && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha Inicio *</Label>
                    <Input type="date" value={String(nuevoServicio.fechaInicio || '')} onChange={(e) => setNuevoServicio(p => ({...p, fechaInicio: e.target.value}))} className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora Inicio</Label>
                    <Input type="time" value={String(nuevoServicio.horaInicio || '')} onChange={(e) => setNuevoServicio(p => ({...p, horaInicio: e.target.value}))} className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha Fin</Label>
                    <Input type="date" value={String(nuevoServicio.fechaFin || '')} onChange={(e) => setNuevoServicio(p => ({...p, fechaFin: e.target.value}))} className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora Fin</Label>
                    <Input type="time" value={String(nuevoServicio.horaFin || '')} onChange={(e) => setNuevoServicio(p => ({...p, horaFin: e.target.value}))} className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Origen</Label>
                    <Input value={nuevoServicio.origen || ''} onChange={(e) => setNuevoServicio(p => ({...p, origen: e.target.value}))} placeholder="Ciudad o direccion" className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Destino</Label>
                    <Input value={nuevoServicio.destino || ''} onChange={(e) => setNuevoServicio(p => ({...p, destino: e.target.value}))} placeholder="Ciudad o direccion" className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                </div>
              </div>
            )}

            {/* PASO 3: Asignacion y Precio */}
            {wizardStep === 3 && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>N. Vehiculos</Label>
                    <Input type="number" min={1} max={20} value={nuevoServicio.numeroVehiculos || 1} onChange={(e) => setNuevoServicio(p => ({...p, numeroVehiculos: parseInt(e.target.value) || 1}))} className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Precio (EUR)</Label>
                    <Input type="number" min={0} value={nuevoServicio.precio || ''} onChange={(e) => setNuevoServicio(p => ({...p, precio: parseFloat(e.target.value) || 0}))} placeholder="0" className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                  <div className="space-y-2">
                    <Label>Dias Pago</Label>
                    <Input type="number" min={0} value={nuevoServicio.diasPago || 30} onChange={(e) => setNuevoServicio(p => ({...p, diasPago: parseInt(e.target.value) || 30}))} className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                </div>

                {/* Auto-asignacion */}
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                  <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300">Auto-asignacion</h4>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="autoCond" checked={autoConductor} onChange={(e) => setAutoConductor(e.target.checked)} className="rounded" />
                    <label htmlFor="autoCond" className="text-sm dark:text-slate-300">Asignar conductor disponible {conductorDisp ? `(${conductorDisp.nombre})` : '(no hay)'}</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="autoVeh" checked={autoVehiculo} onChange={(e) => setAutoVehiculo(e.target.checked)} className="rounded" />
                    <label htmlFor="autoVeh" className="text-sm dark:text-slate-300">Asignar vehiculo disponible {vehiculoDisp ? `(${vehiculoDisp.matricula})` : '(no hay)'}</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="coord" checked={incluirCoordinador} onChange={(e) => setIncluirCoordinador(e.target.checked)} className="rounded" />
                    <label htmlFor="coord" className="text-sm dark:text-slate-300">Incluir coordinador (+{TARIFA_COORDINADOR_HORA} EUR/h)</label>
                  </div>
                </div>

                {/* Costes estimados */}
                {costesEstimados && (
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4">
                    <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300 mb-2">Coste Estimado</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div><p className="text-slate-500 dark:text-slate-400 text-xs">Conductor</p><p className="font-semibold dark:text-slate-200">{costesEstimados.costeConductor} EUR</p></div>
                      <div><p className="text-slate-500 dark:text-slate-400 text-xs">Gasoil</p><p className="font-semibold dark:text-slate-200">{costesEstimados.costeGasoil.toFixed(0)} EUR</p></div>
                      {incluirCoordinador && <div><p className="text-slate-500 dark:text-slate-400 text-xs">Coordinador</p><p className="font-semibold dark:text-slate-200">{costesEstimados.costeCoordinador} EUR</p></div>}
                      <div><p className="text-slate-500 dark:text-slate-400 text-xs">Total</p><p className="font-bold text-[#1e3a5f] dark:text-blue-400">{costesEstimados.total} EUR</p></div>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{costesEstimados.detalle}</p>
                  </div>
                )}
              </div>
            )}

            {/* Botones navegacion */}
            <div className="flex justify-between pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
              <Button type="button" variant="outline" onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : resetWizard()} disabled={isSubmitting} className="dark:border-slate-600 dark:text-slate-300">
                {wizardStep === 1 ? 'Cancelar' : 'Anterior'}
              </Button>
              {wizardStep < 3 ? (
                <Button type="button" onClick={() => setWizardStep(wizardStep + 1)} className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600">
                  Siguiente <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting} className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600">
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando...</> : 'Crear Servicio'}
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Detalle */}
      <Dialog open={isDetalleOpen} onOpenChange={setIsDetalleOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">Detalle del Servicio</DialogTitle>
          </DialogHeader>
          {servicioSeleccionado && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-[#1e3a5f] dark:text-blue-400">{servicioSeleccionado.codigo}</span>
                <Badge className={ESTADOS.find(e => e.value === servicioSeleccionado.estado)?.color || ''}>
                  {ESTADOS.find(e => e.value === servicioSeleccionado.estado)?.label}
                </Badge>
              </div>
              <h3 className="text-lg font-semibold dark:text-slate-100">{servicioSeleccionado.titulo}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-slate-500 dark:text-slate-400">Cliente</p><p className="font-medium dark:text-slate-200">{servicioSeleccionado.clienteNombre}</p></div>
                <div><p className="text-slate-500 dark:text-slate-400">Tipo</p><p className="font-medium dark:text-slate-200 capitalize">{servicioSeleccionado.tipo?.replace('_', ' ')}</p></div>
                <div><p className="text-slate-500 dark:text-slate-400">Fecha</p><p className="font-medium dark:text-slate-200">{servicioSeleccionado.fechaInicio ? format(new Date(servicioSeleccionado.fechaInicio), 'dd/MM/yyyy HH:mm') : '-'}</p></div>
                <div><p className="text-slate-500 dark:text-slate-400">Precio</p><p className="font-bold text-[#1e3a5f] dark:text-blue-400">{(servicioSeleccionado.precio || 0).toLocaleString()} EUR</p></div>
              </div>
              {servicioSeleccionado.descripcion && (
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-3"><p className="text-sm dark:text-slate-300">{servicioSeleccionado.descripcion}</p></div>
              )}
              {/* Tareas */}
              {servicioSeleccionado.tareas && servicioSeleccionado.tareas.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 dark:text-slate-300">Tareas ({getProgreso(servicioSeleccionado)}%)</h4>
                  <div className="space-y-1">
                    {servicioSeleccionado.tareas.map(t => (
                      <div key={t.id} className={`flex items-center gap-2 text-sm ${t.completada ? 'text-green-600 dark:text-green-400 line-through' : 'text-slate-600 dark:text-slate-400'}`}>
                        {t.completada ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        {t.nombre}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => { setIsDetalleOpen(false); setIsEditarOpen(true); }} className="dark:border-slate-600 dark:text-slate-300">Editar</Button>
                {!servicioSeleccionado.facturado && servicioSeleccionado.estado === 'completado' && (
                  <Button asChild className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600"><Link to="/facturacion">Facturar</Link></Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG: Editar (simplificado) */}
      <Dialog open={isEditarOpen} onOpenChange={setIsEditarOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">Editar Servicio</DialogTitle>
          </DialogHeader>
          {servicioSeleccionado && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Titulo</Label>
                  <Input defaultValue={servicioSeleccionado.titulo} className="dark:bg-slate-900 dark:border-slate-600" />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select defaultValue={servicioSeleccionado.estado}>
                    <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTADOS.filter(e => e.value !== 'todos').map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descripcion</Label>
                <Textarea defaultValue={servicioSeleccionado.descripcion || ''} rows={3} className="dark:bg-slate-900 dark:border-slate-600" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Precio (EUR)</Label>
                  <Input type="number" defaultValue={servicioSeleccionado.precio || 0} className="dark:bg-slate-900 dark:border-slate-600" />
                </div>
                <div className="space-y-2">
                  <Label>Fecha Inicio</Label>
                  <Input type="date" defaultValue={servicioSeleccionado.fechaInicio ? format(new Date(servicioSeleccionado.fechaInicio), 'yyyy-MM-dd') : ''} className="dark:bg-slate-900 dark:border-slate-600" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsEditarOpen(false)} className="dark:border-slate-600 dark:text-slate-300">Cancelar</Button>
                <Button onClick={() => { showToast('Actualizado (demo)', 'success'); setIsEditarOpen(false); }} className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600">Guardar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
