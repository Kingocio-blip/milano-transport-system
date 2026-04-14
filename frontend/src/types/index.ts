// Tipos de Usuario
export interface User {
  id: number;
  username: string;
  email: string;
  nombre: string;
  apellidos: string;
  rol: 'admin' | 'vendedor' | 'conductor';
  activo: boolean;
  fechaAlta: string;
  ultimoAcceso?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// Tipos de Estado
export type EstadoConductor = 'activo' | 'inactivo' | 'en_ruta' | 'descanso' | 'baja' | 'vacaciones';
export type EstadoVehiculo = 'activo' | 'inactivo' | 'en_mantenimiento' | 'en_ruta' | 'reservado' | 'taller' | 'baja';
export type EstadoCliente = 'activo' | 'inactivo' | 'prospecto';
export type EstadoFactura = 'pendiente' | 'pagada' | 'vencida' | 'anulada' | 'enviada';
export type TipoVehiculo = 'minibus' | 'autobus' | 'furgoneta' | 'coche';
export type TipoCliente = 'empresa' | 'particular';
export type TipoCombustible = 'diesel' | 'gasolina' | 'electrico' | 'hibrido';
export type EstadoRuta = 'activa' | 'inactiva' | 'pendiente';

// Tipos de Servicio
export type TipoServicio = 'lanzadera' | 'discrecional' | 'staff' | 'ruta_programada';
export type EstadoServicio = 'solicitud' | 'presupuesto' | 'negociacion' | 'confirmado' | 'planificando' | 'asignado' | 'en_curso' | 'completado' | 'facturado' | 'cancelado';

// Tipos de Parada y Horario para Rutas
export interface Parada {
  id: string;
  nombre: string;
  direccion: string;
  latitud?: number;
  longitud?: number;
  horaLlegada?: string;
  orden?: number;
}

export interface Horario {
  id: string;
  horaSalida: string;
  horaLlegada: string;
  diasSemana: number[]; // 0=Lunes, 6=Domingo
}

export interface Ruta {
  id: string;
  nombre: string;
  descripcion?: string;
  origen: string;
  destino: string;
  distanciaKm: number;
  duracionEstimada: number;
  estado: EstadoRuta;
  vehiculoAsignadoId?: string;
  conductorAsignadoId?: string;
  paradas: Parada[];
  horarios: Horario[];
  notasConductor?: string;
}

// Tipos de Tarea e Incidencia para Servicios
export interface Tarea {
  id: string;
  nombre: string;
  completada: boolean;
}

export interface Incidencia {
  id: string;
  tipo: string;
  descripcion: string;
  fecha: string;
}

export interface Documento {
  id: string;
  nombre: string;
  url: string;
  tipo: string;
  fechaSubida: string;
}

// Tipos de Cliente
export interface Cliente {
  id: number;
  codigo: string;
  nombre: string;
  cif: string;
  nif?: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  codigoPostal: string;
  formaPago: string;
  diasPago: number;
  condicionesEspeciales: string;
  notas: string;
  fechaAlta: string;
  contacto?: Contacto;
  totalServicios?: number;
  totalFacturado?: number;
  ultimoServicio?: string;
  tipo?: 'empresa' | 'particular';
  razon_social?: string;
  nif_cif?: string;
  pais?: string;
  estado?: EstadoCliente;
  condiciones_pago?: string;
  limite_credito?: number;
  persona_contacto_nombre?: string;
  persona_contacto_email?: string;
  persona_contacto_telefono?: string;
  persona_contacto_cargo?: string;
}

export interface Contacto {
  id?: number;
  clienteId?: number;
  nombre?: string;
  email?: string;
  telefono?: string;
  cargo?: string;
  principal?: boolean;
  direccion?: string;
  ciudad?: string;
  codigoPostal?: string;
}

export interface CreateClienteData {
  nombre: string;
  cif?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  codigoPostal?: string;
  formaPago?: string;
  diasPago?: number;
  condicionesEspeciales?: string;
  notas?: string;
  contacto?: {
    nombre: string;
    email?: string;
    telefono?: string;
    cargo?: string;
  };
  codigo?: string;
  tipo?: 'empresa' | 'particular';
  razon_social?: string;
  nif_cif?: string;
  pais?: string;
  estado?: EstadoCliente;
  condiciones_pago?: string;
  limite_credito?: number;
  persona_contacto_nombre?: string;
  persona_contacto_email?: string;
  persona_contacto_telefono?: string;
  persona_contacto_cargo?: string;
}

export interface UpdateClienteData {
  nombre?: string;
  cif?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  codigoPostal?: string;
  formaPago?: string;
  diasPago?: number;
  condicionesEspeciales?: string;
  notas?: string;
  contacto?: {
    nombre: string;
    email?: string;
    telefono?: string;
    cargo?: string;
  };
  tipo?: 'empresa' | 'particular';
  razon_social?: string;
  nif_cif?: string;
  pais?: string;
  estado?: EstadoCliente;
  condiciones_pago?: string;
  limite_credito?: number;
  persona_contacto_nombre?: string;
  persona_contacto_email?: string;
  persona_contacto_telefono?: string;
  persona_contacto_cargo?: string;
}

// Tipos de Servicio
export interface Servicio {
  id: string | number;
  codigo: string;
  titulo: string;
  clienteId: string | number;
  clienteNombre?: string;
  tipo: TipoServicio;
  descripcion?: string;
  fechaInicio: string | Date;
  fechaFin?: string | Date;
  horaInicio?: string;
  horaFin?: string;
  estado: EstadoServicio;
  importe?: number;
  precio: number;
  costeEstimado?: number;
  margen?: number;
  notas?: string;
  numeroVehiculos?: number;
  rutas?: Ruta[];
  conductoresAsignados?: string[];
  vehiculosAsignados?: string[];
  facturado: boolean;
  facturaId?: string | number;
  tareas: Tarea[];
  incidencias: Incidencia[];
  documentos: Documento[];
  fechaCreacion?: string | Date;
  creadoPor?: string;
}

export interface CreateServicioData {
  clienteId: number;
  tipo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin?: string;
  importe?: number;
  notas?: string;
  estado?: 'pendiente' | 'en_progreso' | 'completado' | 'cancelado' | 'facturado';
}

export interface UpdateServicioData {
  clienteId?: number;
  tipo?: string;
  descripcion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  estado?: 'pendiente' | 'en_progreso' | 'completado' | 'cancelado' | 'facturado';
  importe?: number;
  notas?: string;
}

// Tipos de Factura
export interface Factura {
  id: string | number;
  numero: string;
  serie?: string;
  clienteId: string | number;
  clienteNombre: string;
  fecha: string;
  fechaEmision?: string;
  fechaVencimiento: string;
  fechaPago?: string;
  referenciaPago?: string;
  subtotal: number;
  baseImponible?: number;
  iva: number;
  impuestos?: number;
  total: number;
  estado: EstadoFactura;
  concepto: string;
  conceptos?: ConceptoFactura[];
  servicioId?: string | number;
  facturaId?: string | number;
}

export interface CreateFacturaData {
  clienteId: number;
  fecha: string;
  fechaVencimiento: string;
  concepto: string;
  subtotal: number;
  iva?: number;
}

export interface ConceptoFactura {
  id?: string | number;
  descripcion?: string;
  cantidad: number;
  precioUnitario: number;
  importe?: number;
  total?: number;
  concepto?: string;
  impuesto?: number;
}

// Tipos de Dashboard
export interface DashboardStats {
  totalClientes: number;
  totalServicios: number;
  totalFacturado: number;
  facturasPendientes: number;
  serviciosPendientes: number;
  serviciosEsteMes: number;
}

export interface MonthlyData {
  mes: string;
  servicios: number;
  facturacion: number;
}

export interface DashboardData {
  stats: DashboardStats;
  monthlyData: MonthlyData[];
  ultimosServicios: Servicio[];
  facturasPendientes: Factura[];
}

// Tipos de Conductor
export interface Conductor {
  id: number;
  codigo: string;
  nombre: string;
  apellidos: string;
  dni: string;
  email: string;
  telefono: string;
  direccion: string;
  fechaNacimiento?: string;
  fechaAlta: string;
  licencia?: {
    tipo: string;
    numero: string;
    fechaCaducidad: string;
  };
  tieneCap: boolean;
  capCaducidad?: string;
  numeroSeguridadSocial?: string;
  tipoContrato: 'indefinido' | 'temporal' | 'autonomo';
  tarifaHora: number;
  activo: boolean;
  notas?: string;
  estado?: EstadoConductor;
  fecha_nacimiento?: string;
  num_licencia?: string;
  categoria_licencia?: string;
  fecha_vencimiento_licencia?: string;
  fecha_vencimiento_adr?: string;
  fecha_vencimiento_medico?: string;
  fecha_contratacion?: string;
  disponibilidad?: {
    dias: number[];
    horaInicio: string;
    horaFin: string;
  };
  totalHorasMes?: number;
  totalServiciosMes?: number;
  valoracion?: number;
}

export interface CreateConductorData {
  nombre: string;
  apellidos: string;
  dni?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  fechaNacimiento?: string;
  licencia?: {
    tipo: string;
    numero: string;
    fechaCaducidad: string;
  };
  tieneCap?: boolean;
  capCaducidad?: string;
  numeroSeguridadSocial?: string;
  tipoContrato?: 'indefinido' | 'temporal' | 'autonomo';
  tarifaHora?: number;
  activo?: boolean;
  notas?: string;
  codigo?: string;
  estado?: EstadoConductor;
  fecha_nacimiento?: string;
  num_licencia?: string;
  categoria_licencia?: string;
  fecha_vencimiento_licencia?: string;
  fecha_vencimiento_adr?: string;
  fecha_vencimiento_medico?: string;
  fecha_contratacion?: string;
}

export interface UpdateConductorData {
  nombre?: string;
  apellidos?: string;
  dni?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  fechaNacimiento?: string;
  licencia?: {
    tipo: string;
    numero: string;
    fechaCaducidad: string;
  };
  tieneCap?: boolean;
  capCaducidad?: string;
  numeroSeguridadSocial?: string;
  tipoContrato?: 'indefinido' | 'temporal' | 'autonomo';
  tarifaHora?: number;
  activo?: boolean;
  notas?: string;
  estado?: EstadoConductor;
  fecha_nacimiento?: string;
  num_licencia?: string;
  categoria_licencia?: string;
  fecha_vencimiento_licencia?: string;
  fecha_vencimiento_adr?: string;
  fecha_vencimiento_medico?: string;
  fecha_contratacion?: string;
}

// Tipos de Vehiculo
export interface Vehiculo {
  id: number;
  codigo: string;
  matricula: string;
  marca: string;
  modelo: string;
  annoFabricacion?: number;
  añoFabricacion?: number;
  plazas: number;
  tipo: TipoVehiculo;
  estado: EstadoVehiculo;
  combustible?: TipoCombustible;
  bastidor?: string;
  kilometraje?: number;
  itv?: {
    fechaUltima: string;
    fechaProxima: string;
    resultado: 'favorable' | 'desfavorable' | 'negativo';
  };
  seguro?: {
    compania: string;
    poliza: string;
    fechaVencimiento: string;
  };
  imagenUrl?: string;
  fechaAlta: string;
  notas?: string;
  tipo_vehiculo?: TipoVehiculo;
  estado_vehiculo?: EstadoVehiculo;
  capacidad_kg?: number;
  volumen_m3?: number;
  longitud_m?: number;
  fecha_vencimiento_itv?: string;
  fecha_vencimiento_seguro?: string;
  num_poliza_seguro?: string;
  fecha_adquisicion?: string;
  consumoMedio?: number;
}

export interface CreateVehiculoData {
  matricula: string;
  marca: string;
  modelo: string;
  annoFabricacion?: number;
  plazas?: number;
  tipo?: TipoVehiculo;
  estado?: EstadoVehiculo;
  combustible?: TipoCombustible;
  bastidor?: string;
  kilometraje?: number;
  itv?: {
    fechaUltima: string;
    fechaProxima: string;
    resultado: 'favorable' | 'desfavorable' | 'negativo';
  };
  seguro?: {
    compania: string;
    poliza: string;
    fechaVencimiento: string;
  };
  imagenUrl?: string;
  notas?: string;
  codigo?: string;
  tipo_vehiculo?: TipoVehiculo;
  estado_vehiculo?: EstadoVehiculo;
  capacidad_kg?: number;
  volumen_m3?: number;
  longitud_m?: number;
  fecha_vencimiento_itv?: string;
  fecha_vencimiento_seguro?: string;
  num_poliza_seguro?: string;
  fecha_adquisicion?: string;
}

export interface UpdateVehiculoData {
  matricula?: string;
  marca?: string;
  modelo?: string;
  annoFabricacion?: number;
  plazas?: number;
  tipo?: TipoVehiculo;
  estado?: EstadoVehiculo;
  combustible?: TipoCombustible;
  bastidor?: string;
  kilometraje?: number;
  itv?: {
    fechaUltima: string;
    fechaProxima: string;
    resultado: 'favorable' | 'desfavorable' | 'negativo';
  };
  seguro?: {
    compania: string;
    poliza: string;
    fechaVencimiento: string;
  };
  imagenUrl?: string;
  notas?: string;
  tipo_vehiculo?: TipoVehiculo;
  estado_vehiculo?: EstadoVehiculo;
  capacidad_kg?: number;
  volumen_m3?: number;
  longitud_m?: number;
  fecha_vencimiento_itv?: string;
  fecha_vencimiento_seguro?: string;
  num_poliza_seguro?: string;
  fecha_adquisicion?: string;
}

// Tipos de API
export interface ApiError {
  detail: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}