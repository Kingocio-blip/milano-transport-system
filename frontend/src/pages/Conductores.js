import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store';
import { Plus, Search, Edit2, Trash2, Phone, Mail, CreditCard, Shield, Calendar, X } from 'lucide-react';
import './Conductores.css';

const API_URL = 'https://milano-backend.onrender.com';

const TIPOS_CARNET = [
  { value: 'D', label: 'D - Autobús' },
  { value: 'D1', label: 'D1 - Minibús' },
  { value: 'C', label: 'C - Camión' },
  { value: 'B', label: 'B - Turismo' },
];

const TIPOS_CONTRATO = [
  { value: 'indefinido', label: 'Indefinido' },
  { value: 'temporal', label: 'Temporal' },
  { value: 'autonomo', label: 'Autónomo' },
];

const Conductores = () => {
  const { token } = useAuthStore();
  const [conductores, setConductores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const emptyForm = {
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
    tarifa_hora: '',
    notas: ''
  };

  const [formData, setFormData] = useState(emptyForm);

  const cargarConductores = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/conductores/`, {
        headers: { 'Authorization': `Bearer ${token}` }
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
    if (token) cargarConductores();
  }, [token, cargarConductores]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      const url = editingId 
        ? `${API_URL}/conductores/${editingId}`
        : `${API_URL}/conductores/`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      // Convertir datos al formato del backend
      const dataToSend = {
        ...formData,
        tarifa_hora: parseFloat(formData.tarifa_hora) || 0,
        licencia: {
          tipo: formData.licencia_tipo,
          numero: formData.licencia_numero,
          fechaCaducidad: formData.licencia_caducidad
        }
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSend)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Error al guardar');
      }

      await cargarConductores();
      closeForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este conductor?')) return;
    
    try {
      const response = await fetch(`${API_URL}/conductores/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Error al eliminar');
      await cargarConductores();
    } catch (err) {
      setError(err.message);
    }
  };

  const openEdit = (conductor) => {
    setEditingId(conductor.id);
    setFormData({
      nombre: conductor.nombre || '',
      apellidos: conductor.apellidos || '',
      dni: conductor.dni || '',
      email: conductor.email || '',
      telefono: conductor.telefono || '',
      direccion: conductor.direccion || '',
      licencia_tipo: conductor.licencia?.tipo || 'D',
      licencia_numero: conductor.licencia?.numero || '',
      licencia_caducidad: conductor.licencia?.fechaCaducidad || '',
      tiene_cap: conductor.tieneCap || false,
      cap_caducidad: conductor.capCaducidad || '',
      numero_seguridad_social: conductor.numeroSeguridadSocial || '',
      tipo_contrato: conductor.tipoContrato || 'indefinido',
      tarifa_hora: conductor.tarifaHora || '',
      notas: conductor.notas || ''
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
    setError(null);
  };

  const filtered = conductores.filter(c => 
    `${c.nombre} ${c.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.dni?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div style={{padding: 40, textAlign: 'center'}}>Cargando...</div>;

  return (
    <div style={{padding: 24}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
        <h1 style={{margin: 0}}>Conductores</h1>
        <button 
          onClick={() => setShowForm(true)}
          style={{
            background: '#3b82f6', color: 'white', border: 'none',
            padding: '10px 20px', borderRadius: 6, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <Plus size={18} /> Nuevo Conductor
        </button>
      </div>

      {error && (
        <div style={{
          background: '#fee2e2', color: '#dc2626', padding: 12,
          borderRadius: 6, marginBottom: 16
        }}>
          {error}
        </div>
      )}

      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: '#f3f4f6', padding: '8px 16px', borderRadius: 8,
        marginBottom: 24
      }}>
        <Search size={20} color="#6b7280" />
        <input
          type="text"
          placeholder="Buscar conductor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            border: 'none', background: 'transparent', outline: 'none',
            flex: 1, fontSize: 14
          }}
        />
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 16
      }}>
        {filtered.map(c => (
          <div key={c.id} style={{
            background: 'white', borderRadius: 8, padding: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 12}}>
              <h3 style={{margin: 0}}>{c.nombre} {c.apellidos}</h3>
              <div style={{display: 'flex', gap: 8}}>
                <button onClick={() => openEdit(c)} style={{
                  background: '#f3f4f6', border: 'none', padding: 6,
                  borderRadius: 4, cursor: 'pointer'
                }}>
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(c.id)} style={{
                  background: '#fee2e2', border: 'none', padding: 6,
                  borderRadius: 4, cursor: 'pointer', color: '#dc2626'
                }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <div style={{fontSize: 14, color: '#4b5563', lineHeight: 1.8}}>
              <p style={{margin: '4px 0'}}><CreditCard size={14} style={{marginRight: 8}}/> {c.dni}</p>
              <p style={{margin: '4px 0'}}><Phone size={14} style={{marginRight: 8}}/> {c.telefono || '-'}</p>
              <p style={{margin: '4px 0'}}><Mail size={14} style={{marginRight: 8}}/> {c.email || '-'}</p>
              <p style={{margin: '4px 0'}}><Shield size={14} style={{marginRight: 8}}/> {c.licencia?.tipo} - {c.licencia?.numero}</p>
              <p style={{margin: '4px 0'}}><Calendar size={14} style={{marginRight: 8}}/> Cad: {c.licencia?.fechaCaducidad}</p>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', borderRadius: 12, padding: 24,
            width: '90%', maxWidth: 600, maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <h2 style={{margin: 0}}>{editingId ? 'Editar' : 'Nuevo'} Conductor</h2>
              <button onClick={closeForm} style={{background: 'none', border: 'none', cursor: 'pointer'}}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12}}>
                <input
                  name="nombre"
                  placeholder="Nombre *"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
                <input
                  name="apellidos"
                  placeholder="Apellidos *"
                  value={formData.apellidos}
                  onChange={handleChange}
                  required
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12}}>
                <input
                  name="dni"
                  placeholder="DNI/NIE *"
                  value={formData.dni}
                  onChange={handleChange}
                  required
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
                <input
                  name="telefono"
                  placeholder="Teléfono"
                  value={formData.telefono}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
              </div>

              <input
                name="email"
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db', width: '100%', marginBottom: 12, boxSizing: 'border-box'}}
              />

              <input
                name="direccion"
                placeholder="Dirección"
                value={formData.direccion}
                onChange={handleChange}
                style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db', width: '100%', marginBottom: 12, boxSizing: 'border-box'}}
              />

              <h4 style={{margin: '16px 0 8px', color: '#374151'}}>Licencia</h4>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12}}>
                <select
                  name="licencia_tipo"
                  value={formData.licencia_tipo}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                >
                  {TIPOS_CARNET.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input
                  name="licencia_numero"
                  placeholder="Nº Licencia"
                  value={formData.licencia_numero}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
                <input
                  name="licencia_caducidad"
                  type="date"
                  placeholder="Caducidad"
                  value={formData.licencia_caducidad}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
              </div>

              <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12}}>
                <label style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
                  <input
                    type="checkbox"
                    name="tiene_cap"
                    checked={formData.tiene_cap}
                    onChange={handleChange}
                  />
                  Tiene CAP
                </label>
                {formData.tiene_cap && (
                  <input
                    name="cap_caducidad"
                    type="date"
                    placeholder="Caducidad CAP"
                    value={formData.cap_caducidad}
                    onChange={handleChange}
                    style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db', flex: 1}}
                  />
                )}
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12}}>
                <input
                  name="numero_seguridad_social"
                  placeholder="Nº Seg. Social"
                  value={formData.numero_seguridad_social}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
                <select
                  name="tipo_contrato"
                  value={formData.tipo_contrato}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                >
                  {TIPOS_CONTRATO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <input
                name="tarifa_hora"
                type="number"
                step="0.01"
                placeholder="Tarifa/Hora (€)"
                value={formData.tarifa_hora}
                onChange={handleChange}
                style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db', width: '100%', marginBottom: 12, boxSizing: 'border-box'}}
              />

              <textarea
                name="notas"
                placeholder="Notas"
                value={formData.notas}
                onChange={handleChange}
                rows={3}
                style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db', width: '100%', marginBottom: 16, boxSizing: 'border-box', resize: 'vertical'}}
              />

              <div style={{display: 'flex', gap: 12, justifyContent: 'flex-end'}}>
                <button
                  type="button"
                  onClick={closeForm}
                  style={{
                    padding: '10px 20px', borderRadius: 6, border: '1px solid #d1d5db',
                    background: 'white', cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 20px', borderRadius: 6, border: 'none',
                    background: '#3b82f6', color: 'white', cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1
                  }}
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Conductores;