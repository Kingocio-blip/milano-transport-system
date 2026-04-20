// ============================================
// MILANO - CRM Clientes (Rediseñado)
// Cards profesionales, dark mode, modales grandes
// ============================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useClientesStore, useServiciosStore, useUIStore } from '../store';
import type { Cliente, TipoCliente } from '@/types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Plus, Search, Loader2, Trash2, Edit3, Eye, Building2, Mail, Phone, MapPin,
  CheckCircle2, X, LayoutGrid, List, TrendingUp, Users, Euro, FileText,
  Briefcase, AlertTriangle, Search as SearchIcon, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SkeletonPage } from '../components/LoadingScreen';

// Colores por tipo de cliente
const tipoColors: Record<string, string> = {
  empresa: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  festival: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  promotor: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  colegio: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  particular: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  autonomo: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  institucion_publica: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  hotel: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  organizacion_eventos: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  agencia_viajes: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  otro: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

const estadoColors: Record<string, string> = {
  activo: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  inactivo: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  potencial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  bloqueado: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const formaPagoLabels: Record<string, string> = {
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  domiciliacion: 'Domiciliación',
  adelantado_completo: 'Pago completo por adelantado',
  adelantado_50_50: '50% reserva + 50% antes del servicio',
};

interface NuevoClienteForm {
  nombre: string; tipo: TipoCliente; nif: string; estado: string;
  formaPago: string; diasPago: number; condicionesEspeciales: string; notas: string;
  contacto: { email: string; telefono: string; direccion: string; ciudad: string; codigoPostal: string; };
}

const initialClienteState: NuevoClienteForm = {
  nombre: '', tipo: 'empresa', nif: '', estado: 'activo',
  formaPago: 'transferencia', diasPago: 30, condicionesEspeciales: '', notas: '',
  contacto: { email: '', telefono: '', direccion: '', ciudad: '', codigoPostal: '' },
};

function getDocumentoLabel(tipo: string): string {
  if (tipo === 'particular' || tipo === 'autonomo') return 'DNI / NIE';
  return 'CIF / NIF';
}

function idsEqual(a: string | number | undefined, b: string | number | undefined): boolean {
  return String(a) === String(b);
}

export default function CRM() {
  const { clientes, isLoading, addCliente, updateCliente, deleteCliente, fetchClientes } = useClientesStore();
  const { servicios } = useServiciosStore();
  const { showToast } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('todos');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('todos');
  const [vistaMode, setVistaMode] = useState<'cards' | 'lista'>('cards');

  const [isNuevoClienteOpen, setIsNuevoClienteOpen] = useState(false);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const [isEditarOpen, setIsEditarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [nuevoCliente, setNuevoCliente] = useState<NuevoClienteForm>(initialClienteState);

  const [detalleTab, setDetalleTab] = useState('info');
  const [serviciosTabFilter, setServiciosTabFilter] = useState('todos');

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  // Estadísticas
  const stats = useMemo(() => ({
    total: clientes.length,
    activos: clientes.filter(c => c.estado === 'activo').length,
    empresas: clientes.filter(c => c.tipo === 'empresa').length,
    facturacion: clientes.reduce((sum, c) => sum + (c.totalFacturado || 0), 0),
  }), [clientes]);

  // Clientes filtrados
  const filtrados = useMemo(() => {
    return clientes.filter(c => {
      const sq = searchQuery.toLowerCase().trim();
      const ms = sq === '' || c.nombre?.toLowerCase().includes(sq) || c.nif?.toLowerCase().includes(sq) || c.contacto?.email?.toLowerCase().includes(sq);
      return ms && (tipoFiltro === 'todos' || c.tipo === tipoFiltro) && (estadoFiltro === 'todos' || c.estado === estadoFiltro);
    });
  }, [clientes, searchQuery, tipoFiltro, estadoFiltro]);

  // Servicios del cliente seleccionado
  const serviciosCliente = useMemo(() => {
    if (!clienteSeleccionado) return [];
    return servicios.filter(s => idsEqual(s.clienteId, clienteSeleccionado.id));
  }, [servicios, clienteSeleccionado]);

  const serviciosFiltrados = useMemo(() => {
    if (serviciosTabFilter === 'todos') return serviciosCliente;
    if (serviciosTabFilter === 'activos') return serviciosCliente.filter(s => ['solicitud','presupuesto','negociacion','confirmado','planificando','asignado','en_curso'].includes(s.estado));
    if (serviciosTabFilter === 'completados') return serviciosCliente.filter(s => ['completado','facturado'].includes(s.estado));
    if (serviciosTabFilter === 'cancelados') return serviciosCliente.filter(s => s.estado === 'cancelado');
    return serviciosCliente;
  }, [serviciosCliente, serviciosTabFilter]);

  const facturacionStats = useMemo(() => {
    if (!serviciosCliente.length) return { total: 0, facturado: 0, pendiente: 0, porCobrar: 0 };
    const total = serviciosCliente.reduce((sum, s) => sum + (s.precio || 0), 0);
    const facturado = serviciosCliente.filter(s => s.facturado).reduce((sum, s) => sum + (s.precio || 0), 0);
    const pendiente = serviciosCliente.filter(s => s.estado === 'completado' && !s.facturado).reduce((sum, s) => sum + (s.precio || 0), 0);
    const porCobrar = serviciosCliente.filter(s => ['solicitud','presupuesto','negociacion','confirmado','planificando','asignado','en_curso'].includes(s.estado)).reduce((sum, s) => sum + (s.precio || 0), 0);
    return { total, facturado, pendiente, porCobrar };
  }, [serviciosCliente]);

  // Handlers
  const handleNuevoCliente = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); e.stopPropagation();
    const nombreLimpio = nuevoCliente.nombre.trim();
    if (!nombreLimpio) { showToast('El nombre es obligatorio', 'error'); return; }

    // FIX: Validate tipo is not __otro__ without custom value
    const tipoFinal = (nuevoCliente.tipo as string) === '__otro__' ? 'otro' : nuevoCliente.tipo;
    if ((nuevoCliente.tipo as string) === '__otro__' && (!tipoFinal || (tipoFinal as string) === '__otro__')) {
      showToast('Debes escribir un tipo de cliente personalizado', 'error'); return;
    }

    setIsSubmitting(true);
    try {
      const success = await addCliente({ ...nuevoCliente, tipo: tipoFinal as TipoCliente });
      if (success) {
        setIsNuevoClienteOpen(false); setNuevoCliente(initialClienteState);
        showToast('Cliente creado correctamente', 'success'); await fetchClientes();
      } else { throw new Error('Error al crear cliente'); }
    } catch (err: any) {
      let errorMsg = err.message;
      try { const parsed = JSON.parse(err.message); errorMsg = parsed.detail || 'Error desconocido'; } catch {}
      showToast(`Error: ${errorMsg}`, 'error');
    } finally { setIsSubmitting(false); }
  }, [nuevoCliente, addCliente, fetchClientes, showToast]);

  const handleEditarCliente = async () => {
    if (!clienteSeleccionado) return;
    setIsSubmitting(true);
    try {
      const success = await updateCliente(String(clienteSeleccionado.id), {
        nombre: clienteSeleccionado.nombre?.trim(),
        tipo: clienteSeleccionado.tipo, estado: clienteSeleccionado.estado,
        nif: clienteSeleccionado.nif?.trim() || undefined,
        formaPago: clienteSeleccionado.formaPago,
        diasPago: clienteSeleccionado.diasPago,
        condicionesEspeciales: clienteSeleccionado.condicionesEspeciales?.trim() || undefined,
        notas: clienteSeleccionado.notas?.trim() || undefined,
        contacto: {
          email: clienteSeleccionado.contacto?.email?.trim() || undefined,
          telefono: clienteSeleccionado.contacto?.telefono?.trim() || undefined,
          direccion: clienteSeleccionado.contacto?.direccion?.trim() || undefined,
          ciudad: clienteSeleccionado.contacto?.ciudad?.trim() || undefined,
          codigoPostal: clienteSeleccionado.contacto?.codigoPostal?.trim() || undefined,
        }
      });
      if (success) {
        setIsEditarOpen(false); showToast('Cliente actualizado', 'success');
        await fetchClientes();
        const actualizado = clientes.find(c => idsEqual(c.id, clienteSeleccionado.id));
        if (actualizado) setClienteSeleccionado(actualizado);
      }
    } catch (err: any) { showToast(`Error: ${err.message}`, 'error'); }
    finally { setIsSubmitting(false); }
  };

  const handleEliminarCliente = async (id: string) => {
    if (!window.confirm('Eliminar este cliente?')) return;
    try {
      if (await deleteCliente(id)) {
        showToast('Cliente eliminado', 'success');
        if (clienteSeleccionado && idsEqual(clienteSeleccionado.id, id)) {
          setIsDetalleOpen(false); setIsEditarOpen(false); setClienteSeleccionado(null);
        }
        await fetchClientes();
      }
    } catch (err: any) { showToast(`Error: ${err.message}`, 'error'); }
  };

  const updateContacto = (field: keyof NuevoClienteForm['contacto'], value: string) => {
    setNuevoCliente(p => ({ ...p, contacto: { ...p.contacto, [field]: value } }));
  };

  const updateClienteContacto = (field: keyof Cliente['contacto'], value: string) => {
    if (!clienteSeleccionado) return;
    setClienteSeleccionado({ ...clienteSeleccionado, contacto: { ...clienteSeleccionado.contacto, [field]: value } });
  };

  if (isLoading && clientes.length === 0) return <SkeletonPage type="mixed" tableCols={6} vistaMode={vistaMode} />;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">CRM - Clientes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Gestion de clientes y oportunidades</p>
        </div>
        <Button onClick={() => setIsNuevoClienteOpen(true)} className="bg-[#1e3a5f] hover:bg-[#152a45] shadow-sm dark:bg-blue-600 dark:hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Clientes', value: stats.total, icon: Users, color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' },
          { label: 'Activos', value: stats.activos, icon: CheckCircle2, color: 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400' },
          { label: 'Empresas', value: stats.empresas, icon: Building2, color: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400' },
          { label: 'Facturacion Total', value: `${stats.facturacion.toLocaleString()} EUR`, icon: Euro, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center gap-3">
            <div className={`rounded-lg p-2.5 ${s.color}`}><s.icon className="h-5 w-5" /></div>
            <div><p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{s.value}</p><p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar cliente..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 dark:bg-slate-900 dark:border-slate-700" />
        </div>
        <div className="flex gap-2">
          <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
            <SelectTrigger className="w-[150px] dark:bg-slate-900 dark:border-slate-700"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="empresa">Empresa</SelectItem>
              <SelectItem value="festival">Festival</SelectItem>
              <SelectItem value="promotor">Promotor</SelectItem>
              <SelectItem value="colegio">Colegio</SelectItem>
              <SelectItem value="particular">Particular</SelectItem>
              <SelectItem value="hotel">Hotel</SelectItem>
            </SelectContent>
          </Select>
          <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
            <SelectTrigger className="w-[140px] dark:bg-slate-900 dark:border-slate-700"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="inactivo">Inactivo</SelectItem>
              <SelectItem value="potencial">Potencial</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex border rounded-lg overflow-hidden dark:border-slate-700">
            <button onClick={() => setVistaMode('cards')} className={`p-2 ${vistaMode === 'cards' ? 'bg-[#1e3a5f] text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}><LayoutGrid className="h-4 w-4" /></button>
            <button onClick={() => setVistaMode('lista')} className={`p-2 ${vistaMode === 'lista' ? 'bg-[#1e3a5f] text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}><List className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* Vista CARDS */}
      {vistaMode === 'cards' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.length === 0 ? (
            <div className="col-span-full flex flex-col items-center py-16 text-slate-400 dark:text-slate-500">
              <Users className="h-12 w-12 mb-3" /><p className="text-sm">No hay clientes</p>
            </div>
          ) : filtrados.map(c => (
            <div key={c.id} onClick={() => { setClienteSeleccionado(c); setDetalleTab('info'); setServiciosTabFilter('todos'); setIsDetalleOpen(true); }}
              className="group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1e3a5f] dark:bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    {c.nombre?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">{c.nombre}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{c.nif || 'Sin NIF'}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Badge className={tipoColors[c.tipo] || tipoColors.otro}>{c.tipo}</Badge>
                  <Badge className={estadoColors[c.estado] || ''}>{c.estado}</Badge>
                </div>
              </div>
              <div className="space-y-1.5 text-sm text-slate-500 dark:text-slate-400 mb-3">
                {c.contacto?.email && <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{c.contacto.email}</p>}
                {c.contacto?.telefono && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{c.contacto.telefono}</p>}
                {c.contacto?.ciudad && <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{c.contacto.ciudad}</p>}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {c.totalServicios || 0} servicios · {(c.totalFacturado || 0).toLocaleString()} EUR
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={e => { e.stopPropagation(); setClienteSeleccionado(c); setDetalleTab('info'); setServiciosTabFilter('todos'); setIsDetalleOpen(true); }}><Eye className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={e => { e.stopPropagation(); setClienteSeleccionado(c); setIsEditarOpen(true); }}><Edit3 className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={e => { e.stopPropagation(); handleEliminarCliente(String(c.id)); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Vista LISTA */
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-left">
                <tr><th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Cliente</th><th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Tipo</th><th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Contacto</th><th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Estado</th><th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 text-right">Servicios</th><th className="px-4 py-3"></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtrados.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400 dark:text-slate-500"><Users className="h-10 w-10 mx-auto mb-2" />No hay clientes</td></tr>
                ) : filtrados.map(c => (
                  <tr key={c.id} onClick={() => { setClienteSeleccionado(c); setDetalleTab('info'); setServiciosTabFilter('todos'); setIsDetalleOpen(true); }} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#1e3a5f] dark:bg-blue-600 flex items-center justify-center text-white font-bold text-xs">{c.nombre?.charAt(0).toUpperCase()}</div>
                        <div><p className="font-medium dark:text-slate-200">{c.nombre}</p><p className="text-xs text-slate-500">{c.nif}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge className={tipoColors[c.tipo] || tipoColors.otro}>{c.tipo}</Badge></td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{c.contacto?.email || c.contacto?.telefono || '-'}</td>
                    <td className="px-4 py-3"><Badge className={estadoColors[c.estado] || ''}>{c.estado}</Badge></td>
                    <td className="px-4 py-3 text-right dark:text-slate-300">{c.totalServicios || 0}</td>
                    <td className="px-4 py-3"><div className="flex gap-1 justify-end"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); setClienteSeleccionado(c); setDetalleTab('info'); setIsDetalleOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); setClienteSeleccionado(c); setIsEditarOpen(true); }}><Edit3 className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={e => { e.stopPropagation(); handleEliminarCliente(String(c.id)); }}><Trash2 className="h-3.5 w-3.5" /></Button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DIALOG: Nuevo Cliente */}
      <Dialog open={isNuevoClienteOpen} onOpenChange={setIsNuevoClienteOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader><DialogTitle className="dark:text-slate-100">Nuevo Cliente</DialogTitle><DialogDescription className="dark:text-slate-400">Complete la informacion del nuevo cliente</DialogDescription></DialogHeader>
          <form onSubmit={handleNuevoCliente} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={nuevoCliente.tipo} onValueChange={v => setNuevoCliente({...nuevoCliente, tipo: v as TipoCliente})}>
                  <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empresa">Empresa</SelectItem><SelectItem value="festival">Festival</SelectItem><SelectItem value="promotor">Promotor</SelectItem>
                    <SelectItem value="colegio">Colegio</SelectItem><SelectItem value="particular">Particular / Autonomo</SelectItem><SelectItem value="hotel">Hotel</SelectItem>
                    <SelectItem value="__otro__">+ Otro...</SelectItem>
                  </SelectContent>
                </Select>
                {(nuevoCliente.tipo as string) === '__otro__' && (
                  <Input placeholder="Escribe el tipo de cliente" className="mt-2 dark:bg-slate-900 dark:border-slate-600" onChange={e => setNuevoCliente({...nuevoCliente, tipo: (e.target.value || 'otro') as TipoCliente})} autoFocus />
                )}
              </div>
              <div className="space-y-2">
                <Label>Nombre / Razon Social *</Label>
                <Input value={nuevoCliente.nombre} onChange={e => setNuevoCliente({...nuevoCliente, nombre: e.target.value})} placeholder="Nombre del cliente" required className="dark:bg-slate-900 dark:border-slate-600" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{getDocumentoLabel(nuevoCliente.tipo)}</Label>
              <div className="flex gap-2">
                <Input value={nuevoCliente.nif} onChange={e => setNuevoCliente({...nuevoCliente, nif: e.target.value})} placeholder={`Numero de ${getDocumentoLabel(nuevoCliente.tipo)}`} className="flex-1 dark:bg-slate-900 dark:border-slate-600" />
                <Button type="button" variant="outline" size="icon" title="Buscar datos por CIF (proximamente)" disabled className="flex-shrink-0 opacity-60"><SearchIcon className="h-4 w-4" /></Button>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400">Autocompletar por CIF - Proximamente</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={nuevoCliente.contacto.email} onChange={e => updateContacto('email', e.target.value)} placeholder="email@ejemplo.com" className="dark:bg-slate-900 dark:border-slate-600" /></div>
              <div className="space-y-2"><Label>Telefono</Label><Input value={nuevoCliente.contacto.telefono} onChange={e => updateContacto('telefono', e.target.value)} placeholder="+34 600 000 000" className="dark:bg-slate-900 dark:border-slate-600" /></div>
              <div className="space-y-2"><Label>Ciudad</Label><Input value={nuevoCliente.contacto.ciudad} onChange={e => updateContacto('ciudad', e.target.value)} placeholder="Ciudad" className="dark:bg-slate-900 dark:border-slate-600" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Direccion</Label><Input value={nuevoCliente.contacto.direccion} onChange={e => updateContacto('direccion', e.target.value)} placeholder="Calle, numero" className="dark:bg-slate-900 dark:border-slate-600" /></div>
              <div className="space-y-2"><Label>Codigo Postal</Label><Input value={nuevoCliente.contacto.codigoPostal} onChange={e => updateContacto('codigoPostal', e.target.value)} placeholder="08001" className="dark:bg-slate-900 dark:border-slate-600" /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Forma de Pago</Label>
                <Select value={nuevoCliente.formaPago} onValueChange={v => setNuevoCliente({...nuevoCliente, formaPago: v})}>
                  <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transferencia">Transferencia</SelectItem><SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem><SelectItem value="domiciliacion">Domiciliacion</SelectItem>
                    <SelectItem value="adelantado_completo">Pago completo por adelantado</SelectItem>
                    <SelectItem value="adelantado_50_50">50% reserva + 50% antes del servicio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Dias de Pago</Label><Input type="number" value={nuevoCliente.diasPago} onChange={e => setNuevoCliente({...nuevoCliente, diasPago: parseInt(e.target.value) || 30})} className="dark:bg-slate-900 dark:border-slate-600" /></div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={nuevoCliente.estado} onValueChange={v => setNuevoCliente({...nuevoCliente, estado: v})}>
                  <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="activo">Activo</SelectItem><SelectItem value="inactivo">Inactivo</SelectItem><SelectItem value="potencial">Potencial</SelectItem><SelectItem value="bloqueado">Bloqueado</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Condiciones Especiales</Label><Textarea value={nuevoCliente.condicionesEspeciales} onChange={e => setNuevoCliente({...nuevoCliente, condicionesEspeciales: e.target.value})} placeholder="Condiciones especiales de facturacion, descuentos, etc." rows={2} className="dark:bg-slate-900 dark:border-slate-600" /></div>
            <div className="space-y-2"><Label>Notas</Label><Textarea value={nuevoCliente.notas} onChange={e => setNuevoCliente({...nuevoCliente, notas: e.target.value})} placeholder="Notas internas sobre el cliente" rows={2} className="dark:bg-slate-900 dark:border-slate-600" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setIsNuevoClienteOpen(false); setNuevoCliente(initialClienteState); }} className="dark:border-slate-600 dark:text-slate-300">Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600">
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : 'Crear Cliente'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Detalle */}
      <Dialog open={isDetalleOpen} onOpenChange={setIsDetalleOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">{clienteSeleccionado?.nombre}</DialogTitle>
            <DialogDescription className="dark:text-slate-400">{clienteSeleccionado?.nif} · {clienteSeleccionado?.tipo}</DialogDescription>
          </DialogHeader>
          {clienteSeleccionado && (
            <Tabs value={detalleTab} onValueChange={setDetalleTab}>
              <TabsList className="dark:bg-slate-900">
                <TabsTrigger value="info">Informacion</TabsTrigger>
                <TabsTrigger value="servicios">Servicios ({serviciosCliente.length})</TabsTrigger>
                <TabsTrigger value="facturacion">Facturacion</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                    <h4 className="font-medium text-sm dark:text-slate-300">Contacto</h4>
                    {clienteSeleccionado.contacto?.email && <p className="flex items-center gap-2 text-sm dark:text-slate-400"><Mail className="h-4 w-4" />{clienteSeleccionado.contacto.email}</p>}
                    {clienteSeleccionado.contacto?.telefono && <p className="flex items-center gap-2 text-sm dark:text-slate-400"><Phone className="h-4 w-4" />{clienteSeleccionado.contacto.telefono}</p>}
                    {clienteSeleccionado.contacto?.direccion && <p className="flex items-center gap-2 text-sm dark:text-slate-400"><MapPin className="h-4 w-4" />{`${clienteSeleccionado.contacto.direccion}${clienteSeleccionado.contacto.ciudad ? `, ${clienteSeleccionado.contacto.ciudad}` : ''}`}</p>}
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                    <h4 className="font-medium text-sm dark:text-slate-300">Datos Comerciales</h4>
                    <p className="text-sm dark:text-slate-400">Forma de pago: <span className="font-medium dark:text-slate-200">{clienteSeleccionado.formaPago ? (formaPagoLabels[clienteSeleccionado.formaPago] || clienteSeleccionado.formaPago) : '-'}</span></p>
                    <p className="text-sm dark:text-slate-400">Dias de pago: <span className="font-medium dark:text-slate-200">{clienteSeleccionado.diasPago}</span></p>
                    <p className="text-sm dark:text-slate-400">Estado: <Badge className={estadoColors[clienteSeleccionado.estado] || ''}>{clienteSeleccionado.estado}</Badge></p>
                  </div>
                </div>
                {clienteSeleccionado.condicionesEspeciales && (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                    <h4 className="font-medium text-sm mb-1 dark:text-slate-300">Condiciones Especiales</h4>
                    <p className="text-sm dark:text-slate-400">{clienteSeleccionado.condicionesEspeciales}</p>
                  </div>
                )}
                {clienteSeleccionado.notas && (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                    <h4 className="font-medium text-sm mb-1 dark:text-slate-300">Notas</h4>
                    <p className="text-sm dark:text-slate-400">{clienteSeleccionado.notas}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="servicios" className="pt-4">
                <div className="flex gap-2 mb-4">
                  {[{v:'todos',l:'Todos'},{v:'activos',l:'Activos'},{v:'completados',l:'Completados'},{v:'cancelados',l:'Cancelados'}].map(t => (
                    <Button key={t.v} size="sm" variant={serviciosTabFilter === t.v ? 'default' : 'outline'} onClick={() => setServiciosTabFilter(t.v)} className={serviciosTabFilter === t.v ? 'bg-[#1e3a5f] dark:bg-blue-600' : 'dark:border-slate-600 dark:text-slate-300'}>{t.l}</Button>
                  ))}
                </div>
                <ScrollArea className="h-80">
                  {serviciosFiltrados.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-slate-400 dark:text-slate-500"><Briefcase className="h-10 w-10 mb-2" /><p className="text-sm">Sin servicios</p></div>
                  ) : (
                    <div className="space-y-2">
                      {serviciosFiltrados.map(s => (
                        <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                          <div><p className="font-medium text-sm dark:text-slate-200">{`${s.codigo} · ${s.titulo}`}</p><p className="text-xs text-slate-500 dark:text-slate-400">{`${s.estado} · ${(s.precio || 0).toLocaleString()} EUR`}</p></div>
                          <Button size="sm" variant="outline" asChild className="dark:border-slate-600"><Link to={`/servicios?id=${s.id}`}>Ver</Link></Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="facturacion" className="pt-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  {[{l:'Total',v:facturacionStats.total},{l:'Facturado',v:facturacionStats.facturado},{l:'Pendiente',v:facturacionStats.pendiente},{l:'Por cobrar',v:facturacionStats.porCobrar}].map(s => (
                    <div key={s.l} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3"><p className="text-xs text-slate-500 dark:text-slate-400">{s.l}</p><p className="text-lg font-bold dark:text-slate-100">{s.v.toLocaleString()} EUR</p></div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" onClick={() => { setIsDetalleOpen(false); setClienteSeleccionado(clienteSeleccionado); setIsEditarOpen(true); }} className="dark:border-slate-600 dark:text-slate-300">Editar</Button>
            <Button variant="destructive" onClick={() => handleEliminarCliente(String(clienteSeleccionado?.id))}>Eliminar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Editar */}
      <Dialog open={isEditarOpen} onOpenChange={setIsEditarOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader><DialogTitle className="dark:text-slate-100">Editar Cliente</DialogTitle></DialogHeader>
          {clienteSeleccionado && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Nombre *</Label><Input value={clienteSeleccionado.nombre} onChange={e => setClienteSeleccionado({...clienteSeleccionado, nombre: e.target.value})} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                <div className="space-y-2"><Label>Tipo</Label>
                  <Select value={clienteSeleccionado.tipo} onValueChange={v => setClienteSeleccionado({...clienteSeleccionado, tipo: v as TipoCliente})}>
                    <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empresa">Empresa</SelectItem><SelectItem value="festival">Festival</SelectItem><SelectItem value="promotor">Promotor</SelectItem>
                      <SelectItem value="colegio">Colegio</SelectItem><SelectItem value="particular">Particular / Autonomo</SelectItem><SelectItem value="hotel">Hotel</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>{getDocumentoLabel(clienteSeleccionado.tipo)}</Label><Input value={clienteSeleccionado.nif || ''} onChange={e => setClienteSeleccionado({...clienteSeleccionado, nif: e.target.value})} className="dark:bg-slate-900 dark:border-slate-600" /></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Email</Label><Input value={clienteSeleccionado.contacto?.email || ''} onChange={e => updateClienteContacto('email', e.target.value)} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                <div className="space-y-2"><Label>Telefono</Label><Input value={clienteSeleccionado.contacto?.telefono || ''} onChange={e => updateClienteContacto('telefono', e.target.value)} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                <div className="space-y-2"><Label>Ciudad</Label><Input value={clienteSeleccionado.contacto?.ciudad || ''} onChange={e => updateClienteContacto('ciudad', e.target.value)} className="dark:bg-slate-900 dark:border-slate-600" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Direccion</Label><Input value={clienteSeleccionado.contacto?.direccion || ''} onChange={e => updateClienteContacto('direccion', e.target.value)} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                <div className="space-y-2"><Label>Codigo Postal</Label><Input value={clienteSeleccionado.contacto?.codigoPostal || ''} onChange={e => updateClienteContacto('codigoPostal', e.target.value)} className="dark:bg-slate-900 dark:border-slate-600" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Forma de Pago</Label>
                  <Select value={clienteSeleccionado.formaPago} onValueChange={v => setClienteSeleccionado({...clienteSeleccionado, formaPago: v})}>
                    <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transferencia">Transferencia</SelectItem><SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem><SelectItem value="domiciliacion">Domiciliacion</SelectItem>
                      <SelectItem value="adelantado_completo">Pago completo por adelantado</SelectItem>
                      <SelectItem value="adelantado_50_50">50% reserva + 50% antes del servicio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Dias de Pago</Label><Input type="number" value={clienteSeleccionado.diasPago || 30} onChange={e => setClienteSeleccionado({...clienteSeleccionado, diasPago: parseInt(e.target.value) || 30})} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={clienteSeleccionado.estado} onValueChange={v => setClienteSeleccionado({...clienteSeleccionado, estado: v as any})}>
                    <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="activo">Activo</SelectItem><SelectItem value="inactivo">Inactivo</SelectItem><SelectItem value="potencial">Potencial</SelectItem><SelectItem value="bloqueado">Bloqueado</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Condiciones Especiales</Label><Textarea value={clienteSeleccionado.condicionesEspeciales || ''} onChange={e => setClienteSeleccionado({...clienteSeleccionado, condicionesEspeciales: e.target.value})} rows={2} className="dark:bg-slate-900 dark:border-slate-600" /></div>
              <div className="space-y-2"><Label>Notas</Label><Textarea value={clienteSeleccionado.notas || ''} onChange={e => setClienteSeleccionado({...clienteSeleccionado, notas: e.target.value})} rows={2} className="dark:bg-slate-900 dark:border-slate-600" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsEditarOpen(false)} className="dark:border-slate-600 dark:text-slate-300">Cancelar</Button>
                <Button onClick={handleEditarCliente} disabled={isSubmitting} className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600">
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : 'Guardar Cambios'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
