// ============================================
// MILANO - Rutas Page (OPTIMIZADO)
// ============================================
// FUTURO: Integración con Google Maps Directions API
// - Calcular paradas automáticas entre origen y destino
// - Distancia real en km (no estimada)
// - Mostrar ruta visual en el panel del conductor
// - Navegación turn-by-turn

import { useState, useMemo, useCallback } from 'react';
import { useServiciosStore, useVehiculosStore, useConductoresStore, useUIStore } from '../store';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
  Loader2,
  Calculator,
  Fuel,
  Euro,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import type { Ruta, Parada, Horario, Servicio } from '../types';
import { format, parseISO, isValid, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';

// FIX: Helpers de fechas (igual que en otros archivos)
const parseDateSafe = (date: string | Date | undefined): Date | null => {
  if (!date) return null;
  try {
    const dateStr = typeof date === 'string' ? date : date.toISOString();
    const parsed = parseISO(dateStr);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const formatDateSafe = (date: string | Date | undefined, formatStr: string = 'dd/MM/yyyy'): string => {
  const parsed = parseDateSafe(date);
  return parsed ? format(parsed, formatStr) : '-';
};

// FUTURO: Constantes para cálculo de costes de ruta
const CONSUMO_LITROS_100KM = 35;
const PRECIO_GASOIL_LITRO = 1.6;
const COSTE_KM_CONDUCTOR = 0.5; // €/km estimado

// FUTURO: Interfaz para datos de Google Maps
interface RouteMapData {
  distanceMeters: number;
  durationSeconds: number;
  polyline: string;
  steps: Array<{
    instruction: string;
    distanceMeters: number;
    durationSeconds: number;
  }>;
}

export default function Rutas() {
  const { servicios, isLoading } = useServiciosStore();
  const { vehiculos } = useVehiculosStore();
  const { conductores } = useConductoresStore();
  const { showToast } = useUIStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [rutaSeleccionada, setRutaSeleccionada] = useState<Ruta | null>(null);
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null);
  const [activeTab, setActiveTab] = useState('todas');

  // Obtener todas las rutas de todos los servicios con referencia al servicio padre
  const todasLasRutas = useMemo(() => {
    const rutas: Array<Ruta & { servicioId: string; servicioCodigo: string; servicioFecha: string }> = [];
    servicios.forEach(s => {
      if (s.rutas) {
        s.rutas.forEach(r => {
          rutas.push({
            ...r,
            servicioId: String(s.id),
            servicioCodigo: s.codigo || '',
            servicioFecha: s.fechaInicio || '',
          });
        });
      }
    });
    return rutas;
  }, [servicios]);

  // Filtrar rutas
  const rutasFiltradas = useMemo(() => {
    return todasLasRutas.filter(ruta => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = searchLower === '' ||
        ruta.nombre?.toLowerCase().includes(searchLower) ||
        ruta.origen?.toLowerCase().includes(searchLower) ||
        ruta.destino?.toLowerCase().includes(searchLower) ||
        ruta.servicioCodigo?.toLowerCase().includes(searchLower);
      
      // Filtro por tab
      if (activeTab === 'hoy') {
        const fechaRuta = parseDateSafe(ruta.servicioFecha);
        const hoy = new Date();
        return matchesSearch && fechaRuta && format(fechaRuta, 'yyyy-MM-dd') === format(hoy, 'yyyy-MM-dd');
      }
      if (activeTab === 'activas') {
        return matchesSearch && ruta.estado === 'activa';
      }
      
      return matchesSearch;
    });
  }, [todasLasRutas, searchQuery, activeTab]);

  // Estadísticas
  const stats = useMemo(() => ({
    total: todasLasRutas.length,
    activas: todasLasRutas.filter(r => r.estado === 'activa').length,
    hoy: todasLasRutas.filter(r => {
      const fecha = parseDateSafe(r.servicioFecha);
      return fecha && format(fecha, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    }).length,
    totalParadas: todasLasRutas.reduce((sum, r) => sum + (r.paradas?.length || 0), 0),
    totalHorarios: todasLasRutas.reduce((sum, r) => sum + (r.horarios?.length || 0), 0),
    // FUTURO: Distancia total calculada
    distanciaTotalKm: todasLasRutas.reduce((sum, r) => sum + (r.distanciaKm || 0), 0),
  }), [todasLasRutas]);

  // FUTURO: Calcular coste estimado de una ruta
  const calcularCosteRuta = useCallback((ruta: Ruta): number => {
    const distancia = ruta.distanciaKm || 0;
    const litrosGasoil = (distancia * CONSUMO_LITROS_100KM) / 100;
    const costeGasoil = litrosGasoil * PRECIO_GASOIL_LITRO;
    const costeConductor = distancia * COSTE_KM_CONDUCTOR;
    return costeGasoil + costeConductor;
  }, []);

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

  // FUTURO: Abrir ruta en Google Maps
  const abrirEnGoogleMaps = (origen: string, destino: string, paradas?: Parada[]) => {
    const waypoints = paradas?.map(p => encodeURIComponent(p.direccion || p.nombre)).join('|') || '';
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origen)}&destination=${encodeURIComponent(destino)}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=driving`;
    window.open(url, '_blank');
  };

  // FUTURO: Calcular ruta con Google Maps API (requiere API key)
  const calcularRutaMaps = async (origen: string, destino: string, paradas?: Parada[]) => {
    // Implementación futura con Directions API
    // const response = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${origen}&destination=${destino}&key=${API_KEY}`);
    showToast('Función disponible próximamente: integración con Google Maps', 'info');
  };

  if (isLoading) {
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
          <h1 className="text-2xl font-bold text-slate-900">Rutas</h1>
          <p className="text-slate-500">Planificación de rutas, paradas y horarios</p>
        </div>
        <Button className="bg-[#1e3a5f] hover:bg-[#152a45]">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Ruta
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Rutas</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="rounded-full bg-blue-100 p-2">
                <Route className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Hoy</p>
                <p className="text-2xl font-bold">{stats.hoy}</p>
              </div>
              <div className="rounded-full bg-green-100 p-2">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Activas</p>
                <p className="text-2xl font-bold">{stats.activas}</p>
              </div>
              <div className="rounded-full bg-purple-100 p-2">
                <Navigation className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Paradas</p>
                <p className="text-2xl font-bold">{stats.totalParadas}</p>
              </div>
              <div className="rounded-full bg-amber-100 p-2">
                <MapPin className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Horarios</p>
                <p className="text-2xl font-bold">{stats.totalHorarios}</p>
              </div>
              <div className="rounded-full bg-cyan-100 p-2">
                <Clock className="h-5 w-5 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Dist. Total</p>
                <p className="text-2xl font-bold">{stats.distanciaTotalKm} km</p>
              </div>
              <div className="rounded-full bg-red-100 p-2">
                <Navigation className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs y Filtros */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <TabsList>
            <TabsTrigger value="todas">Todas ({stats.total})</TabsTrigger>
            <TabsTrigger value="hoy">Hoy ({stats.hoy})</TabsTrigger>
            <TabsTrigger value="activas">Activas ({stats.activas})</TabsTrigger>
          </TabsList>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar rutas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <TabsContent value={activeTab} className="m-0">
          {/* Routes Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ruta</TableHead>
                    <TableHead>Servicio / Fecha</TableHead>
                    <TableHead>Origen → Destino</TableHead>
                    <TableHead>Distancia / Coste</TableHead>
                    <TableHead>Vehículo / Conductor</TableHead>
                    <TableHead>Paradas</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rutasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        <Route className="mx-auto h-12 w-12 mb-2 text-slate-300" />
                        <p>No se encontraron rutas</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rutasFiltradas.map((ruta) => {
                      const costeEstimado = calcularCosteRuta(ruta);
                      return (
                        <TableRow key={`${ruta.servicioId}-${ruta.id}`} className="hover:bg-slate-50">
                          <TableCell>
                            <div>
                              <p className="font-medium">{ruta.nombre}</p>
                              {ruta.descripcion && (
                                <p className="text-xs text-slate-500 truncate max-w-[150px]">{ruta.descripcion}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium text-[#1e3a5f]">{ruta.servicioCodigo}</p>
                              <p className="text-slate-500">{formatDateSafe(ruta.servicioFecha)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-sm">
                              <span className="truncate max-w-[150px]" title={ruta.origen}>{ruta.origen}</span>
                              <span className="text-xs text-slate-400">↓ {ruta.duracionEstimada} min</span>
                              <span className="truncate max-w-[150px]" title={ruta.destino}>{ruta.destino}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{ruta.distanciaKm} km</p>
                              <p className="text-slate-500 flex items-center gap-1">
                                <Calculator className="h-3 w-3" />
                                ~{costeEstimado.toFixed(2)}€
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-xs">
                              <div className="flex items-center gap-1">
                                <Bus className="h-3 w-3 text-slate-400" />
                                <span className="truncate max-w-[120px]">{getVehiculoNombre(ruta.vehiculoAsignadoId)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <UserCircle className="h-3 w-3 text-slate-400" />
                                <span className="truncate max-w-[120px]">{getConductorNombre(ruta.conductorAsignadoId)}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              <MapPin className="mr-1 h-3 w-3" />
                              {ruta.paradas?.length || 0} paradas
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
                                <DropdownMenuItem onClick={() => abrirEnGoogleMaps(ruta.origen || '', ruta.destino || '', ruta.paradas)}>
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Ver en Google Maps
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
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Route Detail Dialog - MEJORADO */}
      <Dialog open={!!rutaSeleccionada} onOpenChange={() => setRutaSeleccionada(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          {rutaSeleccionada && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      <Route className="h-5 w-5" />
                      {rutaSeleccionada.nombre}
                    </DialogTitle>
                    <DialogDescription>
                      {rutaSeleccionada.servicioCodigo} • {formatDateSafe(rutaSeleccionada.servicioFecha)}
                    </DialogDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => abrirEnGoogleMaps(
                      rutaSeleccionada.origen || '',
                      rutaSeleccionada.destino || '',
                      rutaSeleccionada.paradas
                    )}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Google Maps
                  </Button>
                </div>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Info General con Costes */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <Label className="text-slate-500 text-xs">Origen</Label>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {rutaSeleccionada.origen}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <Label className="text-slate-500 text-xs">Destino</Label>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Navigation className="h-3 w-3" />
                      {rutaSeleccionada.destino}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <Label className="text-slate-500 text-xs">Distancia / Tiempo</Label>
                    <p className="text-sm font-medium">{rutaSeleccionada.distanciaKm} km / {rutaSeleccionada.duracionEstimada} min</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-3">
                    <Label className="text-blue-600 text-xs">Coste Estimado</Label>
                    <p className="text-sm font-bold text-blue-700 flex items-center gap-1">
                      <Euro className="h-3 w-3" />
                      {calcularCosteRuta(rutaSeleccionada).toFixed(2)}€
                    </p>
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

                {/* Paradas con Timeline */}
                {rutaSeleccionada.paradas && rutaSeleccionada.paradas.length > 0 && (
                  <div>
                    <Label className="text-slate-500 mb-3 block flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Paradas ({rutaSeleccionada.paradas.length})
                    </Label>
                    <div className="relative space-y-0">
                      {rutaSeleccionada.paradas.map((parada, index) => (
                        <div key={parada.id} className="flex gap-4 pb-4 last:pb-0">
                          <div className="flex flex-col items-center">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                              index === 0 ? 'bg-green-500 text-white' :
                              index === (rutaSeleccionada.paradas?.length || 0) - 1 ? 'bg-red-500 text-white' :
                              'bg-[#1e3a5f] text-white'
                            }`}>
                              {index + 1}
                            </div>
                            {index < (rutaSeleccionada.paradas?.length || 0) - 1 && (
                              <div className="w-0.5 flex-1 bg-slate-200 my-1" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-start justify-between">
                              <div>
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
                            {/* FUTURO: Mostrar distancia desde parada anterior */}
                            {index > 0 && (
                              <p className="text-xs text-slate-400 mt-1">
                                ~{Math.round((rutaSeleccionada.distanciaKm || 0) / (rutaSeleccionada.paradas?.length || 1))} km desde anterior
                              </p>
                            )}
                          </div>
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
                    <Label className="text-amber-700 mb-1 block flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Notas para el Conductor
                    </Label>
                    <p className="text-sm text-amber-800">{rutaSeleccionada.notasConductor}</p>
                  </div>
                )}

                {/* FUTURO: Sección de Mapa */}
                <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center">
                  <Navigation className="mx-auto h-12 w-12 text-slate-300 mb-2" />
                  <p className="text-slate-500 font-medium">Mapa de la Ruta</p>
                  <p className="text-sm text-slate-400 mb-4">
                    Próximamente: Visualización interactiva con Google Maps
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => abrirEnGoogleMaps(
                      rutaSeleccionada.origen || '',
                      rutaSeleccionada.destino || '',
                      rutaSeleccionada.paradas
                    )}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir en Google Maps
                  </Button>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline">
                  <FileDown className="mr-2 h-4 w-4" />
                  Exportar PDF
                </Button>
                <Button className="bg-[#1e3a5f] hover:bg-[#152a45]">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar Ruta
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}