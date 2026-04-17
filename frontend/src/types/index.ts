// ============================================
// MILANO - Sistema de Gestión de Transporte
// Tipos TypeScript (ACTUALIZADO Y COMPLETO)
// ============================================

// ============================================
// TIPOS BASE
// ============================================

export type TipoCliente = 'festival' | 'promotor' | 'colegio' | 'empresa' | 'particular';
export type TipoServicio = 'lanzadera' | 'discrecional' | 'staff' | 'ruta_programada';
export type EstadoServicio = 'solicitud' | 'presupuesto' | 'negociacion' | 'confirmado' | 'planificando' | 'asignado' | 'en_curso' | 'completado' | 'facturado' | 'cancelado';
export type TipoVehiculo = 'autobus' | 'minibus' | 'furgoneta' | 'coche';
export type EstadoVehiculo = 'operativo' | 'taller' | 'baja' | 'reservado';
export type EstadoConductor = 'activo' | 'baja' | 'vacaciones' | 'descanso' | 'inactivo' | 'en_ruta';
export type EstadoFactura = 'pendiente' | 'enviada' | 'pagada' | 'vencida' | 'anulada';
export type EstadoOportunidad = 'nueva' | 'contactado' | 'presupuesto_enviado' | 'negociacion' | 'ganada' | 'perdida';

// ============================================
// CONSTANTES DE CÁLCULO (NUEVO)
// ============================================

export const CONSUMO_LITROS_100KM = 35;
export const PRECIO_GASOIL_LITRO = 1.6;
export const COSTE_KM_CONDUCTOR = 0.5;
export const TARIFA_CONDUCTOR_HORA = 18;
export const TARIFA_COORDINADOR_HORA = 25;

// ============================================
// CLIENTE
// ============================================

export interface Contacto {
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  codigoPostal?: string;
}

// FIX: codigo opcional para permitir generación automática
export interface Cliente {
  id: string;
  codigo?: string;
  nombre: string;
  razonSocial?: string;
  tipo: TipoCliente;
  contacto: Contacto;
  nif?: string;
  condicionesEspeciales?: string;
  formaPago?: string;
  diasPago?: number;
  fechaAlta: Date | string;
  fechaActualizacion?: Date | string;
  estado: 'activo' | 'inactivo';
  notas?: string;
  totalServicios?: number;
  totalFacturado?: number;
  ultimoServicio?: Date | string;
  historialServicios?: string[];
  documentos?: Documento[];
}

export interface CreateClienteData {
  nombre: string;
  tipo?: TipoCliente;
  contacto?: Contacto;
  nif?: string;
  condicionesEspeciales?: string;
  formaPago?: string;
  diasPago?: number;
  estado?: 'activo' | 'inactivo';
  notas?: string;
}

export interface UpdateClienteData {
  nombre?: string;
  tipo?: TipoCliente;
  contacto?: Contacto;
  nif?: string;
  condicionesEspeciales?: string;
  formaPago?: string;
  diasPago?: number;
  estado?: 'activo' | 'inactivo';
  notas?: string;
}

// ============================================
// OPORTUNIDAD / CRM
// ============================================

export interface Oportunidad {
  id: string;
  codigo: string;
  titulo: string;
  clienteId: string;
  clienteNombre?: string;
  tipoServicio: TipoServicio;
  descripcion: string;
  fechaEvento: Date | string;
  ubicacion?: string;
  presupuestoEstimado: number;
  estado: EstadoOportunidad;
  probabilidad: number;
  fechaCreacion: Date | string;
  fechaCierreEstimada?: Date | string;
  fechaCierreReal?: Date | string;
  motivoPerdida?: string;
  asignadoA?: string;
  notas?: string;
}

// ============================================
// VEHÍCULO / FLOTA
// ============================================

export interface ITV {
  fechaUltima?: Date | string;  // FIX: Opcional
  fechaProxima?: Date | string;  // FIX: Opcional
  resultado?: 'favorable' | 'desfavorable' | 'negativo';
  observaciones?: string;
}

export interface Seguro {
  compania?: string;  // FIX: Opcional
  poliza?: string;  // FIX: Opcional
  tipoCobertura?: string;
  fechaInicio?: Date | string;  // FIX: Opcional
  fechaVencimiento?: Date | string;  // FIX: Opcional
  prima?: number;
}

export interface Mantenimiento {
  id: string;
  fecha: Date | string;
  tipo: 'preventivo' | 'correctivo' | 'itv' | 'otro';
  descripcion: string;
  kilometraje?: number;  // FIX: Opcional
  coste?: number;  // FIX: Opcional
  taller?: string;
  piezasCambiadas?: string[];
  proximoMantenimiento?: Date | string;
  observaciones?: string;
}

// FIX: codigo opcional, campos ITV/Seguro opcionales
export interface Vehiculo {
  id: string;
  codigo?: string;  // FIX: Opcional para generación automática
  matricula: string;
  bastidor?: string;  // FIX: Opcional
  marca?: string;  // FIX: Opcional
  modelo?: string;  // FIX: Opcional
  tipo: TipoVehiculo;
  plazas: number;
  añoFabricacion?: number;
  kilometraje?: number;  // FIX: Opcional
  kilometrajeUltimaRevision?: number;
  consumoMedio?: number;
  combustible?: 'diesel' | 'gasolina' | 'electric' | 'hibrido';
  itv?: ITV;  // FIX: Opcional
  seguro?: Seguro;  // FIX: Opcional
  mantenimientos?: Mantenimiento[];  // FIX: Opcional
  estado: EstadoVehiculo;
  ubicacion?: string;
  notas?: string;
  imagenUrl?: string;
}

// ============================================
// CONDUCTOR / RRHH
// ============================================

// FIX: Todos los campos opcionales para flexibilidad
export interface Licencia {
  tipo?: string;
  numero?: string;
  fechaExpedicion?: Date | string;
  fechaCaducidad?: Date | string;
  permisos?: string[];
}

// FIX: Todos los campos opcionales para flexibilidad
export interface Disponibilidad {
  dias?: number[];
  horaInicio?: string;
  horaFin?: string;
  observaciones?: string;
}

export interface CredencialesConductor {
  usuario: string;
  passwordHash?: string;
  ultimoAcceso?: Date | string;
  tokenReset?: string;
}

// FIX: codigo opcional, campos opcionales para formularios parciales
export interface Conductor {
  id: string;
  codigo?: string;  // FIX: Opcional para generación automática
  nombre: string;
  apellidos: string;
  dni: string;
  fechaNacimiento?: Date | string;
  fechaAlta?: Date | string;  // FIX: Opcional
  telefono?: string;
  email?: string;
  direccion?: string;
  licencia?: Licencia;
  tarifaHora?: number;
  prioridad?: number;
  disponibilidad?: Disponibilidad;
  credenciales?: CredencialesConductor;
  panelActivo?: boolean;
  documentos?: Documento[];
  estado: EstadoConductor;
  totalHorasMes?: number;
  totalServiciosMes?: number;
  valoracion?: number;
  notas?: string;
}

export interface Fichaje {
  id: string;
  conductorId: string;
  servicioId: string;
  fecha: Date | string;
  horaInicio: Date | string;
  horaFin?: Date | string;
  horasTrabajadas?: number;
  incidencias?: string;
  estado: 'pendiente' | 'completado' | 'validado';
  ubicacionInicio?: { lat: number; lng: number };
  ubicacionFin?: { lat: number; lng: number };
}

// ============================================
// RUTAS
// ============================================

export interface Parada {
  id: string;
  nombre: string;
  direccion: string;
  coordenadas?: { lat: number; lng: number };
  horaLlegada?: string;
  tiempoEspera?: number;
  notas?: string;
}

export interface Horario {
  id: string;
  horaSalida: string;
  horaLlegada: string;
  diasSemana: number[];
  fechaInicio?: Date | string;
  fechaFin?: Date | string;
  activo: boolean;
}

export interface Ruta {
  id: string;
  nombre: string;
  codigo?: string;
  servicioId: string;
  descripcion?: string;
  origen: string;
  destino: string;
  paradas: Parada[];
  distanciaKm: number;
  duracionEstimada: number;
  vehiculoAsignadoId?: string;
  conductorAsignadoId?: string;
  horarios: Horario[];
  planoRecogidaUrl?: string;
  notasConductor?: string;
  estado: 'activa' | 'inactiva' | 'completada';
}

// ============================================
// SERVICIOS
// ============================================

export interface GastoServicio {
  id: string;
  tipo: 'gasoil' | 'peaje' | 'aparcamiento' | 'otro';
  cantidad?: number;
  precio: number;
  precioUnitario?: number;
  notas?: string;
  ticket?: string;
  fecha: Date | string;
  conductorId?: string;
  aprobado?: boolean;
}

export interface RevisionVehiculo {
  id: string;
  tipo: 'limpieza' | 'neumaticos' | 'aceite' | 'luces' | 'carroceria' | 'otro';
  estado: 'ok' | 'ko' | 'na';
  notas?: string;
  fotos?: string[];
  fecha: Date | string;
  conductorId: string;
  vehiculoId?: string;
}

export interface TrackingRuta {
  kmInicio?: number;
  kmFin?: number;
  kmTotal?: number;
  rutaTomada?: string;
  duracionReal?: number;
  incidenciasRuta?: string;
}

export interface Incidencia {
  id: string;
  fecha: Date | string;
  tipo: 'retraso' | 'averia' | 'accidente' | 'conductor' | 'cliente' | 'trafico' | 'meteorologia' | 'otro';
  severidad: 'baja' | 'media' | 'alta' | 'critica';
  descripcion: string;
  reportadoPor: string;
  resuelta: boolean;
  fechaResolucion?: Date | string;
  solucion?: string;
  costeAdicional?: number;
}

export interface TareaServicio {
  id: string;
  nombre: string;
  descripcion?: string;
  completada: boolean;
  asignadaA?: string;
  fechaLimite?: Date | string;
  fechaCompletada?: Date | string;
  tipo?: 'conductor' | 'sistema' | 'coordinador';
}

// FIX: codigo opcional, arrays opcionales, campos tracking
export interface Servicio {
  id: string;
  codigo?: string;  // FIX: Opcional para generación automática
  clienteId: string;
  clienteNombre?: string;
  contactoCliente?: Contacto;
  tipo: TipoServicio;
  estado: EstadoServicio;
  fechaInicio: Date | string;
  fechaFin?: Date | string;  // FIX: Opcional
  horaInicio?: string;
  horaFin?: string;
  horaInicioReal?: Date | string;
  horaFinReal?: Date | string;
  horasReales?: number;
  titulo: string;
  descripcion?: string;
  numeroVehiculos?: number;  // FIX: Opcional
  vehiculosAsignados?: string[];  // FIX: Opcional
  conductoresAsignados?: string[];  // FIX: Opcional
  rutas?: Ruta[];  // FIX: Opcional
  origen?: string;
  destino?: string;
  ubicacionEvento?: string;
  costeEstimado?: number;  // FIX: Opcional
  costeReal?: number;
  precio?: number;  // FIX: Opcional
  margen?: number;
  facturado?: boolean;  // FIX: Opcional
  facturaId?: string;
  tareas?: TareaServicio[];  // FIX: Opcional
  incidencias?: Incidencia[];  // FIX: Opcional
  gastos?: GastoServicio[];
  revisiones?: RevisionVehiculo[];
  tracking?: TrackingRuta;
  kmInicio?: number;
  kmFin?: number;
  kmTotal?: number;
  rutaTomada?: string;
  contratoUrl?: string;
  documentos?: Documento[];  // FIX: Opcional
  notasInternas?: string;
  notasCliente?: string;
  fechaCreacion?: Date | string;  // FIX: Opcional
  creadoPor?: string;  // FIX: Opcional
  fechaModificacion?: Date | string;
}

// ============================================
// FACTURACIÓN
// ============================================

export interface ConceptoFactura {
  id: string;
  concepto: string;
  descripcion?: string;
  cantidad: number;
  unidad?: string;
  precioUnitario: number;
  descuento?: number;
  impuesto: number;
  total: number;
}

export interface Factura {
  id: string;
  numero: string;
  serie?: string;
  clienteId: string;
  clienteNombre?: string;
  servicioId?: string;
  servicioCodigo?: string;
  fechaEmision: Date | string;
  fechaVencimiento: Date | string;
  fechaPago?: Date | string;
  conceptos: ConceptoFactura[];
  subtotal: number;
  descuentoTotal?: number;
  baseImponible: number;
  impuestos: number;
  iva?: number;
  total: number;
  estado: EstadoFactura;
  metodoPago?: string;
  referenciaPago?: string;
  notas?: string;
  condiciones?: string;
  pdfUrl?: string;
}

// ============================================
// COSTES
// ============================================

export interface DesgloseCostes {
  combustible: number;
  peajes: number;
  conductor: number;
  vehiculo: number;
  otros: number;
  total: number;
}

export interface InformeCostes {
  servicioId: string;
  servicioCodigo: string;
  clienteNombre: string;
  precioVenta: number;
  costes: DesgloseCostes;
  beneficio: number;
  margenPorcentaje: number;
  estimadoVsReal?: {
    estimado: number;
    real: number;
    diferencia: number;
  };
}

// ============================================
// DOCUMENTOS
// ============================================

export interface Documento {
  id: string;
  nombre: string;
  tipo: 'contrato' | 'factura' | 'plano' | 'seguro' | 'licencia' | 'itv' | 'otro';
  categoria?: string;
  url: string;
  tamaño?: number;
  fechaSubida?: Date | string;
  subidoPor?: string;
  entidadId?: string;
  entidadTipo?: string;
  entidad?: string;  // <-- AÑADIR ESTA LÍNEA (nombre legible de la entidad)
  notas?: string;
}

// ============================================
// COMUNICACIONES
// ============================================

export interface Mensaje {
  id: string;
  canal: 'email' | 'whatsapp' | 'telefono' | 'interno';
  direccion: 'entrada' | 'salida';
  remitente: string;
  destinatario: string;
  asunto?: string;
  contenido: string;
  fecha: Date | string;
  leido: boolean;
  servicioId?: string;
  clienteId?: string;
  adjuntos?: string[];
}

// ============================================
// ALERTAS Y NOTIFICACIONES
// ============================================

export interface Alerta {
  id: string;
  tipo: 'itv' | 'seguro' | 'licencia' | 'mantenimiento' | 'servicio' | 'factura' | 'sistema';
  severidad: 'info' | 'warning' | 'error' | 'critical';
  titulo: string;
  mensaje: string;
  entidadId?: string;
  entidadTipo?: string;
  fechaCreacion: Date | string;
  fechaVencimiento?: Date | string;
  leida: boolean;
  accion?: string;
  accionUrl?: string;
}

// ============================================
// USUARIO Y CONFIGURACIÓN
// ============================================

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'coordinador' | 'conductor' | 'cliente' | 'viewer';
  avatar?: string;
  telefono?: string;
  activo: boolean;
  ultimoAcceso?: Date | string;
  preferencias?: {
    tema?: 'light' | 'dark' | 'system';
    notificaciones?: boolean;
    idioma?: string;
  };
  conductorId?: string;
}

export interface ConfiguracionEmpresa {
  nombre: string;
  nif: string;
  direccion: string;
  telefono: string;
  email: string;
  logo?: string;
  serieFactura: string;
  numeroFacturaActual: number;
  ivaDefault: number;
  maxHorasSemana: number;
  maxHorasDia: number;
  precioCombustible: number;
  tarifaConductorDefault?: number;
  tarifaCoordinadorDefault?: number;
}

// ============================================
// DASHBOARD
// ============================================

export interface KPIDashboard {
  serviciosActivos: number;
  serviciosHoy: number;
  serviciosMes: number;
  conductoresDisponibles: number;
  conductoresOcupados: number;
  vehiculosOperativos: number;
  vehiculosTaller: number;
  facturacionMes: number;
  facturacionPendiente: number;
  serviciosPendientesFacturar: number;
}

export interface DatoGrafico {
  label: string;
  value: number;
  color?: string;
}

// ============================================
// FILTROS Y PAGINACIÓN
// ============================================

export interface FiltrosBusqueda {
  texto?: string;
  fechaDesde?: Date | string;
  fechaHasta?: Date | string;
  estado?: string;
  tipo?: string;
  entidadId?: string;
}

export interface Paginacion {
  pagina: number;
  porPagina: number;
  total: number;
  totalPaginas: number;
}

// ============================================
// API RESPONSES
// ============================================

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  pagination?: Paginacion;
}

export interface ApiError {
  field?: string;
  message: string;
  code?: string;
}

// ============================================
// PERMISOS Y ROLES (Barrel Export)
// ============================================

export * from './permisos';