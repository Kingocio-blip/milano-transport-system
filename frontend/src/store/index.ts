import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  User,
  Cliente,
  Servicio,
  Factura,
  Conductor,
  Vehiculo,
  CreateClienteData,
  UpdateClienteData,
  CreateServicioData,
  UpdateServicioData,
  CreateFacturaData,
  CreateConductorData,
  UpdateConductorData,
  CreateVehiculoData,
  UpdateVehiculoData,
  DashboardData,
  LoginCredentials,
  AuthResponse,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ==================== AUTH STORE ====================

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  checkAuth: () => boolean;
}

// Helper para convertir usuario del backend
const convertUserFromBackend = (user: any): User => ({
  id: user.id,
  username: user.username,
  email: user.email,
  nombre: user.nombre,
  apellidos: user.apellidos,
  rol: user.rol,
  activo: user.activo,
  fechaAlta: user.fecha_alta,
  ultimoAcceso: user.ultimo_aceso,
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
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            username: credentials.username,
            password: credentials.password,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Error de autenticación');
        }

        const data: AuthResponse = await response.json();
        
        set({
          user: convertUserFromBackend(data.user),
          token: data.access_token,
          isAuthenticated: true,
        });
      },

      logout: () => {
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
  fetchClientes: (token: string) => Promise<void>;
  fetchCliente: (id: number, token: string) => Promise<void>;
  createCliente: (data: CreateClienteData, token: string) => Promise<void>;
  updateCliente: (id: number, data: UpdateClienteData, token: string) => Promise<void>;
  deleteCliente: (id: number, token: string) => Promise<void>;
  clearError: () => void;
}

// Helper para convertir cliente del backend
const convertClienteFromBackend = (cliente: any): Cliente => ({
  id: cliente.id,
  codigo: cliente.codigo,
  nombre: cliente.nombre,
  cif: cliente.cif || '',
  email: cliente.email || '',
  telefono: cliente.telefono || '',
  direccion: cliente.direccion || '',
  ciudad: cliente.ciudad || '',
  codigoPostal: cliente.codigo_postal || '',
  formaPago: cliente.forma_pago || '',
  diasPago: cliente.dias_pago || 0,
  condicionesEspeciales: cliente.condiciones_especiales || '',
  notas: cliente.notas || '',
  fechaAlta: cliente.fecha_alta,
  contacto: cliente.contacto ? {
    id: cliente.contacto.id,
    clienteId: cliente.contacto.cliente_id,
    nombre: cliente.contacto.nombre,
    email: cliente.contacto.email || '',
    telefono: cliente.contacto.telefono || '',
    cargo: cliente.contacto.cargo || '',
    principal: cliente.contacto.principal,
  } : undefined,
  // Campos de estadísticas
  totalServicios: cliente.total_servicios || 0,
  totalFacturado: cliente.total_facturado || 0,
  ultimoServicio: cliente.ultimo_servicio,
});

// Helper para convertir datos al backend
const convertClienteToBackend = (data: CreateClienteData | UpdateClienteData) => {
  const backendData: any = {};
  
  if (data.nombre !== undefined) backendData.nombre = data.nombre;
  if (data.cif !== undefined) backendData.cif = data.cif || null;
  if (data.email !== undefined) backendData.email = data.email || null;
  if (data.telefono !== undefined) backendData.telefono = data.telefono || null;
  if (data.direccion !== undefined) backendData.direccion = data.direccion || null;
  if (data.ciudad !== undefined) backendData.ciudad = data.ciudad || null;
  if (data.codigoPostal !== undefined) backendData.codigo_postal = data.codigoPostal || null;
  if (data.formaPago !== undefined) backendData.forma_pago = data.formaPago || null;
  if (data.diasPago !== undefined) backendData.dias_pago = data.diasPago || null;
  if (data.condicionesEspeciales !== undefined) backendData.condiciones_especiales = data.condicionesEspeciales || null;
  if (data.notas !== undefined) backendData.notas = data.notas || null;
  if (data.contacto !== undefined) backendData.contacto = data.contacto;
  
  return backendData;
};

export const useClientesStore = create<ClientesState>((set, get) => ({
  clientes: [],
  clienteActual: null,
  loading: false,
  error: null,

  fetchClientes: async (token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/clientes/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al cargar clientes');

      const data = await response.json();
      set({ 
        clientes: data.map(convertClienteFromBackend),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchCliente: async (id, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/clientes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al cargar cliente');

      const data = await response.json();
      set({ 
        clienteActual: convertClienteFromBackend(data),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createCliente: async (data, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/clientes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(convertClienteToBackend(data)),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al crear cliente');
      }

      const newCliente = await response.json();
      set((state) => ({
        clientes: [...state.clientes, convertClienteFromBackend(newCliente)],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateCliente: async (id, data, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/clientes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(convertClienteToBackend(data)),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al actualizar cliente');
      }

      const updatedCliente = await response.json();
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

  deleteCliente: async (id, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/clientes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al eliminar cliente');

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

// ==================== SERVICIOS STORE ====================

interface ServiciosState {
  servicios: Servicio[];
  servicioActual: Servicio | null;
  loading: boolean;
  error: string | null;
  fetchServicios: (token: string) => Promise<void>;
  fetchServicio: (id: number, token: string) => Promise<void>;
  createServicio: (data: CreateServicioData, token: string) => Promise<void>;
  updateServicio: (id: number, data: UpdateServicioData, token: string) => Promise<void>;
  deleteServicio: (id: number, token: string) => Promise<void>;
  clearError: () => void;
}

// Helper para convertir servicio del backend
const convertServicioFromBackend = (servicio: any): Servicio => ({
  id: servicio.id,
  codigo: servicio.codigo,
  clienteId: servicio.cliente_id,
  clienteNombre: servicio.cliente_nombre,
  tipo: servicio.tipo,
  descripcion: servicio.descripcion,
  fechaInicio: servicio.fecha_inicio,
  fechaFin: servicio.fecha_fin,
  estado: servicio.estado,
  importe: servicio.importe || 0,
  notas: servicio.notas || '',
});

// Helper para convertir datos al backend
const convertServicioToBackend = (data: CreateServicioData | UpdateServicioData) => {
  const backendData: any = {};
  
  if (data.clienteId !== undefined) backendData.cliente_id = data.clienteId;
  if (data.tipo !== undefined) backendData.tipo = data.tipo;
  if (data.descripcion !== undefined) backendData.descripcion = data.descripcion;
  if (data.fechaInicio !== undefined) backendData.fecha_inicio = data.fechaInicio;
  if (data.fechaFin !== undefined) backendData.fecha_fin = data.fechaFin || null;
  if (data.estado !== undefined) backendData.estado = data.estado;
  if (data.importe !== undefined) backendData.importe = data.importe || null;
  if (data.notas !== undefined) backendData.notas = data.notas || null;
  
  return backendData;
};

export const useServiciosStore = create<ServiciosState>((set, get) => ({
  servicios: [],
  servicioActual: null,
  loading: false,
  error: null,

  fetchServicios: async (token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/servicios/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al cargar servicios');

      const data = await response.json();
      set({ 
        servicios: data.map(convertServicioFromBackend),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchServicio: async (id, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/servicios/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al cargar servicio');

      const data = await response.json();
      set({ 
        servicioActual: convertServicioFromBackend(data),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createServicio: async (data, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/servicios/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(convertServicioToBackend(data)),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al crear servicio');
      }

      const newServicio = await response.json();
      set((state) => ({
        servicios: [...state.servicios, convertServicioFromBackend(newServicio)],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateServicio: async (id, data, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/servicios/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(convertServicioToBackend(data)),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al actualizar servicio');
      }

      const updatedServicio = await response.json();
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

  deleteServicio: async (id, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/servicios/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al eliminar servicio');

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
  fetchFacturas: (token: string) => Promise<void>;
  fetchFactura: (id: number, token: string) => Promise<void>;
  createFactura: (data: CreateFacturaData, token: string) => Promise<void>;
  updateFacturaEstado: (id: number, estado: string, token: string) => Promise<void>;
  deleteFactura: (id: number, token: string) => Promise<void>;
  clearError: () => void;
}

// Helper para convertir factura del backend
const convertFacturaFromBackend = (factura: any): Factura => ({
  id: factura.id,
  numero: factura.numero,
  clienteId: factura.cliente_id,
  clienteNombre: factura.cliente_nombre,
  fecha: factura.fecha,
  fechaVencimiento: factura.fecha_vencimiento,
  subtotal: factura.subtotal,
  iva: factura.iva,
  total: factura.total,
  estado: factura.estado,
  concepto: factura.concepto,
});

export const useFacturasStore = create<FacturasState>((set, get) => ({
  facturas: [],
  facturaActual: null,
  loading: false,
  error: null,

  fetchFacturas: async (token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/facturas/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al cargar facturas');

      const data = await response.json();
      set({ 
        facturas: data.map(convertFacturaFromBackend),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchFactura: async (id, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/facturas/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al cargar factura');

      const data = await response.json();
      set({ 
        facturaActual: convertFacturaFromBackend(data),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createFactura: async (data, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/facturas/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cliente_id: data.clienteId,
          fecha: data.fecha,
          fecha_vencimiento: data.fechaVencimiento,
          concepto: data.concepto,
          subtotal: data.subtotal,
          iva: data.iva || 21,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al crear factura');
      }

      const newFactura = await response.json();
      set((state) => ({
        facturas: [...state.facturas, convertFacturaFromBackend(newFactura)],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateFacturaEstado: async (id, estado, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/facturas/${id}/estado`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ estado }),
      });

      if (!response.ok) throw new Error('Error al actualizar estado');

      const updatedFactura = await response.json();
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

  deleteFactura: async (id, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/facturas/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al eliminar factura');

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
  fetchDashboard: (token: string) => Promise<void>;
  clearError: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  data: null,
  loading: false,
  error: null,

  fetchDashboard: async (token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/dashboard/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al cargar dashboard');

      const data = await response.json();
      set({ 
        data: {
          stats: data.stats,
          monthlyData: data.monthly_data,
          ultimosServicios: data.ultimos_servicios.map(convertServicioFromBackend),
          facturasPendientes: data.facturas_pendientes.map(convertFacturaFromBackend),
        },
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

// ==================== CONDUCTORES STORE ====================

// Helper para convertir conductor del backend (snake_case -> camelCase)
const convertConductorFromBackend = (conductor: any): Conductor => ({
  id: conductor.id,
  codigo: conductor.codigo,
  nombre: conductor.nombre,
  apellidos: conductor.apellidos,
  dni: conductor.dni || '',
  email: conductor.email || '',
  telefono: conductor.telefono || '',
  direccion: conductor.direccion || '',
  fechaNacimiento: conductor.fecha_nacimiento,
  fechaAlta: conductor.fecha_alta,
  licencia: conductor.licencia_tipo ? {
    tipo: conductor.licencia_tipo,
    numero: conductor.licencia_numero || '',
    fechaCaducidad: conductor.licencia_caducidad || '',
  } : undefined,
  tieneCap: conductor.tiene_cap || false,
  capCaducidad: conductor.cap_caducidad,
  numeroSeguridadSocial: conductor.numero_seguridad_social || '',
  tipoContrato: conductor.tipo_contrato || 'indefinido',
  tarifaHora: conductor.tarifa_hora || 0,
  activo: conductor.activo,
  notas: conductor.notas || '',
});

// Helper para convertir datos al backend (camelCase -> snake_case)
const convertConductorToBackend = (data: CreateConductorData | UpdateConductorData) => {
  const backendData: any = {};
  
  if (data.nombre !== undefined) backendData.nombre = data.nombre;
  if (data.apellidos !== undefined) backendData.apellidos = data.apellidos;
  if (data.dni !== undefined) backendData.dni = data.dni || null;
  if (data.email !== undefined) backendData.email = data.email || null;
  if (data.telefono !== undefined) backendData.telefono = data.telefono || null;
  if (data.direccion !== undefined) backendData.direccion = data.direccion || null;
  if (data.fechaNacimiento !== undefined) backendData.fecha_nacimiento = data.fechaNacimiento || null;
  
  // Campos de licencia en snake_case
  if (data.licencia !== undefined) {
    backendData.licencia_tipo = data.licencia?.tipo || null;
    backendData.licencia_numero = data.licencia?.numero || null;
    backendData.licencia_caducidad = data.licencia?.fechaCaducidad || null;
  }
  
  // Campos adicionales en snake_case
  if (data.tieneCap !== undefined) backendData.tiene_cap = data.tieneCap;
  if (data.capCaducidad !== undefined) backendData.cap_caducidad = data.capCaducidad || null;
  if (data.numeroSeguridadSocial !== undefined) backendData.numero_seguridad_social = data.numeroSeguridadSocial || null;
  if (data.tipoContrato !== undefined) backendData.tipo_contrato = data.tipoContrato;
  if (data.tarifaHora !== undefined) backendData.tarifa_hora = data.tarifaHora;
  if (data.activo !== undefined) backendData.activo = data.activo;
  if (data.notas !== undefined) backendData.notas = data.notas || null;
  
  return backendData;
};

interface ConductoresState {
  conductores: Conductor[];
  conductorActual: Conductor | null;
  loading: boolean;
  error: string | null;
  fetchConductores: (token: string) => Promise<void>;
  fetchConductor: (id: number, token: string) => Promise<void>;
  createConductor: (data: CreateConductorData, token: string) => Promise<void>;
  updateConductor: (id: number, data: UpdateConductorData, token: string) => Promise<void>;
  deleteConductor: (id: number, token: string) => Promise<void>;
  clearError: () => void;
}

export const useConductoresStore = create<ConductoresState>((set, get) => ({
  conductores: [],
  conductorActual: null,
  loading: false,
  error: null,

  fetchConductores: async (token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/conductores/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al cargar conductores');

      const data = await response.json();
      set({ 
        conductores: data.map(convertConductorFromBackend),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchConductor: async (id, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/conductores/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al cargar conductor');

      const data = await response.json();
      set({ 
        conductorActual: convertConductorFromBackend(data),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createConductor: async (data, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/conductores/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(convertConductorToBackend(data)),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al crear conductor');
      }

      const newConductor = await response.json();
      set((state) => ({
        conductores: [...state.conductores, convertConductorFromBackend(newConductor)],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateConductor: async (id, data, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/conductores/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(convertConductorToBackend(data)),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al actualizar conductor');
      }

      const updatedConductor = await response.json();
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

  deleteConductor: async (id, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/conductores/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al eliminar conductor');

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

// Helper para convertir vehiculo del backend (snake_case -> camelCase)
const convertVehiculoFromBackend = (vehiculo: any): Vehiculo => ({
  id: vehiculo.id,
  codigo: vehiculo.codigo,
  matricula: vehiculo.matricula,
  marca: vehiculo.marca,
  modelo: vehiculo.modelo,
  annoFabricacion: vehiculo.anno_fabricacion,
  plazas: vehiculo.plazas || 0,
  tipo: vehiculo.tipo || 'coche',
  estado: vehiculo.estado || 'activo',
  itv: vehiculo.itv_fecha_ultima ? {
    fechaUltima: vehiculo.itv_fecha_ultima,
    fechaProxima: vehiculo.itv_fecha_proxima,
    resultado: vehiculo.itv_resultado,
  } : undefined,
  seguro: vehiculo.seguro_compania ? {
    compania: vehiculo.seguro_compania,
    poliza: vehiculo.seguro_poliza,
    fechaVencimiento: vehiculo.seguro_fecha_vencimiento,
  } : undefined,
  imagenUrl: vehiculo.imagen_url,
  fechaAlta: vehiculo.fecha_alta,
  notas: vehiculo.notas || '',
});

// Helper para convertir datos al backend (camelCase -> snake_case)
const convertVehiculoToBackend = (data: CreateVehiculoData | UpdateVehiculoData) => {
  const backendData: any = {};
  
  if (data.matricula !== undefined) backendData.matricula = data.matricula;
  if (data.marca !== undefined) backendData.marca = data.marca;
  if (data.modelo !== undefined) backendData.modelo = data.modelo;
  if (data.annoFabricacion !== undefined) backendData.anno_fabricacion = data.annoFabricacion || null;
  if (data.plazas !== undefined) backendData.plazas = data.plazas;
  if (data.tipo !== undefined) backendData.tipo = data.tipo;
  if (data.estado !== undefined) backendData.estado = data.estado;
  
  // Campos ITV en snake_case
  if (data.itv !== undefined) {
    backendData.itv_fecha_ultima = data.itv?.fechaUltima || null;
    backendData.itv_fecha_proxima = data.itv?.fechaProxima || null;
    backendData.itv_resultado = data.itv?.resultado || null;
  }
  
  // Campos seguro en snake_case
  if (data.seguro !== undefined) {
    backendData.seguro_compania = data.seguro?.compania || null;
    backendData.seguro_poliza = data.seguro?.poliza || null;
    backendData.seguro_fecha_vencimiento = data.seguro?.fechaVencimiento || null;
  }
  
  if (data.imagenUrl !== undefined) backendData.imagen_url = data.imagenUrl || null;
  if (data.notas !== undefined) backendData.notas = data.notas || null;
  
  return backendData;
};

interface VehiculosState {
  vehiculos: Vehiculo[];
  vehiculoActual: Vehiculo | null;
  loading: boolean;
  error: string | null;
  fetchVehiculos: (token: string) => Promise<void>;
  fetchVehiculo: (id: number, token: string) => Promise<void>;
  createVehiculo: (data: CreateVehiculoData, token: string) => Promise<void>;
  updateVehiculo: (id: number, data: UpdateVehiculoData, token: string) => Promise<void>;
  deleteVehiculo: (id: number, token: string) => Promise<void>;
  clearError: () => void;
}

export const useVehiculosStore = create<VehiculosState>((set, get) => ({
  vehiculos: [],
  vehiculoActual: null,
  loading: false,
  error: null,

  fetchVehiculos: async (token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/vehiculos/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al cargar vehiculos');

      const data = await response.json();
      set({ 
        vehiculos: data.map(convertVehiculoFromBackend),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchVehiculo: async (id, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/vehiculos/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al cargar vehiculo');

      const data = await response.json();
      set({ 
        vehiculoActual: convertVehiculoFromBackend(data),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createVehiculo: async (data, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/vehiculos/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(convertVehiculoToBackend(data)),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al crear vehiculo');
      }

      const newVehiculo = await response.json();
      set((state) => ({
        vehiculos: [...state.vehiculos, convertVehiculoFromBackend(newVehiculo)],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateVehiculo: async (id, data, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/vehiculos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(convertVehiculoToBackend(data)),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al actualizar vehiculo');
      }

      const updatedVehiculo = await response.json();
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

  deleteVehiculo: async (id, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/vehiculos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al eliminar vehiculo');

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