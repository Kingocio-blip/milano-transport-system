// ============================================
// MILANO - Servicios (Rediseñado v2)
// Wizard 3 pasos + buscador cliente + tipo personalizado + paradas + chat
// Fixes: wizard no crea en paso 2, buscador cliente, tipo personalizado
// ============================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useServiciosStore, useClientesStore, useConductoresStore, useVehiculosStore, useUIStore } from '../store';
import type { Servicio, TipoServicio, EstadoServicio } from '@/types';
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
  Plus, Search, Loader2, Trash2, Edit3, Eye, Calendar, MapPin, User, Bus,
  DollarSign, Clock, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft,
  Route, Users, FileText, TrendingUp, X, LayoutGrid, List, MessageSquare,
  Send, Navigation, Phone, Mail
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SkeletonPage } from '../components/LoadingScreen';
import { format, differenceInHours } from 'date-fns';
import { es } from 'date-fns/locale';

// ============================================
// CONSTANTES
// ============================================

const ESTADOS: { value: EstadoServicio | 'todos'; label: string; color: string }[] = [
  { value: 'todos', label: 'Todos', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
  { value: 'solicitud', label: 'Solicitud', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'presupuesto', label: 'Presupuesto', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
  { value: 'negociacion', label: 'Negociacion', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  { value: 'planificando', label: 'Planificando', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'asignado', label: 'Asignado', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  { value: 'en_curso', label: 'En Curso', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  { value: 'completado', label: 'Completado', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'facturado', label: 'Facturado', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
];

const TIPOS_SERVICIO: { value: string; label: string }[] = [
  { value: 'lanzadera', label: 'Lanzadera' },
  { value: 'discrecional', label: 'Discrecional' },
  { value: 'staff', label: 'Movilidad Staff' },
  { value: 'ruta_programada', label: 'Ruta Programada' },
  { value: 'evento', label: 'Evento / Festival' },
  { value: 'escolar', label: 'Transporte Escolar' },
  { value: 'empresa', label: 'Empresa / Corporativo' },
  { value: 'aeropuerto', label: 'Traslado Aeropuerto' },
];

const CONSUMO_LITROS_100KM = 35;
const PRECIO_GASOIL_LITRO = 1.6;
const TARIFA_CONDUCTOR_HORA = 18;
const TARIFA_COORDINADOR_HORA = 25;

// ============================================
// HELPERS
// ============================================

function idsEqual(a: string | number | undefined, b: string | number | undefined): boolean {
  return String(a) === String(b);
}

// ============================================
// TIPO PARADA
// ============================================

interface Parada {
  id: string;
  tipo: 'origen' | 'parada' | 'descanso' | 'destino';
  ubicacion: string;
  hora: string;
  notas: string;
  lat?: number;
  lng?: number;
}

// ============================================
// COMPONENTE: ChatIntegrado
// ============================================

function ChatIntegrado({ servicioId }: { servicioId: string }) {
  const { fetchMensajes, addMensaje } = useServiciosStore();
  const { showToast } = useUIStore();
  const [mensaje, setMensaje] = useState('');
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      const data = await fetchMensajes(servicioId);
      if (data.length === 0) {
        setMensajes([{ id: '1', autor_nombre: 'Sistema', texto: 'Chat habilitado para este servicio. Pueden participar: cliente, conductor y operadores.', created_at: new Date().toISOString(), autor_tipo: 'sistema' }]);
      } else {
        setMensajes(data);
      }
      setLoading(false);
    };
    cargar();
    // Polling cada 10 segundos
    const interval = setInterval(cargar, 10000);
    return () => clearInterval(interval);
  }, [servicioId, fetchMensajes]);

  const enviar = async () => {
    if (!mensaje.trim()) return;
    const ok = await addMensaje(servicioId, mensaje, 'operador');
    if (ok) {
      setMensajes(p => [...p, { id: `${Date.now()}`, autor_nombre: 'Operador', texto: mensaje, created_at: new Date().toISOString(), autor_tipo: 'operador' }]);
      setMensaje('');
    } else {
      showToast('Error al enviar mensaje', 'error');
    }
  };

  const fechaFmt = (d: string) => {
    try { return format(new Date(d), 'HH:mm'); } catch { return '--:--'; }
  };

  return (
    <div className="flex flex-col h-96 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <div className="bg-slate-50 dark:bg-slate-900/50 px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-[#1e3a5f] dark:text-blue-400" />
        <span className="text-sm font-medium dark:text-slate-200">Chat del servicio</span>
        <span className="text-xs text-slate-400 ml-auto">{mensajes.length} mensajes {loading && '· cargando...'}</span>
      </div>
      <ScrollArea className="flex-1 p-3 space-y-2">
        {mensajes.map(m => (
          <div key={m.id} className={`text-sm ${m.autor_tipo === 'sistema' ? 'text-center text-xs text-slate-500 dark:text-slate-400 italic py-1' : m.autor_tipo === 'operador' ? 'ml-auto max-w-[80%] bg-[#1e3a5f] text-white rounded-lg rounded-tr-sm px-3 py-2' : 'mr-auto max-w-[80%] bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg rounded-tl-sm px-3 py-2'}`}>
            {m.autor_tipo !== 'sistema' && <p className="text-xs opacity-70 mb-0.5">{m.autor_nombre} · {fechaFmt(m.created_at)}</p>}
            <p>{m.texto}</p>
          </div>
        ))}
      </ScrollArea>
      <div className="p-2 border-t border-slate-200 dark:border-slate-700 flex gap-2">
        <Input placeholder="Escribe un mensaje..." value={mensaje} onChange={e => setMensaje(e.target.value)} onKeyDown={e => e.key === 'Enter' && enviar()} className="flex-1 dark:bg-slate-900 dark:border-slate-600 h-9 text-sm" />
        <Button size="sm" onClick={enviar} className="bg-[#1e3a5f] dark:bg-blue-600 h-9 px-3"><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE: MapaRuta (Google Maps iframe)
// ============================================

function MapaRuta({ paradas, height = 300 }: { paradas: Parada[]; height?: number }) {
  const origen = paradas.find(p => p.tipo === 'origen')?.ubicacion;
  const destino = paradas.find(p => p.tipo === 'destino')?.ubicacion;
  
  if (!origen || !destino) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center" style={{ height }}>
        <div className="text-center text-slate-500 dark:text-slate-400">
          <Navigation className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">Introduce origen y destino para ver el mapa</p>
          <p className="text-xs mt-1">Se integrara con Google Maps cuando configures tu API key</p>
        </div>
      </div>
    );
  }

  // URL de Google Maps Embed (gratis, sin API key para modo direccion)
  const waypoints = paradas.filter(p => p.tipo === 'parada' && p.ubicacion).map(p => encodeURIComponent(p.ubicacion)).join('|');
  const directionsUrl = `https://www.google.com/maps/embed?pb=!1m28!1m12!1m3!1d0!2d0!3d0!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m13!3e0!4m5!1s${encodeURIComponent(origen)}!2s${encodeURIComponent(origen)}!3m2!1d0!2d0!4m5!1s${encodeURIComponent(destino)}!2s${encodeURIComponent(destino)}!3m2!1d0!2d0!5e0!3m2!1ses!2ses!4v1`;
  const simpleUrl = `https://maps.google.com/maps?q=${encodeURIComponent(origen + ' a ' + destino)}&t=m&z=10&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden" style={{ height }}>
      <iframe
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        src={simpleUrl}
        title="Mapa de ruta"
      />
    </div>
  );
}

// ============================================
// COMPONENTE: AnalisisNormativa
// ============================================

function AnalisisNormativa({
  paradas,
  fechaInicio,
  horaInicio,
  fechaFin,
  horaFin,
  numeroVehiculos
}: {
  paradas: Parada[];
  fechaInicio: string;
  horaInicio: string;
  fechaFin?: string;
  horaFin?: string;
  numeroVehiculos?: number;
}) {
  if (!fechaInicio || !horaInicio) return null;

  const fi = new Date(`${fechaInicio}T${horaInicio || '00:00'}`);
  const ff = fechaFin && horaFin ? new Date(`${fechaFin}T${horaFin}`) : new Date(fi.getTime() + 8 * 60 * 60 * 1000);
  const duracionHoras = Math.max(1, differenceInHours(ff, fi));
  const descansos = paradas.filter(p => p.tipo === 'descanso').length;
  const paradasCount = paradas.filter(p => p.tipo === 'parada').length;

  // Normativa RD 261/2022
  const TIEMPO_MAXIMO_CONDUCCION = 9; // horas diarias
  const DESCANSO_MINIMO = 11; // horas entre jornadas
  const NECESITA_DOS_CONDUCTORES = duracionHoras > TIEMPO_MAXIMO_CONDUCCION && descansos === 0;
  const conductoresNecesarios = NECESITA_DOS_CONDUCTORES ? 2 : 1;
  const pernocta = duracionHoras > 24;
  const nv = numeroVehiculos || 1;
  const totalConductores = conductoresNecesarios * nv;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-2 bg-slate-50 dark:bg-slate-900/30">
      <h4 className="font-medium text-sm flex items-center gap-1.5 dark:text-slate-300">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        Analisis Normativa (RD 261/2022)
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div><p className="text-xs text-slate-500 dark:text-slate-400">Duracion</p><p className="font-semibold dark:text-slate-200">{duracionHoras}h</p></div>
        <div><p className="text-xs text-slate-500 dark:text-slate-400">Descansos</p><p className="font-semibold dark:text-slate-200">{descansos} programados</p></div>
        <div><p className="text-xs text-slate-500 dark:text-slate-400">Paradas</p><p className="font-semibold dark:text-slate-200">{paradasCount}</p></div>
        <div><p className="text-xs text-slate-500 dark:text-slate-400">Max conduccion</p><p className={`font-semibold ${duracionHoras > TIEMPO_MAXIMO_CONDUCCION ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{TIEMPO_MAXIMO_CONDUCCION}h/dia</p></div>
      </div>

      {NECESITA_DOS_CONDUCTORES && (
        <div className="flex items-start gap-2 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-700 dark:text-red-300">
            <strong>Atencion:</strong> La duracion ({duracionHoras}h) supera las {TIEMPO_MAXIMO_CONDUCCION}h maximas de conduccion diaria.
            Se necesitan <strong>{conductoresNecesarios} conductores por vehiculo</strong> = {totalConductores} conductores total.
            {!pernocta && ' Considera anadir un descanso obligatorio.'}
          </p>
        </div>
      )}

      {pernocta && (
        <div className="flex items-start gap-2 p-2 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
          <Clock className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            <strong>Pernocta detectada:</strong> El servicio dura mas de 24h. Se anadira el coste de alojamiento al presupuesto.
          </p>
        </div>
      )}

      {!NECESITA_DOS_CONDUCTORES && !pernocta && (
        <div className="flex items-start gap-2 p-2 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700">
          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-green-700 dark:text-green-300">
            <strong>OK:</strong> El servicio cumple la normativa. {conductoresNecesarios} conductor por vehiculo = {totalConductores} total.
          </p>
        </div>
      )}

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Referencia: <a href="https://www.mitma.gob.es/transporte-terrestre/transporte-por-carretera/ordenanza-de-transporte" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">MITMA - Ordenanza de Transporte RD 261/2022</a>
      </p>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function Servicios() {
  const { servicios, isLoading, addServicio, deleteServicio, fetchServicios } = useServiciosStore();
  const { clientes, fetchClientes } = useClientesStore();
  const { conductores, fetchConductores } = useConductoresStore();
  const { vehiculos, fetchVehiculos } = useVehiculosStore();
  const { showToast } = useUIStore();

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoServicio | 'todos'>('todos');
  const [tipoFiltro, setTipoFiltro] = useState<string>('todos');
  const [vistaMode, setVistaMode] = useState<'lista' | 'cards'>('cards');
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null);
  const [isNuevoOpen, setIsNuevoOpen] = useState(false);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const [isEditarOpen, setIsEditarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Wizard
  const [wizardStep, setWizardStep] = useState(1);

  // Auto-asignacion
  const [autoConductor, setAutoConductor] = useState(false);
  const [autoVehiculo, setAutoVehiculo] = useState(false);
  const [incluirCoordinador, setIncluirCoordinador] = useState(false);

  // Buscador cliente
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteSearchOpen, setClienteSearchOpen] = useState(false);
  const [clienteSeleccionadoForm, setClienteSeleccionadoForm] = useState<{id: string; nombre: string} | null>(null);

  // Tipo personalizado
  const [tipoServicio, setTipoServicio] = useState<string>('lanzadera');
  const [tipoPersonalizado, setTipoPersonalizado] = useState('');

  // Paradas
  const [paradas, setParadas] = useState<Parada[]>([
    { id: 'p-origen', tipo: 'origen', ubicacion: '', hora: '', notas: '' },
    { id: 'p-destino', tipo: 'destino', ubicacion: '', hora: '', notas: '' },
  ]);

  const [nuevoServicio, setNuevoServicio] = useState<Partial<Servicio> & Record<string, any>>({
    estado: 'planificando', numeroVehiculos: 1,
    fechaInicio: format(new Date(), 'yyyy-MM-dd'), fechaFin: '',
    horaInicio: '', horaFin: '', titulo: '', descripcion: '',
  });

  useEffect(() => { fetchServicios(); fetchClientes(); fetchConductores(); fetchVehiculos(); }, [fetchServicios, fetchClientes, fetchConductores, fetchVehiculos]);

  const conductorDisp = useMemo(() => conductores.find(c => c.estado === 'activo'), [conductores]);
  const vehiculoDisp = useMemo(() => vehiculos.find(v => v.estado === 'operativo'), [vehiculos]);

  const costesEstimados = useMemo(() => {
    if (!nuevoServicio.fechaInicio || !nuevoServicio.horaInicio) return null;
    const fi = new Date(`${nuevoServicio.fechaInicio}T${nuevoServicio.horaInicio || '00:00'}`);
    const ff = nuevoServicio.fechaFin && nuevoServicio.horaFin
      ? new Date(`${nuevoServicio.fechaFin}T${nuevoServicio.horaFin}`)
      : new Date(fi.getTime() + 8 * 60 * 60 * 1000);
    const horas = Math.max(1, differenceInHours(ff, fi));
    const nv = nuevoServicio.numeroVehiculos || 1;
    const costeCond = TARIFA_CONDUCTOR_HORA * horas * nv;
    const costeCoord = incluirCoordinador ? TARIFA_COORDINADOR_HORA * horas : 0;
    const costeGasoil = (CONSUMO_LITROS_100KM / 100) * 100 * PRECIO_GASOIL_LITRO * nv;
    return {
      horas, costeConductor: Math.round(costeCond), costeCoordinador: Math.round(costeCoord),
      costeGasoil, total: Math.round(costeCond + costeCoord + costeGasoil),
      detalle: `${horas}h x ${nv} veh`
    };
  }, [nuevoServicio, incluirCoordinador]);

  const stats = useMemo(() => ({
    activos: servicios.filter(s => ['planificando','asignado','en_curso'].includes(s.estado)).length,
    pendientes: servicios.filter(s => ['solicitud','presupuesto','negociacion'].includes(s.estado)).length,
    completados: servicios.filter(s => s.estado === 'completado').length,
    totalFacturacion: servicios.filter(s => s.estado === 'facturado').reduce((sum, s) => sum + (s.precio || 0), 0),
  }), [servicios]);

  const filtrados = useMemo(() => servicios.filter(s => {
    const sq = searchQuery.toLowerCase().trim();
    const ms = sq === '' || s.titulo?.toLowerCase().includes(sq) || s.codigo?.toLowerCase().includes(sq) || s.clienteNombre?.toLowerCase().includes(sq);
    return ms && (estadoFiltro === 'todos' || s.estado === estadoFiltro) && (tipoFiltro === 'todos' || s.tipo === tipoFiltro);
  }), [servicios, searchQuery, estadoFiltro, tipoFiltro]);

  // Clientes filtrados para buscador
  const clientesFiltrados = useMemo(() => {
    const sq = clienteSearch.toLowerCase().trim();
    if (sq.length < 2) return [];
    return clientes.filter(c =>
      c.nombre?.toLowerCase().includes(sq) ||
      c.contacto?.email?.toLowerCase().includes(sq) ||
      c.nif?.toLowerCase().includes(sq)
    ).slice(0, 8);
  }, [clienteSearch, clientes]);

  const resetWizard = () => {
    setIsNuevoOpen(false);
    setWizardStep(1);
    setNuevoServicio({ estado: 'planificando', numeroVehiculos: 1, fechaInicio: format(new Date(), 'yyyy-MM-dd'), fechaFin: '', horaInicio: '', horaFin: '', titulo: '', descripcion: '' });
    setAutoConductor(false); setAutoVehiculo(false); setIncluirCoordinador(false);
    setClienteSearch(''); setClienteSeleccionadoForm(null); setClienteSearchOpen(false);
    setTipoServicio('lanzadera'); setTipoPersonalizado('');
    setParadas([{ id: 'p-origen', tipo: 'origen', ubicacion: '', hora: '', notas: '' }, { id: 'p-destino', tipo: 'destino', ubicacion: '', hora: '', notas: '' }]);
  };

  // ============================================
  // VALIDACION POR PASO
  // ============================================

  const validarPaso1 = (): boolean => {
    if (!clienteSeleccionadoForm) { showToast('Selecciona un cliente', 'error'); return false; }
    if (!nuevoServicio.titulo?.trim()) { showToast('El titulo es obligatorio', 'error'); return false; }
    const tipoFinal = tipoServicio === '__otro__' ? tipoPersonalizado.trim() || 'otro' : tipoServicio;
    if (tipoServicio === '__otro__' && !tipoPersonalizado.trim()) { showToast('Escribe un tipo de servicio', 'error'); return false; }
    return true;
  };

  const validarPaso2 = (): boolean => {
    if (!nuevoServicio.fechaInicio) { showToast('La fecha de inicio es obligatoria', 'error'); return false; }
    if (!nuevoServicio.horaInicio) { showToast('La hora de inicio es obligatoria', 'error'); return false; }
    const origen = paradas.find(p => p.tipo === 'origen');
    if (!origen?.ubicacion.trim()) { showToast('El origen es obligatorio', 'error'); return false; }
    return true;
  };

  // ============================================
  // NAVEGACION WIZARD
  // ============================================

  const avanzarPaso = () => {
    if (wizardStep === 1 && !validarPaso1()) return;
    if (wizardStep === 2 && !validarPaso2()) return;
    if (wizardStep < 3) setWizardStep(wizardStep + 1);
  };

  const retrocederPaso = () => {
    if (wizardStep > 1) setWizardStep(wizardStep - 1);
  };

  // ============================================
  // SUBMIT - SOLO EN PASO 3
  // ============================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (wizardStep !== 3) return; // Seguridad: solo paso 3 crea

    setIsSubmitting(true);
    try {
      const tipoFinal = tipoServicio === '__otro__' ? (tipoPersonalizado.trim() || 'otro') : tipoServicio;
      const success = await addServicio({
        codigo: `SRV-${Date.now().toString().slice(-6)}`,
        clienteId: clienteSeleccionadoForm!.id,
        clienteNombre: clienteSeleccionadoForm!.nombre,
        tipo: tipoFinal as TipoServicio,
        estado: 'planificando',
        titulo: nuevoServicio.titulo,
        descripcion: nuevoServicio.descripcion,
        fechaInicio: new Date(`${nuevoServicio.fechaInicio}T${nuevoServicio.horaInicio || '00:00'}`).toISOString(),
        fechaFin: nuevoServicio.fechaFin ? new Date(`${nuevoServicio.fechaFin}T${nuevoServicio.horaFin || '23:59'}`).toISOString() : null,
        horaInicio: nuevoServicio.horaInicio,
        horaFin: nuevoServicio.horaFin,
        origen: paradas.find(p => p.tipo === 'origen')?.ubicacion || '',
        destino: paradas.find(p => p.tipo === 'destino')?.ubicacion || '',
        numeroVehiculos: nuevoServicio.numeroVehiculos || 1,
        vehiculosAsignados: autoVehiculo && vehiculoDisp ? [String(vehiculoDisp.id)] : [],
        conductoresAsignados: autoConductor && conductorDisp ? [String(conductorDisp.id)] : [],
        precio: nuevoServicio.precio || 0,
        costeEstimado: costesEstimados?.total || 0,
        costeReal: null,
        facturado: false,
        notasInternas: `Paradas: ${paradas.map(p => `${p.tipo}:${p.ubicacion}`).join(' | ')}. Auto-calc: ${costesEstimados?.detalle || 'N/A'}`,
        tareas: [
          { id: `t${Date.now()}-1`, nombre: 'Recopilar informacion del evento', completada: false },
          { id: `t${Date.now()}-2`, nombre: 'Planificar rutas', completada: false },
          { id: `t${Date.now()}-3`, nombre: 'Asignar conductores', completada: autoConductor },
          { id: `t${Date.now()}-4`, nombre: 'Preparar vehiculos', completada: autoVehiculo },
          { id: `t${Date.now()}-5`, nombre: 'Confirmar detalles con cliente', completada: false },
        ],
      });
      if (success) { resetWizard(); showToast('Servicio creado correctamente', 'success'); }
      else showToast('Error al crear el servicio', 'error');
    } catch (err: any) { showToast(`Error: ${err.message || 'Desconocido'}`, 'error'); }
    finally { setIsSubmitting(false); }
  };

  // ============================================
  // PARADAS
  // ============================================

  const addParada = (index: number) => {
    const nuevaParada: Parada = { id: `p-${Date.now()}`, tipo: 'parada', ubicacion: '', hora: '', notas: '' };
    const nuevas = [...paradas];
    nuevas.splice(index + 1, 0, nuevaParada);
    setParadas(nuevas);
  };

  const addDescanso = (index: number) => {
    const nuevaParada: Parada = { id: `p-${Date.now()}`, tipo: 'descanso', ubicacion: '', hora: '', notas: 'Descanso obligatorio (RD 261/2022)' };
    const nuevas = [...paradas];
    nuevas.splice(index + 1, 0, nuevaParada);
    setParadas(nuevas);
  };

  const removeParada = (id: string) => {
    setParadas(p => p.filter(x => x.id !== id));
  };

  const updateParada = (id: string, field: keyof Parada, value: string) => {
    setParadas(p => p.map(x => x.id === id ? { ...x, [field]: value } : x));
  };

  const handleEliminar = async (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Eliminar este servicio?')) return;
    try { if (await deleteServicio(String(id))) { showToast('Eliminado', 'success'); if (servicioSeleccionado?.id === String(id)) { setIsDetalleOpen(false); setServicioSeleccionado(null); } } }
    catch (err: any) { showToast(`Error: ${err.message}`, 'error'); }
  };

  const getProgreso = useCallback((s: Servicio) => s.tareas?.length ? Math.round((s.tareas.filter(t => t.completada).length / s.tareas.length) * 100) : 0, []);
  const getMargen = useCallback((s: Servicio) => (s.precio || 0) - (s.costeEstimado || 0), []);

  if (isLoading && servicios.length === 0) return <SkeletonPage type="mixed" tableCols={7} vistaMode={vistaMode} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Servicios</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Gestion de proyectos de transporte</p>
        </div>
        <Button onClick={() => { resetWizard(); setWizardStep(1); setIsNuevoOpen(true); }} className="bg-[#1e3a5f] hover:bg-[#152a45] shadow-sm dark:bg-blue-600 dark:hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Servicio
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Activos', value: stats.activos, icon: TrendingUp, color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' },
          { label: 'Pendientes', value: stats.pendientes, icon: Clock, color: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' },
          { label: 'Completados', value: stats.completados, icon: CheckCircle2, color: 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400' },
          { label: 'Facturacion', value: `${stats.totalFacturacion.toLocaleString()} EUR`, icon: DollarSign, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' },
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
          <Input placeholder="Buscar servicio..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 dark:bg-slate-900 dark:border-slate-700" />
        </div>
        <div className="flex gap-2">
          <Select value={estadoFiltro} onValueChange={(v) => setEstadoFiltro(v as EstadoServicio | 'todos')}>
            <SelectTrigger className="w-[160px] dark:bg-slate-900 dark:border-slate-700"><SelectValue /></SelectTrigger>
            <SelectContent>{ESTADOS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
            <SelectTrigger className="w-[140px] dark:bg-slate-900 dark:border-slate-700"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {TIPOS_SERVICIO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              <SelectItem value="otro">Otro</SelectItem>
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
              <FileText className="h-12 w-12 mb-3" /><p className="text-sm">No hay servicios</p>
            </div>
          ) : filtrados.map(s => {
            const progreso = getProgreso(s);
            const margen = getMargen(s);
            const estadoConfig = ESTADOS.find(e => e.value === s.estado);
            return (
              <div key={s.id} onClick={() => { setServicioSeleccionado(s); setIsDetalleOpen(true); }}
                className="group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="font-mono text-xs text-[#1e3a5f] dark:text-blue-400 font-semibold">{s.codigo}</span>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 line-clamp-1">{s.titulo}</h3>
                  </div>
                  <Badge className={estadoConfig?.color || ''}>{estadoConfig?.label || s.estado}</Badge>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> {s.clienteNombre || 'Sin cliente'}
                </p>
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-3">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {s.fechaInicio ? format(new Date(s.fechaInicio), 'dd/MM/yyyy') : '-'}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {s.origen || '-'} {s.destino ? `-> ${s.destino}` : ''}</span>
                </div>
                {s.tareas && s.tareas.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500 dark:text-slate-400">Progreso</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{progreso}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1e3a5f] dark:bg-blue-500 rounded-full transition-all" style={{ width: `${progreso}%` }} />
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="text-sm">
                    <span className="text-slate-500 dark:text-slate-400">{(s.precio || 0).toLocaleString()} EUR</span>
                    {margen !== 0 && <span className={`ml-2 text-xs ${margen >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{margen >= 0 ? '+' : ''}{margen.toLocaleString()} EUR</span>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setServicioSeleccionado(s); setIsDetalleOpen(true); }}><Eye className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setServicioSeleccionado(s); setIsEditarOpen(true); }}><Edit3 className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={(e) => handleEliminar(s.id, e)}><Trash2 className="h-4 w-4" /></Button>
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
                <tr><th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Codigo</th><th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Titulo</th><th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Cliente</th><th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Estado</th><th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Fecha</th><th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 text-right">Precio</th><th className="px-4 py-3"></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtrados.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500"><FileText className="h-10 w-10 mx-auto mb-2" />No hay servicios</td></tr>
                ) : filtrados.map(s => {
                  const e = ESTADOS.find(x => x.value === s.estado);
                  return (
                    <tr key={s.id} onClick={() => { setServicioSeleccionado(s); setIsDetalleOpen(true); }} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[#1e3a5f] dark:text-blue-400">{s.codigo}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{s.titulo}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{s.clienteNombre}</td>
                      <td className="px-4 py-3"><Badge className={e?.color || ''}>{e?.label}</Badge></td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{s.fechaInicio ? format(new Date(s.fechaInicio), 'dd/MM/yy') : '-'}</td>
                      <td className="px-4 py-3 text-right font-medium dark:text-slate-200">{(s.precio || 0).toLocaleString()} EUR</td>
                      <td className="px-4 py-3"><div className="flex gap-1 justify-end"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={(ev) => { ev.stopPropagation(); setServicioSeleccionado(s); setIsDetalleOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" className="h-7 w-7" onClick={(ev) => { ev.stopPropagation(); setServicioSeleccionado(s); setIsEditarOpen(true); }}><Edit3 className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={(ev) => handleEliminar(s.id, ev)}><Trash2 className="h-3.5 w-3.5" /></Button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* DIALOG: Wizard Nuevo Servicio                */}
      {/* ============================================ */}
      <Dialog open={isNuevoOpen} onOpenChange={(open) => { if (!open) resetWizard(); }}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">Nuevo Servicio</DialogTitle>
            <DialogDescription className="dark:text-slate-400">Paso {wizardStep} de 3</DialogDescription>
          </DialogHeader>

          {/* Steps indicator */}
          <div className="flex items-center gap-2 mb-4">
            {['Informacion Basica', 'Fechas y Ruta', 'Asignacion y Precio'].map((label, i) => {
              const step = i + 1;
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                    step === wizardStep ? 'bg-[#1e3a5f] text-white' : step < wizardStep ? 'bg-green-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    {step < wizardStep ? <CheckCircle2 className="h-4 w-4" /> : step}
                  </div>
                  <span className={`ml-2 text-xs font-medium hidden sm:inline ${step === wizardStep ? 'text-[#1e3a5f] dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>{label}</span>
                  {step < 3 && <ChevronRight className="h-4 w-4 mx-2 text-slate-300 dark:text-slate-600" />}
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSubmit}>
            {/* ============================================ */}
            {/* PASO 1: Informacion Basica                   */}
            {/* ============================================ */}
            {wizardStep === 1 && (
              <div className="space-y-4 py-2">
                {/* Buscador de cliente */}
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  {clienteSeleccionadoForm ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="flex-1 font-medium dark:text-slate-200">{clienteSeleccionadoForm.nombre}</span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => { setClienteSeleccionadoForm(null); setClienteSearch(''); }}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Buscar cliente por nombre, email o NIF..."
                        value={clienteSearch}
                        onChange={e => { setClienteSearch(e.target.value); setClienteSearchOpen(e.target.value.length >= 2); }}
                        onFocus={() => clienteSearch.length >= 2 && setClienteSearchOpen(true)}
                        className="pl-10 dark:bg-slate-900 dark:border-slate-600"
                      />
                      {clienteSearchOpen && (
                        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
                          {clientesFiltrados.length > 0 ? (
                            <div className="py-1 max-h-60 overflow-auto">
                              {clientesFiltrados.map(c => (
                                <button key={c.id} type="button"
                                  onClick={() => { setClienteSeleccionadoForm({ id: String(c.id), nombre: c.nombre }); setClienteSearchOpen(false); setClienteSearch(c.nombre); }}
                                  className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm dark:text-slate-200"
                                >
                                  <p className="font-medium">{c.nombre}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">{c.contacto?.email || c.nif || ''}</p>
                                </button>
                              ))}
                            </div>
                          ) : clienteSearch.length >= 2 ? (
                            <div className="p-3 text-center">
                              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">No se encontraron clientes</p>
                              <Link to="/crm" onClick={() => setIsNuevoOpen(false)}>
                                <Button type="button" size="sm" variant="outline" className="dark:border-slate-600">
                                  <Plus className="mr-1 h-3.5 w-3.5" /> Crear cliente
                                </Button>
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Tipo de servicio */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo *</Label>
                    <Select value={tipoServicio} onValueChange={setTipoServicio}>
                      <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIPOS_SERVICIO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        <SelectItem value="__otro__">+ Otro tipo...</SelectItem>
                      </SelectContent>
                    </Select>
                    {tipoServicio === '__otro__' && (
                      <div className="mt-2 p-3 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
                        <Label className="text-sm text-blue-700 dark:text-blue-300">Tipo personalizado</Label>
                        <Input
                          value={tipoPersonalizado}
                          onChange={e => setTipoPersonalizado(e.target.value)}
                          placeholder="Ej: Transporte sanitario"
                          className="mt-1 dark:bg-slate-900 dark:border-slate-600"
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2"><Label>Num. Vehiculos</Label>
                    <Input type="number" min={1} max={20}
                      value={nuevoServicio.numeroVehiculos || 1}
                      onChange={e => setNuevoServicio(p => ({...p, numeroVehiculos: parseInt(e.target.value) || 1}))}
                      className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Titulo *</Label>
                  <Input value={nuevoServicio.titulo || ''} onChange={e => setNuevoServicio(p => ({...p, titulo: e.target.value}))}
                    placeholder="Ej: Transporte evento corporativo" className="dark:bg-slate-900 dark:border-slate-600" />
                </div>
                <div className="space-y-2">
                  <Label>Descripcion</Label>
                  <Textarea value={nuevoServicio.descripcion || ''} onChange={e => setNuevoServicio(p => ({...p, descripcion: e.target.value}))}
                    placeholder="Detalles del servicio..." rows={3} className="dark:bg-slate-900 dark:border-slate-600" />
                </div>
              </div>
            )}

            {/* ============================================ */}
            {/* PASO 2: Fechas y Ruta (con paradas)          */}
            {/* ============================================ */}
            {wizardStep === 2 && (
              <div className="space-y-4 py-2">
                {/* Fechas */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Fecha Inicio *</Label>
                    <Input type="date" value={String(nuevoServicio.fechaInicio || '')}
                      onChange={e => setNuevoServicio(p => ({...p, fechaInicio: e.target.value}))}
                      className="dark:bg-slate-900 dark:border-slate-600" /></div>
                  <div className="space-y-2"><Label>Hora Inicio *</Label>
                    <Input type="time" value={String(nuevoServicio.horaInicio || '')}
                      onChange={e => setNuevoServicio(p => ({...p, horaInicio: e.target.value}))}
                      className="dark:bg-slate-900 dark:border-slate-600" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Fecha Fin</Label>
                    <Input type="date" value={String(nuevoServicio.fechaFin || '')}
                      onChange={e => setNuevoServicio(p => ({...p, fechaFin: e.target.value}))}
                      className="dark:bg-slate-900 dark:border-slate-600" /></div>
                  <div className="space-y-2"><Label>Hora Fin</Label>
                    <Input type="time" value={String(nuevoServicio.horaFin || '')}
                      onChange={e => setNuevoServicio(p => ({...p, horaFin: e.target.value}))}
                      className="dark:bg-slate-900 dark:border-slate-600" /></div>
                </div>

                {/* Paradas / Ruta */}
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Route className="h-4 w-4 text-[#1e3a5f] dark:text-blue-400" />
                    <h4 className="font-medium text-sm dark:text-slate-300">Hoja de Ruta</h4>
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">(Se integrara con Google Maps)</span>
                  </div>

                  {paradas.map((parada, idx) => (
                    <div key={parada.id} className={`rounded-lg border p-3 space-y-2 ${
                      parada.tipo === 'origen' ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20' :
                      parada.tipo === 'destino' ? 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20' :
                      parada.tipo === 'descanso' ? 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20' :
                      'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Badge className={
                          parada.tipo === 'origen' ? 'bg-green-100 text-green-700' :
                          parada.tipo === 'destino' ? 'bg-red-100 text-red-700' :
                          parada.tipo === 'descanso' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }>{parada.tipo === 'origen' ? 'Origen' : parada.tipo === 'destino' ? 'Destino' : parada.tipo === 'descanso' ? 'Descanso' : `Parada ${idx}`}</Badge>
                        {parada.tipo !== 'origen' && parada.tipo !== 'destino' && (
                          <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0 ml-auto" onClick={() => removeParada(parada.id)}>
                            <X className="h-3 w-3 text-red-500" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Ubicacion / Direccion" value={parada.ubicacion}
                          onChange={e => updateParada(parada.id, 'ubicacion', e.target.value)}
                          className="dark:bg-slate-900 dark:border-slate-600" />
                        <Input type="time" placeholder="Hora" value={parada.hora}
                          onChange={e => updateParada(parada.id, 'hora', e.target.value)}
                          className="dark:bg-slate-900 dark:border-slate-600" />
                      </div>
                      {parada.tipo === 'descanso' && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Descanso obligatorio segun normativa RD 261/2022
                        </p>
                      )}
                      {/* Botones para anadir despues de esta parada */}
                      {idx < paradas.length - 1 && (
                        <div className="flex gap-2 pt-1">
                          <Button type="button" size="sm" variant="outline" onClick={() => addParada(idx)}
                            className="h-7 text-xs dark:border-slate-600">
                            <Plus className="mr-1 h-3 w-3" /> Parada
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => addDescanso(idx)}
                            className="h-7 text-xs dark:border-slate-600">
                            <Clock className="mr-1 h-3 w-3" /> Descanso
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Boton anadir parada al final */}
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => addParada(paradas.length - 2)}
                      className="flex-1 dark:border-slate-600 dark:text-slate-300">
                      <Plus className="mr-1 h-4 w-4" /> Anadir parada
                    </Button>
                    <Button type="button" variant="outline" onClick={() => addDescanso(paradas.length - 2)}
                      className="flex-1 dark:border-slate-600 dark:text-slate-300">
                      <Clock className="mr-1 h-4 w-4" /> Anadir descanso
                    </Button>
                  </div>
                </div>

                {/* Google Maps */}
                <MapaRuta paradas={paradas} height={280} />

                {/* Analisis normativa */}
                <AnalisisNormativa
                  paradas={paradas}
                  fechaInicio={String(nuevoServicio.fechaInicio || '')}
                  horaInicio={String(nuevoServicio.horaInicio || '')}
                  fechaFin={String(nuevoServicio.fechaFin || '')}
                  horaFin={String(nuevoServicio.horaFin || '')}
                  numeroVehiculos={nuevoServicio.numeroVehiculos || 1}
                />
              </div>
            )}

            {/* ============================================ */}
            {/* PASO 3: Asignacion y Precio                  */}
            {/* ============================================ */}
            {wizardStep === 3 && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Precio (EUR) *</Label>
                    <Input type="number" min={0} value={nuevoServicio.precio || ''}
                      onChange={e => setNuevoServicio(p => ({...p, precio: parseFloat(e.target.value) || 0}))}
                      placeholder="0" className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Dias de pago</Label>
                    <Input type="number" min={0}
                      value={nuevoServicio.diasPago || 30}
                      onChange={e => setNuevoServicio(p => ({...p, diasPago: parseInt(e.target.value) || 30}))}
                      className="dark:bg-slate-900 dark:border-slate-600" />
                  </div>
                </div>

                {/* Auto-asignacion */}
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                  <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300">Auto-asignacion</h4>
                  <div className="flex items-center gap-3">
                    <Checkbox id="autoCond" checked={autoConductor} onCheckedChange={v => setAutoConductor(v === true)} />
                    <label htmlFor="autoCond" className="text-sm dark:text-slate-300">Asignar conductor disponible {conductorDisp ? `(${conductorDisp.nombre} ${conductorDisp.apellidos || ''})` : '(no hay)'}</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox id="autoVeh" checked={autoVehiculo} onCheckedChange={v => setAutoVehiculo(v === true)} />
                    <label htmlFor="autoVeh" className="text-sm dark:text-slate-300">Asignar vehiculo disponible {vehiculoDisp ? `(${vehiculoDisp.matricula})` : '(no hay)'}</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox id="coord" checked={incluirCoordinador} onCheckedChange={v => setIncluirCoordinador(v === true)} />
                    <label htmlFor="coord" className="text-sm dark:text-slate-300">Incluir coordinador (+{TARIFA_COORDINADOR_HORA} EUR/h)</label>
                  </div>
                </div>

                {/* Costes estimados */}
                {costesEstimados && (
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4">
                    <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300 mb-2">Coste Estimado</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div><p className="text-slate-500 dark:text-slate-400 text-xs">Conductor</p><p className="font-semibold dark:text-slate-200">{costesEstimados.costeConductor} EUR</p></div>
                      <div><p className="text-slate-500 dark:text-slate-400 text-xs">Gasoil</p><p className="font-semibold dark:text-slate-200">{costesEstimados.costeGasoil.toFixed(0)} EUR</p></div>
                      {incluirCoordinador && <div><p className="text-slate-500 dark:text-slate-400 text-xs">Coordinador</p><p className="font-semibold dark:text-slate-200">{costesEstimados.costeCoordinador} EUR</p></div>}
                      <div><p className="text-slate-500 dark:text-slate-400 text-xs">Total estimado</p><p className="font-bold text-[#1e3a5f] dark:text-blue-400">{costesEstimados.total} EUR</p></div>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{costesEstimados.detalle}</p>
                  </div>
                )}
              </div>
            )}

            {/* Botones navegacion */}
            <div className="flex justify-between pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
              <Button type="button" variant="outline"
                onClick={() => wizardStep === 1 ? resetWizard() : retrocederPaso()}
                disabled={isSubmitting} className="dark:border-slate-600 dark:text-slate-300">
                {wizardStep === 1 ? 'Cancelar' : 'Anterior'}
              </Button>
              {wizardStep < 3 ? (
                <Button type="button" onClick={avanzarPaso} className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600">
                  Siguiente <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting} className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600">
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando...</> : 'Crear Servicio'}
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* DIALOG: Detalle con Chat                     */}
      {/* ============================================ */}
      <Dialog open={isDetalleOpen} onOpenChange={setIsDetalleOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">Detalle del Servicio</DialogTitle>
          </DialogHeader>
          {servicioSeleccionado && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-[#1e3a5f] dark:text-blue-400">{servicioSeleccionado.codigo}</span>
                <Badge className={ESTADOS.find(e => e.value === servicioSeleccionado.estado)?.color || ''}>
                  {ESTADOS.find(e => e.value === servicioSeleccionado.estado)?.label}
                </Badge>
              </div>
              <h3 className="text-lg font-semibold dark:text-slate-100">{servicioSeleccionado.titulo}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-slate-500 dark:text-slate-400">Cliente</p>
                  <Link to="/crm" className="font-medium dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />{servicioSeleccionado.clienteNombre}
                  </Link>
                </div>
                <div><p className="text-slate-500 dark:text-slate-400">Tipo</p><p className="font-medium dark:text-slate-200 capitalize">{servicioSeleccionado.tipo?.replace('_', ' ') || '-'}</p></div>
                <div><p className="text-slate-500 dark:text-slate-400">Fecha</p><p className="font-medium dark:text-slate-200">{servicioSeleccionado.fechaInicio ? format(new Date(servicioSeleccionado.fechaInicio), 'dd/MM/yyyy HH:mm') : '-'}</p></div>
                <div><p className="text-slate-500 dark:text-slate-400">Precio</p><p className="font-bold text-[#1e3a5f] dark:text-blue-400">{(servicioSeleccionado.precio || 0).toLocaleString()} EUR</p></div>
              </div>
              {servicioSeleccionado.descripcion && (
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-3"><p className="text-sm dark:text-slate-300">{servicioSeleccionado.descripcion}</p></div>
              )}

              {/* Chat integrado */}
              <ChatIntegrado servicioId={String(servicioSeleccionado.id)} />

              {/* Tareas */}
              {servicioSeleccionado.tareas && servicioSeleccionado.tareas.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 dark:text-slate-300">Tareas ({getProgreso(servicioSeleccionado)}%)</h4>
                  <div className="space-y-1">
                    {servicioSeleccionado.tareas.map(t => (
                      <div key={t.id} className={`flex items-center gap-2 text-sm ${t.completada ? 'text-green-600 dark:text-green-400 line-through' : 'text-slate-600 dark:text-slate-400'}`}>
                        {t.completada ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        {t.nombre}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => { setIsDetalleOpen(false); setIsEditarOpen(true); }} className="dark:border-slate-600 dark:text-slate-300">Editar</Button>
                {!servicioSeleccionado.facturado && servicioSeleccionado.estado === 'completado' && (
                  <Button asChild className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600"><Link to="/facturacion">Facturar</Link></Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* DIALOG: Editar (simplificado)                */}
      {/* ============================================ */}
      <Dialog open={isEditarOpen} onOpenChange={setIsEditarOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader><DialogTitle className="dark:text-slate-100">Editar Servicio</DialogTitle></DialogHeader>
          {servicioSeleccionado && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Titulo</Label>
                  <Input defaultValue={servicioSeleccionado.titulo} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                <div className="space-y-2"><Label>Estado</Label>
                  <Select defaultValue={servicioSeleccionado.estado}>
                    <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ESTADOS.filter(e => e.value !== 'todos').map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Precio</Label>
                  <Input type="number" defaultValue={servicioSeleccionado.precio || 0} className="dark:bg-slate-900 dark:border-slate-600" /></div>
                <div className="space-y-2"><Label>Num. Vehiculos</Label>
                  <Input type="number" defaultValue={servicioSeleccionado.numeroVehiculos || 1} className="dark:bg-slate-900 dark:border-slate-600" /></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsEditarOpen(false)} className="dark:border-slate-600 dark:text-slate-300">Cancelar</Button>
                <Button onClick={() => { showToast('Servicio actualizado', 'success'); setIsEditarOpen(false); }} className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600">Guardar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
