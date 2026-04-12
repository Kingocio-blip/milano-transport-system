import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Tipos compartidos
type TipoCliente = 'festival' | 'promotor' | 'colegio' | 'empresa' | 'particular';

// ==================== TIPOS ====================

export interface User {
  id: number;
  username: string;
  email: string;
  nombre: string;
  apellidos: string;
  rol: 'admin' | 'conductor' | 'usuario';
  activo: boolean;
  fechaAlta?: string;
  ultimoAcceso?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: any;
}

// Cliente
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
  tipo: TipoCliente;
  estado: 'activo' | 'inactivo';
  contacto: {
    id: number;
    clienteId: number;
    nombre: string;
    email: string;
    telefono: string;
    cargo: string;
    principal: boolean;
  };
  totalServicios: number;
  totalFacturado: number;
  ultimoServicio?: string;
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
    nombre?: string;
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
  contacto?: {
    nombre?: string;
    email?: string;
    telefono?: string;
    cargo?: string;
  };
}

// Conductor
export interface Conductor {
  id: number;
  codigo: string;
  nombre: string;
  apellidos: string;
  dni: string;
  telefono: string;
  email: string;
  direccion?: string;
  licencia: {
    tipo: string;
    numero: string;
    fechaCaducidad: string;
  };
  tieneCap?: boolean;
  capCaducidad?: string;
  numeroSeguridadSocial?: string;
  tipoContrato?: string;
  tarifaHora: number;
  estado: string;
  notas?: string;
  fechaAlta: string;
}

export interface CreateConductorData {
  nombre: string;
  apellidos: string;
  dni?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  licencia?: {
    tipo?: string;
    numero?: string;
    fechaCaducidad?: string;
  };
  tieneCap?: boolean;
  capCaducidad?: string;
  numeroSeguridadSocial?: string;
  tipoContrato?: string;
  tarifaHora?: number;
  estado?: string;
  notas?: string;
}

export interface UpdateConductorData {
  nombre?: string;
  apellidos?: string;
  dni?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  licencia?: {
    tipo?: string;
    numero?: string;
    fechaCaducidad?: string;
  };
  tieneCap?: boolean;
  capCaducidad?: string;
  numeroSeguridadSocial?: string;
  tipoContrato?: string;
  tarifaHora?: number;
  estado?: string;
  notas?: string;
}

// Vehiculo
export interface Vehiculo {
  id: number;
  matricula: string;
  bastidor?: string;
  marca: string;
  modelo: string;
  tipo?: string;
  plazas?: number;
  annoFabricacion?: number;
  combustible?: string;
  kilometraje: number;
  itv?: {
    fechaUltima?: string;
    fechaProxima?: string;
    resultado?: string;
  };
  seguro?: {
    compania?: string;
    poliza?: string;
    fechaVencimiento?: string;
  };
  estado: string;
  ubicacion?: string;
  notas?: string;
  imagenUrl?: string;
}

export interface CreateVehiculoData {
  matricula: string;
  bastidor?: string;
  marca: string;
  modelo: string;
  tipo?: string;
  plazas?: number;
  annoFabricacion?: number;
  combustible?: string;
  kilometraje?: number;
  itv?: {
    fechaUltima?: string;
    fechaProxima?: string;
    resultado?: string;
  };
  seguro?: {
    compania?: string;
    poliza?: string;
    fechaVencimiento?: string;
  };
  estado?: string;
  ubicacion?: string;
  notas?: string;
  imagenUrl?: string;
}

export interface UpdateVehiculoData {
  matricula?: string;
  bastidor?: string;
  marca?: string;
  modelo?: string;
  tipo?: string;
  plazas?: number;
  annoFabricacion?: number;
  combustible?: string;
  kilometraje?: number;
  itv?: {                          // <-- AÑADIDO
    fechaUltima?: string;
    fechaProxima?: string;
    resultado?: string;
  };
  seguro?: {                       // <-- AÑADIDO
    compania?: string;
    poliza?: string;
    fechaVencimiento?: string;
  };
  estado?: string;
  ubicacion?: string;
  notas?: string;
  imagenUrl?: string;
}

// Servicio
export interface Servicio {
  id: number;
  codigo: string;
  clienteId: number;
  clienteNombre?: string;
  tipo: string;
  estado: string;
  titulo?: string;
  descripcion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  horaInicio?: string;
  horaFin?: string;
  conductorId?: number;
  vehiculoId?: number;
  numeroVehiculos: number;
  origen?: string;
  destino?: string;
  ubicacionEvento?: string;
  costeEstimado: number;
  costeReal?: number;
  precio: number;
  margen?: number;
  facturado: boolean;
  facturaId?: number;
  notasInternas?: string;
  notasCliente?: string;
  fechaCreacion: string;
}

export interface CreateServicioData {
  clienteId: number;
  tipo?: string;
  estado?: string;
  titulo?: string;
  descripcion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  horaInicio?: string;
  horaFin?: string;
  conductorId?: number;
  vehiculoId?: number;
  numeroVehiculos?: number;
  origen?: string;
  destino?: string;
  ubicacionEvento?: string;
  costeEstimado?: number;
  precio?: number;
  notasInternas?: string;
  notasCliente?: string;
}

export interface UpdateServicioData {
  clienteId?: number;
  conductorId?: number;
  vehiculoId?: number;
  estado?: string;
  precio?: number;
  costeReal?: number;
}

// Factura
export interface Factura {
  id: number;
  numero: string;
  clienteId: number;
  clienteNombre?: string;
  fecha: string;
  fechaVencimiento?: string;
  subtotal: number;
  iva: number;
  total: number;
  estado: 'pendiente' | 'pagada' | 'vencida' | 'anulada';
  concepto?: string;
}

export interface CreateFacturaData {
  clienteId: number;
  fecha: string;
  fechaVencimiento?: string;
  subtotal: number;
  iva?: number;
  concepto?: string;
}

// Dashboard
export interface DashboardData {
  stats: {
    totalClientes: number;
    totalServicios: number;
    totalFacturado: number;
    facturasPendientes: number;
    serviciosPendientes: number;
    serviciosEsteMes: number;
  };
  monthlyData: any[];
  ultimosServicios: any[];
  facturasPendientes: any[];
}

// ==================== API HELPER ====================

export const api = {
  async fetch(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    const url = `${API_URL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };
    
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Sesión expirada');
    }
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error desconocido' }));
      throw new Error(error.detail || `Error ${response.status}`);
    }
    
    return response.json();
  },
  
  get(endpoint: string) { return this.fetch(endpoint, { method: 'GET' }); },
  post(endpoint: string, data: any) { return this.fetch(endpoint, { method: 'POST', body: JSON.stringify(data) }); },
  put(endpoint: string, data: any) { return this.fetch(endpoint, { method: 'PUT', body: JSON.stringify(data) }); },
  delete(endpoint: string) { return this.fetch(endpoint, { method: 'DELETE' }); }
};

// ==================== AUTH STORE ====================

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  logout: () => void;
  checkAuth: () => boolean;
}

const convertUserFromBackend = (user: any): User => ({
  id: user.id,
  username: user.username,
  email: user.email,
  nombre: user.nombre,
  apellidos: user.apellidos,
  rol: user.rol,
  activo: user.activo,
  fechaAlta: user.fecha_creacion,
  ultimoAcceso: user.ultimo_acceso,
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (credentials) => {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Error de autenticación');
        }

        const data: AuthResponse = await response.json();
        
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        set({
          user: convertUserFromBackend(data.user),
          token: data.access_token,
          isAuthenticated: true,
        });
        
        return data;
      },

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, isAuthenticated: false });
      },

      checkAuth: () => {
        return get().isAuthenticated && get().token !== null;
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

// ==================== CLIENTES STORE ====================

interface ClientesState {
  clientes: Cliente[];
  clienteActual: Cliente | null;
  loading: boolean;
  error: string | null;
  fetchClientes: () => Promise<void>;
  fetchCliente: (id: number) => Promise<void>;
  createCliente: (data: CreateClienteData) => Promise<void>;
  updateCliente: (id: number, data: UpdateClienteData) => Promise<void>;
  deleteCliente: (id: number) => Promise<void>;
  clearError: () => void;
}

const convertClienteFromBackend = (cliente: any): Cliente => ({
  id: cliente.id,
  codigo: cliente.codigo,
  nombre: cliente.nombre,
  cif: cliente.nif || '',
  email: cliente.contacto_email || '',
  telefono: cliente.contacto_telefono || '',
  direccion: cliente.contacto_direccion || '',
  ciudad: cliente.contacto_ciudad || '',
  codigoPostal: cliente.contacto_codigo_postal || '',
  formaPago: cliente.forma_pago || '',
  diasPago: cliente.dias_pago || 30,
  condicionesEspeciales: cliente.condiciones_especiales || '',
  notas: cliente.notas || '',
  fechaAlta: cliente.fecha_alta,
  tipo: (cliente.tipo as TipoCliente) || 'particular',
  estado: (cliente.estado as 'activo' | 'inactivo') || 'activo',
  contacto: {
    id: 0,
    clienteId: cliente.id,
    nombre: cliente.persona_contacto_nombre || '',
    email: cliente.persona_contacto_email || '',
    telefono: cliente.persona_contacto_telefono || '',
    cargo: cliente.persona_contacto_cargo || '',
    principal: true,
  },
  totalServicios: cliente.total_servicios || 0,
  totalFacturado: cliente.total_facturado || 0,
  ultimoServicio: cliente.ultimo_servicio,
});

const convertClienteToBackend = (data: CreateClienteData | UpdateClienteData) => {
  const backendData: any = {};
  
  // Información básica
  if (data.nombre !== undefined) backendData.nombre = data.nombre;
  if (data.cif !== undefined) backendData.nif = data.cif || null;
  
  // Contacto principal - CAMPOS PLANOS (no anidados)
  if (data.email !== undefined) backendData.contacto_email = data.email || null;
  if (data.telefono !== undefined) backendData.contacto_telefono = data.telefono || null;
  
  // Dirección - CAMPOS PLANOS
  if (data.direccion !== undefined) backendData.contacto_direccion = data.direccion || null;
  if (data.ciudad !== undefined) backendData.contacto_ciudad = data.ciudad || null;
  if (data.codigoPostal !== undefined) backendData.contacto_codigo_postal = data.codigoPostal || null;
  
  // Condiciones
  if (data.formaPago !== undefined) backendData.forma_pago = data.formaPago || null;
  if (data.diasPago !== undefined) backendData.dias_pago = data.diasPago || null;
  if (data.condicionesEspeciales !== undefined) backendData.condiciones_especiales = data.condicionesEspeciales || null;
  if (data.notas !== undefined) backendData.notas = data.notas || null;
  
  // Persona de contacto (campos planos separados)
  if (data.contacto) {
    if (data.contacto.nombre) backendData.persona_contacto_nombre = data.contacto.nombre;
    if (data.contacto.email !== undefined) backendData.persona_contacto_email = data.contacto.email || null;
    if (data.contacto.telefono !== undefined) backendData.persona_contacto_telefono = data.contacto.telefono || null;
    if (data.contacto.cargo !== undefined) backendData.persona_contacto_cargo = data.contacto.cargo || null;
  }
  
  return backendData;
};

export const useClientesStore = create<ClientesState>((set) => ({
  clientes: [],
  clienteActual: null,
  loading: false,
  error: null,

  fetchClientes: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/clientes/');
      set({ 
        clientes: data.map(convertClienteFromBackend),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchCliente: async (id) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get(`/clientes/${id}`);
      set({ 
        clienteActual: convertClienteFromBackend(data),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createCliente: async (data) => {
    set({ loading: true, error: null });
    try {
      const newCliente = await api.post('/clientes/', convertClienteToBackend(data));
      set((state) => ({
        clientes: [...state.clientes, convertClienteFromBackend(newCliente)],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateCliente: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updatedCliente = await api.put(`/clientes/${id}`, convertClienteToBackend(data));
      set((state) => ({
        clientes: state.clientes.map((c) =>
          c.id === id ? convertClienteFromBackend(updatedCliente) : c
        ),
        clienteActual: convertClienteFromBackend(updatedCliente),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteCliente: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/clientes/${id}`);
      set((state) => ({
        clientes: state.clientes.filter((c) => c.id !== id),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

// ==================== CONDUCTORES STORE ====================

interface ConductoresState {
  conductores: Conductor[];
  conductorActual: Conductor | null;
  loading: boolean;
  error: string | null;
  fetchConductores: () => Promise<void>;
  fetchConductor: (id: number) => Promise<void>;
  createConductor: (data: CreateConductorData) => Promise<void>;
  updateConductor: (id: number, data: UpdateConductorData) => Promise<void>;
  deleteConductor: (id: number) => Promise<void>;
  clearError: () => void;
}

const convertConductorFromBackend = (conductor: any): Conductor => ({
  id: conductor.id,
  codigo: conductor.codigo,
  nombre: conductor.nombre,
  apellidos: conductor.apellidos,
  dni: conductor.dni || '',
  telefono: conductor.telefono || '',
  email: conductor.email || '',
  direccion: conductor.direccion,
  licencia: {
    tipo: conductor.licencia_tipo || '',
    numero: conductor.licencia_numero || '',
    fechaCaducidad: conductor.licencia_caducidad,
  },
  tieneCap: conductor.tiene_cap,
  capCaducidad: conductor.cap_caducidad,
  numeroSeguridadSocial: conductor.numero_seguridad_social,
  tipoContrato: conductor.tipo_contrato,
  tarifaHora: conductor.tarifa_hora || 0,
  estado: conductor.estado || 'activo',
  notas: conductor.notas,
  fechaAlta: conductor.fecha_alta,
});

const convertConductorToBackend = (data: CreateConductorData | UpdateConductorData) => {
  const backendData: any = {};
  
  if (data.nombre !== undefined) backendData.nombre = data.nombre;
  if (data.apellidos !== undefined) backendData.apellidos = data.apellidos;
  if (data.dni !== undefined) backendData.dni = data.dni || null;
  if (data.telefono !== undefined) backendData.telefono = data.telefono || null;
  if (data.email !== undefined) backendData.email = data.email || null;
  if (data.direccion !== undefined) backendData.direccion = data.direccion || null;
  
  // Licencia
  if (data.licencia) {
    if (data.licencia.tipo !== undefined) backendData.licencia_tipo = data.licencia.tipo || null;
    if (data.licencia.numero !== undefined) backendData.licencia_numero = data.licencia.numero || null;
    if (data.licencia.fechaCaducidad !== undefined) backendData.licencia_caducidad = data.licencia.fechaCaducidad || null;
  }
  
  // CAP
  if (data.tieneCap !== undefined) backendData.tiene_cap = data.tieneCap;
  if (data.capCaducidad !== undefined) backendData.cap_caducidad = data.capCaducidad || null;
  
  // Laboral
  if (data.numeroSeguridadSocial !== undefined) backendData.numero_seguridad_social = data.numeroSeguridadSocial || null;
  if (data.tipoContrato !== undefined) backendData.tipo_contrato = data.tipoContrato || 'indefinido';
  if (data.tarifaHora !== undefined) backendData.tarifa_hora = data.tarifaHora || 0;
  
  if (data.estado !== undefined) backendData.estado = data.estado || 'activo';
  if (data.notas !== undefined) backendData.notas = data.notas || null;
  
  return backendData;
};

export const useConductoresStore = create<ConductoresState>((set) => ({
  conductores: [],
  conductorActual: null,
  loading: false,
  error: null,

  fetchConductores: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/conductores/');
      set({ 
        conductores: data.map(convertConductorFromBackend),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchConductor: async (id) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get(`/conductores/${id}`);
      set({ 
        conductorActual: convertConductorFromBackend(data),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createConductor: async (data) => {
    set({ loading: true, error: null });
    try {
      const newConductor = await api.post('/conductores/', convertConductorToBackend(data));
      set((state) => ({
        conductores: [...state.conductores, convertConductorFromBackend(newConductor)],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateConductor: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updatedConductor = await api.put(`/conductores/${id}`, convertConductorToBackend(data));
      set((state) => ({
        conductores: state.conductores.map((c) =>
          c.id === id ? convertConductorFromBackend(updatedConductor) : c
        ),
        conductorActual: convertConductorFromBackend(updatedConductor),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteConductor: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/conductores/${id}`);
      set((state) => ({
        conductores: state.conductores.filter((c) => c.id !== id),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

// ==================== VEHICULOS STORE ====================

interface VehiculosState {
  vehiculos: Vehiculo[];
  vehiculoActual: Vehiculo | null;
  loading: boolean;
  error: string | null;
  fetchVehiculos: () => Promise<void>;
  fetchVehiculo: (id: number) => Promise<void>;
  createVehiculo: (data: CreateVehiculoData) => Promise<void>;
  updateVehiculo: (id: number, data: UpdateVehiculoData) => Promise<void>;
  deleteVehiculo: (id: number) => Promise<void>;
  clearError: () => void;
}

const convertVehiculoFromBackend = (vehiculo: any): Vehiculo => ({
  id: vehiculo.id,
  matricula: vehiculo.matricula,
  bastidor: vehiculo.bastidor,
  marca: vehiculo.marca,
  modelo: vehiculo.modelo,
  tipo: vehiculo.tipo,
  plazas: vehiculo.plazas,
  annoFabricacion: vehiculo.anno_fabricacion,
  combustible: vehiculo.combustible,
  kilometraje: vehiculo.kilometraje || 0,
  itv: {
    fechaUltima: vehiculo.itv_fecha_ultima,
    fechaProxima: vehiculo.itv_fecha_proxima,
    resultado: vehiculo.itv_resultado,
  },
  seguro: {
    compania: vehiculo.seguro_compania,
    poliza: vehiculo.seguro_poliza,
    fechaVencimiento: vehiculo.seguro_fecha_vencimiento,
  },
  estado: vehiculo.estado || 'operativo',
  ubicacion: vehiculo.ubicacion,
  notas: vehiculo.notas,
  imagenUrl: vehiculo.imagen_url,
});

const convertVehiculoToBackend = (data: CreateVehiculoData | UpdateVehiculoData) => {
  const backendData: any = {};
  
  if (data.matricula !== undefined) backendData.matricula = data.matricula;
  if (data.bastidor !== undefined) backendData.bastidor = data.bastidor || null;
  if (data.marca !== undefined) backendData.marca = data.marca;
  if (data.modelo !== undefined) backendData.modelo = data.modelo;
  if (data.tipo !== undefined) backendData.tipo = data.tipo || null;
  if (data.plazas !== undefined) backendData.plazas = data.plazas || null;
  if (data.annoFabricacion !== undefined) backendData.anno_fabricacion = data.annoFabricacion || null;
  if (data.combustible !== undefined) backendData.combustible = data.combustible || null;
  if (data.kilometraje !== undefined) backendData.kilometraje = data.kilometraje || 0;
  
  // ITV - CORREGIDO: Verificar con 'in'
  if ('itv' in data && data.itv) {
    if (data.itv.fechaUltima !== undefined) backendData.itv_fecha_ultima = data.itv.fechaUltima || null;
    if (data.itv.fechaProxima !== undefined) backendData.itv_fecha_proxima = data.itv.fechaProxima || null;
    if (data.itv.resultado !== undefined) backendData.itv_resultado = data.itv.resultado || null;
  }
  
  // Seguro - CORREGIDO: Verificar con 'in'
  if ('seguro' in data && data.seguro) {
    if (data.seguro.compania !== undefined) backendData.seguro_compania = data.seguro.compania || null;
    if (data.seguro.poliza !== undefined) backendData.seguro_poliza = data.seguro.poliza || null;
    if (data.seguro.fechaVencimiento !== undefined) backendData.seguro_fecha_vencimiento = data.seguro.fechaVencimiento || null;
  }
  
  if (data.estado !== undefined) backendData.estado = data.estado || 'operativo';
  if (data.ubicacion !== undefined) backendData.ubicacion = data.ubicacion || null;
  if (data.notas !== undefined) backendData.notas = data.notas || null;
  if (data.imagenUrl !== undefined) backendData.imagen_url = data.imagenUrl || null;
  
  return backendData;
};

export const useVehiculosStore = create<VehiculosState>((set) => ({
  vehiculos: [],
  vehiculoActual: null,
  loading: false,
  error: null,

  fetchVehiculos: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/vehiculos/');
      set({ 
        vehiculos: data.map(convertVehiculoFromBackend),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchVehiculo: async (id) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get(`/vehiculos/${id}`);
      set({ 
        vehiculoActual: convertVehiculoFromBackend(data),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createVehiculo: async (data) => {
    set({ loading: true, error: null });
    try {
      const newVehiculo = await api.post('/vehiculos/', convertVehiculoToBackend(data));
      set((state) => ({
        vehiculos: [...state.vehiculos, convertVehiculoFromBackend(newVehiculo)],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateVehiculo: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updatedVehiculo = await api.put(`/vehiculos/${id}`, convertVehiculoToBackend(data));
      set((state) => ({
        vehiculos: state.vehiculos.map((v) =>
          v.id === id ? convertVehiculoFromBackend(updatedVehiculo) : v
        ),
        vehiculoActual: convertVehiculoFromBackend(updatedVehiculo),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteVehiculo: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/vehiculos/${id}`);
      set((state) => ({
        vehiculos: state.vehiculos.filter((v) => v.id !== id),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

// ==================== SERVICIOS STORE ====================

interface ServiciosState {
  servicios: Servicio[];
  servicioActual: Servicio | null;
  loading: boolean;
  error: string | null;
  fetchServicios: () => Promise<void>;
  fetchServicio: (id: number) => Promise<void>;
  createServicio: (data: CreateServicioData) => Promise<void>;
  updateServicio: (id: number, data: UpdateServicioData) => Promise<void>;
  deleteServicio: (id: number) => Promise<void>;
  clearError: () => void;
}

const convertServicioFromBackend = (servicio: any): Servicio => ({
  id: servicio.id,
  codigo: servicio.codigo,
  clienteId: servicio.cliente_id,
  clienteNombre: servicio.cliente?.nombre || '',
  tipo: servicio.tipo || 'lanzadera',
  estado: servicio.estado || 'solicitud',
  titulo: servicio.titulo,
  descripcion: servicio.descripcion,
  fechaInicio: servicio.fecha_inicio,
  fechaFin: servicio.fecha_fin,
  horaInicio: servicio.hora_inicio,
  horaFin: servicio.hora_fin,
  conductorId: servicio.conductor_id,
  vehiculoId: servicio.vehiculo_id,
  numeroVehiculos: servicio.numero_vehiculos || 1,
  origen: servicio.origen,
  destino: servicio.destino,
  ubicacionEvento: servicio.ubicacion_evento,
  costeEstimado: servicio.coste_estimado || 0,
  costeReal: servicio.coste_real,
  precio: servicio.precio || 0,
  margen: servicio.margen,
  facturado: servicio.facturado || false,
  facturaId: servicio.factura_id,
  notasInternas: servicio.notas_internas,
  notasCliente: servicio.notas_cliente,
  fechaCreacion: servicio.fecha_creacion,
});

const convertServicioToBackend = (data: CreateServicioData | UpdateServicioData) => {
  const backendData: any = {};
  
  // Campos requeridos y opcionales para crear
  if ('clienteId' in data && data.clienteId !== undefined) {
    backendData.cliente_id = data.clienteId;
  }
  
  if ('tipo' in data && data.tipo !== undefined) backendData.tipo = data.tipo;
  if ('estado' in data && data.estado !== undefined) backendData.estado = data.estado;
  if ('titulo' in data && data.titulo !== undefined) backendData.titulo = data.titulo || null;
  if ('descripcion' in data && data.descripcion !== undefined) backendData.descripcion = data.descripcion || null;
  if ('fechaInicio' in data && data.fechaInicio !== undefined) backendData.fecha_inicio = data.fechaInicio || null;
  if ('fechaFin' in data && data.fechaFin !== undefined) backendData.fecha_fin = data.fechaFin || null;
  if ('horaInicio' in data && data.horaInicio !== undefined) backendData.hora_inicio = data.horaInicio || null;
  if ('horaFin' in data && data.horaFin !== undefined) backendData.hora_fin = data.horaFin || null;
  if ('conductorId' in data && data.conductorId !== undefined) backendData.conductor_id = data.conductorId || null;
  if ('vehiculoId' in data && data.vehiculoId !== undefined) backendData.vehiculo_id = data.vehiculoId || null;
  if ('numeroVehiculos' in data && data.numeroVehiculos !== undefined) backendData.numero_vehiculos = data.numeroVehiculos || 1;
  if ('origen' in data && data.origen !== undefined) backendData.origen = data.origen || null;
  if ('destino' in data && data.destino !== undefined) backendData.destino = data.destino || null;
  if ('ubicacionEvento' in data && data.ubicacionEvento !== undefined) backendData.ubicacion_evento = data.ubicacionEvento || null;
  if ('costeEstimado' in data && data.costeEstimado !== undefined) backendData.coste_estimado = data.costeEstimado || 0;
  if ('precio' in data && data.precio !== undefined) backendData.precio = data.precio || 0;
  if ('notasInternas' in data && data.notasInternas !== undefined) backendData.notas_internas = data.notasInternas || null;
  if ('notasCliente' in data && data.notasCliente !== undefined) backendData.notas_cliente = data.notasCliente || null;
  
  // Campos para actualizar
  if ('costeReal' in data && data.costeReal !== undefined) backendData.coste_real = data.costeReal;
  
  return backendData;
};

export const useServiciosStore = create<ServiciosState>((set) => ({
  servicios: [],
  servicioActual: null,
  loading: false,
  error: null,

  fetchServicios: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/servicios/');
      set({ 
        servicios: data.map(convertServicioFromBackend),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchServicio: async (id) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get(`/servicios/${id}`);
      set({ 
        servicioActual: convertServicioFromBackend(data),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createServicio: async (data) => {
    set({ loading: true, error: null });
    try {
      const newServicio = await api.post('/servicios/', convertServicioToBackend(data));
      set((state) => ({
        servicios: [...state.servicios, convertServicioFromBackend(newServicio)],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateServicio: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updatedServicio = await api.put(`/servicios/${id}`, convertServicioToBackend(data));
      set((state) => ({
        servicios: state.servicios.map((s) =>
          s.id === id ? convertServicioFromBackend(updatedServicio) : s
        ),
        servicioActual: convertServicioFromBackend(updatedServicio),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteServicio: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/servicios/${id}`);
      set((state) => ({
        servicios: state.servicios.filter((s) => s.id !== id),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

// ==================== FACTURAS STORE ====================

interface FacturasState {
  facturas: Factura[];
  facturaActual: Factura | null;
  loading: boolean;
  error: string | null;
  fetchFacturas: () => Promise<void>;
  fetchFactura: (id: number) => Promise<void>;
  createFactura: (data: CreateFacturaData) => Promise<void>;
  updateFacturaEstado: (id: number, estado: string) => Promise<void>;
  deleteFactura: (id: number) => Promise<void>;
  clearError: () => void;
}

const convertFacturaFromBackend = (factura: any): Factura => ({
  id: factura.id,
  numero: factura.numero,
  clienteId: factura.cliente_id,
  clienteNombre: factura.cliente?.nombre || '',
  fecha: factura.fecha_emision || '',
  fechaVencimiento: factura.fecha_vencimiento || '',
  subtotal: factura.subtotal || 0,
  iva: factura.impuestos || 0,
  total: factura.total || 0,
  estado: factura.estado,
  concepto: factura.notas || '',
});

export const useFacturasStore = create<FacturasState>((set) => ({
  facturas: [],
  facturaActual: null,
  loading: false,
  error: null,

  fetchFacturas: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/facturas/');
      set({ 
        facturas: data.map(convertFacturaFromBackend),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchFactura: async (id) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get(`/facturas/${id}`);
      set({ 
        facturaActual: convertFacturaFromBackend(data),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createFactura: async (data) => {
    set({ loading: true, error: null });
    try {
      const newFactura = await api.post('/facturas/', {
        cliente_id: data.clienteId,
        fecha_emision: data.fecha,
        fecha_vencimiento: data.fechaVencimiento,
        notas: data.concepto,
        subtotal: data.subtotal,
        impuestos: data.iva || 21,
        total: data.subtotal * (1 + (data.iva || 21) / 100),
      });
      set((state) => ({
        facturas: [...state.facturas, convertFacturaFromBackend(newFactura)],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateFacturaEstado: async (id, estado) => {
    set({ loading: true, error: null });
    try {
      const updatedFactura = await api.put(`/facturas/${id}/estado`, { estado });
      set((state) => ({
        facturas: state.facturas.map((f) =>
          f.id === id ? convertFacturaFromBackend(updatedFactura) : f
        ),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteFactura: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/facturas/${id}`);
      set((state) => ({
        facturas: state.facturas.filter((f) => f.id !== id),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

// ==================== DASHBOARD STORE ====================

interface DashboardState {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  fetchDashboard: () => Promise<void>;
  clearError: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  data: null,
  loading: false,
  error: null,

  fetchDashboard: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/dashboard/stats');
      set({ 
        data: {
          stats: {
            totalClientes: data.totalClientes || 0,
            totalServicios: data.serviciosMes || 0,
            totalFacturado: data.facturacionMes || 0,
            facturasPendientes: 0,
            serviciosPendientes: data.serviciosActivos || 0,
            serviciosEsteMes: data.serviciosMes || 0,
          },
          monthlyData: [],
          ultimosServicios: [],
          facturasPendientes: [],
        },
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));