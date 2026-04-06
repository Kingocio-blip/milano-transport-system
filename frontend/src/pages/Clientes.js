import { useEffect, useState } from 'react';
import { api } from '../store/authStore';
import { Plus, Search, Edit2, Trash2, Mail, Phone, MapPin, User, Building2 } from 'lucide-react';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    nombre: '', 
    apellidos: '',
    email: '', 
    telefono: '', 
    direccion: '', 
    dni: '',
    tipo_cliente: 'particular'
  });

  useEffect(() => { fetchClientes(); }, []);

  const fetchClientes = async () => {
    try {
      const data = await api.get('/clientes/');
      setClientes(data);
    } catch (error) { 
      console.error('Error:', error); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/clientes/${editingId}`, formData);
      } else {
        await api.post('/clientes/', formData);
      }
      setShowForm(false); 
      setEditingId(null);
      setFormData({ 
        nombre: '', 
        apellidos: '',
        email: '', 
        telefono: '', 
        direccion: '', 
        dni: '',
        tipo_cliente: 'particular'
      });
      fetchClientes();
    } catch (error) { 
      alert('Error al guardar: ' + error.message); 
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar cliente?')) return;
    try { 
      await api.delete(`/clientes/${id}`); 
      fetchClientes(); 
    } catch (error) { 
      alert('Error al eliminar: ' + error.message); 
    }
  };

  const handleEdit = (cliente) => { 
    setFormData({
      nombre: cliente.nombre || '',
      apellidos: cliente.apellidos || '',
      email: cliente.email || '',
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      dni: cliente.dni || '',
      tipo_cliente: cliente.tipo_cliente || 'particular'
    }); 
    setEditingId(cliente.id); 
    setShowForm(true); 
  };

  const clientesFiltrados = clientes.filter(c => 
    `${c.nombre} ${c.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loading-container"><div className="loading-spinner"></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">Gestion de clientes</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingId(null); }}>
          <Plus size={20} /> Nuevo Cliente
        </button>
      </div>

      {showForm && (
        <div className="form-container" style={{ marginBottom: '24px' }}>
          <h3>{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
          <form onSubmit={handleSubmit} className="form-grid">
            <input 
              className="form-input" 
              placeholder="Nombre *" 
              value={formData.nombre} 
              onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
              required 
            />
            <input 
              className="form-input" 
              placeholder="Apellidos *" 
              value={formData.apellidos} 
              onChange={(e) => setFormData({...formData, apellidos: e.target.value})} 
              required 
            />
            <select 
              className="form-select" 
              value={formData.tipo_cliente} 
              onChange={(e) => setFormData({...formData, tipo_cliente: e.target.value})}
            >
              <option value="particular">Particular</option>
              <option value="empresa">Empresa</option>
              <option value="autonomo">Autonomo</option>
            </select>
            <input 
              className="form-input" 
              placeholder="DNI/CIF" 
              value={formData.dni} 
              onChange={(e) => setFormData({...formData, dni: e.target.value})} 
            />
            <input 
              className="form-input" 
              placeholder="Email" 
              type="email" 
              value={formData.email} 
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
            />
            <input 
              className="form-input" 
              placeholder="Telefono" 
              value={formData.telefono} 
              onChange={(e) => setFormData({...formData, telefono: e.target.value})} 
            />
            <input 
              className="form-input" 
              placeholder="Direccion" 
              value={formData.direccion} 
              onChange={(e) => setFormData({...formData, direccion: e.target.value})} 
            />
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
            placeholder="Buscar clientes..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Contacto</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map((cliente) => (
              <tr key={cliente.id}>
                <td>
                  <div className="client-info">
                    <div className="client-avatar">
                      {cliente.tipo_cliente === 'empresa' ? <Building2 size={20} /> : <User size={20} />}
                    </div>
                    <div>
                      <p className="client-name">{cliente.nombre} {cliente.apellidos}</p>
                      <p className="client-nif">{cliente.dni || 'Sin DNI'}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`badge badge-${cliente.tipo_cliente}`}>
                    {cliente.tipo_cliente === 'particular' ? 'Particular' : 
                     cliente.tipo_cliente === 'empresa' ? 'Empresa' : 'Autonomo'}
                  </span>
                </td>
                <td>
                  <div className="contact-info">
                    {cliente.email && <p><Mail size={14} /> {cliente.email}</p>}
                    {cliente.telefono && <p><Phone size={14} /> {cliente.telefono}</p>}
                  </div>
                </td>
                <td>
                  <div className="actions">
                    <button className="btn-icon" onClick={() => handleEdit(cliente)}>
                      <Edit2 size={18} />
                    </button>
                    <button className="btn-icon btn-danger" onClick={() => handleDelete(cliente.id)}>
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