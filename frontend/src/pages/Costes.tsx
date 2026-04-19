// ============================================
// MILANO - Costes Page
// ============================================

import { useState } from 'react';
import { useServiciosStore, useVehiculosStore, useConductoresStore } from '../store';
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
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import {
 DollarSign,
 TrendingUp,
 TrendingDown,
 Fuel,
 Users,
 Bus,
 Receipt,
 FileDown,
 AlertTriangle,
 CheckCircle2,
 ArrowUpRight,
 ArrowDownRight,
} from 'lucide-react';
import type { Servicio } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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

const COLORS = ['#1e3a5f', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function Costes() {
 const { servicios } = useServiciosStore();
 const { vehiculos } = useVehiculosStore();
 const { conductores } = useConductoresStore();
 
 const [servicioSeleccionado, setServicioSeleccionado] = useState<any | null>(null);

 // Calcular costes para cada servicio completado
 const serviciosConCostes = servicios
 .filter(s => s.estado === 'completado' || s.estado === 'facturado')
 .map(servicio => {
 // Calcular costes reales
 const costeCombustible = (servicio.rutas || []).reduce((sum, ruta) => {
 const vehiculo = vehiculos.find(v => String(v.id) === String(ruta.vehiculoAsignadoId));
 if (vehiculo) {
 return sum + ((ruta.distanciaKm || 0) * (vehiculo.consumoMedio || 0) / 100 * 1.5); // 1.5€/L
 }
 return sum;
 }, 0);

 const costeConductor = (servicio.conductoresAsignados || []).reduce((sum, conductorId) => {
 const conductor = conductores.find(c => String(c.id) === String(conductorId));
 if (conductor) {
 // Estimar 8 horas por servicio
 return sum + (8 * (conductor.tarifaHora || 0));
 }
 return sum;
 }, 0);

 const costeVehiculo = (servicio.rutas || []).reduce((sum, ruta) => {
 // 0.5€/km amortización
 return sum + ((ruta.distanciaKm || 0) * 0.5);
 }, 0);

 const peajes = (servicio.rutas || []).reduce((sum, ruta) => sum + ((ruta.distanciaKm || 0) * 0.1), 0);

 const costeTotal = costeCombustible + costeConductor + costeVehiculo + peajes;
 const importe = servicio.precio || 0;
 const beneficio = importe - costeTotal;
 const margen = importe > 0 ? (beneficio / importe) * 100 : 0;

 return {
 ...servicio,
 costes: {
 combustible: costeCombustible,
 conductor: costeConductor,
 vehiculo: costeVehiculo,
 peajes,
 total: costeTotal,
 },
 beneficio,
 margen,
 };
 });

 // Estadísticas globales
 const totalIngresos = serviciosConCostes.reduce((sum, s) => sum + (s.precio || 0), 0);
 const totalCostes = serviciosConCostes.reduce((sum, s) => sum + (s.costes?.total || 0), 0);
 const beneficioTotal = totalIngresos - totalCostes;
 const margenMedio = totalIngresos > 0 ? (beneficioTotal / totalIngresos) * 100 : 0;

 // Desglose de costes
 const desgloseCostes = [
 { name: 'Combustible', value: serviciosConCostes.reduce((sum, s) => sum + (s.costes?.combustible || 0), 0) },
 { name: 'Conductores', value: serviciosConCostes.reduce((sum, s) => sum + (s.costes?.conductor || 0), 0) },
 { name: 'Vehículos', value: serviciosConCostes.reduce((sum, s) => sum + (s.costes?.vehiculo || 0), 0) },
 { name: 'Peajes', value: serviciosConCostes.reduce((sum, s) => sum + (s.costes?.peajes || 0), 0) },
 ];

 // Datos para gráfico de rentabilidad
 const datosRentabilidad = serviciosConCostes.slice(0, 10).map(s => ({
 nombre: s.codigo,
 ingresos: s.precio || 0,
 costes: s.costes?.total || 0,
 beneficio: s.beneficio || 0,
 }));

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Control de Costes</h1>
 <p className="text-slate-500 dark:text-slate-400">Análisis de rentabilidad por servicio</p>
 </div>
 <Button variant="outline">
 <FileDown className="mr-2 h-4 w-4" />
 Exportar Informe
 </Button>
 </div>

 {/* Stats Cards */}
 <div className="grid gap-4 md:grid-cols-4">
 <Card>
 <CardContent className="p-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-slate-500">Ingresos Totales</p>
 <p className="text-3xl font-bold">{totalIngresos.toLocaleString('es-ES')}€</p>
 </div>
 <div className="rounded-full bg-green-100 p-3">
 <TrendingUp className="h-6 w-6 text-green-600" />
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-slate-500">Costes Totales</p>
 <p className="text-3xl font-bold">{totalCostes.toLocaleString('es-ES')}€</p>
 </div>
 <div className="rounded-full bg-red-100 p-3">
 <TrendingDown className="h-6 w-6 text-red-600" />
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-slate-500">Beneficio</p>
 <p className={`text-3xl font-bold ${beneficioTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
 {beneficioTotal.toLocaleString('es-ES')}€
 </p>
 </div>
 <div className={`rounded-full p-3 ${beneficioTotal >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
 <DollarSign className={`h-6 w-6 ${beneficioTotal >= 0 ? 'text-green-600' : 'text-red-600'}`} />
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-slate-500">Margen Medio</p>
 <p className={`text-3xl font-bold ${margenMedio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
 {margenMedio.toFixed(1)}%
 </p>
 </div>
 <div className={`rounded-full p-3 ${margenMedio >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
 {margenMedio >= 0 ? (
 <ArrowUpRight className="h-6 w-6 text-green-600" />
 ) : (
 <ArrowDownRight className="h-6 w-6 text-red-600" />
 )}
 </div>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Charts */}
 <div className="grid gap-6 lg:grid-cols-2">
 {/* Desglose de Costes */}
 <Card>
 <CardHeader>
 <CardTitle>Desglose de Costes</CardTitle>
 <CardDescription>Distribución de costes por categoría</CardDescription>
 </CardHeader>
 <CardContent>
 <ResponsiveContainer width="100%" height={250}>
 <PieChart>
 <Pie
 data={desgloseCostes}
 cx="50%"
 cy="50%"
 innerRadius={60}
 outerRadius={80}
 paddingAngle={5}
 dataKey="value"
 >
 {desgloseCostes.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
 ))}
 </Pie>
 <Tooltip formatter={(value: number) => `${value.toLocaleString('es-ES')}€`} />
 </PieChart>
 </ResponsiveContainer>
 <div className="mt-4 grid grid-cols-2 gap-2">
 {desgloseCostes.map((item, index) => (
 <div key={item.name} className="flex items-center gap-2">
 <div 
 className="h-3 w-3 rounded-full" 
 style={{ backgroundColor: COLORS[index % COLORS.length] }}
 />
 <span className="text-sm text-slate-600">{item.name}: {item.value.toLocaleString('es-ES')}€</span>
 </div>
 ))}
 </div>
 </CardContent>
 </Card>

 {/* Rentabilidad por Servicio */}
 <Card>
 <CardHeader>
 <CardTitle>Rentabilidad por Servicio</CardTitle>
 <CardDescription>Comparativa de ingresos vs costes</CardDescription>
 </CardHeader>
 <CardContent>
 <ResponsiveContainer width="100%" height={250}>
 <BarChart data={datosRentabilidad}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="nombre" />
 <YAxis />
 <Tooltip formatter={(value: number) => `${value.toLocaleString('es-ES')}€`} />
 <Bar dataKey="ingresos" fill="#10b981" name="Ingresos" />
 <Bar dataKey="costes" fill="#ef4444" name="Costes" />
 </BarChart>
 </ResponsiveContainer>
 </CardContent>
 </Card>
 </div>

 {/* Services Table */}
 <Card>
 <CardHeader>
 <CardTitle>Análisis por Servicio</CardTitle>
 <CardDescription>Detalle de costes y rentabilidad de cada servicio</CardDescription>
 </CardHeader>
 <CardContent className="p-0">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>Servicio</TableHead>
 <TableHead>Cliente</TableHead>
 <TableHead>Ingresos</TableHead>
 <TableHead>Costes</TableHead>
 <TableHead>Beneficio</TableHead>
 <TableHead>Margen</TableHead>
 <TableHead>Estado</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {serviciosConCostes.length === 0 ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8 text-slate-500">
 No hay servicios completados para analizar
 </TableCell>
 </TableRow>
 ) : (
 serviciosConCostes.map((servicio) => (
 <TableRow 
 key={servicio.id}
 className="cursor-pointer hover:bg-slate-50"
 onClick={() => setServicioSeleccionado(servicio)}
 >
 <TableCell>
 <div>
 <p className="font-medium">{servicio.codigo}</p>
 <p className="text-sm text-slate-500">{servicio.descripcion || servicio.titulo}</p>
 </div>
 </TableCell>
 <TableCell>{servicio.clienteNombre}</TableCell>
 <TableCell className="font-medium text-green-600">
 {(servicio.precio || 0).toLocaleString('es-ES')}€
 </TableCell>
 <TableCell className="text-red-600">
 {(servicio.costes?.total || 0).toLocaleString('es-ES')}€
 </TableCell>
 <TableCell className={`font-bold ${(servicio.beneficio || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
 {(servicio.beneficio || 0).toLocaleString('es-ES')}€
 </TableCell>
 <TableCell>
 <div className="flex items-center gap-2">
 <Progress 
 value={Math.max(0, Math.min(100, (servicio.margen || 0) + 50))} 
 className="w-20 h-2"
 />
 <span className={`text-sm ${(servicio.margen || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
 {(servicio.margen || 0).toFixed(1)}%
 </span>
 </div>
 </TableCell>
 <TableCell>
 {(servicio.margen || 0) < 0 ? (
 <Badge variant="destructive" className="flex items-center gap-1">
 <AlertTriangle className="h-3 w-3" />
 Pérdida
 </Badge>
 ) : (servicio.margen || 0) < 15 ? (
 <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
 Bajo
 </Badge>
 ) : (
 <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
 <CheckCircle2 className="mr-1 h-3 w-3" />
 OK
 </Badge>
 )}
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
 <DialogContent className="max-w-2xl">
 {servicioSeleccionado && (
 <>
 <DialogHeader>
 <DialogTitle>Análisis de Costes - {servicioSeleccionado.codigo}</DialogTitle>
 <DialogDescription>
 {servicioSeleccionado.descripcion || servicioSeleccionado.titulo}
 </DialogDescription>
 </DialogHeader>
 
 <div className="space-y-6 py-4">
 {/* Resumen */}
 <div className="grid grid-cols-3 gap-4">
 <div className="rounded-lg bg-green-50 p-4 text-center">
 <p className="text-sm text-green-600">Ingresos</p>
 <p className="text-2xl font-bold text-green-700">
 {(servicioSeleccionado.precio || 0).toLocaleString('es-ES')}€
 </p>
 </div>
 <div className="rounded-lg bg-red-50 p-4 text-center">
 <p className="text-sm text-red-600">Costes</p>
 <p className="text-2xl font-bold text-red-700">
 {(servicioSeleccionado.costes?.total || 0).toLocaleString('es-ES')}€
 </p>
 </div>
 <div className={`rounded-lg p-4 text-center ${
 (servicioSeleccionado.beneficio || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'
 }`}>
 <p className={`text-sm ${(servicioSeleccionado.beneficio || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
 Beneficio
 </p>
 <p className={`text-2xl font-bold ${
 (servicioSeleccionado.beneficio || 0) >= 0 ? 'text-green-700' : 'text-red-700'
 }`}>
 {(servicioSeleccionado.beneficio || 0).toLocaleString('es-ES')}€
 </p>
 </div>
 </div>

 {/* Desglose */}
 <div>
 <Label className="text-slate-500 mb-2 block">Desglose de Costes</Label>
 <div className="space-y-2">
 <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
 <div className="flex items-center gap-2">
 <Fuel className="h-5 w-5 text-slate-400" />
 <span>Combustible</span>
 </div>
 <span className="font-medium">{(servicioSeleccionado.costes?.combustible || 0).toLocaleString('es-ES')}€</span>
 </div>
 <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
 <div className="flex items-center gap-2">
 <Users className="h-5 w-5 text-slate-400" />
 <span>Conductores</span>
 </div>
 <span className="font-medium">{(servicioSeleccionado.costes?.conductor || 0).toLocaleString('es-ES')}€</span>
 </div>
 <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
 <div className="flex items-center gap-2">
 <Bus className="h-5 w-5 text-slate-400" />
 <span>Vehículos (amortización)</span>
 </div>
 <span className="font-medium">{(servicioSeleccionado.costes?.vehiculo || 0).toLocaleString('es-ES')}€</span>
 </div>
 <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
 <div className="flex items-center gap-2">
 <Receipt className="h-5 w-5 text-slate-400" />
 <span>Peajes</span>
 </div>
 <span className="font-medium">{(servicioSeleccionado.costes?.peajes || 0).toLocaleString('es-ES')}€</span>
 </div>
 </div>
 </div>

 {/* Margen */}
 <div className="rounded-lg bg-slate-100 p-4">
 <div className="flex items-center justify-between">
 <span className="font-medium">Margen de Rentabilidad</span>
 <span className={`text-xl font-bold ${
 (servicioSeleccionado.margen || 0) >= 0 ? 'text-green-600' : 'text-red-600'
 }`}>
 {(servicioSeleccionado.margen || 0).toFixed(1)}%
 </span>
 </div>
 <Progress 
 value={Math.max(0, Math.min(100, (servicioSeleccionado.margen || 0) + 50))} 
 className="mt-2"
 />
 </div>
 </div>

 <Button className="w-full" variant="outline">
 <FileDown className="mr-2 h-4 w-4" />
 Descargar Informe PDF
 </Button>
 </>
 )}
 </DialogContent>
 </Dialog>
 </div>
 );
}