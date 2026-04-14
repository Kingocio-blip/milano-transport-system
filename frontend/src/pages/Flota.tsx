// ============================================
// MILANO - Flota Page (con datos reales)
// ============================================

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import type { Vehiculo, TipoVehiculo, EstadoVehiculo } from '../types';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toDateString } from '../lib/utils';

const tipoVehiculoLabels: Record<TipoVehiculo, string> = {
  autobus: 'Autobús',
  minibus: 'Minibús',
  furgoneta: 'Furgoneta',
  coche: 'Coche',
};

const estadoVehiculoColors: Record<EstadoVehiculo, string> = {
  activo: 'bg-green-100 text-green-700',
  taller: 'bg-amber-100 text-amber-700',
  baja: 'bg-red-100 text-red-700',
  reservado: 'bg-blue-100 text-blue-700',
};

export default function Flota() {
  const { vehiculos, isLoading, error, addVehiculo, updateVehiculo, deleteVehiculo, fetchVehiculos } = useVehiculosStore();
  const { showToast } = useUIStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoVehiculo | 'todos'>('todos');
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<Vehiculo | null>(null);
  const [isNuevoVehiculoOpen, setIsNuevoVehiculoOpen] = useState(false);
  const [isEditarOpen, setIsEditarOpen] = useState(false);
  const [nuevoVehiculo, setNuevoVehiculo] = useState<Partial<Vehiculo>>({
    tipo: 'autobus',
    estado: 'activo',
    plazas: 55,
    combustible: 'diesel',
  });

  // Refrescar datos al montar
  useEffect(() => {
    fetchVehiculos();
  }, [fetchVehiculos]);

  // Filtrar vehículos
  const vehiculosFiltrados = vehiculos.filter(vehiculo => {
    const matchesSearch = 
      vehiculo.matricula?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehiculo.marca?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehiculo.modelo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehiculo.bastidor?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEstado = estadoFiltro === 'todos' || vehiculo.estado === estadoFiltro;
    return matchesSearch && matchesEstado;
  });

  // Estadísticas
  const vehiculosOperativos = vehiculos.filter(v => v.estado === 'activo').length;
  const vehiculosTaller = vehiculos.filter(v => v.estado === 'taller').length;
  const totalPlazas = vehiculos.filter(v => v.estado === 'activo').reduce((sum, v) => sum + (v.plazas || 0), 0);

  // Vehículos con ITV próxima
  const vehiculosITVProxima = vehiculos.filter(v => {
    const fechaProxima = v.itv?.fechaProxima ? parseISO(toDateString(v.itv.fechaProxima)) : null;
    return fechaProxima && differenceInDays(fechaProxima, new Date()) <= 30 && differenceInDays(fechaProxima, new Date()) >= 0;
  });

  const handleNuevoVehiculo = async () => {
    if (!nuevoVehiculo.matricula || !nuevoVehiculo.marca || !nuevoVehiculo.modelo) {
      showToast('Por favor complete los campos obligatorios', 'error');
      return;
    }

    const success = await addVehiculo(nuevoVehiculo as Omit<Vehiculo, 'id' | 'mantenimientos'>);
    if (success) {
      setIsNuevoVehiculoOpen(false);
      setNuevoVehiculo({ tipo: 'autobus', estado: 'operativo', plazas: 55, combustible: 'diesel' });
      showToast('Vehículo creado correctamente', 'success');
    }
  };

  const handleEditarVehiculo = async () => {
    if (!vehiculoSeleccionado) return;
    
    const success = await updateVehiculo(vehiculoSeleccionado.id, vehiculoSeleccionado);
    if (success) {
      setIsEditarOpen(false);
      showToast('Vehículo actualizado correctamente', 'success');
    }
  };

  const handleEliminarVehiculo = async (id: string) => {
    if (window.confirm('¿Está seguro de eliminar este vehículo?')) {
      const success = await deleteVehiculo(id);
      if (success) {
        showToast('Vehículo eliminado', 'success');
      }
    }
  };

  const getDiasITV = (fechaProxima?: string | Date) => {
    if (!fechaProxima) return null;
    return differenceInDays(parseISO(toDateString(fechaProxima)), new Date());
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Flota</h1>
          <p className="text-slate-500">Gestión de vehículos y mantenimiento</p>
        </div>
        <Dialog open={isNuevoVehiculoOpen} onOpenChange={setIsNuevoVehiculoOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Vehículo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo Vehículo</DialogTitle>
              <DialogDescription>
                Complete la información del nuevo vehículo
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="matricula">Matrícula *</Label>
                  <Input 
                    id="matricula"
                    value={nuevoVehiculo.matricula || ''}
                    onChange={(e) => setNuevoVehiculo({...nuevoVehiculo, matricula: e.target.value})}
                    placeholder="1234 ABC"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bastidor">Nº Bastidor</Label>
                  <Input 
                    id="bastidor"
                    value={nuevoVehiculo.bastidor || ''}
                    onChange={(e) => setNuevoVehiculo({...nuevoVehiculo, bastidor: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marca">Marca *</Label>
                  <Input 
                    id="marca"
                    value={nuevoVehiculo.marca || ''}
                    onChange={(e) => setNuevoVehiculo({...nuevoVehiculo, marca: e.target.value})}
                    placeholder="Mercedes-Benz"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modelo">Modelo *</Label>
                  <Input 
                    id="modelo"
                    value={nuevoVehiculo.modelo || ''}
                    onChange={(e) => setNuevoVehiculo({...nuevoVehiculo, modelo: e.target.value})}
                    placeholder="Tourismo"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select 
                    value={nuevoVehiculo.tipo} 
                    onValueChange={(v) => setNuevoVehiculo({...nuevoVehiculo, tipo: v as TipoVehiculo})}
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
                    value={nuevoVehiculo.plazas}
                    onChange={(e) => setNuevoVehiculo({...nuevoVehiculo, plazas: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNuevoVehiculoOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleNuevoVehiculo} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear Vehículo'}
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
                <p className="text-sm font-medium text-slate-500">Operativos</p>
                <p className="text-3xl font-bold">{vehiculosOperativos}</p>
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
                <p className="text-3xl font-bold">{vehiculosTaller}</p>
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
                <p className="text-sm font-medium text-slate-500">Plazas Totales</p>
                <p className="text-3xl font-bold">{totalPlazas}</p>
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
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar vehículos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={estadoFiltro} onValueChange={(v) => setEstadoFiltro(v as EstadoVehiculo | 'todos')}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="activo">Operativo</SelectItem>
                <SelectItem value="taller">En Taller</SelectItem>
                <SelectItem value="reservado">Reservado</SelectItem>
                <SelectItem value="baja">De Baja</SelectItem>
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
                  {vehiculosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No se encontraron vehículos
                      </TableCell>
                    </TableRow>
                  ) : (
                    vehiculosFiltrados.map((vehiculo) => (
                      <TableRow key={vehiculo.id}>
                        <TableCell className="font-medium">{vehiculo.matricula}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{vehiculo.marca} {vehiculo.modelo}</p>
                            <p className="text-xs text-slate-500">{vehiculo.bastidor}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{tipoVehiculoLabels[vehiculo.tipo]}</Badge>
                        </TableCell>
                        <TableCell>{vehiculo.plazas}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Gauge className="h-4 w-4 text-slate-400" />
                            {vehiculo.kilometraje?.toLocaleString('es-ES')} km
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {vehiculo.itv?.fechaProxima ? format(parseISO(toDateString(vehiculo.itv.fechaProxima)), 'dd/MM/yyyy') : '-'}
                            </span>
                            {getDiasITV(vehiculo.itv?.fechaProxima) !== null && getDiasITV(vehiculo.itv?.fechaProxima)! <= 30 && (
                              <span className="text-xs text-red-600">
                                {getDiasITV(vehiculo.itv?.fechaProxima)} días
                              </span>
                            )}
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
                  {vehiculosITVProxima.map(vehiculo => (
                    <div key={vehiculo.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <div>
                        <p className="font-medium">{vehiculo.matricula}</p>
                        <p className="text-sm text-slate-600">{vehiculo.marca} {vehiculo.modelo}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-amber-700">
                          {vehiculo.itv?.fechaProxima ? format(parseISO(toDateString(vehiculo.itv.fechaProxima)), 'dd/MM/yyyy') : '-'}
                        </p>
                        <p className="text-xs text-amber-600">
                          {getDiasITV(vehiculo.itv?.fechaProxima)} días restantes
                        </p>
                      </div>
                    </div>
                  ))}
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
                      {vehiculoSeleccionado.kilometraje?.toLocaleString('es-ES')} km
                    </p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Consumo</Label>
                    <p className="flex items-center gap-2">
                      <Fuel className="h-4 w-4" />
                      {vehiculoSeleccionado.consumoMedio} L/100km
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4">
                  <div>
                    <Label className="text-slate-500">Próxima ITV</Label>
                    <p>{vehiculoSeleccionado.itv?.fechaProxima ? format(parseISO(toDateString(vehiculoSeleccionado.itv.fechaProxima)), 'dd/MM/yyyy') : '-'}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Seguro Vence</Label>
                    <p>{vehiculoSeleccionado.seguro?.fechaVencimiento ? format(parseISO(toDateString(vehiculoSeleccionado.seguro.fechaVencimiento)), 'dd/MM/yyyy') : '-'}</p>
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