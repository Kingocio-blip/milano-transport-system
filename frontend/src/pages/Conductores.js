import { useEffect, useState } from 'react';
import { api } from '../store/authStore';
import { Plus, Search, Edit2, Trash2, Phone, Mail, CreditCard, User, Key, Copy, Check } from 'lucide-react';

export default function Conductores() {
  const [conductores, setConductores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({ 
    nombre: '', 
    apellidos: '', 
    email: '', 
    telefono: '', 
    dni: '', 
    licencia_conducir: '',
    fecha_contratacion: '',
    direccion: ''
  });

  useEffect(() => { fetchConductores(); }, []);

  const fetchConductores = async () => {
    try {
      const data = await api.get('/conductores/');
      setConductores(data);
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
        await api.put(`/conductores/${editingId}`, formData);
        setShowForm(false); 
        setEditingId(null);
        setFormData({ 
          nombre: '', 
          apellidos: '', 
          email: '', 
          telefono: '', 
          dni: '', 
          licencia_conducir: '',
          fecha_contratacion: '',
          direccion: ''
        });
        fetchConductores();
      } else {
        // Crear nuevo conductor - la respuesta incluye credenciales
        const response = await api.post('/conductores/', formData);
        
        if (response && response.credenciales) {
          setCredentials({
            nombre: response.conductor?.nombre + ' ' + response.conductor?.apellidos,
            username: response.credenciales.username,
            password: response.credenciales.password
          });
          setShowCredentials(true);
        }
        
        setShowForm(false);
        setFormData({ 
          nombre: '', 
          apellidos: '', 
          email: '', 
          telefono: '', 
          dni: '', 
          licencia_conducir: '',
          fecha_contratacion: '',
          direccion: ''
        });
        fetchConductores();
      }
    } catch (error) { 
      alert('Error al guardar: ' + error.message); 
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar conductor?')) return;
    try { 
      await api.delete(`/conductores/${id}`); 
      fetchConductores(); 
    } catch (error) { 
      alert('Error al eliminar: ' + error.message); 
    }
  };

  const handleEdit = (c) => { 
    setFormData({
      nombre: c.nombre || '',
      apellidos: c.apellidos || '',
      email: c.email || '',
      telefono: c.telefono || '',
      dni: c.dni || '',
      licencia_conducir: c.licencia_conducir || '',
      fecha_contratacion: c.fecha_contratacion || '',
      direccion: c.direccion || ''
    }); 
    setEditingId(c.id); 
    setShowForm(true); 
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const conductoresFiltrados = conductores.filter(c => 
    `${c.nombre} ${c.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loading-container"><div className="loading-spinner"></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Conductores</h1>
          <p className="page-subtitle">Gestion de personal</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingId(null); }}>
          <Plus size={20} /> Nuevo Conductor
        </button>
      </div>

      {/* Modal de Credenciales */}
      {showCredentials && credentials && (
        <div className="form-container" style={{ marginBottom: '24px', background: '#ecfdf5', border: '2px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <Key size={24} color="#10b981" />
            <h3 style={{ margin: 0, color: '#065f46' }}>Conductor Creado - Credenciales de Acceso</h3>
          </div>
          
          <p style={{ color: '#374151', marginBottom: '15px' }}>
            El conductor <strong>{credentials.nombre}</strong> ha sido creado exitosamente. 
            Guarda estas credenciales para enviárselas:
          </p>

          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Usuario:</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <code style={{ 
                  background: '#f3f4f6', 
                  padding: '8px 12px', 
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#111827',
                  flex: 1
                }}>
                  {credentials.username}
                </code>
                <button 
                  onClick={() => copyToClipboard(credentials.username)}
                  className="btn-icon"
                  title="Copiar usuario"
                >
                  {copied ? <Check size={18} color="#10b981" /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Contraseña:</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <code style={{ 
                  background: '#f3f4f6', 
                  padding: '8px 12px', 
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#dc2626',
                  flex: 1
                }}>
                  {credentials.password}
                </code>
                <button 
                  onClick={() => copyToClipboard(credentials.password)}
                  className="btn-icon"
                  title="Copiar contraseña"
                >
                  {copied ? <Check size={18} color="#10b981" /> : <Copy size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => copyToClipboard(`Usuario: ${credentials.username}\nContraseña: ${credentials.password}`)}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              <Copy size={16} style={{ marginRight: '8px' }} />
              Copiar Todo
            </button>
            <button 
              onClick={() => setShowCredentials(false)}
              className="btn btn-secondary"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="form-container" style={{ marginBottom: '24px' }}>
          <h3>{editingId ? 'Editar Conductor' : 'Nuevo Conductor'}</h3>
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
              placeholder="DNI" 
              value={formData.dni} 
              onChange={(e) => setFormData({...formData, dni: e.target.value})} 
            />
            <input 
              className="form-input" 
              placeholder="Licencia de Conducir" 
              value={formData.licencia_conducir} 
              onChange={(e) => setFormData({...formData, licencia_conducir: e.target.value})} 
            />
            <input 
              className="form-input" 
              placeholder="Fecha Contratacion (YYYY-MM-DD)" 
              type="date"
              value={formData.fecha_contratacion} 
              onChange={(e) => setFormData({...formData, fecha_contratacion: e.target.value})} 
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
            placeholder="Buscar conductores..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <div className="drivers-grid">
        {conductoresFiltrados.map((c) => (
          <div key={c.id} className="driver-card">
            <div className="driver-header">
              <div className="driver-avatar">{c.nombre?.[0]}{c.apellidos?.[0]}</div>
            </div>
            <div className="driver-info">
              <p className="driver-name">{c.nombre} {c.apellidos}</p>
              <p className="driver-dni">{c.dni || 'Sin DNI'}</p>
            </div>
            <div className="driver-details">
              {c.email && <div className="detail-item"><Mail size={16} /><span>{c.email}</span></div>}
              {c.telefono && <div className="detail-item"><Phone size={16} /><span>{c.telefono}</span></div>}
              {c.licencia_conducir && <div className="detail-item"><CreditCard size={16} /><span>{c.licencia_conducir}</span></div>}
            </div>
            <div className="driver-actions">
              <button className="btn-icon" onClick={() => handleEdit(c)}><Edit2 size={18} /></button>
              <button className="btn-icon btn-danger" onClick={() => handleDelete(c.id)}><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}