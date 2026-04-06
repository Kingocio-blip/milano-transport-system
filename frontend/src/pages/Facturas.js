import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { Plus, Search, Edit2, Trash2, Calendar, Download } from 'lucide-react';
import './Facturas.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const Facturas = () => {
  const { token } = useAuthStore();
  const [facturas, setFacturas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingFactura, setEditingFactura] = useState(null);
  
  const [formData, setFormData] = useState({
    cliente_id: '',
    servicio_id: '',
    fecha_emision: new Date().toISOString().split('T')[0],
    fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    concepto: '',
    importe_base: '',
    tipo_iva: 21,
    estado: 'pendiente'
  });

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [facRes, cliRes, servRes] = await Promise.all([
        fetch(`${API_URL}/facturas/`, { headers }),
        fetch(`${API_URL}/clientes/`, { headers }),
        fetch(`${API_URL}/servicios/`, { headers })
      ]);

      if (!facRes.ok || !cliRes.ok || !servRes.ok) {
        throw new Error('Error al cargar datos');
      }

      const [facturasData, clientesData, serviciosData] = await Promise.all([
        facRes.json(),
        cliRes.json(),
        servRes.json()
      ]);

      setFacturas(facturasData);
      setClientes(clientesData);
      setServicios(serviciosData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const calcularTotal = () => {
    const base = parseFloat(formData.importe_base) || 0;
    const iva = base * (parseFloat(formData.tipo_iva) || 0) / 100;
    return base + iva;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingFactura 
        ? `${API_URL}/facturas/${editingFactura.id}`
        : `${API_URL}/facturas/`;
      
      const method = editingFactura ? 'PUT' : 'POST';
      
      const dataToSend = {
        ...formData,
        cliente_id: parseInt(formData.cliente_id),
        servicio_id: formData.servicio_id ? parseInt(formData.servicio_id) : null,
        importe_base: parseFloat(formData.importe_base),
        tipo_iva: parseInt(formData.tipo_iva),
        importe_iva: (parseFloat(formData.importe_base) * parseInt(formData.tipo_iva) / 100),
        importe_total: calcularTotal()
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
        throw new Error(errorData.detail || 'Error al guardar factura');
      }

      setShowForm(false);
      setEditingFactura(null);
      resetForm();
      cargarDatos();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta factura?')) return;
    try {
      const response = await fetch(`${API_URL}/facturas/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Error al eliminar');
      cargarDatos();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (factura) => {
    setEditingFactura(factura);
    setFormData({
      cliente_id: factura.cliente_id || '',
      servicio_id: factura.servicio_id || '',
      fecha_emision: factura.fecha_emision || '',
      fecha_vencimiento: factura.fecha_vencimiento || '',
      concepto: factura.concepto || '',
      importe_base: factura.importe_base || '',
      tipo_iva: factura.tipo_iva || 21,
      estado: factura.estado || 'pendiente'
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      servicio_id: '',
      fecha_emision: new Date().toISOString().split('T')[0],
      fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      concepto: '',
      importe_base: '',
      tipo_iva: 21,
      estado: 'pendiente'
    });
  };

  const getClienteNombre = (id) => {
    const c = clientes.find(c => c.id === id);
    return c ? `${c.nombre} ${c.apellidos}` : 'N/A';
  };

  const filteredFacturas = facturas.filter(f => 
    f.concepto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getClienteNombre(f.cliente_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.id.toString().includes(searchTerm)
  );

  if (loading) return <div className="loading">Cargando facturas...</div>;

  return (
    <div className="facturas-container">
      <div className="page-header">
        <h1>Gestión de Facturas</h1>
        <button className="btn-primary" onClick={() => {
          setShowForm(!showForm);
          if (showForm) {
            setEditingFactura(null);
            resetForm();
          }
        }}>
          <Plus size={20} />
          {showForm ? 'Cancelar' : 'Nueva Factura'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="factura-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Cliente *</label>
              <select
                value={formData.cliente_id}
                onChange={(e) => setFormData({...formData, cliente_id: e.target.value})}
                required
              >
                <option value="">Seleccionar cliente</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} {c.apellidos} - {c.dni}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Servicio (opcional)</label>
              <select
                value={formData.servicio_id}
                onChange={(e) => setFormData({...formData, servicio_id: e.target.value})}
              >
                <option value="">Sin servicio asociado</option>
                {servicios.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.fecha_inicio} - {s.origen.substring(0, 20)}...
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Fecha Emisión *</label>
              <input
                type="date"
                value={formData.fecha_emision}
                onChange={(e) => setFormData({...formData, fecha_emision: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Fecha Vencimiento *</label>
              <input
                type="date"
                value={formData.fecha_vencimiento}
                onChange={(e) => setFormData({...formData, fecha_vencimiento: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Importe Base (€) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.importe_base}
                onChange={(e) => setFormData({...formData, importe_base: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>IVA %</label>
              <select
                value={formData.tipo_iva}
                onChange={(e) => setFormData({...formData, tipo_iva: parseInt(e.target.value)})}
              >
                <option value={0}>0%</option>
                <option value={4}>4%</option>
                <option value={10}>10%</option>
                <option value={21}>21%</option>
              </select>
            </div>
            <div className="form-group">
              <label>Total con IVA</label>
              <div className="total-display">{calcularTotal().toFixed(2)} €</div>
            </div>
            <div className="form-group full-width">
              <label>Concepto</label>
              <input
                type="text"
                value={formData.concepto}
                onChange={(e) => setFormData({...formData, concepto: e.target.value})}
                placeholder="Descripción del servicio..."
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingFactura ? 'Actualizar' : 'Crear'} Factura
            </button>
          </div>
        </form>
      )}

      <div className="search-box">
        <Search size={20} />
        <input
          type="text"
          placeholder="Buscar factura..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="facturas-grid">
        {filteredFacturas.map((factura) => (
          <div key={factura.id} className={`factura-card ${factura.estado}`}>
            <div className="factura-header">
              <div className="factura-numero">#{factura.id.toString().padStart(4, '0')}</div>
              <span className={`estado-badge ${factura.estado}`}>{factura.estado}</span>
            </div>
            
            <div className="factura-cliente">
              <strong>{getClienteNombre(factura.cliente_id)}</strong>
            </div>

            {factura.concepto && (
              <div className="factura-concepto">{factura.concepto}</div>
            )}

            <div className="factura-fechas">
              <div className="fecha-item">
                <Calendar size={14} />
                <span>Emisión: {factura.fecha_emision}</span>
              </div>
              <div className="fecha-item">
                <Calendar size={14} />
                <span>Vence: {factura.fecha_vencimiento}</span>
              </div>
            </div>

            <div className="factura-importes">
              <div className="importe-item">
                <span>Base:</span>
                <strong>{parseFloat(factura.importe_base).toFixed(2)} €</strong>
              </div>
              <div className="importe-item">
                <span>IVA ({factura.tipo_iva}%):</span>
                <span>{parseFloat(factura.importe_iva).toFixed(2)} €</span>
              </div>
              <div className="importe-item total">
                <span>Total:</span>
                <strong>{parseFloat(factura.importe_total).toFixed(2)} €</strong>
              </div>
            </div>

            <div className="factura-actions">
              <button 
                className="btn-icon btn-download"
                title="Descargar PDF"
              >
                <Download size={18} />
              </button>
              <button 
                className="btn-icon btn-edit"
                onClick={() => handleEdit(factura)}
                title="Editar"
              >
                <Edit2 size={18} />
              </button>
              <button 
                className="btn-icon btn-delete"
                onClick={() => handleDelete(factura.id)}
                title="Eliminar"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredFacturas.length === 0 && (
        <div className="empty-state">
          <p>No se encontraron facturas</p>
        </div>
      )}
    </div>
  );
};

export default Facturas;