import React, { useState, useEffect } from 'react';
import { Role, Permission } from '../../types/permisos';
import { api } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Shield, Users } from 'lucide-react';

export function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permisos, setPermisos] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      // Estos endpoints necesitas crearlos en backend (te los doy abajo)
      const [rolesRes, permisosRes] = await Promise.all([
        api.get<Role[]>('/roles'),
        api.get<Permission[]>('/permissions')
      ]);
      setRoles(rolesRes.data);
      setPermisos(permisosRes.data);
    } catch (err) {
      setError('Error cargando datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const eliminarRol = async (id: number) => {
    if (!confirm('¿Eliminar este rol? Los usuarios con este rol perderán acceso.')) return;
    
    try {
      await api.delete(`/roles/${id}`);
      setRoles(roles.filter(r => r.id !== id));
    } catch (err) {
      alert('Error eliminando rol');
    }
  };

  // Contar permisos por rol
  const contarPermisos = (rol: Role): number => {
    return rol.permisos?.length || 0;
  };

  if (loading) return <div className="p-8">Cargando...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles y Permisos</h1>
          <p className="text-gray-600">Gestiona los roles de usuario y sus permisos</p>
        </div>
        
        <button
          onClick={() => navigate('/configuracion/roles/nuevo')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Nuevo Rol
        </button>
      </div>

      {/* Roles del Sistema (no editables) */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Shield size={20} className="text-blue-600" />
          Roles del Sistema
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {roles.filter(r => r.es_sistema).map(rol => (
            <div key={rol.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900">{rol.nombre}</h3>
                  <p className="text-sm text-blue-700 mt-1">{rol.descripcion}</p>
                </div>
                <Shield size={16} className="text-blue-600" />
              </div>
              <div className="mt-3 text-sm text-blue-800">
                {contarPermisos(rol)} permisos asignados
              </div>
              <div className="mt-2 text-xs text-blue-600 uppercase font-medium">
                {rol.rol_base}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Roles Custom */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Users size={20} className="text-gray-600" />
          Roles Personalizados
        </h2>
        
        {roles.filter(r => !r.es_sistema).length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No hay roles personalizados</p>
            <button
              onClick={() => navigate('/configuracion/roles/nuevo')}
              className="mt-2 text-blue-600 hover:underline"
            >
              Crear el primero
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Rol</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Descripción</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Permisos</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {roles.filter(r => !r.es_sistema).map(rol => (
                  <tr key={rol.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{rol.nombre}</div>
                      <div className="text-sm text-gray-500">{rol.codigo}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {rol.descripcion || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {contarPermisos(rol)} permisos
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => navigate(`/configuracion/roles/${rol.id}/editar`)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => eliminarRol(rol.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Eliminar"
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
        )}
      </div>

      {/* Info de permisos disponibles */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-800 mb-2">
          Permisos disponibles en el sistema: {permisos.length}
        </h3>
        <div className="text-sm text-gray-600">
          Organizados en {new Set(permisos.map(p => p.categoria)).size} categorías
        </div>
      </div>
    </div>
  );
}