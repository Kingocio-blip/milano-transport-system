import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store';
import { Plus, Search, Edit2, Trash2, Bus, Calendar, Users } from 'lucide-react';
import './Vehiculos.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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
    capacidad_pasajeros: 50,
    anno_fabricacion: '',
    estado: 'disponible'
  });

  const cargarVehiculos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/vehiculos/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
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
    cargarVehiculos();
  }, [cargarVehiculos]);

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
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al guardar vehículo');
      }

      setShowForm(false);
      setEditingVehiculo(null);
      resetForm();
      cargarVehiculos();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este vehículo?')) return;
    try {
      const response = await fetch(`${API_URL}/vehiculos/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Error al eliminar vehículo');
      
      cargarVehiculos();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (vehiculo) => {
    setEditingVehiculo(vehiculo);
    setFormData({
      matricula: vehiculo.matricula,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      tipo: vehiculo.tipo,
      capacidad_pasajeros: vehiculo.capacidad_pasajeros,
      anno_fabricacion: vehiculo.anno_fabricacion || '',
      estado: vehiculo.estado
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      matricula: '',
      marca: '',
      modelo: '',
      tipo: 'autobus',
      capacidad_pasajeros: 50,
      anno_fabricacion: '',
      estado: 'disponible'
    });
  };

  const filteredVehiculos = vehiculos.filter(v => 
    v.matricula.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.modelo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loading">Cargando vehículos...</div>;

  return (
    <div className="vehiculos-container">
      <div className="page-header">
        <h1>Gestión de Vehículos</h1>
        <button className="btn-primary" onClick={() => {
          setShowForm(!showForm);
          if (showForm) {
            setEditingVehiculo(null);
            resetForm();
          }
        }}>
          <Plus size={20} />
          {showForm ? 'Cancelar' : 'Nuevo Vehículo'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="vehiculo-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Matrícula *</label>
              <input
                type="text"
                value={formData.matricula}
                onChange={(e) => setFormData({...formData, matricula: e.target.value})}
                required
                placeholder="1234-ABC"
              />
            </div>
            <div className="form-group">
              <label>Marca *</label>
              <input
                type="text"
                value={formData.marca}
                onChange={(e) => setFormData({...formData, marca: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Modelo *</label>
              <input
                type="text"
                value={formData.modelo}
                onChange={(e) => setFormData({...formData, modelo: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({...formData, tipo: e.target.value})}
              >
                <option value="autobus">Autobús</option>
                <option value="minibus">Minibús</option>
                <option value="furgoneta">Furgoneta</option>
                <option value="coche">Coche</option>
              </select>
            </div>
            <div className="form-group">
              <label>Capacidad Pasajeros</label>
              <input
                type="number"
                value={formData.capacidad_pasajeros}
                onChange={(e) => setFormData({...formData, capacidad_pasajeros: parseInt(e.target.value)})}
                min="1"
              />
            </div>
            <div className="form-group">
              <label>Año Fabricación</label>
              <input
                type="number"
                value={formData.anno_fabricacion}
                onChange={(e) => setFormData({...formData, anno_fabricacion: e.target.value})}
                placeholder="2020"
              />
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData({...formData, estado: e.target.value})}
              >
                <option value="disponible">Disponible</option>
                <option value="en_uso">En uso</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="fuera_servicio">Fuera de servicio</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingVehiculo ? 'Actualizar' : 'Crear'} Vehículo
            </button>
          </div>
        </form>
      )}

      <div className="search-box">
        <Search size={20} />
        <input
          type="text"
          placeholder="Buscar por matrícula, marca o modelo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="vehiculos-grid">
        {filteredVehiculos.map((vehiculo) => (
          <div key={vehiculo.id} className={`vehiculo-card ${vehiculo.estado}`}>
            <div className="vehiculo-header">
              <div className="vehiculo-matricula">{vehiculo.matricula}</div>
              <span className={`estado-badge ${vehiculo.estado}`}>{vehiculo.estado}</span>
            </div>
            
            <div className="vehiculo-info">
              <div className="info-row">
                <Bus size={16} />
                <span>{vehiculo.marca} {vehiculo.modelo}</span>
              </div>
              <div className="info-row">
                <Users size={16} />
                <span>{vehiculo.capacidad_pasajeros} plazas</span>
              </div>
              {vehiculo.anno_fabricacion && (
                <div className="info-row">
                  <Calendar size={16} />
                  <span>Año: {vehiculo.anno_fabricacion}</span>
                </div>
              )}
            </div>

            <div className="vehiculo-actions">
              <button 
                className="btn-icon btn-edit"
                onClick={() => handleEdit(vehiculo)}
                title="Editar"
              >
                <Edit2 size={18} />
              </button>
              <button 
                className="btn-icon btn-delete"
                onClick={() => handleDelete(vehiculo.id)}
                title="Eliminar"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredVehiculos.length === 0 && (
        <div className="empty-state">
          <p>No se encontraron vehículos</p>
        </div>
      )}
    </div>
  );
};

export default Vehiculos;