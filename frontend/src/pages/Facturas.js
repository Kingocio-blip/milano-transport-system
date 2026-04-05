import { useEffect, useState } from 'react';
import { api } from '../store/authStore';
import { Plus, Search, Edit2, Trash2, Euro, Calendar, CheckCircle, CreditCard, FileText, Download } from 'lucide-react';

const estadoColors = { 
  pendiente: '#f59e0b', 
  pagada: '#10b981', 
  vencida: '#ef4444', 
  anulada: '#6b7280' 
};

export default function Facturas() {
  const [facturas, setFacturas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    cliente_id: '', 
    fecha_emision: '', 
    fecha_vencimiento: '', 
    subtotal: '',
    descuento: '0',
    impuesto_porcentaje: '10',
    metodo_pago: 'transferencia',
    forma_pago: 'Transferencia bancaria - 30 días',
    iban: '',
    notas_cliente: '',
    terminos: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [facRes, cliRes] = await Promise.all([
        api.get('/facturas'), 
        api.get('/clientes')
      ]);
      setFacturas(facRes.data); 
      setClientes(cliRes.data);
    } catch (error) { 
      console.error('Error:', error); 
    }
    finally { setLoading(false); }
  };

  const calcularTotal = () => {
    const subtotal = parseFloat(formData.subtotal) || 0;
    const descuento = parseFloat(formData.descuento) || 0;
    const impuesto = parseFloat(formData.impuesto_porcentaje) || 10;
    const base = subtotal - descuento;
    const impuestos = base * (impuesto / 100);
    return {
      base: base.toFixed(2),
      impuestos: impuestos.toFixed(2),
      total: (base + impuestos).toFixed(2)
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/facturas/${editingId}`, formData);
      } else {
        await api.post('/facturas', formData);
      }
      setShowForm(false); 
      setEditingId(null);
      resetForm();
      fetchData();
    } catch (error) { 
      alert('Error al guardar: ' + (error.response?.data?.detail || error.message)); 
    }
  };

  const resetForm = () => {
    setFormData({ 
      cliente_id: '', fecha_emision: '', fecha_vencimiento: '', 
      subtotal: '', descuento: '0', impuesto_porcentaje: '10',
      metodo_pago: 'transferencia', forma_pago: 'Transferencia bancaria - 30 días',
      iban: '', notas_cliente: '', terminos: ''
    });
  };

  const marcarPagada = async (factura) => {
    if (!window.confirm(`¿Marcar factura ${factura.numero} como PAGADA?`)) return;
    try {
      await api.put(`/facturas/${factura.id}`, { 
        estado: 'pagada',
        metodo_pago: 'transferencia'
      });
      fetchData();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar factura?')) return;
    try { 
      await api.delete(`/facturas/${id}`); 
      fetchData(); 
    }
    catch (error) { alert('Error al eliminar'); }
  };

  const handleEdit = (f) => { 
    setFormData({
      ...f, 
      fecha_emision: f.fecha_emision?.slice(0,10),
      fecha_vencimiento: f.fecha_vencimiento?.slice(0,10),
      subtotal: f.subtotal.toString(),
      descuento: f.descuento.toString(),
      impuesto_porcentaje: f.impuesto_porcentaje.toString()
    }); 
    setEditingId(f.id); 
    setShowForm(true); 
  };

  const getClienteNombre = (id) => clientes.find(c => c.id === id)?.nombre || 'N/A';
  
  const isVencida = (f) => f.estado === 'pendiente' && new Date(f.fecha_vencimiento) < new Date();
  
  const facturasFiltradas = facturas.filter(f => 
    f.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getClienteNombre(f.cliente_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPendiente = facturas
    .filter(f => f.estado === 'pendiente')
    .reduce((sum, f) => sum + f.total, 0);

  if (loading) return <div className="loading-container"><div className="loading-spinner"></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Facturas</h1>
          <p className="page-subtitle">Gestión de facturación</p>
          <p style={{color: '#f59e0b', fontWeight: 600, marginTop: '5px'}}>
            <Euro size={16} style={{verticalAlign: 'middle'}} /> 
            Total pendiente: €{totalPendiente.toFixed(2)}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}>
          <Plus size={20} /> Nueva Factura
        </button>
      </div>

      {showForm && (
        <div className="form-container" style={{ marginBottom: '24px' }}>
          <h3>{editingId ? 'Editar Factura' : 'Nueva Factura'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <select className="form-select" value={formData.cliente_id} onChange={(e) => setFormData({...formData, cliente_id: e.target.value})} required>
                <option value="">Seleccionar cliente *</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              
              <input className="form-input" type="date" value={formData.fecha_emision} onChange={(e) => setFormData({...formData, fecha_emision: e.target.value})} required />
              <input className="form-input" type="date" value={formData.fecha_vencimiento} onChange={(e) => setFormData({...formData, fecha_vencimiento: e.target.value})} required />
              <input className="form-input" placeholder="Subtotal (€) *" type="number" value={formData.subtotal} onChange={(e) => setFormData({...formData, subtotal: e.target.value})} required />
              <input className="form-input" placeholder="Descuento (€)" type="number" value={formData.descuento} onChange={(e) => setFormData({...formData, descuento: e.target.value})} />
              
              <select className="form-select" value={formData.impuesto_porcentaje} onChange={(e) => setFormData({...formData, impuesto_porcentaje: e.target.value})}>
                <option value="10">IVA 10% (Transporte)</option>
                <option value="21">IVA 21% (General)</option>
                <option value="0">Exento (0%)</option>
              </select>
              
              <select className="form-select" value={formData.metodo_pago} onChange={(e) => setFormData({...formData, metodo_pago: e.target.value})}>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="efectivo">Efectivo</option>
                <option value="bizum">Bizum</option>
              </select>
              
              <input className="form-input" placeholder="Forma de pago (ej: Transferencia - 30 días)" value={formData.forma_pago} onChange={(e) => setFormData({...formData, forma_pago: e.target.value})} />
              <input className="form-input" placeholder="IBAN para pago" value={formData.iban} onChange={(e) => setFormData({...formData, iban: e.target.value})} />
            </div>
            
            <div style={{marginTop: '15px', padding: '15px', background: '#f3f4f6', borderRadius: '8px'}}>
              <h4>Resumen</h4>
              <p>Base imponible: €{calcularTotal().base}</p>
              <p>Impuestos ({formData.impuesto_porcentaje}%): €{calcularTotal().impuestos}</p>
              <p style={{fontSize: '18px', fontWeight: 'bold'}}>TOTAL: €{calcularTotal().total}</p>
            </div>
            
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
          <input type="text" placeholder="Buscar facturas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Cliente</th>
              <th>Fechas</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {facturasFiltradas.map((f) => (
              <tr key={f.id} className={isVencida(f) ? 'vencida' : ''}>
                <td><span className="invoice-number">{f.numero}</span></td>
                <td>{getClienteNombre(f.cliente_id)}</td>
                <td>
                  <div className="date-info">
                    <Calendar size={14} /> Emisión: {f.fecha_emision}
                  </div>
                  <div className={`date-info ${isVencida(f) ? 'vencida' : ''}`}>
                    <Calendar size={14} /> Vence: {f.fecha_vencimiento}
                  </div>
                </td>
                <td>
                  <span className="price total"><Euro size={14} />{f.total?.toFixed(2)}</span>
                </td>
                <td>
                  <span className="status-badge" style={{ background: estadoColors[f.estado] + '20', color: estadoColors[f.estado] }}>
                    {f.estado === 'pagada' && <CheckCircle size={14} style={{marginRight: '4px'}} />}
                    {f.estado}
                  </span>
                </td>
                <td>
                  <div className="actions">
                    {f.estado === 'pendiente' && (
                      <button className="btn-icon" title="Marcar como pagada" onClick={() => marcarPagada(f)} style={{background: '#d1fae5', color: '#10b981'}}>
                        <CheckCircle size={18} />
                      </button>
                    )}
                    <button className="btn-icon" title="Ver detalles" style={{background: '#dbeafe', color: '#3b82f6'}}>
                      <FileText size={18} />
                    </button>
                    <button className="btn-icon" onClick={() => handleEdit(f)}>
                      <Edit2 size={18} />
                    </button>
                    <button className="btn-icon btn-danger" onClick={() => handleDelete(f.id)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}