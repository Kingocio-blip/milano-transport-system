import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store';
import { 
  Plus, Search, Edit2, Trash2, User, Phone, Mail, 
  X, MapPin, Building2, CreditCard
} from 'lucide-react';
import './Clientes.css';

const API_URL = 'https://milano-backend.onrender.com';

const FORMAS_PAGO = [
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'domiciliacion', label: 'Domiciliación' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'cheque', label: 'Cheque' },
];

const Clientes = () => {
  const { token } = useAuthStore();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const emptyForm = {
    nombre: '',
    cif: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    codigo_postal: '',
    forma_pago: 'transferencia',
    dias_pago: 30,
    condiciones_especiales: '',
    notas: '',
    contacto_nombre: '',
    contacto_email: '',
    contacto_telefono: '',
    contacto_cargo: ''
  };

  const [formData, setFormData] = useState(emptyForm);

  const cargarClientes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/clientes/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Error al cargar clientes');
      
      const data = await response.json();
      setClientes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) cargarClientes();
  }, [token, cargarClientes]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      const url = editingId 
        ? `${API_URL}/clientes/${editingId}`
        : `${API_URL}/clientes/`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      // Convertir datos al formato del backend
      const dataToSend = {
        nombre: formData.nombre,
        cif: formData.cif || null,
        email: formData.email || null,
        telefono: formData.telefono || null,
        direccion: formData.direccion || null,
        ciudad: formData.ciudad || null,
        codigo_postal: formData.codigo_postal || null,
        forma_pago: formData.forma_pago,
        dias_pago: parseInt(formData.dias_pago) || 30,
        condiciones_especiales: formData.condiciones_especiales || null,
        notas: formData.notas || null,
        contacto: formData.contacto_nombre ? {
          nombre: formData.contacto_nombre,
          email: formData.contacto_email || undefined,
          telefono: formData.contacto_telefono || undefined,
          cargo: formData.contacto_cargo || undefined
        } : undefined
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

      await cargarClientes();
      closeForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este cliente?')) return;
    
    try {
      const response = await fetch(`${API_URL}/clientes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Error al eliminar');
      await cargarClientes();
    } catch (err) {
      setError(err.message);
    }
  };

  const openEdit = (c) => {
    setEditingId(c.id);
    setFormData({
      nombre: c.nombre || '',
      cif: c.cif || '',
      email: c.email || '',
      telefono: c.telefono || '',
      direccion: c.direccion || '',
      ciudad: c.ciudad || '',
      codigo_postal: c.codigo_postal || '',
      forma_pago: c.forma_pago || 'transferencia',
      dias_pago: c.dias_pago || 30,
      condiciones_especiales: c.condiciones_especiales || '',
      notas: c.notas || '',
      contacto_nombre: c.contacto?.nombre || '',
      contacto_email: c.contacto?.email || '',
      contacto_telefono: c.contacto?.telefono || '',
      contacto_cargo: c.contacto?.cargo || ''
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
    setError(null);
  };

  const filtered = clientes.filter(c => 
    c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cif?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div style={{padding: 40, textAlign: 'center'}}>Cargando...</div>;

  return (
    <div style={{padding: 24}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
        <h1 style={{margin: 0}}>Clientes</h1>
        <button 
          onClick={() => setShowForm(true)}
          style={{
            background: '#3b82f6', color: 'white', border: 'none',
            padding: '10px 20px', borderRadius: 6, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <Plus size={18} /> Nuevo Cliente
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
          placeholder="Buscar cliente..."
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
              <h3 style={{margin: 0}}>{c.nombre}</h3>
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
              <p style={{margin: '4px 0'}}><CreditCard size={14} style={{marginRight: 8}}/> {c.cif || '-'}</p>
              <p style={{margin: '4px 0'}}><Phone size={14} style={{marginRight: 8}}/> {c.telefono || '-'}</p>
              <p style={{margin: '4px 0'}}><Mail size={14} style={{marginRight: 8}}/> {c.email || '-'}</p>
              <p style={{margin: '4px 0'}}><MapPin size={14} style={{marginRight: 8}}/> {c.direccion || '-'}</p>
              {c.contacto && (
                <p style={{margin: '4px 0'}}><User size={14} style={{marginRight: 8}}/> Contacto: {c.contacto.nombre}</p>
              )}
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
              <h2 style={{margin: 0}}>{editingId ? 'Editar' : 'Nuevo'} Cliente</h2>
              <button onClick={closeForm} style={{background: 'none', border: 'none', cursor: 'pointer'}}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <input
                name="nombre"
                placeholder="Nombre/Razón Social *"
                value={formData.nombre}
                onChange={handleChange}
                required
                style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db', width: '100%', marginBottom: 12, boxSizing: 'border-box'}}
              />

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12}}>
                <input
                  name="cif"
                  placeholder="CIF/NIF"
                  value={formData.cif}
                  onChange={handleChange}
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

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12}}>
                <input
                  name="ciudad"
                  placeholder="Ciudad"
                  value={formData.ciudad}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
                <input
                  name="codigo_postal"
                  placeholder="Código Postal"
                  value={formData.codigo_postal}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12}}>
                <select
                  name="forma_pago"
                  value={formData.forma_pago}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                >
                  {FORMAS_PAGO.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <input
                  name="dias_pago"
                  type="number"
                  placeholder="Días pago"
                  value={formData.dias_pago}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
              </div>

              <textarea
                name="condiciones_especiales"
                placeholder="Condiciones especiales"
                value={formData.condiciones_especiales}
                onChange={handleChange}
                rows={2}
                style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db', width: '100%', marginBottom: 16, boxSizing: 'border-box', resize: 'vertical'}}
              />

              <h4 style={{margin: '16px 0 8px', color: '#374151'}}>Persona de Contacto</h4>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12}}>
                <input
                  name="contacto_nombre"
                  placeholder="Nombre"
                  value={formData.contacto_nombre}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
                <input
                  name="contacto_cargo"
                  placeholder="Cargo"
                  value={formData.contacto_cargo}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12}}>
                <input
                  name="contacto_telefono"
                  placeholder="Teléfono"
                  value={formData.contacto_telefono}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
                <input
                  name="contacto_email"
                  type="email"
                  placeholder="Email"
                  value={formData.contacto_email}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
              </div>

              <textarea
                name="notas"
                placeholder="Notas generales"
                value={formData.notas}
                onChange={handleChange}
                rows={2}
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

export default Clientes;