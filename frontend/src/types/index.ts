// Tipos de Usuario
export interface User {
  id: number;
  username: string;
  email: string;
  nombre: string;
  apellidos: string;
  rol: 'admin' | 'vendedor';
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
  // Campos de estadísticas
  totalServicios?: number;
  totalFacturado?: number;
  ultimoServicio?: string;
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
}

export interface UpdateServicioData {
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