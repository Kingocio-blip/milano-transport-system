// ============================================
// MILANO - Flota Page (COMPLETO CON HISTORIAL)
// ============================================

import { useState, useEffect, useMemo } from 'react';
import { useVehiculosStore, useUIStore } from '../store';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import {
  Bus, Search, Plus, Edit, Trash2, Eye, Calendar, AlertTriangle, CheckCircle2,
  Wrench, Gauge, Fuel, Users, Loader2, FileText, Settings, ClipboardList,
  Upload, Euro, AlertCircle, X
} from 'lucide-react';
import type { Vehiculo, TipoVehiculo, EstadoVehiculo } from '../types';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';

const tipoVehiculoLabels: Record<TipoVehiculo, string> = {
  autobus: 'Autobús', minibus: 'Minibús', furgoneta: 'Furgoneta', coche: 'Coche',
};

const estadoVehiculoColors: Record<EstadoVehiculo, string> = {
  operativo: 'bg-green-100 text-green-700', taller: 'bg-amber-100 text-amber-700',
  reservado: 'bg-purple-100 text-purple-700', baja: 'bg-red-100 text-red-700',
};

const formatDateSafe = (date: string | Date | undefined): string => {
  if (!date) return '-';
  try {
    const parsed = typeof date === 'string' ? parseISO(date) : date;
    return isValid(parsed) ? format(parsed, 'dd/MM/yyyy') : '-';
  } catch { return '-'; }
};

const getDiasRestantes = (date: string | Date | undefined): number | null => {
  if (!date) return null;
  try {
    const target = typeof date === 'string' ? parseISO(date) : date;
    return differenceInDays(target, new Date());
  } catch { return null; }
};

type Mantenimiento = { 
  id: number; tipo: string; fecha: string; kilometraje?: number; 
  descripcion?: string; taller?: string; coste?: number; realizado_por?: string;
};

type Averia = { 
  id: number; descripcion: string; fecha_inicio: string; fecha_fin?: string; 
  gravedad: string; estado: string; taller?: string; coste_reparacion?: number; 
  diagnostico?: string; solucion?: string;
};

type Anotacion = { 
  id: number; tipo: string; fecha: string; contenido: string; 
  conductor_nombre?: string; kilometraje?: number; 
};

type Gasto = { 
  id: number; concepto: string; fecha: string; importe: number; 
  tipo: string; archivo_url?: string; 
};

export default function Flota() {
  const { vehiculos, isLoading, addVehiculo, updateVehiculo, deleteVehiculo, fetchVehiculos } = useVehiculosStore();
  const { showToast } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoVehiculo | 'todos'>('todos');
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<Vehiculo | null>(null);
  const [isNuevoOpen, setIsNuevoOpen] = useState(false);
  const [isEditarOpen, setIsEditarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [averias, setAverias] = useState<Averia[]>([]);
  const [anotaciones, setAnotaciones] = useState<Anotacion[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const [showNuevoMantenimiento, setShowNuevoMantenimiento] = useState(false);
  const [showNuevaAveria, setShowNuevaAveria] = useState(false);
  const [showNuevaAnotacion, setShowNuevaAnotacion] = useState(false);
  const [showNuevoGasto, setShowNuevoGasto] = useState(false);

  const [nuevoVehiculo, setNuevoVehiculo] = useState<Partial<Vehiculo>>({
    tipo: 'autobus', estado: 'operativo', plazas: 55, combustible: 'diesel', kilometraje: 0
  });

  useEffect(() => { fetchVehiculos(); }, [fetchVehiculos]);

  useEffect(() => {
    if (vehiculoSeleccionado?.id) {
      cargarHistorial(vehiculoSeleccionado.id);
    }
  }, [vehiculoSeleccionado?.id]);

  const cargarHistorial = async (vehiculoId: string) => {  // ← cambia number a string
    setLoadingHistorial(true);
    try {
      const token = localStorage.getItem('milano_token');
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/vehiculos/${vehiculoId}/historial`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMantenimientos(data.mantenimientos || []);
        setAverias(data.averias || []);
        setAnotaciones(data.anotaciones || []);
      }
    } catch (err) {
      console.error('Error cargando historial:', err);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const vehiculosFiltrados = useMemo(() => {
    return vehiculos.filter(v => {
      const matchesSearch = !searchQuery ||
        v.matricula?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.marca?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.modelo?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesEstado = estadoFiltro === 'todos' || v.estado === estadoFiltro;
      return matchesSearch && matchesEstado;
    });
  }, [vehiculos, searchQuery, estadoFiltro]);

  const stats = useMemo(() => ({
    operativos: vehiculos.filter(v => v.estado === 'operativo').length,
    taller: vehiculos.filter(v => v.estado === 'taller').length,
    reservados: vehiculos.filter(v => v.estado === 'reservado').length,
    itvProxima: vehiculos.filter(v => {
      const dias = getDiasRestantes(v.itv?.fechaProxima);  // ← Así
      return dias !== null && dias <= 30;
    }).length,
  }), [vehiculos]);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoVehiculo.matricula) {
      showToast('La matrícula es obligatoria', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const vehiculoData = { ...nuevoVehiculo, codigo: `VEH-${Date.now().toString().slice(-5)}` };
      const success = await addVehiculo(vehiculoData as any);
      if (success) {
        setIsNuevoOpen(false);
        setNuevoVehiculo({ tipo: 'autobus', estado: 'operativo', plazas: 55, combustible: 'diesel', kilometraje: 0 });
        showToast('Vehículo creado', 'success');
      }
    } catch (err) {
      showToast('Error al crear vehículo', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActualizar = async () => {
    if (!vehiculoSeleccionado) return;
    setIsSubmitting(true);
    try {
      const success = await updateVehiculo(String(vehiculoSeleccionado.id), vehiculoSeleccionado);
      if (success) {
        setIsEditarOpen(false);
        showToast('Vehículo actualizado', 'success');
        await fetchVehiculos();
      }
    } catch (err) {
      showToast('Error al actualizar', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEliminar = async (id: string | number) => {
    if (!window.confirm('¿Eliminar este vehículo?')) return;
    try {
      const success = await deleteVehiculo(String(id));
      if (success) {
        showToast('Vehículo eliminado', 'success');
        setVehiculoSeleccionado(null);
      }
    } catch (err) {
      showToast('Error al eliminar', 'error');
    }
  };

  const handleCrearMantenimiento = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!vehiculoSeleccionado) return;
    const formData = new FormData(e.currentTarget);
    
    try {
      const token = localStorage.getItem('milano_token');
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/vehiculos/${vehiculoSeleccionado.id}/mantenimientos`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tipo: formData.get('tipo'),
          fecha: formData.get('fecha'),
          kilometraje: parseInt(formData.get('kilometraje') as string) || undefined,
          descripcion: formData.get('descripcion'),
          taller: formData.get('taller'),
          coste: parseFloat(formData.get('coste') as string) || undefined,
        })
      });
      if (response.ok) {
        setShowNuevoMantenimiento(false);
        showToast('Mantenimiento registrado', 'success');
        cargarHistorial(vehiculoSeleccionado.id);
      }
    } catch (err) {
      showToast('Error al registrar', 'error');
    }
  };

  const handleCrearAveria = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!vehiculoSeleccionado) return;
    const formData = new FormData(e.currentTarget);
    
    try {
      const token = localStorage.getItem('milano_token');
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/vehiculos/${vehiculoSeleccionado.id}/averias`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          descripcion: formData.get('descripcion'),
          gravedad: formData.get('gravedad'),
          estado: 'reportada',
        })
      });
      if (response.ok) {
        setShowNuevaAveria(false);
        showToast('Avería reportada', 'success');
        cargarHistorial(vehiculoSeleccionado.id);
      }
    } catch (err) {
      showToast('Error al reportar', 'error');
    }
  };

  const handleCrearAnotacion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!vehiculoSeleccionado) return;
    const formData = new FormData(e.currentTarget);
    
    try {
      const token = localStorage.getItem('milano_token');
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/vehiculos/${vehiculoSeleccionado.id}/anotaciones`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tipo: formData.get('tipo'),
          contenido: formData.get('contenido'),
          kilometraje: parseInt(formData.get('kilometraje') as string) || undefined,
        })
      });
      if (response.ok) {
        setShowNuevaAnotacion(false);
        showToast('Anotación creada', 'success');
        cargarHistorial(vehiculoSeleccionado.id);
      }
    } catch (err) {
      showToast('Error al crear anotación', 'error');
    }
  };

  if (isLoading && vehiculos.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-12 w-12 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Flota</h1>
          <p className="text-slate-500">Gestión de vehículos y mantenimiento</p>
        </div>
        <Button onClick={() => setIsNuevoOpen(true)} className="bg-[#1e3a5f] hover:bg-[#152a45]">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Vehículo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-6">
          <div className="flex justify-between">
            <div><p className="text-sm text-slate-500">Operativos</p><p className="text-3xl font-bold">{stats.operativos}</p></div>
            <div className="rounded-full bg-green-100 p-3"><CheckCircle2 className="h-6 w-6 text-green-600"/></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <div className="flex justify-between">
            <div><p className="text-sm text-slate-500">En Taller</p><p className="text-3xl font-bold">{stats.taller}</p></div>
            <div className="rounded-full bg-amber-100 p-3"><Wrench className="h-6 w-6 text-amber-600"/></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <div className="flex justify-between">
            <div><p className="text-sm text-slate-500">Reservados</p><p className="text-3xl font-bold">{stats.reservados}</p></div>
            <div className="rounded-full bg-purple-100 p-3"><Bus className="h-6 w-6 text-purple-600"/></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <div className="flex justify-between">
            <div><p className="text-sm text-slate-500">ITV Próxima</p><p className="text-3xl font-bold">{stats.itvProxima}</p></div>
            <div className="rounded-full bg-red-100 p-3"><AlertTriangle className="h-6 w-6 text-red-600"/></div>
          </div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={estadoFiltro} onValueChange={(v) => setEstadoFiltro(v as EstadoVehiculo | 'todos')}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="operativo">Operativo</SelectItem>
            <SelectItem value="taller">En Taller</SelectItem>
            <SelectItem value="reservado">Reservado</SelectItem>
            <SelectItem value="baja">De Baja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matrícula</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Kilometraje</TableHead>
                <TableHead>ITV</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehiculosFiltrados.map((v) => (
                <TableRow key={v.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setVehiculoSeleccionado(v)}>
                  <TableCell className="font-medium">{v.matricula}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{v.marca} {v.modelo}</p>
                      <p className="text-xs text-slate-500">Bastidor: {v.bastidor || '-'}</p>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{tipoVehiculoLabels[v.tipo]}</Badge></TableCell>
                  <TableCell>{(v.kilometraje || 0).toLocaleString('es-ES')} km</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{formatDateSafe(v.itv_fecha_proxima)}</span>
                      {(() => {
                        const dias = getDiasRestantes(v.itv_fecha_proxima);
                        return dias !== null && dias <= 30 ? <span className="text-xs text-red-600 font-medium">{dias} días</span> : null;
                      })()}
                    </div>
                  </TableCell>
                  <TableCell><Badge className={estadoVehiculoColors[v.estado]}>{v.estado}</Badge></TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setVehiculoSeleccionado(v)} title="Ver"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setVehiculoSeleccionado(v); setIsEditarOpen(true); }} title="Editar"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEliminar(v.id)} title="Eliminar" className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Nuevo Vehículo */}
      <Dialog open={isNuevoOpen} onOpenChange={setIsNuevoOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Vehículo</DialogTitle>
            <DialogDescription>Complete la información del vehículo</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCrear} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Matrícula *</Label>
                <Input value={nuevoVehiculo.matricula || ''} onChange={(e) => setNuevoVehiculo({...nuevoVehiculo, matricula: e.target.value.toUpperCase()})} placeholder="1234-ABC" required />
              </div>
              <div className="space-y-2">
                <Label>Bastidor</Label>
                <Input value={nuevoVehiculo.bastidor || ''} onChange={(e) => setNuevoVehiculo({...nuevoVehiculo, bastidor: e.target.value.toUpperCase()})} placeholder="WVWZZZ..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input value={nuevoVehiculo.marca || ''} onChange={(e) => setNuevoVehiculo({...nuevoVehiculo, marca: e.target.value})} placeholder="Mercedes-Benz" />
              </div>
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input value={nuevoVehiculo.modelo || ''} onChange={(e) => setNuevoVehiculo({...nuevoVehiculo, modelo: e.target.value})} placeholder="Tourismo" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={nuevoVehiculo.tipo} onValueChange={(v) => setNuevoVehiculo({...nuevoVehiculo, tipo: v as TipoVehiculo})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="autobus">Autobús</SelectItem>
                    <SelectItem value="minibus">Minibús</SelectItem>
                    <SelectItem value="furgoneta">Furgoneta</SelectItem>
                    <SelectItem value="coche">Coche</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plazas</Label>
                <Input type="number" value={nuevoVehiculo.plazas} onChange={(e) => setNuevoVehiculo({...nuevoVehiculo, plazas: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Año Fabricación</Label>
                <Input type="number" value={nuevoVehiculo.anno_fabricacion || ''} onChange={(e) => setNuevoVehiculo({...nuevoVehiculo, anno_fabricacion: parseInt(e.target.value)})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kilometraje</Label>
                <Input type="number" value={nuevoVehiculo.kilometraje} onChange={(e) => setNuevoVehiculo({...nuevoVehiculo, kilometraje: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Combustible</Label>
                <Select value={nuevoVehiculo.combustible} onValueChange={(v) => setNuevoVehiculo({...nuevoVehiculo, combustible: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diesel">Diésel</SelectItem>
                    <SelectItem value="gasolina">Gasolina</SelectItem>
                    <SelectItem value="electrico">Eléctrico</SelectItem>
                    <SelectItem value="hibrido">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNuevoOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#1e3a5f] hover:bg-[#152a45]">Crear Vehículo</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Ver Vehículo con TABS */}
      <Dialog open={!!vehiculoSeleccionado && !isEditarOpen} onOpenChange={() => { setVehiculoSeleccionado(null); setActiveTab('info'); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {vehiculoSeleccionado && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bus className="h-5 w-5" />
                  {vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo}
                  <Badge className={estadoVehiculoColors[vehiculoSeleccionado.estado]}>{vehiculoSeleccionado.estado}</Badge>
                </DialogTitle>
                <DialogDescription>
                  Matrícula: {vehiculoSeleccionado.matricula} | Bastidor: {vehiculoSeleccionado.bastidor || '-'}
                </DialogDescription>
              </DialogHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="info">Información</TabsTrigger>
                  <TabsTrigger value="mantenimiento">Mantenimiento</TabsTrigger>
                  <TabsTrigger value="averias">Averías</TabsTrigger>
                  <TabsTrigger value="anotaciones">Anotaciones</TabsTrigger>
                  <TabsTrigger value="gastos">Gastos</TabsTrigger>
                </TabsList>

                {/* TAB INFO */}
                <TabsContent value="info" className="space-y-4" forceMount>
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4">
                      <h3 className="font-medium mb-3 flex items-center gap-2"><Bus className="h-4 w-4" /> Datos del Vehículo</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">Tipo:</span><span>{tipoVehiculoLabels[vehiculoSeleccionado.tipo]}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Plazas:</span><span>{vehiculoSeleccionado.plazas}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Año:</span><span>{vehiculoSeleccionado.anno_fabricacion || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Kilometraje:</span><span>{(vehiculoSeleccionado.kilometraje || 0).toLocaleString('es-ES')} km</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Combustible:</span><span>{vehiculoSeleccionado.combustible}</span></div>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <h3 className="font-medium mb-3 flex items-center gap-2"><Calendar className="h-4 w-4" /> Documentación</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">ITV Próxima:</span>
                          <span className={getDiasRestantes(vehiculoSeleccionado.itv_fecha_proxima) !== null && getDiasRestantes(vehiculoSeleccionado.itv_fecha_proxima)! <= 30 ? 'text-red-600 font-medium' : ''}>
                            {formatDateSafe(vehiculoSeleccionado.itv_fecha_proxima)}
                          </span>
                        </div>
                        <div className="flex justify-between"><span className="text-slate-500">Seguro Vence:</span><span>{formatDateSafe(vehiculoSeleccionado.seguro_fecha_vencimiento)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Compañía:</span><span>{vehiculoSeleccionado.seguro_compania || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Póliza:</span><span>{vehiculoSeleccionado.seguro_poliza || '-'}</span></div>
                      </div>
                    </Card>
                  </div>
                  <Button onClick={() => setIsEditarOpen(true)} className="bg-[#1e3a5f] hover:bg-[#152a45]"><Edit className="mr-2 h-4 w-4" /> Editar Vehículo</Button>
                </TabsContent>

                {/* TAB MANTENIMIENTO */}
                <TabsContent value="mantenimiento" className="space-y-4" forceMount>
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium flex items-center gap-2"><Settings className="h-4 w-4" /> Historial de Mantenimiento</h3>
                    <Button size="sm" onClick={() => setShowNuevoMantenimiento(true)} className="bg-[#1e3a5f] hover:bg-[#152a45]"><Plus className="mr-1 h-3 w-3" /> Añadir</Button>
                  </div>
                  {loadingHistorial ? (
                    <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
                  ) : mantenimientos.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                      <Settings className="mx-auto mb-2 h-8 w-8" />
                      <p>No hay registros de mantenimiento</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {mantenimientos.map((m) => (
                        <Card key={m.id} className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{m.tipo} - {formatDateSafe(m.fecha)}</p>
                              <p className="text-sm text-slate-500">{m.descripcion}</p>
                              {m.taller && <p className="text-xs text-slate-400">Taller: {m.taller}</p>}
                            </div>
                            <div className="text-right">
                              {m.coste && <p className="font-medium">{m.coste.toFixed(2)} €</p>}
                              {m.kilometraje && <p className="text-xs text-slate-500">{m.kilometraje.toLocaleString()} km</p>}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* TAB AVERÍAS */}
                <TabsContent value="averias" className="space-y-4" forceMount>
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Averías y Reparaciones</h3>
                    <Button size="sm" onClick={() => setShowNuevaAveria(true)} className="bg-[#1e3a5f] hover:bg-[#152a45]"><Plus className="mr-1 h-3 w-3" /> Reportar Avería</Button>
                  </div>
                  {loadingHistorial ? (
                    <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
                  ) : averias.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                      <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-500" />
                      <p>No hay averías registradas</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {averias.map((a) => (
                        <Card key={a.id} className={`p-3 ${a.estado === 'resuelta' ? 'bg-green-50' : 'bg-amber-50'}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge className={a.gravedad === 'critica' ? 'bg-red-100 text-red-700' : a.gravedad === 'grave' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}>
                                  {a.gravedad}
                                </Badge>
                                <span className="text-sm text-slate-500">{formatDateSafe(a.fecha_inicio)}</span>
                              </div>
                              <p className="mt-1">{a.descripcion}</p>
                              {a.taller && <p className="text-xs text-slate-500">Taller: {a.taller}</p>}
                            </div>
                            <div className="text-right">
                              <Badge variant={a.estado === 'resuelta' ? 'default' : 'secondary'}>{a.estado}</Badge>
                              {a.coste_reparacion && <p className="text-sm font-medium mt-1">{a.coste_reparacion.toFixed(2)} €</p>}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* TAB ANOTACIONES */}
                <TabsContent value="anotaciones" className="space-y-4" forceMount>
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Anotaciones del Personal</h3>
                    <Button size="sm" onClick={() => setShowNuevaAnotacion(true)} className="bg-[#1e3a5f] hover:bg-[#152a45]"><Plus className="mr-1 h-3 w-3" /> Añadir Anotación</Button>
                  </div>
                  {loadingHistorial ? (
                    <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
                  ) : anotaciones.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                      <ClipboardList className="mx-auto mb-2 h-8 w-8" />
                      <p>No hay anotaciones</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {anotaciones.map((a) => (
                        <Card key={a.id} className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{a.tipo}</Badge>
                                <span className="text-sm text-slate-500">{formatDateSafe(a.fecha)}</span>
                              </div>
                              <p className="mt-1">{a.contenido}</p>
                              {a.conductor_nombre && <p className="text-xs text-slate-500">Por: {a.conductor_nombre}</p>}
                            </div>
                            {a.kilometraje && <span className="text-sm text-slate-500">{a.kilometraje.toLocaleString()} km</span>}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* TAB GASTOS */}
                <TabsContent value="gastos" className="space-y-4" forceMount>
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium flex items-center gap-2"><Euro className="h-4 w-4" /> Gastos y Facturas</h3>
                    <Button size="sm" onClick={() => setShowNuevoGasto(true)} className="bg-[#1e3a5f] hover:bg-[#152a45]"><Plus className="mr-1 h-3 w-3" /> Añadir Gasto</Button>
                  </div>
                  {gastos.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                      <Euro className="mx-auto mb-2 h-8 w-8" />
                      <p>No hay gastos registrados</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {gastos.map((g) => (
                        <Card key={g.id} className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{g.tipo}</Badge>
                                <span className="text-sm text-slate-500">{formatDateSafe(g.fecha)}</span>
                              </div>
                              <p className="mt-1">{g.concepto}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{g.importe.toFixed(2)} €</p>
                              {g.archivo_url && <Button variant="ghost" size="sm"><FileText className="h-4 w-4 mr-1" /> Ver</Button>}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Vehículo */}
      <Dialog open={isEditarOpen} onOpenChange={setIsEditarOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Vehículo</DialogTitle>
            <DialogDescription>Modifique los datos del vehículo</DialogDescription>
          </DialogHeader>
          {vehiculoSeleccionado && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Matrícula</Label>
                  <Input value={vehiculoSeleccionado.matricula} onChange={(e) => setVehiculoSeleccionado({...vehiculoSeleccionado, matricula: e.target.value.toUpperCase()})} />
                </div>
                <div className="space-y-2">
                  <Label>Bastidor</Label>
                  <Input value={vehiculoSeleccionado.bastidor || ''} onChange={(e) => setVehiculoSeleccionado({...vehiculoSeleccionado, bastidor: e.target.value.toUpperCase()})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Marca</Label>
                  <Input value={vehiculoSeleccionado.marca || ''} onChange={(e) => setVehiculoSeleccionado({...vehiculoSeleccionado, marca: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Input value={vehiculoSeleccionado.modelo || ''} onChange={(e) => setVehiculoSeleccionado({...vehiculoSeleccionado, modelo: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={vehiculoSeleccionado.tipo} onValueChange={(v) => setVehiculoSeleccionado({...vehiculoSeleccionado, tipo: v as TipoVehiculo})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="autobus">Autobús</SelectItem>
                      <SelectItem value="minibus">Minibús</SelectItem>
                      <SelectItem value="furgoneta">Furgoneta</SelectItem>
                      <SelectItem value="coche">Coche</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={vehiculoSeleccionado.estado} onValueChange={(v) => setVehiculoSeleccionado({...vehiculoSeleccionado, estado: v as EstadoVehiculo})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operativo">Operativo</SelectItem>
                      <SelectItem value="taller">En Taller</SelectItem>
                      <SelectItem value="reservado">Reservado</SelectItem>
                      <SelectItem value="baja">De Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Kilometraje</Label>
                  <Input type="number" value={vehiculoSeleccionado.kilometraje || 0} onChange={(e) => setVehiculoSeleccionado({...vehiculoSeleccionado, kilometraje: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ITV Fecha Próxima</Label>
                  <Input type="date" value={vehiculoSeleccionado.itv_fecha_proxima || ''} onChange={(e) => setVehiculoSeleccionado({...vehiculoSeleccionado, itv_fecha_proxima: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Seguro Vencimiento</Label>
                  <Input type="date" value={vehiculoSeleccionado.seguro_fecha_vencimiento || ''} onChange={(e) => setVehiculoSeleccionado({...vehiculoSeleccionado, seguro_fecha_vencimiento: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Compañía Seguro</Label>
                  <Input value={vehiculoSeleccionado.seguro_compania || ''} onChange={(e) => setVehiculoSeleccionado({...vehiculoSeleccionado, seguro_compania: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Nº Póliza</Label>
                  <Input value={vehiculoSeleccionado.seguro_poliza || ''} onChange={(e) => setVehiculoSeleccionado({...vehiculoSeleccionado, seguro_poliza: e.target.value})} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditarOpen(false)}>Cancelar</Button>
                <Button onClick={handleActualizar} disabled={isSubmitting} className="bg-[#1e3a5f] hover:bg-[#152a45]">Guardar Cambios</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Nuevo Mantenimiento */}
      <Dialog open={showNuevoMantenimiento} onOpenChange={setShowNuevoMantenimiento}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo Mantenimiento</DialogTitle>
            <DialogDescription>Registre una nueva revisión o mantenimiento</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCrearMantenimiento} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select name="tipo" required>
                  <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventivo">Preventivo</SelectItem>
                    <SelectItem value="correctivo">Correctivo</SelectItem>
                    <SelectItem value="itv">ITV</SelectItem>
                    <SelectItem value="neumaticos">Neumáticos</SelectItem>
                    <SelectItem value="aceite">Cambio Aceite</SelectItem>
                    <SelectItem value="frenos">Frenos</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input type="date" name="fecha" required defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kilometraje</Label>
                <Input type="number" name="kilometraje" placeholder={vehiculoSeleccionado?.kilometraje?.toString()} />
              </div>
              <div className="space-y-2">
                <Label>Coste (€)</Label>
                <Input type="number" step="0.01" name="coste" placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Taller</Label>
              <Input name="taller" placeholder="Nombre del taller" />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea name="descripcion" placeholder="Trabajos realizados..." rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNuevoMantenimiento(false)}>Cancelar</Button>
              <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#152a45]">Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Nueva Avería */}
      <Dialog open={showNuevaAveria} onOpenChange={setShowNuevaAveria}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reportar Avería</DialogTitle>
            <DialogDescription>Registre una nueva avería o fallo</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCrearAveria} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Gravedad *</Label>
              <Select name="gravedad" required>
                <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="leve">Leve</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="grave">Grave</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descripción del problema *</Label>
              <Textarea name="descripcion" required placeholder="Describa el fallo o avería..." rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNuevaAveria(false)}>Cancelar</Button>
              <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#152a45]">Reportar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Nueva Anotación */}
      <Dialog open={showNuevaAnotacion} onOpenChange={setShowNuevaAnotacion}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Anotación</DialogTitle>
            <DialogDescription>Añada una observación o incidencia</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCrearAnotacion} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select name="tipo" required>
                  <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="limpieza">Limpieza</SelectItem>
                    <SelectItem value="revision">Revisión</SelectItem>
                    <SelectItem value="dano">Daño</SelectItem>
                    <SelectItem value="observacion">Observación</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Kilometraje</Label>
                <Input type="number" name="kilometraje" placeholder={vehiculoSeleccionado?.kilometraje?.toString()} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contenido *</Label>
              <Textarea name="contenido" required placeholder="Escriba la anotación..." rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNuevaAnotacion(false)}>Cancelar</Button>
              <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#152a45]">Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Nuevo Gasto */}
      <Dialog open={showNuevoGasto} onOpenChange={setShowNuevoGasto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo Gasto</DialogTitle>
            <DialogDescription>Registre un gasto o factura</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="taller">Taller</SelectItem>
                    <SelectItem value="itv">ITV</SelectItem>
                    <SelectItem value="seguro">Seguro</SelectItem>
                    <SelectItem value="combustible">Combustible</SelectItem>
                    <SelectItem value="aparcamiento">Aparcamiento</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Importe (€)</Label>
                <Input type="number" step="0.01" placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Concepto</Label>
              <Input placeholder="Descripción del gasto" />
            </div>
            <div className="space-y-2">
              <Label>Adjuntar archivo</Label>
              <Input type="file" accept=".pdf,.jpg,.png" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNuevoGasto(false)}>Cancelar</Button>
              <Button onClick={() => { setShowNuevoGasto(false); showToast('Gasto registrado', 'success'); }} className="bg-[#1e3a5f] hover:bg-[#152a45]">Guardar</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
