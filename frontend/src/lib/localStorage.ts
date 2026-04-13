// ============================================
// MILANO - LocalStorage Service
// Servicio de respaldo para datos locales
// ============================================

// Generar ID único
const generateId = () => Math.random().toString(36).substring(2, 9);

// Clientes
const clientesStorage = {
  getAll: () => {
    const data = localStorage.getItem('milano_clientes');
    return data ? JSON.parse(data) : [];
  },
  getById: (id: string) => {
    const all = clientesStorage.getAll();
    return all.find((c: any) => c.id === id);
  },
  create: (data: any) => {
    const all = clientesStorage.getAll();
    const nuevo = { ...data, id: generateId(), fechaAlta: new Date().toISOString() };
    all.push(nuevo);
    localStorage.setItem('milano_clientes', JSON.stringify(all));
    return nuevo;
  },
  update: (id: string, data: any) => {
    const all = clientesStorage.getAll();
    const index = all.findIndex((c: any) => c.id === id);
    if (index >= 0) {
      all[index] = { ...all[index], ...data };
      localStorage.setItem('milano_clientes', JSON.stringify(all));
      return all[index];
    }
    return null;
  },
  delete: (id: string) => {
    const all = clientesStorage.getAll();
    const filtered = all.filter((c: any) => c.id !== id);
    localStorage.setItem('milano_clientes', JSON.stringify(filtered));
    return true;
  },
};

// Vehículos
const vehiculosStorage = {
  getAll: () => {
    const data = localStorage.getItem('milano_vehiculos');
    return data ? JSON.parse(data) : [];
  },
  getById: (id: string) => {
    const all = vehiculosStorage.getAll();
    return all.find((v: any) => v.id === id);
  },
  create: (data: any) => {
    const all = vehiculosStorage.getAll();
    const nuevo = { ...data, id: generateId(), mantenimientos: [] };
    all.push(nuevo);
    localStorage.setItem('milano_vehiculos', JSON.stringify(all));
    return nuevo;
  },
  update: (id: string, data: any) => {
    const all = vehiculosStorage.getAll();
    const index = all.findIndex((v: any) => v.id === id);
    if (index >= 0) {
      all[index] = { ...all[index], ...data };
      localStorage.setItem('milano_vehiculos', JSON.stringify(all));
      return all[index];
    }
    return null;
  },
  delete: (id: string) => {
    const all = vehiculosStorage.getAll();
    const filtered = all.filter((v: any) => v.id !== id);
    localStorage.setItem('milano_vehiculos', JSON.stringify(filtered));
    return true;
  },
};

// Conductores
const conductoresStorage = {
  getAll: () => {
    const data = localStorage.getItem('milano_conductores');
    return data ? JSON.parse(data) : [];
  },
  getById: (id: string) => {
    const all = conductoresStorage.getAll();
    return all.find((c: any) => c.id === id);
  },
  create: (data: any) => {
    const all = conductoresStorage.getAll();
    const nuevo = { ...data, id: generateId(), codigo: `COND${String(all.length + 1).padStart(3, '0')}`, fechaAlta: new Date().toISOString() };
    all.push(nuevo);
    localStorage.setItem('milano_conductores', JSON.stringify(all));
    return nuevo;
  },
  update: (id: string, data: any) => {
    const all = conductoresStorage.getAll();
    const index = all.findIndex((c: any) => c.id === id);
    if (index >= 0) {
      all[index] = { ...all[index], ...data };
      localStorage.setItem('milano_conductores', JSON.stringify(all));
      return all[index];
    }
    return null;
  },
  delete: (id: string) => {
    const all = conductoresStorage.getAll();
    const filtered = all.filter((c: any) => c.id !== id);
    localStorage.setItem('milano_conductores', JSON.stringify(filtered));
    return true;
  },
};

// Servicios
const serviciosStorage = {
  getAll: () => {
    const data = localStorage.getItem('milano_servicios');
    return data ? JSON.parse(data) : [];
  },
  getById: (id: string) => {
    const all = serviciosStorage.getAll();
    return all.find((s: any) => s.id === id);
  },
  create: (data: any) => {
    const all = serviciosStorage.getAll();
    const nuevo = { 
      ...data, 
      id: generateId(), 
      codigo: `SRV${String(all.length + 1).padStart(3, '0')}`,
      fechaCreacion: new Date().toISOString(),
      creadoPor: 'Sistema'
    };
    all.push(nuevo);
    localStorage.setItem('milano_servicios', JSON.stringify(all));
    return nuevo;
  },
  update: (id: string, data: any) => {
    const all = serviciosStorage.getAll();
    const index = all.findIndex((s: any) => s.id === id);
    if (index >= 0) {
      all[index] = { ...all[index], ...data, fechaModificacion: new Date().toISOString() };
      localStorage.setItem('milano_servicios', JSON.stringify(all));
      return all[index];
    }
    return null;
  },
  delete: (id: string) => {
    const all = serviciosStorage.getAll();
    const filtered = all.filter((s: any) => s.id !== id);
    localStorage.setItem('milano_servicios', JSON.stringify(filtered));
    return true;
  },
};

// Facturas
const facturasStorage = {
  getAll: () => {
    const data = localStorage.getItem('milano_facturas');
    return data ? JSON.parse(data) : [];
  },
  getById: (id: string) => {
    const all = facturasStorage.getAll();
    return all.find((f: any) => f.id === id);
  },
  create: (data: any) => {
    const all = facturasStorage.getAll();
    const nuevo = { 
      ...data, 
      id: generateId(), 
      numero: `F${new Date().getFullYear()}-${String(all.length + 1).padStart(4, '0')}`,
      fechaEmision: new Date().toISOString()
    };
    all.push(nuevo);
    localStorage.setItem('milano_facturas', JSON.stringify(all));
    return nuevo;
  },
  update: (id: string, data: any) => {
    const all = facturasStorage.getAll();
    const index = all.findIndex((f: any) => f.id === id);
    if (index >= 0) {
      all[index] = { ...all[index], ...data };
      localStorage.setItem('milano_facturas', JSON.stringify(all));
      return all[index];
    }
    return null;
  },
  delete: (id: string) => {
    const all = facturasStorage.getAll();
    const filtered = all.filter((f: any) => f.id !== id);
    localStorage.setItem('milano_facturas', JSON.stringify(filtered));
    return true;
  },
};

// Dashboard
const dashboardStorage = {
  getStats: () => {
    const clientes = clientesStorage.getAll();
    const vehiculos = vehiculosStorage.getAll();
    const conductores = conductoresStorage.getAll();
    const servicios = serviciosStorage.getAll();
    const facturas = facturasStorage.getAll();

    return {
      serviciosActivos: servicios.filter((s: any) => s.estado === 'en_curso').length,
      serviciosHoy: servicios.filter((s: any) => {
        const hoy = new Date().toISOString().split('T')[0];
        return s.fechaInicio?.startsWith(hoy);
      }).length,
      serviciosMes: servicios.length,
      conductoresDisponibles: conductores.filter((c: any) => c.estado === 'activo').length,
      conductoresOcupados: conductores.filter((c: any) => c.estado === 'ocupado').length,
      vehiculosOperativos: vehiculos.filter((v: any) => v.estado === 'operativo').length,
      vehiculosTaller: vehiculos.filter((v: any) => v.estado === 'taller').length,
      facturacionMes: facturas
        .filter((f: any) => f.estado === 'pagada')
        .reduce((sum: number, f: any) => sum + (f.total || 0), 0),
      facturacionPendiente: facturas
        .filter((f: any) => f.estado === 'pendiente')
        .reduce((sum: number, f: any) => sum + (f.total || 0), 0),
      serviciosPendientesFacturar: servicios.filter((s: any) => s.estado === 'completado' && !s.facturado).length,
    };
  },
};

// Inicializar con datos de ejemplo
const initialize = () => {
  // Solo inicializar si no hay datos
  if (!localStorage.getItem('milano_initialized')) {
    localStorage.setItem('milano_initialized', 'true');
  }
};

export const localStorageService = {
  initialize,
  clientes: clientesStorage,
  vehiculos: vehiculosStorage,
  conductores: conductoresStorage,
  servicios: serviciosStorage,
  facturas: facturasStorage,
  dashboard: dashboardStorage,
};