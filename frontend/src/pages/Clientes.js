import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store';
import { Plus, Search, Edit2, Trash2, Phone, Mail, MapPin, CreditCard, User, X } from 'lucide-react';
import './Clientes.css';

const API_URL = 'https://milano-backend.onrender.com';

const TIPOS_CLIENTE = [
  { value: 'particular', label: 'Particular' },
  { value: 'empresa', label: 'Empresa' },
  { value: 'festival', label: 'Festival' },
  { value: 'promotor', label: 'Promotor' },
  { value: 'colegio', label: 'Colegio' },
];

const FORMAS_PAGO = [
  { value: 'transferencia', label: 'Transferencia Bancaria' },
  { value: 'domiciliacion', label: 'Domiciliación Bancaria' },
  { value: 'tarjeta', label: 'Tarjeta de Crédito' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'paypal', label: 'PayPal' },
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
    tipo: 'particular',
    nif: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    codigo_postal: '',
    forma_pago: 'transferencia',
    dias_pago: '30',
    condiciones_especiales: '',
    estado: 'activo',
    notas: ''
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
      
      // Datos con contacto ANIDADO (como espera el backend)
      const dataToSend = {
        nombre: formData.nombre.trim(),
        tipo: formData.tipo,
        nif: formData.nif.trim() || null,
        condiciones_especiales: formData.condiciones_especiales.trim() || null,
        forma_pago: formData.forma_pago,
        dias_pago: parseInt(formData.dias_pago) || 30,
        estado: formData.estado,
        notas: formData.notas.trim() || null,
        // Contacto ANIDADO (objeto)
        contacto: {
          email: formData.email.trim() || null,
          telefono: formData.telefono.trim() || null,
          direccion: formData.direccion.trim() || null,
          ciudad: formData.ciudad.trim() || null,
          codigoPostal: formData.codigo_postal.trim() || null
        }
      };

      console.log('Enviando:', dataToSend);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSend)
      });

      const responseData = await response.json();
      console.log('Respuesta:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.detail || JSON.stringify(responseData));
      }

      await cargarClientes();
      closeForm();
    } catch (err) {
      console.error('Error:', err);
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
      tipo: c.tipo || 'particular',
      nif: c.nif || '',
      email: c.contacto?.email || c.contacto_email || '',
      telefono: c.contacto?.telefono || c.contacto_telefono || '',
      direccion: c.contacto?.direccion || c.contacto_direccion || '',
      ciudad: c.contacto?.ciudad || c.contacto_ciudad || '',
      codigo_postal: c.contacto?.codigoPostal || c.contacto_codigo_postal || '',
      forma_pago: c.forma_pago || 'transferencia',
      dias_pago: String(c.dias_pago || 30),
      condiciones_especiales: c.condiciones_especiales || '',
      estado: c.estado || 'activo',
      notas: c.notas || ''
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
    c.nif?.toLowerCase().includes(searchTerm.toLowerCase())
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
        <div style={{background: '#fee2e2', color: '#dc2626', padding: 12, borderRadius: 6, marginBottom: 16}}>
          {error}
        </div>
      )}

      <div style={{display: 'flex', alignItems: 'center', gap: 12, background: '#f3f4f6', padding: '8px 16px', borderRadius: 8, marginBottom: 24}}>
        <Search size={20} color="#6b7280" />
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{border: 'none', background: 'transparent', outline: 'none', flex: 1, fontSize: 14}}
        />
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16}}>
        {filtered.map(c => (
          <div key={c.id} style={{background: 'white', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 12}}>
              <h3 style={{margin: 0}}>{c.nombre}</h3>
              <div style={{display: 'flex', gap: 8}}>
                <button onClick={() => openEdit(c)} style={{background: '#f3f4f6', border: 'none', padding: 6, borderRadius: 4, cursor: 'pointer'}}>
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(c.id)} style={{background: '#fee2e2', border: 'none', padding: 6, borderRadius: 4, cursor: 'pointer', color: '#dc2626'}}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <div style={{fontSize: 14, color: '#4b5563', lineHeight: 1.8}}>
              {c.nif && <p style={{margin: '4px 0'}}><CreditCard size={14} style={{marginRight: 8}}/> {c.nif}</p>}
              {(c.contacto?.telefono || c.contacto_telefono) && <p style={{margin: '4px 0'}}><Phone size={14} style={{marginRight: 8}}/> {c.contacto?.telefono || c.contacto_telefono}</p>}
              {(c.contacto?.email || c.contacto_email) && <p style={{margin: '4px 0'}}><Mail size={14} style={{marginRight: 8}}/> {c.contacto?.email || c.contacto_email}</p>}
              {(c.contacto?.direccion || c.contacto_direccion) && <p style={{margin: '4px 0'}}><MapPin size={14} style={{marginRight: 8}}/> {c.contacto?.direccion || c.contacto_direccion}</p>}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20}}>
          <div style={{background: 'white', borderRadius: 12, padding: 24, width: '100%', maxWidth: 500, maxHeight: '90vh', overflow: 'auto'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <h2 style={{margin: 0}}>{editingId ? 'Editar' : 'Nuevo'} Cliente</h2>
              <button onClick={closeForm} style={{background: 'none', border: 'none', cursor: 'pointer'}}><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <select name="tipo" value={formData.tipo} onChange={handleChange} style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db', width: '100%', marginBottom: 12}}>
                {TIPOS_CLIENTE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>

              <input name="nombre" placeholder="Nombre / Razón Social *" value={formData.nombre} onChange={handleChange} required style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db', width: '100%', marginBottom: 12}} />

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12}}>
                <input name="nif" placeholder="NIF/CIF" value={formData.nif} onChange={handleChange} style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}} />
                <input name="telefono" placeholder="Teléfono" value={formData.telefono} onChange={handleChange} style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}} />
              </div>

              <input name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db', width: '100%', marginBottom: 12}} />

              <input name="direccion" placeholder="Dirección" value={formData.direccion} onChange={handleChange} style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db', width: '100%', marginBottom: 12}} />

              <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 16}}>
                <input name="ciudad" placeholder="Ciudad" value={formData.ciudad} onChange={handleChange} style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}} />
                <input name="codigo_postal" placeholder="CP" value={formData.codigo_postal} onChange={handleChange} style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}} />
              </div>

              <h4 style={{margin: '16px 0 12px', color: '#374151', fontSize: 14}}>Condiciones de Pago</h4>
              <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12}}>
                <select name="forma_pago" value={formData.forma_pago} onChange={handleChange} style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}>
                  {FORMAS_PAGO.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <input name="dias_pago" type="number" placeholder="Días pago" value={formData.dias_pago} onChange={handleChange} style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}} />
              </div>

              <textarea name="condiciones_especiales" placeholder="Condiciones especiales" value={formData.condiciones_especiales} onChange={handleChange} rows={2} style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db', width: '100%', marginBottom: 12}} />

              <textarea name="notas" placeholder="Notas" value={formData.notas} onChange={handleChange} rows={2} style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db', width: '100%', marginBottom: 20}} />

              <div style={{display: 'flex', gap: 12, justifyContent: 'flex-end'}}>
                <button type="button" onClick={closeForm} style={{padding: '10px 20px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white', cursor: 'pointer'}}>Cancelar</button>
                <button type="submit" disabled={saving} style={{padding: '10px 20px', borderRadius: 6, border: 'none', background: '#3b82f6', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1}}>{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clientes;