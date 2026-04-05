import { useEffect, useState } from 'react';
import { api, useAuthStore } from '../store/authStore';
import { ClipboardList, MapPin, Calendar, Euro, CheckCircle, Clock } from 'lucide-react';

export default function PanelConductor() {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchServicios();
  }, []);

  const fetchServicios = async () => {
    try {
      const response = await api.get('/servicios');
      setServicios(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const completarServicio = async (id) => {
    if (!window.confirm('¿Marcar este servicio como completado?')) return;
    try {
      await api.put(`/servicios/${id}`, { 
        estado: 'completado',
        fecha_llegada_real: new Date().toISOString()
      });
      fetchServicios();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.detail || error.message));
    }
  };

  const ficharEntrada = async () => {
    try {
      await api.post('/fichajes', {
        conductor_id: user.conductor_id,
        tipo: 'entrada'
      });
      alert('Entrada registrada correctamente');
    } catch (error) {
      alert('Error al fichar: ' + error.message);
    }
  };

  if (loading) return <div className="loading-container"><div className="loading-spinner"></div></div>;

  const pendientes = servicios.filter(s => s.estado === 'pendiente');
  const completados = servicios.filter(s => s.estado === 'completado' || s.estado === 'facturado');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mis Servicios</h1>
          <p className="page-subtitle">Bienvenido, {user?.nombre}</p>
        </div>
        <button className="btn btn-primary" onClick={ficharEntrada}>
          <Clock size={20} /> Fichar Entrada
        </button>
      </div>

      <div className="stats-grid" style={{marginBottom: '24px'}}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
            <ClipboardList size={28} />
          </div>
          <div>
            <p className="stat-label">Pendientes</p>
            <p className="stat-value">{pendientes.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#10b98120', color: '#10b981' }}>
            <CheckCircle size={28} />
          </div>
          <div>
            <p className="stat-label">Completados</p>
            <p className="stat-value">{completados.length}</p>
          </div>
        </div>
      </div>

      <h3 style={{marginBottom: '16px'}}>Servicios Pendientes</h3>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Ruta</th>
              <th>Fecha</th>
              <th>Precio</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pendientes.map((s) => (
              <tr key={s.id}>
                <td><span className="service-code">{s.codigo}</span></td>
                <td>
                  <div className="route-info">
                    <p><MapPin size={14} />{s.origen}</p>
                    <p><MapPin size={14} />{s.destino}</p>
                  </div>
                </td>
                <td>
                  <div className="date-info">
                    <Calendar size={14} />
                    {new Date(s.fecha_salida).toLocaleString()}
                  </div>
                </td>
                <td>
                  <span className="price"><Euro size={14} />{s.precio_final?.toFixed(2) || '0.00'}</span>
                </td>
                <td>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => completarServicio(s.id)}
                    style={{padding: '6px 12px', fontSize: '13px'}}
                  >
                    <CheckCircle size={16} /> Completar
                  </button>
                </td>
              </tr>
            ))}
            {pendientes.length === 0 && (
              <tr>
                <td colSpan="5" style={{textAlign: 'center', padding: '20px', color: '#6b7280'}}>
                  No tienes servicios pendientes
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h3 style={{margin: '24px 0 16px'}}>Historial</h3>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Ruta</th>
              <th>Fecha</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {completados.slice(0, 5).map((s) => (
              <tr key={s.id}>
                <td><span className="service-code">{s.codigo}</span></td>
                <td>
                  <div className="route-info">
                    <p><MapPin size={14} />{s.origen} → {s.destino}</p>
                  </div>
                </td>
                <td>{new Date(s.fecha_salida).toLocaleDateString()}</td>
                <td>
                  <span className="status-badge" style={{ 
                    background: s.estado === 'facturado' ? '#8b5cf620' : '#10b98120',
                    color: s.estado === 'facturado' ? '#8b5cf6' : '#10b981'
                  }}>
                    {s.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
