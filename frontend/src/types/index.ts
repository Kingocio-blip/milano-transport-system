// ============================================
// MILANO - Sistema de Gestión de Transporte
// Tipos TypeScript (ACTUALIZADO)
// ============================================

// Tipos base
export type TipoCliente = 'festival' | 'promotor' | 'colegio' | 'empresa' | 'particular';
export type TipoServicio = 'lanzadera' | 'discrecional' | 'staff' | 'ruta_programada';
export type EstadoServicio = 'solicitud' | 'presupuesto' | 'negociacion' | 'confirmado' | 'planificando' | 'asignado' | 'en_curso' | 'completado' | 'facturado' | 'cancelado';
export type TipoVehiculo = 'autobus' | 'minibus' | 'furgoneta' | 'coche';
export type EstadoVehiculo = 'operativo' | 'taller' | 'baja' | 'reservado';
export type EstadoConductor = 'activo' | 'baja' | 'vacaciones' | 'descanso' | 'inactivo' | 'en_ruta';
export type EstadoFactura = 'pendiente' | 'enviada' | 'pagada' | 'vencida' | 'anulada';
export type EstadoOportunidad = 'nueva' | 'contactado' | 'presupuesto_enviado' | 'negociacion' | 'ganada' | 'perdida';

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

export interface Cliente {
  id: string;
  codigo: string;
  nombre: string;
  razonSocial?: string; // <-- AÑADIDO para backend snake_case
  tipo: TipoCliente;
  contacto: Contacto;
  nif?: string;
  condicionesEspeciales?: string;
  formaPago?: string;
  diasPago?: number;
  fechaAlta: Date | string;
  fechaActualizacion?: Date | string; // <-- AÑADIDO
  estado: 'activo' | 'inactivo';
  notas?: string;
  // Estadísticas (del backend)
  totalServicios?: number;
  totalFacturado?: number;
  ultimoServicio?: Date | string;
  // Relaciones
  historialServicios?: string[];
  documentos?: Documento[];
}

// Tipos para crear/actualizar clientes (usados en API)
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
  probabilidad: number; // 0-100
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
  fechaUltima: Date | string;
  fechaProxima: Date | string;
  resultado?: 'favorable' | 'desfavorable' | 'negativo';
  observaciones?: string;
}

export interface Seguro {
  compania: string;
  poliza: string;
  tipoCobertura?: string;
  fechaInicio: Date | string;
  fechaVencimiento: Date | string;
  prima?: number;
}

export interface Mantenimiento {
  id: string;
  fecha: Date | string;
  tipo: 'preventivo' | 'correctivo' | 'itv' | 'otro';
  descripcion: string;
  kilometraje: number;
  coste: number;
  taller?: string;
  piezasCambiadas?: string[];
  proximoMantenimiento?: Date | string;
  observaciones?: string;
}

export interface Vehiculo {
  id: string;
  matricula: string;
  bastidor: string;
  marca: string;
  modelo: string;
  tipo: TipoVehiculo;
  plazas: number;
  añoFabricacion?: number;
  // Kilometraje y consumo
  kilometraje: number;
  kilometrajeUltimaRevision?: number;
  consumoMedio?: number; // L/100km
  combustible?: 'diesel' | 'gasolina' | 'electric' | 'hibrido';
  // Documentación
  itv: ITV;
  seguro: Seguro;
  mantenimientos: Mantenimiento[];
  // Estado
  estado: EstadoVehiculo;
  ubicacion?: string;
  notas?: string;
  // Imagen
  imagenUrl?: string;
}

// ============================================
// CONDUCTOR / RRHH (ACTUALIZADO)
// ============================================
export interface Licencia {
  tipo: string;
  numero: string;
  fechaExpedicion?: Date | string;
  fechaCaducidad: Date | string;
  permisos?: string[];
}

export interface Disponibilidad {
  dias: number[]; // 0=Domingo, 1=Lunes, 2=Martes...
  horaInicio: string;
  horaFin: string;
  observaciones?: string;
}

// <-- NUEVO: Credenciales para panel de control
export interface CredencialesConductor {
  usuario: string;
  // password no se devuelve al frontend por seguridad
  passwordHash?: string;
  ultimoAcceso?: Date | string;
  tokenReset?: string;
}

export interface Conductor {
  id: string;
  codigo: string;
  nombre: string;
  apellidos: string;
  dni: string;
  fechaNacimiento?: Date | string;
  fechaAlta: Date | string;
  // Contacto
  telefono?: string;  // <-- CAMBIADO: opcional para crear
  email?: string;     // <-- CAMBIADO: opcional para crear
  direccion?: string;
  // Profesional
  licencia?: Licencia; // <-- CAMBIADO: opcional inicialmente
  tarifaHora?: number; // <-- CAMBIADO: opcional con default
  prioridad?: number;  // <-- AÑADIDO: 0-100 para orden de asignación
  disponibilidad?: Disponibilidad;
  // Credenciales panel
  credenciales?: CredencialesConductor; // <-- AÑADIDO
  panelActivo?: boolean; // <-- AÑADIDO
  // Documentación
  documentos?: Documento[];
  // Estado
  estado: EstadoConductor;
  // Estadísticas
  totalHorasMes?: number;
  totalServiciosMes?: number;
  valoracion?: number;
  notas?: string;
}

// <-- NUEVO: Fichaje con estados extendidos
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
  // Nuevos campos para tracking GPS
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
  tiempoEspera?: number; // minutos
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
  // Origen y destino
  origen: string;
  destino: string;
  paradas: Parada[];
  // Distancia y tiempo
  distanciaKm: number;
  duracionEstimada: number; // minutos
  // Asignaciones
  vehiculoAsignadoId?: string;
  conductorAsignadoId?: string;
  // Horarios
  horarios: Horario[];
  // Documentos
  planoRecogidaUrl?: string;
  notasConductor?: string;
  // Estado
  estado: 'activa' | 'inactiva' | 'completada';
}

// ============================================
// SERVICIOS (ACTUALIZADO)
// ============================================

// <-- NUEVO: Gasto registrado por conductor
export interface GastoServicio {
  id: string;
  tipo: 'gasoil' | 'peaje' | 'aparcamiento' | 'otro';
  cantidad?: number; // litros para gasoil, horas para parking, etc.
  precio: number;
  precioUnitario?: number; // precio por litro, hora, etc.
  notas?: string;
  ticket?: string; // URL de foto del ticket
  fecha: Date | string;
  conductorId?: string;
  aprobado?: boolean;
}

// <-- NUEVO: Revisión del vehículo por conductor
export interface RevisionVehiculo {
  id: string;
  tipo: 'limpieza' | 'neumaticos' | 'aceite' | 'luces' | 'carroceria' | 'otro';
  estado: 'ok' | 'ko' | 'na'; // correcto / defectuoso / no aplica
  notas?: string;
  fotos?: string[];
  fecha: Date | string;
  conductorId: string;
  vehiculoId?: string;
}

// <-- NUEVO: Tracking de ruta
export interface TrackingRuta {
  kmInicio?: number;
  kmFin?: number;
  kmTotal?: number;
  rutaTomada?: string; // descripción de desvíos, atascos
  duracionReal?: number; // minutos
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
  tipo?: 'conductor' | 'sistema' | 'coordinador'; // <-- AÑADIDO
}

export interface Servicio {
  id: string;
  codigo: string;
  // Cliente
  clienteId: string;
  clienteNombre?: string;
  contactoCliente?: Contacto;
  // Tipo y estado
  tipo: TipoServicio;
  estado: EstadoServicio;
  // Fechas
  fechaInicio: Date | string;
  fechaFin: Date | string;
  horaInicio?: string;
  horaFin?: string;
  // <-- AÑADIDO: Horas reales de fichaje
  horaInicioReal?: Date | string;
  horaFinReal?: Date | string;
  horasReales?: number;
  // Descripción
  titulo: string;
  descripcion?: string;
  // Vehículos y conductores
  numeroVehiculos: number;
  vehiculosAsignados: string[];
  conductoresAsignados: string[];
  // Rutas
  rutas: Ruta[];
  // Ubicación
  origen?: string;
  destino?: string;
  ubicacionEvento?: string;
  // Financiero
  costeEstimado: number;
  costeReal?: number;
  precio: number;
  margen?: number;
  // Facturación
  facturado: boolean;
  facturaId?: string;
  // Pipeline de tareas
  tareas: TareaServicio[];
  // Incidencias
  incidencias: Incidencia[];
  // <-- AÑADIDO: Gastos y revisiones del conductor
  gastos?: GastoServicio[];
  revisiones?: RevisionVehiculo[];
  tracking?: TrackingRuta; // <-- AÑADIDO
  // Documentos
  contratoUrl?: string;
  documentos: Documento[];
  // Notas
  notasInternas?: string;
  notasCliente?: string;
  // Metadatos
  fechaCreacion: Date | string;
  creadoPor: string;
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
  // Relaciones
  clienteId: string;
  clienteNombre?: string;
  servicioId?: string;
  servicioCodigo?: string;
  // Fechas
  fechaEmision: Date | string;
  fechaVencimiento: Date | string;
  fechaPago?: Date | string;
  // Conceptos
  conceptos: ConceptoFactura[];
  // Totales
  subtotal: number;
  descuentoTotal?: number;
  baseImponible: number;
  impuestos: number;
  iva?: number;
  total: number;
  // Estado
  estado: EstadoFactura;
  metodoPago?: string;
  referenciaPago?: string;
  // Notas
  notas?: string;
  condiciones?: string;
  // Documentos
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
  // Ingresos
  precioVenta: number;
  // Costes
  costes: DesgloseCostes;
  // Rentabilidad
  beneficio: number;
  margenPorcentaje: number;
  // Comparación
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
  fechaSubida: Date | string;
  subidoPor: string;
  entidadId?: string; // clienteId, vehiculoId, etc.
  entidadTipo?: string;
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
  // <-- AÑADIDO: Para conductores que son usuarios
  conductorId?: string;
}

export interface ConfiguracionEmpresa {
  nombre: string;
  nif: string;
  direccion: string;
  telefono: string;
  email: string;
  logo?: string;
  // Configuración de facturación
  serieFactura: string;
  numeroFacturaActual: number;
  ivaDefault: number;
  // Configuración de conductores
  maxHorasSemana: number;
  maxHorasDia: number;
  // Precios combustible
  precioCombustible: number;
  // <-- AÑADIDO: Tarifas por defecto
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

// <-- NUEVO: Respuesta paginada genérica
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  pagination?: Paginacion;
}

// <-- NUEVO: Error de validación de API
export interface ApiError {
  field?: string;
  message: string;
  code?: string;
}