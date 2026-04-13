// ============================================
// MILANO - Dashboard Page (con datos reales)
// ============================================

import { useEffect } from 'react';
import { 
  useServiciosStore, 
  useVehiculosStore, 
  useConductoresStore, 
  useFacturasStore,
  useDashboardStore,
  useUIStore,
  useClientesStore,
} from '../store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Briefcase,
  Bus,
  UserCircle,
  Euro,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Calendar,
  ArrowRight,
  Users,
  Loader2,
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { toDateString } from '../lib/utils';

const COLORS = ['#1e3a5f', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const { clientes, isLoading: loadingClientes } = useClientesStore();
  const { vehiculos, isLoading: loadingVehiculos } = useVehiculosStore();
  const { conductores, isLoading: loadingConductores } = useConductoresStore();
  const { servicios, isLoading: loadingServicios, fetchServicios } = useServiciosStore();
  const { facturas, isLoading: loadingFacturas, fetchFacturas } = useFacturasStore();
  const { kpi, refreshKPI } = useDashboardStore();
  const { showToast } = useUIStore();

  useEffect(() => {
    fetchServicios();
    fetchFacturas();
    refreshKPI();
  }, [fetchServicios, fetchFacturas, refreshKPI]);

  const isLoading = loadingClientes || loadingVehiculos || loadingConductores || loadingServicios || loadingFacturas;

  // Datos para gráficos
  const serviciosPorTipo = [
    { name: 'Lanzadera', value: servicios.filter(s => s.tipo === 'lanzadera').length },
    { name: 'Discrecional', value: servicios.filter(s => s.tipo === 'discrecional').length },
    { name: 'Staff', value: servicios.filter(s => s.tipo === 'staff').length },
    { name: 'Ruta Programada', value: servicios.filter(s => s.tipo === 'ruta_programada').length },
  ].filter(s => s.value > 0);

  // Servicios de los próximos 7 días
  const hoy = new Date();
  const proximos7Dias = eachDayOfInterval({
    start: hoy,
    end: addDays(hoy, 6)
  });

  const serviciosProximos = proximos7Dias.map(dia => ({
    fecha: format(dia, 'EEE', { locale: es }),
    servicios: servicios.filter(s => {
      const fechaInicio = s.fechaInicio ? parseISO(toDateString(s.fechaInicio)) : null;
      return fechaInicio && isSameDay(fechaInicio, dia);
    }).length,
  }));

  // KPIs calculados
  const vehiculosOperativos = vehiculos.filter(v => v.estado === 'operativo').length;
  const conductoresActivos = conductores.filter(c => c.estado === 'activo').length;
  const serviciosHoy = servicios.filter(s => {
    const fechaInicio = s.fechaInicio ? parseISO(toDateString(s.fechaInicio)) : null;
    return fechaInicio && isSameDay(fechaInicio, hoy);
  });
  
  const totalPendiente = facturas
    .filter(f => f.estado === 'pendiente' || f.estado === 'enviada')
    .reduce((sum, f) => sum + (f.total || 0), 0);
  
  const serviciosPendientesFacturar = servicios.filter(s => 
    s.estado === 'completado' && !s.facturado
  );

  if (isLoading && !kpi) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-12 w-12 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Vista general del estado operativo</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/servicios">
              + Nuevo Servicio
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Clientes</p>
                <p className="text-3xl font-bold">{clientes.length}</p>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-slate-500">
                {clientes.filter(c => c.estado === 'activo').length} activos
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Vehículos Operativos</p>
                <p className="text-3xl font-bold">{vehiculosOperativos}</p>
              </div>
              <div className="rounded-full bg-green-100 p-3">
                <Bus className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-amber-600">
                {vehiculos.filter(v => v.estado === 'taller').length} en taller
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Conductores Activos</p>
                <p className="text-3xl font-bold">{conductoresActivos}</p>
              </div>
              <div className="rounded-full bg-purple-100 p-3">
                <UserCircle className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-slate-500">
                {conductores.filter(c => c.estado === 'vacaciones').length} de vacaciones
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Facturación Pendiente</p>
                <p className="text-3xl font-bold">{totalPendiente.toLocaleString('es-ES')}€</p>
              </div>
              <div className="rounded-full bg-amber-100 p-3">
                <Euro className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-slate-500">
                {facturas.filter(f => f.estado === 'pendiente').length} facturas pendientes
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Servicios por día */}
        <Card>
          <CardHeader>
            <CardTitle>Servicios Próximos 7 Días</CardTitle>
            <CardDescription>Distribución de servicios para la próxima semana</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={serviciosProximos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="servicios" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Servicios por tipo */}
        <Card>
          <CardHeader>
            <CardTitle>Servicios por Tipo</CardTitle>
            <CardDescription>Distribución de servicios según su categoría</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={serviciosPorTipo}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {serviciosPorTipo.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 flex flex-wrap justify-center gap-4">
              {serviciosPorTipo.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-slate-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Servicios Pendientes de Facturar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Servicios Pendientes de Facturar</CardTitle>
            <CardDescription>Servicios completados sin factura generada</CardDescription>
          </div>
          <Badge variant="secondary">{serviciosPendientesFacturar.length}</Badge>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {serviciosPendientesFacturar.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <CheckCircle2 className="mb-2 h-8 w-8" />
                  <p>Todos los servicios están facturados</p>
                </div>
              ) : (
                serviciosPendientesFacturar.map(servicio => (
                  <div 
                    key={servicio.id} 
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{servicio.codigo} - {servicio.titulo}</p>
                      <p className="text-sm text-slate-500">{servicio.clienteNombre}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                        <Calendar className="h-3 w-3" />
                        {servicio.fechaFin ? format(parseISO(toDateString(servicio.fechaFin)), 'dd/MM/yyyy') : '-'}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{servicio.precio?.toLocaleString('es-ES')}€</p>
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/facturacion`}>
                          Facturar
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Resumen de Flota */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Flota</CardTitle>
          <CardDescription>Estado actual de los vehículos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{vehiculos.filter(v => v.estado === 'operativo').length}</p>
                <p className="text-sm text-slate-500">Operativos</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <div className="rounded-full bg-amber-100 p-3">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{vehiculos.filter(v => v.estado === 'taller').length}</p>
                <p className="text-sm text-slate-500">En Taller</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <div className="rounded-full bg-blue-100 p-3">
                <Bus className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{vehiculos.filter(v => v.estado === 'reservado').length}</p>
                <p className="text-sm text-slate-500">Reservados</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <div className="rounded-full bg-red-100 p-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{vehiculos.filter(v => v.estado === 'baja').length}</p>
                <p className="text-sm text-slate-500">De Baja</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}