// ============================================
// MILANO - CRM / Clientes Page (FUNCIONAL - BOTONES DIRECTOS)
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useClientesStore, useServiciosStore, useUIStore } from '../store';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
  DialogTrigger,
  DialogFooter,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Progress } from '../components/ui/progress';
import { Switch } from '../components/ui/switch';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Filter,
  Loader2,
  Briefcase,
  Euro,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CheckCircle,
  X,
  ArrowRight,
} from 'lucide-react';
import type { Cliente, TipoCliente } from '../types';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const tipoClienteLabels: Record<string, string> = {
  festival: 'Festival',
  promotor: 'Promotor',
  colegio: 'Colegio',
  empresa: 'Empresa',
  particular: 'Particular',
};

const tipoClienteColors: Record<string, string> = {
  festival: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 dark:text-purple-300',
  promotor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 dark:text-blue-300',
  colegio: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 dark:text-green-300',
  empresa: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 dark:text-amber-300',
  particular: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 dark:text-slate-300',
};

// Labels para estados de servicio
const estadoServicioLabels: Record<string, { label: string; color: string }> = {
  solicitud: { label: 'Solicitud', color: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 dark:text-slate-300' },
  presupuesto: { label: 'Presupuesto', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 dark:text-blue-300' },
  negociacion: { label: 'Negociación', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 dark:text-amber-300' },
  confirmado: { label: 'Confirmado', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 dark:text-green-300' },
  planificando: { label: 'Planificando', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 dark:text-purple-300' },
  asignado: { label: 'Asignado', color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300' },
  en_curso: { label: 'En Curso', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
  completado: { label: 'Completado', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
  facturado: { label: 'Facturado', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 dark:text-green-300' },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
};

const getDocumentoLabel = (tipo: string): string => {
  switch (tipo) {
    case 'particular':
      return 'DNI';
    case 'empresa':
    case 'festival':
    case 'promotor':
    case 'colegio':
      return 'CIF';
    default:
      return 'NIF';
  }
};

// Helper para fechas seguras
const formatDateSafe = (date: string | Date | undefined): string => {
  if (!date) return '-';
  try {
    const parsed = typeof date === 'string' ? parseISO(date) : date;
    return isValid(parsed) ? format(parsed, 'dd/MM/yyyy') : '-';
  } catch {
    return '-';
  }
};

// FIX CRÍTICO: Helper para comparar IDs (maneja string y number)
const idsEqual = (id1: string | number | undefined, id2: string | number | undefined): boolean => {
  if (id1 === undefined || id2 === undefined) return false;
  return String(id1) === String(id2);
};

type NuevoClienteForm = {
  tipo: TipoCliente;
  nombre: string;
  estado: 'activo' | 'inactivo';
  nif: string;
  formaPago: string;
  diasPago: number;
  condicionesEspeciales: string;
  notas: string;
  contacto: {
    email: string;
    telefono: string;
    direccion: string;
    ciudad: string;
    codigoPostal: string;
  };
};

export default function CRM() {
  const { clientes, isLoading, addCliente, updateCliente, deleteCliente, fetchClientes } = useClientesStore();
  const { servicios, fetchServicios } = useServiciosStore();
  const { showToast } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<TipoCliente | 'todos'>('todos');
  const [estadoFiltro, setEstadoFiltro] = useState<'activo' | 'inactivo' | 'todos'>('todos');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [isNuevoClienteOpen, setIsNuevoClienteOpen] = useState(false);
  const [isEditarOpen, setIsEditarOpen] = useState(false);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const [detalleTab, setDetalleTab] = useState('info');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviciosTabFilter, setServiciosTabFilter] = useState<'todos' | 'activos' | 'completados' | 'cancelados'>('todos');

  const initialClienteState: NuevoClienteForm = {
    tipo: 'empresa',
    nombre: '',
    estado: 'activo',
    nif: '',
    formaPago: 'transferencia',
    diasPago: 30,
    condicionesEspeciales: '',
    notas: '',
    contacto: {
      email: '',
      telefono: '',
      direccion: '',
      ciudad: '',
      codigoPostal: ''
    }
  };

  const [nuevoCliente, setNuevoCliente] = useState<NuevoClienteForm>(initialClienteState);

  useEffect(() => {
    fetchClientes();
    fetchServicios();
  }, [fetchClientes, fetchServicios]);

  // Filtrar clientes con useMemo
  const clientesFiltrados = useMemo(() => {
    return clientes.filter(cliente => {
      const searchLower = searchQuery.toLowerCase().trim();
      const matchesSearch = searchLower === '' ||
        cliente.nombre?.toLowerCase().includes(searchLower) ||
        cliente.codigo?.toLowerCase().includes(searchLower) ||
        cliente.nif?.toLowerCase().includes(searchLower) ||
        cliente.contacto?.email?.toLowerCase().includes(searchLower) ||
        cliente.contacto?.telefono?.toLowerCase().includes(searchLower);
      const matchesTipo = tipoFiltro === 'todos' || cliente.tipo === tipoFiltro;
      const matchesEstado = estadoFiltro === 'todos' || cliente.estado === estadoFiltro;
      return matchesSearch && matchesTipo && matchesEstado;
    });
  }, [clientes, searchQuery, tipoFiltro, estadoFiltro]);

  // Estadísticas con useMemo
  const stats = useMemo(() => ({
    total: clientes.length,
    activos: clientes.filter(c => c.estado === 'activo').length,
    inactivos: clientes.filter(c => c.estado === 'inactivo').length,
    porTipo: {
      empresa: clientes.filter(c => c.tipo === 'empresa').length,
      particular: clientes.filter(c => c.tipo === 'particular').length,
      festival: clientes.filter(c => c.tipo === 'festival').length,
      promotor: clientes.filter(c => c.tipo === 'promotor').length,
      colegio: clientes.filter(c => c.tipo === 'colegio').length,
    }
  }), [clientes]);

  // FIX CRÍTICO: Servicios del cliente seleccionado - usando comparación segura de IDs
  const serviciosCliente = useMemo(() => {
    if (!clienteSeleccionado) return [];
    
    // DEBUG: Ver qué está pasando
    console.log('🔍 DEBUG - Cliente seleccionado:', {
      id: clienteSeleccionado.id,
      tipo: typeof clienteSeleccionado.id,
      nombre: clienteSeleccionado.nombre
    });
    console.log('🔍 DEBUG - Todos los servicios:', servicios.map(s => ({
      id: s.id,
      clienteId: s.clienteId,
      tipoClienteId: typeof s.clienteId,
      titulo: s.titulo
    })));
    
    const filtrados = servicios.filter(s => idsEqual(s.clienteId, clienteSeleccionado.id));
    console.log('🔍 DEBUG - Servicios filtrados:', filtrados);
    
    return filtrados;
  }, [servicios, clienteSeleccionado]);

  // Servicios filtrados por tab
  const serviciosFiltrados = useMemo(() => {
    if (serviciosTabFilter === 'todos') return serviciosCliente;
    if (serviciosTabFilter === 'activos') {
      return serviciosCliente.filter(s => 
        ['solicitud', 'presupuesto', 'negociacion', 'confirmado', 'planificando', 'asignado', 'en_curso'].includes(s.estado)
      );
    }
    if (serviciosTabFilter === 'completados') {
      return serviciosCliente.filter(s => 
        ['completado', 'facturado'].includes(s.estado)
      );
    }
    if (serviciosTabFilter === 'cancelados') {
      return serviciosCliente.filter(s => s.estado === 'cancelado');
    }
    return serviciosCliente;
  }, [serviciosCliente, serviciosTabFilter]);

  // Estadísticas de facturación
  const facturacionStats = useMemo(() => {
    if (!serviciosCliente.length) return { total: 0, facturado: 0, pendiente: 0, porCobrar: 0 };
    
    const total = serviciosCliente.reduce((sum, s) => sum + (s.precio || 0), 0);
    const facturado = serviciosCliente
      .filter(s => s.facturado)
      .reduce((sum, s) => sum + (s.precio || 0), 0);
    const completadosNoFacturados = serviciosCliente
      .filter(s => s.estado === 'completado' && !s.facturado)
      .reduce((sum, s) => sum + (s.precio || 0), 0);
    const enCurso = serviciosCliente
      .filter(s => ['solicitud', 'presupuesto', 'negociacion', 'confirmado', 'planificando', 'asignado', 'en_curso'].includes(s.estado))
      .reduce((sum, s) => sum + (s.precio || 0), 0);
    
    return { total, facturado, pendiente: completadosNoFacturados, porCobrar: enCurso };
  }, [serviciosCliente]);

  const handleNuevoCliente = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const nombreLimpio = nuevoCliente.nombre.trim();
    if (!nombreLimpio) {
      showToast('El nombre es obligatorio', 'error');
      return;
    }

    // FIX: Validate tipo is not __otro__ (must enter custom type)
    const tipoFinal = nuevoCliente.tipo === '__otro__' ? 'otro' : nuevoCliente.tipo;
    if (nuevoCliente.tipo === '__otro__' && (!tipoFinal || tipoFinal === '__otro__')) {
      showToast('Debes escribir un tipo de cliente personalizado', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // FIX: Normalize tipo before sending
      const clienteParaEnviar = {
        ...nuevoCliente,
        tipo: tipoFinal,
      };
      // Use addCliente from store (handles API + localStorage fallback)
      const success = await addCliente(clienteParaEnviar);

      if (success) {
        setIsNuevoClienteOpen(false);
        setNuevoCliente(initialClienteState);
        showToast('Cliente creado correctamente', 'success');
        await fetchClientes();
      } else {
        showToast('Error al crear cliente', 'error');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Error desconocido'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [nuevoCliente, addCliente, fetchClientes, showToast, initialClienteState]);

  // FIX: Editar cliente con todos los campos
  const handleEditarCliente = async () => {
    if (!clienteSeleccionado) return;

    setIsSubmitting(true);

    try {
      const clienteData: Partial<Cliente> = {
        nombre: clienteSeleccionado.nombre?.trim(),
        tipo: clienteSeleccionado.tipo,
        estado: clienteSeleccionado.estado,
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
      };

      const success = await updateCliente(String(clienteSeleccionado.id), clienteData);
      if (success) {
        setIsEditarOpen(false);
        showToast('Cliente actualizado correctamente', 'success');
        await fetchClientes();
        // Actualizar el cliente seleccionado con los nuevos datos
        const clienteActualizado = clientes.find(c => idsEqual(c.id, clienteSeleccionado.id));
        if (clienteActualizado) {
          setClienteSeleccionado(clienteActualizado);
        }
      } else {
        showToast('Error al actualizar el cliente', 'error');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Desconocido'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEliminarCliente = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar este cliente?')) return;

    try {
      const success = await deleteCliente(id);
      if (success) {
        showToast('Cliente eliminado', 'success');
        if (clienteSeleccionado && idsEqual(clienteSeleccionado.id, id)) {
          setIsDetalleOpen(false);
          setIsEditarOpen(false);
          setClienteSeleccionado(null);
        }
        await fetchClientes();
      } else {
        showToast('Error al eliminar el cliente', 'error');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Desconocido'}`, 'error');
    }
  };

  const verDetalle = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setDetalleTab('info');
    setServiciosTabFilter('todos');
    setIsDetalleOpen(true);
  };

  const abrirEditar = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setIsEditarOpen(true);
  };

  const handleCloseNuevo = () => {
    setIsNuevoClienteOpen(false);
    setNuevoCliente(initialClienteState);
  };

  const updateContacto = (field: keyof NuevoClienteForm['contacto'], value: string) => {
    setNuevoCliente(prev => ({
      ...prev,
      contacto: { ...prev.contacto, [field]: value }
    }));
  };

  // Helper para actualizar contacto en edición
  const updateClienteContacto = (field: keyof Cliente['contacto'], value: string) => {
    if (!clienteSeleccionado) return;
    setClienteSeleccionado({
      ...clienteSeleccionado,
      contacto: { ...clienteSeleccionado.contacto, [field]: value }
    });
  };

  if (isLoading && clientes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-12 w-12 animate-spin text-[#1e3a5f] dark:text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">CRM - Clientes</h2>
          <p className="text-slate-500 text-sm">Gestión de clientes y oportunidades</p>
        </div>
        <Dialog open={isNuevoClienteOpen} onOpenChange={setIsNuevoClienteOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1e3a5f] hover:bg-[#152a45] text-white shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle>Nuevo Cliente</DialogTitle>
              <DialogDescription>
                Complete la información del nuevo cliente
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleNuevoCliente} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Select
                    value={nuevoCliente.tipo}
                    onValueChange={(v) => setNuevoCliente({...nuevoCliente, tipo: v as TipoCliente})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empresa">Empresa</SelectItem>
                      <SelectItem value="festival">Festival</SelectItem>
                      <SelectItem value="promotor">Promotor</SelectItem>
                      <SelectItem value="colegio">Colegio</SelectItem>
                      <SelectItem value="particular">Particular / Autónomo</SelectItem>
                      <SelectItem value="__otro__">+ Otro (especificar)...</SelectItem>
                    </SelectContent>
                  </Select>
                  {(nuevoCliente.tipo as string) === '__otro__' && (
                    <Input
                      placeholder="Escribe el tipo de cliente"
                      className="mt-2 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                      onChange={(e) => setNuevoCliente({...nuevoCliente, tipo: e.target.value || 'otro'})}
                      autoFocus
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre / Razón Social *</Label>
                  <Input
                    id="nombre"
                    value={nuevoCliente.nombre}
                    onChange={(e) => setNuevoCliente({...nuevoCliente, nombre: e.target.value})}
                    placeholder="Nombre del cliente"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nif">{getDocumentoLabel(nuevoCliente.tipo)}</Label>
                <div className="flex gap-2">
                  <Input
                    id="nif"
                    value={nuevoCliente.nif}
                    onChange={(e) => setNuevoCliente({...nuevoCliente, nif: e.target.value})}
                    placeholder={`Número de ${getDocumentoLabel(nuevoCliente.tipo)}`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Buscar datos por CIF/NIF (proximamente)"
                    disabled
                    className="flex-shrink-0 opacity-60 cursor-not-allowed"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Autocompletar por CIF - Disponible proximamente
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={nuevoCliente.contacto.email}
                    onChange={(e) => updateContacto('email', e.target.value)}
                    placeholder="email@ejemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={nuevoCliente.contacto.telefono}
                    onChange={(e) => updateContacto('telefono', e.target.value)}
                    placeholder="+34 600 000 000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={nuevoCliente.contacto.direccion}
                  onChange={(e) => updateContacto('direccion', e.target.value)}
                  placeholder="Calle, número"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ciudad">Ciudad</Label>
                  <Input
                    id="ciudad"
                    value={nuevoCliente.contacto.ciudad}
                    onChange={(e) => updateContacto('ciudad', e.target.value)}
                    placeholder="Ciudad"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigoPostal">Código Postal</Label>
                  <Input
                    id="codigoPostal"
                    value={nuevoCliente.contacto.codigoPostal}
                    onChange={(e) => updateContacto('codigoPostal', e.target.value)}
                    placeholder="28001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="formaPago">Forma de Pago</Label>
                  <Select
                    value={nuevoCliente.formaPago}
                    onValueChange={(v) => setNuevoCliente({...nuevoCliente, formaPago: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="domiciliacion">Domiciliación</SelectItem>
                      <SelectItem value="adelantado_completo">Pago completo por adelantado</SelectItem>
                      <SelectItem value="adelantado_50_50">50% reserva + 50% antes del servicio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diasPago">Días de Pago</Label>
                  <Input
                    id="diasPago"
                    type="number"
                    value={nuevoCliente.diasPago}
                    onChange={(e) => setNuevoCliente({...nuevoCliente, diasPago: parseInt(e.target.value) || 30})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="condicionesEspeciales">Condiciones Especiales</Label>
                <Textarea
                  id="condicionesEspeciales"
                  value={nuevoCliente.condicionesEspeciales}
                  onChange={(e) => setNuevoCliente({...nuevoCliente, condicionesEspeciales: e.target.value})}
                  placeholder="Condiciones especiales de pago, descuentos, etc."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  value={nuevoCliente.notas}
                  onChange={(e) => setNuevoCliente({...nuevoCliente, notas: e.target.value})}
                  placeholder="Notas adicionales sobre el cliente"
                  rows={2}
                />
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseNuevo}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#1e3a5f] hover:bg-[#152a45] text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Guardando...
                    </>
                  ) : (
                    'Crear Cliente'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Clientes</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Activos</p>
                <p className="text-3xl font-bold">{stats.activos}</p>
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
                <p className="text-sm font-medium text-slate-500">Inactivos</p>
                <p className="text-3xl font-bold">{stats.inactivos}</p>
              </div>
              <div className="rounded-full bg-red-100 p-3">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Empresas</p>
                <p className="text-3xl font-bold">{stats.porTipo.empresa}</p>
              </div>
              <div className="rounded-full bg-amber-100 p-3">
                <Briefcase className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Particulares</p>
                <p className="text-3xl font-bold">{stats.porTipo.particular}</p>
              </div>
              <div className="rounded-full bg-slate-100 p-3">
                <Users className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar clientes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v as TipoCliente | 'todos')}>
          <SelectTrigger className="w-40">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="festival">Festival</SelectItem>
            <SelectItem value="promotor">Promotor</SelectItem>
            <SelectItem value="colegio">Colegio</SelectItem>
            <SelectItem value="empresa">Empresa</SelectItem>
            <SelectItem value="particular">Particular</SelectItem>
          </SelectContent>
        </Select>
        <Select value={estadoFiltro} onValueChange={(v) => setEstadoFiltro(v as 'activo' | 'inactivo' | 'todos')}>
          <SelectTrigger className="w-40">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="inactivo">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientesFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    {searchQuery || tipoFiltro !== 'todos' || estadoFiltro !== 'todos'
                      ? 'No se encontraron clientes con los filtros aplicados'
                      : 'No hay clientes registrados'}
                  </TableCell>
                </TableRow>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <TableRow 
                    key={cliente.id} 
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => verDetalle(cliente)}
                  >
                    <TableCell className="font-medium">{cliente.codigo}</TableCell>
                    <TableCell>{cliente.nombre}</TableCell>
                    <TableCell>
                      <Badge className={tipoClienteColors[cliente.tipo || 'empresa']}>
                        {tipoClienteLabels[cliente.tipo || 'empresa']}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" />
                          {cliente.contacto?.email || '-'}
                        </span>
                        <span className="flex items-center gap-1 text-sm text-slate-500">
                          <Phone className="h-3 w-3" />
                          {cliente.contacto?.telefono || '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={cliente.estado === 'activo' ? 'default' : 'secondary'}>
                        {cliente.estado === 'activo' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); verDetalle(cliente); }}
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); abrirEditar(cliente); }}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); handleEliminarCliente(String(cliente.id)); }}
                          title="Eliminar"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* DIALOGO DE DETALLE COMPLETO */}
      <Dialog open={isDetalleOpen} onOpenChange={setIsDetalleOpen}>
        <DialogContent className="max-w-5xl max-h-[94vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
          {clienteSeleccionado && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {clienteSeleccionado.nombre}
                  <Badge className={tipoClienteColors[clienteSeleccionado.tipo || 'empresa']}>
                    {tipoClienteLabels[clienteSeleccionado.tipo || 'empresa']}
                  </Badge>
                  <Badge variant={clienteSeleccionado.estado === 'activo' ? 'default' : 'secondary'}>
                    {clienteSeleccionado.estado === 'activo' ? 'Activo' : 'Inactivo'}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {clienteSeleccionado.codigo} • Cliente desde {formatDateSafe(clienteSeleccionado.fechaAlta)}
                </DialogDescription>
              </DialogHeader>

              <Tabs value={detalleTab} onValueChange={setDetalleTab} className="mt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="info">Información</TabsTrigger>
                  <TabsTrigger value="servicios">Servicios ({serviciosCliente.length})</TabsTrigger>
                  <TabsTrigger value="facturacion">Facturación</TabsTrigger>
                  <TabsTrigger value="historial">Historial</TabsTrigger>
                </TabsList>

                {/* TAB: INFORMACIÓN */}
                <TabsContent value="info" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Contacto
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <Label className="text-slate-500 text-xs">Email</Label>
                          <p>{clienteSeleccionado.contacto?.email || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-slate-500 text-xs">Teléfono</Label>
                          <p>{clienteSeleccionado.contacto?.telefono || '-'}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Dirección
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p>{clienteSeleccionado.contacto?.direccion || '-'}</p>
                        <p>{clienteSeleccionado.contacto?.codigoPostal} {clienteSeleccionado.contacto?.ciudad}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Documentación
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <Label className="text-slate-500 text-xs">{getDocumentoLabel(clienteSeleccionado.tipo || 'empresa')}</Label>
                          <p>{clienteSeleccionado.nif || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-slate-500 text-xs">Estado</Label>
                          <Badge variant={clienteSeleccionado.estado === 'activo' ? 'default' : 'secondary'}>
                            {clienteSeleccionado.estado === 'activo' ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Euro className="h-4 w-4" />
                          Condiciones Comerciales
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <Label className="text-slate-500 text-xs">Forma de Pago</Label>
                          <p className="capitalize">{clienteSeleccionado.formaPago || 'Transferencia'}</p>
                        </div>
                        <div>
                          <Label className="text-slate-500 text-xs">Días de Pago</Label>
                          <p>{clienteSeleccionado.diasPago || 30} días</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {clienteSeleccionado.condicionesEspeciales && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">Condiciones Especiales</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{clienteSeleccionado.condicionesEspeciales}</p>
                      </CardContent>
                    </Card>
                  )}

                  {clienteSeleccionado.notas && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">Notas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-slate-600">{clienteSeleccionado.notas}</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* TAB: SERVICIOS - MEJORADO */}
                <TabsContent value="servicios" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <Button 
                        variant={serviciosTabFilter === 'todos' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setServiciosTabFilter('todos')}
                      >
                        Todos ({serviciosCliente.length})
                      </Button>
                      <Button 
                        variant={serviciosTabFilter === 'activos' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setServiciosTabFilter('activos')}
                      >
                        Activos
                      </Button>
                      <Button 
                        variant={serviciosTabFilter === 'completados' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setServiciosTabFilter('completados')}
                      >
                        Completados
                      </Button>
                      <Button 
                        variant={serviciosTabFilter === 'cancelados' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setServiciosTabFilter('cancelados')}
                      >
                        Cancelados
                      </Button>
                    </div>
                    <Button asChild size="sm" className="bg-[#1e3a5f] hover:bg-[#152a45]">
                      <Link to={`/servicios/nuevo?cliente=${clienteSeleccionado.id}`}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Servicio
                      </Link>
                    </Button>
                  </div>

                  {serviciosFiltrados.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                      <Briefcase className="mx-auto mb-2 h-8 w-8" />
                      <p>No hay servicios {serviciosTabFilter !== 'todos' ? 'en esta categoría' : 'registrados'} para este cliente</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {serviciosFiltrados.map(servicio => (
                        <div key={servicio.id} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-700/30 dark:border-slate-600 border hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{servicio.titulo}</p>
                              <Badge className={estadoServicioLabels[servicio.estado]?.color || 'bg-slate-100'}>
                                {estadoServicioLabels[servicio.estado]?.label || servicio.estado}
                              </Badge>
                              {servicio.facturado && (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Facturado
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-500 mt-1">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {formatDateSafe(servicio.fechaInicio)}
                              {servicio.origen && (
                                <>
                                  {' • '}
                                  <MapPin className="h-3 w-3 inline mr-1" />
                                  {servicio.origen}
                                  {servicio.destino && (
                                    <>
                                      <ArrowRight className="h-3 w-3 inline mx-1" />
                                      {servicio.destino}
                                    </>
                                  )}
                                </>
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-lg">{(servicio.precio || 0).toLocaleString('es-ES')}€</p>
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/servicios/${servicio.id}`}>
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* TAB: FACTURACIÓN - FUNCIONAL */}
                <TabsContent value="facturacion" className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-slate-500">Total Servicios</p>
                        <p className="text-2xl font-bold">{facturacionStats.total.toLocaleString('es-ES')}€</p>
                        <p className="text-xs text-slate-400">{serviciosCliente.length} servicios</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-slate-500">Facturado</p>
                        <p className="text-2xl font-bold text-green-600">{facturacionStats.facturado.toLocaleString('es-ES')}€</p>
                        <p className="text-xs text-slate-400">
                          {serviciosCliente.filter(s => s.facturado).length} servicios
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-slate-500">Pendiente Facturar</p>
                        <p className="text-2xl font-bold text-amber-600">{facturacionStats.pendiente.toLocaleString('es-ES')}€</p>
                        <p className="text-xs text-slate-400">
                          {serviciosCliente.filter(s => s.estado === 'completado' && !s.facturado).length} servicios
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-slate-500">En Curso</p>
                        <p className="text-2xl font-bold text-blue-600">{facturacionStats.porCobrar.toLocaleString('es-ES')}€</p>
                        <p className="text-xs text-slate-400">Servicios activos</p>
                      </CardContent>
                    </Card>
                  </div>

                  {serviciosCliente.filter(s => s.estado === 'completado' && !s.facturado).length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                          Servicios Pendientes de Facturar
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {serviciosCliente
                            .filter(s => s.estado === 'completado' && !s.facturado)
                            .map(servicio => (
                              <div key={servicio.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
                                <div>
                                  <p className="font-medium">{servicio.titulo}</p>
                                  <p className="text-sm text-slate-500">
                                    {formatDateSafe(servicio.fechaInicio)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">{(servicio.precio || 0).toLocaleString('es-ES')}€</p>
                                  <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50">
                                    <FileText className="h-3 w-3 mr-1" />
                                    Facturar
                                  </Button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {serviciosCliente.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <FileText className="mx-auto mb-2 h-8 w-8" />
                      <p>No hay datos de facturación para este cliente</p>
                      <p className="text-sm">Los servicios completados aparecerán aquí para facturación</p>
                    </div>
                  )}
                </TabsContent>

                {/* TAB: HISTORIAL - CON SERVICIOS */}
                <TabsContent value="historial" className="space-y-4">
                  {serviciosCliente.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Clock className="mx-auto mb-2 h-8 w-8" />
                      <p>No hay historial para este cliente</p>
                      <p className="text-sm">Los servicios y cambios aparecerán aquí</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Timeline de servicios */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">Timeline de Servicios</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {[...serviciosCliente]
                              .sort((a, b) => new Date(b.fechaInicio || 0).getTime() - new Date(a.fechaInicio || 0).getTime())
                              .map((servicio, index) => (
                                <div key={servicio.id} className="flex gap-4">
                                  <div className="flex flex-col items-center">
                                    <div className={`w-3 h-3 rounded-full ${
                                      servicio.estado === 'completado' || servicio.estado === 'facturado' 
                                        ? 'bg-green-500' 
                                        : servicio.estado === 'cancelado' 
                                          ? 'bg-red-500' 
                                          : 'bg-blue-500'
                                    }`} />
                                    {index < serviciosCliente.length - 1 && (
                                      <div className="w-0.5 h-full bg-slate-200 mt-1" />
                                    )}
                                  </div>
                                  <div className="flex-1 pb-4">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium">{servicio.titulo}</p>
                                      <Badge className={estadoServicioLabels[servicio.estado]?.color || 'bg-slate-100'}>
                                        {estadoServicioLabels[servicio.estado]?.label || servicio.estado}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-slate-500">
                                      {formatDateSafe(servicio.fechaInicio)} • {(servicio.precio || 0).toLocaleString('es-ES')}€
                                    </p>
                                    {servicio.descripcion && (
                                      <p className="text-sm text-slate-600 mt-1">{servicio.descripcion}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Estadísticas del cliente */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">Resumen del Cliente</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <p className="text-2xl font-bold">{serviciosCliente.length}</p>
                              <p className="text-sm text-slate-500">Total Servicios</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-green-600">
                                {serviciosCliente.filter(s => s.estado === 'completado' || s.estado === 'facturado').length}
                              </p>
                              <p className="text-sm text-slate-500">Completados</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-amber-600">
                                {serviciosCliente.filter(s => 
                                  ['solicitud', 'presupuesto', 'negociacion', 'confirmado', 'planificando', 'asignado', 'en_curso'].includes(s.estado)
                                ).length}
                              </p>
                              <p className="text-sm text-slate-500">En Curso</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <DialogFooter className="gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsDetalleOpen(false)}>
                  Cerrar
                </Button>
                <Button
                  onClick={() => { setIsDetalleOpen(false); abrirEditar(clienteSeleccionado); }}
                  className="bg-[#1e3a5f] hover:bg-[#152a45]"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar Cliente
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG DE EDITAR - COMPLETO */}
      <Dialog open={isEditarOpen} onOpenChange={setIsEditarOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Modifique los datos del cliente {clienteSeleccionado?.codigo}
            </DialogDescription>
          </DialogHeader>
          {clienteSeleccionado && (
            <div className="space-y-4 py-4">
              {/* Estado */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <Label className="font-medium">Estado del Cliente</Label>
                  <p className="text-sm text-slate-500">
                    {clienteSeleccionado.estado === 'activo' ? 'Cliente activo' : 'Cliente inactivo'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Inactivo</span>
                  <Switch
                    checked={clienteSeleccionado.estado === 'activo'}
                    onCheckedChange={(checked) => 
                      setClienteSeleccionado({...clienteSeleccionado, estado: checked ? 'activo' : 'inactivo'})
                    }
                  />
                  <span className="text-sm text-slate-500">Activo</span>
                </div>
              </div>

              {/* Tipo y Nombre */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Cliente</Label>
                  <Select
                    value={clienteSeleccionado.tipo}
                    onValueChange={(v) => setClienteSeleccionado({...clienteSeleccionado, tipo: v as TipoCliente})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empresa">Empresa</SelectItem>
                      <SelectItem value="festival">Festival</SelectItem>
                      <SelectItem value="promotor">Promotor</SelectItem>
                      <SelectItem value="colegio">Colegio</SelectItem>
                      <SelectItem value="particular">Particular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nombre / Razón Social *</Label>
                  <Input
                    value={clienteSeleccionado.nombre}
                    onChange={(e) => setClienteSeleccionado({...clienteSeleccionado, nombre: e.target.value})}
                  />
                </div>
              </div>

              {/* NIF */}
              <div className="space-y-2">
                <Label>{getDocumentoLabel(clienteSeleccionado.tipo)}</Label>
                <Input
                  value={clienteSeleccionado.nif || ''}
                  onChange={(e) => setClienteSeleccionado({...clienteSeleccionado, nif: e.target.value})}
                  placeholder={`Número de ${getDocumentoLabel(clienteSeleccionado.tipo)}`}
                />
              </div>

              {/* Contacto */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={clienteSeleccionado.contacto?.email || ''}
                    onChange={(e) => updateClienteContacto('email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={clienteSeleccionado.contacto?.telefono || ''}
                    onChange={(e) => updateClienteContacto('telefono', e.target.value)}
                  />
                </div>
              </div>

              {/* Dirección */}
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input
                  value={clienteSeleccionado.contacto?.direccion || ''}
                  onChange={(e) => updateClienteContacto('direccion', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ciudad</Label>
                  <Input
                    value={clienteSeleccionado.contacto?.ciudad || ''}
                    onChange={(e) => updateClienteContacto('ciudad', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Código Postal</Label>
                  <Input
                    value={clienteSeleccionado.contacto?.codigoPostal || ''}
                    onChange={(e) => updateClienteContacto('codigoPostal', e.target.value)}
                  />
                </div>
              </div>

              {/* Condiciones de pago */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Forma de Pago</Label>
                  <Select
                    value={clienteSeleccionado.formaPago || 'transferencia'}
                    onValueChange={(v) => setClienteSeleccionado({...clienteSeleccionado, formaPago: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="domiciliacion">Domiciliación</SelectItem>
                      <SelectItem value="adelantado_completo">Pago completo por adelantado</SelectItem>
                      <SelectItem value="adelantado_50_50">50% reserva + 50% antes del servicio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Días de Pago</Label>
                  <Input
                    type="number"
                    value={clienteSeleccionado.diasPago || 30}
                    onChange={(e) => setClienteSeleccionado({...clienteSeleccionado, diasPago: parseInt(e.target.value) || 30})}
                  />
                </div>
              </div>

              {/* Condiciones especiales */}
              <div className="space-y-2">
                <Label>Condiciones Especiales</Label>
                <Textarea
                  value={clienteSeleccionado.condicionesEspeciales || ''}
                  onChange={(e) => setClienteSeleccionado({...clienteSeleccionado, condicionesEspeciales: e.target.value})}
                  placeholder="Condiciones especiales de pago, descuentos, etc."
                  rows={2}
                />
              </div>

              {/* Notas */}
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={clienteSeleccionado.notas || ''}
                  onChange={(e) => setClienteSeleccionado({...clienteSeleccionado, notas: e.target.value})}
                  placeholder="Notas adicionales sobre el cliente"
                  rows={2}
                />
              </div>

              <DialogFooter className="gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditarOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleEditarCliente}
                  disabled={isSubmitting}
                  className="bg-[#1e3a5f] hover:bg-[#152a45] text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Cambios'
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}