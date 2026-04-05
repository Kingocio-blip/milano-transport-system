import { useEffect, useState } from 'react';
import { api } from '../store/authStore';
import { Plus, Search, Edit2, Trash2, FileText, Euro, Calendar } from 'lucide-react';

const estadoColors = { pendiente: '#f59e0b', pagada: '#10b981', vencida: '#ef4444', anulada: '#6b7280' };

export default function Facturas() {
  const [facturas, setFacturas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ cliente_id: '', fecha_emision: '', fecha_vencimiento: '', subtotal: '', descuento: 0, impuesto_porcentaje: 21 });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [facRes, cliRes] = await Promise.all([api.get('/facturas'), api.get('/clientes')]);
      setFacturas(facRes.data); setClientes(cliRes.data);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const calcularTotal = () => {
    const subtotal = parseFloat(formData.subtotal) || 0;
    const descuento = parseFloat(formData.descuento) || 0;
    const impuestos = (subtotal - descuento) * (formData.impuesto_porcentaje / 100);
    return subtotal - descuento + impuestos;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...formData, total: calcularTotal() };
    try {
      if (editingId) await api.put(`/facturas/${editingId}`, data);
      else await api.post('/facturas', data);
      setShowForm(false); setEditingId(null);
      setFormData({ cliente_id: '', fecha_emision: '', fecha_vencimiento: '', subtotal: '', descuento: 0, impuesto_porcentaje: 21 });
      fetchData();
    } catch (error) { alert('Error al guardar'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar factura?')) return;
    try { await api.delete(`/facturas/${id}`); fetchData(); }
    catch (error) { alert('Error al eliminar'); }
  };

  const handleEdit = (f) => { setFormData({...f, fecha_emision: f.fecha_emision?.slice(0,10), fecha_vencimiento: f.fecha_vencimiento?.slice(0,10)}); setEditingId(f.id); setShowForm(true); };
  const facturasFiltradas = facturas.filter(f => f.numero.toLowerCase().includes(searchTerm.toLowerCase()));
  const getClienteNombre = (id) => clientes.find(c => c.id === id)?.nombre || 'N/A';
  const isVencida = (f) => f.estado === 'pendiente' && new Date(f.fecha_vencimiento) < new Date();

  if (loading) return <div className="loading-container"><div className="loading-spinner"></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Facturas</h1><p className="page-subtitle">Gestion de facturacion</p></div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingId(null); }}><Plus size={20} /> Nueva Factura</button>
      </div>

      {showForm && (
        <div className="form-container" style={{ marginBottom: '24px' }}>
          <h3>{editingId ? 'Editar Factura' : 'Nueva Factura'}</h3>
          <form onSubmit={handleSubmit} className="form-grid">
            <select className="form-select" value={formData.cliente_id} onChange={(e) => setFormData({...formData, cliente_id: e.target.value})} required>
              <option value="">Seleccionar cliente</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <input className="form-input" type="date" value={formData.fecha_emision} onChange={(e) => setFormData({...formData, fecha_emision: e.target.value})} required />
            <input className="form-input" type="date" value={formData.fecha_vencimiento} onChange={(e) => setFormData({...formData, fecha_vencimiento: e.target.value})} required />
            <input className="form-input" placeholder="Subtotal" type="number" value={formData.subtotal} onChange={(e) => setFormData({...formData, subtotal: e.target.value})} required />
            <input className="form-input" placeholder="Descuento" type="number" value={formData.descuento} onChange={(e) => setFormData({...formData, descuento: e.target.value})} />
            <div className="form-group"><label>Total: €{calcularTotal().toFixed(2)}</label></div>
            <div className="form-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Guardar</button></div>
          </form>
        </div>
      )}

      <div className="filters-bar"><div className="search-box"><Search size={20} /><input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div></div>

      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Numero</th><th>Cliente</th><th>Emision</th><th>Vencimiento</th><th>Estado</th><th>Total</th><th>Acciones</th></tr></thead>
          <tbody>
            {facturasFiltradas.map((f) => (
              <tr key={f.id} className={isVencida(f) ? 'vencida' : ''}>
                <td><span className="invoice-number">{f.numero}</span></td>
                <td>{getClienteNombre(f.cliente_id)}</td>
                <td><div className="date-info"><Calendar size={14} />{f.fecha_emision}</div></td>
                <td><div className={`date-info ${isVencida(f) ? 'vencida' : ''}`}><Calendar size={14} />{f.fecha_vencimiento}</div></td>
                <td><span className="status-badge" style={{ background: estadoColors[f.estado] + '20', color: estadoColors[f.estado] }}>{f.estado}</span></td>
                <td><span className="price total"><Euro size={14} />{f.total?.toFixed(2)}</span></td>
                <td><div className="actions"><button className="btn-icon" onClick={() => handleEdit(f)}><Edit2 size={18} /></button><button className="btn-icon btn-danger" onClick={() => handleDelete(f.id)}><Trash2 size={18} /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}