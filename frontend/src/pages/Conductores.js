import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { Plus, Search, Edit2, Trash2, Phone, Mail, CreditCard, Key, Copy, Check } from 'lucide-react';
import './Conductores.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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
    nombre: '',
    apellidos: '',
    dni: '',
    telefono: '',
    email: '',
    licencia_conducir: '',
    fecha_vencimiento_licencia: '',
    estado: 'activo'
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
      nombre: conductor.nombre,
      apellidos: conductor.apellidos,
      dni: conductor.dni,
      telefono: conductor.telefono || '',
      email: conductor.email || '',
      licencia_conducir: conductor.licencia_conducir || '',
      fecha_vencimiento_licencia: conductor.fecha_vencimiento_licencia || '',
      estado: conductor.estado
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
      licencia_conducir: '',
      fecha_vencimiento_licencia: '',
      estado: 'activo'
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

  const filteredConductores = conductores.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.dni.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

      {showCredentials && credentials && (
        <div className="credentials-container" style={{ 
          marginBottom: '24px', 
          padding: '20px',
          background: '#ecfdf5', 
          border: '2px solid #10b981',
          borderRadius: '8px'
        }}>
          <h3 style={{ color: '#065f46', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={24} />
            Credenciales de Acceso Generadas
          </h3>
          <p style={{ color: '#047857', marginBottom: '16px' }}>
            Guarda estas credenciales, solo se mostrarán una vez:
          </p>
          
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              background: 'white',
              padding: '12px 16px',
              borderRadius: '6px',
              border: '1px solid #10b981'
            }}>
              <div>
                <span style={{ color: '#6b7280', fontSize: '12px' }}>Usuario:</span>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#111827', fontFamily: 'monospace' }}>
                  {credentials.username}
                </div>
              </div>
              <button 
                onClick={() => copyToClipboard(credentials.username, 'user')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  background: copiedUser ? '#10b981' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {copiedUser ? <Check size={16} /> : <Copy size={16} />}
                {copiedUser ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              background: 'white',
              padding: '12px 16px',
              borderRadius: '6px',
              border: '1px solid #10b981'
            }}>
              <div>
                <span style={{ color: '#6b7280', fontSize: '12px' }}>Contraseña:</span>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#111827', fontFamily: 'monospace' }}>
                  {credentials.password}
                </div>
              </div>
              <button 
                onClick={() => copyToClipboard(credentials.password, 'pass')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  background: copiedPass ? '#10b981' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {copiedPass ? <Check size={16} /> : <Copy size={16} />}
                {copiedPass ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="conductor-form">
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
                onChange={(e) => setFormData({...formData, dni: e.target.value})}
                required
              />
            </div>
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
              <label>Licencia de Conducir</label>
              <input
                type="text"
                value={formData.licencia_conducir}
                onChange={(e)