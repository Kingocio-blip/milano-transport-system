// ============================================
// MILANO - Servicios Page (OPTIMIZADO)
// ============================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useServiciosStore, useClientesStore, useUIStore } from '../store';
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
DialogTrigger,
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
} from 'lucide-react';
import type { Servicio, TipoServicio, EstadoServicio } from '../types';
import { format, isValid, parseISO } from 'date-fns';
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

// Helper para formatear fechas de forma segura
const formatDateSafe = (date: string | Date | undefined, formatStr: string = 'dd/MM/yyyy'): string => {
if (!date) return '-';
try {
const parsed = typeof date === 'string' ? parseISO(date) : date;
return isValid(parsed) ? format(parsed, formatStr) : '-';
} catch {
return '-';
}
};

export default function Servicios() {
const { servicios, addServicio, deleteServicio, fetchServicios, isLoading, error } = useServiciosStore();
const { clientes, fetchClientes } = useClientesStore();
const { showToast } = useUIStore();

const [searchQuery, setSearchQuery] = useState('');
const [estadoFiltro, setEstadoFiltro] = useState<EstadoServicio | 'todos'>('todos');
const [tipoFiltro, setTipoFiltro] = useState<TipoServicio | 'todos'>('todos');
const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null);
const [isNuevoServicioOpen, setIsNuevoServicioOpen] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);

// Estado inicial del formulario
const initialServicioState: Partial<Servicio> = {
tipo: 'discrecional',
estado: 'planificando',
numeroVehiculos: 1,
};

const [nuevoServicio, setNuevoServicio] = useState<Partial<Servicio>>(initialServicioState);

// Cargar datos al montar
useEffect(() => {
fetchServicios();
fetchClientes();
}, [fetchServicios, fetchClientes]);

// Mostrar error del store si existe
useEffect(() => {
if (error) {
showToast(error, 'error');
}
}, [error, showToast]);

// Filtrar servicios con useMemo para optimizar
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

// Estadísticas con useMemo
const stats = useMemo(() => ({
activos: servicios.filter(s => s.estado === 'en_curso' || s.estado === 'asignado').length,
pendientes: servicios.filter(s => s.estado === 'planificando' || s.estado === 'confirmado').length,
completados: servicios.filter(s => s.estado === 'completado').length,
facturados: servicios.filter(s => s.estado === 'facturado').length,
totalFacturacion: servicios
.filter(s => s.estado === 'facturado')
.reduce((sum, s) => sum + (s.precio || 0), 0),
}), [servicios]);

// Resetear formulario al cerrar dialog
const handleCloseDialog = useCallback(() => {
setIsNuevoServicioOpen(false);
setNuevoServicio(initialServicioState);
}, []);

const handleNuevoServicio = async () => {
// Validaciones
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

// Datos para el backend (snake_case)
const servicioData = {
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
numero_vehiculos: nuevoServicio.numeroVehiculos || 1,
vehiculos_asignados: [],
conductores_asignados: [],
origen: nuevoServicio.origen || null,
destino: nuevoServicio.destino || null,
ubicacion_evento: nuevoServicio.ubicacionEvento || null,
coste_estimado: nuevoServicio.costeEstimado || 0,
coste_real: null,
precio: nuevoServicio.precio || 0,
facturado: false,
factura_id: null,
notas_internas: null,
notas_cliente: null,
rutas: [],
tareas: [
{ id: `t${Date.now()}-1`, nombre: 'Recopilar información del evento', completada: false },
{ id: `t${Date.now()}-2`, nombre: 'Planificar rutas', completada: false },
{ id: `t${Date.now()}-3`, nombre: 'Asignar conductores', completada: false },
{ id: `t${Date.now()}-4`, nombre: 'Preparar vehículos', completada: false },
],
incidencias: [],
documentos: [],
};

const success = await addServicio(servicioData);

if (success) {
handleCloseDialog();
showToast('Servicio creado correctamente', 'success');
} else {
showToast('Error al crear el servicio', 'error');
}
} catch (err: any) {
console.error('Error creando servicio:', err);
showToast(`Error: ${err.message || 'Desconocido'}`, 'error');
} finally {
setIsSubmitting(false);
}
};

const handleEliminarServicio = async (id: string | number) => {
if (!window.confirm('¿Está seguro de eliminar este servicio?')) return;

try {
const success = await deleteServicio(String(id));
if (success) {
showToast('Servicio eliminado', 'success');
if (servicioSeleccionado?.id === String(id)) {
setServicioSeleccionado(null);
}
} else {
showToast('Error al eliminar el servicio', 'error');
}
} catch (err: any) {
showToast(`Error: ${err.message}`, 'error');
}
};

const getProgresoTareas = useCallback((servicio: Servicio) => {
if (!servicio.tareas?.length) return 0;
const completadas = servicio.tareas.filter(t => t.completada).length;
return Math.round((completadas / servicio.tareas.length) * 100);
}, []);

const getMargen = useCallback((servicio: Servicio) => {
return (servicio.precio || 0) - (servicio.costeEstimado || 0);
}, []);

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
<Dialog open={isNuevoServicioOpen} onOpenChange={setIsNuevoServicioOpen}>
<DialogTrigger asChild>
<Button className="bg-[#1e3a5f] hover:bg-[#152a45] shadow-sm">
<Plus className="mr-2 h-4 w-4" />
Nuevo Servicio
</Button>
</DialogTrigger>
<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
<DialogHeader>
<DialogTitle>Nuevo Servicio</DialogTitle>
<DialogDescription>
Complete la información del nuevo servicio. Los campos con * son obligatorios.
</DialogDescription>
</DialogHeader>

<div className="space-y-4 py-4">
{/* Cliente y Tipo */}
<div className="grid grid-cols-2 gap-4">
<div className="space-y-2">
<Label htmlFor="cliente">Cliente *</Label>
<Select
value={String(nuevoServicio.clienteId || '')}
onValueChange={(v) => setNuevoServicio(prev => ({...prev, clienteId: v}))}
>
<SelectTrigger id="cliente">
<SelectValue placeholder="Seleccionar cliente" />
</SelectTrigger>
<SelectContent>
{clientes.filter(c => c.estado === 'activo').map(cliente => (
<SelectItem key={cliente.id} value={String(cliente.id)}>
{cliente.nombre}
</SelectItem>
))}
</SelectContent>
</Select>
</div>
<div className="space-y-2">
<Label htmlFor="tipo">Tipo de Servicio *</Label>
<Select
value={nuevoServicio.tipo}
onValueChange={(v) => setNuevoServicio(prev => ({...prev, tipo: v as TipoServicio}))}
>
<SelectTrigger id="tipo">
<SelectValue />
</SelectTrigger>
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
<Label htmlFor="titulo">Título del Servicio *</Label>
<Input
id="titulo"
value={nuevoServicio.titulo || ''}
onChange={(e) => setNuevoServicio(prev => ({...prev, titulo: e.target.value}))}
placeholder="Ej: Transporte evento corporativo"
/>
</div>

{/* Descripción */}
<div className="space-y-2">
<Label htmlFor="descripcion">Descripción</Label>
<Textarea
id="descripcion"
value={nuevoServicio.descripcion || ''}
onChange={(e) => setNuevoServicio(prev => ({...prev, descripcion: e.target.value}))}
placeholder="Detalles adicionales del servicio..."
rows={2}
/>
</div>

{/* Fechas */}
<div className="grid grid-cols-2 gap-4">
<div className="space-y-2">
<Label htmlFor="fechaInicio">Fecha Inicio *</Label>
<Input
id="fechaInicio"
type="date"
value={nuevoServicio.fechaInicio ? format(new Date(nuevoServicio.fechaInicio), 'yyyy-MM-dd') : ''}
onChange={(e) => setNuevoServicio(prev => ({...prev, fechaInicio: e.target.value}))}
/>
</div>
<div className="space-y-2">
<Label htmlFor="fechaFin">Fecha Fin</Label>
<Input
id="fechaFin"
type="date"
value={nuevoServicio.fechaFin ? format(new Date(nuevoServicio.fechaFin), 'yyyy-MM-dd') : ''}
onChange={(e) => setNuevoServicio(prev => ({...prev, fechaFin: e.target.value}))}
/>
</div>
</div>

{/* Horas */}
<div className="grid grid-cols-2 gap-4">
<div className="space-y-2">
<Label htmlFor="horaInicio">Hora Inicio</Label>
<Input
id="horaInicio"
type="time"
value={nuevoServicio.horaInicio || ''}
onChange={(e) => setNuevoServicio(prev => ({...prev, horaInicio: e.target.value}))}
/>
</div>
<div className="space-y-2">
<Label htmlFor="horaFin">Hora Fin</Label>
<Input
id="horaFin"
type="time"
value={nuevoServicio.horaFin || ''}
onChange={(e) => setNuevoServicio(prev => ({...prev, horaFin: e.target.value}))}
/>
</div>
</div>

{/* Origen y Destino */}
<div className="grid grid-cols-2 gap-4">
<div className="space-y-2">
<Label htmlFor="origen" className="flex items-center gap-1">
<MapPin className="h-3 w-3" />
Origen
</Label>
<Input
id="origen"
value={nuevoServicio.origen || ''}
onChange={(e) => setNuevoServicio(prev => ({...prev, origen: e.target.value}))}
placeholder="Dirección de origen"
/>
</div>
<div className="space-y-2">
<Label htmlFor="destino" className="flex items-center gap-1">
<MapPin className="h-3 w-3" />
Destino
</Label>
<Input
id="destino"
value={nuevoServicio.destino || ''}
onChange={(e) => setNuevoServicio(prev => ({...prev, destino: e.target.value}))}
placeholder="Dirección de destino"
/>
</div>
</div>

{/* Vehículos y Precios */}
<div className="grid grid-cols-3 gap-4">
<div className="space-y-2">
<Label htmlFor="vehiculos" className="flex items-center gap-1">
<Truck className="h-3 w-3" />
Nº Vehículos
</Label>
<Input
id="vehiculos"
type="number"
min={1}
value={nuevoServicio.numeroVehiculos}
onChange={(e) => setNuevoServicio(prev => ({...prev, numeroVehiculos: parseInt(e.target.value) || 1}))}
/>
</div>
<div className="space-y-2">
<Label htmlFor="coste">Coste Estimado (€)</Label>
<Input
id="coste"
type="number"
min={0}
value={nuevoServicio.costeEstimado || ''}
onChange={(e) => setNuevoServicio(prev => ({...prev, costeEstimado: parseFloat(e.target.value) || 0}))}
/>
</div>
<div className="space-y-2">
<Label htmlFor="precio">Precio Cliente (€)</Label>
<Input
id="precio"
type="number"
min={0}
value={nuevoServicio.precio || ''}
onChange={(e) => setNuevoServicio(prev => ({...prev, precio: parseFloat(e.target.value) || 0}))}
/>
</div>
</div>

{/* Preview de margen */}
{(nuevoServicio.precio || 0) > 0 && (
<div className={`p-3 rounded-lg ${
((nuevoServicio.precio || 0) - (nuevoServicio.costeEstimado || 0)) >= 0
? 'bg-green-50 border border-green-200'
: 'bg-red-50 border border-red-200'
}`}>
<div className="flex justify-between items-center">
<span className="text-sm font-medium">Margen estimado:</span>
<span className={`font-bold ${
((nuevoServicio.precio || 0) - (nuevoServicio.costeEstimado || 0)) >= 0
? 'text-green-700'
: 'text-red-700'
}`}>
{((nuevoServicio.precio || 0) - (nuevoServicio.costeEstimado || 0)).toLocaleString('es-ES')}€
{' '}
({nuevoServicio.costeEstimado
? Math.round(((nuevoServicio.precio || 0) - (nuevoServicio.costeEstimado || 0)) / (nuevoServicio.costeEstimado || 1) * 100)
: 0}%)
</span>
</div>
</div>
)}
</div>

<DialogFooter>
<Button variant="outline" onClick={handleCloseDialog} disabled={isSubmitting}>
Cancelar
</Button>
<Button
onClick={handleNuevoServicio}
disabled={isSubmitting}
className="bg-[#1e3a5f] hover:bg-[#152a45]"
>
{isSubmitting ? (
<>
<Loader2 className="mr-2 h-4 w-4 animate-spin" />
Creando...
</>
) : (
'Crear Servicio'
)}
</Button>
</DialogFooter>
</DialogContent>
</Dialog>
</div>

{/* Stats Cards */}
<div className="grid gap-4 md:grid-cols-5">
<Card>
<CardContent className="p-6">
<div className="flex items-center justify-between">
<div>
<p className="text-sm font-medium text-slate-500">Activos</p>
<p className="text-3xl font-bold">{stats.activos}</p>
</div>
<div className="rounded-full bg-green-100 p-3">
<Briefcase className="h-6 w-6 text-green-600" />
</div>
</div>
</CardContent>
</Card>
<Card>
<CardContent className="p-6">
<div className="flex items-center justify-between">
<div>
<p className="text-sm font-medium text-slate-500">Pendientes</p>
<p className="text-3xl font-bold">{stats.pendientes}</p>
</div>
<div className="rounded-full bg-amber-100 p-3">
<Clock className="h-6 w-6 text-amber-600" />
</div>
</div>
</CardContent>
</Card>
<Card>
<CardContent className="p-6">
<div className="flex items-center justify-between">
<div>
<p className="text-sm font-medium text-slate-500">Completados</p>
<p className="text-3xl font-bold">{stats.completados}</p>
</div>
<div className="rounded-full bg-blue-100 p-3">
<CheckCircle2 className="h-6 w-6 text-blue-600" />
</div>
</div>
</CardContent>
</Card>
<Card>
<CardContent className="p-6">
<div className="flex items-center justify-between">
<div>
<p className="text-sm font-medium text-slate-500">Facturados</p>
<p className="text-3xl font-bold">{stats.facturados}</p>
</div>
<div className="rounded-full bg-emerald-100 p-3">
<Euro className="h-6 w-6 text-emerald-600" />
</div>
</div>
</CardContent>
</Card>
<Card>
<CardContent className="p-6">
<div className="flex items-center justify-between">
<div>
<p className="text-sm font-medium text-slate-500">Facturación Total</p>
<p className="text-2xl font-bold">{(stats.totalFacturacion).toLocaleString('es-ES')}€</p>
</div>
<div className="rounded-full bg-purple-100 p-3">
<Euro className="h-6 w-6 text-purple-600" />
</div>
</div>
</CardContent>
</Card>
</div>

{/* Filters */}
<div className="flex flex-wrap gap-4">
<div className="relative flex-1 min-w-[200px] max-w-sm">
<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
<Input
placeholder="Buscar servicios..."
value={searchQuery}
onChange={(e) => setSearchQuery(e.target.value)}
className="pl-10"
/>
</div>
<Select value={estadoFiltro} onValueChange={(v) => setEstadoFiltro(v as EstadoServicio | 'todos')}>
<SelectTrigger className="w-48">
<Filter className="mr-2 h-4 w-4" />
<SelectValue placeholder="Estado" />
</SelectTrigger>
<SelectContent>
<SelectItem value="todos">Todos los estados</SelectItem>
<SelectItem value="solicitud">Solicitud</SelectItem>
<SelectItem value="presupuesto">Presupuesto</SelectItem>
<SelectItem value="negociacion">Negociación</SelectItem>
<SelectItem value="confirmado">Confirmado</SelectItem>
<SelectItem value="planificando">Planificando</SelectItem>
<SelectItem value="asignado">Asignado</SelectItem>
<SelectItem value="en_curso">En Curso</SelectItem>
<SelectItem value="completado">Completado</SelectItem>
<SelectItem value="facturado">Facturado</SelectItem>
<SelectItem value="cancelado">Cancelado</SelectItem>
</SelectContent>
</Select>
<Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v as TipoServicio | 'todos')}>
<SelectTrigger className="w-48">
<Truck className="mr-2 h-4 w-4" />
<SelectValue placeholder="Tipo" />
</SelectTrigger>
<SelectContent>
<SelectItem value="todos">Todos los tipos</SelectItem>
<SelectItem value="lanzadera">Lanzadera</SelectItem>
<SelectItem value="discrecional">Discrecional</SelectItem>
<SelectItem value="staff">Movilidad Staff</SelectItem>
<SelectItem value="ruta_programada">Ruta Programada</SelectItem>
</SelectContent>
</Select>
</div>

{/* Services Table */}
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
<TableRow>
<TableCell colSpan={7} className="text-center py-8">
<Loader2 className="h-8 w-8 animate-spin mx-auto text-[#1e3a5f]" />
</TableCell>
</TableRow>
) : serviciosFiltrados.length === 0 ? (
<TableRow>
<TableCell colSpan={7} className="text-center py-8 text-slate-500">
{searchQuery || estadoFiltro !== 'todos' || tipoFiltro !== 'todos'
? 'No se encontraron servicios con los filtros aplicados'
: 'No hay servicios registrados'}
</TableCell>
</TableRow>
) : (
serviciosFiltrados.map((servicio) => (
<TableRow key={servicio.id} className="hover:bg-slate-50">
<TableCell className="font-medium">{servicio.codigo}</TableCell>
<TableCell>
<div>
<p className="font-medium">{servicio.titulo}</p>
<Badge variant="outline" className="text-xs mt-1">
{tipoServicioLabels[servicio.tipo]}
</Badge>
</div>
</TableCell>
<TableCell>
<div className="flex items-center gap-1">
<Users className="h-3 w-3 text-slate-400" />
{servicio.clienteNombre || '-'}
</div>
</TableCell>
<TableCell>
<div className="flex flex-col gap-1 text-sm">
<span className="flex items-center gap-1">
<Calendar className="h-3 w-3 text-slate-400" />
{formatDateSafe(servicio.fechaInicio)}
</span>
{servicio.horaInicio && (
<span className="flex items-center gap-1 text-slate-500">
<Clock className="h-3 w-3" />
{servicio.horaInicio}
</span>
)}
</div>
</TableCell>
<TableCell>
<Badge className={estadoServicioColors[servicio.estado]}>
{servicio.estado.replace('_', ' ')}
</Badge>
</TableCell>
<TableCell>
<div className="w-24">
<Progress value={getProgresoTareas(servicio)} className="h-2" />
<span className="text-xs text-slate-500">
{getProgresoTareas(servicio)}%
</span>
</div>
</TableCell>
<TableCell className="text-right">
<DropdownMenu>
<DropdownMenuTrigger asChild>
<Button variant="ghost" size="icon">
<MoreVertical className="h-4 w-4" />
</Button>
</DropdownMenuTrigger>
<DropdownMenuContent align="end">
<DropdownMenuItem onClick={() => setServicioSeleccionado(servicio)}>
<Eye className="mr-2 h-4 w-4" />
Ver detalles
</DropdownMenuItem>
<DropdownMenuItem>
<Edit className="mr-2 h-4 w-4" />
Editar
</DropdownMenuItem>
{!servicio.facturado && servicio.estado === 'completado' && (
<DropdownMenuItem asChild>
<Link to={`/facturacion/nueva?servicio=${servicio.id}`}>
<Euro className="mr-2 h-4 w-4" />
Facturar
</Link>
</DropdownMenuItem>
)}
<DropdownMenuItem
className="text-red-600"
onClick={() => handleEliminarServicio(servicio.id)}
>
<Trash2 className="mr-2 h-4 w-4" />
Eliminar
</DropdownMenuItem>
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

{/* Service Detail Dialog */}
<Dialog open={!!servicioSeleccionado} onOpenChange={() => setServicioSeleccionado(null)}>
<DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
{servicioSeleccionado && (
<>
<DialogHeader>
<DialogTitle>{servicioSeleccionado.titulo}</DialogTitle>
<DialogDescription>
{servicioSeleccionado.codigo} • {tipoServicioLabels[servicioSeleccionado.tipo]}
</DialogDescription>
</DialogHeader>

<div className="space-y-6 py-4">
{/* Info General */}
<div className="grid grid-cols-2 gap-4">
<div className="space-y-1">
<Label className="text-slate-500">Cliente</Label>
<p className="font-medium flex items-center gap-2">
<Users className="h-4 w-4 text-slate-400" />
{servicioSeleccionado.clienteNombre || '-'}
</p>
</div>
<div className="space-y-1">
<Label className="text-slate-500">Estado</Label>
<div>
<Badge className={estadoServicioColors[servicioSeleccionado.estado]}>
{servicioSeleccionado.estado.replace('_', ' ')}
</Badge>
</div>
</div>
</div>

{/* Fechas */}
<div className="grid grid-cols-2 gap-4">
<div className="space-y-1">
<Label className="text-slate-500">Fecha Inicio</Label>
<p className="flex items-center gap-2">
<Calendar className="h-4 w-4 text-slate-400" />
{formatDateSafe(servicioSeleccionado.fechaInicio)}
{servicioSeleccionado.horaInicio && ` a las ${servicioSeleccionado.horaInicio}`}
</p>
</div>
<div className="space-y-1">
<Label className="text-slate-500">Fecha Fin</Label>
<p className="flex items-center gap-2">
<Calendar className="h-4 w-4 text-slate-400" />
{formatDateSafe(servicioSeleccionado.fechaFin)}
{servicioSeleccionado.horaFin && ` a las ${servicioSeleccionado.horaFin}`}
</p>
</div>
</div>

{/* Origen/Destino */}
{(servicioSeleccionado.origen || servicioSeleccionado.destino) && (
<div className="grid grid-cols-2 gap-4">
{servicioSeleccionado.origen && (
<div className="space-y-1">
<Label className="text-slate-500 flex items-center gap-1">
<MapPin className="h-3 w-3" />
Origen
</Label>
<p>{servicioSeleccionado.origen}</p>
</div>
)}
{servicioSeleccionado.destino && (
<div className="space-y-1">
<Label className="text-slate-500 flex items-center gap-1">
<MapPin className="h-3 w-3" />
Destino
</Label>
<p>{servicioSeleccionado.destino}</p>
</div>
)}
</div>
)}

{/* Asignaciones */}
<div className="grid grid-cols-2 gap-4">
<div className="space-y-1">
<Label className="text-slate-500 flex items-center gap-1">
<Truck className="h-3 w-3" />
Vehículos
</Label>
<p>{servicioSeleccionado.vehiculosAsignados?.length || 0} / {servicioSeleccionado.numeroVehiculos || 0} asignados</p>
</div>
<div className="space-y-1">
<Label className="text-slate-500 flex items-center gap-1">
<Users className="h-3 w-3" />
Conductores
</Label>
<p>{servicioSeleccionado.conductoresAsignados?.length || 0} asignados</p>
</div>
</div>

{/* Financiero */}
<div className="grid grid-cols-3 gap-4 rounded-lg bg-slate-50 p-4">
<div>
<Label className="text-slate-500">Coste Estimado</Label>
<p className="text-lg font-medium">{(servicioSeleccionado.costeEstimado || 0).toLocaleString('es-ES')}€</p>
</div>
<div>
<Label className="text-slate-500">Precio Cliente</Label>
<p className="text-lg font-medium">{(servicioSeleccionado.precio || 0).toLocaleString('es-ES')}€</p>
</div>
<div>
<Label className="text-slate-500">Margen</Label>
<p className={`text-lg font-medium ${
getMargen(servicioSeleccionado) >= 0 ? 'text-green-600' : 'text-red-600'
}`}>
{getMargen(servicioSeleccionado).toLocaleString('es-ES')}€
</p>
</div>
</div>

{/* Descripción */}
{servicioSeleccionado.descripcion && (
<div className="space-y-1">
<Label className="text-slate-500">Descripción</Label>
<p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
{servicioSeleccionado.descripcion}
</p>
</div>
)}

{/* Tareas */}
{servicioSeleccionado.tareas && servicioSeleccionado.tareas.length > 0 && (
<div>
<Label className="text-slate-500 mb-2 block">Tareas ({getProgresoTareas(servicioSeleccionado)}% completadas)</Label>
<div className="space-y-2">
{servicioSeleccionado.tareas.map((tarea) => (
<div
key={tarea.id}
className={`flex items-center gap-3 p-2 rounded-lg ${
tarea.completada ? 'bg-green-50' : 'bg-slate-50'
}`}
>
<div className={`h-5 w-5 rounded-full flex items-center justify-center ${
tarea.completada ? 'bg-green-500 text-white' : 'bg-slate-300'
}`}>
{tarea.completada && <CheckCircle2 className="h-3 w-3" />}
</div>
<span className={tarea.completada ? 'line-through text-slate-500' : ''}>
{tarea.nombre}
</span>
</div>
))}
</div>
</div>
)}

{/* Incidencias */}
{servicioSeleccionado.incidencias && servicioSeleccionado.incidencias.length > 0 && (
<div>
<Label className="text-slate-500 mb-2 block text-red-600">Incidencias</Label>
<div className="space-y-2">
{servicioSeleccionado.incidencias.map((incidencia) => (
<div key={incidencia.id} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
<AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
<div>
<p className="font-medium text-red-700">{incidencia.tipo}</p>
<p className="text-sm text-red-600">{incidencia.descripcion}</p>
<p className="text-xs text-red-500 mt-1">
{formatDateSafe(incidencia.fecha, 'dd/MM/yyyy HH:mm')}
</p>
</div>
</div>
))}
</div>
</div>
)}
</div>

<DialogFooter className="gap-2">
{!servicioSeleccionado.facturado && servicioSeleccionado.estado === 'completado' && (
<Button asChild className="bg-[#1e3a5f] hover:bg-[#152a45]">
<Link to={`/facturacion/nueva?servicio=${servicioSeleccionado.id}`}>
<Euro className="mr-2 h-4 w-4" />
Generar Factura
</Link>
</Button>
)}
</DialogFooter>
</>
)}
</DialogContent>
</Dialog>
</div>
);
}