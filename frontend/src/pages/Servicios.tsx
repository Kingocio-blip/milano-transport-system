// ============================================
// MILANO - Servicios Page (FIX BOTONES DIRECTOS)
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
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import {
 Briefcase,
 Search,
 Plus,
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
 FileText,
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
 solicitud: 'bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300',
 presupuesto: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
 negociacion: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
 confirmado: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
 planificando: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
 asignado: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
 en_curso: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
 completado: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
 facturado: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
 cancelado: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};

// FIX: Helper seguro para formatear fechas
const formatDateSafe = (date: string | Date | undefined, formatStr: string = 'dd/MM/yyyy'): string => {
 if (!date) return '-';
 try {
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  return isValid(parsed) ? format(parsed, formatStr) : '-';
 } catch {
  return '-';
 }
};

// FIX: Helper seguro para parsear fechas a string
const dateToString = (date: string | Date | undefined): string => {
 if (!date) return '';
 if (typeof date === 'string') return date;
 try {
  return format(date, 'yyyy-MM-dd');
 } catch {
  return '';
 }
};

// Constantes para cálculos
const CONSUMO_LITROS_100KM = 35;
const PRECIO_GASOIL_LITRO = 1.6;
const COSTE_KM_CONDUCTOR = 0.5;
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
 const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null);
 const [isNuevoServicioOpen, setIsNuevoServicioOpen] = useState(false);
 const [isEditarOpen, setIsEditarOpen] = useState(false);
 const [isDetalleOpen, setIsDetalleOpen] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);

 // Auto-asignación
 const [autoAsignarConductor, setAutoAsignarConductor] = useState(false);
 const [autoAsignarVehiculo, setAutoAsignarVehiculo] = useState(false);
 const [incluirCoordinador, setIncluirCoordinador] = useState(false);

 const [nuevoServicio, setNuevoServicio] = useState<Partial<Servicio>>({
  tipo: 'lanzadera',
  estado: 'planificando',
  numeroVehiculos: 1,
  fechaInicio: format(new Date(), 'yyyy-MM-dd'),
 });

 useEffect(() => {
  fetchServicios();
  fetchClientes();
  fetchConductores();
  fetchVehiculos();
 }, [fetchServicios, fetchClientes, fetchConductores, fetchVehiculos]);

 // Conductores y vehículos disponibles
 const conductorDisponible = useMemo(() => {
  return conductores.find(c => c.estado === 'activo');
 }, [conductores]);

 const vehiculoDisponible = useMemo(() => {
  return vehiculos.find(v => v.estado === 'operativo');
 }, [vehiculos]);

 // Calcular costes estimados
 const costesEstimados = useMemo(() => {
  if (!nuevoServicio.fechaInicio || !nuevoServicio.horaInicio) return null;
  
  const fechaInicio = new Date(`${nuevoServicio.fechaInicio}T${nuevoServicio.horaInicio || '00:00'}`);
  const fechaFin = nuevoServicio.fechaFin && nuevoServicio.horaFin
   ? new Date(`${nuevoServicio.fechaFin}T${nuevoServicio.horaFin}`)
   : new Date(fechaInicio.getTime() + 8 * 60 * 60 * 1000);
  
  const horas = Math.max(1, differenceInHours(fechaFin, fechaInicio));
  const numVehiculos = nuevoServicio.numeroVehiculos || 1;
  
  const costeConductor = TARIFA_CONDUCTOR_HORA * horas * numVehiculos;
  const costeCoordinador = incluirCoordinador ? TARIFA_COORDINADOR_HORA * horas : 0;
  const costeGasoil = (CONSUMO_LITROS_100KM / 100) * 100 * PRECIO_GASOIL_LITRO * numVehiculos;
  
  return {
   horas,
   costeConductor: Math.round(costeConductor),
   costeCoordinador: Math.round(costeCoordinador),
   costeGasoil,
   litrosGasoil: (CONSUMO_LITROS_100KM / 100) * 100 * numVehiculos,
   total: Math.round(costeConductor + costeCoordinador + costeGasoil),
   detalle: `${horas}h × ${numVehiculos} veh`
  };
 }, [nuevoServicio, incluirCoordinador]);

 // Stats
 const stats = useMemo(() => ({
  activos: servicios.filter(s => ['planificando', 'asignado', 'en_curso'].includes(s.estado)).length,
  pendientes: servicios.filter(s => ['solicitud', 'presupuesto', 'negociacion'].includes(s.estado)).length,
  completados: servicios.filter(s => s.estado === 'completado').length,
  facturados: servicios.filter(s => s.estado === 'facturado').length,
  totalFacturacion: servicios.filter(s => s.estado === 'facturado').reduce((sum, s) => sum + (s.precio || 0), 0),
 }), [servicios]);

 // Filter
 const serviciosFiltrados = useMemo(() => {
  return servicios.filter(servicio => {
   const searchLower = searchQuery.toLowerCase().trim();
   const matchesSearch = searchLower === '' ||
    servicio.titulo?.toLowerCase().includes(searchLower) ||
    servicio.codigo?.toLowerCase().includes(searchLower) ||
    servicio.clienteNombre?.toLowerCase().includes(searchLower);
   const matchesEstado = estadoFiltro === 'todos' || servicio.estado === estadoFiltro;
   const matchesTipo = tipoFiltro === 'todos' || servicio.tipo === tipoFiltro;
   return matchesSearch && matchesEstado && matchesTipo;
  });
 }, [servicios, searchQuery, estadoFiltro, tipoFiltro]);

 const handleCloseDialog = () => {
  setIsNuevoServicioOpen(false);
  setNuevoServicio({
   tipo: 'lanzadera',
   estado: 'planificando',
   numeroVehiculos: 1,
   fechaInicio: format(new Date(), 'yyyy-MM-dd'),
  });
  setAutoAsignarConductor(false);
  setAutoAsignarVehiculo(false);
  setIncluirCoordinador(false);
 };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!nuevoServicio.clienteId || !nuevoServicio.titulo || !nuevoServicio.fechaInicio) {
   showToast('Complete los campos obligatorios (*)', 'error');
   return;
  }

  setIsSubmitting(true);

  try {
   const cliente = clientes.find(c => String(c.id) === nuevoServicio.clienteId);
   
   const servicioData = {
    codigo: `SRV-${Date.now().toString().slice(-6)}`,
    clienteId: nuevoServicio.clienteId,
    clienteNombre: cliente?.nombre || 'Cliente',
    tipo: nuevoServicio.tipo,
    estado: 'planificando',
    titulo: nuevoServicio.titulo,
    descripcion: nuevoServicio.descripcion,
    fechaInicio: new Date(`${nuevoServicio.fechaInicio}T${nuevoServicio.horaInicio || '00:00'}`).toISOString(),
    fechaFin: nuevoServicio.fechaFin 
     ? new Date(`${nuevoServicio.fechaFin}T${nuevoServicio.horaFin || '23:59'}`).toISOString()
     : null,
    horaInicio: nuevoServicio.horaInicio,
    horaFin: nuevoServicio.horaFin,
    origen: nuevoServicio.origen,
    destino: nuevoServicio.destino,
    numeroVehiculos: nuevoServicio.numeroVehiculos || 1,
    vehiculosAsignados: autoAsignarVehiculo && vehiculoDisponible ? [String(vehiculoDisponible.id)] : [],
    conductoresAsignados: autoAsignarConductor && conductorDisponible ? [String(conductorDisponible.id)] : [],
    precio: nuevoServicio.precio || 0,
    costeEstimado: costesEstimados?.total || 0,
    costeReal: null,
    facturado: false,
    notasInternas: `Auto-calc: ${costesEstimados?.detalle || 'N/A'}`,
    tareas: [
     { id: `t${Date.now()}-1`, nombre: 'Recopilar información del evento', completada: false },
     { id: `t${Date.now()}-2`, nombre: 'Planificar rutas', completada: false },
     { id: `t${Date.now()}-3`, nombre: 'Asignar conductores', completada: autoAsignarConductor },
     { id: `t${Date.now()}-4`, nombre: 'Preparar vehículos', completada: autoAsignarVehiculo },
     { id: `t${Date.now()}-5`, nombre: 'Confirmar detalles con cliente', completada: false },
    ],
   };

   const success = await addServicio(servicioData);

   if (success) {
    handleCloseDialog();
    showToast('Servicio creado correctamente', 'success');
   } else {
    showToast('Error al crear el servicio', 'error');
   }
  } catch (err: any) {
   showToast(`Error: ${err.message || 'Desconocido'}`, 'error');
  } finally {
   setIsSubmitting(false);
  }
 };

 const handleEliminarServicio = async (id: string | number, e: React.MouseEvent) => {
  e.stopPropagation();
  if (!window.confirm('¿Eliminar este servicio?')) return;
  try {
   const success = await deleteServicio(String(id));
   if (success) {
    showToast('Servicio eliminado', 'success');
    if (servicioSeleccionado?.id === String(id)) {
     setIsDetalleOpen(false);
     setServicioSeleccionado(null);
    }
   }
  } catch (err: any) {
   showToast(`Error: ${err.message}`, 'error');
  }
 };

 const verDetalle = (servicio: Servicio) => {
  setServicioSeleccionado(servicio);
  setIsDetalleOpen(true);
 };

 const abrirEditar = (servicio: Servicio, e: React.MouseEvent) => {
  e.stopPropagation();
  setServicioSeleccionado(servicio);
  setIsEditarOpen(true);
 };

 const getProgresoTareas = useCallback((servicio: Servicio) => {
  if (!servicio.tareas?.length) return 0;
  return Math.round((servicio.tareas.filter(t => t.completada).length / servicio.tareas.length) * 100);
 }, []);

 const getMargen = useCallback((servicio: Servicio) => (servicio.precio || 0) - (servicio.costeEstimado || 0), []);

 if (isLoading && servicios.length === 0) {
  return (
   <div className="flex items-center justify-center h-96">
    <Loader2 className="h-12 w-12 animate-spin text-[#1e3a5f] dark:text-blue-400" />
   </div>
  );
 }

 return (
  <div className="space-y-6">
   {/* Header */}
   <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
     <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Servicios</h1>
     <p className="text-slate-500 dark:text-slate-400">Gestión de proyectos de transporte</p>
    </div>
    <Button 
     onClick={() => setIsNuevoServicioOpen(true)}
     className="bg-[#1e3a5f] hover:bg-[#152a45] shadow-sm"
    >
     <Plus className="mr-2 h-4 w-4" />
     Nuevo Servicio
    </Button>
   </div>

   {/* Dialog Nuevo */}
   <Dialog open={isNuevoServicioOpen} onOpenChange={setIsNuevoServicioOpen}>
    <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
     <DialogHeader>
      <DialogTitle>Nuevo Servicio</DialogTitle>
      <DialogDescription>Complete la información. Campos * obligatorios.</DialogDescription>
     </DialogHeader>

     <form onSubmit={handleSubmit} className="space-y-4 py-4">
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

      <div className="space-y-2">
       <Label>Título *</Label>
       <Input
        value={nuevoServicio.titulo || ''}
        onChange={(e) => setNuevoServicio(prev => ({...prev, titulo: e.target.value}))}
        placeholder="Ej: Transporte evento corporativo"
       />
      </div>

      <div className="space-y-2">
       <Label>Descripción</Label>
       <Textarea
        value={nuevoServicio.descripcion || ''}
        onChange={(e) => setNuevoServicio(prev => ({...prev, descripcion: e.target.value}))}
        placeholder="Detalles del servicio..."
        rows={2}
       />
      </div>

      <div className="grid grid-cols-2 gap-4">
       <div className="space-y-2">
        <Label>Fecha Inicio *</Label>
        <Input
         type="date"
         value={dateToString(nuevoServicio.fechaInicio)}
         onChange={(e) => setNuevoServicio(prev => ({...prev, fechaInicio: e.target.value}))}
        />
       </div>
       <div className="space-y-2">
        <Label>Fecha Fin</Label>
        <Input
         type="date"
         value={dateToString(nuevoServicio.fechaFin)}
         onChange={(e) => setNuevoServicio(prev => ({...prev, fechaFin: e.target.value}))}
        />
       </div>
      </div>

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
        <Label className="text-slate-500 dark:text-slate-400">Coste Auto (€)</Label>
        <Input
         type="number"
         value={costesEstimados?.total.toFixed(2) || '0'}
         disabled
         className="bg-slate-50"
        />
       </div>
      </div>

      <DialogFooter>
       <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={isSubmitting}>
        Cancelar
       </Button>
       <Button type="submit" disabled={isSubmitting} className="bg-[#1e3a5f] hover:bg-[#152a45]">
        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Creando...</> : 'Crear Servicio'}
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

   {/* Table - FIX: Botones directos en lugar de DropdownMenu */}
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
         <TableRow 
          key={servicio.id} 
          className="hover:bg-slate-50 cursor-pointer"
          onClick={() => verDetalle(servicio)}
         >
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
          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
           <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => verDetalle(servicio)} title="Ver">
             <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={(e) => abrirEditar(servicio, e)} title="Editar">
             <Edit className="h-4 w-4" />
            </Button>
            {!servicio.facturado && servicio.estado === 'completado' && (
             <Link to={`/facturacion/nueva?servicio=${servicio.id}`} onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" title="Facturar">
               <FileText className="h-4 w-4 text-green-600" />
              </Button>
             </Link>
            )}
            <Button variant="ghost" size="icon" onClick={(e) => handleEliminarServicio(servicio.id, e)} title="Eliminar" className="text-red-600 hover:text-red-700 hover:bg-red-50">
             <Trash2 className="h-4 w-4" />
            </Button>
           </div>
          </TableCell>
         </TableRow>
        ))
       )}
      </TableBody>
     </Table>
    </CardContent>
   </Card>

   {/* Detail Dialog - FIX: Controlado por isDetalleOpen */}
   <Dialog open={isDetalleOpen} onOpenChange={setIsDetalleOpen}>
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
     {servicioSeleccionado && (
      <>
       <DialogHeader>
        <DialogTitle>{servicioSeleccionado.titulo}</DialogTitle>
        <DialogDescription>{servicioSeleccionado.codigo} • {tipoServicioLabels[servicioSeleccionado.tipo]}</DialogDescription>
       </DialogHeader>
       <div className="space-y-6 py-4">
        <div className="grid grid-cols-2 gap-4">
         <div><Label className="text-slate-500 dark:text-slate-400">Cliente</Label><p className="font-medium flex items-center gap-2"><Users className="h-4 w-4 text-slate-400"/>{servicioSeleccionado.clienteNombre || '-'}</p></div>
         <div><Label className="text-slate-500 dark:text-slate-400">Estado</Label><Badge className={estadoServicioColors[servicioSeleccionado.estado]}>{servicioSeleccionado.estado.replace('_', ' ')}</Badge></div>
        </div>
        <div className="grid grid-cols-3 gap-4 rounded-lg bg-slate-50 p-4">
         <div><Label className="text-slate-500 dark:text-slate-400">Coste Estimado</Label><p className="text-lg font-medium">{(servicioSeleccionado.costeEstimado || 0).toLocaleString('es-ES')}€</p></div>
         <div><Label className="text-slate-500 dark:text-slate-400">Precio</Label><p className="text-lg font-medium">{(servicioSeleccionado.precio || 0).toLocaleString('es-ES')}€</p></div>
         <div><Label className="text-slate-500 dark:text-slate-400">Margen</Label><p className={`text-lg font-medium ${getMargen(servicioSeleccionado) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{getMargen(servicioSeleccionado).toLocaleString('es-ES')}€</p></div>
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
       <DialogFooter>
        <Button variant="outline" onClick={() => setIsDetalleOpen(false)}>Cerrar</Button>
        {!servicioSeleccionado.facturado && servicioSeleccionado.estado === 'completado' && (
         <Link to={`/facturacion/nueva?servicio=${servicioSeleccionado.id}`}>
          <Button className="bg-[#1e3a5f] hover:bg-[#152a45]">
           <FileText className="mr-2 h-4 w-4" />
           Facturar
          </Button>
         </Link>
        )}
       </DialogFooter>
      </>
     )}
    </DialogContent>
   </Dialog>
  </div>
 );
}
