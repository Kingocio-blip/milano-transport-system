// ============================================
// MILANO - Facturacion (Rediseñado)
// Cards/List toggle, Stats, Dark mode, Alertas vencidas
// ============================================

import { useState, useMemo } from 'react';
import { useFacturasStore, useServiciosStore, useClientesStore, useUIStore } from '../store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  FileText, Search, Plus, Eye, Download, Send, CheckCircle2,
  AlertTriangle, Clock, Euro, TrendingUp, X, Printer,
  LayoutGrid, List, CreditCard, CalendarDays, ArrowUpRight,
} from 'lucide-react';
import type { Factura, EstadoFactura, ConceptoFactura } from '../types';
import { format, differenceInDays, isAfter, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const estadoColors: Record<EstadoFactura, string> = {
  pendiente: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  enviada: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  pagada: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  vencida: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  anulada: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

const estadoLabels: Record<string, string> = {
  pendiente: 'Pendiente', enviada: 'Enviada', pagada: 'Pagada',
  vencida: 'Vencida', anulada: 'Anulada', todos: 'Todos',
};

const parseDateSafe = (d: string | Date | undefined): Date | null => {
  if (!d) return null;
  try { const p = typeof d === 'string' ? parseISO(d) : d; return isNaN(p.getTime()) ? null : p; } catch { return null; }
};
const fmtDate = (d: string | Date | undefined): string => {
  const p = parseDateSafe(d);
  return p ? format(p, 'dd/MM/yyyy') : '-';
};
const fmtCurrency = (n: number): string => `${n.toLocaleString('es-ES', { minimumFractionDigits: 2 })} EUR`;

export default function Facturacion() {
  const { facturas, addFactura, updateFactura, getFacturasVencidas, getTotalPendiente, getTotalFacturadoMes } = useFacturasStore();
  const { servicios, updateServicio } = useServiciosStore();
  const { clientes } = useClientesStore();
  const { showToast } = useUIStore();

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFactura | 'todos'>('todos');
  const [vistaMode, setVistaMode] = useState<'cards' | 'lista'>('lista');

  // Dialogs
  const [facturaSel, setFacturaSel] = useState<Factura | null>(null);
  const [isNuevaOpen, setIsNuevaOpen] = useState(false);
  const [nuevaFactura, setNuevaFactura] = useState<Partial<Factura>>({
    estado: 'pendiente', conceptos: [], iva: 10,
  });

  // Stats
  const stats = useMemo(() => ({
    pendientes: facturas.filter(f => f.estado === 'pendiente').length,
    enviadas: facturas.filter(f => f.estado === 'enviada').length,
    pagadas: facturas.filter(f => f.estado === 'pagada').length,
    totalPendiente: getTotalPendiente(),
    totalMes: getTotalFacturadoMes(),
    vencidas: getFacturasVencidas().length,
  }), [facturas, getTotalPendiente, getTotalFacturadoMes, getFacturasVencidas]);

  const vencidas = useMemo(() => getFacturasVencidas(), [getFacturasVencidas]);

  // Filtradas
  const filtradas = useMemo(() => {
    const sq = searchQuery.toLowerCase().trim();
    return facturas.filter(f => {
      const ms = !sq ||
        f.numero?.toLowerCase().includes(sq) ||
        f.clienteNombre?.toLowerCase().includes(sq) ||
        f.serie?.toLowerCase().includes(sq);
      return ms && (estadoFiltro === 'todos' || f.estado === estadoFiltro);
    });
  }, [facturas, searchQuery, estadoFiltro]);

  // Actions
  const handleMarcarPagada = (f: Factura) => {
    updateFactura(String(f.id), { estado: 'pagada', fechaPago: new Date().toISOString() });
    showToast('Factura marcada como pagada', 'success');
    if (facturaSel && String(facturaSel.id) === String(f.id)) {
      setFacturaSel({ ...facturaSel, estado: 'pagada', fechaPago: new Date().toISOString() });
    }
  };

  const handleEnviar = (f: Factura) => {
    updateFactura(String(f.id), { estado: 'enviada' });
    showToast('Factura enviada al cliente', 'success');
  };

  const handleNueva = () => {
    if (!nuevaFactura.clienteId || nuevaFactura.conceptos?.length === 0) {
      showToast('Cliente y al menos un concepto son obligatorios', 'error'); return;
    }
    const cliente = clientes.find(c => String(c.id) === String(nuevaFactura.clienteId));
    const subtotal = nuevaFactura.conceptos?.reduce((s, c) => s + (c.total || 0), 0) || 0;
    const ivaPct = nuevaFactura.iva || 10;
    const impuestos = subtotal * (ivaPct / 100);
    const factura: Factura = {
      id: `f${Date.now()}`,
      numero: `F${new Date().getFullYear()}-${String(facturas.length + 1).padStart(3, '0')}`,
      serie: String(new Date().getFullYear()),
      clienteId: nuevaFactura.clienteId || '',
      clienteNombre: cliente?.nombre || '',
      fechaEmision: new Date().toISOString(),
      fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      conceptos: nuevaFactura.conceptos || [],
      subtotal, baseImponible: subtotal, impuestos, iva: ivaPct, total: subtotal + impuestos,
      estado: 'pendiente',
    };
    addFactura(factura);
    if (nuevaFactura.servicioId) {
      updateServicio(String(nuevaFactura.servicioId), { facturado: true, facturaId: factura.id });
    }
    setIsNuevaOpen(false);
    setNuevaFactura({ estado: 'pendiente', conceptos: [], iva: 10 });
    showToast('Factura creada correctamente', 'success');
  };

  // Conceptos helpers
  const addConcepto = () => {
    const c: ConceptoFactura = {
      id: `cf${Date.now()}`, concepto: '', cantidad: 1, precioUnitario: 0, impuesto: nuevaFactura.iva || 10, total: 0,
    };
    setNuevaFactura(p => ({ ...p, conceptos: [...(p.conceptos || []), c] }));
  };

  const updateConcepto = (idx: number, campo: keyof ConceptoFactura, valor: any) => {
    const cs = [...(nuevaFactura.conceptos || [])];
    cs[idx] = { ...cs[idx], [campo]: valor };
    if (campo === 'cantidad' || campo === 'precioUnitario') {
      cs[idx].total = cs[idx].cantidad * cs[idx].precioUnitario;
    }
    setNuevaFactura(p => ({ ...p, conceptos: cs }));
  };

  const removeConcepto = (idx: number) => {
    const cs = [...(nuevaFactura.conceptos || [])];
    cs.splice(idx, 1);
    setNuevaFactura(p => ({ ...p, conceptos: cs }));
  };

  const calcTotales = () => {
    const sub = nuevaFactura.conceptos?.reduce((s, c) => s + (c.total || 0), 0) || 0;
    const ivaPct = nuevaFactura.iva || 10;
    const imp = sub * (ivaPct / 100);
    return { subtotal: sub, impuestos: imp, total: sub + imp, iva: ivaPct };
  };

  // Dia vencimiento helper
  const diasVencida = (f: Factura): number | null => {
    if (f.estado === 'pagada') return null;
    const venc = parseDateSafe(f.fechaVencimiento);
    if (!venc) return null;
    if (isAfter(new Date(), venc)) return Math.abs(differenceInDays(new Date(), venc));
    return null;
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Facturacion</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Gestion de facturas y pagos</p>
        </div>
        <Button onClick={() => { setNuevaFactura({ estado: 'pendiente', conceptos: [], iva: 10 }); setIsNuevaOpen(true); }}
          className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600 dark:hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Nueva Factura
        </Button>
      </div>

      {/* ===== ALERTA VENCIDAS ===== */}
      {vencidas.length > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              {`${vencidas.length} factura${vencidas.length > 1 ? 's' : ''} vencida${vencidas.length > 1 ? 's' : ''}`} - Total: {fmtCurrency(vencidas.reduce((s, f) => s + (f.total || 0), 0))}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setEstadoFiltro('vencida')}
            className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/30">
            Ver
          </Button>
        </div>
      )}

      {/* ===== STATS ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pendientes', value: stats.pendientes, icon: Clock, color: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' },
          { label: 'Pagadas', value: stats.pagadas, icon: CheckCircle2, color: 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400' },
          { label: 'Facturado Mes', value: fmtCurrency(stats.totalMes), icon: TrendingUp, color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' },
          { label: 'Pendiente Cobro', value: fmtCurrency(stats.totalPendiente), icon: Euro, color: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center gap-3">
            <div className={`rounded-lg p-2.5 ${s.color}`}><s.icon className="h-5 w-5" /></div>
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{s.value}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ===== FILTROS ===== */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar facturas..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 dark:bg-slate-900 dark:border-slate-700" />
        </div>
        <div className="flex gap-2">
          <Select value={estadoFiltro} onValueChange={v => setEstadoFiltro(v as EstadoFactura | 'todos')}>
            <SelectTrigger className="w-[150px] dark:bg-slate-900 dark:border-slate-700"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(estadoLabels).map(([k, l]) => (
                <SelectItem key={k} value={k}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex border rounded-lg overflow-hidden dark:border-slate-700">
            <button onClick={() => setVistaMode('cards')}
              className={`p-2 ${vistaMode === 'cards' ? 'bg-[#1e3a5f] text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}>
              <LayoutGrid className="h-4 w-4" /></button>
            <button onClick={() => setVistaMode('lista')}
              className={`p-2 ${vistaMode === 'lista' ? 'bg-[#1e3a5f] text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}>
              <List className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* ===== TABLA / CARDS ===== */}
      {vistaMode === 'lista' ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Numero</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Cliente</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Fecha</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Vencimiento</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtradas.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500">
                    <FileText className="h-10 w-10 mx-auto mb-2" /><p className="text-sm">No se encontraron facturas</p>
                  </td></tr>
                ) : filtradas.map(f => {
                  const dv = diasVencida(f);
                  return (
                    <tr key={f.id} onClick={() => setFacturaSel(f)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-medium dark:text-slate-200">{f.numero}</td>
                      <td className="px-4 py-3 dark:text-slate-300">{f.clienteNombre || '-'}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{fmtDate(f.fechaEmision)}</td>
                      <td className="px-4 py-3">
                        <span className="text-slate-500 dark:text-slate-400">{fmtDate(f.fechaVencimiento)}</span>
                        {dv !== null && (
                          <span className="block text-xs text-red-600 dark:text-red-400">{`Vencida hace ${dv} dias`}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium dark:text-slate-200">{fmtCurrency(f.total || 0)}</td>
                      <td className="px-4 py-3"><Badge className={estadoColors[f.estado]}>{estadoLabels[f.estado]}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                          {f.estado === 'pendiente' && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEnviar(f)} title="Enviar">
                              <Send className="h-3.5 w-3.5" /></Button>
                          )}
                          {(f.estado === 'pendiente' || f.estado === 'enviada' || f.estado === 'vencida') && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => handleMarcarPagada(f)} title="Marcar pagada">
                              <CheckCircle2 className="h-3.5 w-3.5" /></Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setFacturaSel(f)}><Eye className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ===== CARDS ===== */
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtradas.length === 0 ? (
            <div className="col-span-full flex flex-col items-center py-16 text-slate-400 dark:text-slate-500">
              <FileText className="h-12 w-12 mb-3" /><p className="text-sm">No se encontraron facturas</p>
            </div>
          ) : filtradas.map(f => {
            const dv = diasVencida(f);
            return (
              <div key={f.id} onClick={() => setFacturaSel(f)}
                className={`rounded-xl border p-5 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5 dark:bg-slate-800 ${
                  f.estado === 'vencida' || dv !== null
                    ? 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/10'
                    : 'border-slate-200 dark:border-slate-700 bg-white'
                }`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">{f.numero}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{f.clienteNombre || '-'}</p>
                  </div>
                  <Badge className={estadoColors[f.estado]}>{estadoLabels[f.estado]}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Emision</p>
                    <p className="dark:text-slate-300">{fmtDate(f.fechaEmision)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Vencimiento</p>
                    <p className="dark:text-slate-300">{fmtDate(f.fechaVencimiento)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{fmtCurrency(f.total || 0)}</p>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {f.estado === 'pendiente' && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEnviar(f)}><Send className="h-3.5 w-3.5" /></Button>
                    )}
                    {(f.estado === 'pendiente' || f.estado === 'enviada' || f.estado === 'vencida') && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => handleMarcarPagada(f)}><CheckCircle2 className="h-3.5 w-3.5" /></Button>
                    )}
                  </div>
                </div>
                {dv !== null && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">{`Vencida hace ${dv} dias`}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ===== DIALOG: NUEVA FACTURA ===== */}
      <Dialog open={isNuevaOpen} onOpenChange={setIsNuevaOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">Nueva Factura</DialogTitle>
            <DialogDescription className="dark:text-slate-400">Complete la informacion de la factura</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Cliente *</Label>
                <Select value={String(nuevaFactura.clienteId || '')}
                  onValueChange={v => setNuevaFactura(p => ({ ...p, clienteId: v }))}>
                  <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                  <SelectContent>
                    {clientes.filter(c => c.estado === 'activo').map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Servicio (opcional)</Label>
                <Select value={String(nuevaFactura.servicioId || '')}
                  onValueChange={v => {
                    const svc = servicios.find(s => String(s.id) === v);
                    if (svc) setNuevaFactura(p => ({
                      ...p, servicioId: v, clienteId: svc.clienteId,
                      conceptos: [{ id: `cf${Date.now()}`, concepto: svc.titulo, cantidad: 1, precioUnitario: svc.precio || 0, impuesto: p.iva || 10, total: svc.precio || 0 }],
                    }));
                  }}>
                  <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue placeholder="Seleccionar servicio" /></SelectTrigger>
                  <SelectContent>
                    {servicios.filter(s => s.estado === 'completado' && !s.facturado).map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{`${s.codigo} - ${s.titulo}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="dark:text-slate-300">Tipo de IVA</Label>
              <Select value={String(nuevaFactura.iva || 10)}
                onValueChange={v => setNuevaFactura(p => ({ ...p, iva: parseInt(v) }))}>
                <SelectTrigger className="w-40 dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10% (Transporte)</SelectItem>
                  <SelectItem value="21">21% (General)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conceptos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="dark:text-slate-300">Conceptos</Label>
                <Button type="button" variant="outline" size="sm" onClick={addConcepto}
                  className="dark:border-slate-600 dark:text-slate-300"><Plus className="mr-1 h-3.5 w-3.5" />Anadir</Button>
              </div>
              {nuevaFactura.conceptos?.map((c, i) => (
                <div key={c.id} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-5">
                    <Input placeholder="Concepto" value={c.concepto}
                      onChange={e => updateConcepto(i, 'concepto', e.target.value)}
                      className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" placeholder="Cant" value={c.cantidad}
                      onChange={e => updateConcepto(i, 'cantidad', parseFloat(e.target.value) || 0)}
                      className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" placeholder="Precio" value={c.precioUnitario}
                      onChange={e => updateConcepto(i, 'precioUnitario', parseFloat(e.target.value) || 0)}
                      className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" value={c.total} disabled className="bg-slate-50 dark:bg-slate-800 dark:border-slate-600" />
                  </div>
                  <div className="col-span-1">
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-red-500" onClick={() => removeConcepto(i)}>
                      <X className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Subtotal:</span>
                <span className="dark:text-slate-200">{fmtCurrency(calcTotales().subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">{`IVA (${calcTotales().iva}%):`}</span>
                <span className="dark:text-slate-200">{fmtCurrency(calcTotales().impuestos)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-slate-200 dark:border-slate-600 pt-2">
                <span className="dark:text-slate-100">Total:</span>
                <span className="dark:text-slate-100">{fmtCurrency(calcTotales().total)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNuevaOpen(false)}
              className="dark:border-slate-600 dark:text-slate-300">Cancelar</Button>
            <Button onClick={handleNueva} className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600">Crear Factura</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: DETALLE FACTURA ===== */}
      <Dialog open={!!facturaSel} onOpenChange={() => setFacturaSel(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
          {facturaSel && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 dark:text-slate-100">
                  <FileText className="h-5 w-5" />{`Factura ${facturaSel.numero}`}
                </DialogTitle>
                <DialogDescription className="dark:text-slate-400">{facturaSel.clienteNombre}</DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Info general */}
                <div className="grid grid-cols-3 gap-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 p-4">
                  <div>
                    <Label className="text-xs text-slate-500 dark:text-slate-400">Fecha Emision</Label>
                    <p className="dark:text-slate-200">{fmtDate(facturaSel.fechaEmision)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 dark:text-slate-400">Vencimiento</Label>
                    <p className="dark:text-slate-200">{fmtDate(facturaSel.fechaVencimiento)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 dark:text-slate-400">Estado</Label>
                    <Badge className={estadoColors[facturaSel.estado]}>{estadoLabels[facturaSel.estado]}</Badge>
                  </div>
                </div>

                {/* Conceptos */}
                <div>
                  <Label className="text-xs text-slate-500 dark:text-slate-400 mb-2 block">Conceptos</Label>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900/50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400">Concepto</th>
                          <th className="px-4 py-2 text-right font-medium text-slate-500 dark:text-slate-400">Cant</th>
                          <th className="px-4 py-2 text-right font-medium text-slate-500 dark:text-slate-400">Precio</th>
                          <th className="px-4 py-2 text-right font-medium text-slate-500 dark:text-slate-400">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {(facturaSel.conceptos || []).map(c => (
                          <tr key={c.id}>
                            <td className="px-4 py-2 dark:text-slate-200">{c.concepto}</td>
                            <td className="px-4 py-2 text-right dark:text-slate-300">{c.cantidad}</td>
                            <td className="px-4 py-2 text-right dark:text-slate-300">{fmtCurrency(c.precioUnitario || 0)}</td>
                            <td className="px-4 py-2 text-right font-medium dark:text-slate-200">{fmtCurrency(c.total || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totales */}
                <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Subtotal:</span>
                    <span className="dark:text-slate-200">{fmtCurrency(facturaSel.subtotal || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">{`IVA (${facturaSel.iva || 10}%):`}</span>
                    <span className="dark:text-slate-200">{fmtCurrency(facturaSel.impuestos || 0)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-slate-200 dark:border-slate-600 pt-2">
                    <span className="dark:text-slate-100">Total:</span>
                    <span className="dark:text-slate-100">{fmtCurrency(facturaSel.total || 0)}</span>
                  </div>
                </div>

                {facturaSel.fechaPago && (
                  <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4">
                    <Label className="text-green-700 dark:text-green-300 text-xs">Pagada el</Label>
                    <p className="text-green-700 dark:text-green-300 font-medium">{fmtDate(facturaSel.fechaPago)}</p>
                    {facturaSel.referenciaPago && (
                      <p className="text-sm text-green-600 dark:text-green-400">{`Ref: ${facturaSel.referenciaPago}`}</p>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" className="dark:border-slate-600 dark:text-slate-300">
                  <Printer className="mr-2 h-4 w-4" />Imprimir</Button>
                {facturaSel.estado !== 'pagada' && (
                  <Button onClick={() => handleMarcarPagada(facturaSel)} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="mr-2 h-4 w-4" />Marcar como Pagada
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
