// ============================================
// MILANO - CRM / Clientes Page (OPTIMIZADO CON DETALLE COMPLETO)
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useClientesStore, useServiciosStore, useUIStore } from '../store';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
import { Progress } from '../components/ui/progress';
import {
Users,
Search,
Plus,
MoreVertical,
Edit,
Trash2,
Eye,
Phone,
Mail,
MapPin,
Calendar,
Filter,
Loader2,
Briefcase,
Euro,
FileText,
TrendingUp,
Clock,
CheckCircle2,
XCircle,
} from 'lucide-react';
import type { Cliente, TipoCliente } from '../types';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const tipoClienteLabels: Record<string, string> = {
festival: 'Festival',
promotor: 'Promotor',
colegio: 'Colegio',
empresa: 'Empresa',
particular: 'Particular',
};

const tipoClienteColors: Record<string, string> = {
festival: 'bg-purple-100 text-purple-700',
promotor: 'bg-blue-100 text-blue-700',
colegio: 'bg-green-100 text-green-700',
empresa: 'bg-amber-100 text-amber-700',
particular: 'bg-slate-100 text-slate-700',
};

const getDocumentoLabel = (tipo: string): string => {
switch (tipo) {
case 'particular':
return 'DNI';
case 'empresa':
case 'festival':
case 'promotor':
case 'colegio':
return 'CIF';
default:
return 'NIF';
}
};

// Helper para fechas seguras
const formatDateSafe = (date: string | Date | undefined): string => {
if (!date) return '-';
try {
const parsed = typeof date === 'string' ? parseISO(date) : date;
return isValid(parsed) ? format(parsed, 'dd/MM/yyyy') : '-';
} catch {
return '-';
}
};

type NuevoClienteForm = {
tipo: TipoCliente;
nombre: string;
estado: 'activo' | 'inactivo';
nif: string;
formaPago: string;
diasPago: number;
condicionesEspeciales: string;
notas: string;
contacto: {
email: string;
telefono: string;
direccion: string;
ciudad: string;
codigoPostal: string;
};
};

export default function CRM() {
const { clientes, isLoading, addCliente, updateCliente, deleteCliente, fetchClientes } = useClientesStore();
const { servicios, fetchServicios } = useServiciosStore();
const { showToast } = useUIStore();

const [searchQuery, setSearchQuery] = useState('');
const [tipoFiltro, setTipoFiltro] = useState<TipoCliente | 'todos'>('todos');
const [estadoFiltro, setEstadoFiltro] = useState<'activo' | 'inactivo' | 'todos'>('todos');
const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
const [isNuevoClienteOpen, setIsNuevoClienteOpen] = useState(false);
const [isEditarOpen, setIsEditarOpen] = useState(false);
const [isDetalleOpen, setIsDetalleOpen] = useState(false);
const [detalleTab, setDetalleTab] = useState('info');
const [isSubmitting, setIsSubmitting] = useState(false);

const initialClienteState: NuevoClienteForm = {
tipo: 'empresa',
nombre: '',
estado: 'activo',
nif: '',
formaPago: 'transferencia',
diasPago: 30,
condicionesEspeciales: '',
notas: '',
contacto: {
email: '',
telefono: '',
direccion: '',
ciudad: '',
codigoPostal: ''
}
};

const [nuevoCliente, setNuevoCliente] = useState<NuevoClienteForm>(initialClienteState);

useEffect(() => {
fetchClientes();
fetchServicios();
}, [fetchClientes, fetchServicios]);

// Filtrar clientes con useMemo
const clientesFiltrados = useMemo(() => {
return clientes.filter(cliente => {
const searchLower = searchQuery.toLowerCase().trim();
const matchesSearch = searchLower === '' ||
cliente.nombre?.toLowerCase().includes(searchLower) ||
cliente.codigo?.toLowerCase().includes(searchLower) ||
cliente.nif?.toLowerCase().includes(searchLower) ||
cliente.contacto?.email?.toLowerCase().includes(searchLower) ||
cliente.contacto?.telefono?.toLowerCase().includes(searchLower);
const matchesTipo = tipoFiltro === 'todos' || cliente.tipo === tipoFiltro;
const matchesEstado = estadoFiltro === 'todos' || cliente.estado === estadoFiltro;
return matchesSearch && matchesTipo && matchesEstado;
});
}, [clientes, searchQuery, tipoFiltro, estadoFiltro]);

// Estadísticas con useMemo
const stats = useMemo(() => ({
total: clientes.length,
activos: clientes.filter(c => c.estado === 'activo').length,
inactivos: clientes.filter(c => c.estado === 'inactivo').length,
porTipo: {
empresa: clientes.filter(c => c.tipo === 'empresa').length,
particular: clientes.filter(c => c.tipo === 'particular').length,
festival: clientes.filter(c => c.tipo === 'festival').length,
promotor: clientes.filter(c => c.tipo === 'promotor').length,
colegio: clientes.filter(c => c.tipo === 'colegio').length,
}
}), [clientes]);

// Servicios del cliente seleccionado
const serviciosCliente = useMemo(() => {
if (!clienteSeleccionado) return [];
return servicios.filter(s => s.clienteId === clienteSeleccionado.id);
}, [servicios, clienteSeleccionado]);

const handleNuevoCliente = useCallback(async (e: React.FormEvent) => {
e.preventDefault();
e.stopPropagation();

const nombreLimpio = nuevoCliente.nombre.trim();
if (!nombreLimpio) {
showToast('El nombre es obligatorio', 'error');
return;
}

setIsSubmitting(true);

try {
const codigo = `CLI-${Date.now().toString().slice(-5)}`;

const clienteParaBackend = {
codigo: codigo,
nombre: nombreLimpio,
tipo: nuevoCliente.tipo,
razon_social: null,
nif_cif: nuevoCliente.nif.trim() || null,
direccion: nuevoCliente.contacto.direccion.trim() || null,
ciudad: nuevoCliente.contacto.ciudad.trim() || null,
codigo_postal: nuevoCliente.contacto.codigoPostal.trim() || null,
pais: 'España',
email: nuevoCliente.contacto.email.trim() || null,
telefono: nuevoCliente.contacto.telefono.trim() || null,
estado: nuevoCliente.estado,
condiciones_pago: nuevoCliente.formaPago,
dias_pago: Number(nuevoCliente.diasPago) || null,
limite_credito: null,
notas: nuevoCliente.notas.trim() || null,
persona_contacto_nombre: null,
persona_contacto_email: null,
persona_contacto_telefono: null,
persona_contacto_cargo: null,
};

const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/clientes`, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${localStorage.getItem('milano_token') || ''}`,
},
body: JSON.stringify(clienteParaBackend),
});

if (!response.ok) {
const errorData = await response.json();
throw new Error(JSON.stringify(errorData));
}

setIsNuevoClienteOpen(false);
setNuevoCliente(initialClienteState);
showToast('Cliente creado correctamente', 'success');
await fetchClientes();

} catch (err: any) {
let errorMsg = err.message;
try {
const parsed = JSON.parse(err.message);
errorMsg = parsed.detail || 'Error desconocido';
} catch {}
showToast(`Error: ${errorMsg}`, 'error');
} finally {
setIsSubmitting(false);
}
}, [nuevoCliente, fetchClientes, showToast, initialClienteState]);

const handleEditarCliente = async () => {
if (!clienteSeleccionado) return;

setIsSubmitting(true);

try {
const clienteData: Partial<Cliente> = {
...clienteSeleccionado,
nif: clienteSeleccionado.nif?.trim() || undefined,
condicionesEspeciales: clienteSeleccionado.condicionesEspeciales?.trim() || undefined,
notas: clienteSeleccionado.notas?.trim() || undefined,
contacto: {
email: clienteSeleccionado.contacto?.email?.trim() || undefined,
telefono: clienteSeleccionado.contacto?.telefono?.trim() || undefined,
direccion: clienteSeleccionado.contacto?.direccion?.trim() || undefined,
ciudad: clienteSeleccionado.contacto?.ciudad?.trim() || undefined,
codigoPostal: clienteSeleccionado.contacto?.codigoPostal?.trim() || undefined,
}
};

const success = await updateCliente(String(clienteSeleccionado.id), clienteData);
if (success) {
setIsEditarOpen(false);
showToast('Cliente actualizado correctamente', 'success');
await fetchClientes();
} else {
showToast('Error al actualizar el cliente', 'error');
}
} catch (err: any) {
showToast(`Error: ${err.message || 'Desconocido'}`, 'error');
} finally {
setIsSubmitting(false);
}
};

const handleEliminarCliente = async (id: string) => {
if (!window.confirm('¿Está seguro de eliminar este cliente?')) return;

try {
const success = await deleteCliente(id);
if (success) {
showToast('Cliente eliminado', 'success');
if (clienteSeleccionado?.id === id) {
setIsDetalleOpen(false);
setClienteSeleccionado(null);
}
await fetchClientes();
} else {
showToast('Error al eliminar el cliente', 'error');
}
} catch (err: any) {
showToast(`Error: ${err.message || 'Desconocido'}`, 'error');
}
};

const verDetalle = (cliente: Cliente) => {
setClienteSeleccionado(cliente);
setDetalleTab('info');
setIsDetalleOpen(true);
};

const abrirEditar = (cliente: Cliente) => {
setClienteSeleccionado(cliente);
setIsEditarOpen(true);
};

const handleCloseNuevo = () => {
setIsNuevoClienteOpen(false);
setNuevoCliente(initialClienteState);
};

const updateContacto = (field: keyof NuevoClienteForm['contacto'], value: string) => {
setNuevoCliente(prev => ({
...prev,
contacto: { ...prev.contacto, [field]: value }
}));
};

if (isLoading && clientes.length === 0) {
return (
<div className="flex items-center justify-center h-96">
<Loader2 className="h-12 w-12 animate-spin text-[#1e3a5f]" />
</div>
);
}

return (
<div className="space-y-6">
{/* Header */}
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-lg border shadow-sm">
<div>
<h2 className="text-xl font-bold text-slate-900">CRM - Clientes</h2>
<p className="text-slate-500 text-sm">Gestión de clientes y oportunidades</p>
</div>
<Dialog open={isNuevoClienteOpen} onOpenChange={setIsNuevoClienteOpen}>
<DialogTrigger asChild>
<Button className="bg-[#1e3a5f] hover:bg-[#152a45] text-white shadow-sm">
<Plus className="mr-2 h-4 w-4" />
Nuevo Cliente
</Button>
</DialogTrigger>
<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
<DialogHeader>
<DialogTitle>Nuevo Cliente</DialogTitle>
<DialogDescription>
Complete la información del nuevo cliente
</DialogDescription>
</DialogHeader>

<form onSubmit={handleNuevoCliente} className="space-y-4 py-4">
<div className="grid grid-cols-2 gap-4">
<div className="space-y-2">
<Label htmlFor="tipo">Tipo *</Label>
<Select
value={nuevoCliente.tipo}
onValueChange={(v) => setNuevoCliente({...nuevoCliente, tipo: v as TipoCliente})}
>
<SelectTrigger>
<SelectValue />
</SelectTrigger>
<SelectContent>
<SelectItem value="empresa">Empresa</SelectItem>
<SelectItem value="festival">Festival</SelectItem>
<SelectItem value="promotor">Promotor</SelectItem>
<SelectItem value="colegio">Colegio</SelectItem>
<SelectItem value="particular">Particular / Autónomo</SelectItem>
</SelectContent>
</Select>
</div>
<div className="space-y-2">
<Label htmlFor="nombre">Nombre / Razón Social *</Label>
<Input
id="nombre"
value={nuevoCliente.nombre}
onChange={(e) => setNuevoCliente({...nuevoCliente, nombre: e.target.value})}
placeholder="Nombre del cliente"
required
/>
</div>
</div>

<div className="space-y-2">
<Label htmlFor="nif">{getDocumentoLabel(nuevoCliente.tipo)}</Label>
<Input
id="nif"
value={nuevoCliente.nif}
onChange={(e) => setNuevoCliente({...nuevoCliente, nif: e.target.value})}
placeholder={`Número de ${getDocumentoLabel(nuevoCliente.tipo)}`}
/>
</div>

<div className="grid grid-cols-2 gap-4">
<div className="space-y-2">
<Label htmlFor="email">Email</Label>
<Input
id="email"
type="email"
value={nuevoCliente.contacto.email}
onChange={(e) => updateContacto('email', e.target.value)}
placeholder="email@ejemplo.com"
/>
</div>
<div className="space-y-2">
<Label htmlFor="telefono">Teléfono</Label>
<Input
id="telefono"
value={nuevoCliente.contacto.telefono}
onChange={(e) => updateContacto('telefono', e.target.value)}
placeholder="+34 600 000 000"
/>
</div>
</div>

<div className="space-y-2">
<Label htmlFor="direccion">Dirección</Label>
<Input
id="direccion"
value={nuevoCliente.contacto.direccion}
onChange={(e) => updateContacto('direccion', e.target.value)}
placeholder="Calle, número"
/>
</div>

<div className="grid grid-cols-2 gap-4">
<div className="space-y-2">
<Label htmlFor="ciudad">Ciudad</Label>
<Input
id="ciudad"
value={nuevoCliente.contacto.ciudad}
onChange={(e) => updateContacto('ciudad', e.target.value)}
placeholder="Ciudad"
/>
</div>
<div className="space-y-2">
<Label htmlFor="codigoPostal">Código Postal</Label>
<Input
id="codigoPostal"
value={nuevoCliente.contacto.codigoPostal}
onChange={(e) => updateContacto('codigoPostal', e.target.value)}
placeholder="28001"
/>
</div>
</div>

<div className="grid grid-cols-2 gap-4">
<div className="space-y-2">
<Label htmlFor="formaPago">Forma de Pago</Label>
<Select
value={nuevoCliente.formaPago}
onValueChange={(v) => setNuevoCliente({...nuevoCliente, formaPago: v})}
>
<SelectTrigger>
<SelectValue />
</SelectTrigger>
<SelectContent>
<SelectItem value="transferencia">Transferencia</SelectItem>
<SelectItem value="efectivo">Efectivo</SelectItem>
<SelectItem value="tarjeta">Tarjeta</SelectItem>
<SelectItem value="domiciliacion">Domiciliación</SelectItem>
</SelectContent>
</Select>
</div>
<div className="space-y-2">
<Label htmlFor="diasPago">Días de Pago</Label>
<Input
id="diasPago"
type="number"
value={nuevoCliente.diasPago}
onChange={(e) => setNuevoCliente({...nuevoCliente, diasPago: parseInt(e.target.value) || 30})}
/>
</div>
</div>

<div className="space-y-2">
<Label htmlFor="condicionesEspeciales">Condiciones Especiales</Label>
<Textarea
id="condicionesEspeciales"
value={nuevoCliente.condicionesEspeciales}
onChange={(e) => setNuevoCliente({...nuevoCliente, condicionesEspeciales: e.target.value})}
placeholder="Condiciones especiales de pago, descuentos, etc."
rows={2}
/>
</div>

<div className="space-y-2">
<Label htmlFor="notas">Notas</Label>
<Textarea
id="notas"
value={nuevoCliente.notas}
onChange={(e) => setNuevoCliente({...nuevoCliente, notas: e.target.value})}
placeholder="Notas adicionales sobre el cliente"
rows={2}
/>
</div>

<DialogFooter className="gap-2">
<Button
type="button"
variant="outline"
onClick={handleCloseNuevo}
disabled={isSubmitting}
>
Cancelar
</Button>
<Button
type="submit"
disabled={isSubmitting}
className="bg-[#1e3a5f] hover:bg-[#152a45] text-white"
>
{isSubmitting ? (
<>
<Loader2 className="h-4 w-4 animate-spin mr-2" />
Guardando...
</>
) : (
'Crear Cliente'
)}
</Button>
</DialogFooter>
</form>
</DialogContent>
</Dialog>
</div>

{/* Stats */}
<div className="grid gap-4 md:grid-cols-5">
<Card>
<CardContent className="p-6">
<div className="flex items-center justify-between">
<div>
<p className="text-sm font-medium text-slate-500">Total Clientes</p>
<p className="text-3xl font-bold">{stats.total}</p>
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
<p className="text-sm font-medium text-slate-500">Activos</p>
<p className="text-3xl font-bold">{stats.activos}</p>
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
<p className="text-sm font-medium text-slate-500">Inactivos</p>
<p className="text-3xl font-bold">{stats.inactivos}</p>
</div>
<div className="rounded-full bg-red-100 p-3">
<XCircle className="h-6 w-6 text-red-600" />
</div>
</div>
</CardContent>
</Card>
<Card>
<CardContent className="p-6">
<div className="flex items-center justify-between">
<div>
<p className="text-sm font-medium text-slate-500">Empresas</p>
<p className="text-3xl font-bold">{stats.porTipo.empresa}</p>
</div>
<div className="rounded-full bg-amber-100 p-3">
<Briefcase className="h-6 w-6 text-amber-600" />
</div>
</div>
</CardContent>
</Card>
<Card>
<CardContent className="p-6">
<div className="flex items-center justify-between">
<div>
<p className="text-sm font-medium text-slate-500">Particulares</p>
<p className="text-3xl font-bold">{stats.porTipo.particular}</p>
</div>
<div className="rounded-full bg-slate-100 p-3">
<Users className="h-6 w-6 text-slate-600" />
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
placeholder="Buscar clientes..."
value={searchQuery}
onChange={(e) => setSearchQuery(e.target.value)}
className="pl-10"
/>
</div>
<Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v as TipoCliente | 'todos')}>
<SelectTrigger className="w-40">
<Filter className="mr-2 h-4 w-4" />
<SelectValue placeholder="Tipo" />
</SelectTrigger>
<SelectContent>
<SelectItem value="todos">Todos los tipos</SelectItem>
<SelectItem value="festival">Festival</SelectItem>
<SelectItem value="promotor">Promotor</SelectItem>
<SelectItem value="colegio">Colegio</SelectItem>
<SelectItem value="empresa">Empresa</SelectItem>
<SelectItem value="particular">Particular</SelectItem>
</SelectContent>
</Select>
<Select value={estadoFiltro} onValueChange={(v) => setEstadoFiltro(v as 'activo' | 'inactivo' | 'todos')}>
<SelectTrigger className="w-40">
<CheckCircle2 className="mr-2 h-4 w-4" />
<SelectValue placeholder="Estado" />
</SelectTrigger>
<SelectContent>
<SelectItem value="todos">Todos</SelectItem>
<SelectItem value="activo">Activos</SelectItem>
<SelectItem value="inactivo">Inactivos</SelectItem>
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
<TableHead>Nombre</TableHead>
<TableHead>Tipo</TableHead>
<TableHead>Contacto</TableHead>
<TableHead>Estado</TableHead>
<TableHead className="text-right">Acciones</TableHead>
</TableRow>
</TableHeader>
<TableBody>
{clientesFiltrados.length === 0 ? (
<TableRow>
<TableCell colSpan={6} className="text-center py-8 text-slate-500">
{searchQuery || tipoFiltro !== 'todos' || estadoFiltro !== 'todos'
? 'No se encontraron clientes con los filtros aplicados'
: 'No hay clientes registrados'}
</TableCell>
</TableRow>
) : (
clientesFiltrados.map((cliente) => (
<TableRow key={cliente.id} className="hover:bg-slate-50">
<TableCell className="font-medium">{cliente.codigo}</TableCell>
<TableCell>{cliente.nombre}</TableCell>
<TableCell>
<Badge className={tipoClienteColors[cliente.tipo || 'empresa']}>
{tipoClienteLabels[cliente.tipo || 'empresa']}
</Badge>
</TableCell>
<TableCell>
<div className="flex flex-col gap-1">
<span className="flex items-center gap-1 text-sm">
<Mail className="h-3 w-3" />
{cliente.contacto?.email || '-'}
</span>
<span className="flex items-center gap-1 text-sm text-slate-500">
<Phone className="h-3 w-3" />
{cliente.contacto?.telefono || '-'}
</span>
</div>
</TableCell>
<TableCell>
<Badge variant={cliente.estado === 'activo' ? 'default' : 'secondary'}>
{cliente.estado === 'activo' ? 'Activo' : 'Inactivo'}
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
<DropdownMenuItem onClick={() => verDetalle(cliente)}>
<Eye className="mr-2 h-4 w-4" />
Ver detalle
</DropdownMenuItem>
<DropdownMenuItem onClick={() => abrirEditar(cliente)}>
<Edit className="mr-2 h-4 w-4" />
Editar
</DropdownMenuItem>
<DropdownMenuItem
onClick={() => handleEliminarCliente(String(cliente.id))}
className="text-red-600"
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

{/* DIALOGO DE DETALLE COMPLETO */}
<Dialog open={isDetalleOpen} onOpenChange={setIsDetalleOpen}>
<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
{clienteSeleccionado && (
<>
<DialogHeader>
<DialogTitle className="flex items-center gap-2">
{clienteSeleccionado.nombre}
<Badge className={tipoClienteColors[clienteSeleccionado.tipo || 'empresa']}>
{tipoClienteLabels[clienteSeleccionado.tipo || 'empresa']}
</Badge>
</DialogTitle>
<DialogDescription>
{clienteSeleccionado.codigo} • Cliente desde {formatDateSafe(clienteSeleccionado.fechaAlta)}
</DialogDescription>
</DialogHeader>

<Tabs value={detalleTab} onValueChange={setDetalleTab} className="mt-4">
<TabsList className="grid w-full grid-cols-4">
<TabsTrigger value="info">Información</TabsTrigger>
<TabsTrigger value="servicios">Servicios ({serviciosCliente.length})</TabsTrigger>
<TabsTrigger value="facturacion">Facturación</TabsTrigger>
<TabsTrigger value="historial">Historial</TabsTrigger>
</TabsList>

{/* TAB: INFORMACIÓN */}
<TabsContent value="info" className="space-y-4">
<div className="grid grid-cols-2 gap-4">
<Card>
<CardHeader>
<CardTitle className="text-sm font-medium flex items-center gap-2">
<Mail className="h-4 w-4" />
Contacto
</CardTitle>
</CardHeader>
<CardContent className="space-y-2">
<div>
<Label className="text-slate-500 text-xs">Email</Label>
<p>{clienteSeleccionado.contacto?.email || '-'}</p>
</div>
<div>
<Label className="text-slate-500 text-xs">Teléfono</Label>
<p>{clienteSeleccionado.contacto?.telefono || '-'}</p>
</div>
</CardContent>
</Card>

<Card>
<CardHeader>
<CardTitle className="text-sm font-medium flex items-center gap-2">
<MapPin className="h-4 w-4" />
Dirección
</CardTitle>
</CardHeader>
<CardContent className="space-y-2">
<p>{clienteSeleccionado.contacto?.direccion || '-'}</p>
<p>{clienteSeleccionado.contacto?.codigoPostal} {clienteSeleccionado.contacto?.ciudad}</p>
</CardContent>
</Card>
</div>

<div className="grid grid-cols-2 gap-4">
<Card>
<CardHeader>
<CardTitle className="text-sm font-medium flex items-center gap-2">
<FileText className="h-4 w-4" />
Documentación
</CardTitle>
</CardHeader>
<CardContent className="space-y-2">
<div>
<Label className="text-slate-500 text-xs">{getDocumentoLabel(clienteSeleccionado.tipo || 'empresa')}</Label>
<p>{clienteSeleccionado.nif || '-'}</p>
</div>
<div>
<Label className="text-slate-500 text-xs">Estado</Label>
<Badge variant={clienteSeleccionado.estado === 'activo' ? 'default' : 'secondary'}>
{clienteSeleccionado.estado === 'activo' ? 'Activo' : 'Inactivo'}
</Badge>
</div>
</CardContent>
</Card>

<Card>
<CardHeader>
<CardTitle className="text-sm font-medium flex items-center gap-2">
<Euro className="h-4 w-4" />
Condiciones Comerciales
</CardTitle>
</CardHeader>
<CardContent className="space-y-2">
<div>
<Label className="text-slate-500 text-xs">Forma de Pago</Label>
<p className="capitalize">{clienteSeleccionado.formaPago || 'Transferencia'}</p>
</div>
<div>
<Label className="text-slate-500 text-xs">Días de Pago</Label>
<p>{clienteSeleccionado.diasPago || 30} días</p>
</div>
</CardContent>
</Card>
</div>

{clienteSeleccionado.condicionesEspeciales && (
<Card>
<CardHeader>
<CardTitle className="text-sm font-medium">Condiciones Especiales</CardTitle>
</CardHeader>
<CardContent>
<p className="text-sm">{clienteSeleccionado.condicionesEspeciales}</p>
</CardContent>
</Card>
)}

{clienteSeleccionado.notas && (
<Card>
<CardHeader>
<CardTitle className="text-sm font-medium">Notas</CardTitle>
</CardHeader>
<CardContent>
<p className="text-sm text-slate-600">{clienteSeleccionado.notas}</p>
</CardContent>
</Card>
)}
</TabsContent>

{/* TAB: SERVICIOS */}
<TabsContent value="servicios" className="space-y-4">
<div className="flex justify-between items-center">
<h3 className="font-medium">Servicios contratados</h3>
<Button asChild size="sm" className="bg-[#1e3a5f] hover:bg-[#152a45]">
<Link to={`/servicios/nuevo?cliente=${clienteSeleccionado.id}`}>
<Plus className="mr-2 h-4 w-4" />
Nuevo Servicio
</Link>
</Button>
</div>

{serviciosCliente.length === 0 ? (
<div className="text-center py-8 text-slate-500">
<Briefcase className="mx-auto mb-2 h-8 w-8" />
<p>No hay servicios registrados para este cliente</p>
</div>
) : (
<div className="space-y-2">
{serviciosCliente.map(servicio => (
<div key={servicio.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border">
<div>
<p className="font-medium">{servicio.titulo}</p>
<p className="text-sm text-slate-500">
{formatDateSafe(servicio.fechaInicio)} • {servicio.estado}
</p>
</div>
<div className="text-right">
<p className="font-medium">{(servicio.precio || 0).toLocaleString('es-ES')}€</p>
<Badge variant={servicio.facturado ? 'default' : 'secondary'}>
{servicio.facturado ? 'Facturado' : 'Pendiente'}
</Badge>
</div>
</div>
))}
</div>
)}
</TabsContent>

{/* TAB: FACTURACIÓN */}
<TabsContent value="facturacion" className="space-y-4">
<div className="grid grid-cols-3 gap-4">
<Card>
<CardContent className="p-4">
<p className="text-sm text-slate-500">Total Facturado</p>
<p className="text-2xl font-bold">
{serviciosCliente
.filter(s => s.facturado)
.reduce((sum, s) => sum + (s.precio || 0), 0)
.toLocaleString('es-ES')}€
</p>
</CardContent>
</Card>
<Card>
<CardContent className="p-4">
<p className="text-sm text-slate-500">Pendiente</p>
<p className="text-2xl font-bold">
{serviciosCliente
.filter(s => !s.facturado && s.estado === 'completado')
.reduce((sum, s) => sum + (s.precio || 0), 0)
.toLocaleString('es-ES')}€
</p>
</CardContent>
</Card>
<Card>
<CardContent className="p-4">
<p className="text-sm text-slate-500">Servicios</p>
<p className="text-2xl font-bold">{serviciosCliente.length}</p>
</CardContent>
</Card>
</div>

<div className="text-center py-8 text-slate-500">
<FileText className="mx-auto mb-2 h-8 w-8" />
<p>Módulo de facturación en desarrollo</p>
<p className="text-sm">Próximamente: generación de facturas, historial completo, pagos...</p>
</div>
</TabsContent>

{/* TAB: HISTORIAL */}
<TabsContent value="historial" className="space-y-4">
<div className="text-center py-8 text-slate-500">
<Clock className="mx-auto mb-2 h-8 w-8" />
<p>Historial de actividad en desarrollo</p>
<p className="text-sm">Próximamente: timeline completo de interacciones, cambios, comunicaciones...</p>
</div>
</TabsContent>
</Tabs>

<DialogFooter className="gap-2 mt-4">
<Button variant="outline" onClick={() => setIsDetalleOpen(false)}>
Cerrar
</Button>
<Button
onClick={() => { setIsDetalleOpen(false); abrirEditar(clienteSeleccionado); }}
className="bg-[#1e3a5f] hover:bg-[#152a45]"
>
<Edit className="mr-2 h-4 w-4" />
Editar Cliente
</Button>
</DialogFooter>
</>
)}
</DialogContent>
</Dialog>

{/* Edit Dialog */}
<Dialog open={isEditarOpen} onOpenChange={setIsEditarOpen}>
<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
<DialogHeader>
<DialogTitle>Editar Cliente</DialogTitle>
</DialogHeader>
{clienteSeleccionado && (
<div className="space-y-4 py-4">
<div className="space-y-2">
<Label>Nombre</Label>
<Input
value={clienteSeleccionado.nombre}
onChange={(e) => setClienteSeleccionado({...clienteSeleccionado, nombre: e.target.value})}
/>
</div>
<div className="grid grid-cols-2 gap-4">
<div className="space-y-2">
<Label>Email</Label>
<Input
value={clienteSeleccionado.contacto?.email || ''}
onChange={(e) => setClienteSeleccionado({
...clienteSeleccionado,
contacto: { ...clienteSeleccionado.contacto, email: e.target.value }
})}
/>
</div>
<div className="space-y-2">
<Label>Teléfono</Label>
<Input
value={clienteSeleccionado.contacto?.telefono || ''}
onChange={(e) => setClienteSeleccionado({
...clienteSeleccionado,
contacto: { ...clienteSeleccionado.contacto, telefono: e.target.value }
})}
/>
</div>
</div>
<DialogFooter>
<Button variant="outline" onClick={() => setIsEditarOpen(false)}>Cancelar</Button>
<Button
onClick={handleEditarCliente}
disabled={isSubmitting}
className="bg-[#1e3a5f] hover:bg-[#152a45] text-white"
>
{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
Guardar Cambios
</Button>
</DialogFooter>
</div>
)}
</DialogContent>
</Dialog>
</div>
);
}