// ============================================
// MILANO - Flota (Rediseñado)
// Cards/List toggle, Stats, Dark mode, Alertas ITV
// ============================================

import { useState, useEffect, useMemo } from 'react';
import { useVehiculosStore, useUIStore } from '../store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Bus, Search, Plus, Edit3, Trash2, Eye, Calendar, AlertTriangle, CheckCircle2,
  Wrench, Fuel, Loader2, Settings, ClipboardList, Euro, X, LayoutGrid, List,
  Gauge, Shield, FileText, Car,
} from 'lucide-react';
import { SkeletonPage } from '../components/LoadingScreen';
import type { Vehiculo, TipoVehiculo, EstadoVehiculo } from '../types';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

const tipoLabels: Record<TipoVehiculo, string> = {
  autobus: 'Autobus', minibus: 'Minibus', furgoneta: 'Furgoneta', coche: 'Coche',
};
const estadoColors: Record<EstadoVehiculo, string> = {
  operativo: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  taller: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  reservado: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  baja: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};
const combustibleLabels: Record<string, string> = {
  diesel: 'Diesel', gasolina: 'Gasolina', electric: 'Electrico', hibrido: 'Hibrido',
};

const fmtDate = (d: string | Date | undefined): string => {
  if (!d) return '-';
  try { const p = typeof d === 'string' ? parseISO(d) : d; return isValid(p) ? format(p, 'dd/MM/yyyy') : '-'; } catch { return '-'; }
};
const diasRestantes = (d: string | Date | undefined): number | null => {
  if (!d) return null;
  try { return differenceInDays(parseISO(d as string), new Date()); } catch { return null; }
};
const toDateVal = (d: string | Date | undefined): string => {
  if (!d) return ''; if (typeof d === 'string') return d; return d.toISOString().split('T')[0];
};

type Mantenimiento = { id: number; tipo: string; fecha: string; kilometraje?: number; descripcion?: string; taller?: string; coste?: number; };
type Averia = { id: number; descripcion: string; fecha_inicio: string; fecha_fin?: string; gravedad: string; estado: string; taller?: string; coste_reparacion?: number; };
type Anotacion = { id: number; tipo: string; fecha: string; contenido: string; conductor_nombre?: string; kilometraje?: number; };

export default function Flota() {
  const { vehiculos, isLoading, addVehiculo, updateVehiculo, deleteVehiculo, fetchVehiculos } = useVehiculosStore();
  const { showToast } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoVehiculo | 'todos'>('todos');
  const [tipoFiltro, setTipoFiltro] = useState<TipoVehiculo | 'todos'>('todos');
  const [vistaMode, setVistaMode] = useState<'cards' | 'lista'>('lista');

  const [vehSel, setVehSel] = useState<Vehiculo | null>(null);
  const [isNuevoOpen, setIsNuevoOpen] = useState(false);
  const [isEditarOpen, setIsEditarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [averias, setAverias] = useState<Averia[]>([]);
  const [anotaciones, setAnotaciones] = useState<Anotacion[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);

  const [showNuevoMant, setShowNuevoMant] = useState(false);
  const [showNuevaAveria, setShowNuevaAveria] = useState(false);
  const [showNuevaAnot, setShowNuevaAnot] = useState(false);

  const [nuevoVeh, setNuevoVeh] = useState<Partial<Vehiculo>>({
    tipo: 'autobus', estado: 'operativo', plazas: 55, combustible: 'diesel', kilometraje: 0,
  });

  useEffect(() => { fetchVehiculos(); }, [fetchVehiculos]);

  useEffect(() => {
    if (vehSel?.id) cargarHistorial(vehSel.id);
  }, [vehSel?.id]);

  const cargarHistorial = async (vehiculoId: string) => {
    setLoadingHist(true);
    try {
      const token = localStorage.getItem('milano_token');
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/vehiculos/${vehiculoId}/historial`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setMantenimientos(data.mantenimientos || []);
        setAverias(data.averias || []);
        setAnotaciones(data.anotaciones || []);
      }
    } catch (err) { console.error('Error historial:', err); }
    finally { setLoadingHist(false); }
  };

  const filtrados = useMemo(() => {
    const sq = searchQuery.toLowerCase().trim();
    return vehiculos.filter(v => {
      const ms = !sq || v.matricula?.toLowerCase().includes(sq) || v.marca?.toLowerCase().includes(sq) || v.modelo?.toLowerCase().includes(sq);
      return ms && (estadoFiltro === 'todos' || v.estado === estadoFiltro) && (tipoFiltro === 'todos' || v.tipo === tipoFiltro);
    });
  }, [vehiculos, searchQuery, estadoFiltro, tipoFiltro]);

  const stats = useMemo(() => ({
    total: vehiculos.length,
    operativos: vehiculos.filter(v => v.estado === 'operativo').length,
    taller: vehiculos.filter(v => v.estado === 'taller').length,
    reservados: vehiculos.filter(v => v.estado === 'reservado').length,
    itvProxima: vehiculos.filter(v => { const d = diasRestantes(v.itv?.fechaProxima); return d !== null && d <= 30; }).length,
    kmTotal: vehiculos.reduce((s, v) => s + (v.kilometraje || 0), 0),
  }), [vehiculos]);

  const itvAlertas = useMemo(() => vehiculos.filter(v => {
    const d = diasRestantes(v.itv?.fechaProxima); return d !== null && d <= 30;
  }), [vehiculos]);

  // Actions
  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoVeh.matricula) { showToast('La matricula es obligatoria', 'error'); return; }
    setIsSubmitting(true);
    try {
      const success = await addVehiculo({ ...nuevoVeh, codigo: `VEH-${Date.now().toString().slice(-5)}` } as any);
      if (success) {
        setIsNuevoOpen(false);
        setNuevoVeh({ tipo: 'autobus', estado: 'operativo', plazas: 55, combustible: 'diesel', kilometraje: 0 });
        showToast('Vehiculo creado', 'success');
      }
    } catch { showToast('Error al crear vehiculo', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const handleActualizar = async () => {
    if (!vehSel) return;
    setIsSubmitting(true);
    try {
      if (await updateVehiculo(String(vehSel.id), vehSel)) {
        setIsEditarOpen(false); showToast('Vehiculo actualizado', 'success'); await fetchVehiculos();
      }
    } catch { showToast('Error al actualizar', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const handleEliminar = async (id: string | number) => {
    if (!window.confirm('Eliminar este vehiculo?')) return;
    try { if (await deleteVehiculo(String(id))) { showToast('Vehiculo eliminado', 'success'); setVehSel(null); } }
    catch { showToast('Error al eliminar', 'error'); }
  };

  const postHistorial = async (endpoint: string, body: any) => {
    if (!vehSel) return false;
    try {
      const token = localStorage.getItem('milano_token');
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/vehiculos/${vehSel.id}${endpoint}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) { cargarHistorial(vehSel.id); return true; }
    } catch { /* ignore */ }
    return false;
  };

  const handleCrearMant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (await postHistorial('/mantenimientos', {
      tipo: fd.get('tipo'), fecha: fd.get('fecha'),
      kilometraje: parseInt(fd.get('kilometraje') as string) || undefined,
      descripcion: fd.get('descripcion'), taller: fd.get('taller'),
      coste: parseFloat(fd.get('coste') as string) || undefined,
    })) { setShowNuevoMant(false); showToast('Mantenimiento registrado', 'success'); }
    else showToast('Error al registrar', 'error');
  };

  const handleCrearAveria = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (await postHistorial('/averias', { descripcion: fd.get('descripcion'), gravedad: fd.get('gravedad'), estado: 'reportada' })) {
      setShowNuevaAveria(false); showToast('Averia reportada', 'success');
    } else showToast('Error al reportar', 'error');
  };

  const handleCrearAnot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (await postHistorial('/anotaciones', { tipo: fd.get('tipo'), contenido: fd.get('contenido'), kilometraje: parseInt(fd.get('kilometraje') as string) || undefined })) {
      setShowNuevaAnot(false); showToast('Anotacion creada', 'success');
    } else showToast('Error al crear', 'error');
  };

  // ===== Loading =====
  if (isLoading && vehiculos.length === 0) {
    return <SkeletonPage type="mixed" tableCols={8} vistaMode={vistaMode} />;
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Flota</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Gestion de vehiculos y mantenimiento</p>
        </div>
        <Button onClick={() => setIsNuevoOpen(true)} className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600 dark:hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Vehiculo
        </Button>
      </div>

      {/* ===== ALERTA ITV ===== */}
      {itvAlertas.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
              {`${itvAlertas.length} vehiculo${itvAlertas.length > 1 ? 's' : ''} con ITV proxima a vencer`}
            </p>
          </div>
        </div>
      )}

      {/* ===== STATS ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Bus, color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' },
          { label: 'Operativos', value: stats.operativos, icon: CheckCircle2, color: 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400' },
          { label: 'En Taller', value: stats.taller, icon: Wrench, color: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' },
          { label: 'KM Totales', value: `${(stats.kmTotal / 1000).toFixed(0)}k`, icon: Gauge, color: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center gap-3">
            <div className={`rounded-lg p-2.5 ${s.color}`}><s.icon className="h-5 w-5" /></div>
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{s.value}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ===== FILTROS ===== */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar vehiculo..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 dark:bg-slate-900 dark:border-slate-700" />
        </div>
        <div className="flex gap-2">
          <Select value={estadoFiltro} onValueChange={v => setEstadoFiltro(v as EstadoVehiculo | 'todos')}>
            <SelectTrigger className="w-[130px] dark:bg-slate-900 dark:border-slate-700"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="operativo">Operativo</SelectItem>
              <SelectItem value="taller">En Taller</SelectItem>
              <SelectItem value="reservado">Reservado</SelectItem>
              <SelectItem value="baja">De Baja</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tipoFiltro} onValueChange={v => setTipoFiltro(v as TipoVehiculo | 'todos')}>
            <SelectTrigger className="w-[130px] dark:bg-slate-900 dark:border-slate-700"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="autobus">Autobus</SelectItem>
              <SelectItem value="minibus">Minibus</SelectItem>
              <SelectItem value="furgoneta">Furgoneta</SelectItem>
              <SelectItem value="coche">Coche</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex border rounded-lg overflow-hidden dark:border-slate-700">
            <button onClick={() => setVistaMode('cards')}
              className={`p-2 ${vistaMode === 'cards' ? 'bg-[#1e3a5f] text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}>
              <LayoutGrid className="h-4 w-4" /></button>
            <button onClick={() => setVistaMode('lista')}
              className={`p-2 ${vistaMode === 'lista' ? 'bg-[#1e3a5f] text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}>
              <List className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* ===== LISTA ===== */}
      {vistaMode === 'lista' ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Matricula</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Vehiculo</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Tipo</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Plazas</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Kilometraje</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">ITV</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtrados.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-400 dark:text-slate-500">
                    <Bus className="h-10 w-10 mx-auto mb-2" /><p className="text-sm">No se encontraron vehiculos</p>
                  </td></tr>
                ) : filtrados.map(v => {
                  const dv = diasRestantes(v.itv?.fechaProxima);
                  return (
                    <tr key={v.id} onClick={() => setVehSel(v)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-mono font-medium dark:text-slate-200">{v.matricula}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium dark:text-slate-200">{`${v.marca || ''} ${v.modelo || ''}`}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{`Bastidor: ${v.bastidor || '-'}`}</p>
                      </td>
                      <td className="px-4 py-3"><Badge variant="outline" className="dark:border-slate-600 dark:text-slate-400">{tipoLabels[v.tipo]}</Badge></td>
                      <td className="px-4 py-3 dark:text-slate-300">{v.plazas || '-'}</td>
                      <td className="px-4 py-3 dark:text-slate-300">{`${(v.kilometraje || 0).toLocaleString('es-ES')} km`}</td>
                      <td className="px-4 py-3">
                        <span className={dv !== null && dv <= 30 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-slate-500 dark:text-slate-400'}>
                          {fmtDate(v.itv?.fechaProxima)}
                        </span>
                        {dv !== null && dv <= 30 && <span className="block text-xs text-red-600 dark:text-red-400">{`${dv} dias`}</span>}
                      </td>
                      <td className="px-4 py-3"><Badge className={estadoColors[v.estado]}>{v.estado}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setVehSel(v)}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setVehSel(v); setIsEditarOpen(true); }}><Edit3 className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => handleEliminar(v.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ===== CARDS ===== */
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.length === 0 ? (
            <div className="col-span-full flex flex-col items-center py-16 text-slate-400 dark:text-slate-500">
              <Bus className="h-12 w-12 mb-3" /><p className="text-sm">No se encontraron vehiculos</p>
            </div>
          ) : filtrados.map(v => {
            const dv = diasRestantes(v.itv?.fechaProxima);
            return (
              <div key={v.id} onClick={() => setVehSel(v)}
                className={`rounded-xl border p-5 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5 ${
                  dv !== null && dv <= 30 ? 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#1e3a5f] dark:bg-blue-600 flex items-center justify-center text-white">
                      <Bus className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100">{v.matricula}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{`${v.marca || ''} ${v.modelo || ''}`}</p>
                    </div>
                  </div>
                  <Badge className={estadoColors[v.estado]}>{v.estado}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                  <div><p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Tipo</p><p className="dark:text-slate-300">{tipoLabels[v.tipo]}</p></div>
                  <div><p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Plazas</p><p className="dark:text-slate-300">{v.plazas || '-'}</p></div>
                  <div><p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">KM</p><p className="dark:text-slate-300">{`${(v.kilometraje || 0).toLocaleString('es-ES')}`}</p></div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span className={dv !== null && dv <= 30 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-slate-500 dark:text-slate-400'}>
                      {`ITV: ${fmtDate(v.itv?.fechaProxima)}`}
                    </span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setVehSel(v)}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setVehSel(v); setIsEditarOpen(true); }}><Edit3 className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => handleEliminar(v.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                {dv !== null && dv <= 30 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">{`ITV vence en ${dv} dias`}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ===== DIALOG: NUEVO VEHICULO ===== */}
      <Dialog open={isNuevoOpen} onOpenChange={setIsNuevoOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">Nuevo Vehiculo</DialogTitle>
            <DialogDescription className="dark:text-slate-400">Complete la informacion del vehiculo</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCrear} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Matricula *</Label>
                <Input value={nuevoVeh.matricula || ''} onChange={e => setNuevoVeh({ ...nuevoVeh, matricula: e.target.value.toUpperCase() })}
                  placeholder="1234-ABC" required className="dark:bg-slate-900 dark:border-slate-600" />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Bastidor</Label>
                <Input value={nuevoVeh.bastidor || ''} onChange={e => setNuevoVeh({ ...nuevoVeh, bastidor: e.target.value.toUpperCase() })}
                  placeholder="WVWZZZ..." className="dark:bg-slate-900 dark:border-slate-600" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Marca</Label>
                <Input value={nuevoVeh.marca || ''} onChange={e => setNuevoVeh({ ...nuevoVeh, marca: e.target.value })}
                  placeholder="Mercedes-Benz" className="dark:bg-slate-900 dark:border-slate-600" />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Modelo</Label>
                <Input value={nuevoVeh.modelo || ''} onChange={e => setNuevoVeh({ ...nuevoVeh, modelo: e.target.value })}
                  placeholder="Tourismo" className="dark:bg-slate-900 dark:border-slate-600" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Tipo</Label>
                <Select value={nuevoVeh.tipo} onValueChange={v => setNuevoVeh({ ...nuevoVeh, tipo: v as TipoVehiculo })}>
                  <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="autobus">Autobus</SelectItem><SelectItem value="minibus">Minibus</SelectItem>
                    <SelectItem value="furgoneta">Furgoneta</SelectItem><SelectItem value="coche">Coche</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Plazas</Label>
                <Input type="number" value={nuevoVeh.plazas} onChange={e => setNuevoVeh({ ...nuevoVeh, plazas: parseInt(e.target.value) || 0 })}
                  className="dark:bg-slate-900 dark:border-slate-600" />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Ano Fabricacion</Label>
                <Input type="number" value={nuevoVeh.añoFabricacion || ''} onChange={e => setNuevoVeh({ ...nuevoVeh, añoFabricacion: parseInt(e.target.value) })}
                  className="dark:bg-slate-900 dark:border-slate-600" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Kilometraje</Label>
                <Input type="number" value={nuevoVeh.kilometraje} onChange={e => setNuevoVeh({ ...nuevoVeh, kilometraje: parseInt(e.target.value) || 0 })}
                  className="dark:bg-slate-900 dark:border-slate-600" />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Combustible</Label>
                <Select value={nuevoVeh.combustible} onValueChange={v => setNuevoVeh({ ...nuevoVeh, combustible: v as any })}>
                  <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diesel">Diesel</SelectItem><SelectItem value="gasolina">Gasolina</SelectItem>
                    <SelectItem value="electric">Electrico</SelectItem><SelectItem value="hibrido">Hibrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNuevoOpen(false)}
                className="dark:border-slate-600 dark:text-slate-300">Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600">
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando...</> : 'Crear Vehiculo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: DETALLE CON TABS ===== */}
      <Dialog open={!!vehSel && !isEditarOpen} onOpenChange={() => { setVehSel(null); setActiveTab('info'); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
          {vehSel && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 dark:text-slate-100">
                  <div className="w-10 h-10 rounded-lg bg-[#1e3a5f] dark:bg-blue-600 flex items-center justify-center text-white">
                    <Bus className="h-5 w-5" />
                  </div>
                  <div>
                    {`${vehSel.marca || ''} ${vehSel.modelo || ''}`}
                    <p className="text-sm font-normal text-slate-500 dark:text-slate-400">{`${vehSel.matricula} · ${tipoLabels[vehSel.tipo]}`}</p>
                  </div>
                  <Badge className={estadoColors[vehSel.estado]}>{vehSel.estado}</Badge>
                </DialogTitle>
              </DialogHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                <TabsList className="grid w-full grid-cols-5 dark:bg-slate-900">
                  <TabsTrigger value="info" className="dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100">Informacion</TabsTrigger>
                  <TabsTrigger value="mantenimiento" className="dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100">Mantenimiento</TabsTrigger>
                  <TabsTrigger value="averias" className="dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100">Averias</TabsTrigger>
                  <TabsTrigger value="anotaciones" className="dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100">Anotaciones</TabsTrigger>
                  <TabsTrigger value="doc" className="dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100">Documentacion</TabsTrigger>
                </TabsList>

                {/* TAB INFO */}
                <TabsContent value="info" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                      <h4 className="font-medium flex items-center gap-2 dark:text-slate-200"><Bus className="h-4 w-4" /> Datos del Vehiculo</h4>
                      {[
                        { l: 'Tipo', v: tipoLabels[vehSel.tipo] },
                        { l: 'Plazas', v: String(vehSel.plazas || '-') },
                        { l: 'Ano', v: String(vehSel.añoFabricacion || '-') },
                        { l: 'KM', v: `${(vehSel.kilometraje || 0).toLocaleString('es-ES')} km` },
                        { l: 'Combustible', v: combustibleLabels[vehSel.combustible || ''] || vehSel.combustible || '-' },
                        { l: 'Bastidor', v: vehSel.bastidor || '-' },
                      ].map(item => (
                        <div key={item.l} className="flex justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400">{item.l}</span>
                          <span className="dark:text-slate-200">{item.v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                      <h4 className="font-medium flex items-center gap-2 dark:text-slate-200"><Calendar className="h-4 w-4" /> Documentacion</h4>
                      {[
                        { l: 'ITV Proxima', v: fmtDate(vehSel.itv?.fechaProxima), alert: diasRestantes(vehSel.itv?.fechaProxima) !== null && diasRestantes(vehSel.itv?.fechaProxima)! <= 30 },
                        { l: 'Seguro Vence', v: fmtDate(vehSel.seguro?.fechaVencimiento) },
                        { l: 'Compania', v: vehSel.seguro?.compania || '-' },
                        { l: 'Poliza', v: vehSel.seguro?.poliza || '-' },
                      ].map(item => (
                        <div key={item.l} className="flex justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400">{item.l}</span>
                          <span className={item.alert ? 'text-red-600 dark:text-red-400 font-medium' : 'dark:text-slate-200'}>{item.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button onClick={() => setIsEditarOpen(true)} className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600">
                    <Edit3 className="mr-2 h-4 w-4" />Editar Vehiculo
                  </Button>
                </TabsContent>

                {/* TAB MANTENIMIENTO */}
                <TabsContent value="mantenimiento" className="space-y-4 pt-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium flex items-center gap-2 dark:text-slate-200"><Settings className="h-4 w-4" /> Historial</h4>
                    <Button size="sm" onClick={() => setShowNuevoMant(true)} className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600">
                      <Plus className="mr-1 h-3 w-3" />Anadir
                    </Button>
                  </div>
                  {loadingHist ? (
                    <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" /></div>
                  ) : mantenimientos.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                      <Settings className="mx-auto mb-2 h-8 w-8" /><p className="text-sm">Sin registros de mantenimiento</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {mantenimientos.map(m => (
                        <div key={m.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 dark:bg-slate-700/30">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="dark:border-slate-600">{m.tipo}</Badge>
                                <span className="text-xs text-slate-500 dark:text-slate-400">{fmtDate(m.fecha)}</span>
                              </div>
                              <p className="text-sm mt-1 dark:text-slate-300">{m.descripcion}</p>
                              {m.taller && <p className="text-xs text-slate-500 dark:text-slate-400">{`Taller: ${m.taller}`}</p>}
                            </div>
                            <div className="text-right">
                              {m.coste && <p className="font-medium dark:text-slate-200">{`${m.coste.toFixed(2)} EUR`}</p>}
                              {m.kilometraje && <p className="text-xs text-slate-500 dark:text-slate-400">{`${m.kilometraje.toLocaleString()} km`}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* TAB AVERIAS */}
                <TabsContent value="averias" className="space-y-4 pt-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium flex items-center gap-2 dark:text-slate-200"><AlertTriangle className="h-4 w-4" /> Averias</h4>
                    <Button size="sm" onClick={() => setShowNuevaAveria(true)} className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600">
                      <Plus className="mr-1 h-3 w-3" />Reportar
                    </Button>
                  </div>
                  {loadingHist ? (
                    <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" /></div>
                  ) : averias.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                      <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-500" /><p className="text-sm">Sin averias registradas</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {averias.map(a => (
                        <div key={a.id} className={`rounded-lg border p-3 ${a.estado === 'resuelta' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge className={a.gravedad === 'critica' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : a.gravedad === 'grave' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'}>
                                  {a.gravedad}
                                </Badge>
                                <span className="text-xs text-slate-500 dark:text-slate-400">{fmtDate(a.fecha_inicio)}</span>
                              </div>
                              <p className="text-sm mt-1 dark:text-slate-300">{a.descripcion}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant={a.estado === 'resuelta' ? 'default' : 'secondary'}>{a.estado}</Badge>
                              {a.coste_reparacion && <p className="text-sm font-medium mt-1 dark:text-slate-200">{`${a.coste_reparacion.toFixed(2)} EUR`}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* TAB ANOTACIONES */}
                <TabsContent value="anotaciones" className="space-y-4 pt-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium flex items-center gap-2 dark:text-slate-200"><ClipboardList className="h-4 w-4" /> Anotaciones</h4>
                    <Button size="sm" onClick={() => setShowNuevaAnot(true)} className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600">
                      <Plus className="mr-1 h-3 w-3" />Anadir
                    </Button>
                  </div>
                  {loadingHist ? (
                    <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" /></div>
                  ) : anotaciones.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                      <ClipboardList className="mx-auto mb-2 h-8 w-8" /><p className="text-sm">Sin anotaciones</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {anotaciones.map(a => (
                        <div key={a.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 dark:bg-slate-700/30">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="dark:border-slate-600">{a.tipo}</Badge>
                                <span className="text-xs text-slate-500 dark:text-slate-400">{fmtDate(a.fecha)}</span>
                              </div>
                              <p className="text-sm mt-1 dark:text-slate-300">{a.contenido}</p>
                              {a.conductor_nombre && <p className="text-xs text-slate-500 dark:text-slate-400">{`Por: ${a.conductor_nombre}`}</p>}
                            </div>
                            {a.kilometraje && <span className="text-xs text-slate-500 dark:text-slate-400">{`${a.kilometraje.toLocaleString()} km`}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* TAB DOCUMENTACION */}
                <TabsContent value="doc" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                      <h4 className="font-medium flex items-center gap-2 dark:text-slate-200"><Shield className="h-4 w-4" /> ITV</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Proxima ITV</span>
                          <span className={diasRestantes(vehSel.itv?.fechaProxima)! <= 30 ? 'text-red-600 dark:text-red-400 font-medium' : 'dark:text-slate-200'}>
                            {fmtDate(vehSel.itv?.fechaProxima)}
                          </span>
                        </div>
                        {diasRestantes(vehSel.itv?.fechaProxima) !== null && (
                          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Dias restantes</span>
                            <span className={diasRestantes(vehSel.itv?.fechaProxima)! <= 30 ? 'text-red-600 dark:text-red-400 font-medium' : 'dark:text-slate-200'}>
                              {`${diasRestantes(vehSel.itv?.fechaProxima)} dias`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                      <h4 className="font-medium flex items-center gap-2 dark:text-slate-200"><FileText className="h-4 w-4" /> Seguro</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Compania</span><span className="dark:text-slate-200">{vehSel.seguro?.compania || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Poliza</span><span className="dark:text-slate-200">{vehSel.seguro?.poliza || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Vencimiento</span><span className="dark:text-slate-200">{fmtDate(vehSel.seguro?.fechaVencimiento)}</span></div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: EDITAR ===== */}
      <Dialog open={isEditarOpen} onOpenChange={setIsEditarOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">Editar Vehiculo</DialogTitle>
          </DialogHeader>
          {vehSel && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Matricula</Label>
                  <Input value={vehSel.matricula} onChange={e => setVehSel({ ...vehSel, matricula: e.target.value.toUpperCase() })}
                    className="dark:bg-slate-900 dark:border-slate-600" />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Bastidor</Label>
                  <Input value={vehSel.bastidor || ''} onChange={e => setVehSel({ ...vehSel, bastidor: e.target.value.toUpperCase() })}
                    className="dark:bg-slate-900 dark:border-slate-600" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Marca</Label>
                  <Input value={vehSel.marca || ''} onChange={e => setVehSel({ ...vehSel, marca: e.target.value })}
                    className="dark:bg-slate-900 dark:border-slate-600" />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Modelo</Label>
                  <Input value={vehSel.modelo || ''} onChange={e => setVehSel({ ...vehSel, modelo: e.target.value })}
                    className="dark:bg-slate-900 dark:border-slate-600" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Tipo</Label>
                  <Select value={vehSel.tipo} onValueChange={v => setVehSel({ ...vehSel, tipo: v as TipoVehiculo })}>
                    <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="autobus">Autobus</SelectItem><SelectItem value="minibus">Minibus</SelectItem>
                      <SelectItem value="furgoneta">Furgoneta</SelectItem><SelectItem value="coche">Coche</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Estado</Label>
                  <Select value={vehSel.estado} onValueChange={v => setVehSel({ ...vehSel, estado: v as EstadoVehiculo })}>
                    <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operativo">Operativo</SelectItem><SelectItem value="taller">En Taller</SelectItem>
                      <SelectItem value="reservado">Reservado</SelectItem><SelectItem value="baja">De Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Kilometraje</Label>
                  <Input type="number" value={vehSel.kilometraje || 0} onChange={e => setVehSel({ ...vehSel, kilometraje: parseInt(e.target.value) || 0 })}
                    className="dark:bg-slate-900 dark:border-slate-600" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">ITV Fecha Proxima</Label>
                  <Input type="date" value={toDateVal(vehSel.itv?.fechaProxima)}
                    onChange={e => setVehSel({ ...vehSel, itv: { ...(vehSel.itv || {}), fechaProxima: e.target.value } })}
                    className="dark:bg-slate-900 dark:border-slate-600" />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Seguro Vencimiento</Label>
                  <Input type="date" value={toDateVal(vehSel.seguro?.fechaVencimiento)}
                    onChange={e => setVehSel({ ...vehSel, seguro: { ...(vehSel.seguro || {}), fechaVencimiento: e.target.value } })}
                    className="dark:bg-slate-900 dark:border-slate-600" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Compania Seguro</Label>
                  <Input value={vehSel.seguro?.compania || ''}
                    onChange={e => setVehSel({ ...vehSel, seguro: { ...(vehSel.seguro || {}), compania: e.target.value } })}
                    className="dark:bg-slate-900 dark:border-slate-600" />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">N Poliza</Label>
                  <Input value={vehSel.seguro?.poliza || ''}
                    onChange={e => setVehSel({ ...vehSel, seguro: { ...(vehSel.seguro || {}), poliza: e.target.value } })}
                    className="dark:bg-slate-900 dark:border-slate-600" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditarOpen(false)}
                  className="dark:border-slate-600 dark:text-slate-300">Cancelar</Button>
                <Button onClick={handleActualizar} disabled={isSubmitting} className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600">
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : 'Guardar Cambios'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: NUEVO MANTENIMIENTO ===== */}
      <Dialog open={showNuevoMant} onOpenChange={setShowNuevoMant}>
        <DialogContent className="max-w-lg dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">Nuevo Mantenimiento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCrearMant} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Tipo *</Label>
                <Select name="tipo" required>
                  <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue placeholder="Seleccione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventivo">Preventivo</SelectItem><SelectItem value="correctivo">Correctivo</SelectItem>
                    <SelectItem value="itv">ITV</SelectItem><SelectItem value="neumaticos">Neumaticos</SelectItem>
                    <SelectItem value="aceite">Cambio Aceite</SelectItem><SelectItem value="frenos">Frenos</SelectItem><SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Fecha *</Label>
                <Input type="date" name="fecha" required defaultValue={new Date().toISOString().split('T')[0]}
                  className="dark:bg-slate-900 dark:border-slate-600" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Kilometraje</Label>
                <Input type="number" name="kilometraje" placeholder={vehSel?.kilometraje?.toString()}
                  className="dark:bg-slate-900 dark:border-slate-600" />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Coste (EUR)</Label>
                <Input type="number" step="0.01" name="coste" placeholder="0.00"
                  className="dark:bg-slate-900 dark:border-slate-600" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="dark:text-slate-300">Taller</Label>
              <Input name="taller" placeholder="Nombre del taller" className="dark:bg-slate-900 dark:border-slate-600" />
            </div>
            <div className="space-y-2">
              <Label className="dark:text-slate-300">Descripcion</Label>
              <Textarea name="descripcion" placeholder="Trabajos realizados..." rows={3}
                className="dark:bg-slate-900 dark:border-slate-600" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNuevoMant(false)}
                className="dark:border-slate-600 dark:text-slate-300">Cancelar</Button>
              <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600">Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: NUEVA AVERIA ===== */}
      <Dialog open={showNuevaAveria} onOpenChange={setShowNuevaAveria}>
        <DialogContent className="max-w-lg dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">Reportar Averia</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCrearAveria} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="dark:text-slate-300">Gravedad *</Label>
              <Select name="gravedad" required>
                <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue placeholder="Seleccione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="leve">Leve</SelectItem><SelectItem value="media">Media</SelectItem>
                  <SelectItem value="grave">Grave</SelectItem><SelectItem value="critica">Critica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="dark:text-slate-300">Descripcion *</Label>
              <Textarea name="descripcion" required placeholder="Describa el fallo..." rows={3}
                className="dark:bg-slate-900 dark:border-slate-600" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNuevaAveria(false)}
                className="dark:border-slate-600 dark:text-slate-300">Cancelar</Button>
              <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600">Reportar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: NUEVA ANOTACION ===== */}
      <Dialog open={showNuevaAnot} onOpenChange={setShowNuevaAnot}>
        <DialogContent className="max-w-lg dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">Nueva Anotacion</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCrearAnot} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Tipo *</Label>
                <Select name="tipo" required>
                  <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue placeholder="Seleccione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="limpieza">Limpieza</SelectItem><SelectItem value="revision">Revision</SelectItem>
                    <SelectItem value="dano">Dano</SelectItem><SelectItem value="observacion">Observacion</SelectItem><SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Kilometraje</Label>
                <Input type="number" name="kilometraje" placeholder={vehSel?.kilometraje?.toString()}
                  className="dark:bg-slate-900 dark:border-slate-600" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="dark:text-slate-300">Contenido *</Label>
              <Textarea name="contenido" required placeholder="Escriba la anotacion..." rows={3}
                className="dark:bg-slate-900 dark:border-slate-600" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNuevaAnot(false)}
                className="dark:border-slate-600 dark:text-slate-300">Cancelar</Button>
              <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600">Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
