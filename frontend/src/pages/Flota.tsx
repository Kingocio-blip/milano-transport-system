// ============================================
// MILANO - Flota v2.1
// Estado directo, Documentacion obligatoria, Tareas/Mantenimiento
// ============================================

import { useState, useEffect, useMemo } from 'react';
import { useVehiculosStore, useUIStore } from '../store';
import { vehiculoTareasApi, vehiculoEstadoApi } from '@/lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Bus, Search, Plus, Edit3, Trash2, Eye, Calendar, AlertTriangle, CheckCircle2,
  Wrench, Fuel, Loader2, X, LayoutGrid, List, Gauge, Shield, FileText,
  AlertCircle, Upload, ChevronDown, Clock, Save
} from 'lucide-react';
import { SkeletonPage } from '../components/LoadingScreen';
import { format, parseISO, isValid, differenceInDays, compareAsc, isFuture, isPast } from 'date-fns';
import { es } from 'date-fns/locale';

const TIPOS_VEHICULO = [
  { value: 'autobus', label: 'Autobus' },
  { value: 'minibus', label: 'Minibus' },
  { value: 'furgoneta', label: 'Furgoneta' },
  { value: 'coche', label: 'Coche' },
  { value: 'microbus', label: 'Microbus' },
  { value: 'monovolumen', label: 'Monovolumen' },
];
const COMBUSTIBLES = [
  { value: 'diesel', label: 'Diesel' },
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'electric', label: 'Electrico' },
  { value: 'hibrido', label: 'Hibrido' },
  { value: 'gnc', label: 'GNC (Gas Natural)' },
];
const ESTADOS_VEHICULO = [
  { value: 'operativo', label: 'Operativo', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'taller', label: 'Taller', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'baja', label: 'Baja temporal', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
];
const TIPOS_TAREA = [
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'averia', label: 'Averia' },
  { value: 'itv', label: 'ITV' },
  { value: 'tarjeta_transportes', label: 'Tarjeta transportes' },
  { value: 'seguro', label: 'Seguro' },
  { value: 'calibracion', label: 'Calibracion' },
  { value: 'extintores', label: 'Extintores' },
  { value: 'otro', label: 'Otro' },
];

const fmtDate = (d: string | Date | undefined): string => {
  if (!d) return '-';
  try { const p = typeof d === 'string' ? parseISO(d) : d; return isValid(p) ? format(p, 'dd/MM/yyyy') : '-'; } catch { return '-'; }
};
const fmtDateTime = (d: string | Date | undefined): string => {
  if (!d) return '-';
  try { const p = typeof d === 'string' ? parseISO(d) : d; return isValid(p) ? format(p, 'dd/MM/yyyy HH:mm') : '-'; } catch { return '-'; }
};
const toDateInput = (d: string | Date | undefined): string => {
  if (!d) return ''; if (typeof d === 'string') return d.split('T')[0]; return d.toISOString().split('T')[0];
};
const diasRestantes = (d: string | Date | undefined): number | null => {
  if (!d) return null;
  try { return differenceInDays(parseISO(d as string), new Date()); } catch { return null; }
};

// Verificar si documentacion obligatoria esta completa
const documentacionCompleta = (v: any): boolean => {
  return !!(
    v.tarjeta_transportes_numero && v.tarjeta_transportes_fecha_renovacion &&
    v.itv_fecha_proxima && v.seguro_compania && v.seguro_poliza && v.seguro_fecha_vencimiento &&
    v.tacografo_fecha_calibracion && v.extintores_fecha_vencimiento
  );
};

// Alertas de documentacion
const getAlertasDoc = (v: any) => {
  const alertas: { texto: string; dias: number; tipo: 'critica' | 'aviso' | 'ok' }[] = [];
  const checks = [
    { campo: v.tarjeta_transportes_fecha_renovacion, nombre: 'Tarjeta transportes', alertaDias: 30 },
    { campo: v.itv_fecha_proxima, nombre: 'ITV', alertaDias: 20 },
    { campo: v.seguro_fecha_vencimiento, nombre: 'Seguro', alertaDias: 20 },
    { campo: v.tacografo_fecha_calibracion, nombre: 'Tacografo', alertaDias: 10 },
    { campo: v.extintores_fecha_vencimiento, nombre: 'Extintores', alertaDias: 10 },
  ];
  checks.forEach(c => {
    if (!c.campo) { alertas.push({ texto: `${c.nombre}: Sin fecha`, dias: -999, tipo: 'critica' }); }
    else { const d = diasRestantes(c.campo); if (d !== null) { if (d < 0) alertas.push({ texto: `${c.nombre}: Vencido (${Math.abs(d)} dias)`, dias: d, tipo: 'critica' }); else if (d <= c.alertaDias) alertas.push({ texto: `${c.nombre}: Vence en ${d} dias`, dias: d, tipo: 'aviso' }); } }
  });
  return alertas;
};

export default function Flota() {
  const { vehiculos, isLoading, addVehiculo, updateVehiculo, deleteVehiculo, fetchVehiculos } = useVehiculosStore();
  const { showToast } = useUIStore();

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('todos');
  const [vistaMode, setVistaMode] = useState<'cards' | 'lista'>('cards');

  // Modales
  const [isNuevoOpen, setIsNuevoOpen] = useState(false);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const [isEditarOpen, setIsEditarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehSeleccionado, setVehSeleccionado] = useState<any>(null);
  const [detalleTab, setDetalleTab] = useState('info');

  // Form nuevo vehiculo
  const [nuevoVeh, setNuevoVeh] = useState<Record<string, any>>({ tipo: 'autobus', combustible: 'diesel', plazas: 50, añoFabricacion: new Date().getFullYear() });
  const [tipoPersonalizado, setTipoPersonalizado] = useState('');

  // Form editar vehiculo (CONTROLADO)
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  // Tareas
  const [tareas, setTareas] = useState<any[]>([]);
  const [isTareaOpen, setIsTareaOpen] = useState(false);
  const [nuevaTarea, setNuevaTarea] = useState<Record<string, any>>({ tipo: 'mantenimiento', fecha: format(new Date(), 'yyyy-MM-dd'), concepto: '', gasto: '', anotaciones: '' });

  // Modal Taller
  const [isTallerOpen, setIsTallerOpen] = useState(false);
  const [tallerForm, setTallerForm] = useState({ fechaInicio: format(new Date(), 'yyyy-MM-dd'), fechaFin: '', motivo: '' });

  // Modal Baja
  const [isBajaOpen, setIsBajaOpen] = useState(false);
  const [bajaForm, setBajaForm] = useState({ motivo: '' });

  // Documentación editable en detalle
  const [docEdits, setDocEdits] = useState<Record<string, any>>({});

  useEffect(() => { fetchVehiculos(); }, [fetchVehiculos]);

  // Cargar tareas al ver detalle
  useEffect(() => {
    if (vehSeleccionado?.id && isDetalleOpen) {
      cargarTareas(vehSeleccionado.id);
    }
  }, [vehSeleccionado, isDetalleOpen]);

  // Inicializar editForm cuando se abre editar
  useEffect(() => {
    if (isEditarOpen && vehSeleccionado) {
      setEditForm({ ...vehSeleccionado });
    }
  }, [isEditarOpen, vehSeleccionado]);

  // Inicializar docEdites cuando cambia vehículo
  useEffect(() => {
    if (vehSeleccionado) {
      setDocEdits({
        tarjeta_transportes_numero: vehSeleccionado.tarjetaTransportesNumero || '',
        tarjeta_transportes_fecha_renovacion: toDateInput(vehSeleccionado.tarjetaTransportesFechaRenovacion),
        itv_fecha_proxima: toDateInput(vehSeleccionado.itvFechaProxima),
        seguro_compania: vehSeleccionado.seguroCompania || '',
        seguro_poliza: vehSeleccionado.seguroPoliza || '',
        seguro_fecha_vencimiento: toDateInput(vehSeleccionado.seguroFechaVencimiento),
        tacografo_fecha_calibracion: toDateInput(vehSeleccionado.tacografoFechaCalibracion),
        extintores_fecha_vencimiento: toDateInput(vehSeleccionado.extintoresFechaVencimiento),
      });
    }
  }, [vehSeleccionado]);

  const cargarTareas = async (vehiculoId: string) => {
    try { const res = await vehiculoTareasApi.getByVehiculo(vehiculoId); setTareas(res.data || []); }
    catch { setTareas([]); }
  };

  const stats = useMemo(() => ({
    total: vehiculos.length,
    operativos: vehiculos.filter(v => v.estado === 'operativo').length,
    taller: vehiculos.filter(v => v.estado === 'taller').length,
    baja: vehiculos.filter(v => v.estado === 'baja').length,
  }), [vehiculos]);

  const filtrados = useMemo(() => vehiculos.filter(v => {
    const sq = searchQuery.toLowerCase().trim();
    const ms = sq === '' || v.matricula?.toLowerCase().includes(sq) || v.marca?.toLowerCase().includes(sq) || v.modelo?.toLowerCase().includes(sq);
    return ms && (estadoFiltro === 'todos' || v.estado === estadoFiltro);
  }), [vehiculos, searchQuery, estadoFiltro]);

  // Ordenar tareas: futuras primero (asc), pasadas después (desc)
  const tareasOrdenadas = useMemo(() => {
    const ahora = new Date().getTime();
    return [...tareas].sort((a, b) => {
      const ta = new Date(a.fecha).getTime();
      const tb = new Date(b.fecha).getTime();
      const aFutura = ta >= ahora;
      const bFutura = tb >= ahora;
      if (aFutura && !bFutura) return -1;
      if (!aFutura && bFutura) return 1;
      if (aFutura && bFutura) return ta - tb; // más cercana primero
      return tb - ta; // pasadas: más reciente primero
    });
  }, [tareas]);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoVeh.matricula?.trim()) { showToast('La matricula es obligatoria', 'error'); return; }
    setIsSubmitting(true);
    try {
      const tipoFinal = (nuevoVeh.tipo === '__otro__') ? (tipoPersonalizado.trim() || 'autobus') : nuevoVeh.tipo;
      const success = await addVehiculo({
        ...nuevoVeh, tipo: tipoFinal,
        estado: documentacionCompleta(nuevoVeh) ? 'operativo' : 'baja',
      } as any);
      if (success) { setIsNuevoOpen(false); setNuevoVeh({ tipo: 'autobus', combustible: 'diesel', plazas: 50, añoFabricacion: new Date().getFullYear() }); setTipoPersonalizado(''); showToast('Vehiculo creado', 'success'); fetchVehiculos(); }
    } catch (err: any) { showToast(`Error: ${err.message}`, 'error'); }
    finally { setIsSubmitting(false); }
  };

  // Cambiar estado con flujo según tipo
  const handleCambiarEstado = async (estado: string) => {
    if (!vehSeleccionado) return;
    const id = String(vehSeleccionado.id);

    if (estado === 'operativo') {
      if (!documentacionCompleta(vehSeleccionado)) {
        showToast('No se puede poner operativo: falta documentacion obligatoria', 'error');
        return;
      }
      await ejecutarCambioEstado(id, { estado: 'operativo' });
    } else if (estado === 'taller') {
      setTallerForm({ fechaInicio: format(new Date(), 'yyyy-MM-dd'), fechaFin: '', motivo: '' });
      setIsTallerOpen(true);
    } else if (estado === 'baja') {
      setBajaForm({ motivo: '' });
      setIsBajaOpen(true);
    }
  };

  const ejecutarCambioEstado = async (id: string, payload: any) => {
    try {
      await vehiculoEstadoApi.update(id, payload);
      showToast(`Estado cambiado a ${payload.estado}`, 'success');
      fetchVehiculos();
      // Actualizar vehSeleccionado local
      setVehSeleccionado((prev: any) => prev ? { ...prev, ...payload, estado: payload.estado } : null);
    } catch (err: any) { showToast(`Error: ${err.message}`, 'error'); }
  };

  const confirmarTaller = async () => {
    if (!vehSeleccionado) return;
    if (!tallerForm.motivo.trim()) { showToast('El motivo es obligatorio', 'error'); return; }
    const payload = {
      estado: 'taller',
      motivo: tallerForm.motivo,
      taller_fecha_inicio: new Date(tallerForm.fechaInicio).toISOString(),
      taller_fecha_fin: tallerForm.fechaFin ? new Date(tallerForm.fechaFin).toISOString() : null,
    };
    await ejecutarCambioEstado(String(vehSeleccionado.id), payload);
    setIsTallerOpen(false);
  };

  const confirmarBaja = async () => {
    if (!vehSeleccionado) return;
    const payload = {
      estado: 'baja',
      baja_motivo: bajaForm.motivo || 'Baja temporal',
    };
    await ejecutarCambioEstado(String(vehSeleccionado.id), payload);
    setIsBajaOpen(false);
  };

  const handleEliminar = async (id: string) => {
    if (!window.confirm('Eliminar vehiculo?')) return;
    try { if (await deleteVehiculo(id)) { showToast('Eliminado', 'success'); setIsDetalleOpen(false); fetchVehiculos(); } }
    catch (err: any) { showToast(`Error: ${err.message}`, 'error'); }
  };

  // GUARDAR EDICIÓN DE VEHÍCULO
  const handleGuardarEditar = async () => {
    if (!vehSeleccionado) return;
    setIsSubmitting(true);
    try {
      const payload = { ...editForm };
      // Limpiar campos internos
      ['id', 'fecha_creacion', 'fecha_actualizacion', 'tareas', 'mantenimientos', 'averias', 'anotaciones'].forEach(k => delete payload[k]);

      await updateVehiculo(String(vehSeleccionado.id), payload as any);
      showToast('Vehiculo actualizado', 'success');
      setIsEditarOpen(false);
      fetchVehiculos();
      setVehSeleccionado((prev: any) => ({ ...prev, ...payload }));
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // GUARDAR DOCUMENTACIÓN DESDE EL DETALLE
  const handleGuardarDocumentacion = async () => {
    if (!vehSeleccionado) return;
    setIsSubmitting(true);
    try {
      const payload = {
        tarjetaTransportesNumero: docEdits.tarjeta_transportes_numero || null,
        tarjetaTransportesFechaRenovacion: docEdits.tarjeta_transportes_fecha_renovacion || null,
        itvFechaProxima: docEdits.itv_fecha_proxima || null,
        seguroCompania: docEdits.seguro_compania || null,
        seguroPoliza: docEdits.seguro_poliza || null,
        seguroFechaVencimiento: docEdits.seguro_fecha_vencimiento || null,
        tacografoFechaCalibracion: docEdits.tacografo_fecha_calibracion || null,
        extintoresFechaVencimiento: docEdits.extintores_fecha_vencimiento || null,
      };
      await updateVehiculo(String(vehSeleccionado.id), payload as any);
      showToast('Documentacion actualizada', 'success');
      fetchVehiculos();
      setVehSeleccionado((prev: any) => ({ ...prev, ...payload }));
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCrearTarea = async () => {
    if (!vehSeleccionado) return;
    if (!nuevaTarea.concepto?.trim()) { showToast('El concepto es obligatorio', 'error'); return; }
    try {
      await vehiculoTareasApi.create(String(vehSeleccionado.id), {
        vehiculo_id: vehSeleccionado.id,
        tipo: nuevaTarea.tipo,
        fecha: new Date(nuevaTarea.fecha).toISOString(),
        concepto: nuevaTarea.concepto,
        gasto: parseFloat(nuevaTarea.gasto) || 0,
        anotaciones: nuevaTarea.anotaciones,
      });
      showToast('Tarea creada', 'success');
      setIsTareaOpen(false);
      setNuevaTarea({ tipo: 'mantenimiento', fecha: format(new Date(), 'yyyy-MM-dd'), concepto: '', gasto: '', anotaciones: '' });
      cargarTareas(String(vehSeleccionado.id));
    } catch (err: any) { showToast(`Error: ${err.message}`, 'error'); }
  };

  if (isLoading && vehiculos.length === 0) return <SkeletonPage type="mixed" tableCols={6} vistaMode={vistaMode} />;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Flota</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Gestion de vehiculos y mantenimiento</p>
        </div>
        <Button onClick={() => { setNuevoVeh({ tipo: 'autobus', combustible: 'diesel', plazas: 50, añoFabricacion: new Date().getFullYear() }); setTipoPersonalizado(''); setIsNuevoOpen(true); }} className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Vehiculo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Bus, color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' },
          { label: 'Operativos', value: stats.operativos, icon: CheckCircle2, color: 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400' },
          { label: 'En Taller', value: stats.taller, icon: Wrench, color: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' },
          { label: 'Baja', value: stats.baja, icon: AlertTriangle, color: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' },
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
          <Input placeholder="Buscar por matricula, marca, modelo..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 dark:bg-slate-900 dark:border-slate-700" />
        </div>
        <div className="flex gap-2">
          <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
            <SelectTrigger className="w-[140px] dark:bg-slate-900 dark:border-slate-700"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {ESTADOS_VEHICULO.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
            </SelectContent>
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
            <div className="col-span-full flex flex-col items-center py-16 text-slate-400 dark:text-slate-500"><Bus className="h-12 w-12 mb-3" /><p className="text-sm">No hay vehiculos</p></div>
          ) : filtrados.map(v => {
            const alertas = getAlertasDoc(v);
            return (
              <div key={v.id} onClick={() => { setVehSeleccionado(v); setDetalleTab('info'); setIsDetalleOpen(true); }}
                className="group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1e3a5f] dark:bg-blue-600 flex items-center justify-center text-white"><Bus className="h-5 w-5" /></div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{v.matricula}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{v.marca} {v.modelo}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={ESTADOS_VEHICULO.find(e => e.value === v.estado)?.color || ''}>{ESTADOS_VEHICULO.find(e => e.value === v.estado)?.label || v.estado}</Badge>
                    {alertas.length > 0 && <AlertTriangle className="h-4 w-4 text-red-500" />}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3">
                  <span><Gauge className="h-3 w-3 inline mr-1" />{v.kilometraje?.toLocaleString() || 0} km</span>
                  <span><Fuel className="h-3 w-3 inline mr-1" />{v.combustible || '-'}</span>
                  <span><Shield className="h-3 w-3 inline mr-1" />{v.plazas || '-'} plazas</span>
                  <span><Calendar className="h-3 w-3 inline mr-1" />{v.añoFabricacion || '-'}</span>
                </div>
                {alertas.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {alertas.slice(0, 2).map((a, i) => (
                      <p key={i} className={`text-xs ${a.tipo === 'critica' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        <AlertCircle className="h-3 w-3 inline mr-1" />{a.texto}
                      </p>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {ESTADOS_VEHICULO.filter(e => e.value !== v.estado).map(e => (
                      <Button key={e.value} size="sm" variant="outline" className="h-7 text-xs dark:border-slate-600" onClick={ev => { ev.stopPropagation(); setVehSeleccionado(v); handleCambiarEstado(e.value); }}>{e.label}</Button>
                    ))}
                  </div>
                  <div className="flex gap-1 ml-auto">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={e => { e.stopPropagation(); setVehSeleccionado(v); setIsEditarOpen(true); }}><Edit3 className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={e => { e.stopPropagation(); handleEliminar(String(v.id)); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Vista LISTA */
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-left">
                <tr><th className="px-4 py-3">Matricula</th><th className="px-4 py-3">Marca/Modelo</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Km</th><th className="px-4 py-3"></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtrados.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-slate-400 dark:text-slate-500"><Bus className="h-10 w-10 mx-auto mb-2" />No hay vehiculos</td></tr>
                  : filtrados.map(v => (
                    <tr key={v.id} onClick={() => { setVehSeleccionado(v); setDetalleTab('info'); setIsDetalleOpen(true); }} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-semibold dark:text-slate-200">{v.matricula}</td>
                      <td className="px-4 py-3 dark:text-slate-300">{v.marca} {v.modelo}</td>
                      <td className="px-4 py-3 capitalize dark:text-slate-400">{v.tipo}</td>
                      <td className="px-4 py-3"><Badge className={ESTADOS_VEHICULO.find(e => e.value === v.estado)?.color || ''}>{ESTADOS_VEHICULO.find(e => e.value === v.estado)?.label}</Badge></td>
                      <td className="px-4 py-3 dark:text-slate-400">{v.kilometraje?.toLocaleString() || 0}</td>
                      <td className="px-4 py-3"><div className="flex gap-1 justify-end"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); setVehSeleccionado(v); setIsEditarOpen(true); }}><Edit3 className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={e => { e.stopPropagation(); handleEliminar(String(v.id)); }}><Trash2 className="h-3.5 w-3.5" /></Button></div></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ DIALOG: NUEVO VEHICULO ============ */}
      <Dialog open={isNuevoOpen} onOpenChange={setIsNuevoOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">Nuevo Vehiculo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCrear} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Matricula *</Label><Input value={nuevoVeh.matricula || ''} onChange={e => setNuevoVeh(p => ({ ...p, matricula: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" required /></div>
              <div className="space-y-2"><Label>Bastidor *</Label><Input value={nuevoVeh.bastidor || ''} onChange={e => setNuevoVeh(p => ({ ...p, bastidor: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Marca *</Label><Input value={nuevoVeh.marca || ''} onChange={e => setNuevoVeh(p => ({ ...p, marca: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" required /></div>
              <div className="space-y-2"><Label>Modelo *</Label><Input value={nuevoVeh.modelo || ''} onChange={e => setNuevoVeh(p => ({ ...p, modelo: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={nuevoVeh.tipo} onValueChange={v => setNuevoVeh(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_VEHICULO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    <SelectItem value="__otro__">+ Otro tipo...</SelectItem>
                  </SelectContent>
                </Select>
                {nuevoVeh.tipo === '__otro__' && <Input className="mt-1 dark:bg-slate-900 dark:border-slate-600" placeholder="Tipo personalizado" value={tipoPersonalizado} onChange={e => setTipoPersonalizado(e.target.value)} />}
              </div>
              <div className="space-y-2"><Label>Combustible</Label>
                <Select value={nuevoVeh.combustible} onValueChange={v => setNuevoVeh(p => ({ ...p, combustible: v }))}>
                  <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                  <SelectContent>{COMBUSTIBLES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Plazas</Label><Input type="number" value={nuevoVeh.plazas || ''} onChange={e => setNuevoVeh(p => ({ ...p, plazas: parseInt(e.target.value) || 0 }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
              <div className="space-y-2"><Label>Ano fabricacion</Label><Input type="number" value={nuevoVeh.añoFabricacion || ''} onChange={e => setNuevoVeh(p => ({ ...p, añoFabricacion: parseInt(e.target.value) || new Date().getFullYear() }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
              <div className="space-y-2"><Label>Kilometraje actual</Label><Input type="number" value={nuevoVeh.kilometraje || ''} onChange={e => setNuevoVeh(p => ({ ...p, kilometraje: parseInt(e.target.value) || 0 }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
            </div>

            {/* Documentacion obligatoria */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2 dark:text-slate-300"><FileText className="h-4 w-4" />Documentacion obligatoria</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-xs">Tarjeta transportes - Numero</Label><Input value={nuevoVeh.tarjeta_transportes_numero || ''} onChange={e => setNuevoVeh(p => ({ ...p, tarjeta_transportes_numero: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                <div className="space-y-2"><Label className="text-xs">Tarjeta transportes - Fecha renovacion</Label><Input type="date" value={toDateInput(nuevoVeh.tarjeta_transportes_fecha_renovacion)} onChange={e => setNuevoVeh(p => ({ ...p, tarjeta_transportes_fecha_renovacion: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-xs">ITV proxima</Label><Input type="date" value={toDateInput(nuevoVeh.itv_fecha_proxima)} onChange={e => setNuevoVeh(p => ({ ...p, itv_fecha_proxima: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                <div className="space-y-2"><Label className="text-xs">Tacografo - Fecha calibracion</Label><Input type="date" value={toDateInput(nuevoVeh.tacografo_fecha_calibracion)} onChange={e => setNuevoVeh(p => ({ ...p, tacografo_fecha_calibracion: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-xs">Extintores - Fecha vencimiento</Label><Input type="date" value={toDateInput(nuevoVeh.extintores_fecha_vencimiento)} onChange={e => setNuevoVeh(p => ({ ...p, extintores_fecha_vencimiento: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                <div className="space-y-2"><Label className="text-xs">Seguro - Compania</Label><Input value={nuevoVeh.seguro_compania || ''} onChange={e => setNuevoVeh(p => ({ ...p, seguro_compania: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-xs">Seguro - Poliza</Label><Input value={nuevoVeh.seguro_poliza || ''} onChange={e => setNuevoVeh(p => ({ ...p, seguro_poliza: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                <div className="space-y-2"><Label className="text-xs">Seguro - Fecha vencimiento</Label><Input type="date" value={toDateInput(nuevoVeh.seguro_fecha_vencimiento)} onChange={e => setNuevoVeh(p => ({ ...p, seguro_fecha_vencimiento: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
              </div>
            </div>

            {!documentacionCompleta(nuevoVeh) && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Se creara en estado Baja temporal hasta completar la documentacion
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsNuevoOpen(false)} className="dark:border-slate-600 dark:text-slate-300">Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============ DIALOG: DETALLE VEHICULO ============ */}
      <Dialog open={isDetalleOpen} onOpenChange={setIsDetalleOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
          {vehSeleccionado && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 dark:text-slate-100">
                  <Bus className="h-5 w-5" />{vehSeleccionado.matricula} - {vehSeleccionado.marca} {vehSeleccionado.modelo}
                </DialogTitle>
              </DialogHeader>

              {/* Estado modificable directamente */}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">Estado:</span>
                {ESTADOS_VEHICULO.map(e => (
                  <button key={e.value} onClick={() => handleCambiarEstado(e.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      vehSeleccionado.estado === e.value ? e.color + ' ring-2 ring-offset-1' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >{e.label}</button>
                ))}
              </div>

              {/* Alertas documentacion */}
              {(() => {
                const alertas = getAlertasDoc(vehSeleccionado);
                return alertas.length > 0 ? (
                  <div className="space-y-1 mb-3">
                    {alertas.map((a, i) => (
                      <div key={i} className={`flex items-center gap-2 text-xs p-2 rounded ${a.tipo === 'critica' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'}`}>
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />{a.texto}
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}

              {!documentacionCompleta(vehSeleccionado) && (
                <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-xs text-red-700 dark:text-red-300 mb-3">
                  <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                  Documentacion incompleta. El vehiculo no puede estar operativo.
                </div>
              )}

              <Tabs value={detalleTab} onValueChange={setDetalleTab}>
                <TabsList className="dark:bg-slate-900">
                  <TabsTrigger value="info">Informacion</TabsTrigger>
                  <TabsTrigger value="documentacion">Documentacion</TabsTrigger>
                  <TabsTrigger value="tareas">Ficha ({tareas.length})</TabsTrigger>
                </TabsList>

                {/* Tab Info */}
                <TabsContent value="info" className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><p className="text-xs text-slate-500 dark:text-slate-400">Marca/Modelo</p><p className="text-sm font-medium dark:text-slate-200">{vehSeleccionado.marca} {vehSeleccionado.modelo}</p></div>
                    <div className="space-y-2"><p className="text-xs text-slate-500 dark:text-slate-400">Bastidor</p><p className="text-sm font-medium dark:text-slate-200">{vehSeleccionado.bastidor || '-'}</p></div>
                    <div className="space-y-2"><p className="text-xs text-slate-500 dark:text-slate-400">Tipo</p><p className="text-sm font-medium dark:text-slate-200 capitalize">{vehSeleccionado.tipo}</p></div>
                    <div className="space-y-2"><p className="text-xs text-slate-500 dark:text-slate-400">Combustible</p><p className="text-sm font-medium dark:text-slate-200 capitalize">{vehSeleccionado.combustible}</p></div>
                    <div className="space-y-2"><p className="text-xs text-slate-500 dark:text-slate-400">Plazas</p><p className="text-sm font-medium dark:text-slate-200">{vehSeleccionado.plazas || '-'}</p></div>
                    <div className="space-y-2"><p className="text-xs text-slate-500 dark:text-slate-400">Ano fabricacion</p><p className="text-sm font-medium dark:text-slate-200">{vehSeleccionado.añoFabricacion || '-'}</p></div>
                    <div className="space-y-2"><p className="text-xs text-slate-500 dark:text-slate-400">Kilometraje actual</p><p className="text-sm font-bold text-[#1e3a5f] dark:text-blue-400">{vehSeleccionado.kilometraje?.toLocaleString() || 0} km</p></div>
                    <div className="space-y-2"><p className="text-xs text-slate-500 dark:text-slate-400">Creado</p><p className="text-sm dark:text-slate-200">{fmtDate(vehSeleccionado.fecha_creacion)}</p></div>
                  </div>
                  {vehSeleccionado.notas && <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3"><p className="text-sm dark:text-slate-300">{vehSeleccionado.notas}</p></div>}

                  {/* Info taller/baja */}
                  {vehSeleccionado.estado === 'taller' && (
                    <div className="rounded-lg border border-amber-200 dark:border-amber-700 p-3 bg-amber-50 dark:bg-amber-900/20">
                      <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1"><Wrench className="h-4 w-4" />En taller</h4>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Desde: {fmtDateTime(vehSeleccionado.taller_fecha_inicio)} {vehSeleccionado.taller_fecha_fin && `hasta: ${fmtDateTime(vehSeleccionado.taller_fecha_fin)}`}</p>
                      {vehSeleccionado.taller_motivo && <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Motivo: {vehSeleccionado.taller_motivo}</p>}
                    </div>
                  )}
                  {vehSeleccionado.estado === 'baja' && (
                    <div className="rounded-lg border border-red-200 dark:border-red-700 p-3 bg-red-50 dark:bg-red-900/20">
                      <h4 className="text-sm font-medium text-red-800 dark:text-red-300 flex items-center gap-1"><AlertTriangle className="h-4 w-4" />Baja temporal</h4>
                      {vehSeleccionado.baja_motivo && <p className="text-xs text-red-700 dark:text-red-400 mt-1">Motivo: {vehSeleccionado.baja_motivo}</p>}
                      {vehSeleccionado.baja_fecha && <p className="text-xs text-red-700 dark:text-red-400 mt-1">Desde: {fmtDateTime(vehSeleccionado.baja_fecha)}</p>}
                    </div>
                  )}
                </TabsContent>

                {/* Tab Documentacion - EDITABLE */}
                <TabsContent value="documentacion" className="pt-4 space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium dark:text-slate-300">Documentacion del vehiculo</h4>
                    <Button size="sm" onClick={handleGuardarDocumentacion} disabled={isSubmitting} className="bg-[#1e3a5f] dark:bg-blue-600">
                      {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Save className="h-3.5 w-3.5 mr-1" />Guardar</>}
                    </Button>
                  </div>

                  {[
                    { label: 'Tarjeta transportes', numKey: 'tarjeta_transportes_numero', fechaKey: 'tarjeta_transportes_fecha_renovacion', alerta: 30 },
                    { label: 'ITV', numKey: null, fechaKey: 'itv_fecha_proxima', alerta: 20 },
                    { label: 'Seguro', numKey: 'seguro_poliza', fechaKey: 'seguro_fecha_vencimiento', alerta: 20 },
                    { label: 'Tacografo', numKey: null, fechaKey: 'tacografo_fecha_calibracion', alerta: 10 },
                    { label: 'Extintores', numKey: null, fechaKey: 'extintores_fecha_vencimiento', alerta: 10 },
                  ].map(doc => {
                    const fechaVal = docEdits[doc.fechaKey];
                    const d = diasRestantes(fechaVal);
                    const vencido = d !== null && d < 0;
                    const proximo = d !== null && d >= 0 && d <= doc.alerta;
                    return (
                      <div key={doc.label} className={`rounded-lg border p-3 ${vencido ? 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20' : proximo ? 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium dark:text-slate-200">{doc.label}</h4>
                          {vencido && <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs">Vencido</Badge>}
                          {proximo && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-xs">Vence en {d} dias</Badge>}
                          {d !== null && d > doc.alerta && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          {!fechaVal && <AlertTriangle className="h-4 w-4 text-red-500" />}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {doc.numKey && (
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Numero</p>
                              <Input value={docEdits[doc.numKey] || ''} onChange={e => setDocEdits(p => ({ ...p, [doc.numKey!]: e.target.value }))} className="h-8 text-sm dark:bg-slate-900 dark:border-slate-600" />
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Fecha</p>
                            <Input type="date" value={fechaVal || ''} onChange={e => setDocEdits(p => ({ ...p, [doc.fechaKey]: e.target.value }))} className="h-8 text-sm dark:bg-slate-900 dark:border-slate-600" />
                          </div>
                        </div>
                        {/* Documento adjunto */}
                        <div className="mt-2">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Documento PDF (URL)</p>
                          <Input placeholder="https://... .pdf" className="h-8 text-sm dark:bg-slate-900 dark:border-slate-600" />
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>

                {/* Tab Ficha - Tareas cronológicas */}
                <TabsContent value="tareas" className="pt-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium dark:text-slate-300">Historial de tareas y mantenimiento</h4>
                    <Button size="sm" onClick={() => setIsTareaOpen(true)} className="bg-[#1e3a5f] dark:bg-blue-600"><Plus className="mr-1 h-3.5 w-3.5" />Anadir</Button>
                  </div>

                  {tareasOrdenadas.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">Sin tareas registradas</p>
                  ) : (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-900/50 text-left">
                            <tr>
                              <th className="px-3 py-2 text-xs font-medium text-slate-500">Fecha</th>
                              <th className="px-3 py-2 text-xs font-medium text-slate-500">Tipo</th>
                              <th className="px-3 py-2 text-xs font-medium text-slate-500">Concepto</th>
                              <th className="px-3 py-2 text-xs font-medium text-slate-500">Gasto</th>
                              <th className="px-3 py-2 text-xs font-medium text-slate-500">Factura</th>
                              <th className="px-3 py-2 text-xs font-medium text-slate-500">Anotaciones</th>
                              <th className="px-3 py-2 text-xs font-medium text-slate-500">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {tareasOrdenadas.map(t => {
                              const esFutura = t.fecha && isFuture(parseISO(t.fecha));
                              return (
                                <tr key={t.id} className={`${esFutura ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''} hover:bg-slate-50 dark:hover:bg-slate-700/30`}>
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    <span className="text-xs font-medium dark:text-slate-200">{fmtDate(t.fecha)}</span>
                                    {esFutura && <span className="ml-1 text-[10px] text-blue-600 dark:text-blue-400">(prox.)</span>}
                                  </td>
                                  <td className="px-3 py-2">
                                    <Badge className={
                                      t.tipo === 'averia' ? 'bg-red-100 text-red-700 text-[10px]' :
                                      t.tipo === 'mantenimiento' ? 'bg-blue-100 text-blue-700 text-[10px]' :
                                      'bg-slate-100 text-slate-700 text-[10px]'
                                    }>{t.tipo}</Badge>
                                  </td>
                                  <td className="px-3 py-2 text-xs dark:text-slate-300 max-w-[200px] truncate">{t.concepto || '-'}</td>
                                  <td className="px-3 py-2 text-xs dark:text-slate-400">{t.gasto ? `${t.gasto} EUR` : '-'}</td>
                                  <td className="px-3 py-2 text-xs">
                                    {t.factura_url ? <a href={t.factura_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Ver</a> : '-'}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{t.anotaciones || '-'}</td>
                                  <td className="px-3 py-2">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                      t.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' :
                                      t.estado === 'completada' ? 'bg-green-100 text-green-700' :
                                      'bg-slate-100 text-slate-600'
                                    }`}>{t.estado}</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setIsDetalleOpen(false); setIsEditarOpen(true); }} className="dark:border-slate-600 dark:text-slate-300">Editar</Button>
                <Button variant="destructive" onClick={() => handleEliminar(String(vehSeleccionado.id))}>Eliminar</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ DIALOG: EDITAR VEHICULO (CONTROLADO) ============ */}
      <Dialog open={isEditarOpen} onOpenChange={setIsEditarOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader><DialogTitle className="dark:text-slate-100">Editar Vehiculo</DialogTitle></DialogHeader>
          {vehSeleccionado && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Matricula</Label><Input value={editForm.matricula || ''} onChange={e => setEditForm(p => ({ ...p, matricula: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                <div className="space-y-2"><Label>Bastidor</Label><Input value={editForm.bastidor || ''} onChange={e => setEditForm(p => ({ ...p, bastidor: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Marca</Label><Input value={editForm.marca || ''} onChange={e => setEditForm(p => ({ ...p, marca: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                <div className="space-y-2"><Label>Modelo</Label><Input value={editForm.modelo || ''} onChange={e => setEditForm(p => ({ ...p, modelo: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Kilometraje</Label><Input type="number" value={editForm.kilometraje || 0} onChange={e => setEditForm(p => ({ ...p, kilometraje: parseInt(e.target.value) || 0 }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                <div className="space-y-2"><Label>Notas</Label><Textarea value={editForm.notas || ''} onChange={e => setEditForm(p => ({ ...p, notas: e.target.value }))} rows={2} className="dark:bg-slate-900 dark:border-slate-600" /></div>
              </div>

              {/* Documentacion editable */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                <h4 className="font-medium text-sm dark:text-slate-300">Documentacion</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="text-xs">Tarjeta transportes - Numero</Label><Input value={editForm.tarjeta_transportes_numero || ''} onChange={e => setEditForm(p => ({ ...p, tarjeta_transportes_numero: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                  <div className="space-y-2"><Label className="text-xs">Tarjeta transportes - Renovacion</Label><Input type="date" value={toDateInput(editForm.tarjeta_transportes_fecha_renovacion)} onChange={e => setEditForm(p => ({ ...p, tarjeta_transportes_fecha_renovacion: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                  <div className="space-y-2"><Label className="text-xs">ITV proxima</Label><Input type="date" value={toDateInput(editForm.itv_fecha_proxima)} onChange={e => setEditForm(p => ({ ...p, itv_fecha_proxima: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                  <div className="space-y-2"><Label className="text-xs">Tacografo calibracion</Label><Input type="date" value={toDateInput(editForm.tacografo_fecha_calibracion)} onChange={e => setEditForm(p => ({ ...p, tacografo_fecha_calibracion: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                  <div className="space-y-2"><Label className="text-xs">Extintores vencimiento</Label><Input type="date" value={toDateInput(editForm.extintores_fecha_vencimiento)} onChange={e => setEditForm(p => ({ ...p, extintores_fecha_vencimiento: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                  <div className="space-y-2"><Label className="text-xs">Seguro vencimiento</Label><Input type="date" value={toDateInput(editForm.seguro_fecha_vencimiento)} onChange={e => setEditForm(p => ({ ...p, seguro_fecha_vencimiento: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="text-xs">Seguro - Compania</Label><Input value={editForm.seguro_compania || ''} onChange={e => setEditForm(p => ({ ...p, seguro_compania: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                  <div className="space-y-2"><Label className="text-xs">Seguro - Poliza</Label><Input value={editForm.seguro_poliza || ''} onChange={e => setEditForm(p => ({ ...p, seguro_poliza: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                </div>
              </div>

              {!documentacionCompleta(editForm) && (
                <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-xs text-red-700 dark:text-red-300">
                  <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                  Documentacion incompleta. Si guardas, el vehiculo pasara a Baja temporal.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsEditarOpen(false)} className="dark:border-slate-600 dark:text-slate-300">Cancelar</Button>
                <Button onClick={handleGuardarEditar} disabled={isSubmitting} className="bg-[#1e3a5f] dark:bg-blue-600">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar cambios'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ DIALOG: NUEVA TAREA ============ */}
      <Dialog open={isTareaOpen} onOpenChange={setIsTareaOpen}>
        <DialogContent className="max-w-lg dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader><DialogTitle className="dark:text-slate-100">Nueva tarea</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={nuevaTarea.tipo} onValueChange={v => setNuevaTarea(p => ({ ...p, tipo: v }))}>
                <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS_TAREA.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Fecha</Label><Input type="date" value={nuevaTarea.fecha} onChange={e => setNuevaTarea(p => ({ ...p, fecha: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
            <div className="space-y-2"><Label>Concepto</Label><Input value={nuevaTarea.concepto} onChange={e => setNuevaTarea(p => ({ ...p, concepto: e.target.value }))} placeholder="Descripcion de la tarea" className="dark:bg-slate-900 dark:border-slate-600" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Gasto (EUR)</Label><Input type="number" value={nuevaTarea.gasto} onChange={e => setNuevaTarea(p => ({ ...p, gasto: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" /></div>
              <div className="space-y-2"><Label>Factura URL</Label><Input value={nuevaTarea.factura_url || ''} onChange={e => setNuevaTarea(p => ({ ...p, factura_url: e.target.value }))} placeholder="https://..." className="dark:bg-slate-900 dark:border-slate-600" /></div>
            </div>
            <div className="space-y-2"><Label>Anotaciones</Label><Textarea value={nuevaTarea.anotaciones} onChange={e => setNuevaTarea(p => ({ ...p, anotaciones: e.target.value }))} rows={2} className="dark:bg-slate-900 dark:border-slate-600" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsTareaOpen(false)} className="dark:border-slate-600 dark:text-slate-300">Cancelar</Button>
              <Button onClick={handleCrearTarea} className="bg-[#1e3a5f] dark:bg-blue-600">Crear tarea</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ DIALOG: TALLER (fechas) ============ */}
      <Dialog open={isTallerOpen} onOpenChange={setIsTallerOpen}>
        <DialogContent className="max-w-md dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader><DialogTitle className="dark:text-slate-100">Marcar vehiculo en Taller</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Fecha de inicio *</Label>
              <Input type="date" value={tallerForm.fechaInicio} onChange={e => setTallerForm(p => ({ ...p, fechaInicio: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" />
            </div>
            <div className="space-y-2">
              <Label>Fecha de fin prevista (opcional)</Label>
              <Input type="date" value={tallerForm.fechaFin} onChange={e => setTallerForm(p => ({ ...p, fechaFin: e.target.value }))} className="dark:bg-slate-900 dark:border-slate-600" />
            </div>
            <div className="space-y-2">
              <Label>Motivo / Averia *</Label>
              <Textarea value={tallerForm.motivo} onChange={e => setTallerForm(p => ({ ...p, motivo: e.target.value }))} placeholder="Describe el motivo del taller..." rows={2} className="dark:bg-slate-900 dark:border-slate-600" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsTallerOpen(false)} className="dark:border-slate-600 dark:text-slate-300">Cancelar</Button>
              <Button onClick={confirmarTaller} className="bg-amber-600 hover:bg-amber-700">Confirmar Taller</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ DIALOG: BAJA (motivo) ============ */}
      <Dialog open={isBajaOpen} onOpenChange={setIsBajaOpen}>
        <DialogContent className="max-w-md dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader><DialogTitle className="dark:text-slate-100 text-red-600">Dar de baja temporal</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">Este vehiculo no podra ser asignado a servicios.</p>
            <div className="space-y-2">
              <Label>Motivo de baja</Label>
              <Textarea value={bajaForm.motivo} onChange={e => setBajaForm(p => ({ ...p, motivo: e.target.value }))} placeholder="Falta documentacion / Decision propia / Venta..." rows={2} className="dark:bg-slate-900 dark:border-slate-600" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsBajaOpen(false)} className="dark:border-slate-600 dark:text-slate-300">Cancelar</Button>
              <Button variant="destructive" onClick={confirmarBaja}>Confirmar Baja</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}