import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store';
import { 
  Plus, Search, Edit2, Trash2, Phone, Mail, CreditCard, Key, 
  Copy, Check, Calendar, Shield, AlertCircle, User, FileText
} from 'lucide-react';
import './Conductores.css';

const API_URL = 'https://milano-backend.onrender.com';

// Tipos de carnet válidos
const TIPOS_CARNET = [
  { value: 'D', label: 'D - Autobús', puedePasajeros: true },
  { value: 'D1', label: 'D1 - Minibús', puedePasajeros: true },
  { value: 'C', label: 'C - Camión', puedePasajeros: false },
  { value: 'B', label: 'B - Turismo', puedePasajeros: false },
];

const Conductores = () => {
  const { token } = useAuthStore();
  const [conductores, setConductores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingConductor, setEditingConductor] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  
  const [formData, setFormData] = useState({
    // Datos personales
    nombre: '',
    apellidos: '',
    dni: '',
    telefono: '',
    email: '',
    
    // Datos laborales
    numero_seguridad_social: '',
    fecha_alta_empresa: new Date().toISOString().split('T')[0],
    tipo_contrato: 'indefinido',
    
    // Carnet y capacitación
    tipo_carnet: 'D',
    licencia_conducir: '',
    fecha_vencimiento_licencia: '',
    tiene_cap: false,
    fecha_vencimiento_cap: '',
    
    // Estado
    estado: 'activo',
    notas: ''
  });

  const cargarConductores = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/conductores/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Error al cargar conductores');
      
      const data = await response.json();
      setConductores(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    cargarConductores();
  }, [cargarConductores]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingConductor 
        ? `${API_URL}/conductores/${editingConductor.id}`
        : `${API_URL}/conductores/`;
      
      const method = editingConductor ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al guardar conductor');
      }

      const data = await response.json();
      
      // Si es nuevo conductor, mostrar credenciales
      if (!editingConductor && data.credentials) {
        setCredentials(data.credentials);
        setShowCredentials(true);
      }
      
      setShowForm(false);
      setEditingConductor(null);
      resetForm();
      cargarConductores();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este conductor?')) return;
    
    try {
      const response = await fetch(`${API_URL}/conductores/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Error al eliminar conductor');
      
      cargarConductores();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (conductor) => {
    setEditingConductor(conductor);
    setFormData({
      nombre: conductor.nombre || '',
      apellidos: conductor.apellidos || '',
      dni: conductor.dni || '',
      telefono: conductor.telefono || '',
      email: conductor.email || '',
      numero_seguridad_social: conductor.numero_seguridad_social || '',
      fecha_alta_empresa: conductor.fecha_alta_empresa || new Date().toISOString().split('T')[0],
      tipo_contrato: conductor.tipo_contrato || 'indefinido',
      tipo_carnet: conductor.tipo_carnet || 'D',
      licencia_conducir: conductor.licencia_conducir || '',
      fecha_vencimiento_licencia: conductor.fecha_vencimiento_licencia || '',
      tiene_cap: conductor.tiene_cap || false,
      fecha_vencimiento_cap: conductor.fecha_vencimiento_cap || '',
      estado: conductor.estado || 'activo',
      notas: conductor.notas || ''
    });
    setShowForm(true);
    setShowCredentials(false);
    setCredentials(null);
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      apellidos: '',
      dni: '',
      telefono: '',
      email: '',
      numero_seguridad_social: '',
      fecha_alta_empresa: new Date().toISOString().split('T')[0],
      tipo_contrato: 'indefinido',
      tipo_carnet: 'D',
      licencia_conducir: '',
      fecha_vencimiento_licencia: '',
      tiene_cap: false,
      fecha_vencimiento_cap: '',
      estado: 'activo',
      notas: ''
    });
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'user') {
      setCopiedUser(true);
      setTimeout(() => setCopiedUser(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  // Función para determinar si puede llevar pasajeros
  const puedeLlevarPasajeros = (conductor) => {
    const tipoCarnet = TIPOS_CARNET.find(t => t.value === conductor.tipo_carnet);
    return tipoCarnet?.puedePasajeros && conductor.tiene_cap;
  };

  // Función para verificar si el carnet está próximo a vencer
  const estaProximoAVencer = (fecha) => {
    if (!fecha) return false;
    const hoy = new Date();
    const vencimiento = new Date(fecha);
    const diasRestantes = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24));
    return diasRestantes <= 30 && diasRestantes > 0;
  };

  const filteredConductores = conductores.filter(c => 
    c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.apellidos?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.dni?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <div className="loading">Cargando conductores...</div>;

  return (
    <div className="conductores-container">
      <div className="page-header">
        <h1>Gestión de Conductores</h1>
        <button className="btn-primary" onClick={() => {
          setShowForm(!showForm);
          if (showForm) {
            setEditingConductor(null);
            resetForm();
            setShowCredentials(false);
            setCredentials(null);
          }
        }}>
          <Plus size={20} />
          {showForm ? 'Cancelar' : 'Nuevo Conductor'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Modal de Credenciales */}
      {showCredentials && credentials && (
        <div className="credentials-modal">
          <div className="credentials-content">
            <div className="credentials-header">
              <Shield size={32} color="#10b981" />
              <h3>Conductor Creado - Credenciales de Acceso</h3>
              <p className="credentials-warning">
                <AlertCircle size={16} />
                Guarda estas credenciales, solo se mostrarán una vez
              </p>
            </div>
            
            <div className="credentials-box">
              <div className="credential-item">
                <label>Usuario:</label>
                <div className="credential-value">{credentials.username}</div>
                <button 
                  className={`btn-copy ${copiedUser ? 'copied' : ''}`}
                  onClick={() => copyToClipboard(credentials.username, 'user')}
                >
                  {copiedUser ? <Check size={16} /> : <Copy size={16} />}
                  {copiedUser ? 'Copiado' : 'Copiar'}
                </button>
              </div>

              <div className="credential-item">
                <label>Contraseña:</label>
                <div className="credential-value">{credentials.password}</div>
                <button 
                  className={`btn-copy ${copiedPass ? 'copied' : ''}`}
                  onClick={() => copyToClipboard(credentials.password, 'pass')}
                >
                  {copiedPass ? <Check size={16} /> : <Copy size={16} />}
                  {copiedPass ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            <button 
              className="btn-close-credentials"
              onClick={() => setShowCredentials(false)}
            >
              Entendido, cerrar
            </button>
          </div>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <form onSubmit={handleSubmit} className="conductor-form">
          <h3>{editingConductor ? 'Editar Conductor' : 'Nuevo Conductor'}</h3>
          
          {/* Sección: Datos Personales */}
          <div className="form-section">
            <h4><User size={18} /> Datos Personales</h4>
            <div className="form-grid">
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
              <div className="form-group">
                <label>DNI/NIE *</label>
                <input
                  type="text"
                  value={formData.dni}
                  onChange={(e) => setFormData({...formData, dni: e.target.value.toUpperCase()})}
                  required
                  placeholder="12345678A"
                />
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  placeholder="+34 600 000 000"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@ejemplo.com"
                />
              </div>
            </div>
          </div>

          {/* Sección: Datos Laborales */}
          <div className="form-section">
            <h4><FileText size={18} /> Datos Laborales</h4>
            <div className="form-grid">
              <div className="form-group">
                <label>Nº Seguridad Social</label>
                <input
                  type="text"
                  value={formData.numero_seguridad_social}
                  onChange={(e) => setFormData({...formData, numero_seguridad_social: e.target.value})}
                  placeholder="01/12345678/90"
                />
              </div>
              <div className="form-group">
                <label>Fecha Alta Empresa</label>
                <input
                  type="date"
                  value={formData.fecha_alta_empresa}
                  onChange={(e) => setFormData({...formData, fecha_alta_empresa: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Tipo Contrato</label>
                <select
                  value={formData.tipo_contrato}
                  onChange={(e) => setFormData({...formData, tipo_contrato: e.target.value})}
                >
                  <option value="indefinido">Indefinido</option>
                  <option value="temporal">Temporal</option>
                  <option value="autonomo">Autónomo</option>
                  <option value="practicas">Prácticas</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sección: Carnet y Capacitación */}
          <div className="form-section">
            <h4><CreditCard size={18} /> Carnet y Capacitación</h4>
            <div className="form-grid">
              <div className="form-group">
                <label>Tipo Carnet *</label>
                <select
                  value={formData.tipo_carnet}
                  onChange={(e) => setFormData({...formData, tipo_carnet: e.target.value})}
                  required
                >
                  {TIPOS_CARNET.map(tipo => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Nº Licencia</label>
                <input
                  type="text"
                  value={formData.licencia_conducir}
                  onChange={(e) => setFormData({...formData, licencia_conducir: e.target.value})}
                  placeholder="12345678"
                />
              </div>
              <div className="form-group">
                <label>Vencimiento Licencia</label>
                <input
                  type="date"
                  value={formData.fecha_vencimiento_licencia}
                  onChange={(e) => setFormData({...formData, fecha_vencimiento_licencia: e.target.value})}
                />
              </div>
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.tiene_cap}
                    onChange={(e) => setFormData({...formData, tiene_cap: e.target.checked})}
                  />
                  <span>Tiene CAP (Certificado Aptitud Profesional)</span>
                </label>
                <small className="help-text">
                  {formData.tipo_carnet === 'D' && !formData.tiene_cap 
                    ? '⚠️ Sin CAP solo puede conducir vehículos vacíos' 
                    : '✅ Puede transportar pasajeros'}
                </small>
              </div>
              {formData.tiene_cap && (
                <div className="form-group">
                  <label>Vencimiento CAP</label>
                  <input
                    type="date"
                    value={formData.fecha_vencimiento_cap}
                    onChange={(e) => setFormData({...formData, fecha_vencimiento_cap: e.target.value})}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sección: Estado y Notas */}
          <div className="form-section">
            <h4><Calendar size={18} /> Estado</h4>
            <div className="form-grid">
              <div className="form-group">
                <label>Estado</label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({...formData, estado: e.target.value})}
                >
                  <option value="activo">🟢 Activo</option>
                  <option value="vacaciones">🏖️ Vacaciones</option>
                  <option value="baja_medica">🏥 Baja Médica</option>
                  <option value="baja">🔴 Baja</option>
                  <option value="formacion">📚 Formación</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label>Notas</label>
                <textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({...formData, notas: e.target.value})}
                  rows="2"
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              {editingConductor ? 'Actualizar' : 'Crear'} Conductor
            </button>
          </div>
        </form>
      )}

      {/* Búsqueda */}
      <div className="search-box">
        <Search size={20} />
        <input
          type="text"
          placeholder="Buscar por nombre, DNI o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Grid de Conductores */}
      <div className="conductores-grid">
        {filteredConductores.map((conductor) => {
          const puedePasajeros = puedeLlevarPasajeros(conductor);
          const licenciaProxima = estaProximoAVencer(conductor.fecha_vencimiento_licencia);
          const capProximo = conductor.tiene_cap && estaProximoAVencer(conductor.fecha_vencimiento_cap);
          
          return (
            <div key={conductor.id} className={`conductor-card ${conductor.estado}`}>
              <div className="conductor-header">
                <div className="conductor-nombre">
                  <h3>{conductor.nombre} {conductor.apellidos}</h3>
                  <span className={`estado-badge ${conductor.estado}`}>
                    {conductor.estado}
                  </span>
                </div>
                <div className="capacitacion-badge">
                  {puedePasajeros ? (
                    <span className="badge-success" title="Puede llevar pasajeros">
                      <Shield size={14} /> D+CAP
                    </span>
                  ) : (
                    <span className="badge-warning" title="Solo vehículos vacíos">
                      <AlertCircle size={14} /> Solo D
                    </span>
                  )}
                </div>
              </div>
              
              <div className="conductor-info">
                <div className="info-row">
                  <CreditCard size={16} />
                  <span>{conductor.dni}</span>
                </div>
                {conductor.telefono && (
                  <div className="info-row">
                    <Phone size={16} />
                    <span>{conductor.telefono}</span>
                  </div>
                )}
                {conductor.email && (
                  <div className="info-row">
                    <Mail size={16} />
                    <span>{conductor.email}</span>
                  </div>
                )}
                <div className="info-row carnet-info">
                  <Key size={16} />
                  <span>
                    Carnet: {conductor.tipo_carnet}
                    {licenciaProxima && <span className="alert-vencimiento">⚠️ Próx. vencer</span>}
                  </span>
                </div>
                {conductor.tiene_cap && (
                  <div className="info-row cap-info">
                    <Shield size={16} />
                    <span>
                      CAP: {conductor.fecha_vencimiento_cap}
                      {capProximo && <span className="alert-vencimiento">⚠️ Próx. vencer</span>}
                    </span>
                  </div>
                )}
              </div>

              <div className="conductor-actions">
                <button 
                  className="btn-icon btn-edit"
                  onClick={() => handleEdit(conductor)}
                  title="Editar"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  className="btn-icon btn-delete"
                  onClick={() => handleDelete(conductor.id)}
                  title="Eliminar"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredConductores.length === 0 && (
        <div className="empty-state">
          <p>No se encontraron conductores</p>
        </div>
      )}
    </div>
  );
};

export default Conductores;