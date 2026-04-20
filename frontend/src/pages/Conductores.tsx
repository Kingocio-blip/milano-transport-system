// ============================================
// MILANO - Conductores (Rediseñado Completo)
// Cards/List toggle, Stats, CAP, Nómina 3 opciones
// Dark mode, Auto-usuario, Disponibilidad
// ============================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useConductoresStore, useServiciosStore, useUIStore } from '../store';
import { api } from '../lib/api';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Checkbox } from '../components/ui/checkbox';
import {
  Plus, Search, Loader2, Trash2, Edit3, Eye, Phone, Mail,
  Calendar, Clock, CheckCircle2, AlertTriangle, LayoutGrid, List,
  Users, Award, Key, Shield, MapPin, Briefcase, Star,
  UserCircle, FileText, ExternalLink, Info, User
} from 'lucide-react';
import { SkeletonPage } from '../components/LoadingScreen';
import type { Conductor, EstadoConductor, TipoNomina, BloquePrecio } from '../types';
import { format, parseISO, differenceInDays, isValid, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

// ============================================
// CONSTANTES
// ============================================

const estadoColors: Record<EstadoConductor, string> = {
  activo: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  baja: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  vacaciones: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  descanso: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  inactivo: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  en_ruta: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

const estadoLabels: Record<EstadoConductor, string> = {
  activo: 'Activo', baja: 'De Baja', vacaciones: 'Vacaciones',
  descanso: 'Descanso', inactivo: 'Inactivo', en_ruta: 'En Ruta',
};

const tipoNominaLabels: Record<TipoNomina, string> = {
  tarifa_hora: 'Tarifa por Hora',
  convenio: 'Convenio Colectivo',
  bloques: 'Bloques de Disponibilidad',
};

const BLOQUES_DEFAULT: BloquePrecio[] = [
  { horas: 4, precio: 40 },
  { horas: 8, precio: 80 },
  { horas: 12, precio: 100 },
  { horas: 15, precio: 120 },
];

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// ============================================
// HELPERS
// ============================================

const parseDateSafe = (date: string | Date | undefined): Date | null => {
  if (!date) return null;
  try {
    const parsed = typeof date === 'string' ? parseISO(date) : date;
    return isValid(parsed) ? parsed : null;
  } catch { return null; }
};

const formatDateSafe = (date: string | Date | undefined): string => {
  const d = parseDateSafe(date);
  return d ? format(d, 'dd/MM/yyyy', { locale: es }) : '-';
};

const idsEqual = (a: string | number | undefined, b: string | number | undefined): boolean =>
  String(a) === String(b);

// Helper: convertir fecha YYYY-MM-DD a datetime ISO para Pydantic
const toDateTime = (fecha: string | undefined): string | undefined => {
  if (!fecha) return undefined;
  if (fecha.includes('T')) return fecha;
  return `${fecha}T00:00:00`;
};

// ============================================
// INTERFACES DE FORMULARIO
// ============================================

interface ConductorForm {
  nombre: string;
  apellidos: string;
  dni: string;
  telefono: string;
  email: string;
  direccion: string;
  fechaNacimiento: string;
  estado: EstadoConductor;
  // Licencia
  licenciaTipo: string;
  licenciaNumero: string;
  licenciaFechaExpedicion: string;
  licenciaFechaCaducidad: string;
  // CAP
  capNumero: string;
  capFechaVencimiento: string;
  // Disponibilidad
  disponibilidadDias: number[];
  disponibilidadHoraInicio: string;
  disponibilidadHoraFin: string;
  // Nómina
  tipoNomina: TipoNomina;
  tarifaHora: number;
  horasContratadas: number;
  horasExtras: boolean;
  bloques: BloquePrecio[];
  // Usuario vinculado (sistema de roles)
  username: string;
  password: string;
  prioridad: number;
  panelActivo: boolean;
  notas: string;
}

const initialForm: ConductorForm = {
  nombre: '', apellidos: '', dni: '', telefono: '', email: '',
  direccion: '', fechaNacimiento: '', estado: 'activo',
  licenciaTipo: 'D', licenciaNumero: '',
  licenciaFechaExpedicion: '', licenciaFechaCaducidad: '',
  capNumero: '', capFechaVencimiento: '',
  disponibilidadDias: [1, 2, 3, 4, 5],
  disponibilidadHoraInicio: '08:00', disponibilidadHoraFin: '18:00',
  tipoNomina: 'tarifa_hora', tarifaHora: 18, horasContratadas: 40,
  horasExtras: true, bloques: [...BLOQUES_DEFAULT],
  username: '', password: '',
  prioridad: 50, panelActivo: true, notas: '',
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function Conductores() {
  const { conductores, isLoading, error, addConductor, updateConductor, deleteConductor, fetchConductores } = useConductoresStore();
  const { servicios } = useServiciosStore();
  const { showToast } = useUIStore();

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoConductor | 'todos'>('todos');
  const [vistaMode, setVistaMode] = useState<'cards' | 'lista'>('cards');

  // Modales
  const [isNuevoOpen, setIsNuevoOpen] = useState(false);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const [isEditarOpen, setIsEditarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selección
  const [conductorSel, setConductorSel] = useState<Conductor | null>(null);
  const [nuevoConductor, setNuevoConductor] = useState<ConductorForm>({ ...initialForm });
  const [credencialesGen, setCredencialesGen] = useState<{ usuario: string; password: string } | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [detalleTab, setDetalleTab] = useState('info');

  useEffect(() => { fetchConductores(); }, [fetchConductores]);
  useEffect(() => { if (error) showToast(error, 'error'); }, [error, showToast]);

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  const stats = useMemo(() => ({
    total: conductores.length,
    activos: conductores.filter(c => c.estado === 'activo').length,
    enRuta: conductores.filter(c => c.estado === 'en_ruta').length,
    vacaciones: conductores.filter(c => c.estado === 'vacaciones').length,
    totalHorasMes: conductores.reduce((sum, c) => sum + (c.totalHorasMes || 0), 0),
    licenciasProximas: conductores.filter(c => {
      const fechaCad = parseDateSafe(c.licencia?.fechaCaducidad);
      return fechaCad && differenceInDays(fechaCad, new Date()) <= 30;
    }).length,
    capProximos: conductores.filter(c => {
      const fechaCAP = parseDateSafe(c.licencia?.cap?.fechaVencimiento);
      return fechaCAP && differenceInDays(fechaCAP, new Date()) <= 30;
    }).length,
  }), [conductores]);

  // ============================================
  // FILTRADOS
  // ============================================

  const filtrados = useMemo(() => {
    return conductores.filter(c => {
      const sq = searchQuery.toLowerCase().trim();
      const ms = sq === '' ||
        c.nombre?.toLowerCase().includes(sq) ||
        c.apellidos?.toLowerCase().includes(sq) ||
        c.codigo?.toLowerCase().includes(sq) ||
        c.dni?.toLowerCase().includes(sq) ||
        c.email?.toLowerCase().includes(sq);
      return ms && (estadoFiltro === 'todos' || c.estado === estadoFiltro);
    });
  }, [conductores, searchQuery, estadoFiltro]);

  // Servicios del conductor seleccionado
  const serviciosConductor = useMemo(() => {
    if (!conductorSel) return [];
    return servicios.filter(s =>
      s.conductoresAsignados?.some(id => idsEqual(id, conductorSel.id))
    );
  }, [servicios, conductorSel]);

  // ============================================
  // HELPERS FORM
  // ============================================

  const updateForm = (field: keyof ConductorForm, value: any) => {
    setNuevoConductor(p => ({ ...p, [field]: value }));
  };

  const toggleDia = (idx: number, checked: boolean | 'indeterminate') => {
    if (checked === 'indeterminate') return;
    const current = nuevoConductor.disponibilidadDias;
    const newDias = checked ? [...current, idx] : current.filter(d => d !== idx);
    updateForm('disponibilidadDias', newDias);
  };

  const updateBloque = (index: number, field: keyof BloquePrecio, value: number) => {
    const newBloques = nuevoConductor.bloques.map((b, i) =>
      i === index ? { ...b, [field]: value } : b
    );
    updateForm('bloques', newBloques);
  };

  // ============================================
  // CREAR CONDUCTOR
  // ============================================

  const handleCrear = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); e.stopPropagation();

    if (!nuevoConductor.nombre.trim() || !nuevoConductor.apellidos.trim() || !nuevoConductor.dni.trim()) {
      showToast('Nombre, apellidos y DNI son obligatorios', 'error'); return;
    }
    if (!nuevoConductor.username.trim() || !nuevoConductor.password.trim()) {
      showToast('Usuario y contrasena son obligatorios', 'error'); return;
    }
    if (nuevoConductor.password.length < 6) {
      showToast('La contrasena debe tener al menos 6 caracteres', 'error'); return;
    }

    setIsSubmitting(true);

    try {
      // === PASO 1: Crear el conductor ===
      const conductorData = {
        codigo: `COND-${Date.now().toString().slice(-5)}`,
        nombre: nuevoConductor.nombre.trim(),
        apellidos: nuevoConductor.apellidos.trim(),
        dni: nuevoConductor.dni.trim().toUpperCase(),
        telefono: nuevoConductor.telefono?.trim() || null,
        email: nuevoConductor.email?.trim() || null,
        direccion: nuevoConductor.direccion?.trim() || null,
        fechaNacimiento: toDateTime(nuevoConductor.fechaNacimiento) || null,
        estado: nuevoConductor.estado || 'activo',
        tarifaHora: nuevoConductor.tarifaHora || 18,
        prioridad: nuevoConductor.prioridad || 50,
        licencia: {
          tipo: nuevoConductor.licenciaTipo || 'D',
          numero: nuevoConductor.licenciaNumero || '',
          fechaExpedicion: toDateTime(nuevoConductor.licenciaFechaExpedicion) || null,
          fechaCaducidad: toDateTime(nuevoConductor.licenciaFechaCaducidad) || null,
          cap: {
            numero: nuevoConductor.capNumero || '',
            fechaVencimiento: nuevoConductor.capFechaVencimiento || null,
          },
        },
        disponibilidad: {
          dias: nuevoConductor.disponibilidadDias || [1, 2, 3, 4, 5],
          horaInicio: nuevoConductor.disponibilidadHoraInicio || '08:00',
          horaFin: nuevoConductor.disponibilidadHoraFin || '18:00',
        },
        nomina: {
          tipo: nuevoConductor.tipoNomina,
          tarifaHora: nuevoConductor.tipoNomina === 'tarifa_hora' ? nuevoConductor.tarifaHora : undefined,
          horasContratadas: nuevoConductor.tipoNomina === 'convenio' ? nuevoConductor.horasContratadas : undefined,
          horasExtras: nuevoConductor.tipoNomina === 'convenio' ? nuevoConductor.horasExtras : undefined,
          bloques: nuevoConductor.tipoNomina === 'bloques' ? nuevoConductor.bloques : undefined,
        },
        panelActivo: nuevoConductor.panelActivo,
        notas: nuevoConductor.notas?.trim() || null,
      };

      const conductorCreado = await addConductor(conductorData);

      if (conductorCreado) {
        const conductorId = conductorCreado.id;

        // === PASO 2: Crear el usuario vinculado con rol='conductor' ===
        try {
          const usuarioData = {
            username: nuevoConductor.username.trim().toLowerCase(),
            email: nuevoConductor.email?.trim() || `${nuevoConductor.username.trim()}@milano.local`,
            password: nuevoConductor.password,
            nombre_completo: `${nuevoConductor.nombre.trim()} ${nuevoConductor.apellidos.trim()}`,
            rol: 'conductor',
            activo: true,
            conductor_id: conductorId || undefined,
          };

          const usuarioCreado = await api.post('/users', usuarioData);

          // Vincular conductor con usuario
          if (usuarioCreado && conductorId) {
            try {
              await api.put(`/conductores/${conductorId}`, { usuarioId: String(usuarioCreado.id) });
            } catch (vincErr) {
              console.warn('No se pudo vincular conductor-usuario:', vincErr);
            }
          }

          // Mostrar credenciales
          setCredencialesGen({
            usuario: nuevoConductor.username.trim().toLowerCase(),
            password: nuevoConductor.password,
          });

          showToast('Conductor y usuario creados correctamente', 'success');
        } catch (userErr: any) {
          console.error('Error creando usuario:', userErr);
          showToast(
            `Conductor creado OK, pero error creando usuario: ${userErr.message || 'Desconocido'}. Cree el usuario manualmente desde Usuarios.`,
            'warning'
          );
        }

        await fetchConductores();
        setWizardStep(1);
        setTimeout(() => {
          setCredencialesGen(null);
          setNuevoConductor({ ...initialForm });
          setIsNuevoOpen(false);
        }, 30000);
      } else {
        showToast('Error al crear conductor', 'error');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Desconocido'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [nuevoConductor, addConductor, fetchConductores, showToast]);

  // ============================================
  // EDITAR CONDUCTOR
  // ============================================

  const handleEditar = async () => {
    if (!conductorSel) return;
    setIsSubmitting(true);
    try {
      const success = await updateConductor(String(conductorSel.id), conductorSel);
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

  // ============================================
  // ELIMINAR CONDUCTOR
  // ============================================

  const handleEliminar = async (id: string) => {
    if (!window.confirm('¿Eliminar este conductor?')) return;
    try {
      if (await deleteConductor(id)) {
        showToast('Conductor eliminado', 'success');
        if (conductorSel && idsEqual(conductorSel.id, id)) {
          setIsDetalleOpen(false); setIsEditarOpen(false); setConductorSel(null);
        }
        await fetchConductores();
      }
    } catch (err: any) { showToast(`Error: ${err.message}`, 'error'); }
  };

  // ============================================
  // ABRIR EDITAR
  // ============================================

  const abrirEditar = (conductor: Conductor) => {
    setConductorSel(conductor);
    setIsEditarOpen(true);
  };

  // ============================================
  // ABRIR DETALLE
  // ============================================

  const abrirDetalle = (conductor: Conductor) => {
    setConductorSel(conductor);
    setDetalleTab('info');
    setIsDetalleOpen(true);
  };

  // ============================================
  // LOADING
  // ============================================

  if (isLoading && conductores.length === 0) {
    return <SkeletonPage type="mixed" tableCols={7} vistaMode={vistaMode} />;
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Conductores</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Gestion de conductores, nomina y disponibilidad
          </p>
        </div>
        <Button onClick={() => { setNuevoConductor({ ...initialForm }); setWizardStep(1); setCredencialesGen(null); setIsNuevoOpen(true); }}
          className="bg-[#1e3a5f] hover:bg-[#152a45] shadow-sm dark:bg-blue-600 dark:hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Conductor
        </Button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Conductores', value: stats.total, icon: Users, color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' },
          { label: 'Activos', value: stats.activos, icon: CheckCircle2, color: 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400' },
          { label: 'En Ruta', value: stats.enRuta, icon: Briefcase, color: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400' },
          { label: 'Horas Mes', value: stats.totalHorasMes, icon: Clock, color: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center gap-3">
            <div className={`rounded-lg p-2.5 ${s.color}`}><s.icon className="h-5 w-5" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{s.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alertas de licencias */}
      {(stats.licenciasProximas > 0 || stats.capProximos > 0) && (
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${stats.licenciasProximas > 0 ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700' : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'}`}>
          <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${stats.licenciasProximas > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`} />
          <div className="flex-1">
            <p className="text-sm font-medium dark:text-slate-200">
              {stats.licenciasProximas > 0 && `${stats.licenciasProximas} licencias proximas a caducar`}
              {stats.licenciasProximas > 0 && stats.capProximos > 0 && ' · '}
              {stats.capProximos > 0 && `${stats.capProximos} CAP proximos a vencer`}
            </p>
          </div>
        </div>
      )}

      {/* FILTROS */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar conductor..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 dark:bg-slate-900 dark:border-slate-700" />
        </div>
        <div className="flex gap-2">
          <Select value={estadoFiltro} onValueChange={v => setEstadoFiltro(v as EstadoConductor | 'todos')}>
            <SelectTrigger className="w-[150px] dark:bg-slate-900 dark:border-slate-700"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="en_ruta">En Ruta</SelectItem>
              <SelectItem value="vacaciones">Vacaciones</SelectItem>
              <SelectItem value="descanso">Descanso</SelectItem>
              <SelectItem value="baja">De Baja</SelectItem>
              <SelectItem value="inactivo">Inactivo</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex border rounded-lg overflow-hidden dark:border-slate-700">
            <button onClick={() => setVistaMode('cards')} className={`p-2 ${vistaMode === 'cards' ? 'bg-[#1e3a5f] text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}><LayoutGrid className="h-4 w-4" /></button>
            <button onClick={() => setVistaMode('lista')} className={`p-2 ${vistaMode === 'lista' ? 'bg-[#1e3a5f] text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}><List className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* ===================== VISTA CARDS ===================== */}
      {vistaMode === 'cards' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.length === 0 ? (
            <div className="col-span-full flex flex-col items-center py-16 text-slate-400 dark:text-slate-500">
              <Users className="h-12 w-12 mb-3" /><p className="text-sm">No hay conductores</p>
            </div>
          ) : filtrados.map(c => (
            <div key={c.id}
              onClick={() => abrirDetalle(c)}
              className="group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1e3a5f] dark:bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    {c.nombre?.charAt(0)}{c.apellidos?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">{c.nombre} {c.apellidos}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{`${c.codigo} · DNI: ${c.dni}`}</p>
                  </div>
                </div>
                <Badge className={estadoColors[c.estado] || ''}>{estadoLabels[c.estado] || c.estado}</Badge>
              </div>
              <div className="space-y-1.5 text-sm text-slate-500 dark:text-slate-400 mb-3">
                {c.email && <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{c.email}</p>}
                {c.telefono && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{c.telefono}</p>}
                <p className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {c.disponibilidad?.horaInicio || '08:00'} - {c.disponibilidad?.horaFin || '18:00'}
                  <span className="text-xs">({c.disponibilidad?.dias?.map(d => DIAS_SEMANA[d]).join(', ')})</span>
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>{c.tarifaHora || 18} EUR/h</span>
                  <span>{c.totalHorasMes || 0}h mes</span>
                  <span>{c.totalServiciosMes || 0} servs</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={e => { e.stopPropagation(); abrirDetalle(c); }}><Eye className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={e => { e.stopPropagation(); abrirEditar(c); }}><Edit3 className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={e => { e.stopPropagation(); handleEliminar(String(c.id)); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ===================== VISTA LISTA ===================== */
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Conductor</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Contacto</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Disponibilidad</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Tarifa</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Horas Mes</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtrados.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500"><Users className="h-10 w-10 mx-auto mb-2" />No hay conductores</td></tr>
                ) : filtrados.map(c => (
                  <tr key={c.id} onClick={() => abrirDetalle(c)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#1e3a5f] dark:bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                          {c.nombre?.charAt(0)}{c.apellidos?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium dark:text-slate-200">{`${c.nombre} ${c.apellidos}`}</p>
                          <p className="text-xs text-slate-500">{c.codigo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{c.email || c.telefono || '-'}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {c.disponibilidad?.horaInicio}-{c.disponibilidad?.horaFin}
                    </td>
                    <td className="px-4 py-3 font-medium dark:text-slate-300">{c.tarifaHora || 18} EUR/h</td>
                    <td className="px-4 py-3 dark:text-slate-300">{c.totalHorasMes || 0}h</td>
                    <td className="px-4 py-3"><Badge className={estadoColors[c.estado] || ''}>{estadoLabels[c.estado] || c.estado}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); abrirDetalle(c); }}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); abrirEditar(c); }}><Edit3 className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={e => { e.stopPropagation(); handleEliminar(String(c.id)); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* DIALOG: NUEVO CONDUCTOR (WIZARD)             */}
      {/* ============================================ */}
      <Dialog open={isNuevoOpen} onOpenChange={setIsNuevoOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">Nuevo Conductor</DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Complete la informacion del conductor. Se creara un usuario automaticamente.
            </DialogDescription>
          </DialogHeader>

          {/* Wizard Steps */}
          <div className="flex items-center gap-2 mb-4">
            {[
              { n: 1, l: 'Datos Personales' },
              { n: 2, l: 'Licencia y CAP' },
              { n: 3, l: 'Nomina y Disponibilidad' },
            ].map(s => (
              <div key={s.n} className={`flex-1 py-2 px-3 rounded-lg text-center text-sm font-medium transition-colors ${
                wizardStep === s.n ? 'bg-[#1e3a5f] text-white dark:bg-blue-600' :
                wizardStep > s.n ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
              }`}>
                {s.n}. {s.l}
              </div>
            ))}
          </div>

          <form onSubmit={handleCrear} className="space-y-4">
            {/* ====== PASO 1: DATOS PERSONALES ====== */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input value={nuevoConductor.nombre}
                      onChange={e => updateForm('nombre', e.target.value)}
                      placeholder="Nombre" required
                      className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                  <div className="space-y-2">
                    <Label>Apellidos *</Label>
                    <Input value={nuevoConductor.apellidos}
                      onChange={e => updateForm('apellidos', e.target.value)}
                      placeholder="Apellidos" required
                      className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>DNI/NIE *</Label>
                    <Input value={nuevoConductor.dni}
                      onChange={e => updateForm('dni', e.target.value.toUpperCase())}
                      placeholder="12345678A" required
                      className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha Nacimiento</Label>
                    <Input type="date"
                      value={nuevoConductor.fechaNacimiento}
                      onChange={e => updateForm('fechaNacimiento', e.target.value)}
                      className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Telefono</Label>
                    <Input value={nuevoConductor.telefono}
                      onChange={e => updateForm('telefono', e.target.value)}
                      placeholder="+34 600 000 000"
                      className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email (para panel y usuario)</Label>
                    <Input type="email" value={nuevoConductor.email}
                      onChange={e => updateForm('email', e.target.value)}
                      placeholder="conductor@ejemplo.com"
                      className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                </div>

                {/* Usuario y Contrasena para el sistema de roles */}
                <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 space-y-4">
                  <h4 className="font-medium flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Key className="h-4 w-4" /> Credenciales de Acceso (sistema de usuarios)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="dark:text-slate-200">Nombre de usuario *</Label>
                      <Input value={nuevoConductor.username}
                        onChange={e => updateForm('username', e.target.value.toLowerCase().replace(/\\s/g, ''))}
                        placeholder="juan.perez"
                        required
                        className="dark:bg-slate-900 dark:border-slate-600" />
                      <p className="text-xs text-slate-500 dark:text-slate-400">Solo letras, numeros y puntos. Sin espacios.</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-slate-200">Contrasena *</Label>
                      <Input type="text"
                        value={nuevoConductor.password}
                        onChange={e => updateForm('password', e.target.value)}
                        placeholder="Minimo 6 caracteres"
                        required
                        minLength={6}
                        className="dark:bg-slate-900 dark:border-slate-600" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Direccion</Label>
                  <Input value={nuevoConductor.direccion}
                    onChange={e => updateForm('direccion', e.target.value)}
                    placeholder="Calle, numero, ciudad"
                    className="dark:bg-slate-900 dark:border-slate-600" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Estado Inicial</Label>
                    <Select value={nuevoConductor.estado} onValueChange={v => updateForm('estado', v)}>
                      <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activo">Activo</SelectItem>
                        <SelectItem value="vacaciones">Vacaciones</SelectItem>
                        <SelectItem value="descanso">Descanso</SelectItem>
                        <SelectItem value="baja">De Baja</SelectItem>
                        <SelectItem value="inactivo">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridad Asignacion (0-100)</Label>
                    <Input type="number" min={0} max={100}
                      value={nuevoConductor.prioridad}
                      onChange={e => updateForm('prioridad', parseInt(e.target.value) || 50)}
                      className="dark:bg-slate-900 dark:border-slate-600" />
                    <p className="text-xs text-slate-500">Mayor = preferencia en auto-asignacion</p>
                  </div>
                </div>
              </div>
            )}

            {/* ====== PASO 2: LICENCIA Y CAP ====== */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
                  <h4 className="font-medium flex items-center gap-2 dark:text-slate-200">
                    <Award className="h-4 w-4" /> Licencia de Conducir
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={nuevoConductor.licenciaTipo} onValueChange={v => updateForm('licenciaTipo', v)}>
                        <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="D">D (Autobuses)</SelectItem>
                          <SelectItem value="D1">D1 (Minibuses 16+1)</SelectItem>
                          <SelectItem value="C">C (Camiones)</SelectItem>
                          <SelectItem value="C1">C1 (Camiones ligeros)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Numero Licencia</Label>
                      <Input value={nuevoConductor.licenciaNumero}
                        onChange={e => updateForm('licenciaNumero', e.target.value)}
                        placeholder="Numero de licencia"
                        className="dark:bg-slate-900 dark:border-slate-600" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fecha Expedicion</Label>
                      <Input type="date"
                        value={nuevoConductor.licenciaFechaExpedicion}
                        onChange={e => updateForm('licenciaFechaExpedicion', e.target.value)}
                        className="dark:bg-slate-900 dark:border-slate-600" />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha Caducidad</Label>
                      <Input type="date"
                        value={nuevoConductor.licenciaFechaCaducidad}
                        onChange={e => updateForm('licenciaFechaCaducidad', e.target.value)}
                        className="dark:bg-slate-900 dark:border-slate-600" />
                    </div>
                  </div>
                </div>

                {/* CAP */}
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center gap-2 dark:text-slate-200">
                      <Shield className="h-4 w-4" /> CAP - Certificado de Aptitud Profesional
                    </h4>
                    <a href="https://www.mitma.gob.es/transportes-movilidad-y-ordenacion-del-territorio/ambito-de-actuacion/transporte-por-carretera/certificado-de-aptitud-profesional-cap"
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400">
                      <ExternalLink className="h-3 w-3" /> Info MITMA
                    </a>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Obligatorio para transporte de viajeros. Renovacion cada 5 anos.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Numero CAP</Label>
                      <Input value={nuevoConductor.capNumero}
                        onChange={e => updateForm('capNumero', e.target.value)}
                        placeholder="Numero CAP"
                        className="dark:bg-slate-900 dark:border-slate-600" />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha Vencimiento CAP</Label>
                      <Input type="date"
                        value={nuevoConductor.capFechaVencimiento}
                        onChange={e => updateForm('capFechaVencimiento', e.target.value)}
                        className="dark:bg-slate-900 dark:border-slate-600" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ====== PASO 3: NOMINA Y DISPONIBILIDAD ====== */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                {/* Tipo de Nomina */}
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
                  <h4 className="font-medium flex items-center gap-2 dark:text-slate-200">
                    <FileText className="h-4 w-4" /> Configuracion de Nomina
                  </h4>

                  <div className="space-y-2">
                    <Label>Tipo de Nomina</Label>
                    <Select value={nuevoConductor.tipoNomina} onValueChange={v => updateForm('tipoNomina', v as TipoNomina)}>
                      <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tarifa_hora">Tarifa por Hora - Se marca disponible 24h</SelectItem>
                        <SelectItem value="convenio">Convenio Colectivo - Horas contratadas + extras</SelectItem>
                        <SelectItem value="bloques">Bloques de Disponibilidad - Precios fijos por bloque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Opcion 1: Tarifa/Hora */}
                  {nuevoConductor.tipoNomina === 'tarifa_hora' && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                        El conductor marca su disponibilidad 24h. Los servicios se auto-asignan segun prioridad.
                      </p>
                      <div className="space-y-2">
                        <Label>Tarifa por Hora (EUR)</Label>
                        <Input type="number" min={0} step={0.5}
                          value={nuevoConductor.tarifaHora}
                          onChange={e => updateForm('tarifaHora', parseFloat(e.target.value) || 0)}
                          className="dark:bg-slate-900 dark:border-slate-600 max-w-[200px]" />
                      </div>
                    </div>
                  )}

                  {/* Opcion 2: Convenio */}
                  {nuevoConductor.tipoNomina === 'convenio' && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg space-y-3">
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Horas semanales contratadas + horas extras. Las horas obligatorias se muestran en el calendario.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Horas Semanales Contratadas</Label>
                          <Input type="number" min={1}
                            value={nuevoConductor.horasContratadas}
                            onChange={e => updateForm('horasContratadas', parseInt(e.target.value) || 40)}
                            className="dark:bg-slate-900 dark:border-slate-600" />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Checkbox checked={nuevoConductor.horasExtras}
                              onCheckedChange={v => updateForm('horasExtras', v === true)} />
                            Permitir Horas Extras
                          </Label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Opcion 3: Bloques */}
                  {nuevoConductor.tipoNomina === 'bloques' && (
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg space-y-3">
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Precios fijos por bloques de disponibilidad contratados.
                      </p>
                      <div className="space-y-2">
                        <Label>Bloques y Precios (EUR)</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {nuevoConductor.bloques.map((bloque, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-sm w-16 dark:text-slate-300">{bloque.horas}h:</span>
                              <Input type="number" min={0}
                                value={bloque.precio}
                                onChange={e => updateBloque(idx, 'precio', parseFloat(e.target.value) || 0)}
                                className="dark:bg-slate-900 dark:border-slate-600" />
                              <span className="text-sm text-slate-500">EUR</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Disponibilidad */}
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
                  <h4 className="font-medium flex items-center gap-2 dark:text-slate-200">
                    <Calendar className="h-4 w-4" /> Disponibilidad Semanal
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {DIAS_SEMANA.map((dia, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <Checkbox id={`dia-${idx}`}
                          checked={nuevoConductor.disponibilidadDias.includes(idx)}
                          onCheckedChange={v => toggleDia(idx, v)} />
                        <Label htmlFor={`dia-${idx}`} className="text-sm cursor-pointer dark:text-slate-300">{dia}</Label>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Hora Inicio</Label>
                      <Input type="time"
                        value={nuevoConductor.disponibilidadHoraInicio}
                        onChange={e => updateForm('disponibilidadHoraInicio', e.target.value)}
                        className="dark:bg-slate-900 dark:border-slate-600" />
                    </div>
                    <div className="space-y-2">
                      <Label>Hora Fin</Label>
                      <Input type="time"
                        value={nuevoConductor.disponibilidadHoraFin}
                        onChange={e => updateForm('disponibilidadHoraFin', e.target.value)}
                        className="dark:bg-slate-900 dark:border-slate-600" />
                    </div>
                  </div>
                </div>

                {/* Panel de control */}
                <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 space-y-2">
                  <Label className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Key className="h-4 w-4" /> Panel de Control - Usuario Vinculado
                  </Label>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    El usuario con rol <strong>conductor</strong> ya se configuro en el paso 1.
                    El conductor podra acceder al panel con su usuario y contrasena.
                  </p>
                  <div className="flex items-center gap-2">
                    <Checkbox id="panelActivo" checked={nuevoConductor.panelActivo}
                      onCheckedChange={v => updateForm('panelActivo', v === true)} />
                    <Label htmlFor="panelActivo" className="text-sm cursor-pointer dark:text-slate-300">
                      Activar panel de control para este conductor
                    </Label>
                  </div>
                </div>

                {/* Notas */}
                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea value={nuevoConductor.notas}
                    onChange={e => updateForm('notas', e.target.value)}
                    placeholder="Notas internas sobre el conductor"
                    rows={2}
                    className="dark:bg-slate-900 dark:border-slate-600" />
                </div>
              </div>
            )}

            {/* Credenciales del Sistema de Usuarios Generadas */}
            {credencialesGen && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 space-y-3">
                <p className="font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Usuario del Sistema Creado (guarde estas credenciales)
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Se ha creado un usuario con rol <strong>conductor</strong> en el sistema de usuarios.
                  El conductor podra acceder al panel con estas credenciales.
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-green-600 dark:text-green-400">Usuario:</Label>
                    <p className="font-mono bg-white dark:bg-slate-900 p-2 rounded border dark:border-slate-600 dark:text-slate-200">
                      {credencialesGen.usuario}
                    </p>
                  </div>
                  <div>
                    <Label className="text-green-600 dark:text-green-400">Contrasena:</Label>
                    <p className="font-mono bg-white dark:bg-slate-900 p-2 rounded border dark:border-slate-600 dark:text-slate-200">
                      {credencialesGen.password}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Estas credenciales desapareceran en 30 segundos. Guardelas y comuniquelas al conductor.
                </p>
              </div>
            )}

            {/* Botones de navegacion */}
            <div className="flex justify-between pt-2">
              <div>
                {wizardStep > 1 && (
                  <Button type="button" variant="outline" onClick={() => setWizardStep(wizardStep - 1)}
                    className="dark:border-slate-600 dark:text-slate-300">
                    Anterior
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline"
                  onClick={() => { setIsNuevoOpen(false); setNuevoConductor({ ...initialForm }); setCredencialesGen(null); }}
                  className="dark:border-slate-600 dark:text-slate-300">
                  Cancelar
                </Button>
                {wizardStep < 3 ? (
                  <Button type="button" onClick={() => setWizardStep(wizardStep + 1)}
                    className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600">
                    Siguiente
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting}
                    className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600">
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando...</> : 'Crear Conductor'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* DIALOG: DETALLE                              */}
      {/* ============================================ */}
      <Dialog open={isDetalleOpen} onOpenChange={setIsDetalleOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
          {conductorSel && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 dark:text-slate-100">
                  <div className="w-12 h-12 rounded-full bg-[#1e3a5f] dark:bg-blue-600 flex items-center justify-center text-white font-bold">
                    {conductorSel.nombre?.charAt(0)}{conductorSel.apellidos?.charAt(0)}
                  </div>
                  <div>
                    {conductorSel.nombre} {conductorSel.apellidos}
                    <p className="text-sm font-normal text-slate-500 dark:text-slate-400">
                      {conductorSel.codigo} · {conductorSel.dni}
                    </p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <Tabs value={detalleTab} onValueChange={setDetalleTab}>
                <TabsList className="dark:bg-slate-900">
                  <TabsTrigger value="info">Informacion</TabsTrigger>
                  <TabsTrigger value="servicios">Servicios ({serviciosConductor.length})</TabsTrigger>
                  <TabsTrigger value="licencia">Licencia y CAP</TabsTrigger>
                  <TabsTrigger value="nomina">Nomina</TabsTrigger>
                </TabsList>

                {/* Tab Info */}
                <TabsContent value="info" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                      <h4 className="font-medium text-sm dark:text-slate-300">Contacto</h4>
                      {conductorSel.email && <p className="flex items-center gap-2 text-sm dark:text-slate-400"><Mail className="h-4 w-4" />{conductorSel.email}</p>}
                      {conductorSel.telefono && <p className="flex items-center gap-2 text-sm dark:text-slate-400"><Phone className="h-4 w-4" />{conductorSel.telefono}</p>}
                      {conductorSel.direccion && <p className="flex items-center gap-2 text-sm dark:text-slate-400"><MapPin className="h-4 w-4" />{conductorSel.direccion}</p>}
                    </div>
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                      <h4 className="font-medium text-sm dark:text-slate-300">Datos Laborales</h4>
                      <p className="text-sm dark:text-slate-400">Estado: <Badge className={estadoColors[conductorSel.estado] || ''}>{estadoLabels[conductorSel.estado] || conductorSel.estado}</Badge></p>
                      <p className="text-sm dark:text-slate-400">Prioridad: <span className="font-medium dark:text-slate-200">{conductorSel.prioridad || 50}/100</span></p>
                      <p className="text-sm dark:text-slate-400">Panel: {conductorSel.panelActivo ? <span className="text-green-600 dark:text-green-400">Activo</span> : <span className="text-red-600 dark:text-red-400">Inactivo</span>}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Tarifa/Hora</p>
                      <p className="text-xl font-bold dark:text-slate-100">{conductorSel.tarifaHora || 18} EUR</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Horas Mes</p>
                      <p className="text-xl font-bold dark:text-slate-100">{conductorSel.totalHorasMes || 0}h</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Servicios Mes</p>
                      <p className="text-xl font-bold dark:text-slate-100">{conductorSel.totalServiciosMes || 0}</p>
                    </div>
                  </div>
                  {conductorSel.notas && (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                      <h4 className="font-medium text-sm mb-1 dark:text-slate-300">Notas</h4>
                      <p className="text-sm dark:text-slate-400">{conductorSel.notas}</p>
                    </div>
                  )}
                </TabsContent>

                {/* Tab Servicios */}
                <TabsContent value="servicios" className="pt-4">
                  {serviciosConductor.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-slate-400 dark:text-slate-500">
                      <Briefcase className="h-10 w-10 mb-2" /><p className="text-sm">Sin servicios asignados</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {serviciosConductor.map(s => (
                        <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                          <div>
                            <p className="font-medium text-sm dark:text-slate-200">{`${s.codigo} · ${s.titulo}`}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{s.estado} · {(s.precio || 0).toLocaleString()} EUR</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Tab Licencia */}
                <TabsContent value="licencia" className="pt-4 space-y-4">
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                    <h4 className="font-medium flex items-center gap-2 dark:text-slate-200">
                      <Award className="h-4 w-4" /> Licencia
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-slate-500 dark:text-slate-400">Tipo:</span> <span className="dark:text-slate-200">{conductorSel.licencia?.tipo || '-'}</span></div>
                      <div><span className="text-slate-500 dark:text-slate-400">Numero:</span> <span className="dark:text-slate-200">{conductorSel.licencia?.numero || '-'}</span></div>
                      <div><span className="text-slate-500 dark:text-slate-400">Expedicion:</span> <span className="dark:text-slate-200">{formatDateSafe(conductorSel.licencia?.fechaExpedicion)}</span></div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Caducidad:</span>{' '}
                        {(() => {
                          const fecha = parseDateSafe(conductorSel.licencia?.fechaCaducidad);
                          const dias = fecha ? differenceInDays(fecha, new Date()) : null;
                          return (
                            <span className={dias !== null && dias <= 30 ? 'text-red-600 dark:text-red-400 font-medium' : 'dark:text-slate-200'}>
                              {formatDateSafe(conductorSel.licencia?.fechaCaducidad)}
                              {dias !== null && dias <= 30 && ` (${dias} dias)`}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                    <h4 className="font-medium flex items-center gap-2 dark:text-slate-200">
                      <Shield className="h-4 w-4" /> CAP
                    </h4>
                    {conductorSel.licencia?.cap?.numero ? (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><span className="text-slate-500 dark:text-slate-400">Numero CAP:</span> <span className="dark:text-slate-200">{conductorSel.licencia.cap.numero}</span></div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Vencimiento:</span>{' '}
                          {(() => {
                            const fecha = parseDateSafe(conductorSel.licencia.cap?.fechaVencimiento);
                            const dias = fecha ? differenceInDays(fecha, new Date()) : null;
                            return (
                              <span className={dias !== null && dias <= 30 ? 'text-red-600 dark:text-red-400 font-medium' : 'dark:text-slate-200'}>
                                {formatDateSafe(conductorSel.licencia.cap.fechaVencimiento)}
                                {dias !== null && dias <= 30 && ` (${dias} dias)`}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">Sin datos de CAP registrados</p>
                    )}
                    <a href="https://www.mitma.gob.es/transportes-movilidad-y-ordenacion-del-territorio/ambito-de-actuacion/transporte-por-carretera/certificado-de-aptitud-profesional-cap"
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400">
                      <ExternalLink className="h-3 w-3" /> Mas informacion sobre CAP - MITMA
                    </a>
                  </div>
                </TabsContent>

                {/* Tab Nomina */}
                <TabsContent value="nomina" className="pt-4 space-y-4">
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                    <h4 className="font-medium mb-2 dark:text-slate-200">Tipo de Nomina</h4>
                    <p className="text-sm dark:text-slate-300">
                      {conductorSel.nomina?.tipo ? tipoNominaLabels[conductorSel.nomina.tipo] : 'Tarifa por Hora (por defecto)'}
                    </p>
                    {conductorSel.nomina?.tipo === 'tarifa_hora' && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Tarifa: {conductorSel.nomina?.tarifaHora || conductorSel.tarifaHora || 18} EUR/h
                      </p>
                    )}
                    {conductorSel.nomina?.tipo === 'convenio' && (
                      <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 space-y-1">
                        <p>Horas contratadas: {conductorSel.nomina?.horasContratadas || 40}h/semana</p>
                        <p>Horas extras: {conductorSel.nomina?.horasExtras ? 'Permitidas' : 'No permitidas'}</p>
                      </div>
                    )}
                    {conductorSel.nomina?.tipo === 'bloques' && conductorSel.nomina?.bloques && (
                      <div className="mt-2 space-y-1">
                        {conductorSel.nomina.bloques.map((b, i) => (
                          <p key={i} className="text-sm text-slate-500 dark:text-slate-400">
                            {b.horas}h = {b.precio} EUR
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2 dark:text-slate-200">
                      <Info className="h-4 w-4" /> Descanso segun Ley de Transporte
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                      Segun el RD 261/2022, los conductores deben respetar los siguientes descansos:
                    </p>
                    <ul className="text-sm text-slate-500 dark:text-slate-400 list-disc list-inside space-y-1">
                      <li>Descanso diario: minimo 11 horas continuadas (reducible a 9h, max 3 veces/semana)</li>
                      <li>Descanso semanal: minimo 45 horas continuadas (reducible a 24h)</li>
                      <li>Descanso en fraccion: dividido en 2 periodos (minimo 3h + 9h)</li>
                      <li>Interrupcion: maximo 1h entre periodos de descanso</li>
                    </ul>
                    <a href="https://www.mitma.gob.es/transportes-movilidad-y-ordenacion-del-territorio/ambito-de-actuacion/transporte-por-carretera/tiempos-de-conduccion-y-descanso"
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-2">
                      <ExternalLink className="h-3 w-3" /> Ver normativa completa - MITMA
                    </a>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <Button variant="outline" onClick={() => { setIsDetalleOpen(false); abrirEditar(conductorSel); }}
                  className="dark:border-slate-600 dark:text-slate-300">Editar</Button>
                <Button variant="destructive" onClick={() => handleEliminar(String(conductorSel.id))}>Eliminar</Button>
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
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">Editar Conductor</DialogTitle>
          </DialogHeader>
          {conductorSel && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={conductorSel.nombre}
                    onChange={e => setConductorSel({ ...conductorSel, nombre: e.target.value })}
                    className="dark:bg-slate-900 dark:border-slate-600" />
                </div>
                <div className="space-y-2">
                  <Label>Apellidos</Label>
                  <Input value={conductorSel.apellidos}
                    onChange={e => setConductorSel({ ...conductorSel, apellidos: e.target.value })}
                    className="dark:bg-slate-900 dark:border-slate-600" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefono</Label>
                  <Input value={conductorSel.telefono || ''}
                    onChange={e => setConductorSel({ ...conductorSel, telefono: e.target.value })}
                    className="dark:bg-slate-900 dark:border-slate-600" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={conductorSel.email || ''}
                    onChange={e => setConductorSel({ ...conductorSel, email: e.target.value })}
                    className="dark:bg-slate-900 dark:border-slate-600" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Direccion</Label>
                <Input value={conductorSel.direccion || ''}
                  onChange={e => setConductorSel({ ...conductorSel, direccion: e.target.value })}
                  className="dark:bg-slate-900 dark:border-slate-600" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={conductorSel.estado} onValueChange={v => setConductorSel({ ...conductorSel, estado: v as EstadoConductor })}>
                    <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="vacaciones">Vacaciones</SelectItem>
                      <SelectItem value="descanso">Descanso</SelectItem>
                      <SelectItem value="baja">De Baja</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                      <SelectItem value="en_ruta">En Ruta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tarifa/Hora (EUR)</Label>
                  <Input type="number" min={0} step={0.5}
                    value={conductorSel.tarifaHora || 18}
                    onChange={e => setConductorSel({ ...conductorSel, tarifaHora: parseFloat(e.target.value) })}
                    className="dark:bg-slate-900 dark:border-slate-600" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea value={conductorSel.notas || ''}
                  onChange={e => setConductorSel({ ...conductorSel, notas: e.target.value })}
                  rows={2}
                  className="dark:bg-slate-900 dark:border-slate-600" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsEditarOpen(false)}
                  className="dark:border-slate-600 dark:text-slate-300">Cancelar</Button>
            