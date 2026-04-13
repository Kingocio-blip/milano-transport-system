import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store';
import { Plus, Search, Edit2, Trash2, Bus, Calendar, Users } from 'lucide-react';
import './Vehiculos.css';

const API_URL = 'https://milano-backend.onrender.com';

const Vehiculos = () => {
  const { token } = useAuthStore();
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingVehiculo, setEditingVehiculo] = useState(null);
  
  const [formData, setFormData] = useState({
    matricula: '',
    marca: '',
    modelo: '',
    tipo: 'autobus',
    plazas: 50,
    anno_fabricacion: '',
    estado: 'disponible',
    itv_fecha_ultima: '',
    itv_fecha_proxima: '',
    itv_resultado: 'favorable',
    seguro_compania: '',
    seguro_poliza: '',
    seguro_fecha_vencimiento: '',
    notas: ''
  });

  const cargarVehiculos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/vehiculos/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar vehículos');
      }
      
      const data = await response.json();
      setVehiculos(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      cargarVehiculos();
    }
  }, [token, cargarVehiculos]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingVehiculo 
        ? `${API_URL}/vehiculos/${editingVehiculo.id}`
        : `${API_URL}/vehiculos/`;
      
      const method = editingVehiculo ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Error al guardar vehículo');
      }

      await cargarVehiculos();
      setShowForm(false);
      setEditingVehiculo(null);
      resetForm();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este vehículo?')) return;
    
    try {
      const response = await fetch(`${API_URL}/vehiculos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Error al eliminar vehículo');
      }

      await cargarVehiculos();
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      matricula: '',
      marca: '',
      modelo: '',
      tipo: 'autobus',
      plazas: 50,
      anno_fabricacion: '',
      estado: 'disponible',
      itv_fecha_ultima: '',
      itv_fecha_proxima: '',
      itv_resultado: 'favorable',
      seguro_compania: '',
      seguro_poliza: '',
      seguro_fecha_vencimiento: '',
      notas: ''
    });
  };

  const filteredVehiculos = vehiculos.filter(v => 
    v.matricula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.modelo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loading">Cargando...</div>;

  return (
    <div className="vehiculos-page">
      <div className="page-header">
        <h1>Gestión de Vehículos</h1>
        <button className="btn-primary" onClick={() => { setShowForm(true); setEditingVehiculo(null); resetForm(); }}>
          <Plus size={18} /> Nuevo Vehículo
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="search-bar">
        <Search size={18} />
        <input 
          type="text" 
          placeholder="Buscar vehículo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="vehiculos-grid">
        {filteredVehiculos.map(vehiculo => (
          <div key={vehiculo.id} className="vehiculo-card">
            <div className="vehiculo-header">
              <h3>{vehiculo.marca} {vehiculo.modelo}</h3>
              <div className="actions">
                <button onClick={() => { setEditingVehiculo(vehiculo); setFormData(vehiculo); setShowForm(true); }}>
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(vehiculo.id)} className="btn-danger">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <div className="vehiculo-info">
              <p><Bus size={14} /> Matrícula: {vehiculo.matricula}</p>
              <p><Users size={14} /> Plazas: {vehiculo.plazas}</p>
              <p><Calendar size={14} /> Año: {vehiculo.anno_fabricacion}</p>
              <p>Estado: {vehiculo.estado}</p>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingVehiculo ? 'Editar Vehículo' : 'Nuevo Vehículo'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <input type="text" placeholder="Matrícula" value={formData.matricula} onChange={e => setFormData({...formData, matricula: e.target.value})} required />
                <input type="text" placeholder="Marca" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})} required />
              </div>
              <input type="text" placeholder="Modelo" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} required />
              
              <div className="form-row">
                <select value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
                  <option value="autobus">Autobús</option>
                  <option value="minibus">Minibús</option>
                  <option value="furgoneta">Furgoneta</option>
                  <option value="coche">Coche</option>
                </select>
                <input type="number" placeholder="Plazas" value={formData.plazas} onChange={e => setFormData({...formData, plazas: parseInt(e.target.value)})} />
              </div>

              <div className="form-row">
                <input type="number" placeholder="Año Fabricación" value={formData.anno_fabricacion} onChange={e => setFormData({...formData, anno_fabricacion: parseInt(e.target.value)})} />
                <select value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})}>
                  <option value="disponible">Disponible</option>
                  <option value="en_servicio">En Servicio</option>
                  <option value="taller">En Taller</option>
                  <option value="baja">De Baja</option>
                </select>
              </div>

              <h4>ITV</h4>
              <div className="form-row">
                <input type="date" placeholder="Fecha Última" value={formData.itv_fecha_ultima} onChange={e => setFormData({...formData, itv_fecha_ultima: e.target.value})} />
                <input type="date" placeholder="Fecha Próxima" value={formData.itv_fecha_proxima} onChange={e => setFormData({...formData, itv_fecha_proxima: e.target.value})} />
              </div>
              <select value={formData.itv_resultado} onChange={e => setFormData({...formData, itv_resultado: e.target.value})}>
                <option value="favorable">Favorable</option>
                <option value="desfavorable">Desfavorable</option>
                <option value="negativo">Negativo</option>
              </select>

              <h4>Seguro</h4>
              <div className="form-row">
                <input type="text" placeholder="Compañía" value={formData.seguro_compania} onChange={e => setFormData({...formData, seguro_compania: e.target.value})} />
                <input type="text" placeholder="Póliza" value={formData.seguro_poliza} onChange={e => setFormData({...formData, seguro_poliza: e.target.value})} />
              </div>
              <input type="date" placeholder="Vencimiento" value={formData.seguro_fecha_vencimiento} onChange={e => setFormData({...formData, seguro_fecha_vencimiento: e.target.value})} />

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

export default Vehiculos;