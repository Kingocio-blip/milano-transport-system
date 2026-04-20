// ============================================
// MILANO - Dashboard (Optimizado)
// KPIs, alertas, graficos, dark mode
// ============================================

import { useEffect, useMemo } from 'react';
import {
  useServiciosStore, useVehiculosStore, useConductoresStore,
  useFacturasStore, useClientesStore,
} from '../store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Briefcase, Bus, UserCircle, Euro, AlertTriangle, CheckCircle2,
  Clock, Calendar, ArrowRight, Users, FileWarning,
  ShieldAlert, TrendingUp, Award, FileText, Fuel, Wrench,
} from 'lucide-react';
import { SkeletonDashboard } from '../components/LoadingScreen';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  format, addDays, eachDayOfInterval, isSameDay, parseISO, differenceInDays, isAfter,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { toDateString } from '../lib/utils';

const COLORS = ['#1e3a5f', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const parseDateSafe = (d: string | Date | undefined): Date | null => {
  if (!d) return null;
  try {
    const p = typeof d === 'string' ? parseISO(d) : d;
    return isNaN(p.getTime()) ? null : p;
  } catch { return null; }
};

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

// Stat card estandar
function StatCard({ label, value, icon: Icon, color, href }: {
  label: string; value: string | number; icon: any; color: string; href: string;
}) {
  return (
    <Link to={href} className="block">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center gap-3 hover:shadow-md transition-all hover:-translate-y-0.5">
        <div className={`rounded-lg p-2.5 ${color}`}><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
        </div>
      </div>
    </Link>
  );
}

// Alerta card
function AlertaCard({ icon: Icon, title, count, colorClass, href }: {
  icon: any; title: string; count: number; colorClass: string; href: string;
}) {
  if (count === 0) return null;
  return (
    <Link to={href} className="block">
      <div className={`flex items-center gap-3 rounded-xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5 dark:border-slate-700 ${colorClass}`}>
        <Icon className="h-5 w-5 flex-shrink-0" />
        <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{title}</p></div>
        <Badge variant="secondary" className="flex-shrink-0 dark:bg-slate-700 dark:text-slate-300">{count}</Badge>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { clientes, isLoading: lc } = useClientesStore();
  const { vehiculos, isLoading: lv } = useVehiculosStore();
  const { conductores, isLoading: lcond } = useConductoresStore();
  const { servicios, isLoading: ls, fetchServicios } = useServiciosStore();
  const { facturas, isLoading: lf, fetchFacturas } = useFacturasStore();

  useEffect(() => { fetchServicios(); fetchFacturas(); }, [fetchServicios, fetchFacturas]);

  const isLoading = lc || lv || lcond || ls || lf;
  const hoy = new Date();

  // ===== STATS =====
  const stats = useMemo(() => ({
    clientes: clientes.filter(c => c.estado === 'activo').length,
    vehiculosOp: vehiculos.filter(v => v.estado === 'operativo').length,
    conductoresActivos: conductores.filter(c => c.estado === 'activo' || c.estado === 'en_ruta').length,
    factPendiente: facturas.filter(f => f.estado === 'pendiente' || f.estado === 'enviada').reduce((s, f) => s + (f.total || 0), 0),
    serviciosHoy: servicios.filter(s => {
      const f = parseDateSafe(s.fechaInicio); return f && isSameDay(f, hoy);
    }).length,
    serviciosMes: servicios.filter(s => {
      const f = parseDateSafe(s.fechaInicio); return f && f.getMonth() === hoy.getMonth();
    }).length,
  }), [clientes, vehiculos, conductores, facturas, servicios, hoy]);

  // ===== ALERTAS =====
  const alertas = useMemo(() => ({
    itv: vehiculos.filter(v => {
      const d = differenceInDays(parseDateSafe(v.itv?.fechaProxima) || new Date(2099, 0, 1), hoy);
      return d <= 30 && d >= 0;
    }).length,
    seguro: vehiculos.filter(v => {
      const d = differenceInDays(parseDateSafe(v.seguro?.fechaVencimiento) || new Date(2099, 0, 1), hoy);
      return d <= 30 && d >= 0;
    }).length,
    licencia: conductores.filter(c => {
      const d = differenceInDays(parseDateSafe(c.licencia?.fechaCaducidad) || new Date(2099, 0, 1), hoy);
      return d <= 30 && d >= 0;
    }).length,
    cap: conductores.filter(c => {
      const d = differenceInDays(parseDateSafe(c.licencia?.cap?.fechaVencimiento) || new Date(2099, 0, 1), hoy);
      return d <= 30 && d >= 0;
    }).length,
    facturasVencidas: facturas.filter(f => {
      if (f.estado === 'pagada') return false;
      const venc = parseDateSafe(f.fechaVencimiento); return venc ? isAfter(hoy, venc) : false;
    }).length,
  }), [vehiculos, conductores, facturas, hoy]);

  const totalAlertas = alertas.itv + alertas.seguro + alertas.licencia + alertas.cap + alertas.facturasVencidas;

  // ===== GRAFICOS =====
  const serviciosPorTipo = useMemo(() => [
    { name: 'Lanzadera', value: servicios.filter(s => s.tipo === 'lanzadera').length },
    { name: 'Discrecional', value: servicios.filter(s => s.tipo === 'discrecional').length },
    { name: 'Staff', value: servicios.filter(s => s.tipo === 'staff').length },
    { name: 'Ruta Prog.', value: servicios.filter(s => s.tipo === 'ruta_programada').length },
  ].filter(s => s.value > 0), [servicios]);

  const proximos7 = useMemo(() => {
    const dias = eachDayOfInterval({ start: hoy, end: addDays(hoy, 6) });
    return dias.map(dia => ({
      fecha: format(dia, 'EEE', { locale: es }),
      servicios: servicios.filter(s => {
        const f = parseDateSafe(s.fechaInicio); return f && isSameDay(f, dia);
      }).length,
    }));
  }, [servicios, hoy]);

  const pendientesFacturar = useMemo(() =>
    servicios.filter(s => s.estado === 'completado' && !s.facturado).slice(0, 5),
    [servicios]);

  if (isLoading) {
    return <SkeletonDashboard />;
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {format(hoy, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild className="dark:border-slate-600 dark:text-slate-300">
            <Link to="/servicios"><Briefcase className="mr-2 h-4 w-4" />Servicios</Link>
          </Button>
          <Button size="sm" asChild className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600">
            <Link to="/clientes"><Users className="mr-2 h-4 w-4" />Clientes</Link>
          </Button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Clientes Activos" value={stats.clientes} icon={Users}
          color="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400" href="/clientes" />
        <StatCard label="Vehiculos Operativos" value={stats.vehiculosOp} icon={Bus}
          color="bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400" href="/flota" />
        <StatCard label="Conductores Activos" value={stats.conductoresActivos} icon={UserCircle}
          color="bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400" href="/conductores" />
        <StatCard label="Facturacion Pendiente" value={`${stats.factPendiente.toLocaleString('es-ES')} EUR`} icon={Euro}
          color="bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400" href="/facturacion" />
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-center">
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{stats.serviciosHoy}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Servicios Hoy</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-center">
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{stats.serviciosMes}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Este Mes</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-center">
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{pendientesFacturar.length}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Pend. Facturar</p>
        </div>
      </div>

      {/* ALERTAS */}
      {totalAlertas > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Alertas ({totalAlertas})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AlertaCard icon={ShieldAlert} title="ITV proxima a vencer" count={alertas.itv}
              colorClass="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300" href="/flota" />
            <AlertaCard icon={FileWarning} title="Seguros proximos a vencer" count={alertas.seguro}
              colorClass="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300" href="/flota" />
            <AlertaCard icon={AlertTriangle} title="Licencias proximas a caducar" count={alertas.licencia}
              colorClass="border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300" href="/conductores" />
            <AlertaCard icon={Award} title="CAP proximo a vencer" count={alertas.cap}
              colorClass="border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300" href="/conductores" />
            <AlertaCard icon={FileText} title="Facturas vencidas" count={alertas.facturasVencidas}
              colorClass="border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300" href="/facturacion" />
          </div>
        </div>
      )}

      {/* GRAFICOS */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar chart */}
        <Card className="dark:border-slate-700 dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg dark:text-slate-100">Servicios Proximos 7 Dias</CardTitle>
            <CardDescription className="dark:text-slate-400">Distribucion de servicios para la proxima semana</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={proximos7} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
                <XAxis dataKey="fecha" tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-500 dark:text-slate-400" />
                <YAxis tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-500 dark:text-slate-400" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="servicios" fill="#1e3a5f" radius={[6, 6, 0, 0]} className="dark:fill-blue-500" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card className="dark:border-slate-700 dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg dark:text-slate-100">Servicios por Tipo</CardTitle>
            <CardDescription className="dark:text-slate-400">Distribucion segun categoria</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={serviciosPorTipo} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={4} dataKey="value" stroke="none">
                  {serviciosPorTipo.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {serviciosPorTipo.map((item, i) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-slate-600 dark:text-slate-400">{`${item.name}: ${item.value}`}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BOTTOM ROW */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pendientes de Facturar */}
        <Card className="dark:border-slate-700 dark:bg-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg dark:text-slate-100">Pendientes de Facturar</CardTitle>
              <CardDescription className="dark:text-slate-400">Servicios completados sin factura</CardDescription>
            </div>
            <Badge variant="secondary" className="dark:bg-slate-700 dark:text-slate-300">{pendientesFacturar.length}</Badge>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-52">
              {pendientesFacturar.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500">
                  <CheckCircle2 className="mb-3 h-10 w-10" />
                  <p className="text-sm">Todos los servicios estan facturados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendientesFacturar.map(s => (
                    <div key={s.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-[#1e3a5f] dark:text-blue-400">{s.codigo}</span>
                          <span className="font-medium text-sm truncate dark:text-slate-200">{s.titulo}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.clienteNombre}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="font-bold text-sm dark:text-slate-200">{`${(s.precio || 0).toLocaleString('es-ES')} EUR`}</p>
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

        {/* Resumen Flota */}
        <Card className="dark:border-slate-700 dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg dark:text-slate-100">Resumen de Flota</CardTitle>
            <CardDescription className="dark:text-slate-400">Estado actual de los vehiculos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Operativos', value: vehiculos.filter(v => v.estado === 'operativo').length, icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-500/20' },
                { label: 'En Taller', value: vehiculos.filter(v => v.estado === 'taller').length, icon: Wrench, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-500/20' },
                { label: 'Reservados', value: vehiculos.filter(v => v.estado === 'reservado').length, icon: Bus, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/20' },
                { label: 'De Baja', value: vehiculos.filter(v => v.estado === 'baja').length, icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-500/20' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                  <div className={`rounded-lg p-2 ${item.bg}`}><item.icon className={`h-4 w-4 ${item.color}`} /></div>
                  <div>
                    <p className="text-lg font-bold dark:text-slate-100">{item.value}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">{item.label}</p>
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
