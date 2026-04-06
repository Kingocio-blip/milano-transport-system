import { useEffect, useState } from 'react';
import { api } from '../store/authStore';
import { Plus, Search, Edit2, Trash2, MapPin, Calendar, Clock, Euro, User, CheckCircle } from 'lucide-react';

export default function Servicios() {
  const [servicios, setServicios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    cliente_id: '',
    origen: '',
    destino: '',
    fecha: '',
    hora: '',
    precio: '',
    estado: 'pendiente',
    conductor_id: ''
  });

  useEffect(() => {
    fetchServicios();
    fetchClientes();
    fetchConductores();
  }, []);

  const fetchServicios = async () => {
    try {
      const data = await api.get('/servicios/');
      setServicios(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientes = async () => {
    try {
      const data = await api.get('/clientes/');
      setClientes(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchConductores = async () => {
    try {
      const data = await api.get('/conductores/');
      setConductores(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        cliente_id: parseInt(formData.cliente_id),
        precio: parseFloat(formData.precio),
        conductor_id: formData.conductor_id ? parseInt(formData.conductor_id) : null
      };
      
      if (editingId) {
        await api.put(`/servicios/${editingId}`, payload);
      } else {
        await api.post('/servicios/', payload);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({
        cliente_id: '',
        origen: '',
        destino: '',
        fecha: '',
        hora: '',
        precio: '',
        estado: 'pendiente',
        conductor_id: ''
      });
      fetchServicios();
    } catch (error) {
      alert('Error al guardar: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar servicio?')) return;
    try {
      await api.delete(`/servicios/${id}`);
      fetchServicios();
    } catch (error) {
      alert('Error al eliminar: ' + error.message);
    }
  };

  const handleEdit = (s) => {
    setFormData({
      cliente_id: s.cliente_id?.toString() || '',
      origen: s.origen || '',
      destino: s.destino || '',
      fecha: s.fecha || '',
      hora: s.hora || '',
      precio: s.precio?.toString() || '',
      estado: s.estado || 'pendiente',
      conductor_id: s.conductor_id?.toString() || ''
    });
    setEditingId(s.id);
    setShowForm(true);
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'pendiente': return '#f59e0b';
      case 'en_curso': return '#3b82f6';
      case 'completado': return '#10b981';
      case 'cancelado': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const serviciosFiltrados = servicios.filter(s =>
    s.origen?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.destino?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.cliente?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loading-container"><div className="loading-spinner"></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Servicios</h1>
          <p className="page-subtitle">Gestion de servicios de transporte</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingId(null); }}>
          <Plus size={20} /> Nuevo Servicio
        </button>
      </div>

      {showForm && (
        <div className="form-container" style={{ marginBottom: '24px' }}>
          <h3>{editingId ? 'Editar Servicio' : 'Nuevo Servicio'}</h3>
          <form onSubmit={handleSubmit} className="form-grid">
            <select
              className="form-select"
              value={formData.cliente_id}
              onChange={(e) => setFormData({...formData, cliente_id: e.target.value})}
              required
            >
              <option value="">Seleccionar cliente *</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} {c.apellidos}</option>
              ))}
            </select>

            <select
              className="form-select"
              value={formData.conductor_id}
              onChange={(e) => setFormData({...formData, conductor_id: e.target.value})}
            >
              <option value="">Sin conductor asignado</option>
              {conductores.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} {c.apellidos}</option>
              ))}
            </select>

            <input
              className="form-input"
              placeholder="Origen *"
              value={formData.origen}
              onChange={(e) => setFormData({...formData, origen: e.target.value})}
              required
            />

            <input
              className="form-input"
              placeholder="Destino *"
              value={formData.destino}
              onChange={(e) => setFormData({...formData, destino: e.target.value})}
              required
            />

            <input
              className="form-input"
              type="date"
              value={formData.fecha}
              onChange={(e) => setFormData({...formData, fecha: e.target.value})}
              required
            />

            <input
              className="form-input"
              type="time"
              value={formData.hora}
              onChange={(e) => setFormData({...formData, hora: e.target.value})}
              required
            />

            <input
              className="form-input"
              type="number"
              step="0.01"
              placeholder="Precio (€) *"
              value={formData.precio}
              onChange={(e) => setFormData({...formData, precio: e.target.value})}
              required
            />

            <select
              className="form-select"
              value={formData.estado}
              onChange={(e) => setFormData({...formData, estado: e.target.value})}
            >
              <option value="pendiente">Pendiente</option>
              <option value="en_curso">En Curso</option>
              <option value="completado">Completado</option>
              <option value="cancelado">Cancelado</option>
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
            placeholder="Buscar servicios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="services-grid">
        {serviciosFiltrados.map((s) => (
          <div key={s.id} className="service-card">
            <div className="service-header">
              <div className="service-route">
                <MapPin size={20} style={{ color: '#10b981' }} />
                <span>{s.origen}</span>
                <span style={{ margin: '0 8px' }}>→</span>
                <MapPin size={20} style={{ color: '#ef4444' }} />
                <span>{s.destino}</span>
              </div>
              <div className="service-status">
                <span className="status-dot" style={{ background: getEstadoColor(s.estado) }}></span>
                {s.estado}
              </div>
            </div>

            <div className="service-client">
              <User size={16} />
              <span>{s.cliente?.nombre} {s.cliente?.apellidos}</span>
            </div>

            <div className="service-details">
              <div className="detail-item"><Calendar size={16} /><span>{s.fecha}</span></div>
              <div className="detail-item"><Clock size={16} /><span>{s.hora}</span></div>
              <div className="detail-item"><Euro size={16} /><span>{s.precio}</span></div>
              {s.conductor && (
                <div className="detail-item"><CheckCircle size={16} /><span>{s.conductor.nombre} {s.conductor.apellidos}</span></div>
              )}
            </div>

            <div className="service-actions">
              <button className="btn-icon" onClick={() => handleEdit(s)}><Edit2 size={18} /></button>
              <button className="btn-icon btn-danger" onClick={() => handleDelete(s.id)}><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}