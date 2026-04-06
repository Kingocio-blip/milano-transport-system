import { useEffect, useState } from 'react';
import { api } from '../store/authStore';
import { Plus, Search, Edit2, Trash2, Bus, Users, Gauge } from 'lucide-react';

const tipoIcons = { minibus: '#3b82f6', furgon: '#10b981', bus: '#8b5cf6', limousine: '#f59e0b', otro: '#6b7280' };

export default function Vehiculos() {
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    matricula: '', 
    marca: '', 
    modelo: '', 
    tipo: 'minibus', 
    capacidad_pasajeros: '', 
    anno_fabricacion: '', 
    estado: 'activo' 
  });

  useEffect(() => { fetchVehiculos(); }, []);

  const fetchVehiculos = async () => {
    try {
      const data = await api.get('/vehiculos/');
      setVehiculos(data);
    } catch (error) { 
      console.error('Error:', error); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        capacidad_pasajeros: parseInt(formData.capacidad_pasajeros) || 0,
        anno_fabricacion: parseInt(formData.anno_fabricacion) || null
      };
      
      if (editingId) {
        await api.put(`/vehiculos/${editingId}`, payload);
      } else {
        await api.post('/vehiculos/', payload);
      }
      setShowForm(false); 
      setEditingId(null);
      setFormData({ 
        matricula: '', 
        marca: '', 
        modelo: '', 
        tipo: 'minibus', 
        capacidad_pasajeros: '', 
        anno_fabricacion: '', 
        estado: 'activo' 
      });
      fetchVehiculos();
    } catch (error) { 
      alert('Error al guardar: ' + error.message); 
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar vehiculo?')) return;
    try { 
      await api.delete(`/vehiculos/${id}`); 
      fetchVehiculos(); 
    } catch (error) { 
      alert('Error al eliminar: ' + error.message); 
    }
  };

  const handleEdit = (v) => { 
    setFormData({
      matricula: v.matricula || '',
      marca: v.marca || '',
      modelo: v.modelo || '',
      tipo: v.tipo || 'minibus',
      capacidad_pasajeros: v.capacidad_pasajeros || '',
      anno_fabricacion: v.anno_fabricacion || '',
      estado: v.estado || 'activo'
    }); 
    setEditingId(v.id); 
    setShowForm(true); 
  };
  
  const vehiculosFiltrados = vehiculos.filter(v => 
    v.matricula?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.marca?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loading-container"><div className="loading-spinner"></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Vehiculos</h1>
          <p className="page-subtitle">Gestion de flota</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingId(null); }}>
          <Plus size={20} /> Nuevo Vehiculo
        </button>
      </div>

      {showForm && (
        <div className="form-container" style={{ marginBottom: '24px' }}>
          <h3>{editingId ? 'Editar Vehiculo' : 'Nuevo Vehiculo'}</h3>
          <form onSubmit={handleSubmit} className="form-grid">
            <input 
              className="form-input" 
              placeholder="Matricula *" 
              value={formData.matricula} 
              onChange={(e) => setFormData({...formData, matricula: e.target.value})} 
              required 
            />
            <input 
              className="form-input" 
              placeholder="Marca *" 
              value={formData.marca} 
              onChange={(e) => setFormData({...formData, marca: e.target.value})} 
              required 
            />
            <input 
              className="form-input" 
              placeholder="Modelo *" 
              value={formData.modelo} 
              onChange={(e) => setFormData({...formData, modelo: e.target.value})} 
              required 
            />
            <select 
              className="form-select" 
              value={formData.tipo} 
              onChange={(e) => setFormData({...formData, tipo: e.target.value})}
            >
              <option value="minibus">Minibus</option>
              <option value="furgon">Furgon</option>
              <option value="bus">Bus</option>
              <option value="limousine">Limousine</option>
              <option value="otro">Otro</option>
            </select>
            <input 
              className="form-input" 
              placeholder="Capacidad *" 
              type="number" 
              value={formData.capacidad_pasajeros} 
              onChange={(e) => setFormData({...formData, capacidad_pasajeros: e.target.value})} 
              required 
            />
            <input 
              className="form-input" 
              placeholder="Ano" 
              type="number" 
              value={formData.anno_fabricacion} 
              onChange={(e) => setFormData({...formData, anno_fabricacion: e.target.value})} 
            />
            <select 
              className="form-select" 
              value={formData.estado} 
              onChange={(e) => setFormData({...formData, estado: e.target.value})}
            >
              <option value="activo">Activo</option>
              <option value="mantenimiento">Mantenimiento</option>
              <option value="inactivo">Inactivo</option>
            </select>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      )}

      <div className="filters-bar">
        <div className="search-box">
          <Search size={20} />
          <input 
            type="text" 
            placeholder="Buscar vehiculos..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <div className="vehicles-grid">
        {vehiculosFiltrados.map((v) => (
          <div key={v.id} className="vehicle-card">
            <div className="vehicle-header">
              <div className="vehicle-icon" style={{ background: (tipoIcons[v.tipo] || '#6b7280') + '20', color: tipoIcons[v.tipo] || '#6b7280' }}>
                <Bus size={28} />
              </div>
              <div className="vehicle-status">
                <span className="status-dot" style={{ background: v.estado === 'activo' ? '#10b981' : v.estado === 'mantenimiento' ? '#f59e0b' : '#ef4444' }}></span>
                {v.estado}
              </div>
            </div>
            <div className="vehicle-info">
              <p className="vehicle-matricula">{v.matricula}</p>
              <p className="vehicle-model">{v.marca} {v.modelo}</p>
              <p className="vehicle-type">{v.tipo}</p>
            </div>
            <div className="vehicle-details">
              <div className="detail-item"><Users size={16} /><span>{v.capacidad_pasajeros} plazas</span></div>
              {v.anno_fabricacion && <div className="detail-item"><Gauge size={16} /><span>{v.anno_fabricacion}</span></div>}
            </div>
            <div className="vehicle-actions">
              <button className="btn-icon" onClick={() => handleEdit(v)}><Edit2 size={18} /></button>
              <button className="btn-icon btn-danger" onClick={() => handleDelete(v.id)}><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}