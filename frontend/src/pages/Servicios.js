import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store';
import { Plus, Search, Edit2, Trash2, Calendar, MapPin, User, Bus, X } from 'lucide-react';
import './Servicios.css';

const API_URL = 'https://milano-backend.onrender.com';

const TIPOS_SERVICIO = [
  { value: 'transfer', label: 'Transfer' },
  { value: 'discrecional', label: 'Discrecional' },
  { value: 'ruta_programada', label: 'Ruta Programada' },
  { value: 'evento', label: 'Evento' },
];

const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_progreso', label: 'En Progreso' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const Servicios = () => {
  const { token } = useAuthStore();
  const [servicios, setServicios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const emptyForm = {
    cliente_id: '',
    conductor_id: '',
    vehiculo_id: '',
    tipo: 'transfer',
    descripcion: '',
    fecha_inicio: '',
    fecha_fin: '',
    importe: '',
    estado: 'pendiente',
    notas: ''
  };

  const [formData, setFormData] = useState(emptyForm);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [servRes, cliRes, condRes, vehRes] = await Promise.all([
        fetch(`${API_URL}/servicios/`, { headers }),
        fetch(`${API_URL}/clientes/`, { headers }),
        fetch(`${API_URL}/conductores/`, { headers }),
        fetch(`${API_URL}/vehiculos/`, { headers })
      ]);

      if (!servRes.ok || !cliRes.ok || !condRes.ok || !vehRes.ok) {
        throw new Error('Error al cargar datos');
      }

      const [servData, cliData, condData, vehData] = await Promise.all([
        servRes.json(),
        cliRes.json(),
        condRes.json(),
        vehRes.json()
      ]);

      setServicios(servData);
      setClientes(cliData);
      setConductores(condData);
      setVehiculos(vehData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) cargarDatos();
  }, [token, cargarDatos]);

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
        ? `${API_URL}/servicios/${editingId}`
        : `${API_URL}/servicios/`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      const dataToSend = {
        ...formData,
        importe: parseFloat(formData.importe) || 0
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

      await cargarDatos();
      closeForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este servicio?')) return;
    
    try {
      const response = await fetch(`${API_URL}/servicios/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Error al eliminar');
      await cargarDatos();
    } catch (err) {
      setError(err.message);
    }
  };

  const openEdit = (s) => {
    setEditingId(s.id);
    setFormData({
      cliente_id: s.clienteId || '',
      conductor_id: s.conductorId || '',
      vehiculo_id: s.vehiculoId || '',
      tipo: s.tipo || 'transfer',
      descripcion: s.descripcion || '',
      fecha_inicio: s.fechaInicio || '',
      fecha_fin: s.fechaFin || '',
      importe: s.importe || '',
      estado: s.estado || 'pendiente',
      notas: s.notas || ''
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
    setError(null);
  };

  const getClienteNombre = (id) => clientes.find(c => c.id == id)?.nombre || 'N/A';
  const getConductorNombre = (id) => {
    const c = conductores.find(c => c.id == id);
    return c ? `${c.nombre} ${c.apellidos}` : 'N/A';
  };
  const getVehiculoMatricula = (id) => vehiculos.find(v => v.id == id)?.matricula || 'N/A';

  const filtered = servicios.filter(s => 
    s.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div style={{padding: 40, textAlign: 'center'}}>Cargando...</div>;

  return (
    <div style={{padding: 24}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
        <h1 style={{margin: 0}}>Servicios</h1>
        <button 
          onClick={() => setShowForm(true)}
          style={{
            background: '#3b82f6', color: 'white', border: 'none',
            padding: '10px 20px', borderRadius: 6, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <Plus size={18} /> Nuevo Servicio
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
          placeholder="Buscar servicio..."
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
        {filtered.map(s => (
          <div key={s.id} style={{
            background: 'white', borderRadius: 8, padding: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 12}}>
              <h3 style={{margin: 0, fontSize: 16}}>{s.descripcion || 'Sin descripción'}</h3>
              <div style={{display: 'flex', gap: 8}}>
                <button onClick={() => openEdit(s)} style={{
                  background: '#f3f4f6', border: 'none', padding: 6,
                  borderRadius: 4, cursor: 'pointer'
                }}>
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(s.id)} style={{
                  background: '#fee2e2', border: 'none', padding: 6,
                  borderRadius: 4, cursor: 'pointer', color: '#dc2626'
                }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <div style={{fontSize: 14, color: '#4b5563', lineHeight: 1.8}}>
              <p style={{margin: '4px 0'}}><User size={14} style={{marginRight: 8}}/> {getClienteNombre(s.clienteId)}</p>
              <p style={{margin: '4px 0'}}><Bus size={14} style={{marginRight: 8}}/> {getConductorNombre(s.conductorId)}</p>
              <p style={{margin: '4px 0'}}><Calendar size={14} style={{marginRight: 8}}/> {s.fechaInicio}</p>
              <p style={{margin: '4px 0'}}>
                Estado: <span style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: 12,
                  background: s.estado === 'completado' ? '#d1fae5' : 
                             s.estado === 'pendiente' ? '#fef3c7' : '#f3f4f6',
                  color: s.estado === 'completado' ? '#059669' : 
                         s.estado === 'pendiente' ? '#d97706' : '#4b5563'
                }}>{s.estado}</span>
              </p>
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
            width: '90%', maxWidth: 500, maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <h2 style={{margin: 0}}>{editingId ? 'Editar' : 'Nuevo'} Servicio</h2>
              <button onClick={closeForm} style={{background: 'none', border: 'none', cursor: 'pointer'}}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <select
                name="cliente_id"
                value={formData.cliente_id}
                onChange={handleChange}
                required
                style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db', width: '100%', marginBottom: 12, boxSizing: 'border-box'}}
              >
                <option value="">Seleccionar Cliente *</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12}}>
                <select
                  name="conductor_id"
                  value={formData.conductor_id}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                >
                  <option value="">Conductor</option>
                  {conductores.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellidos}</option>)}
                </select>
                <select
                  name="vehiculo_id"
                  value={formData.vehiculo_id}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                >
                  <option value="">Vehículo</option>
                  {vehiculos.map(v => <option key={v.id} value={v.id}>{v.matricula}</option>)}
                </select>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12}}>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                >
                  {TIPOS_SERVICIO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <select
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                >
                  {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>

              <input
                name="descripcion"
                placeholder="Descripción del servicio"
                value={formData.descripcion}
                onChange={handleChange}
                style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db', width: '100%', marginBottom: 12, boxSizing: 'border-box'}}
              />

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12}}>
                <input
                  name="fecha_inicio"
                  type="datetime-local"
                  placeholder="Fecha Inicio"
                  value={formData.fecha_inicio}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
                <input
                  name="fecha_fin"
                  type="datetime-local"
                  placeholder="Fecha Fin"
                  value={formData.fecha_fin}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
              </div>

              <input
                name="importe"
                type="number"
                step="0.01"
                placeholder="Importe (€)"
                value={formData.importe}
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

export default Servicios;