import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.REACT_APP_API_URL || 'https://milano-transport-system.onrender.com';

export default function Servicios() {
  const { token } = useAuthStore();
  const [servicios, setServicios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({
    cliente_id: '',
    origen: '',
    destino: '',
    fecha: '',
    hora: '',
    precio: '',
    estado: 'pendiente',
    conductor_id: ''
  });

  useEffect(() => {
    cargarServicios();
    cargarClientes();
    cargarConductores();
  }, []);

  const cargarServicios = async () => {
    try {
      const response = await fetch(`${API_URL}/servicios/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setServicios(data);
      }
    } catch (error) {
      console.error('Error cargando servicios:', error);
    }
  };

  const cargarClientes = async () => {
    try {
      const response = await fetch(`${API_URL}/clientes/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setClientes(data);
      }
    } catch (error) {
      console.error('Error cargando clientes:', error);
    }
  };

  const cargarConductores = async () => {
    try {
      const response = await fetch(`${API_URL}/conductores/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setConductores(data);
      }
    } catch (error) {
      console.error('Error cargando conductores:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editando 
        ? `${API_URL}/servicios/${editando}`
        : `${API_URL}/servicios/`;
      
      const method = editando ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          cliente_id: parseInt(formData.cliente_id),
          precio: parseFloat(formData.precio),
          conductor_id: formData.conductor_id ? parseInt(formData.conductor_id) : null
        })
      });

      if (response.ok) {
        setModalOpen(false);
        setEditando(null);
        setFormData({
          cliente_id: '',
          origen: '',
          destino: '',
          fecha: '',
          hora: '',
          precio: '',
          estado: 'pendiente',
          conductor_id: ''
        });
        cargarServicios();
      }
    } catch (error) {
      console.error('Error guardando servicio:', error);
    }
  };

  const handleEdit = (servicio) => {
    setEditando(servicio.id);
    setFormData({
      cliente_id: servicio.cliente_id.toString(),
      origen: servicio.origen,
      destino: servicio.destino,
      fecha: servicio.fecha,
      hora: servicio.hora,
      precio: servicio.precio.toString(),
      estado: servicio.estado,
      conductor_id: servicio.conductor_id ? servicio.conductor_id.toString() : ''
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este servicio?')) return;
    
    try {
      const response = await fetch(`${API_URL}/servicios/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        cargarServicios();
      }
    } catch (error) {
      console.error('Error eliminando servicio:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'en_curso': return 'bg-blue-100 text-blue-800';
      case 'completado': return 'bg-green-100 text-green-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Servicios</h1>
        <button
          onClick={() => {
            setEditando(null);
            setFormData({
              cliente_id: '',
              origen: '',
              destino: '',
              fecha: '',
              hora: '',
              precio: '',
              estado: 'pendiente',
              conductor_id: ''
            });
            setModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Nuevo Servicio
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Cliente</th>
              <th className="px-4 py-2 text-left">Origen</th>
              <th className="px-4 py-2 text-left">Destino</th>
              <th className="px-4 py-2 text-left">Fecha</th>
              <th className="px-4 py-2 text-left">Hora</th>
              <th className="px-4 py-2 text-left">Precio</th>
              <th className="px-4 py-2 text-left">Estado</th>
              <th className="px-4 py-2 text-left">Conductor</th>
              <th className="px-4 py-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {servicios.map((servicio) => (
              <tr key={servicio.id} className="border-t">
                <td className="px-4 py-2">{servicio.id}</td>
                <td className="px-4 py-2">{servicio.cliente?.nombre} {servicio.cliente?.apellidos}</td>
                <td className="px-4 py-2">{servicio.origen}</td>
                <td className="px-4 py-2">{servicio.destino}</td>
                <td className="px-4 py-2">{servicio.fecha}</td>
                <td className="px-4 py-2">{servicio.hora}</td>
                <td className="px-4 py-2">€{servicio.precio}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(servicio.estado)}`}>
                    {servicio.estado}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {servicio.conductor ? `${servicio.conductor.nombre} ${servicio.conductor.apellidos}` : '—'}
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(servicio)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(servicio.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editando ? 'Editar Servicio' : 'Nuevo Servicio'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente
                </label>
                <select
                  name="cliente_id"
                  value={formData.cliente_id}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar cliente</option>
                  {clientes.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre} {cliente.apellidos}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conductor Asignado
                </label>
                <select
                  name="conductor_id"
                  value={formData.conductor_id || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Sin conductor asignado --</option>
                  {conductores.map(conductor => (
                    <option key={conductor.id} value={conductor.id}>
                      {conductor.nombre} {conductor.apellidos}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Origen
                </label>
                <input
                  type="text"
                  name="origen"
                  value={formData.origen}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destino
                </label>
                <input
                  type="text"
                  name="destino"
                  value={formData.destino}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    name="fecha"
                    value={formData.fecha}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora
                  </label>
                  <input
                    type="time"
                    name="hora"
                    value={formData.hora}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="precio"
                  value={formData.precio}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en_curso">En Curso</option>
                  <option value="completado">Completado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {editando ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}