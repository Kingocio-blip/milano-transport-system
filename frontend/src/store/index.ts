// ============================================
// MILANO - Sistema de Gestión de Transporte
// Stores Zustand con API Backend
// ============================================

import { create } from 'zustand';
import { localStorageService } from '../lib/localStorage';
import { clientesApi, vehiculosApi, conductoresApi, serviciosApi, facturasApi, dashboardApi } from '../lib/api';
import type {
  Cliente,
  Vehiculo,
  Conductor,
  Servicio,
  Factura,
  Alerta,
  Usuario,
  KPIDashboard,
  TipoCliente,
  EstadoVehiculo,
  EstadoConductor,
  EstadoFactura,
  Mantenimiento,
} from '../types';

// ============================================
// STORE DE CLIENTES
// ============================================
interface ClientesState {
  clientes: Cliente[];
  isLoading: boolean;
  error: string | null;
  clienteSeleccionado: Cliente | null;
  // Acciones
  fetchClientes: () => Promise<void>;
  addCliente: (cliente: Omit<Cliente, 'id' | 'codigo' | 'fechaAlta'>) => Promise<boolean>;
  updateCliente: (id: string, data: Partial<Cliente>) => Promise<boolean>;
  deleteCliente: (id: string) => Promise<boolean>;
  seleccionarCliente: (cliente: Cliente | null) => void;
  // Getters
  getClienteById: (id: string) => Cliente | undefined;
  getClientesByTipo: (tipo: TipoCliente) => Cliente[];
  getClientesActivos: () => Cliente[];
}

export const useClientesStore = create<ClientesState>((set, get) => ({
  clientes: [],
  isLoading: false,
  error: null,
  clienteSeleccionado: null,

  fetchClientes: async () => {
    set({ isLoading: true, error: null });
    try {
      const clientes = await clientesApi.getAll();
      // Convertir id a string y mapear campos del backend
      const clientesFormateados = clientes.map((c: any) => ({
        ...c,
        id: String(c.id),
        fechaAlta: c.fecha_alta,
        totalServicios: c.total_servicios || 0,
        totalFacturado: c.total_facturado || 0,
        ultimoServicio: c.ultimo_servicio,
        contacto: c.contacto || {
          email: c.contacto_email || '',
          telefono: c.contacto_telefono || '',
          direccion: c.contacto_direccion || '',
          ciudad: c.contacto_ciudad || '',
          codigoPostal: c.contacto_codigo_postal || ''
        }
      }));
      set({ clientes: clientesFormateados, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addCliente: async (cliente) => {
    set({ isLoading: true, error: null });
    try {
      // Convertir datos del frontend al formato que espera el backend (snake_case)
      const clienteParaBackend: any = {
        nombre: cliente.nombre,
        tipo: cliente.tipo || 'empresa',
        nif: cliente.nif || null,
        estado: cliente.estado || 'activo',
        forma_pago: cliente.formaPago || 'transferencia',
        dias_pago: cliente.diasPago || 30,
        condiciones_especiales: cliente.condicionesEspeciales || null,
        notas: cliente.notas || null,
        // Convertir contacto anidado a campos planos snake_case
        contacto_email: cliente.contacto?.email || null,
        contacto_telefono: cliente.contacto?.telefono || null,
        contacto_direccion: cliente.contacto?.direccion || null,
        contacto_ciudad: cliente.contacto?.ciudad || null,
        contacto_codigo_postal: cliente.contacto?.codigoPostal || null,
      };

      const nuevo = await clientesApi.create(clienteParaBackend);
      const clienteFormateado = {
        ...nuevo,
        id: String(nuevo.id),
        fechaAlta: nuevo.fecha_alta,
        totalServicios: nuevo.total_servicios || 0,
        totalFacturado: nuevo.total_facturado || 0,
        ultimoServicio: nuevo.ultimo_servicio,
        contacto: {
          email: nuevo.contacto_email || '',
          telefono: nuevo.contacto_telefono || '',
          direccion: nuevo.contacto_direccion || '',
          ciudad: nuevo.contacto_ciudad || '',
          codigoPostal: nuevo.contacto_codigo_postal || ''
        }
      };
      set((state) => ({ clientes: [...state.clientes, clienteFormateado], isLoading: false }));
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  updateCliente: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      // Convertir datos del frontend al formato que espera el backend (snake_case)
      const dataParaBackend: any = {};
      
      if (data.nombre !== undefined) dataParaBackend.nombre = data.nombre;
      if (data.tipo !== undefined) dataParaBackend.tipo = data.tipo;
      if (data.nif !== undefined) dataParaBackend.nif = data.nif || null;
      if (data.estado !== undefined) dataParaBackend.estado = data.estado;
      if (data.formaPago !== undefined) dataParaBackend.forma_pago = data.formaPago;
      if (data.diasPago !== undefined) dataParaBackend.dias_pago = data.diasPago;
      if (data.condicionesEspeciales !== undefined) dataParaBackend.condiciones_especiales = data.condicionesEspeciales || null;
      if (data.notas !== undefined) dataParaBackend.notas = data.notas || null;
      
      // Convertir contacto anidado a campos planos snake_case
      if (data.contacto) {
        dataParaBackend.contacto_email = data.contacto.email || null;
        dataParaBackend.contacto_telefono = data.contacto.telefono || null;
        dataParaBackend.contacto_direccion = data.contacto.direccion || null;
        dataParaBackend.contacto_ciudad = data.contacto.ciudad || null;
        dataParaBackend.contacto_codigo_postal = data.contacto.codigoPostal || null;
      }

      const actualizado = await clientesApi.update(id, dataParaBackend);
      if (actualizado) {
        const clienteFormateado = {
          ...actualizado,
          id: String(actualizado.id),
          fechaAlta: actualizado.fecha_alta,
          totalServicios: actualizado.total_servicios || 0,
          totalFacturado: actualizado.total_facturado || 0,
          ultimoServicio: actualizado.ultimo_servicio,
          contacto: {
            email: actualizado.contacto_email || '',
            telefono: actualizado.contacto_telefono || '',
            direccion: actualizado.contacto_direccion || '',
            ciudad: actualizado.contacto_ciudad || '',
            codigoPostal: actualizado.contacto_codigo_postal || ''
          }
        };
        set((state) => ({
          clientes: state.clientes.map(c => String(c.id) === String(id) ? clienteFormateado : c),
          isLoading: false,
        }));
      }
      return !!actualizado;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  deleteCliente: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await clientesApi.delete(id);
      set((state) => ({
        clientes: state.clientes.filter(c => c.id !== id),
        isLoading: false,
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  seleccionarCliente: (cliente) => set({ clienteSeleccionado: cliente }),

  getClienteById: (id) => get().clientes.find(c => c.id === id),
  getClientesByTipo: (tipo) => get().clientes.filter(c => c.tipo === tipo),
  getClientesActivos: () => get().clientes.filter(c => c.estado === 'activo'),
}));

// ============================================
// STORE DE VEHÍCULOS (FLOTA)
// ============================================
interface VehiculosState {
  vehiculos: Vehiculo[];
  isLoading: boolean;
  error: string | null;
  vehiculoSeleccionado: Vehiculo | null;
  // Acciones
  fetchVehiculos: () => Promise<void>;
  addVehiculo: (vehiculo: Omit<Vehiculo, 'id' | 'mantenimientos'> & { mantenimientos?: Mantenimiento[] }) => Promise<boolean>;
  updateVehiculo: (id: string, data: Partial<Vehiculo>) => Promise<boolean>;
  deleteVehiculo: (id: string) => Promise<boolean>;
  seleccionarVehiculo: (vehiculo: Vehiculo | null) => void;
  addMantenimiento: (vehiculoId: string, mantenimiento: any) => void;
  // Getters
  getVehiculoById: (id: string) => Vehiculo | undefined;
  getVehiculosByEstado: (estado: EstadoVehiculo) => Vehiculo[];
  getVehiculosOperativos: () => Vehiculo[];
  getVehiculosConITVProxima: () => Vehiculo[];
  getVehiculosConSeguroProximo: () => Vehiculo[];
}

export const useVehiculosStore = create<VehiculosState>((set, get) => ({
  vehiculos: [],
  isLoading: false,
  error: null,
  vehiculoSeleccionado: null,

  fetchVehiculos: async () => {
    set({ isLoading: true, error: null });
    try {
      const vehiculos = await vehiculosApi.getAll();
      // Convertir id a string y mapear campos del backend
      const vehiculosFormateados = vehiculos.map((v: any) => ({
        ...v,
        id: String(v.id),
        itv: v.itv || {
          fechaUltima: v.itv_fecha_ultima,
          fechaProxima: v.itv_fecha_proxima,
          resultado: v.itv_resultado,
          observaciones: v.itv_observaciones,
        },
        seguro: v.seguro || {
          compania: v.seguro_compania,
          poliza: v.seguro_poliza,
          tipoCobertura: v.seguro_tipo_cobertura,
          fechaInicio: v.seguro_fecha_inicio,
          fechaVencimiento: v.seguro_fecha_vencimiento,
          prima: v.seguro_prima,
        },
        mantenimientos: v.mantenimientos || [],
      }));
      set({ vehiculos: vehiculosFormateados, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addVehiculo: async (vehiculo) => {
    set({ isLoading: true, error: null });
    try {
      // Convertir datos del frontend al formato que espera el backend (snake_case)
      const vehiculoParaBackend: any = {
        matricula: vehiculo.matricula,
        bastidor: vehiculo.bastidor || null,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        tipo: vehiculo.tipo,
        plazas: vehiculo.plazas,
        año_fabricacion: vehiculo.añoFabricacion || null,
        kilometraje: vehiculo.kilometraje || 0,
        kilometraje_ultima_revision: vehiculo.kilometrajeUltimaRevision || null,
        consumo_medio: vehiculo.consumoMedio || null,
        combustible: vehiculo.combustible || 'diesel',
        estado: vehiculo.estado || 'operativo',
        ubicacion: vehiculo.ubicacion || null,
        notas: vehiculo.notas || null,
        imagen_url: vehiculo.imagenUrl || null,
        // ITV
        itv_fecha_ultima: vehiculo.itv?.fechaUltima || null,
        itv_fecha_proxima: vehiculo.itv?.fechaProxima || null,
        itv_resultado: vehiculo.itv?.resultado || null,
        itv_observaciones: vehiculo.itv?.observaciones || null,
        // Seguro
        seguro_compania: vehiculo.seguro?.compania || null,
        seguro_poliza: vehiculo.seguro?.poliza || null,
        seguro_tipo_cobertura: vehiculo.seguro?.tipoCobertura || null,
        seguro_fecha_inicio: vehiculo.seguro?.fechaInicio || null,
        seguro_fecha_vencimiento: vehiculo.seguro?.fechaVencimiento || null,
        seguro_prima: vehiculo.seguro?.prima || null,
      };

      const nuevo = await vehiculosApi.create(vehiculoParaBackend);
      const vehiculoFormateado = {
        ...nuevo,
        id: String(nuevo.id),
        itv: nuevo.itv || {
          fechaUltima: nuevo.itv_fecha_ultima,
          fechaProxima: nuevo.itv_fecha_proxima,
          resultado: nuevo.itv_resultado,
          observaciones: nuevo.itv_observaciones,
        },
        seguro: nuevo.seguro || {
          compania: nuevo.seguro_compania,
          poliza: nuevo.seguro_poliza,
          tipoCobertura: nuevo.seguro_tipo_cobertura,
          fechaInicio: nuevo.seguro_fecha_inicio,
          fechaVencimiento: nuevo.seguro_fecha_vencimiento,
          prima: nuevo.seguro_prima,
        },
        mantenimientos: nuevo.mantenimientos || [],
      };
      set((state) => ({ vehiculos: [...state.vehiculos, vehiculoFormateado], isLoading: false }));
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  updateVehiculo: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      // Convertir datos del frontend al formato que espera el backend (snake_case)
      const dataParaBackend: any = {};
      
      if (data.matricula !== undefined) dataParaBackend.matricula = data.matricula;
      if (data.bastidor !== undefined) dataParaBackend.bastidor = data.bastidor || null;
      if (data.marca !== undefined) dataParaBackend.marca = data.marca;
      if (data.modelo !== undefined) dataParaBackend.modelo = data.modelo;
      if (data.tipo !== undefined) dataParaBackend.tipo = data.tipo;
      if (data.plazas !== undefined) dataParaBackend.plazas = data.plazas;
      if (data.añoFabricacion !== undefined) dataParaBackend.año_fabricacion = data.añoFabricacion || null;
      if (data.kilometraje !== undefined) dataParaBackend.kilometraje = data.kilometraje;
      if (data.kilometrajeUltimaRevision !== undefined) dataParaBackend.kilometraje_ultima_revision = data.kilometrajeUltimaRevision || null;
      if (data.consumoMedio !== undefined) dataParaBackend.consumo_medio = data.consumoMedio || null;
      if (data.combustible !== undefined) dataParaBackend.combustible = data.combustible;
      if (data.estado !== undefined) dataParaBackend.estado = data.estado;
      if (data.ubicacion !== undefined) dataParaBackend.ubicacion = data.ubicacion || null;
      if (data.notas !== undefined) dataParaBackend.notas = data.notas || null;
      if (data.imagenUrl !== undefined) dataParaBackend.imagen_url = data.imagenUrl || null;
      
      // ITV
      if (data.itv) {
        dataParaBackend.itv_fecha_ultima = data.itv.fechaUltima || null;
        dataParaBackend.itv_fecha_proxima = data.itv.fechaProxima || null;
        dataParaBackend.itv_resultado = data.itv.resultado || null;
        dataParaBackend.itv_observaciones = data.itv.observaciones || null;
      }
      
      // Seguro
      if (data.seguro) {
        dataParaBackend.seguro_compania = data.seguro.compania || null;
        dataParaBackend.seguro_poliza = data.seguro.poliza || null;
        dataParaBackend.seguro_tipo_cobertura = data.seguro.tipoCobertura || null;
        dataParaBackend.seguro_fecha_inicio = data.seguro.fechaInicio || null;
        dataParaBackend.seguro_fecha_vencimiento = data.seguro.fechaVencimiento || null;
        dataParaBackend.seguro_prima = data.seguro.prima || null;
      }

      const actualizado = await vehiculosApi.update(id, dataParaBackend);
      if (actualizado) {
        const vehiculoFormateado = {
          ...actualizado,
          id: String(actualizado.id),
          itv: actualizado.itv || {
            fechaUltima: actualizado.itv_fecha_ultima,
            fechaProxima: actualizado.itv_fecha_proxima,
            resultado: actualizado.itv_resultado,
            observaciones: actualizado.itv_observaciones,
          },
          seguro: actualizado.seguro || {
            compania: actualizado.seguro_compania,
            poliza: actualizado.seguro_poliza,
            tipoCobertura: actualizado.seguro_tipo_cobertura,
            fechaInicio: actualizado.seguro_fecha_inicio,
            fechaVencimiento: actualizado.seguro_fecha_vencimiento,
            prima: actualizado.seguro_prima,
          },
          mantenimientos: actualizado.mantenimientos || [],
        };
        set((state) => ({
          vehiculos: state.vehiculos.map(v => v.id === id ? vehiculoFormateado : v),
          isLoading: false,
        }));
      }
      return !!actualizado;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  deleteVehiculo: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await vehiculosApi.delete(id);
      set((state) => ({
        vehiculos: state.vehiculos.filter(v => v.id !== id),
        isLoading: false,
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  seleccionarVehiculo: (vehiculo) => set({ vehiculoSeleccionado: vehiculo }),

  addMantenimiento: (vehiculoId, mantenimiento) => {
    const vehiculo = get().vehiculos.find(v => v.id === vehiculoId);
    if (vehiculo) {
      const actualizado = {
        ...vehiculo,
        mantenimientos: [...(vehiculo.mantenimientos || []), mantenimiento],
      };
      localStorageService.vehiculos.update(vehiculoId, actualizado);
      set((state) => ({
        vehiculos: state.vehiculos.map(v => v.id === vehiculoId ? actualizado : v),
      }));
    }
  },

  getVehiculoById: (id) => get().vehiculos.find(v => v.id === id),
  getVehiculosByEstado: (estado) => get().vehiculos.filter(v => v.estado === estado),
  getVehiculosOperativos: () => get().vehiculos.filter(v => v.estado === 'operativo'),
  getVehiculosConITVProxima: () => {
    const hoy = new Date();
    const treintaDias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
    return get().vehiculos.filter(v => {
      const fechaProxima = new Date(v.itv?.fechaProxima || '');
      return fechaProxima <= treintaDias && fechaProxima >= hoy;
    });
  },
  getVehiculosConSeguroProximo: () => {
    const hoy = new Date();
    const treintaDias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
    return get().vehiculos.filter(v => {
      const fechaVenc = new Date(v.seguro?.fechaVencimiento || '');
      return fechaVenc <= treintaDias && fechaVenc >= hoy;
    });
  },
}));

// ============================================
// STORE DE CONDUCTORES
// ============================================
interface ConductoresState {
  conductores: Conductor[];
  isLoading: boolean;
  error: string | null;
  conductorSeleccionado: Conductor | null;
  // Acciones
  fetchConductores: () => Promise<void>;
  addConductor: (conductor: Omit<Conductor, 'id' | 'codigo' | 'fechaAlta'>) => Promise<boolean>;
  updateConductor: (id: string, data: Partial<Conductor>) => Promise<boolean>;
  deleteConductor: (id: string) => Promise<boolean>;
  seleccionarConductor: (conductor: Conductor | null) => void;
  // Getters
  getConductorById: (id: string) => Conductor | undefined;
  getConductoresByEstado: (estado: EstadoConductor) => Conductor[];
  getConductoresDisponibles: () => Conductor[];
  getConductoresConLicenciaProxima: () => Conductor[];
}

export const useConductoresStore = create<ConductoresState>((set, get) => ({
  conductores: [],
  isLoading: false,
  error: null,
  conductorSeleccionado: null,

  fetchConductores: async () => {
    set({ isLoading: true, error: null });
    try {
      const conductores = await conductoresApi.getAll();
      // Convertir id a string y mapear campos del backend
      const conductoresFormateados = conductores.map((c: any) => ({
        ...c,
        id: String(c.id),
        fechaAlta: c.fecha_alta,
        fechaNacimiento: c.fecha_nacimiento,
        tarifaHora: c.tarifa_hora,
        tarifaServicio: c.tarifa_servicio,
        totalHorasMes: c.total_horas_mes,
        totalServiciosMes: c.total_servicios_mes,
        licencia: c.licencia || {
          tipo: c.licencia_tipo,
          numero: c.licencia_numero,
          fechaExpedicion: c.licencia_fecha_expedicion,
          fechaCaducidad: c.licencia_fecha_caducidad,
          permisos: c.licencia_permisos,
        },
        disponibilidad: c.disponibilidad || {
          dias: c.disponibilidad_dias || [0, 1, 2, 3, 4],
          horaInicio: c.disponibilidad_hora_inicio || '08:00',
          horaFin: c.disponibilidad_hora_fin || '18:00',
          observaciones: c.disponibilidad_observaciones,
        },
      }));
      set({ conductores: conductoresFormateados, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addConductor: async (conductor) => {
    set({ isLoading: true, error: null });
    try {
      // Convertir datos del frontend al formato que espera el backend (snake_case)
      const conductorParaBackend: any = {
        nombre: conductor.nombre,
        apellidos: conductor.apellidos,
        dni: conductor.dni,
        fecha_nacimiento: conductor.fechaNacimiento || null,
        telefono: conductor.telefono,
        email: conductor.email,
        direccion: conductor.direccion || null,
        tarifa_hora: conductor.tarifaHora || 18,
        tarifa_servicio: conductor.tarifaServicio || null,
        estado: conductor.estado || 'activo',
        notas: conductor.notas || null,
        // Licencia
        licencia_tipo: conductor.licencia?.tipo || 'D',
        licencia_numero: conductor.licencia?.numero || null,
        licencia_fecha_expedicion: conductor.licencia?.fechaExpedicion || null,
        licencia_fecha_caducidad: conductor.licencia?.fechaCaducidad || null,
        licencia_permisos: conductor.licencia?.permisos || null,
        // Disponibilidad
        disponibilidad_dias: conductor.disponibilidad?.dias || [0, 1, 2, 3, 4],
        disponibilidad_hora_inicio: conductor.disponibilidad?.horaInicio || '08:00',
        disponibilidad_hora_fin: conductor.disponibilidad?.horaFin || '18:00',
        disponibilidad_observaciones: conductor.disponibilidad?.observaciones || null,
      };

      const nuevo = await conductoresApi.create(conductorParaBackend);
      const conductorFormateado = {
        ...nuevo,
        id: String(nuevo.id),
        fechaAlta: nuevo.fecha_alta,
        fechaNacimiento: nuevo.fecha_nacimiento,
        tarifaHora: nuevo.tarifa_hora,
        tarifaServicio: nuevo.tarifa_servicio,
        totalHorasMes: nuevo.total_horas_mes,
        totalServiciosMes: nuevo.total_servicios_mes,
        licencia: nuevo.licencia || {
          tipo: nuevo.licencia_tipo,
          numero: nuevo.licencia_numero,
          fechaExpedicion: nuevo.licencia_fecha_expedicion,
          fechaCaducidad: nuevo.licencia_fecha_caducidad,
          permisos: nuevo.licencia_permisos,
        },
        disponibilidad: nuevo.disponibilidad || {
          dias: nuevo.disponibilidad_dias || [0, 1, 2, 3, 4],
          horaInicio: nuevo.disponibilidad_hora_inicio || '08:00',
          horaFin: nuevo.disponibilidad_hora_fin || '18:00',
          observaciones: nuevo.disponibilidad_observaciones,
        },
      };
      set((state) => ({ conductores: [...state.conductores, conductorFormateado], isLoading: false }));
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  updateConductor: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      // Convertir datos del frontend al formato que espera el backend (snake_case)
      const dataParaBackend: any = {};
      
      if (data.nombre !== undefined) dataParaBackend.nombre = data.nombre;
      if (data.apellidos !== undefined) dataParaBackend.apellidos = data.apellidos;
      if (data.dni !== undefined) dataParaBackend.dni = data.dni;
      if (data.fechaNacimiento !== undefined) dataParaBackend.fecha_nacimiento = data.fechaNacimiento || null;
      if (data.telefono !== undefined) dataParaBackend.telefono = data.telefono;
      if (data.email !== undefined) dataParaBackend.email = data.email;
      if (data.direccion !== undefined) dataParaBackend.direccion = data.direccion || null;
      if (data.tarifaHora !== undefined) dataParaBackend.tarifa_hora = data.tarifaHora;
      if (data.tarifaServicio !== undefined) dataParaBackend.tarifa_servicio = data.tarifaServicio || null;
      if (data.estado !== undefined) dataParaBackend.estado = data.estado;
      if (data.notas !== undefined) dataParaBackend.notas = data.notas || null;
      
      // Licencia
      if (data.licencia) {
        dataParaBackend.licencia_tipo = data.licencia.tipo || null;
        dataParaBackend.licencia_numero = data.licencia.numero || null;
        dataParaBackend.licencia_fecha_expedicion = data.licencia.fechaExpedicion || null;
        dataParaBackend.licencia_fecha_caducidad = data.licencia.fechaCaducidad || null;
        dataParaBackend.licencia_permisos = data.licencia.permisos || null;
      }
      
      // Disponibilidad
      if (data.disponibilidad) {
        dataParaBackend.disponibilidad_dias = data.disponibilidad.dias || null;
        dataParaBackend.disponibilidad_hora_inicio = data.disponibilidad.horaInicio || null;
        dataParaBackend.disponibilidad_hora_fin = data.disponibilidad.horaFin || null;
        dataParaBackend.disponibilidad_observaciones = data.disponibilidad.observaciones || null;
      }

      const actualizado = await conductoresApi.update(id, dataParaBackend);
      if (actualizado) {
        const conductorFormateado = {
          ...actualizado,
          id: String(actualizado.id),
          fechaAlta: actualizado.fecha_alta,
          fechaNacimiento: actualizado.fecha_nacimiento,
          tarifaHora: actualizado.tarifa_hora,
          tarifaServicio: actualizado.tarifa_servicio,
          totalHorasMes: actualizado.total_horas_mes,
          totalServiciosMes: actualizado.total_servicios_mes,
          licencia: actualizado.licencia || {
            tipo: actualizado.licencia_tipo,
            numero: actualizado.licencia_numero,
            fechaExpedicion: actualizado.licencia_fecha_expedicion,
            fechaCaducidad: actualizado.licencia_fecha_caducidad,
            permisos: actualizado.licencia_permisos,
          },
          disponibilidad: actualizado.disponibilidad || {
            dias: actualizado.disponibilidad_dias || [0, 1, 2, 3, 4],
            horaInicio: actualizado.disponibilidad_hora_inicio || '08:00',
            horaFin: actualizado.disponibilidad_hora_fin || '18:00',
            observaciones: actualizado.disponibilidad_observaciones,
          },
        };
        set((state) => ({
          conductores: state.conductores.map(c => c.id === id ? conductorFormateado : c),
          isLoading: false,
        }));
      }
      return !!actualizado;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  deleteConductor: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await conductoresApi.delete(id);
      set((state) => ({
        conductores: state.conductores.filter(c => c.id !== id),
        isLoading: false,
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  seleccionarConductor: (conductor) => set({ conductorSeleccionado: conductor }),

  getConductorById: (id) => get().conductores.find(d => d.id === id),
  getConductoresByEstado: (estado) => get().conductores.filter(d => d.estado === estado),
  getConductoresDisponibles: () => get().conductores.filter(d => d.estado === 'activo'),
  getConductoresConLicenciaProxima: () => {
    const hoy = new Date();
    const treintaDias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
    return get().conductores.filter(c => {
      const fechaCaducidad = new Date(c.licencia?.fechaCaducidad || '');
      return fechaCaducidad <= treintaDias && fechaCaducidad >= hoy;
    });
  },
}));

// ============================================
// STORE DE SERVICIOS
// ============================================
interface ServiciosState {
  servicios: Servicio[];
  isLoading: boolean;
  error: string | null;
  servicioSeleccionado: Servicio | null;
  // Acciones
  fetchServicios: () => Promise<void>;
  addServicio: (servicio: Omit<Servicio, 'id' | 'codigo' | 'fechaCreacion'>) => Promise<boolean>;
  updateServicio: (id: string, data: Partial<Servicio>) => Promise<boolean>;
  deleteServicio: (id: string) => Promise<boolean>;
  seleccionarServicio: (servicio: Servicio | null) => void;
  addIncidencia: (servicioId: string, incidencia: any) => void;
  updateTarea: (servicioId: string, tareaId: string, completada: boolean) => void;
  // Getters
  getServicioById: (id: string) => Servicio | undefined;
  getServiciosByEstado: (estado: string) => Servicio[];
  getServiciosByCliente: (clienteId: string) => Servicio[];
  getServiciosHoy: () => Servicio[];
  getServiciosPendientesFacturar: () => Servicio[];
}

export const useServiciosStore = create<ServiciosState>((set, get) => ({
  servicios: [],
  isLoading: false,
  error: null,
  servicioSeleccionado: null,

  fetchServicios: async () => {
    set({ isLoading: true, error: null });
    try {
      const servicios = await serviciosApi.getAll();
      // Convertir id a string y mapear campos del backend
      const serviciosFormateados = servicios.map((s: any) => ({
        ...s,
        id: String(s.id),
        fechaCreacion: s.fecha_creacion,
        fechaModificacion: s.fecha_modificacion,
        fechaInicio: s.fecha_inicio,
        fechaFin: s.fecha_fin,
        horaInicio: s.hora_inicio,
        horaFin: s.hora_fin,
        clienteId: String(s.cliente_id),
        clienteNombre: s.cliente_nombre,
        numeroVehiculos: s.numero_vehiculos,
        vehiculosAsignados: s.vehiculos_asignados || [],
        conductoresAsignados: s.conductores_asignados || [],
        costeEstimado: s.coste_estimado,
        costeReal: s.coste_real,
        facturado: s.facturado,
        facturaId: s.factura_id,
        notasInternas: s.notas_internas,
        notasCliente: s.notas_cliente,
        creadoPor: s.creado_por,
      }));
      set({ servicios: serviciosFormateados, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addServicio: async (servicio) => {
    set({ isLoading: true, error: null });
    try {
      // Convertir datos del frontend al formato que espera el backend (snake_case)
      const servicioParaBackend: any = {
        cliente_id: servicio.clienteId,
        tipo: servicio.tipo,
        estado: servicio.estado || 'planificando',
        fecha_inicio: servicio.fechaInicio,
        fecha_fin: servicio.fechaFin,
        hora_inicio: servicio.horaInicio || null,
        hora_fin: servicio.horaFin || null,
        titulo: servicio.titulo,
        descripcion: servicio.descripcion || null,
        numero_vehiculos: servicio.numeroVehiculos || 1,
        vehiculos_asignados: servicio.vehiculosAsignados || [],
        conductores_asignados: servicio.conductoresAsignados || [],
        origen: servicio.origen || null,
        destino: servicio.destino || null,
        ubicacion_evento: servicio.ubicacionEvento || null,
        coste_estimado: servicio.costeEstimado || 0,
        coste_real: servicio.costeReal || null,
        precio: servicio.precio || 0,
        facturado: servicio.facturado || false,
        factura_id: servicio.facturaId || null,
        notas_internas: servicio.notasInternas || null,
        notas_cliente: servicio.notasCliente || null,
        rutas: servicio.rutas || [],
        tareas: servicio.tareas || [],
        incidencias: servicio.incidencias || [],
        documentos: servicio.documentos || [],
      };

      const nuevo = await serviciosApi.create(servicioParaBackend);
      const servicioFormateado = {
        ...nuevo,
        id: String(nuevo.id),
        fechaCreacion: nuevo.fecha_creacion,
        fechaModificacion: nuevo.fecha_modificacion,
        fechaInicio: nuevo.fecha_inicio,
        fechaFin: nuevo.fecha_fin,
        horaInicio: nuevo.hora_inicio,
        horaFin: nuevo.hora_fin,
        clienteId: String(nuevo.cliente_id),
        clienteNombre: nuevo.cliente_nombre,
        numeroVehiculos: nuevo.numero_vehiculos,
        vehiculosAsignados: nuevo.vehiculos_asignados || [],
        conductoresAsignados: nuevo.conductores_asignados || [],
        costeEstimado: nuevo.coste_estimado,
        costeReal: nuevo.coste_real,
        facturado: nuevo.facturado,
        facturaId: nuevo.factura_id,
        notasInternas: nuevo.notas_internas,
        notasCliente: nuevo.notas_cliente,
        creadoPor: nuevo.creado_por,
      };
      set((state) => ({ servicios: [...state.servicios, servicioFormateado], isLoading: false }));
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  updateServicio: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      // Convertir datos del frontend al formato que espera el backend (snake_case)
      const dataParaBackend: any = {};
      
      if (data.clienteId !== undefined) dataParaBackend.cliente_id = data.clienteId;
      if (data.tipo !== undefined) dataParaBackend.tipo = data.tipo;
      if (data.estado !== undefined) dataParaBackend.estado = data.estado;
      if (data.fechaInicio !== undefined) dataParaBackend.fecha_inicio = data.fechaInicio;
      if (data.fechaFin !== undefined) dataParaBackend.fecha_fin = data.fechaFin;
      if (data.horaInicio !== undefined) dataParaBackend.hora_inicio = data.horaInicio || null;
      if (data.horaFin !== undefined) dataParaBackend.hora_fin = data.horaFin || null;
      if (data.titulo !== undefined) dataParaBackend.titulo = data.titulo;
      if (data.descripcion !== undefined) dataParaBackend.descripcion = data.descripcion || null;
      if (data.numeroVehiculos !== undefined) dataParaBackend.numero_vehiculos = data.numeroVehiculos;
      if (data.vehiculosAsignados !== undefined) dataParaBackend.vehiculos_asignados = data.vehiculosAsignados;
      if (data.conductoresAsignados !== undefined) dataParaBackend.conductores_asignados = data.conductoresAsignados;
      if (data.origen !== undefined) dataParaBackend.origen = data.origen || null;
      if (data.destino !== undefined) dataParaBackend.destino = data.destino || null;
      if (data.ubicacionEvento !== undefined) dataParaBackend.ubicacion_evento = data.ubicacionEvento || null;
      if (data.costeEstimado !== undefined) dataParaBackend.coste_estimado = data.costeEstimado;
      if (data.costeReal !== undefined) dataParaBackend.coste_real = data.costeReal || null;
      if (data.precio !== undefined) dataParaBackend.precio = data.precio;
      if (data.facturado !== undefined) dataParaBackend.facturado = data.facturado;
      if (data.facturaId !== undefined) dataParaBackend.factura_id = data.facturaId || null;
      if (data.notasInternas !== undefined) dataParaBackend.notas_internas = data.notasInternas || null;
      if (data.notasCliente !== undefined) dataParaBackend.notas_cliente = data.notasCliente || null;
      if (data.rutas !== undefined) dataParaBackend.rutas = data.rutas;
      if (data.tareas !== undefined) dataParaBackend.tareas = data.tareas;
      if (data.incidencias !== undefined) dataParaBackend.incidencias = data.incidencias;
      if (data.documentos !== undefined) dataParaBackend.documentos = data.documentos;

      const actualizado = await serviciosApi.update(id, dataParaBackend);
      if (actualizado) {
        const servicioFormateado = {
          ...actualizado,
          id: String(actualizado.id),
          fechaCreacion: actualizado.fecha_creacion,
          fechaModificacion: actualizado.fecha_modificacion,
          fechaInicio: actualizado.fecha_inicio,
          fechaFin: actualizado.fecha_fin,
          horaInicio: actualizado.hora_inicio,
          horaFin: actualizado.hora_fin,
          clienteId: String(actualizado.cliente_id),
          clienteNombre: actualizado.cliente_nombre,
          numeroVehiculos: actualizado.numero_vehiculos,
          vehiculosAsignados: actualizado.vehiculos_asignados || [],
          conductoresAsignados: actualizado.conductores_asignados || [],
          costeEstimado: actualizado.coste_estimado,
          costeReal: actualizado.coste_real,
          facturado: actualizado.facturado,
          facturaId: actualizado.factura_id,
          notasInternas: actualizado.notas_internas,
          notasCliente: actualizado.notas_cliente,
          creadoPor: actualizado.creado_por,
        };
        set((state) => ({
          servicios: state.servicios.map(s => s.id === id ? servicioFormateado : s),
          isLoading: false,
        }));
      }
      return !!actualizado;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  deleteServicio: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await serviciosApi.delete(id);
      set((state) => ({
        servicios: state.servicios.filter(s => s.id !== id),
        isLoading: false,
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  seleccionarServicio: (servicio) => set({ servicioSeleccionado: servicio }),

  addIncidencia: (servicioId, incidencia) => {
    const servicio = get().servicios.find(s => s.id === servicioId);
    if (servicio) {
      const actualizado = {
        ...servicio,
        incidencias: [...(servicio.incidencias || []), incidencia],
      };
      localStorageService.servicios.update(servicioId, actualizado);
      set((state) => ({
        servicios: state.servicios.map(s => s.id === servicioId ? actualizado : s),
      }));
    }
  },

  updateTarea: (servicioId, tareaId, completada) => {
    const servicio = get().servicios.find(s => s.id === servicioId);
    if (servicio) {
      const tareasActualizadas = servicio.tareas?.map(t =>
        t.id === tareaId
          ? { ...t, completada, fechaCompletada: completada ? new Date().toISOString() : undefined }
          : t
      ) || [];
      const actualizado = { ...servicio, tareas: tareasActualizadas };
      localStorageService.servicios.update(servicioId, actualizado);
      set((state) => ({
        servicios: state.servicios.map(s => s.id === servicioId ? actualizado : s),
      }));
    }
  },

  getServicioById: (id) => get().servicios.find(s => s.id === id),
  getServiciosByEstado: (estado) => get().servicios.filter(s => s.estado === estado),
  getServiciosByCliente: (clienteId) => get().servicios.filter(s => s.clienteId === clienteId),
  getServiciosHoy: () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return get().servicios.filter(s => {
      const fecha = new Date(s.fechaInicio);
      return fecha.toDateString() === hoy.toDateString();
    });
  },
  getServiciosPendientesFacturar: () => get().servicios.filter(s =>
    s.estado === 'completado' && !s.facturado
  ),
}));

// ============================================
// STORE DE FACTURAS
// ============================================
interface FacturasState {
  facturas: Factura[];
  isLoading: boolean;
  error: string | null;
  facturaSeleccionada: Factura | null;
  // Acciones
  fetchFacturas: () => Promise<void>;
  addFactura: (factura: Omit<Factura, 'id' | 'numero' | 'fechaEmision'>) => Promise<boolean>;
  updateFactura: (id: string, data: Partial<Factura>) => Promise<boolean>;
  deleteFactura: (id: string) => Promise<boolean>;
  marcarPagada: (id: string) => Promise<boolean>;
  seleccionarFactura: (factura: Factura | null) => void;
  // Getters
  getFacturaById: (id: string) => Factura | undefined;
  getFacturasByEstado: (estado: EstadoFactura) => Factura[];
  getFacturasByCliente: (clienteId: string) => Factura[];
  getFacturasPendientes: () => Factura[];
  getFacturasVencidas: () => Factura[];
  getTotalFacturadoMes: () => number;
  getTotalPendiente: () => number;
}

export const useFacturasStore = create<FacturasState>((set, get) => ({
  facturas: [],
  isLoading: false,
  error: null,
  facturaSeleccionada: null,

  fetchFacturas: async () => {
    set({ isLoading: true, error: null });
    try {
      const facturas = localStorageService.facturas.getAll();
      set({ facturas, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addFactura: async (factura) => {
    set({ isLoading: true, error: null });
    try {
      const nueva = localStorageService.facturas.create(factura);
      set((state) => ({ facturas: [...state.facturas, nueva], isLoading: false }));
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  updateFactura: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const actualizado = localStorageService.facturas.update(id, data);
      if (actualizado) {
        set((state) => ({
          facturas: state.facturas.map(f => f.id === id ? actualizado : f),
          isLoading: false,
        }));
      }
      return !!actualizado;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  deleteFactura: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const eliminado = localStorageService.facturas.delete(id);
      if (eliminado) {
        set((state) => ({
          facturas: state.facturas.filter(f => f.id !== id),
          isLoading: false,
        }));
      }
      return eliminado;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  marcarPagada: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const actualizado = localStorageService.facturas.update(id, {
        estado: 'pagada',
        fechaPago: new Date().toISOString(),
      });
      if (actualizado) {
        set((state) => ({
          facturas: state.facturas.map(f => f.id === id ? actualizado : f),
          isLoading: false,
        }));
      }
      return !!actualizado;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  seleccionarFactura: (factura) => set({ facturaSeleccionada: factura }),

  getFacturaById: (id) => get().facturas.find(f => f.id === id),
  getFacturasByEstado: (estado) => get().facturas.filter(f => f.estado === estado),
  getFacturasByCliente: (clienteId) => get().facturas.filter(f => f.clienteId === clienteId),
  getFacturasPendientes: () => get().facturas.filter(f =>
    f.estado === 'pendiente' || f.estado === 'enviada'
  ),
  getFacturasVencidas: () => {
    const hoy = new Date();
    return get().facturas.filter(f => {
      if (f.estado === 'pagada' || f.estado === 'anulada') return false;
      const fechaVenc = new Date(f.fechaVencimiento);
      return fechaVenc < hoy;
    });
  },
  getTotalFacturadoMes: () => {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    return get().facturas
      .filter(f => {
        if (f.estado !== 'pagada') return false;
        const fechaPago = f.fechaPago ? new Date(f.fechaPago) : null;
        return fechaPago && fechaPago >= inicioMes;
      })
      .reduce((sum, f) => sum + (f.total || 0), 0);
  },
  getTotalPendiente: () => get().facturas
    .filter(f => f.estado === 'pendiente' || f.estado === 'enviada')
    .reduce((sum, f) => sum + (f.total || 0), 0),
}));

// ============================================
// STORE DE ALERTAS
// ============================================
interface AlertasState {
  alertas: Alerta[];
  isLoading: boolean;
  error: string | null;
  // Acciones
  fetchAlertas: () => Promise<void>;
  marcarLeida: (id: string) => void;
  marcarTodasLeidas: () => void;
  getAlertasNoLeidas: () => Alerta[];
  deleteAlerta: (id: string) => void;
}

export const useAlertasStore = create<AlertasState>((set, get) => ({
  alertas: [],
  isLoading: false,
  error: null,

  fetchAlertas: async () => {
    // Generar alertas dinámicamente basadas en datos
    const vehiculos = localStorageService.vehiculos.getAll();
    const conductores = localStorageService.conductores.getAll();
    const facturas = localStorageService.facturas.getAll();
    const hoy = new Date();
    const treintaDias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);

    const alertas: Alerta[] = [];

    // Alertas de ITV
    vehiculos.forEach(v => {
      const fechaITV = new Date(v.itv?.fechaProxima || '');
      if (fechaITV <= treintaDias && fechaITV >= hoy) {
        alertas.push({
          id: `alert-itv-${v.id}`,
          tipo: 'itv',
          severidad: 'warning',
          titulo: `ITV próxima - ${v.matricula}`,
          mensaje: `El vehículo ${v.marca} ${v.modelo} (${v.matricula}) tiene la ITV próxima a vencer.`,
          entidadId: v.id,
          entidadTipo: 'vehiculo',
          fechaCreacion: new Date().toISOString(),
          fechaVencimiento: v.itv?.fechaProxima,
          leida: false,
          accion: 'Ver vehículo',
          accionUrl: `/flota`,
        });
      }
    });

    // Alertas de seguros
    vehiculos.forEach(v => {
      const fechaSeguro = new Date(v.seguro?.fechaVencimiento || '');
      if (fechaSeguro <= treintaDias && fechaSeguro >= hoy) {
        alertas.push({
          id: `alert-seguro-${v.id}`,
          tipo: 'seguro',
          severidad: 'warning',
          titulo: `Seguro próximo - ${v.matricula}`,
          mensaje: `El seguro del vehículo ${v.marca} ${v.modelo} (${v.matricula}) está próximo a vencer.`,
          entidadId: v.id,
          entidadTipo: 'vehiculo',
          fechaCreacion: new Date().toISOString(),
          fechaVencimiento: v.seguro?.fechaVencimiento,
          leida: false,
          accion: 'Ver vehículo',
          accionUrl: `/flota`,
        });
      }
    });

    // Alertas de licencias
    conductores.forEach(c => {
      const fechaLicencia = new Date(c.licencia?.fechaCaducidad || '');
      if (fechaLicencia <= treintaDias && fechaLicencia >= hoy) {
        alertas.push({
          id: `alert-licencia-${c.id}`,
          tipo: 'licencia',
          severidad: 'warning',
          titulo: `Licencia próxima - ${c.nombre} ${c.apellidos}`,
          mensaje: `La licencia de ${c.nombre} ${c.apellidos} está próxima a caducar.`,
          entidadId: c.id,
          entidadTipo: 'conductor',
          fechaCreacion: new Date().toISOString(),
          fechaVencimiento: c.licencia?.fechaCaducidad,
          leida: false,
          accion: 'Ver conductor',
          accionUrl: `/conductores`,
        });
      }
    });

    // Alertas de facturas vencidas
    facturas.forEach(f => {
      if ((f.estado === 'pendiente' || f.estado === 'enviada') && f.fechaVencimiento) {
        const fechaVenc = new Date(f.fechaVencimiento);
        if (fechaVenc < hoy) {
          alertas.push({
            id: `alert-factura-${f.id}`,
            tipo: 'factura',
            severidad: 'error',
            titulo: `Factura vencida - ${f.numero}`,
            mensaje: `La factura ${f.numero} de ${f.clienteNombre} está vencida.`,
            entidadId: f.id,
            entidadTipo: 'factura',
            fechaCreacion: new Date().toISOString(),
            leida: false,
            accion: 'Ver factura',
            accionUrl: `/facturacion`,
          });
        }
      }
    });

    set({ alertas, isLoading: false });
  },

  marcarLeida: (id) => {
    set((state) => ({
      alertas: state.alertas.map(a => a.id === id ? { ...a, leida: true } : a)
    }));
  },

  marcarTodasLeidas: () => {
    set((state) => ({
      alertas: state.alertas.map(a => ({ ...a, leida: true }))
    }));
  },

  getAlertasNoLeidas: () => get().alertas.filter(a => !a.leida),

  deleteAlerta: (id) => {
    set((state) => ({
      alertas: state.alertas.filter(a => a.id !== id)
    }));
  },
}));

// ============================================
// STORE DE OPORTUNIDADES (CRM)
// ============================================
interface OportunidadesState {
  oportunidades: any[];
  isLoading: boolean;
  error: string | null;
  // Acciones
  fetchOportunidades: () => Promise<void>;
  addOportunidad: (oportunidad: any) => Promise<boolean>;
  updateOportunidad: (id: string, data: any) => Promise<boolean>;
  deleteOportunidad: (id: string) => Promise<boolean>;
}

export const useOportunidadesStore = create<OportunidadesState>((set, get) => ({
  oportunidades: [],
  isLoading: false,
  error: null,

  fetchOportunidades: async () => {
    set({ isLoading: true, error: null });
    try {
      // Datos de ejemplo de oportunidades
      const oportunidades = [
        {
          id: 'o1',
          codigo: 'OPP001',
          titulo: 'Primavera Sound 2025',
          clienteId: 'c1',
          clienteNombre: 'Festival de Música de Barcelona',
          tipoServicio: 'lanzadera',
          descripcion: 'Servicio de lanzaderas para el festival Primavera Sound. 5 días de servicio.',
          fechaEvento: '2025-06-01T00:00:00.000Z',
          ubicacion: 'Barcelona',
          presupuestoEstimado: 45000,
          estado: 'negociacion',
          probabilidad: 75,
          fechaCreacion: '2024-11-15T00:00:00.000Z',
          fechaCierreEstimada: '2025-02-01T00:00:00.000Z',
          asignadoA: 'Juan García',
        },
        {
          id: 'o2',
          codigo: 'OPP002',
          titulo: 'Gira de Verano - Sala Razzmatazz',
          clienteId: 'c2',
          clienteNombre: 'Sala Razzmatazz',
          tipoServicio: 'staff',
          descripcion: 'Transporte de staff y artistas durante la gira de verano.',
          fechaEvento: '2025-07-15T00:00:00.000Z',
          presupuestoEstimado: 12000,
          estado: 'presupuesto_enviado',
          probabilidad: 50,
          fechaCreacion: '2024-12-01T00:00:00.000Z',
          fechaCierreEstimada: '2025-01-15T00:00:00.000Z',
          asignadoA: 'María López',
        },
        {
          id: 'o3',
          codigo: 'OPP003',
          titulo: 'Excursión Fin de Curso',
          clienteId: 'c3',
          clienteNombre: 'Colegio Internacional de Madrid',
          tipoServicio: 'discrecional',
          descripcion: 'Viaje fin de curso a Valencia. 3 autobuses, 2 días.',
          fechaEvento: '2025-06-20T00:00:00.000Z',
          ubicacion: 'Valencia',
          presupuestoEstimado: 8500,
          estado: 'nueva',
          probabilidad: 25,
          fechaCreacion: '2024-12-10T00:00:00.000Z',
          asignadoA: 'Juan García',
        },
        {
          id: 'o4',
          codigo: 'OPP004',
          titulo: 'Traslados Obra Nueva Plant',
          clienteId: 'c4',
          clienteNombre: 'Empresa Constructora del Norte',
          tipoServicio: 'ruta_programada',
          descripcion: 'Ruta diaria de traslado de trabajadores a la nueva planta industrial.',
          fechaEvento: '2025-01-15T00:00:00.000Z',
          presupuestoEstimado: 28000,
          estado: 'ganada',
          probabilidad: 100,
          fechaCreacion: '2024-10-20T00:00:00.000Z',
          fechaCierreReal: '2024-11-20T00:00:00.000Z',
          asignadoA: 'Pedro Martínez',
        },
      ];
      set({ oportunidades, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addOportunidad: async (oportunidad) => {
    set({ isLoading: true, error: null });
    try {
      const nuevo = { ...oportunidad, id: `opp${Date.now()}` };
      set((state) => ({
        oportunidades: [...state.oportunidades, nuevo],
        isLoading: false
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  updateOportunidad: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      set((state) => ({
        oportunidades: state.oportunidades.map(o => o.id === id ? { ...o, ...data } : o),
        isLoading: false
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  deleteOportunidad: async (id) => {
    set({ isLoading: true, error: null });
    try {
      set((state) => ({
        oportunidades: state.oportunidades.filter(o => o.id !== id),
        isLoading: false
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },
}));

// ============================================
// STORE DE UI
// ============================================
interface UIState {
  sidebarOpen: boolean;
  modalOpen: boolean;
  modalContent: string | null;
  toast: {
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null;
  // Acciones
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openModal: (content: string) => void;
  closeModal: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  hideToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  modalOpen: false,
  modalContent: null,
  toast: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  openModal: (content) => set({ modalOpen: true, modalContent: content }),
  closeModal: () => set({ modalOpen: false, modalContent: null }),
  showToast: (message, type) => set({
    toast: { show: true, message, type }
  }),
  hideToast: () => set({ toast: null }),
}));

// ============================================
// STORE DE USUARIO
// ============================================
interface UsuarioState {
  usuario: Usuario | null;
  isAuthenticated: boolean;
  // Acciones
  setUsuario: (usuario: Usuario | null) => void;
  login: (usuario: Usuario) => void;
  logout: () => void;
  updatePreferencias: (preferencias: any) => void;
}

export const useUsuarioStore = create<UsuarioState>((set) => ({
  usuario: null,
  isAuthenticated: false,

  setUsuario: (usuario) => set({ usuario }),

  login: (usuario) => {
    localStorage.setItem('milano_usuario', JSON.stringify(usuario));
    set({ usuario, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('milano_usuario');
    set({ usuario: null, isAuthenticated: false });
  },

  updatePreferencias: (preferencias) => set((state) => ({
    usuario: state.usuario ? {
      ...state.usuario,
      preferencias: { ...state.usuario.preferencias, ...preferencias }
    } : null
  })),
}));

// ============================================
// STORE DE DASHBOARD (KPIs)
// ============================================
interface DashboardState {
  kpi: KPIDashboard | null;
  loading: boolean;
  // Acciones
  setKPI: (kpi: KPIDashboard) => void;
  setLoading: (loading: boolean) => void;
  refreshKPI: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  kpi: null,
  loading: false,

  setKPI: (kpi) => set({ kpi }),
  setLoading: (loading) => set({ loading }),

  refreshKPI: async () => {
    set({ loading: true });
    try {
      const stats = await dashboardApi.getStats();
      set({ kpi: stats, loading: false });
    } catch (error: any) {
      set({ loading: false });
      // Fallback a localStorage si la API falla
      const stats = localStorageService.dashboard.getStats();
      set({ kpi: stats });
    }
  },
}));

// ============================================
// INICIALIZACIÓN
// ============================================
export function initializeData() {
  localStorageService.initialize();
}