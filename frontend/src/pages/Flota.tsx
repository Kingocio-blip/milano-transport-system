// ============================================
// MILANO - Flota Page (OPTIMIZADO)
// ============================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useVehiculosStore, useUIStore } from '../store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
DialogTrigger,
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
Bus,
Search,
Plus,
MoreVertical,
Edit,
Trash2,
Eye,
Calendar,
AlertTriangle,
CheckCircle2,
Wrench,
Gauge,
Fuel,
Users,
Loader2,
MapPin,
FileText,
} from 'lucide-react';
import type { Vehiculo, TipoVehiculo, EstadoVehiculo } from '../types';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

const tipoVehiculoLabels: Record<TipoVehiculo, string> = {
autobus: 'Autobús',
minibus: 'Minibús',
furgoneta: 'Furgoneta',
coche: 'Coche',
};

const estadoVehiculoColors: Record<EstadoVehiculo, string> = {
operativo: 'bg-green-100 text-green-700',
taller: 'bg-amber-100 text-amber-700',
reservado: 'bg-purple-100 text-purple-700',
baja: 'bg-red-100 text-red-700',
};

// Helper seguro para fechas
const safeParseDate = (date: string | Date | undefined): Date | null => {
if (!date) return null;
try {
const parsed = typeof date === 'string' ? parseISO(date) : date;
return isValid(parsed) ? parsed : null;
} catch {
return null;
}
};

export default function Flota() {
const { vehiculos, isLoading, error, addVehiculo, updateVehiculo, deleteVehiculo, fetchVehiculos } = useVehiculosStore();
const { showToast } = useUIStore();

const [searchQuery, setSearchQuery] = useState('');
const [estadoFiltro, setEstadoFiltro] = useState<EstadoVehiculo | 'todos'>('todos');
const [tipoFiltro, setTipoFiltro] = useState<TipoVehiculo | 'todos'>('todos');
const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<Vehiculo | null>(null);
const [isNuevoVehiculoOpen, setIsNuevoVehiculoOpen] = useState(false);
const [isEditarOpen, setIsEditarOpen] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);

// Estado inicial del formulario
const initialVehiculoState = {
tipo: 'autobus' as TipoVehiculo,
estado: 'operativo' as EstadoVehiculo,
plazas: 55,
combustible: 'diesel' as const,
kilometraje: 0,
};

const [nuevoVehiculo, setNuevoVehiculo] = useState<Partial<Vehiculo>>(initialVehiculoState);

// Refrescar datos al montar
useEffect(() => {
fetchVehiculos();
}, [fetchVehiculos]);

// Mostrar errores del store
useEffect(() => {
if (error) {
showToast(error, 'error');
}
}, [error, showToast]);

// Filtrar vehículos con useMemo
const vehiculosFiltrados = useMemo(() => {
return vehiculos.filter(vehiculo => {
const searchLower = searchQuery.toLowerCase().trim();
const matchesSearch = searchLower === '' ||
vehiculo.matricula?.toLowerCase().includes(searchLower) ||
vehiculo.marca?.toLowerCase().includes(searchLower) ||
vehiculo.modelo?.toLowerCase().includes(searchLower) ||
vehiculo.bastidor?.toLowerCase().includes(searchLower);
const matchesEstado = estadoFiltro === 'todos' || vehiculo.estado === estadoFiltro;
const matchesTipo = tipoFiltro === 'todos' || vehiculo.tipo === tipoFiltro;
return matchesSearch && matchesEstado && matchesTipo;
});
}, [vehiculos, searchQuery, estadoFiltro, tipoFiltro]);

// Estadísticas con useMemo
const stats = useMemo(() => ({
operativos: vehiculos.filter(v => v.estado === 'operativo').length,
taller: vehiculos.filter(v => v.estado === 'taller').length,
reservados: vehiculos.filter(v => v.estado === 'reservado').length,
baja: vehiculos.filter(v => v.estado === 'baja').length,
totalPlazas: vehiculos.filter(v => v.estado === 'operativo').reduce((sum, v) => sum + (v.plazas || 0), 0),
}), [vehiculos]);

// Vehículos con ITV próxima
const vehiculosITVProxima = useMemo(() => {
return vehiculos.filter(v => {
const fechaProxima = safeParseDate(v.itv?.fechaProxima);
if (!fechaProxima) return false;
const dias = differenceInDays(fechaProxima, new Date());
return dias <= 30 && dias >= 0;
});
}, [vehiculos]);

// Resetear formulario
const resetForm = useCallback(() => {
setNuevoVehiculo(initialVehiculoState);
}, []);

const handleCloseDialog = useCallback(() => {
setIsNuevoVehiculoOpen(false);
resetForm();
}, [resetForm]);

const handleNuevoVehiculo = async () => {
// Validaciones
if (!nuevoVehiculo.matricula?.trim()) {
showToast('La matrícula es obligatoria', 'error');
return;
}
if (!nuevoVehiculo.marca?.trim()) {
showToast('La marca es obligatoria', 'error');
return;
}
if (!nuevoVehiculo.modelo?.trim()) {
showToast('El modelo es obligatorio', 'error');
return;
}

setIsSubmitting(true);

try {
// FIX: Incluir mantenimientos vacío y todos los campos requeridos
const vehiculoData = {
...nuevoVehiculo,
matricula: nuevoVehiculo.matricula.trim(),
marca: nuevoVehiculo.marca.trim(),
modelo: nuevoVehiculo.modelo.trim(),
bastidor: nuevoVehiculo.bastidor?.trim() || '',
codigo: `VH-${Date.now().toString().slice(-6)}`,
mantenimientos: [],
itv: {
fechaUltima: null,
fechaProxima: null,
resultado: null,
observaciones: null,
},
seguro: {
compania: '',
poliza: '',
tipoCobertura: null,
fechaInicio: null,
fechaVencimiento: null,
prima: null,
},
};

const success = await addVehiculo(vehiculoData as any);

if (success) {
handleCloseDialog();
showToast('Vehículo creado correctamente', 'success');
} else {
showToast('Error al crear el vehículo', 'error');
}
} catch (err: any) {
console.error('Error:', err);
showToast(`Error: ${err.message || 'Desconocido'}`, 'error');
} finally {
setIsSubmitting(false);
}
};

const handleEditarVehiculo = async () => {
if (!vehiculoSeleccionado) return;

setIsSubmitting(true);

try {
const success = await updateVehiculo(String(vehiculoSeleccionado.id), vehiculoSeleccionado);
if (success) {
setIsEditarOpen(false);
showToast('Vehículo actualizado correctamente', 'success');
} else {
showToast('Error al actualizar el vehículo', 'error');
}
} catch (err: any) {
showToast(`Error: ${err.message}`, 'error');
} finally {
setIsSubmitting(false);
}
};

const handleEliminarVehiculo = async (id: string | number) => {
if (!window.confirm('¿Está seguro de eliminar este vehículo?')) return;

try {
const success = await deleteVehiculo(String(id));
if (success) {
showToast('Vehículo eliminado', 'success');
if (vehiculoSeleccionado?.id === String(id)) {
setVehiculoSeleccionado(null);
}
} else {
showToast('Error al eliminar el vehículo', 'error');
}
} catch (err: any) {
showToast(`Error: ${err.message}`, 'error');
}
};

const getDiasITV = useCallback((fechaProxima?: string | Date): number | null => {
const parsed = safeParseDate(fechaProxima);
return parsed ? differenceInDays(parsed, new Date()) : null;
}, []);

const formatDateSafe = useCallback((date: string | Date | undefined, formatStr: string = 'dd/MM/yyyy'): string => {
const parsed = safeParseDate(date);
return parsed ? format(parsed, formatStr) : '-';
}, []);

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
<Dialog open={isNuevoVehiculoOpen} onOpenChange={setIsNuevoVehiculoOpen}>
<DialogTrigger asChild>
<Button className="bg-[#1e3a5f] hover:bg-[#152a45]">
<Plus className="mr-2 h-4 w-4" />
Nuevo Vehículo
</Button>
</DialogTrigger>
<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
<DialogHeader>
<DialogTitle>Nuevo Vehículo</DialogTitle>
<DialogDescription>
Complete la información del nuevo vehículo. Los campos con * son obligatorios.
</DialogDescription>
</DialogHeader>
<div className="space-y-4 py-4">
<div className="grid grid-cols-2 gap-4">
<div className="space-y-2">
<Label htmlFor="matricula">Matrícula *</Label>
<Input
id="matricula"
value={nuevoVehiculo.matricula || ''}
onChange={(e) => setNuevoVehiculo(prev => ({...prev, matricula: e.target.value}))}
placeholder="1234 ABC"
/>
</div>
<div className="space-y-2">
<Label htmlFor="bastidor">Nº Bastidor</Label>
<Input
id="bastidor"
value={nuevoVehiculo.bastidor || ''}
onChange={(e) => setNuevoVehiculo(prev => ({...prev, bastidor: e.target.value}))}
placeholder="WVWZZZ..."
/>
</div>
</div>
<div className="grid grid-cols-2 gap-4">
<div className="space-y-2">
<Label htmlFor="marca">Marca *</Label>
<Input
id="marca"
value={nuevoVehiculo.marca || ''}
onChange={(e) => setNuevoVehiculo(prev => ({...prev, marca: e.target.value}))}
placeholder="Mercedes-Benz"
/>
</div>
<div className="space-y-2">
<Label htmlFor="modelo">Modelo *</Label>
<Input
id="modelo"
value={nuevoVehiculo.modelo || ''}
onChange={(e) => setNuevoVehiculo(prev => ({...prev, modelo: e.target.value}))}
placeholder="Tourismo"
/>
</div>
</div>
<div className="grid grid-cols-3 gap-4">
<div className="space-y-2">
<Label htmlFor="tipo">Tipo</Label>
<Select
value={nuevoVehiculo.tipo}
onValueChange={(v) => setNuevoVehiculo(prev => ({...prev, tipo: v as TipoVehiculo}))}
>
<SelectTrigger>
<SelectValue />
</SelectTrigger>
<SelectContent>
<SelectItem value="autobus">Autobús</SelectItem>
<SelectItem value="minibus">Minibús</SelectItem>
<SelectItem value="furgoneta">Furgoneta</SelectItem>
<SelectItem value="coche">Coche</SelectItem>
</SelectContent>
</Select>
</div>
<div className="space-y-2">
<Label htmlFor="plazas">Plazas</Label>
<Input
id="plazas"
type="number"
min={1}
max={100}
value={nuevoVehiculo.plazas}
onChange={(e) => setNuevoVehiculo(prev => ({...prev, plazas: parseInt(e.target.value) || 0}))}
/>
</div>
<div className="space-y-2">
<Label htmlFor="kilometraje">Kilometraje</Label>
<Input
id="kilometraje"
type="number"
min={0}
value={nuevoVehiculo.kilometraje || ''}
onChange={(e) => setNuevoVehiculo(prev => ({...prev, kilometraje: parseInt(e.target.value) || 0}))}
/>
</div>
</div>
<div className="grid grid-cols-2 gap-4">
<div className="space-y-2">
<Label htmlFor="añoFabricacion">Año Fabricación</Label>
<Input
id="añoFabricacion"
type="number"
min={1980}
max={new Date().getFullYear()}
value={nuevoVehiculo.añoFabricacion || ''}
onChange={(e) => setNuevoVehiculo(prev => ({...prev, añoFabricacion: parseInt(e.target.value) || undefined}))}
/>
</div>
<div className="space-y-2">
<Label htmlFor="combustible">Combustible</Label>
<Select
value={nuevoVehiculo.combustible}
onValueChange={(v) => setNuevoVehiculo(prev => ({...prev, combustible: v as any}))}
>
<SelectTrigger>
<SelectValue />
</SelectTrigger>
<SelectContent>
<SelectItem value="diesel">Diésel</SelectItem>
<SelectItem value="gasolina">Gasolina</SelectItem>
<SelectItem value="electric">Eléctrico</SelectItem>
<SelectItem value="hibrido">Híbrido</SelectItem>
</SelectContent>
</Select>
</div>
</div>
</div>
<DialogFooter>
<Button variant="outline" onClick={handleCloseDialog} disabled={isSubmitting}>
Cancelar
</Button>
<Button
onClick={handleNuevoVehiculo}
disabled={isSubmitting}
className="bg-[#1e3a5f] hover:bg-[#152a45]"
>
{isSubmitting ? (
<>
<Loader2 className="mr-2 h-4 w-4 animate-spin" />
Creando...
</>
) : (
'Crear Vehículo'
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
<p className="text-sm font-medium text-slate-500">Operativos</p>
<p className="text-3xl font-bold">{stats.operativos}</p>
</div>
<div className="rounded-full bg-green-100 p-3">
<CheckCircle2 className="h-6 w-6 text-green-600" />
</div>
</div>
</CardContent>
</Card>
<Card>
<CardContent className="p-6">
<div className="flex items-center justify-between">
<div>
<p className="text-sm font-medium text-slate-500">En Taller</p>
<p className="text-3xl font-bold">{stats.taller}</p>
</div>
<div className="rounded-full bg-amber-100 p-3">
<Wrench className="h-6 w-6 text-amber-600" />
</div>
</div>
</CardContent>
</Card>
<Card>
<CardContent className="p-6">
<div className="flex items-center justify-between">
<div>
<p className="text-sm font-medium text-slate-500">Reservados</p>
<p className="text-3xl font-bold">{stats.reservados}</p>
</div>
<div className="rounded-full bg-purple-100 p-3">
<Bus className="h-6 w-6 text-purple-600" />
</div>
</div>
</CardContent>
</Card>
<Card>
<CardContent className="p-6">
<div className="flex items-center justify-between">
<div>
<p className="text-sm font-medium text-slate-500">Plazas Totales</p>
<p className="text-3xl font-bold">{stats.totalPlazas}</p>
</div>
<div className="rounded-full bg-blue-100 p-3">
<Users className="h-6 w-6 text-blue-600" />
</div>
</div>
</CardContent>
</Card>
<Card>
<CardContent className="p-6">
<div className="flex items-center justify-between">
<div>
<p className="text-sm font-medium text-slate-500">ITV Próxima</p>
<p className="text-3xl font-bold">{vehiculosITVProxima.length}</p>
</div>
<div className="rounded-full bg-red-100 p-3">
<AlertTriangle className="h-6 w-6 text-red-600" />
</div>
</div>
</CardContent>
</Card>
</div>

{/* Tabs */}
<Tabs defaultValue="vehiculos" className="space-y-4">
<TabsList>
<TabsTrigger value="vehiculos">Vehículos</TabsTrigger>
<TabsTrigger value="alertas">Alertas ({vehiculosITVProxima.length})</TabsTrigger>
</TabsList>

<TabsContent value="vehiculos" className="space-y-4">
{/* Filters */}
<div className="flex flex-wrap gap-4">
<div className="relative flex-1 min-w-[200px] max-w-sm">
<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
<Input
placeholder="Buscar vehículos..."
value={searchQuery}
onChange={(e) => setSearchQuery(e.target.value)}
className="pl-10"
/>
</div>
<Select value={estadoFiltro} onValueChange={(v) => setEstadoFiltro(v as EstadoVehiculo | 'todos')}>
<SelectTrigger className="w-40">
<SelectValue placeholder="Estado" />
</SelectTrigger>
<SelectContent>
<SelectItem value="todos">Todos</SelectItem>
<SelectItem value="operativo">Operativo</SelectItem>
<SelectItem value="taller">En Taller</SelectItem>
<SelectItem value="reservado">Reservado</SelectItem>
<SelectItem value="baja">De Baja</SelectItem>
</SelectContent>
</Select>
<Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v as TipoVehiculo | 'todos')}>
<SelectTrigger className="w-40">
<SelectValue placeholder="Tipo" />
</SelectTrigger>
<SelectContent>
<SelectItem value="todos">Todos</SelectItem>
<SelectItem value="autobus">Autobús</SelectItem>
<SelectItem value="minibus">Minibús</SelectItem>
<SelectItem value="furgoneta">Furgoneta</SelectItem>
<SelectItem value="coche">Coche</SelectItem>
</SelectContent>
</Select>
</div>

{/* Vehicles Table */}
<Card>
<CardContent className="p-0">
<Table>
<TableHeader>
<TableRow>
<TableHead>Matrícula</TableHead>
<TableHead>Vehículo</TableHead>
<TableHead>Tipo</TableHead>
<TableHead>Plazas</TableHead>
<TableHead>Kilometraje</TableHead>
<TableHead>ITV</TableHead>
<TableHead>Estado</TableHead>
<TableHead className="text-right">Acciones</TableHead>
</TableRow>
</TableHeader>
<TableBody>
{isLoading ? (
<TableRow>
<TableCell colSpan={8} className="text-center py-8">
<Loader2 className="h-8 w-8 animate-spin mx-auto text-[#1e3a5f]" />
</TableCell>
</TableRow>
) : vehiculosFiltrados.length === 0 ? (
<TableRow>
<TableCell colSpan={8} className="text-center py-8 text-slate-500">
{searchQuery || estadoFiltro !== 'todos' || tipoFiltro !== 'todos'
? 'No se encontraron vehículos con los filtros aplicados'
: 'No hay vehículos registrados'}
</TableCell>
</TableRow>
) : (
vehiculosFiltrados.map((vehiculo) => (
<TableRow key={vehiculo.id} className="hover:bg-slate-50">
<TableCell className="font-medium">{vehiculo.matricula}</TableCell>
<TableCell>
<div>
<p className="font-medium">{vehiculo.marca} {vehiculo.modelo}</p>
<p className="text-xs text-slate-500">{vehiculo.bastidor || '-'}</p>
</div>
</TableCell>
<TableCell>
<Badge variant="outline">{tipoVehiculoLabels[vehiculo.tipo]}</Badge>
</TableCell>
<TableCell>{vehiculo.plazas}</TableCell>
<TableCell>
<div className="flex items-center gap-1">
<Gauge className="h-4 w-4 text-slate-400" />
{(vehiculo.kilometraje || 0).toLocaleString('es-ES')} km
</div>
</TableCell>
<TableCell>
<div className="flex flex-col">
<span className="text-sm">
{formatDateSafe(vehiculo.itv?.fechaProxima)}
</span>
{(() => {
const dias = getDiasITV(vehiculo.itv?.fechaProxima);
return dias !== null && dias <= 30 ? (
<span className="text-xs text-red-600 font-medium">
{dias} días
</span>
) : null;
})()}
</div>
</TableCell>
<TableCell>
<Badge className={estadoVehiculoColors[vehiculo.estado]}>
{vehiculo.estado}
</Badge>
</TableCell>
<TableCell className="text-right">
<DropdownMenu>
<DropdownMenuTrigger asChild>
<Button variant="ghost" size="icon">
<MoreVertical className="h-4 w-4" />
</Button>
</DropdownMenuTrigger>
<DropdownMenuContent align="end">
<DropdownMenuItem onClick={() => setVehiculoSeleccionado(vehiculo)}>
<Eye className="mr-2 h-4 w-4" />
Ver detalles
</DropdownMenuItem>
<DropdownMenuItem onClick={() => { setVehiculoSeleccionado(vehiculo); setIsEditarOpen(true); }}>
<Edit className="mr-2 h-4 w-4" />
Editar
</DropdownMenuItem>
<DropdownMenuItem
className="text-red-600"
onClick={() => handleEliminarVehiculo(vehiculo.id)}
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
</TabsContent>

<TabsContent value="alertas">
<Card>
<CardHeader>
<CardTitle className="flex items-center gap-2">
<Calendar className="h-5 w-5" />
ITV Próximas a Vencer
</CardTitle>
<CardDescription>
Vehículos con ITV en los próximos 30 días
</CardDescription>
</CardHeader>
<CardContent>
{vehiculosITVProxima.length === 0 ? (
<div className="text-center py-8 text-slate-500">
<CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-500" />
<p>No hay ITV próximas a vencer</p>
</div>
) : (
<div className="space-y-3">
{vehiculosITVProxima.map(vehiculo => {
const dias = getDiasITV(vehiculo.itv?.fechaProxima);
return (
<div key={vehiculo.id} className={`flex items-center justify-between p-3 rounded-lg border ${
dias !== null && dias <= 7 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
}`}>
<div>
<p className="font-medium">{vehiculo.matricula}</p>
<p className="text-sm text-slate-600">{vehiculo.marca} {vehiculo.modelo}</p>
</div>
<div className="text-right">
<p className={`text-sm font-medium ${
dias !== null && dias <= 7 ? 'text-red-700' : 'text-amber-700'
}`}>
{formatDateSafe(vehiculo.itv?.fechaProxima)}
</p>
<p className={`text-xs ${
dias !== null && dias <= 7 ? 'text-red-600' : 'text-amber-600'
}`}>
{dias} días restantes
</p>
</div>
</div>
);
})}
</div>
)}
</CardContent>
</Card>
</TabsContent>
</Tabs>

{/* Vehicle Detail Dialog */}
<Dialog open={!!vehiculoSeleccionado && !isEditarOpen} onOpenChange={() => setVehiculoSeleccionado(null)}>
<DialogContent className="max-w-2xl">
{vehiculoSeleccionado && (
<>
<DialogHeader>
<DialogTitle>{vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo}</DialogTitle>
<DialogDescription>
{vehiculoSeleccionado.matricula} • {tipoVehiculoLabels[vehiculoSeleccionado.tipo]}
</DialogDescription>
</DialogHeader>
<div className="space-y-4 py-4">
<div className="grid grid-cols-2 gap-4">
<div>
<Label className="text-slate-500">Nº Bastidor</Label>
<p>{vehiculoSeleccionado.bastidor || '-'}</p>
</div>
<div>
<Label className="text-slate-500">Año Fabricación</Label>
<p>{vehiculoSeleccionado.añoFabricacion || '-'}</p>
</div>
</div>
<div className="grid grid-cols-3 gap-4">
<div>
<Label className="text-slate-500">Plazas</Label>
<p className="flex items-center gap-2">
<Users className="h-4 w-4" />
{vehiculoSeleccionado.plazas}
</p>
</div>
<div>
<Label className="text-slate-500">Kilometraje</Label>
<p className="flex items-center gap-2">
<Gauge className="h-4 w-4" />
{(vehiculoSeleccionado.kilometraje || 0).toLocaleString('es-ES')} km
</p>
</div>
<div>
<Label className="text-slate-500">Combustible</Label>
<p className="flex items-center gap-2">
<Fuel className="h-4 w-4" />
{vehiculoSeleccionado.combustible || 'Diésel'}
</p>
</div>
</div>
<div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4">
<div>
<Label className="text-slate-500">Próxima ITV</Label>
<p>{formatDateSafe(vehiculoSeleccionado.itv?.fechaProxima)}</p>
</div>
<div>
<Label className="text-slate-500">Seguro Vence</Label>
<p>{formatDateSafe(vehiculoSeleccionado.seguro?.fechaVencimiento)}</p>
</div>
</div>
</div>
</>
)}
</DialogContent>
</Dialog>
</div>
);
}