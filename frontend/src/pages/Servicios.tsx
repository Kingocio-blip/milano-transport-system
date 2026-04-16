// ============================================
// MILANO - Servicios Page (FIX GUARDADO + MEJORAS)
// ============================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useServiciosStore, useClientesStore, useConductoresStore, useVehiculosStore, useUIStore } from '../store';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import {
  Briefcase,
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Euro,
  Filter,
  Loader2,
  MapPin,
  Users,
  Truck,
  UserCircle,
  Fuel,
  Calculator,
} from 'lucide-react';
import type { Servicio, TipoServicio, EstadoServicio } from '../types';
import { format, isValid, parseISO, differenceInHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const tipoServicioLabels: Record<TipoServicio, string> = {
  lanzadera: 'Lanzadera',
  discrecional: 'Discrecional',
  staff: 'Movilidad Staff',
  ruta_programada: 'Ruta Programada',
};

const estadoServicioColors: Record<EstadoServicio, string> = {
  solicitud: 'bg-slate-100 text-slate-700',
  presupuesto: 'bg-blue-100 text-blue-700',
  negociacion: 'bg-purple-100 text-purple-700',
  confirmado: 'bg-cyan-100 text-cyan-700',
  planificando: 'bg-amber-100 text-amber-700',
  asignado: 'bg-indigo-100 text-indigo-700',
  en_curso: 'bg-green-100 text-green-700',
  completado: 'bg-teal-100 text-teal-700',
  facturado: 'bg-emerald-100 text-emerald-700',
  cancelado: 'bg-red-100 text-red-700',
};

const formatDateSafe = (date: string | Date | undefined, formatStr: string = 'dd/MM/yyyy'): string => {
  if (!date) return '-';
  try {
    const parsed = typeof date === 'string' ? parseISO(date) : date;
    return isValid(parsed) ? format(parsed, formatStr) : '-';
  } catch {
    return '-';
  }
};

const calcularHorasServicio = (fechaInicio: string, horaInicio?: string, fechaFin?: string, horaFin?: string): number => {
  try {
    const inicio = new Date(`${fechaInicio}T${horaInicio || '00:00'}`);
    const fin = new Date(`${fechaFin || fechaInicio}T${horaFin || '23:59'}`);
    return Math.max(1, differenceInHours(fin, inicio));
  } catch {
    return 8;
  }
};

export default function Servicios() {
  const { servicios, addServicio, deleteServicio, fetchServicios, isLoading, error } = useServiciosStore();
  const { clientes, fetchClientes } = useClientesStore();
  const { conductores, fetchConductores } = useConductoresStore();
  const { vehiculos, fetchVehiculos } = useVehiculosStore();
  const { showToast } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoServicio | 'todos'>('todos');
  const [tipoFiltro, setTipoFiltro] = useState<TipoServicio | 'todos'>('todos');
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null);
  const [isNuevoServicioOpen, setIsNuevoServicioOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [autoAsignarConductor, setAutoAsignarConductor] = useState(true);
  const [autoAsignarVehiculo, setAutoAsignarVehiculo] = useState(true);
  const [incluirCoordinador, setIncluirCoordinador] = useState(false);

  const TARIFA_CONDUCTOR_HORA = 18;
  const TARIFA_COORDINADOR_HORA = 25;
  const PRECIO_GASOIL_LITRO = 1.6;
  const CONSUMO_LITROS_100KM = 35;

  const initialServicioState: Partial<Servicio> = {
    tipo: 'discrecional',
    estado: 'planificando',
    numeroVehiculos: 1,
  };

  const [nuevoServicio, setNuevoServicio] = useState<Partial<Servicio>>(initialServicioState);

  useEffect(() => {
    fetchServicios();
    fetchClientes();
    fetchConductores();
    fetchVehiculos();
  }, [fetchServicios, fetchClientes, fetchConductores, fetchVehiculos]);

  useEffect(() => {
    if (error) showToast(error, 'error');
  }, [error, showToast]);

  const conductorDisponible = useMemo(() => {
    return conductores.find(c => c.estado === 'activo');
  }, [conductores]);

  const vehiculoDisponible = useMemo(() => {
    return vehiculos.find(v => v.estado === 'operativo');
  }, [vehiculos]);

  const costesEstimados = useMemo(() => {
    if (!nuevoServicio.fechaInicio) return null;
    
    const horas = calcularHorasServicio(
      nuevoServicio.fechaInicio,
      nuevoServicio.horaInicio,
      nuevoServicio.fechaFin,
      nuevoServicio.horaFin
    );
    
    const costeConductor = horas * TARIFA_CONDUCTOR_HORA * (nuevoServicio.numeroVehiculos || 1);
    const costeCoordinador = incluirCoordinador ? horas * TARIFA_COORDINADOR_HORA : 0;
    const distanciaEstimada = 100;
    const litrosGasoil = (distanciaEstimada * CONSUMO_LITROS_100KM) / 100 * (nuevoServicio.numeroVehiculos || 1);
    const costeGasoil = litrosGasoil * PRECIO_GASOIL_LITRO;
    
    const total = costeConductor + costeCoordinador + costeGasoil;
    
    return {
      horas,
      costeConductor,
      costeCoordinador,
      costeGasoil,
      litrosGasoil,
      total,
      detalle: `Conductor: ${costeConductor}€${incluirCoordinador ? ` + Coordinador: ${costeCoordinador}€` : ''} + Gasoil: ${costeGasoil.toFixed(2)}€`
    };
  }, [nuevoServicio, incluirCoordinador]);

  useEffect(() => {
    if (costesEstimados) {
      setNuevoServicio(prev => ({ ...prev, costeEstimado: costesEstimados.total }));
    }
  }, [costesEstimados]);

  const serviciosFiltrados = useMemo(() => {
    return servicios.filter(servicio => {
      const searchLower = searchQuery.toLowerCase().trim();
      const matchesSearch = searchLower === '' ||
        servicio.codigo?.toLowerCase().includes(searchLower) ||
        servicio.titulo?.toLowerCase().includes(searchLower) ||
        servicio.clienteNombre?.toLowerCase().includes(searchLower);
      const matchesEstado = estadoFiltro === 'todos' || servicio.estado === estadoFiltro;
      const matchesTipo = tipoFiltro === 'todos' || servicio.tipo === tipoFiltro;
      return matchesSearch && matchesEstado && matchesTipo;
    });
  }, [servicios, searchQuery, estadoFiltro, tipoFiltro]);

  const stats = useMemo(() => ({
    activos: servicios.filter(s => s.estado === 'en_curso' || s.estado === 'asignado').length,
    pendientes: servicios.filter(s => s.estado === 'planificando' || s.estado === 'confirmado').length,
    completados: servicios.filter(s => s.estado === 'completado').length,
    facturados: servicios.filter(s => s.estado === 'facturado').length,
    totalFacturacion: servicios.filter(s => s.estado === 'facturado').reduce((sum, s) => sum + (s.precio || 0), 0),
  }), [servicios]);

  const handleCloseDialog = useCallback(() => {
    setIsNuevoServicioOpen(false);
    setNuevoServicio(initialServicioState);
    setAutoAsignarConductor(true);
    setAutoAsignarVehiculo(true);
    setIncluirCoordinador(false);
  }, []);

  // FIX PRINCIPAL: onSubmit en el form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!nuevoServicio.clienteId) {
      showToast('Debe seleccionar un cliente', 'error');
      return;
    }
    if (!nuevoServicio.titulo?.trim()) {
      showToast('El título es obligatorio', 'error');
      return;
    }
    if (!nuevoServicio.fechaInicio) {
      showToast('La fecha de inicio es obligatoria', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const cliente = clientes.find(c => String(c.id) === String(nuevoServicio.clienteId));
      
      const conductoresAsignados: string[] = [];
      if (autoAsignarConductor && conductorDisponible) {
        conductoresAsignados.push(String(conductorDisponible.id));
      }
      if (incluirCoordinador && conductorDisponible) {
        conductoresAsignados.push(`coord_${conductorDisponible.id}`);
      }

      const vehiculosAsignados: string[] = [];
      if (autoAsignarVehiculo && vehiculoDisponible) {
        for (let i = 0; i < (nuevoServicio.numeroVehiculos || 1); i++) {
          vehiculosAsignados.push(String(vehiculoDisponible.id));
        }
      }

      const servicioData = {
        codigo: `SRV-${Date.now().toString().slice(-6)}`,
        cliente_id: nuevoServicio.clienteId,
        cliente_nombre: cliente?.nombre || '',
        tipo: nuevoServicio.tipo || 'discrecional',
        estado: 'planificando',
        titulo: nuevoServicio.titulo.trim(),
        descripcion: nuevoServicio.descripcion?.trim() || '',
        fecha_inicio: new Date(nuevoServicio.fechaInicio).toISOString(),
        fecha_fin: nuevoServicio.fechaFin
          ? new Date(nuevoServicio.fechaFin).toISOString()
          : new Date(nuevoServicio.fechaInicio).toISOString(),
        hora_inicio: nuevoServicio.horaInicio || null,
        hora_fin: nuevoServicio.horaFin || null,
        origen: nuevoServicio.origen?.trim() || null,
        destino: nuevoServicio.destino?.trim() || null,
        ubicacion_evento: null,
        numero_vehiculos: nuevoServicio.numeroVehiculos || 1,
        vehiculos_asignados: vehiculosAsignados,
        conductores_asignados: conductoresAsignados,
        coste_estimado: costesEstimados?.total || 0,
        coste_real: null,
        precio: nuevoServicio.precio || 0,
        facturado: false,
        factura_id: null,
        notas_internas: `Auto-calc: ${costesEstimados?.detalle || 'N/A'}`,
        notas_cliente: null,
        rutas: [],
        tareas: [
          { id: `t${Date.now()}-1`, nombre: 'Recopilar información del evento', completada: false },
          { id: `t${Date.now()}-2`, nombre: 'Planificar rutas', completada: false },
          { id: `t${Date.now()}-3`, nombre: 'Asignar conductores', completada: autoAsignarConductor },
          { id: `t${Date.now()}-4`, nombre: 'Preparar vehículos', completada: autoAsignarVehiculo },
          { id: `t${Date.now()}-5`, nombre: 'Confirmar detalles con cliente', completada: false },
        ],
        incidencias: [],
        documentos: [],
      };

      console.log('📤 Enviando servicio:', servicioData);

      const success = await addServicio(servicioData);

      if (success) {
        handleCloseDialog();
        showToast('Servicio creado correctamente', 'success');
      } else {
        showToast('Error al crear el servicio', 'error');
      }
    } catch (err: any) {
      console.error('❌ Error:', err);
      showToast(`Error: ${err.message || 'Desconocido'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEliminarServicio = async (id: string | number) => {
    if (!window.confirm('¿Eliminar este servicio?')) return;
    try {
      const success = await deleteServicio(String(id));
      if (success) {
        showToast('Servicio eliminado', 'success');
        if (servicioSeleccionado?.id === String(id)) setServicioSeleccionado(null);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const getProgresoTareas = useCallback((servicio: Servicio) => {
    if (!servicio.tareas?.length) return 0;
    return Math.round((servicio.tareas.filter(t => t.completada).length / servicio.tareas.length) * 100);
  }, []);

  const getMargen = useCallback((servicio: Servicio) => (servicio.precio || 0) - (servicio.costeEstimado || 0), []);

  if (isLoading && servicios.length === 0) {
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
          <h1 className="text-2xl font-bold text-slate-900">Servicios</h1>
          <p className="text-slate-500">Gestión de proyectos de transporte</p>
        </div>
        <Button 
          onClick={() => setIsNuevoServicioOpen(true)}
          className="bg-[#1e3a5f] hover:bg-[#152a45] shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Servicio
        </Button>
      </div>

      {/* Dialog - FIX: form con onSubmit */}
      <Dialog open={isNuevoServicioOpen} onOpenChange={setIsNuevoServicioOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Servicio</DialogTitle>
            <DialogDescription>Complete la información. Campos * obligatorios.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {/* Cliente y Tipo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select
                  value={String(nuevoServicio.clienteId || '')}
                  onValueChange={(v) => setNuevoServicio(prev => ({...prev, clienteId: v}))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.filter(c => c.estado === 'activo').map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={nuevoServicio.tipo}
                  onValueChange={(v) => setNuevoServicio(prev => ({...prev, tipo: v as TipoServicio}))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lanzadera">Lanzadera</SelectItem>
                    <SelectItem value="discrecional">Discrecional</SelectItem>
                    <SelectItem value="staff">Movilidad Staff</SelectItem>
                    <SelectItem value="ruta_programada">Ruta Programada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Título */}
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={nuevoServicio.titulo || ''}
                onChange={(e) => setNuevoServicio(prev => ({...prev, titulo: e.target.value}))}
                placeholder="Ej: Transporte evento corporativo"
              />
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={nuevoServicio.descripcion || ''}
                onChange={(e) => setNuevoServicio(prev => ({...prev, descripcion: e.target.value}))}
                placeholder="Detalles del servicio..."
                rows={2}
              />
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio *</Label>
                <Input
                  type="date"
                  value={nuevoServicio.fechaInicio ? format(new Date(nuevoServicio.fechaInicio), 'yyyy-MM-dd') : ''}
                  onChange={(e) => setNuevoServicio(prev => ({...prev, fechaInicio: e.target.value}))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={nuevoServicio.fechaFin ? format(new Date(nuevoServicio.fechaFin), 'yyyy-MM-dd') : ''}
                  onChange={(e) => setNuevoServicio(prev => ({...prev, fechaFin: e.target.value}))}
                />
              </div>
            </div>

            {/* Horas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hora Inicio</Label>
                <Input
                  type="time"
                  value={nuevoServicio.horaInicio || ''}
                  onChange={(e) => setNuevoServicio(prev => ({...prev, horaInicio: e.target.value}))}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora Fin</Label>
                <Input
                  type="time"
                  value={nuevoServicio.horaFin || ''}
                  onChange={(e) => setNuevoServicio(prev => ({...prev, horaFin: e.target.value}))}
                />
              </div>
            </div>

            {/* Origen/Destino */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><MapPin className="h-3 w-3"/> Origen</Label>
                <Input
                  value={nuevoServicio.origen || ''}
                  onChange={(e) => setNuevoServicio(prev => ({...prev, origen: e.target.value}))}
                  placeholder="Dirección origen"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><MapPin className="h-3 w-3"/> Destino</Label>
                <Input
                  value={nuevoServicio.destino || ''}
                  onChange={(e) => setNuevoServicio(prev => ({...prev, destino: e.target.value}))}
                  placeholder="Dirección destino"
                />
              </div>
            </div>

            {/* Vehículos y Precio */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Truck className="h-3 w-3"/> Nº Vehículos</Label>
                <Input
                  type="number"
                  min={1}
                  value={nuevoServicio.numeroVehiculos}
                  onChange={(e) => setNuevoServicio(prev => ({...prev, numeroVehiculos: parseInt(e.target.value) || 1}))}
                />
              </div>
              <div className="space-y-2">
                <Label>Precio Cliente (€)</Label>
                <Input
                  type="number"
                  min={0}
                  value={nuevoServicio.precio || ''}
                  onChange={(e) => setNuevoServicio(prev => ({...prev, precio: parseFloat(e.target.value) || 0}))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-500">Coste Auto (€)</Label>
                <Input
                  type="number"
                  value={costesEstimados?.total.toFixed(2) || '0'}
                  disabled
                  className="bg-slate-50"
                />
              </div>
            </div>

            {/* Auto-asignación */}
            <div className="space-y-3 p-3 bg-slate-50 rounded-lg border">
              <p className="text-sm font-medium flex items-center gap-2">
                <Calculator className="h-4 w-4"/>
                Auto-asignación y Costes
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="autoConductor"
                    checked={autoAsignarConductor}
                    onCheckedChange={(c) => setAutoAsignarConductor(!!c)}
                  />
                  <Label htmlFor="autoConductor" className="cursor-pointer text-sm">
                    Asignar conductor disponible
                    {conductorDisponible && <span className="text-green-600 ml-1">({conductorDisponible.nombre})</span>}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="autoVehiculo"
                    checked={autoAsignarVehiculo}
                    onCheckedChange={(c) => setAutoAsignarVehiculo(!!c)}
                  />
                  <Label htmlFor="autoVehiculo" className="cursor-pointer text-sm">
                    Asignar vehículo disponible
                    {vehiculoDisponible && <span className="text-green-600 ml-1">({vehiculoDisponible.matricula})</span>}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="coordinador"
                    checked={incluirCoordinador}
                    onCheckedChange={(c) => setIncluirCoordinador(!!c)}
                  />
                  <Label htmlFor="coordinador" className="cursor-pointer text-sm">
                    Incluir coordinador (+{TARIFA_COORDINADOR_HORA}€/h)
                  </Label>
                </div>
              </div>
              
              {/* Breakdown de costes */}
              {costesEstimados && (
                <div className="text-xs text-slate-600 space-y-1 mt-2 pt-2 border-t">
                  <div className="flex justify-between">
                    <span>Horas estimadas:</span>
                    <span>{costesEstimados.horas}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Conductor ({TARIFA_CONDUCTOR_HORA}€/h × {costesEstimados.horas}h × {nuevoServicio.numeroVehiculos} veh):</span>
                    <span>{costesEstimados.costeConductor}€</span>
                  </div>
                  {incluirCoordinador && (
                    <div className="flex justify-between">
                      <span>Coordinador ({TARIFA_COORDINADOR_HORA}€/h × {costesEstimados.horas}h):</span>
                      <span>{costesEstimados.costeCoordinador}€</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1"><Fuel className="h-3 w-3"/> Gasoil estimado:</span>
                    <span>{costesEstimados.costeGasoil.toFixed(2)}€ ({costesEstimados.litrosGasoil.toFixed(1)}L)</span>
                  </div>
                  <div className="flex justify-between font-medium text-slate-900 pt-1 border-t">
                    <span>TOTAL COSTE:</span>
                    <span>{costesEstimados.total.toFixed(2)}€</span>
                  </div>
                </div>
              )}
            </div>

            {/* Margen preview */}
            {(nuevoServicio.precio || 0) > 0 && costesEstimados && (
              <div className={`p-3 rounded-lg ${
                ((nuevoServicio.precio || 0) - costesEstimados.total) >= 0
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Margen estimado:</span>
                  <span className={`font-bold ${
                    ((nuevoServicio.precio || 0) - costesEstimados.total) >= 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {((nuevoServicio.precio || 0) - costesEstimados.total).toLocaleString('es-ES')}€
                    {' '}
                    ({costesEstimados.total > 0 
                      ? Math.round(((nuevoServicio.precio || 0) - costesEstimados.total) / costesEstimados.total * 100) 
                      : 0}%)
                  </span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={isSubmitting}>
                Cancelar
              </Button>
              {/* FIX: type="submit" en lugar de onClick */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#1e3a5f] hover:bg-[#152a45]"
              >
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Creando...</>
                ) : (
                  'Crear Servicio'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card><CardContent className="p-6"><div className="flex justify-between"><div><p className="text-sm text-slate-500">Activos</p><p className="text-3xl font-bold">{stats.activos}</p></div><div className="rounded-full bg-green-100 p-3"><Briefcase className="h-6 w-6 text-green-600"/></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex justify-between"><div><p className="text-sm text-slate-500">Pendientes</p><p className="text-3xl font-bold">{stats.pendientes}</p></div><div className="rounded-full bg-amber-100 p-3"><Clock className="h-6 w-6 text-amber-600"/></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex justify-between"><div><p className="text-sm text-slate-500">Completados</p><p className="text-3xl font-bold">{stats.completados}</p></div><div className="rounded-full bg-blue-100 p-3"><CheckCircle2 className="h-6 w-6 text-blue-600"/></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex justify-between"><div><p className="text-sm text-slate-500">Facturados</p><p className="text-3xl font-bold">{stats.facturados}</p></div><div className="rounded-full bg-emerald-100 p-3"><Euro className="h-6 w-6 text-emerald-600"/></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex justify-between"><div><p className="text-sm text-slate-500">Facturación</p><p className="text-2xl font-bold">{stats.totalFacturacion.toLocaleString('es-ES')}€</p></div><div className="rounded-full bg-purple-100 p-3"><Euro className="h-6 w-6 text-purple-600"/></div></div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>
          <Input placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10"/>
        </div>
        <Select value={estadoFiltro} onValueChange={(v) => setEstadoFiltro(v as EstadoServicio | 'todos')}>
          <SelectTrigger className="w-48"><Filter className="mr-2 h-4 w-4"/><SelectValue/></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {Object.keys(estadoServicioColors).map(e => (
              <SelectItem key={e} value={e}>{e.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v as TipoServicio | 'todos')}>
          <SelectTrigger className="w-48"><Truck className="mr-2 h-4 w-4"/><SelectValue/></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            {Object.entries(tipoServicioLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fechas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Progreso</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto"/></TableCell></TableRow>
              ) : serviciosFiltrados.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">No hay servicios</TableCell></TableRow>
              ) : (
                serviciosFiltrados.map((servicio) => (
                  <TableRow key={servicio.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{servicio.codigo}</TableCell>
                    <TableCell>
                      <div><p className="font-medium">{servicio.titulo}</p><Badge variant="outline" className="text-xs mt-1">{tipoServicioLabels[servicio.tipo]}</Badge></div>
                    </TableCell>
                    <TableCell><div className="flex items-center gap-1"><Users className="h-3 w-3 text-slate-400"/>{servicio.clienteNombre || '-'}</div></TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-slate-400"/>{formatDateSafe(servicio.fechaInicio)}</span>
                        {servicio.horaInicio && <span className="flex items-center gap-1 text-slate-500"><Clock className="h-3 w-3"/>{servicio.horaInicio}</span>}
                      </div>
                    </TableCell>
                    <TableCell><Badge className={estadoServicioColors[servicio.estado]}>{servicio.estado.replace('_', ' ')}</Badge></TableCell>
                    <TableCell><div className="w-24"><Progress value={getProgresoTareas(servicio)} className="h-2"/><span className="text-xs text-slate-500">{getProgresoTareas(servicio)}%</span></div></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setServicioSeleccionado(servicio)}><Eye className="mr-2 h-4 w-4"/>Ver</DropdownMenuItem>
                          <DropdownMenuItem><Edit className="mr-2 h-4 w-4"/>Editar</DropdownMenuItem>
                          {!servicio.facturado && servicio.estado === 'completado' && (
                            <DropdownMenuItem asChild><Link to={`/facturacion/nueva?servicio=${servicio.id}`}><Euro className="mr-2 h-4 w-4"/>Facturar</Link></DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-red-600" onClick={() => handleEliminarServicio(servicio.id)}><Trash2 className="mr-2 h-4 w-4"/>Eliminar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!servicioSeleccionado} onOpenChange={() => setServicioSeleccionado(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          {servicioSeleccionado && (
            <>
              <DialogHeader>
                <DialogTitle>{servicioSeleccionado.titulo}</DialogTitle>
                <DialogDescription>{servicioSeleccionado.codigo} • {tipoServicioLabels[servicioSeleccionado.tipo]}</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-slate-500">Cliente</Label><p className="font-medium flex items-center gap-2"><Users className="h-4 w-4 text-slate-400"/>{servicioSeleccionado.clienteNombre || '-'}</p></div>
                  <div><Label className="text-slate-500">Estado</Label><Badge className={estadoServicioColors[servicioSeleccionado.estado]}>{servicioSeleccionado.estado.replace('_', ' ')}</Badge></div>
                </div>
                <div className="grid grid-cols-3 gap-4 rounded-lg bg-slate-50 p-4">
                  <div><Label className="text-slate-500">Coste Estimado</Label><p className="text-lg font-medium">{(servicioSeleccionado.costeEstimado || 0).toLocaleString('es-ES')}€</p></div>
                  <div><Label className="text-slate-500">Precio</Label><p className="text-lg font-medium">{(servicioSeleccionado.precio || 0).toLocaleString('es-ES')}€</p></div>
                  <div><Label className="text-slate-500">Margen</Label><p className={`text-lg font-medium ${getMargen(servicioSeleccionado) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{getMargen(servicioSeleccionado).toLocaleString('es-ES')}€</p></div>
                </div>
                {servicioSeleccionado.tareas && servicioSeleccionado.tareas.length > 0 && (
                  <div>
                    <Label className="text-slate-500 mb-2 block">Tareas ({getProgresoTareas(servicioSeleccionado)}%)</Label>
                    <div className="space-y-2">
                      {servicioSeleccionado.tareas.map((tarea) => (
                        <div key={tarea.id} className={`flex items-center gap-3 p-2 rounded-lg ${tarea.completada ? 'bg-green-50' : 'bg-slate-50'}`}>
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center ${tarea.completada ? 'bg-green-500 text-white' : 'bg-slate-300'}`}>
                            {tarea.completada && <CheckCircle2 className="h-3 w-3"/>}
                          </div>
                          <span className={tarea.completada ? 'line-through text-slate-500' : ''}>{tarea.nombre}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}