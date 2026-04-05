import { useEffect, useState } from 'react';
import { api } from '../store/authStore';
import { Plus, Search, Edit2, Trash2, MapPin, Calendar, Users, Euro } from 'lucide-react';

const estadoColors = { pendiente: '#f59e0b', en_curso: '#3b82f6', completado: '#10b981', cancelado: '#ef4444' };

export default function Servicios() {
  const [servicios, setServicios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ cliente_id: '', origen: '', destino: '', fecha_salida: '', tipo: 'traslado', pasajeros: '', precio_estimado: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [srvRes, cliRes] = await Promise.all([api.get('/servicios'), api.get('/clientes')]);
      setServicios(srvRes.data); setClientes(cliRes.data);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) await api.put(`/servicios/${editingId}`, formData);
      else await api.post('/servicios', formData);
      setShowForm(false); setEditingId(null);
      setFormData({ cliente_id: '', origen: '', destino: '', fecha_salida: '', tipo: 'traslado', pasajeros: '', precio_estimado: '' });
      fetchData();
    } catch (error) { alert('Error al guardar'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar servicio?')) return;
    try { await api.delete(`/servicios/${id}`); fetchData(); }
    catch (error) { alert('Error al eliminar'); }
  };

  const handleEdit = (s) => { setFormData({...s, fecha_salida: s.fecha_salida?.slice(0,16)}); setEditingId(s.id); setShowForm(true); };
  const serviciosFiltrados = servicios.filter(s => s.codigo.toLowerCase().includes(searchTerm.toLowerCase()));
  const getClienteNombre = (id) => clientes.find(c => c.id === id)?.nombre || 'N/A';

  if (loading) return <div className="loading-container"><div className="loading-spinner"></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Servicios</h1><p className="page-subtitle">Gestion de servicios de transporte</p></div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingId(null); }}><Plus size={20} /> Nuevo Servicio</button>
      </div>

      {showForm && (
        <div className="form-container" style={{ marginBottom: '24px' }}>
          <h3>{editingId ? 'Editar Servicio' : 'Nuevo Servicio'}</h3>
          <form onSubmit={handleSubmit} className="form-grid">
            <select className="form-select" value={formData.cliente_id} onChange={(e) => setFormData({...formData, cliente_id: e.target.value})} required>
              <option value="">Seleccionar cliente</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <input className="form-input" placeholder="Origen *" value={formData.origen} onChange={(e) => setFormData({...formData, origen: e.target.value})} required />
            <input className="form-input" placeholder="Destino *" value={formData.destino} onChange={(e) => setFormData({...formData, destino: e.target.value})} required />
            <input className="form-input" type="datetime-local" value={formData.fecha_salida} onChange={(e) => setFormData({...formData, fecha_salida: e.target.value})} required />
            <select className="form-select" value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})}>
              <option value="traslado">Traslado</option><option value="excursion">Excursion</option><option value="evento">Evento</option><option value="empresarial">Empresarial</option><option value="aeropuerto">Aeropuerto</option>
            </select>
            <input className="form-input" placeholder="Pasajeros *" type="number" value={formData.pasajeros} onChange={(e) => setFormData({...formData, pasajeros: e.target.value})} required />
            <input className="form-input" placeholder="Precio estimado" type="number" value={formData.precio_estimado} onChange={(e) => setFormData({...formData, precio_estimado: e.target.value})} />
            <div className="form-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Guardar</button></div>
          </form>
        </div>
      )}

      <div className="filters-bar"><div className="search-box"><Search size={20} /><input type="text" placeholder="Buscar servicios..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div></div>

      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Codigo</th><th>Cliente</th><th>Ruta</th><th>Fecha</th><th>Tipo</th><th>Pasajeros</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {serviciosFiltrados.map((s) => (
              <tr key={s.id}>
                <td><span className="service-code">{s.codigo}</span></td>
                <td>{getClienteNombre(s.cliente_id)}</td>
                <td><div className="route-info"><p><MapPin size={14} />{s.origen}</p><p><MapPin size={14} />{s.destino}</p></div></td>
                <td><div className="date-info"><Calendar size={14} />{new Date(s.fecha_salida).toLocaleString()}</div></td>
                <td><span className="badge badge-type">{s.tipo}</span></td>
                <td><div className="detail-item"><Users size={14} />{s.pasajeros}</div></td>
                <td><span className="price"><Euro size={14} />{s.precio_estimado?.toFixed(2) || '0.00'}</span></td>
                <td><span className="status-badge" style={{ background: estadoColors[s.estado] + '20', color: estadoColors[s.estado] }}>{s.estado}</span></td>
                <td><div className="actions"><button className="btn-icon" onClick={() => handleEdit(s)}><Edit2 size={18} /></button><button className="btn-icon btn-danger" onClick={() => handleDelete(s.id)}><Trash2 size={18} /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}