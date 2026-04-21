// ============================================
// MILANO - CRM Clientes (Rediseñado v2)
// Fixes: tipo Otro, estado automatico, descuentos, CIF, servicios ordenados
// ============================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useClientesStore, useServiciosStore, useFacturasStore, useUIStore } from '../store';
import type { Cliente, TipoCliente, Servicio, Factura } from '@/types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
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
import { Checkbox } from '../components/ui/checkbox';
import {
  Plus, Search, Loader2, Trash2, Edit3, Eye, Building2, Mail, Phone, MapPin,
  CheckCircle2, X, LayoutGrid, List, TrendingUp, Users, Euro, FileText,
  Briefcase, AlertTriangle, Search as SearchIcon, Clock, ExternalLink,
  MessageSquare, Percent, Calendar, Tag, CreditCard, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SkeletonPage } from '../components/LoadingScreen';
import { format, differenceInDays, parseISO, isValid, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';

// ============================================
// CONSTANTES
// ============================================

const tipoColors: Record<string, string> = {
  empresa: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  festival: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  promotor: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  colegio: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  particular: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  autonomo: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  hotel: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  otro: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

const estadoColors: Record<string, string> = {
  activo: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  inactivo: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  potencial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  bloqueado: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const estadoLabels: Record<string, string> = {
  activo: 'Activo', inactivo: 'Inactivo', potencial: 'Potencial', bloqueado: 'Bloqueado',
};

const formaPagoLabels: Record<string, string> = {
  transferencia: 'Transferencia bancaria',
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta de credito/debito',
  domiciliacion: 'Domiciliacion bancaria',
  adelantado_completo: 'Pago completo por adelantado',
  adelantado_50_50: '50% al contratar + 50% antes del servicio',
  despues_servicio: 'Despues del servicio',
};

// ============================================
// HELPERS
// ============================================

function idsEqual(a: string | number | undefined, b: string | number | undefined): boolean {
  return String(a) === String(b);
}

function parseDateSafe(d: string | Date | undefined): Date | null {
  if (!d) return null;
  try { const p = typeof d === 'string' ? parseISO(d) : d; return isValid(p) ? p : null; }
  catch { return null; }
}

function fmtDate(d: string | Date | undefined): string {
  const date = parseDateSafe(d);
  return date ? format(date, 'dd/MM/yyyy', { locale: es }) : '-';
}

function fmtCurrency(n: number): string {
  return `${(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
}

function getDocumentoLabel(tipo: string): string {
  if (tipo === 'particular' || tipo === 'autonomo') return 'DNI / NIE';
  return 'CIF / NIF';
}

// Calcula estado automatico del cliente basado en servicios y facturas
function calcularEstadoCliente(
  clienteId: string,
  servicios: Servicio[],
  facturas: Factura[]
): 'potencial' | 'activo' | 'inactivo' | 'bloqueado' {
  const serviciosCliente = servicios.filter(s => idsEqual(s.clienteId, clienteId));
  const ahora = new Date();

  // 1. Factura no pagada con +90 dias -> Bloqueado
  const facturasImpagas = facturas.filter(
    f => idsEqual(f.clienteId, clienteId) && (f.estado === 'pendiente' || f.estado === 'vencida')
  );
  for (const f of facturasImpagas) {
    const fv = parseDateSafe(f.fechaVencimiento);
    if (fv && differenceInDays(ahora, fv) > 90) return 'bloqueado';
  }

  // 2. Sin servicios -> Potencial
  if (serviciosCliente.length === 0) return 'potencial';

  // Buscar ultimo servicio
  const fechasServicios = serviciosCliente
    .map(s => parseDateSafe(s.fechaInicio))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime());

  if (fechasServicios.length === 0) return 'potencial';

  const ultimoServicio = fechasServicios[0];
  const diasDesdeUltimo = differenceInDays(ahora, ultimoServicio);

  // 3. Servicio en ultimos 7 dias -> Potencial
  if (diasDesdeUltimo <= 7) return 'potencial';

  // 4. Servicio entre 7 y 60 dias -> Activo
  if (diasDesdeUltimo <= 60) return 'activo';

  // 5. Sin servicio +60 dias -> Inactivo
  return 'inactivo';
}

// Ordena servicios: mas proximos primero
function ordenarServiciosPorFecha(servicios: Servicio[]): Servicio[] {
  return [...servicios].sort((a, b) => {
    const da = parseDateSafe(a.fechaInicio);
    const db = parseDateSafe(b.fechaInicio);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return db.getTime() - da.getTime();
  });
}

// ============================================
// INTERFACES
// ============================================

interface NuevoClienteForm {
  nombre: string;
  tipo: TipoCliente | '__otro__';
  tipoPersonalizado: string;
  nif: string;
  contacto: { email: string; telefono: string; direccion: string; ciudad: string; codigoPostal: string; };
  formaPago: string;
  diasPago: number;
  condicionesEspeciales: string;
  notas: string;
  // Descuento
  descuentoActivo: boolean;
  descuentoTipo: 'porcentaje' | 'fijo';
  descuentoValor: number;
  descuentoFechaInicio: string;
  descuentoFechaFin: string;
}

const initialClienteState: NuevoClienteForm = {
  nombre: '', tipo: 'empresa', tipoPersonalizado: '', nif: '',
  contacto: { email: '', telefono: '', direccion: '', ciudad: '', codigoPostal: '' },
  formaPago: 'transferencia', diasPago: 30, condicionesEspeciales: '', notas: '',
  descuentoActivo: false, descuentoTipo: 'porcentaje', descuentoValor: 0,
  descuentoFechaInicio: '', descuentoFechaFin: '',
};

// ============================================
// COMPONENTE
// ============================================

export default function CRM() {
  const { clientes, isLoading, addCliente, updateCliente, deleteCliente, fetchClientes } = useClientesStore();
  const { servicios } = useServiciosStore();
  const { facturas } = useFacturasStore();
  const { showToast } = useUIStore();

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('todos');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('todos');
  const [vistaMode, setVistaMode] = useState<'cards' | 'lista'>('cards');

  // Modales
  const [isNuevoClienteOpen, setIsNuevoClienteOpen] = useState(false);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const [isEditarOpen, setIsEditarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [nuevoCliente, setNuevoCliente] = useState<NuevoClienteForm>(initialClienteState);

  // Tabs
  const [detalleTab, setDetalleTab] = useState('info');
  const [serviciosTabFilter, setServiciosTabFilter] = useState('todos');
  const [serviciosSearch, setServiciosSearch] = useState('');

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  // ============================================
  // STATS
  // ============================================

  const stats = useMemo(() => {
    const estados = clientes.map(c => calcularEstadoCliente(c.id, servicios, facturas));
    return {
      total: clientes.length,
      activos: estados.filter(e => e === 'activo').length,
      potenciales: estados.filter(e => e === 'potencial').length,
      bloqueados: estados.filter(e => e === 'bloqueado').length,
      facturacion: clientes.reduce((sum, c) => sum + (c.totalFacturado || 0), 0),
    };
  }, [clientes, servicios, facturas]);

  // ============================================
  // FILTRADOS
  // ============================================

  const filtrados = useMemo(() => {
    return clientes.filter(c => {
      const sq = searchQuery.toLowerCase().trim();
      const ms = sq === '' ||
        c.nombre?.toLowerCase().includes(sq) ||
        c.nif?.toLowerCase().includes(sq) ||
        c.contacto?.email?.toLowerCase().includes(sq) ||
        c.contacto?.telefono?.toLowerCase().includes(sq);
      const estadoReal = calcularEstadoCliente(c.id, servicios, facturas);
      return ms &&
        (tipoFiltro === 'todos' || c.tipo === tipoFiltro) &&
        (estadoFiltro === 'todos' || estadoReal === estadoFiltro);
    });
  }, [clientes, searchQuery, tipoFiltro, estadoFiltro, servicios, facturas]);

  // ============================================
  // SERVICIOS DEL CLIENTE (ordenados por fecha)
  // ============================================

  const serviciosCliente = useMemo(() => {
    if (!clienteSeleccionado) return [];
    const sc = servicios.filter(s => idsEqual(s.clienteId, clienteSeleccionado.id));
    return ordenarServiciosPorFecha(sc);
  }, [servicios, clienteSeleccionado]);

  const serviciosFiltrados = useMemo(() => {
    let filtered = serviciosCliente;
    if (serviciosTabFilter === 'activos') {
      filtered = filtered.filter(s => ['solicitud','presupuesto','negociacion','confirmado','planificando','asignado','en_curso'].includes(s.estado));
    } else if (serviciosTabFilter === 'completados') {
      filtered = filtered.filter(s => ['completado','facturado'].includes(s.estado));
    } else if (serviciosTabFilter === 'cancelados') {
      filtered = filtered.filter(s => s.estado === 'cancelado');
    }
    // Buscar en servicios
    if (serviciosSearch.trim()) {
      const sq = serviciosSearch.toLowerCase();
      filtered = filtered.filter(s =>
        s.titulo?.toLowerCase().includes(sq) ||
        s.codigo?.toLowerCase().includes(sq) ||
        s.estado?.toLowerCase().includes(sq)
      );
    }
    return filtered;
  }, [serviciosCliente, serviciosTabFilter, serviciosSearch]);

  // ============================================
  // FACTURACION STATS
  // ============================================

  const facturacionStats = useMemo(() => {
    if (!serviciosCliente.length) return { total: 0, facturado: 0, pendiente: 0, porCobrar: 0 };
    const total = serviciosCliente.reduce((sum, s) => sum + (s.precio || 0), 0);
    const facturado = serviciosCliente.filter(s => s.facturado).reduce((sum, s) => sum + (s.precio || 0), 0);
    const pendiente = serviciosCliente.filter(s => s.estado === 'completado' && !s.facturado).reduce((sum, s) => sum + (s.precio || 0), 0);
    const porCobrar = serviciosCliente.filter(s => ['solicitud','presupuesto','negociacion','confirmado','planificando','asignado','en_curso'].includes(s.estado)).reduce((sum, s) => sum + (s.precio || 0), 0);
    return { total, facturado, pendiente, porCobrar };
  }, [serviciosCliente]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleNuevoCliente = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); e.stopPropagation();
    const nombreLimpio = nuevoCliente.nombre.trim();
    if (!nombreLimpio) { showToast('El nombre es obligatorio', 'error'); return; }

    // FIX: tipo Otro usa campo separado
    const tipoFinal = (nuevoCliente.tipo as string) === '__otro__'
      ? (nuevoCliente.tipoPersonalizado.trim() || 'otro')
      : nuevoCliente.tipo;

    if ((nuevoCliente.tipo as string) === '__otro__' && !nuevoCliente.tipoPersonalizado.trim()) {
      showToast('Escribe un tipo de cliente personalizado', 'error'); return;
    }

    // Estado automatico: nuevo cliente sin servicios = potencial
    const estadoAuto = 'potencial';

    // Construir condiciones especiales con descuento si aplica
    let condiciones = nuevoCliente.condicionesEspeciales.trim();
    if (nuevoCliente.descuentoActivo && nuevoCliente.descuentoValor > 0) {
      const descStr = `[DESCUENTO ${nuevoCliente.descuentoTipo === 'porcentaje' ? nuevoCliente.descuentoValor + '%' : nuevoCliente.descuentoValor + ' EUR'} - ${fmtDate(nuevoCliente.descuentoFechaInicio)} a ${fmtDate(nuevoCliente.descuentoFechaFin)}]`;
      condiciones = condiciones ? `${condiciones}\n${descStr}` : descStr;
    }

    setIsSubmitting(true);
    try {
      const success = await addCliente({
        nombre: nombreLimpio,
        tipo: tipoFinal as TipoCliente,
        estado: estadoAuto,
        nif: nuevoCliente.nif?.trim() || undefined,
        contacto: {
          email: nuevoCliente.contacto.email?.trim() || undefined,
          telefono: nuevoCliente.contacto.telefono?.trim() || undefined,
          direccion: nuevoCliente.contacto.direccion?.trim() || undefined,
          ciudad: nuevoCliente.contacto.ciudad?.trim() || undefined,
          codigoPostal: nuevoCliente.contacto.codigoPostal?.trim() || undefined,
        },
        formaPago: nuevoCliente.formaPago,
        diasPago: nuevoCliente.diasPago,
        condicionesEspeciales: condiciones || undefined,
        notas: nuevoCliente.notas?.trim() || undefined,
      });
      if (success) {
        setIsNuevoClienteOpen(false);
        setNuevoCliente(initialClienteState);
        showToast('Cliente creado correctamente', 'success');
        await fetchClientes();
      } else { throw new Error('Error al crear cliente'); }
    } catch (err: any) {
      let errorMsg = err.message || 'Error desconocido';
      // Detectar error de permisos
      if (errorMsg.includes('PERMISO_REQUERIDO')) {
        errorMsg = errorMsg.replace('PERMISO_REQUERIDO: ', '');
        showToast(`Sin permisos: ${errorMsg}. Contacta al administrador.`, 'error');
      } else {
        try { const parsed = JSON.parse(errorMsg); errorMsg = parsed.detail || errorMsg; } catch {}
        showToast(`Error: ${errorMsg}`, 'error');
      }
    } finally { setIsSubmitting(false); }
  }, [nuevoCliente, addCliente, fetchClientes, showToast]);

  const handleEditarCliente = async () => {
    if (!clienteSeleccionado) return;
    setIsSubmitting(true);
    try {
      const success = await updateCliente(String(clienteSeleccionado.id), {
        nombre: clienteSeleccionado.nombre?.trim(),
        tipo: clienteSeleccionado.tipo,
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

  // ============================================
  // RENDER: LOADING
  // ============================================

  if (isLoading && clientes.length === 0) {
    return <SkeletonPage type="mixed" tableCols={6} vistaMode={vistaMode} />;
  }

  // ============================================
  // RENDER: MAIN
  // ============================================

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">CRM - Clientes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Gestion de clientes y oportunidades</p>
        </div>
        <Button onClick={() => { setNuevoCliente(initialClienteState); setIsNuevoClienteOpen(true); }}
          className="bg-[#1e3a5f] hover:bg-[#152a45] shadow-sm dark:bg-blue-600 dark:hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Clientes', value: stats.total, icon: Users, color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' },
          { label: 'Activos', value: stats.activos, icon: CheckCircle2, color: 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400' },
          { label: 'Potenciales', value: stats.potenciales, icon: TrendingUp, color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' },
          { label: 'Facturacion Total', value: fmtCurrency(stats.facturacion), icon: Euro, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' },
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
              <SelectItem value="otro">Otro</SelectItem>
            </SelectContent>
          </Select>
          <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
            <SelectTrigger className="w-[140px] dark:bg-slate-900 dark:border-slate-700"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {Object.entries(estadoLabels).map(([k, l]) => (
                <SelectItem key={k} value={k}>{l}</SelectItem>
              ))}
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
          ) : filtrados.map(c => {
            const estadoReal = calcularEstadoCliente(c.id, servicios, facturas);
            return (
              <div key={c.id} onClick={() => { setClienteSeleccionado(c); setDetalleTab('info'); setServiciosTabFilter('todos'); setServiciosSearch(''); setIsDetalleOpen(true); }}
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
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={tipoColors[c.tipo] || tipoColors.otro}>{c.tipo}</Badge>
                    <Badge className={estadoColors[estadoReal] || ''}>{estadoLabels[estadoReal] || estadoReal}</Badge>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm text-slate-500 dark:text-slate-400 mb-3">
                  {c.contacto?.email && (
                    <a href={`mailto:${c.contacto.email}`} onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      <Mail className="h-3.5 w-3.5" />{c.contacto.email}
                    </a>
                  )}
                  {c.contacto?.telefono && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      <a href={`tel:${c.contacto.telefono}`} onClick={e => e.stopPropagation()}
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{c.contacto.telefono}</a>
                      <a href={`https://wa.me/${c.contacto.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-green-600 hover:text-green-700 dark:text-green-400 ml-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                  {c.contacto?.ciudad && <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{c.contacto.ciudad}</p>}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {c.totalServicios || 0} servicios
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={e => { e.stopPropagation(); setClienteSeleccionado(c); setDetalleTab('info'); setServiciosTabFilter('todos'); setServiciosSearch(''); setIsDetalleOpen(true); }}><Eye className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={e => { e.stopPropagation(); setClienteSeleccionado(c); setIsEditarOpen(true); }}><Edit3 className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={e => { e.stopPropagation(); handleEliminarCliente(String(c.id)); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Vista LISTA */
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Cliente</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Contacto</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Tipo</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Estado</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 text-right">Servicios</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtrados.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400 dark:text-slate-500"><Users className="h-10 w-10 mx-auto mb-2" />No hay clientes</td></tr>
                ) : filtrados.map(c => {
                  const estadoReal = calcularEstadoCliente(c.id, servicios, facturas);
                  return (
                    <tr key={c.id} onClick={() => { setClienteSeleccionado(c); setDetalleTab('info'); setServiciosTabFilter('todos'); setServiciosSearch(''); setIsDetalleOpen(true); }} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#1e3a5f] dark:bg-blue-600 flex items-center justify-center text-white font-bold text-xs">{c.nombre?.charAt(0).toUpperCase()}</div>
                          <div><p className="font-medium dark:text-slate-200">{c.nombre}</p><p className="text-xs text-slate-500">{c.nif}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {c.contacto?.email ? (
                          <a href={`mailto:${c.contacto.email}`} onClick={e => e.stopPropagation()} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{c.contacto.email}</a>
                        ) : c.contacto?.telefono ? (
                          <span>{c.contacto.telefono}</span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3"><Badge className={tipoColors[c.tipo] || tipoColors.otro}>{c.tipo}</Badge></td>
                      <td className="px-4 py-3"><Badge className={estadoColors[estadoReal] || ''}>{estadoLabels[estadoReal] || estadoReal}</Badge></td>
                      <td className="px-4 py-3 text-right dark:text-slate-300">{c.totalServicios || 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); setClienteSeleccionado(c); setDetalleTab('info'); setIsDetalleOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); setClienteSeleccionado(c); setIsEditarOpen(true); }}><Edit3 className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={e => { e.stopPropagation(); handleEliminarCliente(String(c.id)); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* DIALOG: NUEVO CLIENTE                        */}
      {/* ============================================ */}
      <Dialog open={isNuevoClienteOpen} onOpenChange={setIsNuevoClienteOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">Nuevo Cliente</DialogTitle>
            <DialogDescription className="dark:text-slate-400">El estado se asigna automaticamente segun la actividad del cliente</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleNuevoCliente} className="space-y-4 py-4">

            {/* Tipo y Nombre */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={nuevoCliente.tipo as string}
                  onValueChange={v => setNuevoCliente(p => ({ ...p, tipo: v as TipoCliente | '__otro__' }))}
                >
                  <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empresa">Empresa</SelectItem>
                    <SelectItem value="festival">Festival</SelectItem>
                    <SelectItem value="promotor">Promotor / Agencia</SelectItem>
                    <SelectItem value="colegio">Colegio / Instituto</SelectItem>
                    <SelectItem value="particular">Particular / Autonomo</SelectItem>
                    <SelectItem value="hotel">Hotel / Alojamiento</SelectItem>
                    <SelectItem value="__otro__">+ Otro tipo...</SelectItem>
                  </SelectContent>
                </Select>
                {/* FIX: Campo tipo personalizado con estado separado */}
                {(nuevoCliente.tipo as string) === '__otro__' && (
                  <div className="mt-2 p-3 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
                    <Label className="text-sm text-blue-700 dark:text-blue-300">Escribe el tipo de cliente</Label>
                    <Input
                      value={nuevoCliente.tipoPersonalizado}
                      onChange={e => setNuevoCliente(p => ({ ...p, tipoPersonalizado: e.target.value }))}
                      placeholder="Ej: Asociacion deportiva"
                      className="mt-1 dark:bg-slate-900 dark:border-slate-600"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Nombre / Razon Social *</Label>
                <Input
                  value={nuevoCliente.nombre}
                  onChange={e => setNuevoCliente(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Nombre del cliente o empresa"
                  required
                  className="dark:bg-slate-900 dark:border-slate-600"
                />
              </div>
            </div>

            {/* CIF / NIF */}
            <div className="space-y-2">
              <Label>{getDocumentoLabel((nuevoCliente.tipo as string) === '__otro__' ? 'otro' : nuevoCliente.tipo)}</Label>
              <div className="flex gap-2">
                <Input
                  value={nuevoCliente.nif}
                  onChange={e => setNuevoCliente(p => ({ ...p, nif: e.target.value }))}
                  placeholder="Ej: B12345678"
                  className="flex-1 dark:bg-slate-900 dark:border-slate-600"
                />
                <Button type="button" variant="outline" size="icon" title="Buscar en Registro Mercantil"
                  onClick={() => showToast('Integracion con Registro Mercantil - En desarrollo', 'info')}
                  className="flex-shrink-0">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Introduce el CIF para autocompletar datos desde el Registro Mercantil (pronto disponible)
              </p>
            </div>

            {/* Contacto */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Email</Label>
                <Input type="email" value={nuevoCliente.contacto.email}
                  onChange={e => updateContacto('email', e.target.value)}
                  placeholder="email@ejemplo.com"
                  className="dark:bg-slate-900 dark:border-slate-600" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Telefono</Label>
                <Input value={nuevoCliente.contacto.telefono}
                  onChange={e => updateContacto('telefono', e.target.value)}
                  placeholder="+34 600 000 000"
                  className="dark:bg-slate-900 dark:border-slate-600" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Ciudad</Label>
                <Input value={nuevoCliente.contacto.ciudad}
                  onChange={e => updateContacto('ciudad', e.target.value)}
                  placeholder="Ciudad"
                  className="dark:bg-slate-900 dark:border-slate-600" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Direccion</Label>
                <Input value={nuevoCliente.contacto.direccion} onChange={e => updateContacto('direccion', e.target.value)} placeholder="Calle, numero" className="dark:bg-slate-900 dark:border-slate-600" /></div>
              <div className="space-y-2"><Label>Codigo Postal</Label>
                <Input value={nuevoCliente.contacto.codigoPostal} onChange={e => updateContacto('codigoPostal', e.target.value)} placeholder="08001" className="dark:bg-slate-900 dark:border-slate-600" /></div>
            </div>

            {/* Forma de Pago y Condiciones */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" /> Forma de Pago Predeterminada</Label>
                <Select value={nuevoCliente.formaPago}
                  onValueChange={v => setNuevoCliente(p => ({ ...p, formaPago: v }))}>
                  <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transferencia">Transferencia bancaria</SelectItem>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta de credito/debito</SelectItem>
                    <SelectItem value="domiciliacion">Domiciliacion bancaria</SelectItem>
                    <SelectItem value="adelantado_completo">Pago completo por adelantado</SelectItem>
                    <SelectItem value="adelantado_50_50">50% al contratar + 50% antes del servicio</SelectItem>
                    <SelectItem value="despues_servicio">Despues del servicio (dias a pagar)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 dark:text-slate-400">Se usara automaticamente al crear servicios y facturas</p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Dias para pagar</Label>
                <Input type="number" min={0} max={180}
                  value={nuevoCliente.diasPago}
                  onChange={e => setNuevoCliente(p => ({ ...p, diasPago: parseInt(e.target.value) || 30 }))}
                  className="dark:bg-slate-900 dark:border-slate-600" />
                <p className="text-xs text-slate-500 dark:text-slate-400">Dias desde la factura hasta el vencimiento. Sirve para alertas.</p>
              </div>
            </div>

            {/* Sistema de Descuentos */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-slate-500" />
                <Label className="cursor-pointer flex items-center gap-2">
                  <Checkbox
                    checked={nuevoCliente.descuentoActivo}
                    onCheckedChange={v => setNuevoCliente(p => ({ ...p, descuentoActivo: v === true }))}
                  />
                  <span className="dark:text-slate-200">Activar descuento para este cliente</span>
                </Label>
              </div>
              {nuevoCliente.descuentoActivo && (
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo</Label>
                    <Select value={nuevoCliente.descuentoTipo}
                      onValueChange={v => setNuevoCliente(p => ({ ...p, descuentoTipo: v as 'porcentaje' | 'fijo' }))}>
                      <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="porcentaje">Porcentaje (%)</SelectItem>
                        <SelectItem value="fijo">Cantidad fija (EUR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Valor</Label>
                    <Input type="number" min={0} step={nuevoCliente.descuentoTipo === 'porcentaje' ? 1 : 0.5}
                      value={nuevoCliente.descuentoValor}
                      onChange={e => setNuevoCliente(p => ({ ...p, descuentoValor: parseFloat(e.target.value) || 0 }))}
                      className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Desde</Label>
                    <Input type="date"
                      value={nuevoCliente.descuentoFechaInicio}
                      onChange={e => setNuevoCliente(p => ({ ...p, descuentoFechaInicio: e.target.value }))}
                      className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Hasta</Label>
                    <Input type="date"
                      value={nuevoCliente.descuentoFechaFin}
                      onChange={e => setNuevoCliente(p => ({ ...p, descuentoFechaFin: e.target.value }))}
                      className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                </div>
              )}
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label>Notas internas</Label>
              <Textarea value={nuevoCliente.notas}
                onChange={e => setNuevoCliente(p => ({ ...p, notas: e.target.value }))}
                placeholder="Notas internas sobre el cliente"
                rows={2}
                className="dark:bg-slate-900 dark:border-slate-600" />
            </div>

            {/* Estado automatico (info readonly) */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Estado inicial: <strong>Potencial</strong>. Se actualizara automaticamente segun la actividad del cliente.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline"
                onClick={() => { setIsNuevoClienteOpen(false); setNuevoCliente(initialClienteState); }}
                className="dark:border-slate-600 dark:text-slate-300">Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}
                className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600">
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : 'Crear Cliente'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* DIALOG: DETALLE                              */}
      {/* ============================================ */}
      <Dialog open={isDetalleOpen} onOpenChange={setIsDetalleOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
          {clienteSeleccionado && (
            <>
              <DialogHeader>
                <DialogTitle className="dark:text-slate-100">{clienteSeleccionado.nombre}</DialogTitle>
                <DialogDescription className="dark:text-slate-400">{clienteSeleccionado.nif} · {clienteSeleccionado.tipo}</DialogDescription>
              </DialogHeader>

              {/* Estado automatico badge */}
              {(() => {
                const estadoReal = calcularEstadoCliente(clienteSeleccionado.id, servicios, facturas);
                return (
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={estadoColors[estadoReal] || ''}>{estadoLabels[estadoReal] || estadoReal}</Badge>
                    <span className="text-xs text-slate-500 dark:text-slate-400">(calculado automaticamente)</span>
                  </div>
                );
              })()}

              <Tabs value={detalleTab} onValueChange={setDetalleTab}>
                <TabsList className="dark:bg-slate-900">
                  <TabsTrigger value="info">Informacion</TabsTrigger>
                  <TabsTrigger value="servicios">Servicios ({serviciosCliente.length})</TabsTrigger>
                  <TabsTrigger value="facturacion">Facturacion</TabsTrigger>
                </TabsList>

                {/* Tab Info */}
                <TabsContent value="info" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                      <h4 className="font-medium text-sm dark:text-slate-300">Contacto</h4>
                      {clienteSeleccionado.contacto?.email && (
                        <a href={`mailto:${clienteSeleccionado.contacto.email}`}
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                          <Mail className="h-4 w-4" />{clienteSeleccionado.contacto.email}
                        </a>
                      )}
                      {clienteSeleccionado.contacto?.telefono && (
                        <div className="flex items-center gap-2 text-sm">
                          <a href={`tel:${clienteSeleccionado.contacto.telefono}`}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                            <Phone className="h-4 w-4" />{clienteSeleccionado.contacto.telefono}
                          </a>
                          <span className="text-slate-300">|</span>
                          <a href={`https://wa.me/${clienteSeleccionado.contacto.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-green-600 hover:text-green-700 dark:text-green-400">
                            <MessageSquare className="h-3.5 w-3.5" />WhatsApp
                          </a>
                        </div>
                      )}
                      {clienteSeleccionado.contacto?.direccion && (
                        <p className="flex items-center gap-2 text-sm dark:text-slate-400">
                          <MapPin className="h-4 w-4" />{`${clienteSeleccionado.contacto.direccion}${clienteSeleccionado.contacto.ciudad ? `, ${clienteSeleccionado.contacto.ciudad}` : ''}`}
                        </p>
                      )}
                    </div>
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                      <h4 className="font-medium text-sm dark:text-slate-300">Datos Comerciales</h4>
                      <p className="text-sm dark:text-slate-400">Forma de pago: <span className="font-medium dark:text-slate-200">{clienteSeleccionado.formaPago ? (formaPagoLabels[clienteSeleccionado.formaPago] || clienteSeleccionado.formaPago) : '-'}</span></p>
                      <p className="text-sm dark:text-slate-400">Dias de pago: <span className="font-medium dark:text-slate-200">{clienteSeleccionado.diasPago || 30} dias</span></p>
                      <p className="text-sm dark:text-slate-400">Servicios totales: <span className="font-medium dark:text-slate-200">{clienteSeleccionado.totalServicios || 0}</span></p>
                    </div>
                  </div>
                  {clienteSeleccionado.condicionesEspeciales && (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                      <h4 className="font-medium text-sm mb-1 dark:text-slate-300">Condiciones Especiales / Descuentos</h4>
                      <p className="text-sm dark:text-slate-400 whitespace-pre-line">{clienteSeleccionado.condicionesEspeciales}</p>
                    </div>
                  )}
                  {clienteSeleccionado.notas && (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                      <h4 className="font-medium text-sm mb-1 dark:text-slate-300">Notas</h4>
                      <p className="text-sm dark:text-slate-400">{clienteSeleccionado.notas}</p>
                    </div>
                  )}
                </TabsContent>

                {/* Tab Servicios - ORDENADOS POR FECHA + BUSCADOR */}
                <TabsContent value="servicios" className="pt-4 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex gap-2">
                      {[{v:'todos',l:'Todos'},{v:'activos',l:'Activos'},{v:'completados',l:'Completados'},{v:'cancelados',l:'Cancelados'}].map(t => (
                        <Button key={t.v} size="sm" variant={serviciosTabFilter === t.v ? 'default' : 'outline'}
                          onClick={() => setServiciosTabFilter(t.v)}
                          className={serviciosTabFilter === t.v ? 'bg-[#1e3a5f] dark:bg-blue-600' : 'dark:border-slate-600 dark:text-slate-300'}>{t.l}</Button>
                      ))}
                    </div>
                    <div className="relative flex-1 sm:max-w-[250px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input placeholder="Buscar servicio..." value={serviciosSearch}
                        onChange={e => setServiciosSearch(e.target.value)}
                        className="pl-9 h-8 text-sm dark:bg-slate-900 dark:border-slate-700" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {serviciosFiltrados.length} servicio{serviciosFiltrados.length !== 1 ? 's' : ''}
                    {serviciosSearch.trim() ? ` (filtrados de ${serviciosCliente.length})` : ''} · Ordenados por fecha (mas recientes primero)
                  </p>
                  <ScrollArea className="h-80">
                    {serviciosFiltrados.length === 0 ? (
                      <div className="flex flex-col items-center py-10 text-slate-400 dark:text-slate-500"><Briefcase className="h-10 w-10 mb-2" /><p className="text-sm">Sin servicios</p></div>
                    ) : (
                      <div className="space-y-2">
                        {serviciosFiltrados.map(s => {
                          const fecha = parseDateSafe(s.fechaInicio);
                          const esFuturo = fecha ? isAfter(fecha, new Date()) : false;
                          return (
                            <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm dark:text-slate-200 truncate">{s.codigo} · {s.titulo}</p>
                                  {esFuturo && <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[10px]">Proximo</Badge>}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  <span>{s.estado}</span>
                                  <span>·</span>
                                  <span>{fmtDate(s.fechaInicio)}</span>
                                  <span>·</span>
                                  <span>{(s.precio || 0).toLocaleString()} EUR</span>
                                </div>
                              </div>
                              <Button size="sm" variant="outline" asChild className="dark:border-slate-600 flex-shrink-0 ml-2">
                                <Link to={`/servicios?id=${s.id}`}>Ver</Link>
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                {/* Tab Facturacion */}
                <TabsContent value="facturacion" className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[{l:'Total',v:facturacionStats.total},{l:'Facturado',v:facturacionStats.facturado},{l:'Pendiente',v:facturacionStats.pendiente},{l:'Por cobrar',v:facturacionStats.porCobrar}].map(s => (
                      <div key={s.l} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3"><p className="text-xs text-slate-500 dark:text-slate-400">{s.l}</p><p className="text-lg font-bold dark:text-slate-100">{s.v.toLocaleString()} EUR</p></div>
                    ))}
                  </div>
                  {/* Lista de facturas del cliente */}
                  {(() => {
                    const facturasCliente = facturas.filter(f => idsEqual(f.clienteId, clienteSeleccionado.id));
                    return facturasCliente.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm dark:text-slate-300">Facturas</h4>
                        {facturasCliente.map(f => (
                          <div key={f.id} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                            <div>
                              <p className="text-sm font-medium dark:text-slate-200">{f.numero}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{fmtDate(f.fechaEmision)} · {formaPagoLabels[f.metodoPago || ''] || f.metodoPago || 'Transferencia'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium dark:text-slate-200">{fmtCurrency(f.total)}</p>
                              <Badge className={f.estado === 'pagada' ? 'bg-green-100 text-green-700' : f.estado === 'vencida' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                                {f.estado}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">Sin facturas registradas</p>
                    );
                  })()}
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <Button variant="outline" onClick={() => { setIsDetalleOpen(false); setIsEditarOpen(true); }} className="dark:border-slate-600 dark:text-slate-300">Editar</Button>
                <Button variant="destructive" onClick={() => handleEliminarCliente(String(clienteSeleccionado.id))}>Eliminar</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* DIALOG: EDITAR                               */}
      {/* ============================================ */}
      <Dialog open={isEditarOpen} onOpenChange={setIsEditarOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader><DialogTitle className="dark:text-slate-100">Editar Cliente</DialogTitle></DialogHeader>
          {clienteSeleccionado && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Nombre *</Label>
                  <Input value={clienteSeleccionado.nombre} onChange={e => setClienteSeleccionado({...clienteSeleccionado, nombre: e.target.value})} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                <div className="space-y-2"><Label>Tipo</Label>
                  <Select value={clienteSeleccionado.tipo} onValueChange={v => setClienteSeleccionado({...clienteSeleccionado, tipo: v as TipoCliente})}>
                    <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empresa">Empresa</SelectItem><SelectItem value="festival">Festival</SelectItem>
                      <SelectItem value="promotor">Promotor / Agencia</SelectItem><SelectItem value="colegio">Colegio</SelectItem>
                      <SelectItem value="particular">Particular / Autonomo</SelectItem><SelectItem value="hotel">Hotel</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>{getDocumentoLabel(clienteSeleccionado.tipo)}</Label>
                <Input value={clienteSeleccionado.nif || ''} onChange={e => setClienteSeleccionado({...clienteSeleccionado, nif: e.target.value})} className="dark:bg-slate-900 dark:border-slate-600" /></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Email</Label>
                  <Input value={clienteSeleccionado.contacto?.email || ''} onChange={e => updateClienteContacto('email', e.target.value)} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                <div className="space-y-2"><Label>Telefono</Label>
                  <Input value={clienteSeleccionado.contacto?.telefono || ''} onChange={e => updateClienteContacto('telefono', e.target.value)} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                <div className="space-y-2"><Label>Ciudad</Label>
                  <Input value={clienteSeleccionado.contacto?.ciudad || ''} onChange={e => updateClienteContacto('ciudad', e.target.value)} className="dark:bg-slate-900 dark:border-slate-600" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Direccion</Label>
                  <Input value={clienteSeleccionado.contacto?.direccion || ''} onChange={e => updateClienteContacto('direccion', e.target.value)} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                <div className="space-y-2"><Label>Codigo Postal</Label>
                  <Input value={clienteSeleccionado.contacto?.codigoPostal || ''} onChange={e => updateClienteContacto('codigoPostal', e.target.value)} className="dark:bg-slate-900 dark:border-slate-600" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" /> Forma de Pago</Label>
                  <Select value={clienteSeleccionado.formaPago}
                    onValueChange={v => setClienteSeleccionado({...clienteSeleccionado, formaPago: v})}>
                    <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transferencia">Transferencia bancaria</SelectItem>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="domiciliacion">Domiciliacion</SelectItem>
                      <SelectItem value="adelantado_completo">Pago completo por adelantado</SelectItem>
                      <SelectItem value="adelantado_50_50">50% al contratar + 50% antes del servicio</SelectItem>
                      <SelectItem value="despues_servicio">Despues del servicio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Dias de Pago</Label>
                  <Input type="number" value={clienteSeleccionado.diasPago || 30} onChange={e => setClienteSeleccionado({...clienteSeleccionado, diasPago: parseInt(e.target.value) || 30})} className="dark:bg-slate-900 dark:border-slate-600" /></div>
              </div>
              <div className="space-y-2"><Label>Condiciones Especiales / Descuentos</Label>
                <Textarea value={clienteSeleccionado.condicionesEspeciales || ''}
                  onChange={e => setClienteSeleccionado({...clienteSeleccionado, condicionesEspeciales: e.target.value})}
                  rows={3} placeholder="Condiciones especiales, descuentos activos..."
                  className="dark:bg-slate-900 dark:border-slate-600" /></div>
              <div className="space-y-2"><Label>Notas</Label>
                <Textarea value={clienteSeleccionado.notas || ''}
                  onChange={e => setClienteSeleccionado({...clienteSeleccionado, notas: e.target.value})}
                  rows={2} className="dark:bg-slate-900 dark:border-slate-600" /></div>
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
