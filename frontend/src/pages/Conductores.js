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
    nombre: '',
    apellidos: '',
    dni: '',
    email: '',
    telefono: '',
    direccion: '',
    licencia_tipo: 'D',
    licencia_numero: '',
    licencia_caducidad: '',
    tiene_cap: false,
    cap_caducidad: '',
    numero_seguridad_social: '',
    tipo_contrato: 'indefinido',
    tarifa_hora: 0,
    notas: ''
  });

  const cargarConductores = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/conductores/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar conductores');
      }
      
      const data = await response.json();
      setConductores(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      cargarConductores();
    }
  }, [token, cargarConductores]);

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
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Error al guardar conductor');
      }

      await cargarConductores();
      setShowForm(false);
      setEditingConductor(null);
      resetForm();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este conductor?')) return;
    
    try {
      const response = await fetch(`${API_URL}/conductores/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Error al eliminar conductor');
      }

      await cargarConductores();
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      apellidos: '',
      dni: '',
      email: '',
      telefono: '',
      direccion: '',
      licencia_tipo: 'D',
      licencia_numero: '',
      licencia_caducidad: '',
      tiene_cap: false,
      cap_caducidad: '',
      numero_seguridad_social: '',
      tipo_contrato: 'indefinido',
      tarifa_hora: 0,
      notas: ''
    });
  };

  const filteredConductores = conductores.filter(c => 
    c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.apellidos?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.dni?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loading">Cargando...</div>;

  return (
    <div className="conductores-page">
      <div className="page-header">
        <h1>Gestión de Conductores</h1>
        <button className="btn-primary" onClick={() => { setShowForm(true); setEditingConductor(null); resetForm(); }}>
          <Plus size={18} /> Nuevo Conductor
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="search-bar">
        <Search size={18} />
        <input 
          type="text" 
          placeholder="Buscar conductor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="conductores-grid">
        {filteredConductores.map(conductor => (
          <div key={conductor.id} className="conductor-card">
            <div className="conductor-header">
              <h3>{conductor.nombre} {conductor.apellidos}</h3>
              <div className="actions">
                <button onClick={() => { setEditingConductor(conductor); setFormData(conductor); setShowForm(true); }}>
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(conductor.id)} className="btn-danger">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <div className="conductor-info">
              <p><CreditCard size={14} /> DNI: {conductor.dni}</p>
              <p><Phone size={14} /> {conductor.telefono}</p>
              <p><Mail size={14} /> {conductor.email}</p>
              <p><Shield size={14} /> Licencia: {conductor.licencia_tipo} - {conductor.licencia_numero}</p>
              <p><Calendar size={14} /> Caduca: {conductor.licencia_caducidad}</p>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingConductor ? 'Editar Conductor' : 'Nuevo Conductor'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <input type="text" placeholder="Nombre" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required />
                <input type="text" placeholder="Apellidos" value={formData.apellidos} onChange={e => setFormData({...formData, apellidos: e.target.value})} required />
              </div>
              <div className="form-row">
                <input type="text" placeholder="DNI" value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} required />
                <input type="tel" placeholder="Teléfono" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
              </div>
              <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <input type="text" placeholder="Dirección" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} />
              
              <div className="form-row">
                <select value={formData.licencia_tipo} onChange={e => setFormData({...formData, licencia_tipo: e.target.value})}>
                  {TIPOS_CARNET.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input type="text" placeholder="Nº Licencia" value={formData.licencia_numero} onChange={e => setFormData({...formData, licencia_numero: e.target.value})} />
              </div>
              
              <div className="form-row">
                <label>Caducidad Licencia:</label>
                <input type="date" value={formData.licencia_caducidad} onChange={e => setFormData({...formData, licencia_caducidad: e.target.value})} />
              </div>

              <div className="form-row">
                <label>
                  <input type="checkbox" checked={formData.tiene_cap} onChange={e => setFormData({...formData, tiene_cap: e.target.checked})} />
                  Tiene CAP
                </label>
                {formData.tiene_cap && (
                  <input type="date" placeholder="Caducidad CAP" value={formData.cap_caducidad} onChange={e => setFormData({...formData, cap_caducidad: e.target.value})} />
                )}
              </div>

              <input type="text" placeholder="Nº Seguridad Social" value={formData.numero_seguridad_social} onChange={e => setFormData({...formData, numero_seguridad_social: e.target.value})} />
              
              <div className="form-row">
                <select value={formData.tipo_contrato} onChange={e => setFormData({...formData, tipo_contrato: e.target.value})}>
                  <option value="indefinido">Indefinido</option>
                  <option value="temporal">Temporal</option>
                  <option value="autonomo">Autónomo</option>
                </select>
                <input type="number" placeholder="Tarifa/Hora (€)" value={formData.tarifa_hora} onChange={e => setFormData({...formData, tarifa_hora: parseFloat(e.target.value)})} />
              </div>

              <textarea placeholder="Notas" value={formData.notas} onChange={e => setFormData({...formData, notas: e.target.value})} />

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Conductores;