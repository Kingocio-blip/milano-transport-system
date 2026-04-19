// ============================================
// MILANO - Panel del Conductor (OPTIMIZADO)
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Separator } from '../components/ui/separator';
import { 
  Bus, 
  Clock, 
  MapPin, 
  Phone, 
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  Play,
  Square,
  Fuel,
  Wrench,
  Sparkles,
  FileText,
  Euro,
  TrendingUp,
  Settings,
  Route,
  ClipboardCheck,
  Camera,
  Upload,
  ChevronRight,
  Navigation,
  Timer,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { removeTokens } from '../lib/api';
import { useConductoresStore, useServiciosStore, useVehiculosStore, useUIStore } from '../store';
import { format, parseISO, differenceInMinutes, differenceInHours, addHours, isAfter, isBefore, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

// Tipos extendidos para el panel
type EstadoFichaje = 'no_fichado' | 'fichado_entrada' | 'en_ruta' | 'fichado_salida';
type TareaServicio = { id: string; nombre: string; completada: boolean; tipo: 'conductor' | 'sistema' };
type GastoServicio = { id: string; tipo: 'gasoil' | 'peaje' | 'aparcamiento' | 'otro'; cantidad: number; precio: number; notas?: string; ticket?: string };
type RevisionBus = { id: string; tipo: 'limpieza' | 'neumaticos' | 'aceite' | 'luces' | 'otro'; estado: 'ok' | 'ko' | 'na'; notas?: string };

// FIX: Helper seguro para parsear fechas
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

// FIX: Helper seguro para formatear fechas
const formatDateSafe = (date: string | Date | undefined, formatStr: string = 'dd/MM/yyyy'): string => {
  const parsed = parseDateSafe(date);
  return parsed ? format(parsed, formatStr) : '-';
};

export default function PanelConductor() {
  const navigate = useNavigate();
  const { showToast } = useUIStore();
  const { conductores, updateConductor, fetchConductores } = useConductoresStore();
  const { servicios, updateServicio, fetchServicios } = useServiciosStore();
  const { vehiculos, fetchVehiculos } = useVehiculosStore();

  const [conductorActual, setConductorActual] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('servicios');

  // Estados de fichaje y servicio activo
  const [estadoFichaje, setEstadoFichaje] = useState<EstadoFichaje>('no_fichado');
  const [servicioActivo, setServicioActivo] = useState<any>(null);
  const [horaFichaje, setHoraFichaje] = useState<Date | null>(null);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);

  // Dialogs
  const [dialogGasto, setDialogGasto] = useState(false);
  const [dialogRevision, setDialogRevision] = useState(false);
  const [dialogRuta, setDialogRuta] = useState(false);
  const [dialogDisponibilidad, setDialogDisponibilidad] = useState(false);
  const [dialogTarea, setDialogTarea] = useState<{abierto: boolean; tarea: TareaServicio | null}>({ abierto: false, tarea: null });

  // Formularios
  const [nuevoGasto, setNuevoGasto] = useState<Partial<GastoServicio>>({ tipo: 'gasoil', cantidad: 0, precio: 0 });
  const [nuevaRevision, setNuevaRevision] = useState<Partial<RevisionBus>>({ tipo: 'limpieza', estado: 'ok' });
  const [nuevaRuta, setNuevaRuta] = useState({ kmInicio: 0, kmFin: 0, rutaAlternativa: '' });
  const [disponibilidadEdit, setDisponibilidadEdit] = useState<any>(null);

  // Cargar datos
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchConductores(), fetchServicios(), fetchVehiculos()]);
      setIsLoading(false);
    };
    loadData();
    
    // Timer para tiempo transcurrido
    const interval = setInterval(() => {
      if (horaFichaje && estadoFichaje !== 'no_fichado') {
        setTiempoTranscurrido(differenceInMinutes(new Date(), horaFichaje));
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, [fetchConductores, fetchServicios, fetchVehiculos, horaFichaje, estadoFichaje]);

  // Identificar conductor logueado (simulado - en producción del token JWT)
  useEffect(() => {
    if (conductores.length > 0 && !conductorActual) {
      // En producción: decodificar token y buscar por ID
      const conductor = conductores[0]; // Simulación
      setConductorActual(conductor);
      setDisponibilidadEdit(conductor.disponibilidad || {
        dias: [1, 2, 3, 4, 5],
        horaInicio: '08:00',
        horaFin: '18:00'
      });
    }
  }, [conductores, conductorActual]);

  // Servicios asignados al conductor
  const misServicios = useMemo(() => {
    if (!conductorActual) return [];
    return servicios.filter(s => 
      s.conductoresAsignados?.includes(String(conductorActual.id)) ||
      s.conductoresAsignados?.includes(conductorActual.id)
    ).sort((a, b) => {
      const fechaA = parseDateSafe(a.fechaInicio);
      const fechaB = parseDateSafe(b.fechaInicio);
      return (fechaA?.getTime() || 0) - (fechaB?.getTime() || 0);
    });
  }, [servicios, conductorActual]);

  // Servicios por estado
  const serviciosHoy = useMemo(() => {
    const hoy = new Date();
    return misServicios.filter(s => {
      const fechaServicio = parseDateSafe(s.fechaInicio);
      return fechaServicio && 
        format(fechaServicio, 'yyyy-MM-dd') === format(hoy, 'yyyy-MM-dd') &&
        ['planificando', 'asignado', 'en_curso'].includes(s.estado);
    });
  }, [misServicios]);

  const serviciosPendientes = useMemo(() => {
    return misServicios.filter(s => ['planificando', 'asignado'].includes(s.estado));
  }, [misServicios]);

  const serviciosCompletados = useMemo(() => {
    return misServicios.filter(s => ['completado', 'facturado'].includes(s.estado));
  }, [misServicios]);

  // Estadísticas del conductor
  const stats = useMemo(() => ({
    serviciosMes: serviciosCompletados.filter(s => {
      const fecha = parseDateSafe(s.fechaFin);
      return fecha && fecha.getMonth() === new Date().getMonth();
    }).length,
    horasMes: serviciosCompletados.reduce((sum, s) => {
      const inicio = parseDateSafe(s.fechaInicio);
      const fin = parseDateSafe(s.fechaFin);
      if (inicio && fin) return sum + differenceInHours(fin, inicio);
      return sum;
    }, 0),
    ingresosEstimados: serviciosCompletados.reduce((sum, s) => sum + ((s.precio || 0) * 0.3), 0), // 30% comisión estimada
  }), [serviciosCompletados]);

  // Handlers
  const handleLogout = () => {
    removeTokens();
    navigate('/login');
  };

  const handleFicharEntrada = async (servicio: any) => {
    const ahora = new Date();
    setEstadoFichaje('fichado_entrada');
    setHoraFichaje(ahora);
    setServicioActivo(servicio);
    
    // Actualizar servicio en backend
    await updateServicio(servicio.id, {
      estado: 'en_curso',
      horaInicioReal: ahora.toISOString(),
    });
    
    showToast('Fichaje de entrada registrado', 'success');
  };

  const handleIniciarRuta = () => {
    setEstadoFichaje('en_ruta');
    setNuevaRuta(prev => ({ ...prev, kmInicio: servicioActivo?.vehiculo?.kilometraje || 0 }));
    setDialogRuta(true);
  };

  const handleFicharSalida = async () => {
    const ahora = new Date();
    setEstadoFichaje('fichado_salida');
    
    // Calcular horas totales
    const horasTotales = horaFichaje ? differenceInHours(ahora, horaFichaje) : 0;
    
    await updateServicio(servicioActivo.id, {
      estado: 'completado',
      horaFinReal: ahora.toISOString(),
      horasReales: horasTotales,
      costeReal: (servicioActivo.costeEstimado || 0) + (nuevoGasto.precio || 0),
    });
    
    // Actualizar horas del conductor
    await updateConductor(conductorActual.id, {
      totalHorasMes: (conductorActual.totalHorasMes || 0) + horasTotales,
      totalServiciosMes: (conductorActual.totalServiciosMes || 0) + 1,
    });
    
    showToast('Servicio completado. Recuerda registrar el gasoil.', 'success');
    setDialogGasto(true); // Abrir diálogo de gasto obligatorio
  };

  const handleGuardarGasto = async () => {
    if (!servicioActivo) return;
    
    const gastoCompleto: GastoServicio = {
      id: `g${Date.now()}`,
      tipo: nuevoGasto.tipo || 'gasoil',
      cantidad: nuevoGasto.cantidad || 0,
      precio: nuevoGasto.precio || 0,
      notas: nuevoGasto.notas,
    };
    
    // Añadir gasto al servicio
    const gastosActuales = servicioActivo.gastos || [];
    await updateServicio(servicioActivo.id, {
      gastos: [...gastosActuales, gastoCompleto],
      costeReal: (servicioActivo.costeReal || servicioActivo.costeEstimado || 0) + gastoCompleto.precio,
    });
    
    setDialogGasto(false);
    setNuevoGasto({ tipo: 'gasoil', cantidad: 0, precio: 0 });
    
    if (estadoFichaje === 'fichado_salida') {
      // Reset después de completar todo
      setTimeout(() => {
        setEstadoFichaje('no_fichado');
        setServicioActivo(null);
        setHoraFichaje(null);
        setTiempoTranscurrido(0);
      }, 2000);
    }
    
    showToast('Gasto registrado correctamente', 'success');
  };

  const handleGuardarRevision = async () => {
    if (!servicioActivo?.vehiculo) return;
    
    const revisionCompleta: RevisionBus = {
      id: `r${Date.now()}`,
      tipo: nuevaRevision.tipo || 'limpieza',
      estado: nuevaRevision.estado || 'ok',
      notas: nuevaRevision.notas,
    };
    
    await updateServicio(servicioActivo.id, {
      revisiones: [...(servicioActivo.revisiones || []), revisionCompleta],
    });
    
    setDialogRevision(false);
    setNuevaRevision({ tipo: 'limpieza', estado: 'ok' });
    showToast('Revisión registrada', 'success');
  };

  const handleCompletarTarea = async (tarea: TareaServicio) => {
    if (!servicioActivo) return;
    
    const tareasActualizadas = (servicioActivo.tareas || []).map((t: TareaServicio) => 
      t.id === tarea.id ? { ...t, completada: !t.completada } : t
    );
    
    await updateServicio(servicioActivo.id, { tareas: tareasActualizadas });
    showToast(tarea.completada ? 'Tarea desmarcada' : 'Tarea completada', 'success');
  };

  const handleGuardarDisponibilidad = async () => {
    await updateConductor(conductorActual.id, {
      disponibilidad: {
        dias: disponibilidadEdit.dias,
        horaInicio: disponibilidadEdit.horaInicio,
        horaFin: disponibilidadEdit.horaFin,
      }
    });
    setDialogDisponibilidad(false);
    showToast('Disponibilidad actualizada', 'success');
  };

  const handleGuardarRuta = async () => {
    if (!servicioActivo) return;
    
    await updateServicio(servicioActivo.id, {
      kmInicio: nuevaRuta.kmInicio,
      rutaTomada: nuevaRuta.rutaAlternativa || 'Ruta estándar',
    });
    
    setDialogRuta(false);
    showToast('Ruta iniciada. ¡Conduzca con cuidado!', 'success');
  };

  const handleFinalizarRuta = async () => {
    if (!servicioActivo) return;
    
    await updateServicio(servicioActivo.id, {
      kmFin: nuevaRuta.kmFin,
      kmTotal: nuevaRuta.kmFin - nuevaRuta.kmInicio,
    });
    
    // Actualizar kilometraje del vehículo
    if (servicioActivo.vehiculo) {
      // Aquí llamarías a updateVehiculo
    }
    
    showToast('Ruta finalizada', 'success');
  };

  if (isLoading || !conductorActual) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  const formatTiempo = (minutos: number) => {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-[#1e3a5f] text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <User className="h-7 w-7" />
              </div>
              <div>
                <h1 className="font-bold text-lg">
                  {conductorActual.nombre} {conductorActual.apellidos}
                </h1>
                <p className="text-sm text-white/70">{conductorActual.codigo} • {conductorActual.licencia?.tipo}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {estadoFichaje !== 'no_fichado' && (
                <div className="text-right mr-4">
                  <p className="text-xs text-white/70">Tiempo trabajado</p>
                  <p className="font-mono font-bold text-lg">{formatTiempo(tiempoTranscurrido)}</p>
                </div>
              )}
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white hover:bg-white/20">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto p-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-[#1e3a5f]">{stats.serviciosMes}</p>
              <p className="text-xs text-slate-500">Servicios este mes</p>
            </div>
            <div className="text-center border-x">
              <p className="text-2xl font-bold text-[#1e3a5f]">{stats.horasMes}h</p>
              <p className="text-xs text-slate-500">Horas trabajadas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.ingresosEstimados.toFixed(0)}€</p>
              <p className="text-xs text-slate-500">Ingresos estimados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="servicios">Mis Servicios</TabsTrigger>
            <TabsTrigger value="activo">En Curso {servicioActivo && <span className="ml-1 text-xs">●</span>}</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
            <TabsTrigger value="perfil">Mi Perfil</TabsTrigger>
          </TabsList>

          {/* TAB: SERVICIOS */}
          <TabsContent value="servicios" className="space-y-4">
            {/* Servicios de Hoy */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Servicios de Hoy
                  <Badge variant="secondary">{serviciosHoy.length}</Badge>
                </CardTitle>
                <CardDescription>
                  {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {serviciosHoy.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <CheckCircle2 className="mx-auto h-12 w-12 mb-2" />
                    <p>No tienes servicios asignados para hoy</p>
                  </div>
                ) : (
                  serviciosHoy.map(servicio => (
                    <div key={servicio.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg">{servicio.codigo}</h3>
                            <Badge className={
                              servicio.estado === 'en_curso' ? 'bg-green-100 text-green-700' :
                              servicio.estado === 'asignado' ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                            }>
                              {servicio.estado === 'en_curso' ? 'En Curso' : 
                               servicio.estado === 'asignado' ? 'Asignado' : 'Planificando'}
                            </Badge>
                          </div>
                          <p className="text-slate-600 font-medium">{servicio.titulo}</p>
                          <p className="text-sm text-slate-500">{servicio.clienteNombre}</p>
                        </div>
                        {servicio.estado !== 'en_curso' ? (
                          <Button 
                            onClick={() => handleFicharEntrada(servicio)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Fichar Entrada
                          </Button>
                        ) : servicioActivo?.id === servicio.id ? (
                          <Button 
                            onClick={handleFicharSalida}
                            variant="destructive"
                          >
                            <Square className="mr-2 h-4 w-4" />
                            Fichar Salida
                          </Button>
                        ) : (
                          <Badge variant="outline">Ocupado</Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span>{servicio.horaInicio || '--:--'} - {servicio.horaFin || '--:--'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span className="truncate">{servicio.origen || 'Sin origen'}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Próximos Servicios */}
            {serviciosPendientes.length > serviciosHoy.length && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Próximos Servicios
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {serviciosPendientes
                    .filter(s => !serviciosHoy.includes(s))
                    .slice(0, 5)
                    .map(servicio => (
                      <div key={servicio.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                        <div>
                          <p className="font-medium">{servicio.codigo} - {servicio.titulo}</p>
                          <p className="text-sm text-slate-500">
                            {formatDateSafe(servicio.fechaInicio)} • {servicio.horaInicio}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB: SERVICIO ACTIVO */}
          <TabsContent value="activo" className="space-y-4">
            {!servicioActivo ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Clock className="mx-auto h-16 w-16 text-slate-300 mb-4" />
                  <p className="text-lg text-slate-500">No tienes ningún servicio activo</p>
                  <p className="text-sm text-slate-400">Ve a "Mis Servicios" para fichar entrada</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Info del Servicio Activo */}
                <Card className="border-green-200 bg-green-50/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-green-800">
                          <Bus className="h-5 w-5" />
                          {servicioActivo.codigo}
                        </CardTitle>
                        <CardDescription className="text-green-700">
                          {servicioActivo.titulo} • {servicioActivo.clienteNombre}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold font-mono text-green-800">
                          {formatTiempo(tiempoTranscurrido)}
                        </p>
                        <p className="text-xs text-green-600">Tiempo transcurrido</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Botones de acción rápida */}
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        onClick={() => setDialogRuta(true)}
                        variant="outline" 
                        className="h-auto py-3"
                      >
                        <Navigation className="mr-2 h-5 w-5" />
                        <div className="text-left">
                          <p className="font-medium">Ruta</p>
                          <p className="text-xs text-slate-500">{nuevaRuta.kmInicio > 0 ? 'En progreso' : 'Iniciar'}</p>
                        </div>
                      </Button>
                      <Button 
                        onClick={() => setDialogRevision(true)}
                        variant="outline"
                        className="h-auto py-3"
                      >
                        <Wrench className="mr-2 h-5 w-5" />
                        <div className="text-left">
                          <p className="font-medium">Revisión</p>
                          <p className="text-xs text-slate-500">Bus y limpieza</p>
                        </div>
                      </Button>
                      <Button 
                        onClick={() => setDialogGasto(true)}
                        variant="outline"
                        className="h-auto py-3"
                      >
                        <Fuel className="mr-2 h-5 w-5" />
                        <div className="text-left">
                          <p className="font-medium">Gasto</p>
                          <p className="text-xs text-slate-500">Gasoil, peaje...</p>
                        </div>
                      </Button>
                      <Button 
                        onClick={handleFicharSalida}
                        variant="destructive"
                        className="h-auto py-3"
                      >
                        <Square className="mr-2 h-5 w-5" />
                        <div className="text-left">
                          <p className="font-medium">Finalizar</p>
                          <p className="text-xs text-white/70">Fichar salida</p>
                        </div>
                      </Button>
                    </div>

                    {/* Tareas del servicio */}
                    {servicioActivo.tareas && servicioActivo.tareas.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-slate-700">Tareas pendientes</h4>
                        <div className="space-y-2">
                          {servicioActivo.tareas.map((tarea: TareaServicio) => (
                            <div 
                              key={tarea.id}
                              onClick={() => handleCompletarTarea(tarea)}
                              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                tarea.completada ? 'bg-green-100' : 'bg-white border'
                              }`}
                            >
                              <div className={`h-5 w-5 rounded flex items-center justify-center ${
                                tarea.completada ? 'bg-green-500 text-white' : 'border-2 border-slate-300'
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
                  </CardContent>
                </Card>

                {/* Detalles del servicio */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Detalles del Servicio</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-slate-500">Origen</p>
                        <p>{servicioActivo.origen || 'No especificado'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-slate-500">Destino</p>
                        <p>{servicioActivo.destino || 'No especificado'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <FileText className="h-4 w-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-slate-500">Descripción</p>
                        <p>{servicioActivo.descripcion || 'Sin descripción'}</p>
                      </div>
                    </div>
                    {servicioActivo.notasInternas && (
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                        <div>
                          <p className="text-slate-500">Notas internas</p>
                          <p className="text-amber-700">{servicioActivo.notasInternas}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* TAB: HISTORIAL */}
          <TabsContent value="historial" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Servicios Completados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {serviciosCompletados.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <p>Aún no has completado ningún servicio</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {serviciosCompletados.map(servicio => (
                      <div key={servicio.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                        <div>
                          <p className="font-medium">{servicio.codigo} - {servicio.titulo}</p>
                          <p className="text-sm text-slate-500">
                           {`${formatDateSafe(servicio.fechaInicio)} • ${servicio.horaInicioReal || servicio.horaInicio} - ${servicio.horaFinReal || servicio.horaFin}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-green-600">{(servicio.horasReales || 0) * (conductorActual.tarifaHora || 18)}€</p>
                          <p className="text-xs text-slate-500">{servicio.horasReales || 0}h</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: PERFIL */}
          <TabsContent value="perfil" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Mi Información
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500">Nombre</Label>
                    <p className="font-medium">{conductorActual.nombre} {conductorActual.apellidos}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">DNI</Label>
                    <p className="font-medium">{conductorActual.dni}</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500">Teléfono</Label>
                    <p className="font-medium">{conductorActual.telefono || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Email</Label>
                    <p className="font-medium">{conductorActual.email || '-'}</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500">Licencia</Label>
                    <p className="font-medium">Tipo {conductorActual.licencia?.tipo || '-'}</p>
                    <p className="text-sm text-slate-500">
                      Caduca: {formatDateSafe(conductorActual.licencia?.fechaCaducidad)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Tarifa/Hora</Label>
                    <p className="font-medium">{conductorActual.tarifaHora || 18}€/h</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-slate-500">Disponibilidad</Label>
                    <p className="text-sm">
                      {conductorActual.disponibilidad?.dias?.map((d: number) => ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d]).join(', ')}
                    </p>
                    <p className="text-sm text-slate-500">
                      {conductorActual.disponibilidad?.horaInicio} - {conductorActual.disponibilidad?.horaFin}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setDialogDisponibilidad(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* DIALOG: Gasto */}
      <Dialog open={dialogGasto} onOpenChange={setDialogGasto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5" />
              Registrar Gasto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de gasto</Label>
              <Select
                value={nuevoGasto.tipo}
                onValueChange={(v) => setNuevoGasto({...nuevoGasto, tipo: v as any})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gasoil">⛽ Gasoil</SelectItem>
                  <SelectItem value="peaje">🛣️ Peaje</SelectItem>
                  <SelectItem value="aparcamiento">🅿️ Aparcamiento</SelectItem>
                  <SelectItem value="otro">📝 Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {nuevoGasto.tipo === 'gasoil' && (
              <div className="space-y-2">
                <Label>Litros</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={nuevoGasto.cantidad || ''}
                  onChange={(e) => {
                    const litros = parseFloat(e.target.value) || 0;
                    const precioLitro = 1.6; // Precio configurable
                    setNuevoGasto({
                      ...nuevoGasto,
                      cantidad: litros,
                      precio: Math.round(litros * precioLitro * 100) / 100
                    });
                  }}
                  placeholder="Ej: 45.5"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Importe (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={nuevoGasto.precio || ''}
                onChange={(e) => setNuevoGasto({...nuevoGasto, precio: parseFloat(e.target.value) || 0})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={nuevoGasto.notas || ''}
                onChange={(e) => setNuevoGasto({...nuevoGasto, notas: e.target.value})}
                placeholder="Estación de servicio, ticket..."
              />
            </div>
            
            {nuevoGasto.tipo === 'gasoil' && nuevoGasto.cantidad && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm">
                <p className="text-blue-700">
                  💡 Estimación: {Math.round((nuevoGasto.cantidad || 0) / 0.35)} km aprox. 
                  (consumo 35L/100km)
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogGasto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarGasto} className="bg-[#1e3a5f]">
              Guardar Gasto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Revisión */}
      <Dialog open={dialogRevision} onOpenChange={setDialogRevision}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Revisión del Vehículo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de revisión</Label>
              <Select
                value={nuevaRevision.tipo}
                onValueChange={(v) => setNuevaRevision({...nuevaRevision, tipo: v as any})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="limpieza">🧽 Limpieza interior/exterior</SelectItem>
                  <SelectItem value="neumaticos">🛞 Neumáticos</SelectItem>
                  <SelectItem value="aceite">🛢️ Nivel de aceite</SelectItem>
                  <SelectItem value="luces">💡 Luces</SelectItem>
                  <SelectItem value="otro">🔧 Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Estado</Label>
              <div className="flex gap-4">
                {[
                  { value: 'ok', label: '✅ Correcto', color: 'bg-green-100 text-green-700' },
                  { value: 'ko', label: '❌ Defectuoso', color: 'bg-red-100 text-red-700' },
                  { value: 'na', label: '➖ No aplica', color: 'bg-slate-100 text-slate-700' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setNuevaRevision({...nuevaRevision, estado: opt.value as any})}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      nuevaRevision.estado === opt.value 
                        ? 'border-[#1e3a5f] ' + opt.color 
                        : 'border-transparent bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Notas / Incidencias</Label>
              <Textarea
                value={nuevaRevision.notas || ''}
                onChange={(e) => setNuevaRevision({...nuevaRevision, notas: e.target.value})}
                placeholder="Describe cualquier incidencia encontrada..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogRevision(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarRevision} className="bg-[#1e3a5f]">
              Guardar Revisión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Ruta */}
      <Dialog open={dialogRuta} onOpenChange={setDialogRuta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              {nuevaRuta.kmInicio > 0 ? 'Finalizar Ruta' : 'Iniciar Ruta'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {nuevaRuta.kmInicio === 0 ? (
              <>
                <div className="space-y-2">
                  <Label>Kilometraje inicio</Label>
                  <Input
                    type="number"
                    value={nuevaRuta.kmInicio || ''}
                    onChange={(e) => setNuevaRuta({...nuevaRuta, kmInicio: parseInt(e.target.value) || 0})}
                    placeholder="KM del cuentakilómetros"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ruta alternativa (opcional)</Label>
                  <Textarea
                    value={nuevaRuta.rutaAlternativa}
                    onChange={(e) => setNuevaRuta({...nuevaRuta, rutaAlternativa: e.target.value})}
                    placeholder="Desvíos, atascos, ruta alternativa tomada..."
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <Label className="text-slate-500 text-xs">KM Inicio</Label>
                    <p className="font-medium">{nuevaRuta.kmInicio}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>KM Final</Label>
                    <Input
                      type="number"
                      value={nuevaRuta.kmFin || ''}
                      onChange={(e) => setNuevaRuta({...nuevaRuta, kmFin: parseInt(e.target.value) || 0})}
                      placeholder="KM al finalizar"
                    />
                  </div>
                </div>
                {nuevaRuta.kmFin > nuevaRuta.kmInicio && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <Label className="text-green-700">Total recorrido</Label>
                    <p className="text-2xl font-bold text-green-800">
                      {nuevaRuta.kmFin - nuevaRuta.kmInicio} km
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogRuta(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={nuevaRuta.kmInicio === 0 ? handleGuardarRuta : handleFinalizarRuta}
              className="bg-[#1e3a5f]"
              disabled={nuevaRuta.kmInicio === 0 ? !nuevaRuta.kmInicio : nuevaRuta.kmFin <= nuevaRuta.kmInicio}
            >
              {nuevaRuta.kmInicio === 0 ? 'Iniciar Ruta' : 'Finalizar Ruta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Disponibilidad */}
      <Dialog open={dialogDisponibilidad} onOpenChange={setDialogDisponibilidad}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Editar Disponibilidad
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Días disponibles</Label>
              <div className="flex flex-wrap gap-2">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((dia, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <Checkbox
                      id={`disp-${idx}`}
                      checked={disponibilidadEdit?.dias?.includes(idx)}
                      onCheckedChange={(checked) => {
                        const dias = checked
                          ? [...(disponibilidadEdit?.dias || []), idx]
                          : (disponibilidadEdit?.dias || []).filter((d: number) => d !== idx);
                        setDisponibilidadEdit({ ...disponibilidadEdit, dias });
                      }}
                    />
                    <Label htmlFor={`disp-${idx}`} className="text-sm cursor-pointer">{dia}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hora inicio</Label>
                <Input
                  type="time"
                  value={disponibilidadEdit?.horaInicio || '08:00'}
                  onChange={(e) => setDisponibilidadEdit({...disponibilidadEdit, horaInicio: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora fin</Label>
                <Input
                  type="time"
                  value={disponibilidadEdit?.horaFin || '18:00'}
                  onChange={(e) => setDisponibilidadEdit({...disponibilidadEdit, horaFin: e.target.value})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogDisponibilidad(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarDisponibilidad} className="bg-[#1e3a5f]">
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}