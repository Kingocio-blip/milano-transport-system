import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Role, Permission } from '@/types/permisos';
import { api } from '@/lib/api';
import { PermisosChecklist } from '../../components/permisos/PermisosChecklist';
import { RolBadge, PermisosLista } from '../../components/permisos/PermisosBadge';
import { ArrowLeft, Save, User as UserIcon, Shield, Plus, Trash2 } from 'lucide-react';

// Tipo para el override de permisos
interface PermisoOverride {
  id: number;
  permission_id: number;
  permission_codigo: string;
  permission_nombre: string;
  tipo: 'allow' | 'deny';
  razon?: string;
  expires_at?: string;
}

export function PermisosUsuario() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  const [usuario, setUsuario] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permisos, setPermisos] = useState<Permission[]>([]);
  const [permisosUsuario, setPermisosUsuario] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<PermisoOverride[]>([]);
  
  // Estado para edición
  const [rolSeleccionado, setRolSeleccionado] = useState<number | null>(null);
  const [permisosExtra, setPermisosExtra] = useState<number[]>([]);
  const [permisosDenegados, setPermisosDenegados] = useState<number[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [userId]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar todo en paralelo
      const [userRes, rolesRes, permisosRes, authRes] = await Promise.all([
        api.get<User>(`/users/${userId}`),
        api.get<Role[]>('/roles'),
        api.get<Permission[]>('/permissions'),
        api.get<{ permisos: string[] }>('/auth/permissions')
      ]);
      
      const userData = userRes.data;
      setUsuario(userData);
      setRoles(rolesRes.data);
      setPermisos(permisosRes.data);
      setPermisosUsuario(authRes.data.permisos);
      
      setRolSeleccionado(userData.rol_custom_id || null);
      setOverrides([]);
      
    } catch (err) {
      console.error('Error cargando datos:', err);
      alert('Error cargando información del usuario');
    } finally {
      setLoading(false);
    }
  };

  const guardarCambios = async () => {
    try {
      setSaving(true);
      
      await api.put(`/users/${userId}`, {
        rol_custom_id: rolSeleccionado
      });
      
      setModoEdicion(false);
      await cargarDatos();
      alert('Cambios guardados correctamente');
      
    } catch (err) {
      console.error('Error guardando:', err);
      alert('Error guardando cambios');
    } finally {
      setSaving(false);
    }
  };

  const permisosDelRol = (rolId: number | null): number[] => {
    if (!rolId) return [];
    const rol = roles.find(r => r.id === rolId);
    return rol?.permisos?.map(p => p.permission.id) || [];
  };

  const calcularPermisosEfectivos = (): string[] => {
    let base: string[] = [];
    
    const rol = roles.find(r => r.id === rolSeleccionado);
    if (rol) {
      base = rol.permisos?.map(p => p.permission.codigo) || [];
    } else {
      base = permisosUsuario;
    }
    
    return [...new Set(base)];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Usuario no encontrado</p>
        <button 
          onClick={() => navigate('/usuarios')}
          className="mt-4 text-blue-600 hover:underline"
        >
          Volver a usuarios
        </button>
      </div>
    );
  }

  const permisosEfectivosPreview = calcularPermisosEfectivos();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/usuarios')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={24} />
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <UserIcon size={28} className="text-gray-600" />
              Permisos de Usuario
            </h1>
            <p className="text-gray-600 mt-1">
              {usuario.nombre_completo} (@{usuario.username})
            </p>
          </div>
        </div>

        <button
          onClick={() => modoEdicion ? guardarCambios() : setModoEdicion(true)}
          disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            modoEdicion 
              ? 'bg-green-600 text-white hover:bg-green-700' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } disabled:opacity-50`}
        >
          {modoEdicion ? <Save size={20} /> : <Shield size={20} />}
          {modoEdicion ? (saving ? 'Guardando...' : 'Guardar Cambios') : 'Editar Permisos'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Shield size={20} />
              Rol Asignado
            </h2>

            {modoEdicion ? (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Seleccionar Rol
                </label>
                <select
                  value={rolSeleccionado || ''}
                  onChange={(e) => setRolSeleccionado(e.target.value ? Number(e.target.value) : null)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">-- Usar rol base ({usuario.rol}) --</option>
                  {roles.map(rol => (
                    <option key={rol.id} value={rol.id}>
                      {rol.nombre} {rol.es_sistema ? '(Sistema)' : '(Custom)'}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                {usuario.rol_custom_id ? (
                  <div>
                    <RolBadge 
                      rol={roles.find(r => r.id === usuario.rol_custom_id)?.nombre || 'Custom'} 
                      esSistema={roles.find(r => r.id === usuario.rol_custom_id)?.es_sistema}
                    />
                  </div>
                ) : (
                  <div>
                    <RolBadge rol={usuario.rol} esSistema={true} />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <h3 className="font-semibold text-gray-800 mb-3">
              Resumen de Permisos
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Permisos efectivos:</span>
                <span className="font-medium">{permisosEfectivosPreview.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Permisos del Rol
            </h2>
            
            <div className="space-y-4">
              {rolSeleccionado ? (
                <PermisosChecklist
                  permisos={permisos}
                  seleccionados={permisosDelRol(rolSeleccionado)}
                  onChange={() => {}}
                  disabled={!modoEdicion}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>El usuario usa el rol base del sistema</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border mt-6">
            <h3 className="font-semibold text-gray-800 mb-3">
              Vista Previa de Permisos Efectivos
            </h3>
            <PermisosLista 
              permisos={permisosEfectivosPreview} 
              maxMostrar={10}
            />
          </div>
        </div>
      </div>

      {modoEdicion && (
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <button
            onClick={() => setModoEdicion(false)}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={guardarCambios}
            disabled={saving}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Save size={20} />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      )}
    </div>
  );
}