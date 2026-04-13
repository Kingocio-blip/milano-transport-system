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
export type EstadoConductor = 'activo' | 'inactivo' | 'en_ruta' | 'descanso';
export type EstadoVehiculo = 'activo' | 'inactivo' | 'en_mantenimiento' | 'en_ruta';
export type EstadoCliente = 'activo' | 'inactivo' | 'prospecto';
export type TipoVehiculo = 'camion' | 'furgoneta' | 'trailer';

// Tipos de Cliente
export interface Cliente {
  id: number;
  codigo: string;
  nombre: string;
  cif: string;
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
  // Campos adicionales para el backend
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
  id: number;
  clienteId: number;
  nombre: string;
  email: string;
  telefono: string;
  cargo: string;
  principal: boolean;
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
  // Campos snake_case para el backend
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
  // Campos snake_case para el backend
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
  id: number;
  codigo: string;
  clienteId: number;
  clienteNombre: string;
  tipo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin?: string;
  estado: 'pendiente' | 'en_progreso' | 'completado' | 'cancelado';
  importe: number;
  notas: string;
}

export interface CreateServicioData {
  clienteId: number;
  tipo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin?: string;
  importe?: number;
  notas?: string;
  estado?: string;
}

export interface UpdateServicioData {
  clienteId?: number;
  tipo?: string;
  descripcion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  estado?: 'pendiente' | 'en_progreso' | 'completado' | 'cancelado';
  importe?: number;
  notas?: string;
}

// Tipos de Factura
export interface Factura {
  id: number;
  numero: string;
  clienteId: number;
  clienteNombre: string;
  fecha: string;
  fechaVencimiento: string;
  subtotal: number;
  iva: number;
  total: number;
  estado: 'pendiente' | 'pagada' | 'vencida' | 'anulada';
  concepto: string;
}

export interface CreateFacturaData {
  clienteId: number;
  fecha: string;
  fechaVencimiento: string;
  concepto: string;
  subtotal: number;
  iva?: number;
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
  // Campos adicionales para el backend
  estado?: EstadoConductor;
  fecha_nacimiento?: string;
  num_licencia?: string;
  categoria_licencia?: string;
  fecha_vencimiento_licencia?: string;
  fecha_vencimiento_adr?: string;
  fecha_vencimiento_medico?: string;
  fecha_contratacion?: string;
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
  // Campos snake_case para el backend
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
  // Campos snake_case para el backend
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
  plazas: number;
  tipo: 'minibus' | 'bus' | 'furgoneta' | 'coche';
  estado: 'activo' | 'inactivo' | 'taller' | 'baja';
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
  // Campos adicionales para el backend
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

export interface CreateVehiculoData {
  matricula: string;
  marca: string;
  modelo: string;
  annoFabricacion?: number;
  plazas?: number;
  tipo?: 'minibus' | 'bus' | 'furgoneta' | 'coche';
  estado?: string;
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
  // Campos snake_case para el backend
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
  tipo?: 'minibus' | 'bus' | 'furgoneta' | 'coche';
  estado?: 'activo' | 'inactivo' | 'taller' | 'baja';
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
  // Campos snake_case para el backend
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