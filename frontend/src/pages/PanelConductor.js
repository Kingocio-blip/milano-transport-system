import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, MapPin, User, Phone, Calendar } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.REACT_APP_API_URL || 'https://milano-transport-system.onrender.com';

export default function PanelConductor() {
  const { token, conductorId } = useAuthStore();
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarMisServicios();
  }, []);

  const cargarMisServicios = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/servicios/mis-servicios`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setServicios(data);
      } else {
        console.error('Error al cargar servicios:', await response.text());
      }
    } catch (error) {
      console.error('Error cargando mis servicios:', error);
    } finally {
      setLoading(false);
    }
  };

  const marcarCompletado = async (servicioId) => {
    try {
      const response = await fetch(`${API_URL}/servicios/${servicioId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ estado: 'completado' })
      });

      if (response.ok) {
        cargarMisServicios();
      } else {
        alert('Error al actualizar el servicio');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar el servicio');
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'en_curso': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completado': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelado': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEstadoTexto = (estado) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'en_curso': return 'En Curso';
      case 'completado': return 'Completado';
      case 'cancelado': return 'Cancelado';
      default: return estado;
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tus servicios...</p>
        </div>
      </div>
    );
  }

  const serviciosPendientes = servicios.filter(s => s.estado !== 'completado' && s.estado !== 'cancelado');
  const serviciosCompletados = servicios.filter(s => s.estado === 'completado');

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Mis Servicios</h1>
        <p className="text-gray-600">Bienvenido a tu panel de conductor</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 text-white p-3 rounded-lg">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Servicios</p>
              <p className="text-2xl font-bold text-gray-800">{servicios.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500 text-white p-3 rounded-lg">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-gray-800">{serviciosPendientes.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-500 text-white p-3 rounded-lg">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completados</p>
              <p className="text-2xl font-bold text-gray-800">{serviciosCompletados.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Servicios Pendientes */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Clock size={20} className="text-yellow-600" />
          Servicios Pendientes
        </h2>
        
        {serviciosPendientes.length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Clock size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No tienes servicios pendientes</p>
            <p className="text-gray-400 text-sm">Los nuevos servicios asignados aparecerán aquí</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {serviciosPendientes.map((servicio) => (
              <div key={servicio.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getEstadoColor(servicio.estado)}`}>
                      {getEstadoTexto(servicio.estado)}
                    </span>
                    <span className="text-sm text-gray-500">#{servicio.id}</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <User size={18} className="text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-800">
                          {servicio.cliente?.nombre} {servicio.cliente?.apellidos}
                        </p>
                        {servicio.cliente?.telefono && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Phone size={14} />
                            {servicio.cliente.telefono}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <MapPin size={18} className="text-green-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Origen</p>
                        <p className="font-medium text-gray-800">{servicio.origen}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <MapPin size={18} className="text-red-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Destino</p>
                        <p className="font-medium text-gray-800">{servicio.destino}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar size={16} />
                        {servicio.fecha}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={16} />
                        {servicio.hora}
                      </span>
                    </div>
                    
                    <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-800">€{servicio.precio}</span>
                      <button
                        onClick={() => marcarCompletado(servicio.id)}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle size={18} />
                        Marcar Completado
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Servicios Completados */}
      {serviciosCompletados.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle size={20} className="text-green-600" />
            Servicios Completados
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 opacity-75">
            {serviciosCompletados.map((servicio) => (
              <div key={servicio.id} className="bg-gray-50 border border-gray-200 rounded-lg">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getEstadoColor(servicio.estado)}`}>
                      {getEstadoTexto(servicio.estado)}
                    </span>
                    <span className="text-sm text-gray-500">#{servicio.id}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-400" />
                      <span className="text-gray-700">
                        {servicio.cliente?.nombre} {servicio.cliente?.apellidos}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{servicio.origen} → {servicio.destino}</span>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm text-gray-500">{servicio.fecha} {servicio.hora}</span>
                      <span className="font-medium text-gray-700">€{servicio.precio}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}