import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store';
import { Calendar, MapPin, CheckCircle, User, Bus } from 'lucide-react';
import './PanelConductor.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const PanelConductor = () => {
  const { token, user } = useAuthStore();
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargarServicios = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/conductor/mis-servicios/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al cargar servicios');
      }
      
      const data = await response.json();
      setServicios(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    cargarServicios();
  }, [cargarServicios]);

  const completarServicio = async (servicioId) => {
    try {
      const response = await fetch(`${API_URL}/conductor/servicios/${servicioId}/completar`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al completar');
      }
      
      cargarServicios();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">Cargando servicios...</div>;

  return (
    <div className="panel-conductor">
      <div className="panel-header">
        <h1>Mis Servicios</h1>
        <div className="conductor-info">
          <User size={20} />
          <span>{user?.username || 'Conductor'}</span>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="servicios-list">
        {servicios.length === 0 ? (
          <div className="empty-state">
            <p>No tienes servicios asignados</p>
            <small>Contacta con el administrador para que te asigne servicios</small>
          </div>
        ) : (
          servicios.map((servicio) => (
            <div key={servicio.id} className={`servicio-card ${servicio.estado}`}>
              <div className="servicio-header">
                <span className="servicio-tipo">{servicio.tipo_servicio}</span>
                <span className={`estado-badge ${servicio.estado}`}>
                  {servicio.estado}
                </span>
              </div>

              <div className="servicio-trayecto">
                <div className="trayecto-item">
                  <MapPin size={16} className="origin" />
                  <span><strong>Origen:</strong> {servicio.origen}</span>
                </div>
                <div className="trayecto-item">
                  <MapPin size={16} className="destiny" />
                  <span><strong>Destino:</strong> {servicio.destino}</span>
                </div>
              </div>

              <div className="servicio-detalles">
                <div className="detalle">
                  <Calendar size={14} />
                  <span>{servicio.fecha_inicio} a las {servicio.hora_inicio}</span>
                </div>
                <div className="detalle">
                  <Bus size={14} />
                  <span>{servicio.numero_pasajeros} pasajeros</span>
                </div>
              </div>

              {servicio.notas && (
                <div className="servicio-notas">
                  <p><strong>Notas:</strong> {servicio.notas}</p>
                </div>
              )}

              {servicio.estado === 'pendiente' && (
                <button 
                  className="btn-completar"
                  onClick={() => completarServicio(servicio.id)}
                >
                  <CheckCircle size={18} />
                  Marcar como Completado
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PanelConductor;