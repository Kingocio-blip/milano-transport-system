// ============================================
// MILANO - CRM / Clientes Page (con datos reales)
// ============================================

import { useState, useEffect } from 'react';
import { useClientesStore, useUIStore } from '../store';
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
  Briefcase,
  TrendingUp,
  DollarSign,
  Filter,
  Loader2,
  Building2,
  User,
  Calendar,
  FileText,
} from 'lucide-react';
import type { Cliente, TipoCliente } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toDateString } from '../lib/utils';

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

// Tipo de documento según el tipo de cliente
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

export default function CRM() {
  const { clientes, isLoading, error, addCliente, updateCliente, deleteCliente, fetchClientes } = useClientesStore();
  const { showToast } = useUIStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<TipoCliente | 'todos'>('todos');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [isNuevoClienteOpen, setIsNuevoClienteOpen] = useState(false);
  const [isEditarOpen, setIsEditarOpen] = useState(false);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState<Partial<Cliente>>({
    tipo: 'empresa',
    estado: 'activo',
    diasPago: 30,
    contacto: { email: '', telefono: '', direccion: '', ciudad: '', codigoPostal: '' }
  });

  // Refrescar datos al montar
  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  // Filtrar clientes
  const clientesFiltrados = clientes.filter(cliente => {
    const searchLower = searchQuery.toLowerCase().trim();
    const matchesSearch = searchLower === '' || 
      cliente.nombre?.toLowerCase().includes(searchLower) ||
      cliente.codigo?.toLowerCase().includes(searchLower) ||
      cliente.nif?.toLowerCase().includes(searchLower) ||
      cliente.contacto?.email?.toLowerCase().includes(searchLower) ||
      cliente.contacto?.telefono?.toLowerCase().includes(searchLower);
    const matchesTipo = tipoFiltro === 'todos' || cliente.tipo === tipoFiltro;
    return matchesSearch && matchesTipo;
  });

  // Estadísticas
  const totalClientes = clientes.length;
  const clientesActivos = clientes.filter(c => c.estado === 'activo').length;

  const handleNuevoCliente = async () => {
    if (!nuevoCliente.nombre) {
      showToast('El nombre es obligatorio', 'error');
      return;
    }

    // Limpiar valores vacíos antes de enviar
    const clienteData = {
      ...nuevoCliente,
      nif: nuevoCliente.nif?.trim() || undefined,
      condicionesEspeciales: nuevoCliente.condicionesEspeciales?.trim() || undefined,
      formaPago: nuevoCliente.formaPago || 'transferencia',
      diasPago: nuevoCliente.diasPago || 30,
      notas: nuevoCliente.notas?.trim() || undefined,
      contacto: {
        email: nuevoCliente.contacto?.email?.trim() || undefined,
        telefono: nuevoCliente.contacto?.telefono?.trim() || undefined,
        direccion: nuevoCliente.contacto?.direccion?.trim() || undefined,
        ciudad: nuevoCliente.contacto?.ciudad?.trim() || undefined,
        codigoPostal: nuevoCliente.contacto?.codigoPostal?.trim() || undefined,
      }
    };

    const success = await addCliente(clienteData as Omit<Cliente, 'id' | 'codigo' | 'fechaAlta'>);
    if (success) {
      setIsNuevoClienteOpen(false);
      setNuevoCliente({ 
        tipo: 'empresa', 
        estado: 'activo', 
        diasPago: 30,
        contacto: { email: '', telefono: '', direccion: '', ciudad: '', codigoPostal: '' } 
      });
      showToast('Cliente creado correctamente', 'success');
    }
  };

  const handleEditarCliente = async () => {
    if (!clienteSeleccionado) return;
    
    // Limpiar valores vacíos antes de enviar
    const clienteData = {
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
    }
  };

  const handleEliminarCliente = async (id: string) => {
    if (window.confirm('¿Está seguro de eliminar este cliente?')) {
      const success = await deleteCliente(id);
      if (success) {
        showToast('Cliente eliminado', 'success');
      }
    }
  };

  const verDetalle = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setIsDetalleOpen(true);
  };

  const abrirEditar = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setIsEditarOpen(true);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CRM - Clientes</h1>
          <p className="text-slate-500">Gestión de clientes y oportunidades</p>
        </div>
        <Dialog open={isNuevoClienteOpen} onOpenChange={setIsNuevoClienteOpen}>
          <DialogTrigger asChild>
            <Button>
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
            <div className="space-y-4 py-4">
              {/* Tipo y Nombre */}
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
                    value={nuevoCliente.nombre || ''}
                    onChange={(e) => setNuevoCliente({...nuevoCliente, nombre: e.target.value})}
                    placeholder="Nombre del cliente"
                  />
                </div>
              </div>

              {/* NIF/CIF/DNI */}
              <div className="space-y-2">
                <Label htmlFor="nif">{getDocumentoLabel(nuevoCliente.tipo as TipoCliente)}</Label>
                <Input 
                  id="nif"
                  value={nuevoCliente.nif || ''}
                  onChange={(e) => setNuevoCliente({...nuevoCliente, nif: e.target.value})}
                  placeholder={`Número de ${getDocumentoLabel(nuevoCliente.tipo as TipoCliente)}`}
                />
              </div>

              {/* Contacto */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email"
                    type="email"
                    value={nuevoCliente.contacto?.email || ''}
                    onChange={(e) => setNuevoCliente({
                      ...nuevoCliente, 
                      contacto: {...(nuevoCliente.contacto || {}), email: e.target.value}
                    })}
                    placeholder="email@ejemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input 
                    id="telefono"
                    value={nuevoCliente.contacto?.telefono || ''}
                    onChange={(e) => setNuevoCliente({
                      ...nuevoCliente, 
                      contacto: {...(nuevoCliente.contacto || {}), telefono: e.target.value}
                    })}
                    placeholder="+34 600 000 000"
                  />
                </div>
              </div>

              {/* Dirección */}
              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input 
                  id="direccion"
                  value={nuevoCliente.contacto?.direccion || ''}
                  onChange={(e) => setNuevoCliente({
                    ...nuevoCliente, 
                    contacto: {...(nuevoCliente.contacto || {}), direccion: e.target.value}
                  })}
                  placeholder="Calle, número"
                />
              </div>

              {/* Ciudad y Código Postal */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ciudad">Ciudad</Label>
                  <Input 
                    id="ciudad"
                    value={nuevoCliente.contacto?.ciudad || ''}
                    onChange={(e) => setNuevoCliente({
                      ...nuevoCliente, 
                      contacto: {...(nuevoCliente.contacto || {}), ciudad: e.target.value}
                    })}
                    placeholder="Ciudad"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigoPostal">Código Postal</Label>
                  <Input 
                    id="codigoPostal"
                    value={nuevoCliente.contacto?.codigoPostal || ''}
                    onChange={(e) => setNuevoCliente({
                      ...nuevoCliente, 
                      contacto: {...(nuevoCliente.contacto || {}), codigoPostal: e.target.value}
                    })}
                    placeholder="28001"
                  />
                </div>
              </div>

              {/* Forma de pago y Días */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="formaPago">Forma de Pago</Label>
                  <Select 
                    value={nuevoCliente.formaPago || 'transferencia'} 
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
                    value={nuevoCliente.diasPago || 30}
                    onChange={(e) => setNuevoCliente({...nuevoCliente, diasPago: parseInt(e.target.value) || 30})}
                  />
                </div>
              </div>

              {/* Condiciones especiales */}
              <div className="space-y-2">
                <Label htmlFor="condicionesEspeciales">Condiciones Especiales</Label>
                <Textarea 
                  id="condicionesEspeciales"
                  value={nuevoCliente.condicionesEspeciales || ''}
                  onChange={(e) => setNuevoCliente({...nuevoCliente, condicionesEspeciales: e.target.value})}
                  placeholder="Condiciones especiales de pago, descuentos, etc."
                  rows={2}
                />
              </div>

              {/* Notas */}
              <div className="space-y-2">
                <Label htmlFor="notas">Notas</Label>
                <Textarea 
                  id="notas"
                  value={nuevoCliente.notas || ''}
                  onChange={(e) => setNuevoCliente({...nuevoCliente, notas: e.target.value})}
                  placeholder="Notas adicionales sobre el cliente"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNuevoClienteOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleNuevoCliente} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear Cliente'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Clientes</p>
                <p className="text-3xl font-bold">{totalClientes}</p>
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
                <p className="text-sm font-medium text-slate-500">Clientes Activos</p>
                <p className="text-3xl font-bold">{clientesActivos}</p>
              </div>
              <div className="rounded-full bg-green-100 p-3">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar clientes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v as TipoCliente | 'todos')}>
          <SelectTrigger className="w-48">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filtrar por tipo" />
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
      </div>

      {/* Clients Table */}
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
                    No se encontraron clientes
                  </TableCell>
                </TableRow>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <TableRow key={cliente.id}>
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

      {/* Client Detail Dialog */}
      <Dialog open={isDetalleOpen} onOpenChange={setIsDetalleOpen}>
        <DialogContent className="max-w-2xl">
          {clienteSeleccionado && (
            <>
              <DialogHeader>
                <DialogTitle>{clienteSeleccionado.nombre}</DialogTitle>
                <DialogDescription>
                  {clienteSeleccionado.codigo} • {tipoClienteLabels[clienteSeleccionado.tipo || 'empresa']}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500">{getDocumentoLabel(clienteSeleccionado.tipo || 'empresa')}</Label>
                    <p>{clienteSeleccionado.nif || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Estado</Label>
                    <p>
                      <Badge variant={clienteSeleccionado.estado === 'activo' ? 'default' : 'secondary'}>
                        {clienteSeleccionado.estado === 'activo' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500">Email</Label>
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {clienteSeleccionado.contacto?.email || '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Teléfono</Label>
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {clienteSeleccionado.contacto?.telefono || '-'}
                    </p>
                  </div>
                </div>
                {(clienteSeleccionado.contacto?.direccion || clienteSeleccionado.contacto?.ciudad) && (
                  <div>
                    <Label className="text-slate-500">Dirección</Label>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {[
                        clienteSeleccionado.contacto?.direccion,
                        clienteSeleccionado.contacto?.ciudad,
                        clienteSeleccionado.contacto?.codigoPostal
                      ].filter(Boolean).join(', ') || '-'}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500">Forma de Pago</Label>
                    <p>{clienteSeleccionado.formaPago || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Días de Pago</Label>
                    <p>{clienteSeleccionado.diasPago || 30} días</p>
                  </div>
                </div>
                <div>
                  <Label className="text-slate-500">Fecha de Alta</Label>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {clienteSeleccionado.fechaAlta ? format(parseISO(toDateString(clienteSeleccionado.fechaAlta)), 'dd/MM/yyyy', { locale: es }) : '-'}
                  </p>
                </div>
                {clienteSeleccionado.condicionesEspeciales && (
                  <div>
                    <Label className="text-slate-500">Condiciones Especiales</Label>
                    <p className="text-sm">{clienteSeleccionado.condicionesEspeciales}</p>
                  </div>
                )}
                {clienteSeleccionado.notas && (
                  <div>
                    <Label className="text-slate-500">Notas</Label>
                    <p className="text-sm">{clienteSeleccionado.notas}</p>
                  </div>
                )}
                {/* Estadísticas */}
                <div className="border-t pt-4 mt-4">
                  <Label className="text-slate-500 mb-2 block">Estadísticas</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-3 rounded">
                      <p className="text-xs text-slate-500">Servicios</p>
                      <p className="text-lg font-bold">{clienteSeleccionado.totalServicios || 0}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded">
                      <p className="text-xs text-slate-500">Facturado</p>
                      <p className="text-lg font-bold">{(clienteSeleccionado.totalFacturado || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded">
                      <p className="text-xs text-slate-500">Último Servicio</p>
                      <p className="text-sm">
                        {clienteSeleccionado.ultimoServicio 
                          ? format(parseISO(toDateString(clienteSeleccionado.ultimoServicio)), 'dd/MM/yyyy', { locale: es })
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select 
                    value={clienteSeleccionado.tipo} 
                    onValueChange={(v) => setClienteSeleccionado({...clienteSeleccionado, tipo: v as TipoCliente})}
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
                  <Label>Nombre</Label>
                  <Input 
                    value={clienteSeleccionado.nombre}
                    onChange={(e) => setClienteSeleccionado({...clienteSeleccionado, nombre: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{getDocumentoLabel(clienteSeleccionado.tipo || 'empresa')}</Label>
                <Input 
                  value={clienteSeleccionado.nif || ''}
                  onChange={(e) => setClienteSeleccionado({...clienteSeleccionado, nif: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={clienteSeleccionado.contacto?.email || ''}
                    onChange={(e) => setClienteSeleccionado({
                      ...clienteSeleccionado, 
                      contacto: {...(clienteSeleccionado.contacto || {}), email: e.target.value}
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input 
                    value={clienteSeleccionado.contacto?.telefono || ''}
                    onChange={(e) => setClienteSeleccionado({
                      ...clienteSeleccionado, 
                      contacto: {...(clienteSeleccionado.contacto || {}), telefono: e.target.value}
                    })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input 
                  value={clienteSeleccionado.contacto?.direccion || ''}
                  onChange={(e) => setClienteSeleccionado({
                    ...clienteSeleccionado, 
                    contacto: {...(clienteSeleccionado.contacto || {}), direccion: e.target.value}
                  })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ciudad</Label>
                  <Input 
                    value={clienteSeleccionado.contacto?.ciudad || ''}
                    onChange={(e) => setClienteSeleccionado({
                      ...clienteSeleccionado, 
                      contacto: {...(clienteSeleccionado.contacto || {}), ciudad: e.target.value}
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Código Postal</Label>
                  <Input 
                    value={clienteSeleccionado.contacto?.codigoPostal || ''}
                    onChange={(e) => setClienteSeleccionado({
                      ...clienteSeleccionado, 
                      contacto: {...(clienteSeleccionado.contacto || {}), codigoPostal: e.target.value}
                    })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Forma de Pago</Label>
                  <Select 
                    value={clienteSeleccionado.formaPago || 'transferencia'} 
                    onValueChange={(v) => setClienteSeleccionado({...clienteSeleccionado, formaPago: v})}
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
                  <Label>Días de Pago</Label>
                  <Input 
                    type="number"
                    value={clienteSeleccionado.diasPago || 30}
                    onChange={(e) => setClienteSeleccionado({...clienteSeleccionado, diasPago: parseInt(e.target.value) || 30})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Condiciones Especiales</Label>
                <Textarea 
                  value={clienteSeleccionado.condicionesEspeciales || ''}
                  onChange={(e) => setClienteSeleccionado({...clienteSeleccionado, condicionesEspeciales: e.target.value})}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea 
                  value={clienteSeleccionado.notas || ''}
                  onChange={(e) => setClienteSeleccionado({...clienteSeleccionado, notas: e.target.value})}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditarOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditarCliente} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}