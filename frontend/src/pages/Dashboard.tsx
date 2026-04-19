// ============================================
// MILANO - Dashboard Page (Rediseñado)
// Moderno, con dark mode, animaciones y mejor UX
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
  Zap,
  FileWarning,
  ShieldAlert,
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
const COLORS_DARK = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa'];

// Custom tooltip para gráficos con dark mode
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 shadow-lg">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Servicios: <span className="font-semibold text-[#1e3a5f] dark:text-blue-400">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

// KPI Card component con animación
function KPICard({ title, value, subtitle, subtitleColor, icon: Icon, iconBg, href }: {
  title: string; value: string | number; subtitle: string; subtitleColor?: string;
  icon: any; iconBg: string; href?: string;
}) {
  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 dark:border-slate-700 dark:bg-slate-800">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
            <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
            <p className={`text-xs font-medium ${subtitleColor || 'text-slate-500 dark:text-slate-400'}`}>
              {subtitle}
            </p>
          </div>
          <div className={`rounded-xl p-3 ${iconBg} transition-transform duration-300 group-hover:scale-110`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        {href && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
            <Link to={href} className="inline-flex items-center gap-1 text-xs font-medium text-[#1e3a5f] dark:text-blue-400 hover:underline">
              Ver detalles <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Alert card para vencimientos
function AlertCard({ icon: Icon, title, count, color, href }: {
  icon: any; title: string; count: number; color: string; href: string;
}) {
  if (count === 0) return null;
  return (
    <Link to={href} className="block">
      <div className={`flex items-center gap-3 rounded-lg border p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 dark:border-slate-700 ${color}`}>
        <Icon className="h-5 w-5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
        </div>
        <Badge variant="secondary" className="flex-shrink-0">{count}</Badge>
      </div>
    </Link>
  );
}

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
    { name: 'Ruta Prog.', value: servicios.filter(s => s.tipo === 'ruta_programada').length },
  ].filter(s => s.value > 0);

  // Servicios próximos 7 días
  const hoy = new Date();
  const proximos7Dias = eachDayOfInterval({ start: hoy, end: addDays(hoy, 6) });

  const serviciosProximos = proximos7Dias.map(dia => ({
    fecha: format(dia, 'EEE', { locale: es }),
    servicios: servicios.filter(s => {
      const fechaInicio = s.fechaInicio ? parseISO(toDateString(s.fechaInicio)) : null;
      return fechaInicio && isSameDay(fechaInicio, dia);
    }).length,
  }));

  // KPIs
  const vehiculosOperativos = vehiculos.filter(v => v.estado === 'operativo').length;
  const conductoresActivos = conductores.filter(c => c.estado === 'activo' || c.estado === 'en_ruta').length;
  const totalPendiente = facturas.filter(f => f.estado === 'pendiente' || f.estado === 'enviada').reduce((sum, f) => sum + (f.total || 0), 0);
  const serviciosPendientesFacturar = servicios.filter(s => s.estado === 'completado' && !s.facturado);

  // Alertas
  const itvProxima = vehiculos.filter(v => {
    const dias = v.itv?.fechaProxima ? differenceInDays(parseISO(toDateString(v.itv.fechaProxima)), hoy) : 999;
    return dias <= 30 && dias >= 0;
  }).length;

  const seguroProximo = vehiculos.filter(v => {
    const dias = v.seguro?.fechaVencimiento ? differenceInDays(parseISO(toDateString(v.seguro.fechaVencimiento)), hoy) : 999;
    return dias <= 30 && dias >= 0;
  }).length;

  const licenciaProxima = conductores.filter(c => {
    const dias = c.licencia?.fechaCaducidad ? differenceInDays(parseISO(toDateString(c.licencia.fechaCaducidad)), hoy) : 999;
    return dias <= 30 && dias >= 0;
  }).length;

  if (isLoading && !kpi) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-[#1e3a5f] dark:text-blue-400" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {format(hoy, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            <Link to="/servicios/nuevo">
              <Briefcase className="mr-2 h-4 w-4" />
              Nuevo Servicio
            </Link>
          </Button>
          <Button size="sm" asChild className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600 dark:hover:bg-blue-700">
            <Link to="/clientes/nuevo">
              <Users className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Clientes Activos"
          value={clientes.filter(c => c.estado === 'activo').length}
          subtitle={`${clientes.length} total`}
          icon={Users}
          iconBg="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
          href="/clientes"
        />
        <KPICard
          title="Vehículos Operativos"
          value={vehiculosOperativos}
          subtitle={`${vehiculos.filter(v => v.estado === 'taller').length} en taller`}
          subtitleColor="text-amber-600 dark:text-amber-400"
          icon={Bus}
          iconBg="bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400"
          href="/flota"
        />
        <KPICard
          title="Conductores Activos"
          value={conductoresActivos}
          subtitle={`${conductores.filter(c => c.estado === 'vacaciones').length} de vacaciones`}
          icon={UserCircle}
          iconBg="bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400"
          href="/conductores"
        />
        <KPICard
          title="Facturación Pendiente"
          value={`${totalPendiente.toLocaleString('es-ES')} €`}
          subtitle={`${facturas.filter(f => f.estado === 'pendiente').length} facturas`}
          icon={Euro}
          iconBg="bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
          href="/facturacion"
        />
      </div>

      {/* Alertas de vencimientos */}
      {(itvProxima > 0 || seguroProximo > 0 || licenciaProxima > 0) && (
        <div className="grid gap-3 sm:grid-cols-3">
          <AlertCard
            icon={ShieldAlert}
            title="ITV próxima a vencer"
            count={itvProxima}
            color="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
            href="/flota"
          />
          <AlertCard
            icon={FileWarning}
            title="Seguros próximos a vencer"
            count={seguroProximo}
            color="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
            href="/flota"
          />
          <AlertCard
            icon={AlertTriangle}
            title="Licencias próximas a caducar"
            count={licenciaProxima}
            color="border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
            href="/conductores"
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="dark:border-slate-700 dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg dark:text-slate-100">Servicios Próximos 7 Días</CardTitle>
            <CardDescription className="dark:text-slate-400">Distribución de servicios para la próxima semana</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={serviciosProximos} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
                <XAxis dataKey="fecha" tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-500 dark:text-slate-400" />
                <YAxis tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-500 dark:text-slate-400" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="servicios" fill="#1e3a5f" radius={[6, 6, 0, 0]} className="dark:fill-blue-500" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="dark:border-slate-700 dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg dark:text-slate-100">Servicios por Tipo</CardTitle>
            <CardDescription className="dark:text-slate-400">Distribución según categoría</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={serviciosPorTipo}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {serviciosPorTipo.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {serviciosPorTipo.map((item, index) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-xs text-slate-600 dark:text-slate-400">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Pendientes facturar + Resumen flota */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Servicios Pendientes de Facturar */}
        <Card className="dark:border-slate-700 dark:bg-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg dark:text-slate-100">Pendientes de Facturar</CardTitle>
              <CardDescription className="dark:text-slate-400">Servicios completados sin factura</CardDescription>
            </div>
            <Badge variant="secondary" className="dark:bg-slate-700 dark:text-slate-300">{serviciosPendientesFacturar.length}</Badge>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-60">
              {serviciosPendientesFacturar.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500">
                  <CheckCircle2 className="mb-3 h-10 w-10" />
                  <p className="text-sm">Todos los servicios están facturados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {serviciosPendientesFacturar.map(servicio => (
                    <div
                      key={servicio.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-[#1e3a5f] dark:text-blue-400">{servicio.codigo}</span>
                          <span className="font-medium text-sm truncate dark:text-slate-200">{servicio.titulo}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{servicio.clienteNombre}</p>
                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                          <Calendar className="h-3 w-3" />
                          {servicio.fechaFin ? format(parseISO(toDateString(servicio.fechaFin)), 'dd/MM/yyyy') : '-'}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="font-bold text-sm dark:text-slate-200">{servicio.precio?.toLocaleString('es-ES')} €</p>
                        <Button size="sm" variant="outline" className="mt-1 h-7 text-xs dark:border-slate-600 dark:text-slate-300" asChild>
                          <Link to="/facturacion">Facturar</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Resumen de Flota */}
        <Card className="dark:border-slate-700 dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg dark:text-slate-100">Resumen de Flota</CardTitle>
            <CardDescription className="dark:text-slate-400">Estado actual de los vehículos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Operativos', value: vehiculos.filter(v => v.estado === 'operativo').length, icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-500/20' },
                { label: 'En Taller', value: vehiculos.filter(v => v.estado === 'taller').length, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-500/20' },
                { label: 'Reservados', value: vehiculos.filter(v => v.estado === 'reservado').length, icon: Bus, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/20' },
                { label: 'De Baja', value: vehiculos.filter(v => v.estado === 'baja').length, icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-500/20' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                  <div className={`rounded-lg p-2 ${item.bg}`}>
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold dark:text-slate-100">{item.value}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
