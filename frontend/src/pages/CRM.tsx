import { useState, useEffect } from 'react';
import { 
  Users, Search, Plus, Edit2, Trash2, Eye, X, 
  Phone, Mail, MapPin, FileText, Calendar, Building,
  CreditCard, Clock, Star, ChevronDown, ChevronUp,
  TrendingUp, DollarSign, Package
} from 'lucide-react';
import { useAuthStore, useClientesStore } from '../store';
import { Cliente, CreateClienteData, UpdateClienteData } from '../types';
import './CRM.css';

const FORMAS_PAGO = [
  { value: 'transferencia', label: 'Transferencia Bancaria' },
  { value: 'domiciliacion', label: 'Domiciliación Bancaria' },
  { value: 'tarjeta', label: 'Tarjeta de Crédito' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'paypal', label: 'PayPal' },
];

export default function CRM() {
  const { token } = useAuthStore();
  const { 
    clientes, 
    clienteActual, 
    loading, 
    error, 
    fetchClientes, 
    createCliente, 
    updateCliente, 
    deleteCliente 
  } = useClientesStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Cliente; direction: 'asc' | 'desc' } | null>(null);

  // Formulario
  const [formData, setFormData] = useState<CreateClienteData>({
    nombre: '',
    cif: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    codigoPostal: '',
    formaPago: 'transferencia',
    diasPago: 30,
    condicionesEspeciales: '',
    notas: '',
    contacto: {
      nombre: '',
      email: '',
      telefono: '',
      cargo: '',
    },
  });

  useEffect(() => {
    if (token) {
      fetchClientes(token);
    }
  }, [token, fetchClientes]);

  // Filtrar y ordenar clientes
  const filteredClientes = clientes.filter(cliente =>
    cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.cif?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedClientes = sortConfig
    ? [...filteredClientes].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue === undefined || bValue === undefined) return 0;
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      })
    : filteredClientes;

  const handleSort = (key: keyof Cliente) => {
    setSortConfig(current => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      cif: '',
      email: '',
      telefono: '',
      direccion: '',
      ciudad: '',
      codigoPostal: '',
      formaPago: 'transferencia',
      diasPago: 30,
      condicionesEspeciales: '',
      notas: '',
      contacto: {
        nombre: '',
        email: '',
        telefono: '',
        cargo: '',
      },
    });
    setSelectedCliente(null);
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setFormData({
      nombre: cliente.nombre,
      cif: cliente.cif || '',
      email: cliente.email || '',
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      ciudad: cliente.ciudad || '',
      codigoPostal: cliente.codigoPostal || '',
      formaPago: cliente.formaPago || 'transferencia',
      diasPago: cliente.diasPago || 30,
      condicionesEspeciales: cliente.condicionesEspeciales || '',
      notas: cliente.notas || '',
      contacto: cliente.contacto ? {
        nombre: cliente.contacto.nombre,
        email: cliente.contacto.email || '',
        telefono: cliente.contacto.telefono || '',
        cargo: cliente.contacto.cargo || '',
      } : {
        nombre: '',
        email: '',
        telefono: '',
        cargo: '',
      },
    });
    setShowModal(true);
  };

  const openDetailModal = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setShowDetailModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      // Limpiar valores vacíos - convertir a undefined si están vacíos
      const cleanData: CreateClienteData | UpdateClienteData = {
        nombre: formData.nombre,
        cif: formData.cif?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        telefono: formData.telefono?.trim() || undefined,
        direccion: formData.direccion?.trim() || undefined,
        ciudad: formData.ciudad?.trim() || undefined,
        codigoPostal: formData.codigoPostal?.trim() || undefined,
        formaPago: formData.formaPago || undefined,
        diasPago: formData.diasPago || undefined,
        condicionesEspeciales: formData.condicionesEspeciales?.trim() || undefined,
        notas: formData.notas?.trim() || undefined,
      };

      // Solo incluir contacto si tiene nombre
      if (formData.contacto?.nombre?.trim()) {
        (cleanData as CreateClienteData).contacto = {
          nombre: formData.contacto.nombre.trim(),
          email: formData.contacto.email?.trim() || undefined,
          telefono: formData.contacto.telefono?.trim() || undefined,
          cargo: formData.contacto.cargo?.trim() || undefined,
        };
      }

      if (selectedCliente) {
        await updateCliente(selectedCliente.id, cleanData, token);
      } else {
        await createCliente(cleanData as CreateClienteData, token);
      }

      setShowModal(false);
      resetForm();
    } catch (err: any) {
      alert(err.message || 'Error al guardar cliente');
    }
  };

  const handleDelete = async (cliente: Cliente) => {
    if (!token) return;
    if (!window.confirm(`¿Estás seguro de eliminar a ${cliente.nombre}?`)) return;

    try {
      await deleteCliente(cliente.id, token);
    } catch (err: any) {
      alert(err.message || 'Error al eliminar cliente');
    }
  };

  const getFormaPagoLabel = (value: string) => {
    return FORMAS_PAGO.find(f => f.value === value)?.label || value;
  };

  // Renderizar estadísticas
  const renderStats = () => {
    const totalClientes = clientes.length;
    const clientesConServicios = clientes.filter(c => (c.totalServicios || 0) > 0).length;
    const totalFacturado = clientes.reduce((sum, c) => sum + (c.totalFacturado || 0), 0);

    return (
      <div className="crm-stats">
        <div className="stat-card">
          <div className="stat-icon blue">
            <Users size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalClientes}</span>
            <span className="stat-label">Total Clientes</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <Package size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{clientesConServicios}</span>
            <span className="stat-label">Con Servicios</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">€{totalFacturado.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
            <span className="stat-label">Total Facturado</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="crm-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-title">
          <Users size={28} />
          <h1>Gestión de Clientes (CRM)</h1>
        </div>
        <button className="btn-primary" onClick={openNewModal}>
          <Plus size={18} />
          Nuevo Cliente
        </button>
      </div>

      {/* Estadísticas */}
      {renderStats()}

      {/* Búsqueda */}
      <div className="search-bar">
        <Search size={18} />
        <input
          type="text"
          placeholder="Buscar por nombre, código, CIF o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabla */}
      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Cargando clientes...</p>
          </div>
        ) : sortedClientes.length === 0 ? (
          <div className="empty-state">
            <Users size={64} />
            <h3>No hay clientes</h3>
            <p>{searchTerm ? 'No se encontraron resultados' : 'Comienza creando tu primer cliente'}</p>
            {!searchTerm && (
              <button className="btn-primary" onClick={openNewModal}>
                <Plus size={18} />
                Crear Cliente
              </button>
            )}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('codigo')} className="sortable">
                  Código {sortConfig?.key === 'codigo' && (
                    sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </th>
                <th onClick={() => handleSort('nombre')} className="sortable">
                  Nombre {sortConfig?.key === 'nombre' && (
                    sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </th>
                <th>CIF/NIF</th>
                <th>Contacto</th>
                <th>Forma de Pago</th>
                <th>Servicios</th>
                <th>Total Facturado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedClientes.map((cliente) => (
                <tr key={cliente.id}>
                  <td className="codigo-cell">{cliente.codigo}</td>
                  <td className="nombre-cell">
                    <div className="cliente-nombre">
                      <span className="nombre">{cliente.nombre}</span>
                      {cliente.contacto && (
                        <span className="contacto-small">Contacto: {cliente.contacto.nombre}</span>
                      )}
                    </div>
                  </td>
                  <td>{cliente.cif || '-'}</td>
                  <td>
                    <div className="contacto-info">
                      {cliente.telefono && <span><Phone size={12} /> {cliente.telefono}</span>}
                      {cliente.email && <span><Mail size={12} /> {cliente.email}</span>}
                    </div>
                  </td>
                  <td>{getFormaPagoLabel(cliente.formaPago)}</td>
                  <td className="center">{cliente.totalServicios || 0}</td>
                  <td className="right">
                    €{(cliente.totalFacturado || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="actions-cell">
                    <button className="btn-icon btn-view" onClick={() => openDetailModal(cliente)} title="Ver">
                      <Eye size={16} />
                    </button>
                    <button className="btn-icon btn-edit" onClick={() => openEditModal(cliente)} title="Editar">
                      <Edit2 size={16} />
                    </button>
                    <button className="btn-icon btn-delete" onClick={() => handleDelete(cliente)} title="Eliminar">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Formulario */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedCliente ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="cliente-form">
              {/* Información Básica */}
              <div className="form-section">
                <h3>Información Básica</h3>
                <div className="form-row">
                  <div className="form-group form-group-large">
                    <label>Nombre / Razón Social *</label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Nombre del cliente o empresa"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>CIF / NIF</label>
                    <input
                      type="text"
                      value={formData.cif}
                      onChange={(e) => setFormData({ ...formData, cif: e.target.value })}
                      placeholder="B12345678 o 12345678A"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@ejemplo.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Teléfono</label>
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      placeholder="+34 600 000 000"
                    />
                  </div>
                </div>
              </div>

              {/* Dirección */}
              <div className="form-section">
                <h3>Dirección</h3>
                <div className="form-row">
                  <div className="form-group form-group-large">
                    <label>Dirección</label>
                    <input
                      type="text"
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      placeholder="Calle, número, piso..."
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Ciudad</label>
                    <input
                      type="text"
                      value={formData.ciudad}
                      onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                      placeholder="Ciudad"
                    />
                  </div>
                  <div className="form-group">
                    <label>Código Postal</label>
                    <input
                      type="text"
                      value={formData.codigoPostal}
                      onChange={(e) => setFormData({ ...formData, codigoPostal: e.target.value })}
                      placeholder="28001"
                    />
                  </div>
                </div>
              </div>

              {/* Condiciones de Pago */}
              <div className="form-section">
                <h3>Condiciones de Pago</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Forma de Pago</label>
                    <select
                      value={formData.formaPago}
                      onChange={(e) => setFormData({ ...formData, formaPago: e.target.value })}
                    >
                      {FORMAS_PAGO.map((fp) => (
                        <option key={fp.value} value={fp.value}>
                          {fp.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Días de Pago</label>
                    <input
                      type="number"
                      value={formData.diasPago}
                      onChange={(e) => setFormData({ ...formData, diasPago: parseInt(e.target.value) || 0 })}
                      min="0"
                      max="365"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group form-group-large">
                    <label>Condiciones Especiales</label>
                    <textarea
                      value={formData.condicionesEspeciales}
                      onChange={(e) => setFormData({ ...formData, condicionesEspeciales: e.target.value })}
                      placeholder="Condiciones especiales de pago, descuentos, etc."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Persona de Contacto */}
              <div className="form-section">
                <h3>Persona de Contacto Principal</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nombre</label>
                    <input
                      type="text"
                      value={formData.contacto?.nombre || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contacto: { ...formData.contacto!, nombre: e.target.value },
                        })
                      }
                      placeholder="Nombre del contacto"
                    />
                  </div>
                  <div className="form-group">
                    <label>Cargo</label>
                    <input
                      type="text"
                      value={formData.contacto?.cargo || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contacto: { ...formData.contacto!, cargo: e.target.value },
                        })
                      }
                      placeholder="Cargo o departamento"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email del Contacto</label>
                    <input
                      type="email"
                      value={formData.contacto?.email || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contacto: { ...formData.contacto!, email: e.target.value },
                        })
                      }
                      placeholder="email@ejemplo.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Teléfono del Contacto</label>
                    <input
                      type="tel"
                      value={formData.contacto?.telefono || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contacto: { ...formData.contacto!, telefono: e.target.value },
                        })
                      }
                      placeholder="+34 600 000 000"
                    />
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div className="form-section">
                <h3>Notas</h3>
                <div className="form-group">
                  <textarea
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    placeholder="Información adicional sobre el cliente..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {selectedCliente ? 'Guardar Cambios' : 'Crear Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalle */}
      {showDetailModal && selectedCliente && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="cliente-header-info">
                <span className="cliente-codigo">{selectedCliente.codigo}</span>
                <h2>{selectedCliente.nombre}</h2>
              </div>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="cliente-detail">
              {/* Información General */}
              <div className="detail-section">
                <h3>Información General</h3>
                <div className="detail-grid">
                  {selectedCliente.cif && (
                    <div className="detail-item">
                      <Building size={16} />
                      <span>CIF/NIF: {selectedCliente.cif}</span>
                    </div>
                  )}
                  {selectedCliente.email && (
                    <div className="detail-item">
                      <Mail size={16} />
                      <span>{selectedCliente.email}</span>
                    </div>
                  )}
                  {selectedCliente.telefono && (
                    <div className="detail-item">
                      <Phone size={16} />
                      <span>{selectedCliente.telefono}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <Calendar size={16} />
                    <span>Alta: {new Date(selectedCliente.fechaAlta).toLocaleDateString('es-ES')}</span>
                  </div>
                </div>
              </div>

              {/* Dirección */}
              {(selectedCliente.direccion || selectedCliente.ciudad) && (
                <div className="detail-section">
                  <h3>Dirección</h3>
                  <div className="detail-item">
                    <MapPin size={16} />
                    <span>
                      {selectedCliente.direccion}
                      {selectedCliente.ciudad && `, ${selectedCliente.ciudad}`}
                      {selectedCliente.codigoPostal && ` (${selectedCliente.codigoPostal})`}
                    </span>
                  </div>
                </div>
              )}

              {/* Condiciones de Pago */}
              <div className="detail-section">
                <h3>Condiciones de Pago</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <CreditCard size={16} />
                    <span>Forma: {getFormaPagoLabel(selectedCliente.formaPago)}</span>
                  </div>
                  <div className="detail-item">
                    <Clock size={16} />
                    <span>Días: {selectedCliente.diasPago || 30}</span>
                  </div>
                </div>
                {selectedCliente.condicionesEspeciales && (
                  <p className="detail-notas">{selectedCliente.condicionesEspeciales}</p>
                )}
              </div>

              {/* Contacto */}
              {selectedCliente.contacto && (
                <div className="detail-section">
                  <h3>Persona de Contacto</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <Users size={16} />
                      <span>{selectedCliente.contacto.nombre}</span>
                    </div>
                    {selectedCliente.contacto.cargo && (
                      <div className="detail-item">
                        <Star size={16} />
                        <span>{selectedCliente.contacto.cargo}</span>
                      </div>
                    )}
                    {selectedCliente.contacto.email && (
                      <div className="detail-item">
                        <Mail size={16} />
                        <span>{selectedCliente.contacto.email}</span>
                      </div>
                    )}
                    {selectedCliente.contacto.telefono && (
                      <div className="detail-item">
                        <Phone size={16} />
                        <span>{selectedCliente.contacto.telefono}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Estadísticas */}
              <div className="detail-section">
                <h3>Estadísticas</h3>
                <div className="stats-row">
                  <div className="stat-mini">
                    <Package size={20} />
                    <span className="stat-mini-value">{selectedCliente.totalServicios || 0}</span>
                    <span className="stat-mini-label">Servicios</span>
                  </div>
                  <div className="stat-mini">
                    <TrendingUp size={20} />
                    <span className="stat-mini-value">
                      €{(selectedCliente.totalFacturado || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="stat-mini-label">Facturado</span>
                  </div>
                  {selectedCliente.ultimoServicio && (
                    <div className="stat-mini">
                      <Calendar size={20} />
                      <span className="stat-mini-value">
                        {new Date(selectedCliente.ultimoServicio).toLocaleDateString('es-ES')}
                      </span>
                      <span className="stat-mini-label">Último Servicio</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notas */}
              {selectedCliente.notas && (
                <div className="detail-section">
                  <h3>Notas</h3>
                  <p className="detail-notas">{selectedCliente.notas}</p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowDetailModal(false)}>
                Cerrar
              </button>
              <button type="button" className="btn-primary" onClick={() => {
                setShowDetailModal(false);
                openEditModal(selectedCliente);
              }}>
                <Edit2 size={16} />
                Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="error-toast">
          <p>{error}</p>
          <button onClick={() => useClientesStore.getState().clearError()}>×</button>
        </div>
      )}
    </div>
  );
}