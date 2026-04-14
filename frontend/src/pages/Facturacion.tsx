// ============================================
// MILANO - Facturación Page
// ============================================

import { useState } from 'react';
import { useFacturasStore, useServiciosStore, useClientesStore, useUIStore } from '../store';
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
import { ScrollArea } from '../components/ui/scroll-area';
import {
  FileText,
  Search,
  Plus,
  MoreVertical,
  Eye,
  Download,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Euro,
  TrendingUp,
  TrendingDown,
  X,
  Printer,
} from 'lucide-react';
import type { Factura, EstadoFactura, ConceptoFactura } from '../types';
import { format, differenceInDays, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';

const estadoFacturaColors: Record<EstadoFactura, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  enviada: 'bg-blue-100 text-blue-700',
  pagada: 'bg-green-100 text-green-700',
  vencida: 'bg-red-100 text-red-700',
  anulada: 'bg-slate-100 text-slate-700',
};

export default function Facturacion() {
  const { facturas, addFactura, updateFactura, getFacturasVencidas, getTotalPendiente, getTotalFacturadoMes } = useFacturasStore();
  const { servicios, updateServicio } = useServiciosStore();
  const { clientes } = useClientesStore();
  const { showToast } = useUIStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFactura | 'todos'>('todos');
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<Factura | null>(null);
  const [isNuevaFacturaOpen, setIsNuevaFacturaOpen] = useState(false);
  const [nuevaFactura, setNuevaFactura] = useState<Partial<Factura>>({
    estado: 'pendiente',
    conceptos: [],
    impuestos: 21,
  });

  // Filtrar facturas
  const facturasFiltradas = facturas.filter(factura => {
    const matchesSearch = 
      factura.numero.toLowerCase().includes(searchQuery.toLowerCase()) ||
      factura.clienteNombre?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEstado = estadoFiltro === 'todos' || factura.estado === estadoFiltro;
    return matchesSearch && matchesEstado;
  });

  // Estadísticas
  const facturasPendientes = facturas.filter(f => f.estado === 'pendiente').length;
  const facturasEnviadas = facturas.filter(f => f.estado === 'enviada').length;
  const facturasPagadas = facturas.filter(f => f.estado === 'pagada').length;
  const facturasVencidas = getFacturasVencidas();
  const totalPendiente = getTotalPendiente();
  const totalFacturadoMes = getTotalFacturadoMes();

    const handleNuevaFactura = () => {
    if (!nuevaFactura.clienteId || nuevaFactura.conceptos?.length === 0) {
      showToast('Por favor complete los campos obligatorios', 'error');
      return;
    }

    // Buscar el cliente para obtener el nombre
    const cliente = clientes.find(c => String(c.id) === String(nuevaFactura.clienteId));
    
    // Calcular totales
    const subtotal = nuevaFactura.conceptos?.reduce((sum, c) => sum + (c.total || 0), 0) || 0;
    const impuestos = subtotal * 0.21;
    const total = subtotal + impuestos;

    const factura: Factura = {
       id: `f${Date.now()}`,
       numero: `F${new Date().getFullYear()}-${String(facturas.length + 1).padStart(3, '0')}`,
       serie: String(new Date().getFullYear()),
       clienteId: nuevaFactura.clienteId || '',
       clienteNombre: cliente?.nombre || '',
       fecha: new Date().toISOString(),
       fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
       conceptos: nuevaFactura.conceptos || [],
       subtotal,
       baseImponible: subtotal,
       impuestos,
       iva: impuestos,
       concepto: 'Factura de servicios',
       total,
       estado: 'pendiente',
    };

    addFactura(factura);
    
    // Si está asociada a un servicio, marcarlo como facturado
    if (nuevaFactura.servicioId) {
      updateServicio(String(nuevaFactura.servicioId), { facturado: true, facturaId: factura.id });
    }

    setIsNuevaFacturaOpen(false);
    setNuevaFactura({ estado: 'pendiente', conceptos: [], impuestos: 21 });
    showToast('Factura creada correctamente', 'success');
  };

  const handleMarcarPagada = (factura: Factura) => {
    updateFactura(String(factura.id), { 
      estado: 'pagada', 
      fechaPago: new Date().toISOString() 
    });
    showToast('Factura marcada como pagada', 'success');
  };

  const handleEnviarFactura = (factura: Factura) => {
    updateFactura(String(factura.id), { estado: 'enviada' });
    showToast('Factura enviada al cliente', 'success');
  };

  const agregarConcepto = () => {
    const concepto: ConceptoFactura = {
      id: `cf${Date.now()}`,
      concepto: '',
      cantidad: 1,
      precioUnitario: 0,
      impuesto: 21,
      total: 0,
    };
    setNuevaFactura({
      ...nuevaFactura,
      conceptos: [...(nuevaFactura.conceptos || []), concepto],
    });
  };

  const actualizarConcepto = (index: number, campo: keyof ConceptoFactura, valor: any) => {
    const conceptos = [...(nuevaFactura.conceptos || [])];
    conceptos[index] = { ...conceptos[index], [campo]: valor };
    
    if (campo === 'cantidad' || campo === 'precioUnitario') {
      conceptos[index].total = conceptos[index].cantidad * conceptos[index].precioUnitario;
    }
    
    setNuevaFactura({ ...nuevaFactura, conceptos });
  };

  const eliminarConcepto = (index: number) => {
    const conceptos = [...(nuevaFactura.conceptos || [])];
    conceptos.splice(index, 1);
    setNuevaFactura({ ...nuevaFactura, conceptos });
  };

    const calcularTotal = () => {
    const subtotal = nuevaFactura.conceptos?.reduce((sum, c) => sum + (c.total || 0), 0) || 0;
    const impuestos = subtotal * 0.21;
    return { subtotal, impuestos, total: subtotal + impuestos };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Facturación</h1>
          <p className="text-slate-500">Gestión de facturas y pagos</p>
        </div>
        <Dialog open={isNuevaFacturaOpen} onOpenChange={setIsNuevaFacturaOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Factura
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Nueva Factura</DialogTitle>
              <DialogDescription>
                Complete la información de la nueva factura
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cliente">Cliente *</Label>
                  <Select 
                    value={String(nuevaFactura.clienteId || '')} 
                    onValueChange={(v) => setNuevaFactura({...nuevaFactura, clienteId: v})}
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
                <div className="space-y-2">
                  <Label htmlFor="servicio">Servicio (opcional)</Label>
                  <Select 
                    value={String(nuevaFactura.servicioId || '')} 
                    onValueChange={(v) => {
                      const servicio = servicios.find(s => String(s.id) === v);
                      if (servicio) {
                        setNuevaFactura({
                          ...nuevaFactura,
                          servicioId: v,
                          clienteId: servicio.clienteId,
                          conceptos: [{
                            id: `cf${Date.now()}`,
                            concepto: servicio.titulo,
                            cantidad: 1,
                            precioUnitario: servicio.precio || 0,
                            impuesto: 21,
                            total: servicio.precio || 0,
                          }],
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar servicio" />
                    </SelectTrigger>
                    <SelectContent>
                      {servicios.filter(s => s.estado === 'completado' && !s.facturado).map(servicio => (
                        <SelectItem key={servicio.id} value={String(servicio.id)}>
                          {servicio.codigo} - {servicio.titulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Conceptos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Conceptos</Label>
                  <Button type="button" variant="outline" size="sm" onClick={agregarConcepto}>
                    <Plus className="mr-1 h-4 w-4" />
                    Añadir
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {nuevaFactura.conceptos?.map((concepto, index) => (
                    <div key={concepto.id} className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-5">
                        <Input
                          placeholder="Concepto"
                          value={concepto.concepto}
                          onChange={(e) => actualizarConcepto(index, 'concepto', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Cant."
                          value={concepto.cantidad}
                          onChange={(e) => actualizarConcepto(index, 'cantidad', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Precio"
                          value={concepto.precioUnitario}
                          onChange={(e) => actualizarConcepto(index, 'precioUnitario', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={concepto.total}
                          disabled
                          className="bg-slate-50"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => eliminarConcepto(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totales */}
              <div className="rounded-lg bg-slate-50 p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal:</span>
                  <span>{calcularTotal().subtotal.toLocaleString('es-ES')}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">IVA (21%):</span>
                  <span>{calcularTotal().impuestos.toLocaleString('es-ES')}€</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{calcularTotal().total.toLocaleString('es-ES')}€</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNuevaFacturaOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleNuevaFactura}>
                Crear Factura
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
                <p className="text-sm font-medium text-slate-500">Pendientes</p>
                <p className="text-3xl font-bold">{facturasPendientes}</p>
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
                <p className="text-sm font-medium text-slate-500">Enviadas</p>
                <p className="text-3xl font-bold">{facturasEnviadas}</p>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <Send className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Pagadas (Mes)</p>
                <p className="text-3xl font-bold">{facturasPagadas}</p>
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
                <p className="text-sm font-medium text-slate-500">Total Pendiente</p>
                <p className="text-3xl font-bold">{totalPendiente.toLocaleString('es-ES')}€</p>
              </div>
              <div className="rounded-full bg-red-100 p-3">
                <Euro className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="facturas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="facturas">Facturas</TabsTrigger>
          <TabsTrigger value="vencidas">Vencidas ({facturasVencidas.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="facturas" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar facturas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={estadoFiltro} onValueChange={(v) => setEstadoFiltro(v as EstadoFactura | 'todos')}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="enviada">Enviada</SelectItem>
                <SelectItem value="pagada">Pagada</SelectItem>
                <SelectItem value="vencida">Vencida</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Invoices Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facturasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No se encontraron facturas
                      </TableCell>
                    </TableRow>
                  ) : (
                    facturasFiltradas.map((factura) => (
                      <TableRow key={factura.id}>
                        <TableCell className="font-medium">{factura.numero}</TableCell>
                        <TableCell>{factura.clienteNombre}</TableCell>
                        <TableCell>
                          {format(new Date(factura.fechaEmision), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{format(new Date(factura.fechaVencimiento), 'dd/MM/yyyy')}</span>
                            {factura.estado !== 'pagada' && isAfter(new Date(), new Date(factura.fechaVencimiento)) && (
                              <span className="text-xs text-red-600">
                                Vencida hace {Math.abs(differenceInDays(new Date(), new Date(factura.fechaVencimiento)))} días
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{factura.total.toLocaleString('es-ES')}€</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={estadoFacturaColors[factura.estado]}>
                            {factura.estado}
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
                              <DropdownMenuItem onClick={() => setFacturaSeleccionada(factura)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Printer className="mr-2 h-4 w-4" />
                                Imprimir
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                Descargar PDF
                              </DropdownMenuItem>
                              {factura.estado === 'pendiente' && (
                                <DropdownMenuItem onClick={() => handleEnviarFactura(factura)}>
                                  <Send className="mr-2 h-4 w-4" />
                                  Enviar
                                </DropdownMenuItem>
                              )}
                              {(factura.estado === 'pendiente' || factura.estado === 'enviada') && (
                                <DropdownMenuItem onClick={() => handleMarcarPagada(factura)}>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Marcar pagada
                                </DropdownMenuItem>
                              )}
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

        <TabsContent value="vencidas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Facturas Vencidas
              </CardTitle>
              <CardDescription>
                Facturas pendientes de pago que han superado la fecha de vencimiento
              </CardDescription>
            </CardHeader>
            <CardContent>
              {facturasVencidas.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-500" />
                  <p>No hay facturas vencidas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {facturasVencidas.map(factura => (
                    <div key={factura.id} className="flex items-center justify-between p-4 rounded-lg bg-red-50 border border-red-200">
                      <div>
                        <p className="font-medium">{factura.numero}</p>
                        <p className="text-sm text-slate-600">{factura.clienteNombre}</p>
                        <p className="text-xs text-red-600">
                          Vencida hace {Math.abs(differenceInDays(new Date(), new Date(factura.fechaVencimiento)))} días
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-700">
                          {factura.total.toLocaleString('es-ES')}€
                        </p>
                        <Button size="sm" variant="outline" onClick={() => handleMarcarPagada(factura)}>
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Marcar pagada
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!facturaSeleccionada} onOpenChange={() => setFacturaSeleccionada(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          {facturaSeleccionada && (
            <>
              <DialogHeader>
                <DialogTitle>Factura {facturaSeleccionada.numero}</DialogTitle>
                <DialogDescription>
                  {facturaSeleccionada.clienteNombre}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Info General */}
                <div className="grid grid-cols-3 gap-4 rounded-lg bg-slate-50 p-4">
                  <div>
                    <Label className="text-slate-500">Fecha Emisión</Label>
                    <p>{format(new Date(facturaSeleccionada.fechaEmision), 'dd/MM/yyyy')}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Fecha Vencimiento</Label>
                    <p>{format(new Date(facturaSeleccionada.fechaVencimiento), 'dd/MM/yyyy')}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Estado</Label>
                    <div>
                      <Badge className={estadoFacturaColors[facturaSeleccionada.estado]}>
                        {facturaSeleccionada.estado}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Conceptos */}
                <div>
                  <Label className="text-slate-500 mb-2 block">Conceptos</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Concepto</TableHead>
                        <TableHead className="text-right">Cant.</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {facturaSeleccionada.conceptos.map((concepto) => (
                        <TableRow key={concepto.id}>
                          <TableCell>{concepto.concepto}</TableCell>
                          <TableCell className="text-right">{concepto.cantidad}</TableCell>
                          <TableCell className="text-right">{concepto.precioUnitario.toLocaleString('es-ES')}€</TableCell>
                          <TableCell className="text-right">{concepto.total.toLocaleString('es-ES')}€</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totales */}
                <div className="rounded-lg bg-slate-50 p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal:</span>
                    <span>{facturaSeleccionada.subtotal.toLocaleString('es-ES')}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">IVA (21%):</span>
                    <span>{facturaSeleccionada.impuestos.toLocaleString('es-ES')}€</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>{facturaSeleccionada.total.toLocaleString('es-ES')}€</span>
                  </div>
                </div>

                {facturaSeleccionada.fechaPago && (
                  <div className="rounded-lg bg-green-50 p-4">
                    <Label className="text-green-700">Pagada el</Label>
                    <p className="text-green-700 font-medium">
                      {format(new Date(facturaSeleccionada.fechaPago), 'dd/MM/yyyy')}
                    </p>
                    {facturaSeleccionada.referenciaPago && (
                      <p className="text-sm text-green-600">
                        Ref: {facturaSeleccionada.referenciaPago}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline">
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </Button>
                {facturaSeleccionada.estado !== 'pagada' && (
                  <Button onClick={() => handleMarcarPagada(facturaSeleccionada)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Marcar como Pagada
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