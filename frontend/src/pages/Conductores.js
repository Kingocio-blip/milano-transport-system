import { useEffect, useState } from 'react';
import { api } from '../store/authStore';
import { Plus, Search, Edit2, Trash2, Phone, Mail, CreditCard } from 'lucide-react';

export default function Conductores() {
  const [conductores, setConductores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', apellidos: '', email: '', telefono: '', dni: '', licencia: '', tipo_licencia: 'D', estado: 'disponible' });

  useEffect(() => { fetchConductores(); }, []);

  const fetchConductores = async () => {
    try {
      const response = await api.get('/conductores');
      setConductores(response.data);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) await api.put(`/conductores/${editingId}`, formData);
      else await api.post('/conductores', formData);
      setShowForm(false); setEditingId(null);
      setFormData({ nombre: '', apellidos: '', email: '', telefono: '', dni: '', licencia: '', tipo_licencia: 'D', estado: 'disponible' });
      fetchConductores();
    } catch (error) { alert('Error al guardar'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar conductor?')) return;
    try { await api.delete(`/conductores/${id}`); fetchConductores(); }
    catch (error) { alert('Error al eliminar'); }
  };

  const handleEdit = (c) => { setFormData(c); setEditingId(c.id); setShowForm(true); };
  const conductoresFiltrados = conductores.filter(c => `${c.nombre} ${c.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="loading-container"><div className="loading-spinner"></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Conductores</h1><p className="page-subtitle">Gestion de personal</p></div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingId(null); }}><Plus size={20} /> Nuevo Conductor</button>
      </div>

      {showForm && (
        <div className="form-container" style={{ marginBottom: '24px' }}>
          <h3>{editingId ? 'Editar Conductor' : 'Nuevo Conductor'}</h3>
          <form onSubmit={handleSubmit} className="form-grid">
            <input className="form-input" placeholder="Nombre *" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} required />
            <input className="form-input" placeholder="Apellidos *" value={formData.apellidos} onChange={(e) => setFormData({...formData, apellidos: e.target.value})} required />
            <input className="form-input" placeholder="Email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            <input className="form-input" placeholder="Telefono" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} />
            <input className="form-input" placeholder="DNI" value={formData.dni} onChange={(e) => setFormData({...formData, dni: e.target.value})} />
            <input className="form-input" placeholder="Licencia *" value={formData.licencia} onChange={(e) => setFormData({...formData, licencia: e.target.value})} required />
            <select className="form-select" value={formData.tipo_licencia} onChange={(e) => setFormData({...formData, tipo_licencia: e.target.value})}>
              <option value="D">D</option><option value="D1">D1</option><option value="C">C</option><option value="B">B</option>
            </select>
            <select className="form-select" value={formData.estado} onChange={(e) => setFormData({...formData, estado: e.target.value})}>
              <option value="disponible">Disponible</option><option value="en_servicio">En Servicio</option><option value="descanso">Descanso</option><option value="no_disponible">No Disponible</option>
            </select>
            <div className="form-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Guardar</button></div>
          </form>
        </div>
      )}

      <div className="filters-bar"><div className="search-box"><Search size={20} /><input type="text" placeholder="Buscar conductores..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div></div>

      <div className="drivers-grid">
        {conductoresFiltrados.map((c) => (
          <div key={c.id} className="driver-card">
            <div className="driver-header">
              <div className="driver-avatar">{c.nombre[0]}{c.apellidos[0]}</div>
              <div className="driver-status"><span className="status-dot" style={{ background: c.estado === 'disponible' ? '#10b981' : c.estado === 'en_servicio' ? '#3b82f6' : '#f59e0b' }}></span>{c.estado}</div>
            </div>
            <div className="driver-info">
              <p className="driver-name">{c.nombre} {c.apellidos}</p>
              <p className="driver-dni">{c.dni || 'Sin DNI'}</p>
            </div>
            <div className="driver-details">
              {c.email && <div className="detail-item"><Mail size={16} /><span>{c.email}</span></div>}
              {c.telefono && <div className="detail-item"><Phone size={16} /><span>{c.telefono}</span></div>}
              <div className="detail-item"><CreditCard size={16} /><span>Licencia {c.tipo_licencia}: {c.licencia}</span></div>
            </div>
            <div className="driver-actions"><button className="btn-icon" onClick={() => handleEdit(c)}><Edit2 size={18} /></button><button className="btn-icon btn-danger" onClick={() => handleDelete(c.id)}><Trash2 size={18} /></button></div>
          </div>
        ))}
      </div>
    </div>
  );
}