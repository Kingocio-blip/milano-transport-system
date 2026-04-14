// ============================================
// MILANO - Rutas Page
// ============================================

import { useState } from 'react';
import { useServiciosStore, useVehiculosStore, useConductoresStore, useUIStore } from '../store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
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
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Route,
  MapPin,
  Clock,
  Bus,
  UserCircle,
  Search,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  FileDown,
  Navigation,
  Calendar,
} from 'lucide-react';
import type { Ruta, Parada, Horario } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Rutas() {
  const { servicios } = useServiciosStore();
  const { vehiculos } = useVehiculosStore();
  const { conductores } = useConductoresStore();
  const { showToast } = useUIStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [rutaSeleccionada, setRutaSeleccionada] = useState<Ruta | null>(null);

  // Obtener todas las rutas de todos los servicios
  const todasLasRutas: Ruta[] = servicios.flatMap(s => s.rutas || []);

  // Filtrar rutas
  const rutasFiltradas = todasLasRutas.filter(ruta => {
    const matchesSearch = 
      ruta.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ruta.origen?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ruta.destino?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Estadísticas
  const totalRutas = todasLasRutas.length;
  const rutasActivas = todasLasRutas.filter(r => r.estado === 'activa').length;
  const totalParadas = todasLasRutas.reduce((sum, r) => sum + (r.paradas?.length || 0), 0);
  const totalHorarios = todasLasRutas.reduce((sum, r) => sum + (r.horarios?.length || 0), 0);

  const getVehiculoNombre = (id?: string) => {
    if (!id) return 'No asignado';
    const v = vehiculos.find(ve => String(ve.id) === id);
    return v ? `${v.marca} ${v.modelo} (${v.matricula})` : 'No asignado';
  };

  const getConductorNombre = (id?: string) => {
    if (!id) return 'No asignado';
    const c = conductores.find(co => String(co.id) === id);
    return c ? `${c.nombre} ${c.apellidos}` : 'No asignado';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rutas</h1>
          <p className="text-slate-500">Planificación de rutas y horarios</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Ruta
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Rutas</p>
                <p className="text-3xl font-bold">{totalRutas}</p>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <Route className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Rutas Activas</p>
                <p className="text-3xl font-bold">{rutasActivas}</p>
              </div>
              <div className="rounded-full bg-green-100 p-3">
                <Navigation className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Paradas</p>
                <p className="text-3xl font-bold">{totalParadas}</p>
              </div>
              <div className="rounded-full bg-purple-100 p-3">
                <MapPin className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Horarios</p>
                <p className="text-3xl font-bold">{totalHorarios}</p>
              </div>
              <div className="rounded-full bg-amber-100 p-3">
                <Clock className="h-6 w-6 text-amber-600" />
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
            placeholder="Buscar rutas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Routes Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ruta</TableHead>
                <TableHead>Origen → Destino</TableHead>
                <TableHead>Distancia</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead>Conductor</TableHead>
                <TableHead>Horarios</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rutasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    No se encontraron rutas
                  </TableCell>
                </TableRow>
              ) : (
                rutasFiltradas.map((ruta) => (
                  <TableRow key={ruta.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{ruta.nombre}</p>
                        {ruta.descripcion && (
                          <p className="text-xs text-slate-500">{ruta.descripcion}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{ruta.origen}</span>
                        <span className="text-xs text-slate-400">↓</span>
                        <span className="text-sm">{ruta.destino}</span>
                      </div>
                    </TableCell>
                    <TableCell>{ruta.distanciaKm} km</TableCell>
                    <TableCell>{ruta.duracionEstimada} min</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Bus className="h-4 w-4 text-slate-400" />
                        {getVehiculoNombre(ruta.vehiculoAsignadoId)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <UserCircle className="h-4 w-4 text-slate-400" />
                        {getConductorNombre(ruta.conductorAsignadoId)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <Clock className="mr-1 h-3 w-3" />
                        {ruta.horarios?.length || 0} horarios
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
                          <DropdownMenuItem onClick={() => setRutaSeleccionada(ruta)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileDown className="mr-2 h-4 w-4" />
                            Exportar PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
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

      {/* Route Detail Dialog */}
      <Dialog open={!!rutaSeleccionada} onOpenChange={() => setRutaSeleccionada(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          {rutaSeleccionada && (
            <>
              <DialogHeader>
                <DialogTitle>{rutaSeleccionada.nombre}</DialogTitle>
                <DialogDescription>
                  {rutaSeleccionada.descripcion}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Info General */}
                <div className="grid grid-cols-3 gap-4 rounded-lg bg-slate-50 p-4">
                  <div>
                    <Label className="text-slate-500">Origen</Label>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {rutaSeleccionada.origen}
                    </p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Destino</Label>
                    <p className="flex items-center gap-2">
                      <Navigation className="h-4 w-4" />
                      {rutaSeleccionada.destino}
                    </p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Distancia/Duración</Label>
                    <p>{rutaSeleccionada.distanciaKm} km / {rutaSeleccionada.duracionEstimada} min</p>
                  </div>
                </div>

                {/* Asignaciones */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <Label className="text-slate-500 mb-2 block">Vehículo Asignado</Label>
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-blue-100 p-2">
                        <Bus className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{getVehiculoNombre(rutaSeleccionada.vehiculoAsignadoId)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <Label className="text-slate-500 mb-2 block">Conductor Asignado</Label>
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-green-100 p-2">
                        <UserCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{getConductorNombre(rutaSeleccionada.conductorAsignadoId)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Paradas */}
                {rutaSeleccionada.paradas && rutaSeleccionada.paradas.length > 0 && (
                  <div>
                    <Label className="text-slate-500 mb-2 block">Paradas</Label>
                    <div className="space-y-2">
                      {rutaSeleccionada.paradas.map((parada, index) => (
                        <div key={parada.id} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1e3a5f] text-white text-sm font-medium">
                            {(parada.orden || index) + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{parada.nombre}</p>
                            <p className="text-sm text-slate-500">{parada.direccion}</p>
                          </div>
                          {parada.horaLlegada && (
                            <Badge variant="outline">
                              <Clock className="mr-1 h-3 w-3" />
                              {parada.horaLlegada}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Horarios */}
                {rutaSeleccionada.horarios && rutaSeleccionada.horarios.length > 0 && (
                  <div>
                    <Label className="text-slate-500 mb-2 block">Horarios</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {rutaSeleccionada.horarios.map((horario) => (
                        <div key={horario.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-slate-400" />
                            <span>{horario.horaSalida} - {horario.horaLlegada}</span>
                          </div>
                          <div className="flex gap-1">
                            {horario.diasSemana?.map(dia => (
                              <span key={dia} className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-xs">
                                {['L', 'M', 'X', 'J', 'V', 'S', 'D'][dia] || dia}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notas */}
                {rutaSeleccionada.notasConductor && (
                  <div className="rounded-lg bg-amber-50 p-4">
                    <Label className="text-amber-700 mb-1 block">Notas para el Conductor</Label>
                    <p className="text-sm text-amber-800">{rutaSeleccionada.notasConductor}</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline">
                  <FileDown className="mr-2 h-4 w-4" />
                  Exportar PDF
                </Button>
                <Button>
                  <Navigation className="mr-2 h-4 w-4" />
                  Ver en Mapa
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}