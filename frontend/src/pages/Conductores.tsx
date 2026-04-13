// ============================================
// MILANO - Conductores Page (con datos reales)
// ============================================

import { useState, useEffect } from 'react';
import { useConductoresStore, useUIStore } from '../store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  UserCircle,
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  Calendar,
  Clock,
  Star,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Award,
  Loader2,
} from 'lucide-react';
import type { Conductor, EstadoConductor } from '../types';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toDateString } from '../lib/utils';

const estadoConductorColors: Record<EstadoConductor, string> = {
  activo: 'bg-green-100 text-green-700',
  baja: 'bg-red-100 text-red-700',
  vacaciones: 'bg-blue-100 text-blue-700',
  descanso: 'bg-amber-100 text-amber-700',
  inactivo: 'bg-gray-100 text-gray-700',
  en_ruta: 'bg-purple-100 text-purple-700',
};

export default function Conductores() {
  const { conductores, isLoading, error, addConductor, updateConductor, deleteConductor, fetchConductores } = useConductoresStore();
  const { showToast } = useUIStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoConductor | 'todos'>('todos');
  const [conductorSeleccionado, setConductorSeleccionado] = useState<Conductor | null>(null);
  const [isNuevoConductorOpen, setIsNuevoConductorOpen] = useState(false);
  const [isEditarOpen, setIsEditarOpen] = useState(false);
  const [nuevoConductor, setNuevoConductor] = useState<Partial<Conductor>>({
    estado: 'activo',
    tarifaHora: 18,
    disponibilidad: { dias: [0, 1, 2, 3, 4], horaInicio: '08:00', horaFin: '18:00' },
    licencia: { tipo: 'D', numero: '', fechaCaducidad: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() }
  });

  // Refrescar datos al montar
  useEffect(() => {
    fetchConductores();
  }, [fetchConductores]);

  // Filtrar conductores
  const conductoresFiltrados = conductores.filter(conductor => {
    const matchesSearch = 
      conductor.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conductor.apellidos?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conductor.codigo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conductor.dni?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEstado = estadoFiltro === 'todos' || conductor.estado === estadoFiltro;
    return matchesSearch && matchesEstado;
  });

  // Estadísticas
  const conductoresActivos = conductores.filter(c => c.estado === 'activo').length;
  const conductoresVacaciones = conductores.filter(c => c.estado === 'vacaciones').length;
  const totalHorasMes = conductores.reduce((sum, c) => sum + (c.totalHorasMes || 0), 0);

  // Conductores con licencia próxima a caducar
  const conductoresLicenciaProxima = conductores.filter(c => {
    const fechaCaducidad = c.licencia?.fechaCaducidad ? parseISO(toDateString(c.licencia.fechaCaducidad)) : null;
    return fechaCaducidad && differenceInDays(fechaCaducidad, new Date()) <= 30 && differenceInDays(fechaCaducidad, new Date()) >= 0;
  });

  const handleNuevoConductor = async () => {
    if (!nuevoConductor.nombre || !nuevoConductor.apellidos || !nuevoConductor.dni) {
      showToast('Por favor complete los campos obligatorios', 'error');
      return;
    }

    const success = await addConductor(nuevoConductor as Omit<Conductor, 'id' | 'codigo' | 'fechaAlta'>);
    if (success) {
      setIsNuevoConductorOpen(false);
      setNuevoConductor({ 
        estado: 'activo', 
        tarifaHora: 18, 
        disponibilidad: { dias: [0, 1, 2, 3, 4], horaInicio: '08:00', horaFin: '18:00' },
        licencia: { tipo: 'D', numero: '', fechaCaducidad: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() }
      });
      showToast('Conductor creado correctamente', 'success');
    }
  };

  const handleEditarConductor = async () => {
    if (!conductorSeleccionado) return;
    
const success = await updateConductor(String(conductorSeleccionado.id), conductorSeleccionado);    if (success) {
      setIsEditarOpen(false);
      showToast('Conductor actualizado correctamente', 'success');
    }
  };

  const handleEliminarConductor = async (id: string) => {
    if (window.confirm('¿Está seguro de eliminar este conductor?')) {
      const success = await deleteConductor(id);
      if (success) {
        showToast('Conductor eliminado', 'success');
      }
    }
  };

  if (isLoading && conductores.length === 0) {
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
          <h1 className="text-2xl font-bold text-slate-900">Conductores</h1>
          <p className="text-slate-500">Gestión de personal y recursos humanos</p>
        </div>
        <Dialog open={isNuevoConductorOpen} onOpenChange={setIsNuevoConductorOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Conductor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo Conductor</DialogTitle>
              <DialogDescription>
                Complete la información del nuevo conductor
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input 
                    id="nombre"
                    value={nuevoConductor.nombre || ''}
                    onChange={(e) => setNuevoConductor({...nuevoConductor, nombre: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellidos">Apellidos *</Label>
                  <Input 
                    id="apellidos"
                    value={nuevoConductor.apellidos || ''}
                    onChange={(e) => setNuevoConductor({...nuevoConductor, apellidos: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dni">DNI *</Label>
                <Input 
                  id="dni"
                  value={nuevoConductor.dni || ''}
                  onChange={(e) => setNuevoConductor({...nuevoConductor, dni: e.target.value})}
                  placeholder="12345678A"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input 
                    id="telefono"
                    value={nuevoConductor.telefono || ''}
                    onChange={(e) => setNuevoConductor({...nuevoConductor, telefono: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email"
                    type="email"
                    value={nuevoConductor.email || ''}
                    onChange={(e) => setNuevoConductor({...nuevoConductor, email: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tarifa">Tarifa/Hora (€)</Label>
                <Input 
                  id="tarifa"
                  type="number"
                  value={nuevoConductor.tarifaHora}
                  onChange={(e) => setNuevoConductor({...nuevoConductor, tarifaHora: parseFloat(e.target.value)})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNuevoConductorOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleNuevoConductor} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear Conductor'}
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
                <p className="text-sm font-medium text-slate-500">Activos</p>
                <p className="text-3xl font-bold">{conductoresActivos}</p>
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
                <p className="text-sm font-medium text-slate-500">Vacaciones</p>
                <p className="text-3xl font-bold">{conductoresVacaciones}</p>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Horas Este Mes</p>
                <p className="text-3xl font-bold">{totalHorasMes}</p>
              </div>
              <div className="rounded-full bg-purple-100 p-3">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Licencias Próximas</p>
                <p className="text-3xl font-bold">{conductoresLicenciaProxima.length}</p>
              </div>
              <div className="rounded-full bg-amber-100 p-3">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="conductores" className="space-y-4">
        <TabsList>
          <TabsTrigger value="conductores">Conductores</TabsTrigger>
          <TabsTrigger value="alertas">Alertas ({conductoresLicenciaProxima.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="conductores" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar conductores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={estadoFiltro} onValueChange={(v) => setEstadoFiltro(v as EstadoConductor | 'todos')}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="vacaciones">Vacaciones</SelectItem>
                <SelectItem value="baja">De Baja</SelectItem>
                <SelectItem value="descanso">Descanso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Drivers Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conductor</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Licencia</TableHead>
                    <TableHead>Tarifa/Hora</TableHead>
                    <TableHead>Horas Mes</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conductoresFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No se encontraron conductores
                      </TableCell>
                    </TableRow>
                  ) : (
                    conductoresFiltrados.map((conductor) => (
                      <TableRow key={conductor.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-[#1e3a5f] text-white">
                                {conductor.nombre?.charAt(0)}{conductor.apellidos?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{conductor.nombre} {conductor.apellidos}</p>
                              <p className="text-xs text-slate-500">{conductor.codigo}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {conductor.telefono || '-'}
                            </span>
                            <span className="flex items-center gap-1 text-sm text-slate-500">
                              <Mail className="h-3 w-3" />
                              {conductor.email || '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">Tipo {conductor.licencia?.tipo || '-'}</span>
                            <span className={`text-xs ${
                              differenceInDays(parseISO(toDateString(conductor.licencia?.fechaCaducidad) || new Date().toISOString()), new Date()) <= 30 
                                ? 'text-red-600 font-medium' 
                                : 'text-slate-500'
                            }`}>
                              Vence: {conductor.licencia?.fechaCaducidad ? format(parseISO(toDateString(conductor.licencia.fechaCaducidad)), 'dd/MM/yyyy') : '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{conductor.tarifaHora}€/h</span>
                        </TableCell>
                        <TableCell>
                          <div className="w-24">
                            <Progress 
                              value={((conductor.totalHorasMes || 0) / 160) * 100} 
                              className="h-2" 
                            />
                            <span className="text-xs text-slate-500">
                              {conductor.totalHorasMes || 0}h
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={estadoConductorColors[conductor.estado]}>
                            {conductor.estado}
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
                              <DropdownMenuItem onClick={() => setConductorSeleccionado(conductor)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setConductorSeleccionado(conductor); setIsEditarOpen(true); }}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleEliminarConductor(conductor.id)}
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
                <AlertTriangle className="h-5 w-5" />
                Licencias Próximas a Caducar
              </CardTitle>
              <CardDescription>
                Conductores con licencia en los próximos 30 días
              </CardDescription>
            </CardHeader>
            <CardContent>
              {conductoresLicenciaProxima.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-500" />
                  <p>No hay licencias próximas a caducar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conductoresLicenciaProxima.map(conductor => (
                    <div key={conductor.id} className="flex items-center justify-between p-4 rounded-lg bg-amber-50 border border-amber-200">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-amber-500 text-white">
                            {conductor.nombre?.charAt(0)}{conductor.apellidos?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{conductor.nombre} {conductor.apellidos}</p>
                          <p className="text-sm text-slate-600">{conductor.codigo} • Licencia tipo {conductor.licencia?.tipo}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-amber-700">
                          Caduca: {conductor.licencia?.fechaCaducidad ? format(parseISO(toDateString(conductor.licencia.fechaCaducidad)), 'dd/MM/yyyy') : '-'}
                        </p>
                        <p className="text-xs text-amber-600">
                          {differenceInDays(parseISO(toDateString(conductor.licencia?.fechaCaducidad) || new Date().toISOString()), new Date())} días restantes
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

      {/* Driver Detail Dialog */}
      <Dialog open={!!conductorSeleccionado && !isEditarOpen} onOpenChange={() => setConductorSeleccionado(null)}>
        <DialogContent className="max-w-2xl">
          {conductorSeleccionado && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-[#1e3a5f] text-white text-xl">
                      {conductorSeleccionado.nombre?.charAt(0)}{conductorSeleccionado.apellidos?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle>{conductorSeleccionado.nombre} {conductorSeleccionado.apellidos}</DialogTitle>
                    <DialogDescription>
                      {conductorSeleccionado.codigo} • {conductorSeleccionado.dni}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500">Email</Label>
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {conductorSeleccionado.email || '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Teléfono</Label>
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {conductorSeleccionado.telefono || '-'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500">Licencia</Label>
                    <p className="flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Tipo {conductorSeleccionado.licencia?.tipo || '-'} - {conductorSeleccionado.licencia?.numero || '-'}
                    </p>
                    <p className="text-sm text-slate-500">
                      Caduca: {conductorSeleccionado.licencia?.fechaCaducidad ? format(parseISO(toDateString(conductorSeleccionado.licencia.fechaCaducidad)), 'dd/MM/yyyy') : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Tarifa/Hora</Label>
                    <p className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      {conductorSeleccionado.tarifaHora}€/h
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500">Horas Este Mes</Label>
                    <p>{conductorSeleccionado.totalHorasMes || 0} horas</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Servicios Este Mes</Label>
                    <p>{conductorSeleccionado.totalServiciosMes || 0} servicios</p>
                  </div>
                </div>
                {conductorSeleccionado.valoracion && (
                  <div>
                    <Label className="text-slate-500">Valoración</Label>
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                      <span className="text-lg font-medium">{conductorSeleccionado.valoracion}</span>
                      <span className="text-slate-500">/5</span>
                    </div>
                  </div>
                )}
                {conductorSeleccionado.notas && (
                  <div>
                    <Label className="text-slate-500">Notas</Label>
                    <p className="text-sm">{conductorSeleccionado.notas}</p>
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