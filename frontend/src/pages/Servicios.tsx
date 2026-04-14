// ============================================
// MILANO - Servicios Page
// ============================================

import { useState } from 'react';
import { useServiciosStore, useClientesStore, useUIStore } from '../store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
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
} from 'lucide-react';
import type { Servicio, TipoServicio, EstadoServicio } from '../types';
import { format } from 'date-fns';
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

export default function Servicios() {
  const { servicios, addServicio, deleteServicio } = useServiciosStore();
  const { clientes } = useClientesStore();
  const { showToast } = useUIStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoServicio | 'todos'>('todos');
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null);
  const [isNuevoServicioOpen, setIsNuevoServicioOpen] = useState(false);
  const [nuevoServicio, setNuevoServicio] = useState<Partial<Servicio>>({
    tipo: 'discrecional',
    estado: 'planificando',
    numeroVehiculos: 1,
  });

  // Filtrar servicios
  const serviciosFiltrados = servicios.filter(servicio => {
    const matchesSearch = 
      servicio.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      servicio.titulo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      servicio.clienteNombre?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEstado = estadoFiltro === 'todos' || servicio.estado === estadoFiltro;
    return matchesSearch && matchesEstado;
  });

  // Estadísticas
  const serviciosActivos = servicios.filter(s => 
    s.estado === 'en_curso' || s.estado === 'asignado'
  ).length;
  const serviciosPendientes = servicios.filter(s => 
    s.estado === 'planificando' || s.estado === 'confirmado'
  ).length;
  const serviciosCompletados = servicios.filter(s => s.estado === 'completado').length;
  const serviciosFacturados = servicios.filter(s => s.estado === 'facturado').length;

  const handleNuevoServicio = () => {
    if (!nuevoServicio.titulo || !nuevoServicio.clienteId) {
      showToast('Por favor complete los campos obligatorios', 'error');
      return;
    }

    const cliente = clientes.find(c => String(c.id) === String(nuevoServicio.clienteId));

    const servicio: Servicio = {
      id: `s${Date.now()}`,
      codigo: `SRV${String(servicios.length + 1).padStart(3, '0')}`,
      clienteId: nuevoServicio.clienteId || '',
      clienteNombre: cliente?.nombre || '',
      tipo: nuevoServicio.tipo as TipoServicio,
      estado: 'planificando',
      fechaInicio: nuevoServicio.fechaInicio ? new Date(nuevoServicio.fechaInicio).toISOString() : new Date().toISOString(),
      fechaFin: nuevoServicio.fechaFin ? new Date(nuevoServicio.fechaFin).toISOString() : undefined,
      titulo: nuevoServicio.titulo || '',
      descripcion: nuevoServicio.descripcion || '',
      numeroVehiculos: nuevoServicio.numeroVehiculos || 1,
      vehiculosAsignados: [],
      conductoresAsignados: [],
      rutas: [],
      costeEstimado: nuevoServicio.costeEstimado || 0,
      precio: nuevoServicio.precio || 0,
      facturado: false,
      tareas: [
        { id: `t${Date.now()}-1`, nombre: 'Recopilar información del evento', completada: false },
        { id: `t${Date.now()}-2`, nombre: 'Planificar rutas', completada: false },
        { id: `t${Date.now()}-3`, nombre: 'Asignar conductores', completada: false },
        { id: `t${Date.now()}-4`, nombre: 'Preparar vehículos', completada: false },
      ],
      incidencias: [],
      documentos: [],
      fechaCreacion: new Date().toISOString(),
      creadoPor: 'Sistema',
    };

    addServicio(servicio);
    setIsNuevoServicioOpen(false);
    setNuevoServicio({ tipo: 'discrecional', estado: 'planificando', numeroVehiculos: 1 });
    showToast('Servicio creado correctamente', 'success');
  };

  const handleEliminarServicio = (id: string | number) => {
    if (window.confirm('¿Está seguro de eliminar este servicio?')) {
      deleteServicio(String(id));
      showToast('Servicio eliminado', 'success');
    }
  };

  const getProgresoTareas = (servicio: Servicio) => {
    if (!servicio.tareas || servicio.tareas.length === 0) return 0;
    const completadas = servicio.tareas.filter(t => t.completada).length;
    return Math.round((completadas / servicio.tareas.length) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Servicios</h1>
          <p className="text-slate-500">Gestión de proyectos de transporte</p>
        </div>
        <Dialog open={isNuevoServicioOpen} onOpenChange={setIsNuevoServicioOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Servicio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo Servicio</DialogTitle>
              <DialogDescription>
                Complete la información del nuevo servicio
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente *</Label>
                <Select 
                  value={String(nuevoServicio.clienteId || '')} 
                  onValueChange={(v) => setNuevoServicio({...nuevoServicio, clienteId: v})}
                >
                  <SelectTrigger>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Select 
                    value={nuevoServicio.tipo} 
                    onValueChange={(v) => setNuevoServicio({...nuevoServicio, tipo: v as TipoServicio})}
                  >
                    <SelectTrigger>
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
                <div className="space-y-2">
                  <Label htmlFor="vehiculos">Nº Vehículos</Label>
                  <Input 
                    id="vehiculos"
                    type="number"
                    min={1}
                    value={nuevoServicio.numeroVehiculos}
                    onChange={(e) => setNuevoServicio({...nuevoServicio, numeroVehiculos: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input 
                  id="titulo"
                  value={nuevoServicio.titulo || ''}
                  onChange={(e) => setNuevoServicio({...nuevoServicio, titulo: e.target.value})}
                  placeholder="Descripción breve del servicio"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fechaInicio">Fecha Inicio</Label>
                  <Input 
                    id="fechaInicio"
                    type="date"
                    value={nuevoServicio.fechaInicio ? format(new Date(nuevoServicio.fechaInicio), 'yyyy-MM-dd') : ''}
                    onChange={(e) => setNuevoServicio({...nuevoServicio, fechaInicio: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaFin">Fecha Fin</Label>
                  <Input 
                    id="fechaFin"
                    type="date"
                    value={nuevoServicio.fechaFin ? format(new Date(nuevoServicio.fechaFin), 'yyyy-MM-dd') : ''}
                    onChange={(e) => setNuevoServicio({...nuevoServicio, fechaFin: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="coste">Coste Estimado (€)</Label>
                  <Input 
                    id="coste"
                    type="number"
                    value={nuevoServicio.costeEstimado || ''}
                    onChange={(e) => setNuevoServicio({...nuevoServicio, costeEstimado: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="precio">Precio (€)</Label>
                  <Input 
                    id="precio"
                    type="number"
                    value={nuevoServicio.precio || ''}
                    onChange={(e) => setNuevoServicio({...nuevoServicio, precio: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNuevoServicioOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleNuevoServicio}>
                Crear Servicio
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
                <p className="text-3xl font-bold">{serviciosActivos}</p>
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
                <p className="text-3xl font-bold">{serviciosPendientes}</p>
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
                <p className="text-3xl font-bold">{serviciosCompletados}</p>
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
                <p className="text-3xl font-bold">{serviciosFacturados}</p>
              </div>
              <div className="rounded-full bg-emerald-100 p-3">
                <Euro className="h-6 w-6 text-emerald-600" />
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
            placeholder="Buscar servicios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={estadoFiltro} onValueChange={(v) => setEstadoFiltro(v as EstadoServicio | 'todos')}>
          <SelectTrigger className="w-48">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="planificando">Planificando</SelectItem>
            <SelectItem value="asignado">Asignado</SelectItem>
            <SelectItem value="en_curso">En Curso</SelectItem>
            <SelectItem value="completado">Completado</SelectItem>
            <SelectItem value="facturado">Facturado</SelectItem>
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
                <TableHead>Precio</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviciosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    No se encontraron servicios
                  </TableCell>
                </TableRow>
              ) : (
                serviciosFiltrados.map((servicio) => (
                  <TableRow key={servicio.id}>
                    <TableCell className="font-medium">{servicio.codigo}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{servicio.titulo}</p>
                        <Badge variant="outline" className="text-xs">
                          {tipoServicioLabels[servicio.tipo]}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{servicio.clienteNombre}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {servicio.fechaInicio ? format(new Date(servicio.fechaInicio), 'dd/MM/yyyy') : '-'}
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
                    <TableCell>
                      <span className="font-medium">
                        {(servicio.precio || 0).toLocaleString('es-ES')}€
                      </span>
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
                    <p className="font-medium">{servicioSeleccionado.clienteNombre}</p>
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
                      <Calendar className="h-4 w-4" />
                      {servicioSeleccionado.fechaInicio ? format(new Date(servicioSeleccionado.fechaInicio), 'dd/MM/yyyy') : '-'}
                      {servicioSeleccionado.horaInicio && ` ${servicioSeleccionado.horaInicio}`}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-500">Fecha Fin</Label>
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {servicioSeleccionado.fechaFin ? format(new Date(servicioSeleccionado.fechaFin), 'dd/MM/yyyy') : '-'}
                      {servicioSeleccionado.horaFin && ` ${servicioSeleccionado.horaFin}`}
                    </p>
                  </div>
                </div>

                {/* Asignaciones */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-slate-500">Vehículos Asignados</Label>
                    <p className="flex items-center gap-2">
                      {servicioSeleccionado.vehiculosAsignados?.length || 0} / {servicioSeleccionado.numeroVehiculos || 0}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-500">Conductores Asignados</Label>
                    <p className="flex items-center gap-2">
                      {servicioSeleccionado.conductoresAsignados?.length || 0} conductores
                    </p>
                  </div>
                </div>

                {/* Financiero */}
                <div className="grid grid-cols-3 gap-4 rounded-lg bg-slate-50 p-4">
                  <div>
                    <Label className="text-slate-500">Coste Estimado</Label>
                    <p className="text-lg font-medium">{(servicioSeleccionado.costeEstimado || 0).toLocaleString('es-ES')}€</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Precio</Label>
                    <p className="text-lg font-medium">{(servicioSeleccionado.precio || 0).toLocaleString('es-ES')}€</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Margen</Label>
                    <p className={`text-lg font-medium ${
                      ((servicioSeleccionado.margen || 0)) > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(servicioSeleccionado.margen || 0).toLocaleString('es-ES')}€
                    </p>
                  </div>
                </div>

                {/* Tareas */}
                {servicioSeleccionado.tareas && servicioSeleccionado.tareas.length > 0 && (
                  <div>
                    <Label className="text-slate-500 mb-2 block">Tareas del Proyecto</Label>
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
                    <Label className="text-slate-500 mb-2 block">Incidencias</Label>
                    <div className="space-y-2">
                      {servicioSeleccionado.incidencias.map((incidencia) => (
                        <div key={incidencia.id} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-red-700">{incidencia.tipo}</p>
                            <p className="text-sm text-red-600">{incidencia.descripcion}</p>
                            <p className="text-xs text-red-500 mt-1">
                              {incidencia.fecha ? format(new Date(incidencia.fecha), 'dd/MM/yyyy HH:mm') : '-'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                {!servicioSeleccionado.facturado && servicioSeleccionado.estado === 'completado' && (
                  <Button asChild>
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