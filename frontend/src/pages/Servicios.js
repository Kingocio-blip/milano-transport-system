import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store';
import { Plus, Search, Edit2, Trash2, Calendar, MapPin, User, Bus, FileText } from 'lucide-react';
import './Servicios.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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
    tipo_servicio: 'transfer',
    origen: '',
    destino: '',
    fecha_inicio: '',
    hora_inicio: '',
    fecha_fin: '',
    hora_fin: '',
    numero_pasajeros: 1,
    precio: '',
    gastos_combustible: '',
    gastos_peaje: '',
    gastos_otros: '',
    notas: '',
    estado: 'pendiente'
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

      const [serviciosData, clientesData, conductoresData, vehiculosData] = await Promise.all([
        servRes.json(),
        cliRes.json(),
        condRes.json(),
        vehRes.json()
      ]);

      setServicios(serviciosData);
      setClientes(clientesData);
      setConductores(conductoresData);
      setVehiculos(vehiculosData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingServicio 
        ? `${API_URL}/servicios/${editingServicio.id}`
        : `${API_URL}/servicios/`;
      
      const method = editingServicio ? 'PUT' : 'POST';
      
      const dataToSend = {
        ...formData,
        precio: parseFloat(formData.precio) || 0,
        gastos_combustible: parseFloat(formData.gastos_combustible) || 0,
        gastos_peaje: parseFloat(formData.gastos_peaje) || 0,
        gastos_otros: parseFloat(formData.gastos_otros) || 0,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al guardar servicio');
      }

      setShowForm(false);
      setEditingServicio(null);
      resetForm();
      cargarDatos();
    } catch (err) {
      setError(err.message);
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
      cargarDatos();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCrearFactura = async (servicio) => {
    try {
      const facturaData = {
        servicio_id: servicio.id,
        cliente_id: servicio.cliente_id,
        fecha_emision: new Date().toISOString().split('T')[0],
        fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        concepto: `Servicio ${servicio.tipo_servicio}: ${servicio.origen} - ${servicio.destino}`,
        importe_base: servicio.precio,
        tipo_iva: 21,
        estado: 'pendiente'
      };

      const response = await fetch(`${API_URL}/facturas/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(facturaData)
      });

      if (!response.ok) throw new Error('Error al crear factura');
      
      alert('Factura creada correctamente');
      cargarDatos();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (servicio) => {
    setEditingServicio(servicio);
    setFormData({
      cliente_id: servicio.cliente_id || '',
      conductor_id: servicio.conductor_id || '',
      vehiculo_id: servicio.vehiculo_id || '',
      tipo_servicio: servicio.tipo_servicio || 'transfer',
      origen: servicio.origen || '',
      destino: servicio.destino || '',
      fecha_inicio: servicio.fecha_inicio || '',
      hora_inicio: servicio.hora_inicio || '',
      fecha_fin: servicio.fecha_fin || '',
      hora_fin: servicio.hora_fin || '',
      numero_pasajeros: servicio.numero_pasajeros || 1,
      precio: servicio.precio || '',
      gastos_combustible: servicio.gastos_combustible || '',
      gastos_peaje: servicio.gastos_peaje || '',
      gastos_otros: servicio.gastos_otros || '',
      notas: servicio.notas || '',
      estado: servicio.estado || 'pendiente'
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      conductor_id: '',
      vehiculo_id: '',
      tipo_servicio: 'transfer',
      origen: '',
      destino: '',
      fecha_inicio: '',
      hora_inicio: '',
      fecha_fin: '',
      hora_fin: '',
      numero_pasajeros: 1,
      precio: '',
      gastos_combustible: '',
      gastos_peaje: '',
      gastos_otros: '',
      notas: '',
      estado: 'pendiente'
    });
  };

  const calcularRentabilidad = (s) => {
    const ingresos = parseFloat(s.precio) || 0;
    const gastos = (parseFloat(s.gastos_combustible) || 0) + 
                   (parseFloat(s.gastos_peaje) || 0) + 
                   (parseFloat(s.gastos_otros) || 0);
    return ingresos - gastos;
  };

  const getClienteNombre = (id) => {
    const c = clientes.find(c => c.id === id);
    return c ? `${c.nombre} ${c.apellidos}` : 'N/A';
  };

  const getConductorNombre = (id) => {
    const c = conductores.find(c => c.id === id);
    return c ? `${c.nombre} ${c.apellidos}` : 'Sin asignar';
  };

  const getVehiculoMatricula = (id) => {
    const v = vehiculos.find(v => v.id === id);
    return v ? v.matricula : 'Sin asignar';
  };

  const filteredServicios = servicios.filter(s => 
    s.origen?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.destino?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getClienteNombre(s.cliente_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loading">Cargando servicios...</div>;

  return (
    <div className="servicios-container">
      <div className="page-header">
        <h1>Gestión de Servicios</h1>
        <button className="btn-primary" onClick={() => {
          setShowForm(!showForm);
          if (showForm) {
            setEditingServicio(null);
            resetForm();
          }
        }}>
          <Plus size={20} />
          {showForm ? 'Cancelar' : 'Nuevo Servicio'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="servicio-form">
          <div className="form-section">
            <h3>Información General</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Cliente *</label>
                <select
                  value={formData.cliente_id}
                  onChange={(e) => setFormData({...formData, cliente_id: parseInt(e.target.value)})}
                  required
                >
                  <option value="">Seleccionar cliente</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} {c.apellidos} - {c.dni}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Tipo de Servicio *</label>
                <select
                  value={formData.tipo_servicio}
                  onChange={(e) => setFormData({...formData, tipo_servicio: e.target.value})}
                  required
                >
                  <option value="transfer">Transfer</option>
                  <option value="disposicion">A disposición</option>
                  <option value="evento">Evento</option>
                  <option value="excursion">Excursión</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="form-group">
                <label>Conductor</label>
                <select
                  value={formData.conductor_id}
                  onChange={(e) => setFormData({...formData, conductor_id: parseInt(e.target.value) || null})}
                >
                  <option value="">Sin asignar</option>
                  {conductores.filter(c => c.estado === 'activo').map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} {c.apellidos}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Vehículo</label>
                <select
                  value={formData.vehiculo_id}
                  onChange={(e) => setFormData({...formData, vehiculo_id: parseInt(e.target.value) || null})}
                >
                  <option value="">Sin asignar</option>
                  {vehiculos.filter(v => v.estado === 'disponible').map(v => (
                    <option key={v.id} value={v.id}>{v.matricula} - {v.marca} {v.modelo}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Detalles del Trayecto</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Origen *</label>
                <input
                  type="text"
                  value={formData.origen}
                  onChange={(e) => setFormData({...formData, origen: e.target.value})}
                  placeholder="Dirección de origen"
                  required
                />
              </div>
              <div className="form-group">
                <label>Destino *</label>
                <input
                  type="text"
                  value={formData.destino}
                  onChange={(e) => setFormData({...formData, destino: e.target.value})}
                  placeholder="Dirección de destino"
                  required
                />
              </div>
              <div className="form-group">
                <label>Fecha Inicio *</label>
                <input
                  type="date"
                  value={formData.fecha_inicio}
                  onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Hora Inicio *</label>
                <input
                  type="time"
                  value={formData.hora_inicio}
                  onChange={(e) => setFormData({...formData, hora_inicio: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Fecha Fin</label>
                <input
                  type="date"
                  value={formData.fecha_fin}
                  onChange={(e) => setFormData({...formData, fecha_fin: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Hora Fin</label>
                <input
                  type="time"
                  value={formData.hora_fin}
                  onChange={(e) => setFormData({...formData, hora_fin: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Nº Pasajeros</label>
                <input
                  type="number"
                  min="1"
                  value={formData.numero_pasajeros}
                  onChange={(e) => setFormData({...formData, numero_pasajeros: parseInt(e.target.value)})}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Economía</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Precio (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.precio}
                  onChange={(e) => setFormData({...formData, precio: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Gasto Combustible (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.gastos_combustible}
                  onChange={(e) => setFormData({...formData, gastos_combustible: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Gasto Peajes (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.gastos_peaje}
                  onChange={(e) => setFormData({...formData, gastos_peaje: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Otros Gastos (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.gastos_otros}
                  onChange={(e) => setFormData({...formData, gastos_otros: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Notas</h3>
            <div className="form-group full-width">
              <textarea
                value={formData.notas}
                onChange={(e) => setFormData({...formData, notas: e.target.value})}
                rows="3"
                placeholder="Notas adicionales..."
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingServicio ? 'Actualizar' : 'Crear'} Servicio
            </button>
          </div>
        </form>
      )}

      <div className="search-box">
        <Search size={20} />
        <input
          type="text"
          placeholder="Buscar servicio..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="servicios-grid">
        {filteredServicios.map((servicio) => {
          const rentabilidad = calcularRentabilidad(servicio);
          return (
            <div key={servicio.id} className={`servicio-card ${servicio.estado}`}>
              <div className="servicio-header">
                <div className="servicio-tipo">{servicio.tipo_servicio}</div>
                <span className={`estado-badge ${servicio.estado}`}>{servicio.estado}</span>
              </div>
              
              <div className="servicio-cliente">
                <User size={16} />
                <strong>{getClienteNombre(servicio.cliente_id)}</strong>
              </div>

              <div className="servicio-trayecto">
                <div className="trayecto-item">
                  <MapPin size={16} className="origin" />
                  <span>{servicio.origen}</span>
                </div>
                <div className="trayecto-item">
                  <MapPin size={16} className="destiny" />
                  <span>{servicio.destino}</span>
                </div>
              </div>

              <div className="servicio-fecha">
                <Calendar size={14} />
                <span>{servicio.fecha_inicio} {servicio.hora_inicio}</span>
              </div>

              <div className="servicio-asignaciones">
                <div className="asignacion">
                  <Bus size={14} />
                  <span>{getVehiculoMatricula(servicio.vehiculo_id)}</span>
                </div>
                <div className="asignacion">
                  <User size={14} />
                  <span>{getConductorNombre(servicio.conductor_id)}</span>
                </div>
              </div>

              <div className="servicio-economia">
                <div className="economia-item precio">
                  <span>Precio: {parseFloat(servicio.precio).toFixed(2)} €</span>
                </div>
                <div className={`economia-item rentabilidad ${rentabilidad >= 0 ? 'positive' : 'negative'}`}>
                  <span>Beneficio: {rentabilidad.toFixed(2)} €</span>
                </div>
              </div>

              <div className="servicio-actions">
                <button 
                  className="btn-icon btn-invoice"
                  onClick={() => handleCrearFactura(servicio)}
                  title="Crear Factura"
                >
                  <FileText size={18} />
                </button>
                <button 
                  className="btn-icon btn-edit"
                  onClick={() => handleEdit(servicio)}
                  title="Editar"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  className="btn-icon btn-delete"
                  onClick={() => handleDelete(servicio.id)}
                  title="Eliminar"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredServicios.length === 0 && (
        <div className="empty-state">
          <p>No se encontraron servicios</p>
        </div>
      )}
    </div>
  );
};

export default Servicios;