// Tipos para el sistema de permisos

export interface Permission {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  es_sistema: boolean;
  activo: boolean;
}

export interface Role {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  es_sistema: boolean;
  rol_base?: 'admin' | 'gerente' | 'operador' | 'conductor';
  activo: boolean;
  permisos?: Permission[];
  empresa_id?: number;
}

export interface RoleCreate {
  codigo: string;
  nombre: string;
  descripcion?: string;
  permisos_ids: number[];
}

export interface UserPermissionsResponse {
  user_id: number;
  username: string;
  rol: string;
  rol_custom?: string;
  permisos: string[];
}

export interface PermisoCategoria {
  categoria: string;
  permisos: Permission[];
}

// Categorías de permisos para la UI
export const CATEGORIAS_PERMISOS = [
  { id: 'dashboard', nombre: 'Dashboard', icono: 'LayoutDashboard' },
  { id: 'usuarios', nombre: 'Usuarios', icono: 'Users' },
  { id: 'clientes', nombre: 'Clientes', icono: 'Building2' },
  { id: 'conductores', nombre: 'Conductores', icono: 'UserCog' },
  { id: 'vehiculos', nombre: 'Vehículos', icono: 'Bus' },
  { id: 'servicios', nombre: 'Servicios', icono: 'ClipboardList' },
  { id: 'facturacion', nombre: 'Facturación', icono: 'Receipt' },
  { id: 'panel_conductor', nombre: 'Panel Conductor', icono: 'Smartphone' },
  { id: 'configuracion', nombre: 'Configuración', icono: 'Settings' },
  { id: 'admin', nombre: 'Administración', icono: 'Shield' },
] as const;

// Tipo User básico para permisos
export interface User {
  id: number;
  username: string;
  email: string;
  nombre_completo: string;
  rol: string;
  rol_custom_id?: number;
  activo: boolean;
}