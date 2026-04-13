import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { 
  Plus, Search, Edit2, Trash2, User, Phone, Mail, 
  Filter, X, Calendar, Euro, Star, TrendingUp, FileText, 
  Briefcase, Building2, UserCircle
} from 'lucide-react';
import './Clientes.css';

const API_URL = 'https://milano-backend.onrender.com';

const Clientes = () => {
  const { token } = useAuthStore();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [editingCliente, setEditingCliente] = useState(null);
  const [formError, setFormError] = useState('');
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    dni: '',
    cif: '',
    tipo: 'particular',
    telefono: '',
    email: '',
    direccion: '',
    ciudad: '',
    codigo_postal: '',
    persona_contacto: '',
    notas: ''
  });

  const cargarClientes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let url = `${API_URL}/clientes/`;
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('buscar', searchTerm);
      if (tipoFiltro) params.append('tipo', tipoFiltro);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Error al cargar clientes');
      
      const data = await response.json();
      setClientes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, searchTerm, tipoFiltro]);

  useEffect(() => {
    cargarClientes();
  }, [cargarClientes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    try {
      const url = editingCliente 
        ? `${API_URL}/clientes/${editingCliente.id}`
        : `${API_URL}/clientes/`;
      
      const method = editingCliente ? 'PUT' : 'POST';
      
      // Preparar datos según tipo
      const dataToSend = { ...formData };
      if (formData.tipo === 'particular') {
        dataToSend.cif = null;
      } else {
        dataToSend.dni = null;
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al guardar cliente');
      }

      setShowForm(false);
      setEditingCliente(null);
      resetForm();
      cargarClientes();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este cliente?')) return;
    try {
      const response = await fetch(`${API_URL}/clientes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al eliminar');
      }
      
      cargarClientes();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nombre: cliente.nombre,
      apellidos: cliente.apellidos,
      dni: cliente.dni || '',
      cif: cliente.cif || '',
      tipo: cliente.tipo,
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      direccion: cliente.direccion || '',
      ciudad: cliente.ciudad || '',
      codigo_postal: cliente.codigo_postal || '',
      persona_contacto: cliente.persona_contacto || '',
      notas: cliente.notas || ''
    });
    setShowForm(true);
    setShowDetail(false);
  };

  const verDetalle = async (cliente) => {
    try {
      const response = await fetch(`${API_URL}/clientes/${cliente.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Error al cargar detalle');
      
      const data = await response.json();
      setSelectedCliente(data);
      setShowDetail(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      apellidos: '',
      dni: '',
      cif: '',
      tipo: 'particular',
      telefono: '',
      email: '',
      direccion: '',
      ciudad: '',
      codigo_postal: '',
      persona_contacto: '',
      notas: ''
    });
    setFormError('');
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'empresa': return <Building2 size={16} />;
      case 'autonomo': return <Briefcase size={16} />;
      default: return <UserCircle size={16} />;
    }
  };

  const getTipoColor = (tipo) => {
    switch (tipo) {
      case 'empresa': return 'tipo-empresa';
      case 'autonomo': return 'tipo-autonomo';
      default: return 'tipo-particular';
    }
  };

  if (loading) return <div className="loading">Cargando clientes...</div>;

  return (
    <div className="clientes-container">
      <div className="page-header">
        <h1>Gestión de Clientes</h1>
        <button className="btn-primary" onClick={() => {
          setShowForm(!showForm);
          if (showForm) {
            setEditingCliente(null);
            resetForm();
          }
        }}>
          <Plus size={20} />
          {showForm ? 'Cancelar' : 'Nuevo Cliente'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Filtros y Búsqueda */}
      <div className="filters-section">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, DNI, CIF, email, teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <button 
          className={`btn-filter ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} />
          Filtros
        </button>
      </div>

      {showFilters && (
        <div className="filters-dropdown">
          <div className="filter-group">
            <label>Tipo de cliente</label>
            <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
              <option value="">Todos</option>
              <option value="particular">Particular</option>
              <option value="autonomo">Autónomo</option>
              <option value="empresa">Empresa</option>
            </select>
          </div>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <form onSubmit={handleSubmit} className="cliente-form">
          <h3>{editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
          
          {formError && <div className="form-error">{formError}</div>}
          
          <div className="form-grid">
            <div className="form-group">
              <label>Tipo *</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({...formData, tipo: e.target.value, dni: '', cif: ''})}
                required
              >
                <option value="particular">Particular</option>
                <option value="autonomo">Autónomo</option>
                <option value="empresa">Empresa</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Nombre *</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Apellidos *</label>
              <input
                type="text"
                value={formData.apellidos}
                onChange={(e) => setFormData({...formData, apellidos: e.target.value})}
                required
              />
            </div>
            
            {formData.tipo === 'particular' ? (
              <div className="form-group">
                <label>DNI *</label>
                <input
                  type="text"
                  value={formData.dni}
                  onChange={(e) => setFormData({...formData, dni: e.target.value.toUpperCase()})}
                  placeholder="12345678A"
                  required
                  maxLength={9}
                />
              </div>
            ) : (
              <div className="form-group">
                <label>CIF *</label>
                <input
                  type="text"
                  value={formData.cif}
                  onChange={(e) => setFormData({...formData, cif: e.target.value.toUpperCase()})}
                  placeholder="B12345678"
                  required
                  maxLength={9}
                />
              </div>
            )}
            
            <div className="form-group">
              <label>Teléfono</label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({...formData, telefono: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label>Dirección</label>
              <input
                type="text"
                value={formData.direccion}
                onChange={(e) => setFormData({...formData, direccion: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label>Ciudad</label>
              <input
                type="text"
                value={formData.ciudad}
                onChange={(e) => setFormData({...formData, ciudad: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label>Código Postal</label>
              <input
                type="text"
                value={formData.codigo_postal}
                onChange={(e) => setFormData({...formData, codigo_postal: e.target.value})}
              />
            </div>
            
            {formData.tipo === 'empresa' && (
              <div className="form-group">
                <label>Persona de Contacto</label>
                <input
                  type="text"
                  value={formData.persona_contacto}
                  onChange={(e) => setFormData({...formData, persona_contacto: e.target.value})}
                />
              </div>
            )}
            
            <div className="form-group full-width">
              <label>Notas</label>
              <textarea
                value={formData.notas}
                onChange={(e) => setFormData({...formData, notas: e.target.value})}
                rows="3"
              />
            </div>
          </div>
          
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingCliente ? 'Actualizar' : 'Crear'} Cliente
            </button>
          </div>
        </form>
      )}

      {/* Grid de Clientes */}
      <div className="clientes-grid">
        {clientes.map((cliente) => (
          <div key={cliente.id} className="cliente-card">
            <div className="cliente-header">
              <div className="cliente-codigo">{cliente.codigo}</div>
              <div className="cliente-badges">
                {cliente.es_vip && (
                  <span className="badge vip" title="VIP - Más de 5000€ facturados">
                    <Star size={12} /> VIP
                  </span>
                )}
                {cliente.es_frecuente && (
                  <span className="badge frecuente" title="Cliente frecuente - Más de 5 servicios">
                    <TrendingUp size={12} /> Frecuente
                  </span>
                )}
              </div>
            </div>
            
            <div className="cliente-nombre">
              {cliente.nombre} {cliente.apellidos}
            </div>
            
            <div className={`cliente-tipo ${getTipoColor(cliente.tipo)}`}>
              {getTipoIcon(cliente.tipo)}
              <span>{cliente.tipo}</span>
            </div>
            
            <div className="cliente-doc">
              {cliente.dni && <span>DNI: {cliente.dni}</span>}
              {cliente.cif && <span>CIF: {cliente.cif}</span>}
            </div>
            
            <div className="cliente-contacto">
              {cliente.telefono && (
                <div className="contacto-item">
                  <Phone size={14} />
                  <span>{cliente.telefono}</span>
                </div>
              )}
              {cliente.email && (
                <div className="contacto-item">
                  <Mail size={14} />
                  <span>{cliente.email}</span>
                </div>
              )}
            </div>
            
            <div className="cliente-stats">
              <div className="stat">
                <Calendar size={14} />
                <span>{cliente.total_servicios} servicios</span>
              </div>
              <div className="stat">
                <Euro size={14} />
                <span>{cliente.total_facturado.toFixed(2)} €</span>
              </div>
            </div>
            
            <div className="cliente-actions">
              <button 
                className="btn-icon btn-view"
                onClick={() => verDetalle(cliente)}
                title="Ver detalle"
              >
                <User size={18} />
              </button>
              <button 
                className="btn-icon btn-edit"
                onClick={() => handleEdit(cliente)}
                title="Editar"
              >
                <Edit2 size={18} />
              </button>
              <button 
                className="btn-icon btn-delete"
                onClick={() => handleDelete(cliente.id)}
                title="Eliminar"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {clientes.length === 0 && (
        <div className="empty-state">
          <p>No se encontraron clientes</p>
        </div>
      )}

      {/* Modal de Detalle */}
      {showDetail && selectedCliente && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedCliente.nombre} {selectedCliente.apellidos}</h2>
              <button className="btn-close" onClick={() => setShowDetail(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="detalle-section">
                <h3>Información General</h3>
                <div className="detalle-grid">
                  <div className="detalle-item">
                    <label>Código:</label>
                    <span>{selectedCliente.codigo}</span>
                  </div>
                  <div className="detalle-item">
                    <label>Tipo:</label>
                    <span className={getTipoColor(selectedCliente.tipo)}>
                      {getTipoIcon(selectedCliente.tipo)} {selectedCliente.tipo}
                    </span>
                  </div>
                  {selectedCliente.dni && (
                    <div className="detalle-item">
                      <label>DNI:</label>
                      <span>{selectedCliente.dni}</span>
                    </div>
                  )}
                  {selectedCliente.cif && (
                    <div className="detalle-item">
                      <label>CIF:</label>
                      <span>{selectedCliente.cif}</span>
                    </div>
                  )}
                  <div className="detalle-item">
                    <label>Teléfono:</label>
                    <span>{selectedCliente.telefono || '-'}</span>
                  </div>
                  <div className="detalle-item">
                    <label>Email:</label>
                    <span>{selectedCliente.email || '-'}</span>
                  </div>
                  <div className="detalle-item">
                    <label>Dirección:</label>
                    <span>{selectedCliente.direccion || '-'}</span>
                  </div>
                  <div className="detalle-item">
                    <label>Ciudad:</label>
                    <span>{selectedCliente.ciudad || '-'}</span>
                  </div>
                  {selectedCliente.persona_contacto && (
                    <div className="detalle-item">
                      <label>Contacto:</label>
                      <span>{selectedCliente.persona_contacto}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="detalle-section stats-section">
                <h3>Estadísticas (Último año)</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <Calendar size={24} />
                    <div className="stat-value">{selectedCliente.total_servicios}</div>
                    <div className="stat-label">Servicios</div>
                  </div>
                  <div className="stat-card">
                    <Euro size={24} />
                    <div className="stat-value">{selectedCliente.total_facturado.toFixed(0)}€</div>
                    <div className="stat-label">Facturado</div>
                  </div>
                  {selectedCliente.es_frecuente && (
                    <div className="stat-card badge-card frecuente">
                      <TrendingUp size={24} />
                      <div className="stat-label">Cliente Frecuente</div>
                    </div>
                  )}
                  {selectedCliente.es_vip && (
                    <div className="stat-card badge-card vip">
                      <Star size={24} />
                      <div className="stat-label">Cliente VIP</div>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedCliente.servicios_recientes && selectedCliente.servicios_recientes.length > 0 && (
                <div className="detalle-section">
                  <h3>Servicios Recientes</h3>
                  <div className="servicios-list">
                    {selectedCliente.servicios_recientes.map((servicio) => (
                      <div key={servicio.id} className="servicio-item">
                        <div className="servicio-fecha">{servicio.fecha_inicio}</div>
                        <div className="servicio-trayecto">
                          {servicio.origen} → {servicio.destino}
                        </div>
                        <div className="servicio-precio">{servicio.precio.toFixed(2)} €</div>
                        <span className={`estado-badge ${servicio.estado}`}>{servicio.estado}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedCliente.notas && (
                <div className="detalle-section">
                  <h3>Notas</h3>
                  <p className="notas-text">{selectedCliente.notas}</p>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => handleEdit(selectedCliente)}>
                <Edit2 size={18} /> Editar
              </button>
              <button className="btn-primary">
                <FileText size={18} /> Nuevo Servicio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clientes;