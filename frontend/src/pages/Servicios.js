import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store';
import { Plus, Search, Edit2, Trash2, Calendar, MapPin, User, Bus, FileText } from 'lucide-react';
import './Servicios.css';

const API_URL = 'https://milano-backend.onrender.com';

const Servicios = () => {
  const { token } = useAuthStore();
  const [servicios, setServicios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingServicio, setEditingServicio] = useState(null);
  
  const [formData, setFormData] = useState({
    cliente_id: '',
    conductor_id: '',
    vehiculo_id: '',
    tipo: 'transfer',
    descripcion: '',
    origen: '',
    destino: '',
    fecha_inicio: '',
    hora_inicio: '',
    fecha_fin: '',
    hora_fin: '',
    importe: 0,
    estado: 'pendiente',
    notas: ''
  });

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
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
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      cargarDatos();
    }
  }, [token, cargarDatos]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingServicio 
        ? `${API_URL}/servicios/${editingServicio.id}`
        : `${API_URL}/servicios/`;
      
      const method = editingServicio ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Error al guardar servicio');
      }

      await cargarDatos();
      setShowForm(false);
      setEditingServicio(null);
      resetForm();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este servicio?')) return;
    
    try {
      const response = await fetch(`${API_URL}/servicios/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Error al eliminar servicio');
      }

      await cargarDatos();
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      conductor_id: '',
      vehiculo_id: '',
      tipo: 'transfer',
      descripcion: '',
      origen: '',
      destino: '',
      fecha_inicio: '',
      hora_inicio: '',
      fecha_fin: '',
      hora_fin: '',
      importe: 0,
      estado: 'pendiente',
      notas: ''
    });
  };

  const filteredServicios = servicios.filter(s => 
    s.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.origen?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.destino?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loading">Cargando...</div>;

  return (
    <div className="servicios-page">
      <div className="page-header">
        <h1>Gestión de Servicios</h1>
        <button className="btn-primary" onClick={() => { setShowForm(true); setEditingServicio(null); resetForm(); }}>
          <Plus size={18} /> Nuevo Servicio
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="search-bar">
        <Search size={18} />
        <input 
          type="text" 
          placeholder="Buscar servicio..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="servicios-grid">
        {filteredServicios.map(servicio => (
          <div key={servicio.id} className="servicio-card">
            <div className="servicio-header">
              <h3>{servicio.descripcion || 'Sin descripción'}</h3>
              <div className="actions">
                <button onClick={() => { setEditingServicio(servicio); setFormData(servicio); setShowForm(true); }}>
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(servicio.id)} className="btn-danger">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <div className="servicio-info">
              <p><MapPin size={14} /> {servicio.origen} → {servicio.destino}</p>
              <p><Calendar size={14} /> {servicio.fecha_inicio} {servicio.hora_inicio}</p>
              <p><User size={14} /> Cliente: {clientes.find(c => c.id === servicio.cliente_id)?.nombre || 'N/A'}</p>
              <p><Bus size={14} /> Conductor: {conductores.find(c => c.id === servicio.conductor_id)?.nombre || 'N/A'}</p>
              <p>Estado: {servicio.estado}</p>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <h2>{editingServicio ? 'Editar Servicio' : 'Nuevo Servicio'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <select value={formData.cliente_id} onChange={e => setFormData({...formData, cliente_id: e.target.value})} required>
                  <option value="">Seleccionar Cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <select value={formData.conductor_id} onChange={e => setFormData({...formData, conductor_id: e.target.value})}>
                  <option value="">Seleccionar Conductor</option>
                  {conductores.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellidos}</option>)}
                </select>
              </div>

              <div className="form-row">
                <select value={formData.vehiculo_id} onChange={e => setFormData({...formData, vehiculo_id: e.target.value})}>
                  <option value="">Seleccionar Vehículo</option>
                  {vehiculos.map(v => <option key={v.id} value={v.id}>{v.matricula} - {v.marca}</option>)}
                </select>
                <select value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
                  <option value="transfer">Transfer</option>
                  <option value="discrecional">Discrecional</option>
                  <option value="ruta_programada">Ruta Programada</option>
                  <option value="evento">Evento</option>
                </select>
              </div>

              <input type="text" placeholder="Descripción" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} />
              
              <div className="form-row">
                <input type="text" placeholder="Origen" value={formData.origen} onChange={e => setFormData({...formData, origen: e.target.value})} />
                <input type="text" placeholder="Destino" value={formData.destino} onChange={e => setFormData({...formData, destino: e.target.value})} />
              </div>

              <div className="form-row">
                <input type="date" placeholder="Fecha Inicio" value={formData.fecha_inicio} onChange={e => setFormData({...formData, fecha_inicio: e.target.value})} />
                <input type="time" placeholder="Hora Inicio" value={formData.hora_inicio} onChange={e => setFormData({...formData, hora_inicio: e.target.value})} />
              </div>

              <div className="form-row">
                <input type="date" placeholder="Fecha Fin" value={formData.fecha_fin} onChange={e => setFormData({...formData, fecha_fin: e.target.value})} />
                <input type="time" placeholder="Hora Fin" value={formData.hora_fin} onChange={e => setFormData({...formData, hora_fin: e.target.value})} />
              </div>

              <div className="form-row">
                <input type="number" placeholder="Importe (€)" value={formData.importe} onChange={e => setFormData({...formData, importe: parseFloat(e.target.value)})} />
                <select value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})}>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_curso">En Curso</option>
                  <option value="completado">Completado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
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

export default Servicios;