// ============================================
// MILANO - Conductores Page (FIX BOTONES DIRECTOS)
// ============================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useConductoresStore, useServiciosStore, useUIStore } from '../store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
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
  DialogFooter,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Checkbox } from '../components/ui/checkbox';
import {
  UserCircle,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  Calendar,
  Clock,
  Star,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Award,
  Loader2,
  Key,
  Shield,
  MapPin,
  Briefcase,
} from 'lucide-react';
import type { Conductor, EstadoConductor } from '../types';
import { format, parseISO, differenceInDays, isWithinInterval, addDays, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

const estadoConductorColors: Record<EstadoConductor, string> = {
  activo: 'bg-green-100 text-green-700',
  baja: 'bg-red-100 text-red-700',
  vacaciones: 'bg-blue-100 text-blue-700',
  descanso: 'bg-amber-100 text-amber-700',
  inactivo: 'bg-gray-100 text-gray-700',
  en_ruta: 'bg-purple-100 text-purple-700',
};

// Generar contraseña aleatoria segura
const generarPassword = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let pass = '';
  for (let i = 0; i < 10; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
};

// Helper seguro para convertir fecha
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

// Helper disponibilidad
const ensureDisponibilidad = (d: Partial<Conductor>['disponibilidad']): NonNullable<Conductor['disponibilidad']> => ({
  dias: d?.dias ?? [1, 2, 3, 4, 5],
  horaInicio: d?.horaInicio ?? '08:00',
  horaFin: d?.horaFin ?? '18:00',
  observaciones: d?.observaciones,
});

// Helper licencia
const ensureLicencia = (l: Partial<Conductor>['licencia']): NonNullable<Conductor['licencia']> => ({
  tipo: l?.tipo ?? 'D',
  numero: l?.numero ?? '',
  fechaExpedicion: l?.fechaExpedicion,
  fechaCaducidad: l?.fechaCaducidad ?? addDays(new Date(), 365).toISOString(),
  permisos: l?.permisos ?? [],
});

export default function Conductores() {
  const { conductores, isLoading, error, addConductor, updateConductor, deleteConductor, fetchConductores } = useConductoresStore();
  const { servicios } = useServiciosStore();
  const { showToast } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoConductor | 'todos'>('todos');
  const [conductorSeleccionado, setConductorSeleccionado] = useState<Conductor | null>(null);
  const [isNuevoConductorOpen, setIsNuevoConductorOpen] = useState(false);
  const [isEditarOpen, setIsEditarOpen] = useState(false);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [credencialesGeneradas, setCredencialesGeneradas] = useState<{usuario: string, password: string} | null>(null);

  const initialConductorState: Partial<Conductor> = {
    estado: 'activo',
    tarifaHora: 18,
    prioridad: 50,
    disponibilidad: ensureDisponibilidad({}),
    licencia: ensureLicencia({}),
    panelActivo: true,
  };

  const [nuevoConductor, setNuevoConductor] = useState<Partial<Conductor>>(initialConductorState);

  useEffect(() => {
    fetchConductores();
  }, [fetchConductores]);

  useEffect(() => {
    if (error) showToast(error, 'error');
  }, [error, showToast]);

  const conductoresFiltrados = useMemo(() => {
    return conductores.filter(conductor => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        conductor.nombre?.toLowerCase().includes(searchLower) ||
        conductor.apellidos?.toLowerCase().includes(searchLower) ||
        conductor.codigo?.toLowerCase().includes(searchLower) ||
        conductor.dni?.toLowerCase().includes(searchLower) ||
        conductor.email?.toLowerCase().includes(searchLower);
      const matchesEstado = estadoFiltro === 'todos' || conductor.estado === estadoFiltro;
      return matchesSearch && matchesEstado;
    });
  }, [conductores, searchQuery, estadoFiltro]);

  const stats = useMemo(() => ({
    activos: conductores.filter(c => c.estado === 'activo').length,
    vacaciones: conductores.filter(c => c.estado === 'vacaciones').length,
    enRuta: conductores.filter(c => c.estado === 'en_ruta').length,
    totalHorasMes: conductores.reduce((sum, c) => sum + (c.totalHorasMes || 0), 0),
    licenciasProximas: conductores.filter(c => {
      const fechaCaducidad = parseDateSafe(c.licencia?.fechaCaducidad);
      return fechaCaducidad && differenceInDays(fechaCaducidad, new Date()) <= 30;
    }).length,
  }), [conductores]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!nuevoConductor.nombre?.trim() || !nuevoConductor.apellidos?.trim() || !nuevoConductor.dni?.trim()) {
      showToast('Nombre, apellidos y DNI son obligatorios', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const usuario = nuevoConductor.email?.split('@')[0] || nuevoConductor.dni?.toLowerCase() || `cond_${Date.now().toString().slice(-4)}`;
      const password = generarPassword();

      const conductorData = {
        codigo: `COND-${Date.now().toString().slice(-5)}`,
        nombre: nuevoConductor.nombre.trim(),
        apellidos: nuevoConductor.apellidos.trim(),
        dni: nuevoConductor.dni.trim().toUpperCase(),
        telefono: nuevoConductor.telefono?.trim() || null,
        email: nuevoConductor.email?.trim() || null,
        estado: nuevoConductor.estado || 'activo',
        tarifa_hora: nuevoConductor.tarifaHora || 18,
        prioridad: nuevoConductor.prioridad || 50,
        disponibilidad: ensureDisponibilidad(nuevoConductor.disponibilidad),
        licencia: ensureLicencia(nuevoConductor.licencia),
        credenciales: { usuario, password_hash: password },
        panel_activo: true,
        total_horas_mes: 0,
        total_servicios_mes: 0,
        valoracion: 0,
        notas: nuevoConductor.notas?.trim() || null,
      };

      const success = await addConductor(conductorData as any);

      if (success) {
        setCredencialesGeneradas({ usuario, password });
        setNuevoConductor(initialConductorState);
        showToast('Conductor creado correctamente', 'success');
        await fetchConductores();
        setTimeout(() => setCredencialesGeneradas(null), 30000); // 30 segundos para ver la contraseña
      } else {
        showToast('Error al crear conductor', 'error');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Desconocido'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditarConductor = async () => {
    if (!conductorSeleccionado) return;
    setIsSubmitting(true);
    try {
      const success = await updateConductor(String(conductorSeleccionado.id), conductorSeleccionado);
      if (success) {
        setIsEditarOpen(false);
        showToast('Conductor actualizado', 'success');
        await fetchConductores();
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEliminarConductor = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('¿Eliminar este conductor?')) return;
    try {
      const success = await deleteConductor(id);
      if (success) {
        showToast('Conductor eliminado', 'success');
        if (conductorSeleccionado?.id === id) {
          setIsDetalleOpen(false);
          setConductorSeleccionado(null);
        }
        await fetchConductores();
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleCloseDialog = () => {
    setIsNuevoConductorOpen(false);
    setNuevoConductor(initialConductorState);
    setCredencialesGeneradas(null);
  };

  const verDetalle = (conductor: Conductor) => {
    setConductorSeleccionado(conductor);
    setIsDetalleOpen(true);
  };

  const abrirEditar = (conductor: Conductor, e: React.MouseEvent) => {
    e.stopPropagation();
    setConductorSeleccionado(conductor);
    setIsEditarOpen(true);
  };

  const toggleDia = (idx: number, checked: boolean | 'indeterminate') => {
    if (checked === 'indeterminate') return;
    const currentDisp = ensureDisponibilidad(nuevoConductor.disponibilidad);
    const currentDias = currentDisp.dias || [];
    const newDias = checked ? [...currentDias, idx] : currentDias.filter(d => d !== idx);
    setNuevoConductor({ ...nuevoConductor, disponibilidad: { ...currentDisp, dias: newDias } });
  };

  if (isLoading && conductores.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-12 w-12 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Conductores</h2>
          <p className="text-slate-500 text-sm">Gestión de personal y auto-asignación</p>
        </div>
        <Button onClick={() => setIsNuevoConductorOpen(true)} className="bg-[#1e3a5f] hover:bg-[#152a45]">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Conductor
        </Button>
      </div>

      {/* Dialog Nuevo */}
      <Dialog open={isNuevoConductorOpen} onOpenChange={setIsNuevoConductorOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Conductor</DialogTitle>
            <DialogDescription>Complete la información. Se generarán credenciales automáticamente.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input value={nuevoConductor.nombre || ''} onChange={(e) => setNuevoConductor({...nuevoConductor, nombre: e.target.value})} placeholder="Nombre" required />
              </div>
              <div className="space-y-2">
                <Label>Apellidos *</Label>
                <Input value={nuevoConductor.apellidos || ''} onChange={(e) => setNuevoConductor({...nuevoConductor, apellidos: e.target.value})} placeholder="Apellidos" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>DNI *</Label>
                <Input value={nuevoConductor.dni || ''} onChange={(e) => setNuevoConductor({...nuevoConductor, dni: e.target.value.toUpperCase()})} placeholder="12345678A" required />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={nuevoConductor.telefono || ''} onChange={(e) => setNuevoConductor({...nuevoConductor, telefono: e.target.value})} placeholder="+34 600 000 000" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email (para panel de control)</Label>
              <Input type="email" value={nuevoConductor.email || ''} onChange={(e) => setNuevoConductor({...nuevoConductor, email: e.target.value})} placeholder="conductor@ejemplo.com" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tarifa/Hora (€)</Label>
                <Input type="number" min={0} step={0.5} value={nuevoConductor.tarifaHora} onChange={(e) => setNuevoConductor({...nuevoConductor, tarifaHora: parseFloat(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Prioridad Asignación (0-100)</Label>
                <Input type="number" min={0} max={100} value={nuevoConductor.prioridad} onChange={(e) => setNuevoConductor({...nuevoConductor, prioridad: parseInt(e.target.value)})} />
                <p className="text-xs text-slate-500">Mayor = preferencia en auto-asignación</p>
              </div>
            </div>

            {/* Disponibilidad */}
            <div className="space-y-3 p-3 bg-slate-50 rounded-lg border">
              <Label className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Disponibilidad Horaria</Label>
              <div className="flex flex-wrap gap-2">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((dia, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <Checkbox id={`dia-${idx}`} checked={nuevoConductor.disponibilidad?.dias?.includes(idx) || false} onCheckedChange={(checked) => toggleDia(idx, checked)} />
                    <Label htmlFor={`dia-${idx}`} className="text-sm cursor-pointer">{dia}</Label>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hora Inicio</Label>
                  <Input type="time" value={nuevoConductor.disponibilidad?.horaInicio || '08:00'} onChange={(e) => {
                    const currentDisp = ensureDisponibilidad(nuevoConductor.disponibilidad);
                    setNuevoConductor({ ...nuevoConductor, disponibilidad: { ...currentDisp, horaInicio: e.target.value } });
                  }} />
                </div>
                <div className="space-y-2">
                  <Label>Hora Fin</Label>
                  <Input type="time" value={nuevoConductor.disponibilidad?.horaFin || '18:00'} onChange={(e) => {
                    const currentDisp = ensureDisponibilidad(nuevoConductor.disponibilidad);
                    setNuevoConductor({ ...nuevoConductor, disponibilidad: { ...currentDisp, horaFin: e.target.value } });
                  }} />
                </div>
              </div>
            </div>

            {/* Licencia */}
            <div className="space-y-3 p-3 bg-slate-50 rounded-lg border">
              <Label className="flex items-center gap-2"><Award className="h-4 w-4" /> Licencia</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={nuevoConductor.licencia?.tipo || 'D'} onValueChange={(v) => {
                    const currentLic = ensureLicencia(nuevoConductor.licencia);
                    setNuevoConductor({ ...nuevoConductor, licencia: { ...currentLic, tipo: v } });
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="D">D (Autobuses)</SelectItem>
                      <SelectItem value="D1">D1 (Minibuses)</SelectItem>
                      <SelectItem value="C">C (Camiones)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Número Licencia</Label>
                  <Input value={nuevoConductor.licencia?.numero || ''} onChange={(e) => {
                    const currentLic = ensureLicencia(nuevoConductor.licencia);
                    setNuevoConductor({ ...nuevoConductor, licencia: { ...currentLic, numero: e.target.value } });
                  }} placeholder="Número de licencia" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fecha Caducidad</Label>
                <Input type="date" value={nuevoConductor.licencia?.fechaCaducidad ? format(new Date(nuevoConductor.licencia.fechaCaducidad), 'yyyy-MM-dd') : ''} onChange={(e) => {
                  const currentLic = ensureLicencia(nuevoConductor.licencia);
                  setNuevoConductor({ ...nuevoConductor, licencia: { ...currentLic, fechaCaducidad: e.target.value } });
                }} />
              </div>
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <Label>Estado Inicial</Label>
              <Select value={nuevoConductor.estado} onValueChange={(v) => setNuevoConductor({...nuevoConductor, estado: v as EstadoConductor})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="vacaciones">Vacaciones</SelectItem>
                  <SelectItem value="descanso">Descanso</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Credenciales Info */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Label className="flex items-center gap-2 text-blue-700"><Key className="h-4 w-4" /> Panel de Control - Credenciales</Label>
              <p className="text-sm text-blue-600 mt-1">Se generarán automáticamente al crear el conductor</p>
            </div>

            {/* Credenciales Generadas - AHORA DURA 30 SEGUNDOS */}
            {credencialesGeneradas && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200 space-y-2">
                <p className="font-medium text-green-700 flex items-center gap-2"><Shield className="h-4 w-4" /> Credenciales Generadas (guarde estas)</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-green-600">Usuario:</Label>
                    <p className="font-mono bg-white p-2 rounded border">{credencialesGeneradas.usuario}</p>
                  </div>
                  <div>
                    <Label className="text-green-600">Contraseña:</Label>
                    <p className="font-mono bg-white p-2 rounded border">{credencialesGeneradas.password}</p>
                  </div>
                </div>
                <p className="text-xs text-green-600">⚠️ Estas credenciales desaparecerán en 30 segundos. Asegúrese de guardarlas.</p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#1e3a5f] hover:bg-[#152a45]">
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Creando...</> : 'Crear Conductor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card><CardContent className="p-6"><div className="flex justify-between"><div><p className="text-sm text-slate-500">Activos</p><p className="text-3xl font-bold">{stats.activos}</p></div><div className="rounded-full bg-green-100 p-3"><CheckCircle2 className="h-6 w-6 text-green-600"/></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex justify-between"><div><p className="text-sm text-slate-500">En Ruta</p><p className="text-3xl font-bold">{stats.enRuta}</p></div><div className="rounded-full bg-purple-100 p-3"><Briefcase className="h-6 w-6 text-purple-600"/></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex justify-between"><div><p className="text-sm text-slate-500">Vacaciones</p><p className="text-3xl font-bold">{stats.vacaciones}</p></div><div className="rounded-full bg-blue-100 p-3"><Calendar className="h-6 w-6 text-blue-600"/></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex justify-between"><div><p className="text-sm text-slate-500">Horas Mes</p><p className="text-3xl font-bold">{stats.totalHorasMes}</p></div><div className="rounded-full bg-purple-100 p-3"><Clock className="h-6 w-6 text-purple-600"/></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex justify-between"><div><p className="text-sm text-slate-500">Licencias ⚠️</p><p className="text-3xl font-bold">{stats.licenciasProximas}</p></div><div className="rounded-full bg-amber-100 p-3"><AlertTriangle className="h-6 w-6 text-amber-600"/></div></div></CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="conductores" className="space-y-4">
        <TabsList>
          <TabsTrigger value="conductores">Conductores ({conductoresFiltrados.length})</TabsTrigger>
          <TabsTrigger value="disponibilidad">Disponibilidad</TabsTrigger>
          <TabsTrigger value="alertas">Alertas ({stats.licenciasProximas})</TabsTrigger>
        </TabsList>

        <TabsContent value="conductores" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Buscar conductores..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={estadoFiltro} onValueChange={(v) => setEstadoFiltro(v as EstadoConductor | 'todos')}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar por estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="en_ruta">En Ruta</SelectItem>
                <SelectItem value="vacaciones">Vacaciones</SelectItem>
                <SelectItem value="baja">De Baja</SelectItem>
                <SelectItem value="descanso">Descanso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table - FIX: Botones directos */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conductor</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Disponibilidad</TableHead>
                    <TableHead>Tarifa/Hora</TableHead>
                    <TableHead>Horas Mes</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conductoresFiltrados.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">No se encontraron conductores</TableCell></TableRow>
                  ) : (
                    conductoresFiltrados.map((conductor) => (
                      <TableRow key={conductor.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => verDetalle(conductor)}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-[#1e3a5f] text-white">{conductor.nombre?.charAt(0)}{conductor.apellidos?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{conductor.nombre} {conductor.apellidos}</p>
                              <p className="text-xs text-slate-500">{conductor.codigo} • Prioridad: {conductor.prioridad || 50}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3" />{conductor.telefono || '-'}</span>
                            <span className="flex items-center gap-1 text-sm text-slate-500"><Mail className="h-3 w-3" />{conductor.email || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{conductor.disponibilidad?.dias?.map(d => ['D','L','M','X','J','V','S'][d]).join(', ')}</p>
                            <p className="text-slate-500">{conductor.disponibilidad?.horaInicio}-{conductor.disponibilidad?.horaFin}</p>
                          </div>
                        </TableCell>
                        <TableCell><span className="font-medium">{conductor.tarifaHora}€/h</span></TableCell>
                        <TableCell>
                          <div className="w-24">
                            <Progress value={((conductor.totalHorasMes || 0) / 160) * 100} className="h-2" />
                            <span className="text-xs text-slate-500">{conductor.totalHorasMes || 0}h</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={estadoConductorColors[conductor.estado || 'activo']}>{conductor.estado}</Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => verDetalle(conductor)} title="Ver"><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={(e) => abrirEditar(conductor, e)} title="Editar"><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={(e) => handleEliminarConductor(String(conductor.id), e)} title="Eliminar" className="text-red-600 hover:text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disponibilidad">
          <Card>
            <CardHeader>
              <CardTitle>Matriz de Disponibilidad</CardTitle>
              <CardDescription>Vista semanal de disponibilidad de conductores activos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conductores.filter(c => c.estado === 'activo').map(conductor => (
                  <div key={conductor.id} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50">
                    <div className="w-32 font-medium truncate">{conductor.nombre} {conductor.apellidos?.charAt(0)}.</div>
                    <div className="flex-1 flex gap-1">
                      {['L','M','X','J','V','S','D'].map((dia, idx) => {
                        const disponible = conductor.disponibilidad?.dias?.includes(idx + 1) || (idx === 6 && conductor.disponibilidad?.dias?.includes(0));
                        return (
                          <div key={idx} className={`flex-1 h-8 rounded flex items-center justify-center text-xs font-medium ${disponible ? 'bg-green-200 text-green-800' : 'bg-slate-200 text-slate-500'}`}>{dia}</div>
                        );
                      })}
                    </div>
                    <div className="w-32 text-sm text-slate-500">{conductor.disponibilidad?.horaInicio}-{conductor.disponibilidad?.horaFin}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alertas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Licencias Próximas a Caducar</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.licenciasProximas === 0 ? (
                <div className="text-center py-8 text-slate-500"><CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-500" /><p>No hay licencias próximas a caducar</p></div>
              ) : (
                <div className="space-y-3">
                  {conductores.filter(c => {
                    const fecha = parseDateSafe(c.licencia?.fechaCaducidad);
                    return fecha && differenceInDays(fecha, new Date()) <= 30;
                  }).map(conductor => {
                    const fechaCaducidad = parseDateSafe(conductor.licencia!.fechaCaducidad)!;
                    const diasRestantes = differenceInDays(fechaCaducidad, new Date());
                    return (
                      <div key={conductor.id} className={`flex items-center justify-between p-4 rounded-lg border ${diasRestantes <= 7 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className={diasRestantes <= 7 ? 'bg-red-500' : 'bg-amber-500'}>{conductor.nombre?.charAt(0)}{conductor.apellidos?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{conductor.nombre} {conductor.apellidos}</p>
                            <p className="text-sm text-slate-600">Licencia {conductor.licencia?.tipo} - {conductor.licencia?.numero}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${diasRestantes <= 7 ? 'text-red-700' : 'text-amber-700'}`}>Caduca: {format(fechaCaducidad, 'dd/MM/yyyy')}</p>
                          <p className="text-xs">{diasRestantes} días restantes</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Detalle */}
      <Dialog open={isDetalleOpen} onOpenChange={setIsDetalleOpen}>
        <DialogContent className="max-w-2xl">
          {conductorSeleccionado && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-12 w-12"><AvatarFallback className="bg-[#1e3a5f] text-white">{conductorSeleccionado.nombre?.charAt(0)}{conductorSeleccionado.apellidos?.charAt(0)}</AvatarFallback></Avatar>
                  <div>{conductorSeleccionado.nombre} {conductorSeleccionado.apellidos}<p className="text-sm font-normal text-slate-500">{conductorSeleccionado.codigo}</p></div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-slate-500">DNI</Label><p>{conductorSeleccionado.dni}</p></div>
                  <div><Label className="text-slate-500">Estado</Label><Badge className={estadoConductorColors[conductorSeleccionado.estado]}>{conductorSeleccionado.estado}</Badge></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-slate-500">Teléfono</Label><p className="flex items-center gap-2"><Phone className="h-4 w-4" />{conductorSeleccionado.telefono || '-'}</p></div>
                  <div><Label className="text-slate-500">Email</Label><p className="flex items-center gap-2"><Mail className="h-4 w-4" />{conductorSeleccionado.email || '-'}</p></div>
                </div>
                <div className="grid grid-cols-3 gap-4 rounded-lg bg-slate-50 p-4">
                  <div><Label className="text-slate-500">Tarifa/Hora</Label><p className="text-lg font-medium">{conductorSeleccionado.tarifaHora}€</p></div>
                  <div><Label className="text-slate-500">Horas Mes</Label><p className="text-lg font-medium">{conductorSeleccionado.totalHorasMes || 0}h</p></div>
                  <div><Label className="text-slate-500">Servicios Mes</Label><p className="text-lg font-medium">{conductorSeleccionado.totalServiciosMes || 0}</p></div>
                </div>
                {conductorSeleccionado.licencia && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <Label className="text-slate-500 flex items-center gap-2"><Award className="h-4 w-4" /> Licencia</Label>
                    <p>Tipo {conductorSeleccionado.licencia.tipo} - {conductorSeleccionado.licencia.numero}</p>
                    <p className="text-sm text-slate-500">Caduca: {conductorSeleccionado.licencia.fechaCaducidad ? format(new Date(conductorSeleccionado.licencia.fechaCaducidad), 'dd/MM/yyyy') : '-'}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDetalleOpen(false)}>Cerrar</Button>
                <Button onClick={() => { setIsDetalleOpen(false); setIsEditarOpen(true); }} className="bg-[#1e3a5f] hover:bg-[#152a45]"><Edit className="mr-2 h-4 w-4" />Editar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Editar */}
      <Dialog open={isEditarOpen} onOpenChange={setIsEditarOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Conductor</DialogTitle>
            <DialogDescription>Modifique los datos del conductor</DialogDescription>
          </DialogHeader>
          {conductorSeleccionado && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Nombre</Label><Input value={conductorSeleccionado.nombre} onChange={(e) => setConductorSeleccionado({...conductorSeleccionado, nombre: e.target.value})} /></div>
                <div className="space-y-2"><Label>Apellidos</Label><Input value={conductorSeleccionado.apellidos} onChange={(e) => setConductorSeleccionado({...conductorSeleccionado, apellidos: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Teléfono</Label><Input value={conductorSeleccionado.telefono || ''} onChange={(e) => setConductorSeleccionado({...conductorSeleccionado, telefono: e.target.value})} /></div>
                <div className="space-y-2"><Label>Email</Label><Input value={conductorSeleccionado.email || ''} onChange={(e) => setConductorSeleccionado({...conductorSeleccionado, email: e.target.value})} /></div>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={conductorSeleccionado.estado} onValueChange={(v) => setConductorSeleccionado({...conductorSeleccionado, estado: v as EstadoConductor})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="vacaciones">Vacaciones</SelectItem>
                    <SelectItem value="descanso">Descanso</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                    <SelectItem value="en_ruta">En Ruta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditarOpen(false)}>Cancelar</Button>
                <Button onClick={handleEditarConductor} disabled={isSubmitting} className="bg-[#1e3a5f] hover:bg-[#152a45]">{isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Guardando...</> : 'Guardar Cambios'}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
