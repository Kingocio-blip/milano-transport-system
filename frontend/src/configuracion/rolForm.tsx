import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Role, Permission, RoleCreate } from '@/types/permisos';
import { api } from '@/lib/api';
import { PermisosChecklist } from '@/components/permisos/PermisosChecklist';
import { ArrowLeft, Save } from 'lucide-react';

export function RolForm() {
  const { id } = useParams(); // undefined = crear, número = editar
  const navigate = useNavigate();
  const esEdicion = Boolean(id);

  const [formData, setFormData] = useState<RoleCreate>({
    codigo: '',
    nombre: '',
    descripcion: '',
    permisos_ids: []
  });

  const [permisos, setPermisos] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarPermisos();
    if (esEdicion) {
      cargarRol();
    }
  }, [id]);

  const cargarPermisos = async () => {
    try {
      const res = await api.get<Permission[]>('/permissions');
      setPermisos(res.data);
    } catch (err) {
      console.error('Error cargando permisos:', err);
    }
  };

  const cargarRol = async () => {
    try {
      setLoading(true);
      const res = await api.get<Role>(`/roles/${id}`);
      const rol = res.data;
      setFormData({
        codigo: rol.codigo,
        nombre: rol.nombre,
        descripcion: rol.descripcion || '',
        permisos_ids: rol.permisos?.map(p => p.id) || []
      });
    } catch (err) {
      setError('Error cargando rol');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.permisos_ids.length === 0) {
      alert('Selecciona al menos un permiso');
      return;
    }

    try {
      setSaving(true);
      
      if (esEdicion) {
        await api.put(`/roles/${id}`, formData);
      } else {
        await api.post('/roles', formData);
      }
      
      navigate('/configuracion/roles');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error guardando rol');
    } finally {
      setSaving(false);
    }
  };

  const togglePermiso = (permisoId: number, seleccionado: boolean) => {
    setFormData(prev => ({
      ...prev,
      permisos_ids: seleccionado
        ? [...prev.permisos_ids, permisoId]
        : prev.permisos_ids.filter(id => id !== permisoId)
    }));
  };

  if (loading) return <div className="p-8">Cargando...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/configuracion/roles')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {esEdicion ? 'Editar Rol' : 'Nuevo Rol'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos básicos */}
        <div className="bg-white p-6 rounded-lg border space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Información del Rol</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código *
              </label>
              <input
                type="text"
                value={formData.codigo}
                onChange={e => setFormData({...formData, codigo: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="ej: supervisor_flota"
                required
                disabled={esEdicion} // No editable en edición
              />
              <p className="text-xs text-gray-500 mt-1">
                Identificador único, sin espacios
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={e => setFormData({...formData, nombre: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="ej: Supervisor de Flota"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={e => setFormData({...formData, descripcion: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
              placeholder="Describe las responsabilidades de este rol..."
            />
          </div>
        </div>

        {/* Permisos */}
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Permisos ({formData.permisos_ids.length} seleccionados)
            </h2>
          </div>

          <PermisosChecklist
            permisos={permisos}
            seleccionados={formData.permisos_ids}
            onChange={togglePermiso}
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/configuracion/roles')}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={20} />
            {saving ? 'Guardando...' : 'Guardar Rol'}
          </button>
        </div>
      </form>
    </div>
  );
}