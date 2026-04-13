import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store';
import { Plus, Search, Edit2, Trash2, Bus, Calendar, Users, X } from 'lucide-react';
import './Vehiculos.css';

const API_URL = 'https://milano-backend.onrender.com';

const TIPOS_VEHICULO = [
  { value: 'minibus', label: 'Minibús' },
  { value: 'bus', label: 'Autobús' },
  { value: 'furgoneta', label: 'Furgoneta' },
  { value: 'coche', label: 'Coche' },
];

const ESTADOS = [
  { value: 'activo', label: 'Activo' },
  { value: 'inactivo', label: 'Inactivo' },
  { value: 'taller', label: 'En Taller' },
  { value: 'baja', label: 'De Baja' },
];

const Vehiculos = () => {
  const { token } = useAuthStore();
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const emptyForm = {
    matricula: '',
    marca: '',
    modelo: '',
    anno_fabricacion: '',
    plazas: '',
    tipo: 'bus',
    estado: 'activo',
    itv_fecha_ultima: '',
    itv_fecha_proxima: '',
    itv_resultado: 'favorable',
    seguro_compania: '',
    seguro_poliza: '',
    seguro_fecha_vencimiento: '',
    notas: ''
  };

  const [formData, setFormData] = useState(emptyForm);

  const cargarVehiculos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/vehiculos/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Error al cargar vehículos');
      
      const data = await response.json();
      setVehiculos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) cargarVehiculos();
  }, [token, cargarVehiculos]);

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
        ? `${API_URL}/vehiculos/${editingId}`
        : `${API_URL}/vehiculos/`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      const dataToSend = {
        ...formData,
        anno_fabricacion: parseInt(formData.anno_fabricacion) || null,
        plazas: parseInt(formData.plazas) || null,
        itv: {
          fechaUltima: formData.itv_fecha_ultima,
          fechaProxima: formData.itv_fecha_proxima,
          resultado: formData.itv_resultado
        },
        seguro: {
          compania: formData.seguro_compania,
          poliza: formData.seguro_poliza,
          fechaVencimiento: formData.seguro_fecha_vencimiento
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

      await cargarVehiculos();
      closeForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este vehículo?')) return;
    
    try {
      const response = await fetch(`${API_URL}/vehiculos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Error al eliminar');
      await cargarVehiculos();
    } catch (err) {
      setError(err.message);
    }
  };

  const openEdit = (v) => {
    setEditingId(v.id);
    setFormData({
      matricula: v.matricula || '',
      marca: v.marca || '',
      modelo: v.modelo || '',
      anno_fabricacion: v.annoFabricacion || '',
      plazas: v.plazas || '',
      tipo: v.tipo || 'bus',
      estado: v.estado || 'activo',
      itv_fecha_ultima: v.itv?.fechaUltima || '',
      itv_fecha_proxima: v.itv?.fechaProxima || '',
      itv_resultado: v.itv?.resultado || 'favorable',
      seguro_compania: v.seguro?.compania || '',
      seguro_poliza: v.seguro?.poliza || '',
      seguro_fecha_vencimiento: v.seguro?.fechaVencimiento || '',
      notas: v.notas || ''
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
    setError(null);
  };

  const filtered = vehiculos.filter(v => 
    v.matricula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.modelo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div style={{padding: 40, textAlign: 'center'}}>Cargando...</div>;

  return (
    <div style={{padding: 24}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
        <h1 style={{margin: 0}}>Vehículos</h1>
        <button 
          onClick={() => setShowForm(true)}
          style={{
            background: '#3b82f6', color: 'white', border: 'none',
            padding: '10px 20px', borderRadius: 6, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <Plus size={18} /> Nuevo Vehículo
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
          placeholder="Buscar vehículo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            border: 'none', background: 'transparent', outline: 'none',
            flex: 1, fontSize: 14
          }}
        />
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16
      }}>
        {filtered.map(v => (
          <div key={v.id} style={{
            background: 'white', borderRadius: 8, padding: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 12}}>
              <h3 style={{margin: 0}}>{v.marca} {v.modelo}</h3>
              <div style={{display: 'flex', gap: 8}}>
                <button onClick={() => openEdit(v)} style={{
                  background: '#f3f4f6', border: 'none', padding: 6,
                  borderRadius: 4, cursor: 'pointer'
                }}>
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(v.id)} style={{
                  background: '#fee2e2', border: 'none', padding: 6,
                  borderRadius: 4, cursor: 'pointer', color: '#dc2626'
                }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <div style={{fontSize: 14, color: '#4b5563', lineHeight: 1.8}}>
              <p style={{margin: '4px 0'}}><Bus size={14} style={{marginRight: 8}}/> {v.matricula}</p>
              <p style={{margin: '4px 0'}}><Users size={14} style={{marginRight: 8}}/> {v.plazas} plazas</p>
              <p style={{margin: '4px 0'}}><Calendar size={14} style={{marginRight: 8}}/> Año: {v.annoFabricacion}</p>
              <p style={{margin: '4px 0'}}>Estado: <span style={{
                padding: '2px 8px', borderRadius: 4, fontSize: 12,
                background: v.estado === 'activo' ? '#d1fae5' : '#f3f4f6',
                color: v.estado === 'activo' ? '#059669' : '#4b5563'
              }}>{v.estado}</span></p>
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
              <h2 style={{margin: 0}}>{editingId ? 'Editar' : 'Nuevo'} Vehículo</h2>
              <button onClick={closeForm} style={{background: 'none', border: 'none', cursor: 'pointer'}}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12}}>
                <input
                  name="matricula"
                  placeholder="Matrícula *"
                  value={formData.matricula}
                  onChange={handleChange}
                  required
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
                <input
                  name="marca"
                  placeholder="Marca *"
                  value={formData.marca}
                  onChange={handleChange}
                  required
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12}}>
                <input
                  name="modelo"
                  placeholder="Modelo *"
                  value={formData.modelo}
                  onChange={handleChange}
                  required
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
                <input
                  name="anno_fabricacion"
                  type="number"
                  placeholder="Año Fabricación"
                  value={formData.anno_fabricacion}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12}}>
                <input
                  name="plazas"
                  type="number"
                  placeholder="Plazas"
                  value={formData.plazas}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                >
                  {TIPOS_VEHICULO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
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

              <h4 style={{margin: '16px 0 8px', color: '#374151'}}>ITV</h4>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12}}>
                <input
                  name="itv_fecha_ultima"
                  type="date"
                  placeholder="Fecha Última"
                  value={formData.itv_fecha_ultima}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
                <input
                  name="itv_fecha_proxima"
                  type="date"
                  placeholder="Fecha Próxima"
                  value={formData.itv_fecha_proxima}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
                <select
                  name="itv_resultado"
                  value={formData.itv_resultado}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                >
                  <option value="favorable">Favorable</option>
                  <option value="desfavorable">Desfavorable</option>
                  <option value="negativo">Negativo</option>
                </select>
              </div>

              <h4 style={{margin: '16px 0 8px', color: '#374151'}}>Seguro</h4>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12}}>
                <input
                  name="seguro_compania"
                  placeholder="Compañía"
                  value={formData.seguro_compania}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
                <input
                  name="seguro_poliza"
                  placeholder="Póliza"
                  value={formData.seguro_poliza}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
                <input
                  name="seguro_fecha_vencimiento"
                  type="date"
                  placeholder="Vencimiento"
                  value={formData.seguro_fecha_vencimiento}
                  onChange={handleChange}
                  style={{padding: 10, borderRadius: 6, border: '1px solid #d1d5db'}}
                />
              </div>

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

export default Vehiculos;