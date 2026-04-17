import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Role, Permission } from '../../types/permisos.types';
import { api } from '../../lib/api';
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
        api.get<{ permisos: string[] }>('/auth/permissions') // Permisos efectivos del usuario
      ]);
      
      const userData = userRes.data;
      setUsuario(userData);
      setRoles(rolesRes.data);
      setPermisos(permisosRes.data);
      setPermisosUsuario(authRes.data.permisos);
      
      // Estado inicial
      setRolSeleccionado(userData.rol_custom_id || null);
      
      // TODO: Cargar overrides específicos del usuario (endpoint adicional)
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
      
      // 1. Actualizar rol del usuario
      await api.put(`/users/${userId}`, {
        rol_custom_id: rolSeleccionado
      });
      
      // 2. Guardar overrides de permisos (allow/deny)
      // TODO: Endpoint para guardar overrides
      
      setModoEdicion(false);
      await cargarDatos(); // Recargar para ver cambios
      alert('Cambios guardados correctamente');
      
    } catch (err) {
      console.error('Error guardando:', err);
      alert('Error guardando cambios');
    } finally {
      setSaving(false);
    }
  };

  // Obtener permisos del rol seleccionado
  const permisosDelRol = (rolId: number | null): number[] => {
    if (!rolId) return [];
    const rol = roles.find(r => r.id === rolId);
    return rol?.permisos?.map(p => p.permission.id) || [];
  };

  // Calcular permisos efectivos preview
  const calcularPermisosEfectivos = (): string[] => {
    let base: string[] = [];
    
    // Base: permisos del rol seleccionado
    const rol = roles.find(r => r.id === rolSeleccionado);
    if (rol) {
      base = rol.permisos?.map(p => p.permission.codigo) || [];
    } else {
      // Si no hay rol custom, usar permisos del rol base (admin, gerente, etc.)
      base = permisosUsuario; // Simplificado, debería calcularse del rol base
    }
    
    // Aplicar overrides (simplificado)
    // En realidad esto vendría del backend
    
    return [...new Set(base)]; // Quitar duplicados
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
      {/* Header */}
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
        {/* Columna izquierda: Rol y estado */}
        <div className="space-y-6">
          {/* Tarjeta de rol actual */}
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
                <p className="text-xs text-gray-500">
                  Los roles custom permiten permisos granulares
                </p>
              </div>
            ) : (
              <div>
                {usuario.rol_custom_id ? (
                  <div>
                    <RolBadge 
                      rol={roles.find(r => r.id === usuario.rol_custom_id)?.nombre || 'Custom'} 
                      esSistema={roles.find(r => r.id === usuario.rol_custom_id)?.es_sistema}
                    />
                    <p className="text-sm text-gray-600 mt-2">
                      {roles.find(r => r.id === usuario.rol_custom_id)?.descripcion}
                    </p>
                  </div>
                ) : (
                  <div>
                    <RolBadge rol={usuario.rol} esSistema={true} />
                    <p className="text-sm text-gray-600 mt-2">
                      Usando rol del sistema con permisos predefinidos
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Resumen de permisos */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="font-semibold text-gray-800 mb-3">
              Resumen de Permisos
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Permisos efectivos:</span>
                <span className="font-medium">{permisosEfectivosPreview.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Overrides allow:</span>
                <span className="font-medium text-green-600">{overrides.filter(o => o.tipo === 'allow').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Overrides deny:</span>
                <span className="font-medium text-red-600">{overrides.filter(o => o.tipo === 'deny').length}</span>
              </div>
            </div>
          </div>

          {/* Overrides actuales (solo lectura por ahora) */}
          {overrides.length > 0 && (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="font-semibold text-gray-800 mb-3">
                Permisos Específicos
              </h3>
              <div className="space-y-2">
                {overrides.map(override => (
                  <div 
                    key={override.id}
                    className={`p-3 rounded-lg text-sm ${
                      override.tipo === 'allow' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {override.permission_nombre}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        override.tipo === 'allow' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                      }`}>
                        {override.tipo === 'allow' ? 'PERMITIR' : 'DENEGAR'}
                      </span>
                    </div>
                    {override.razon && (
                      <p className="text-xs text-gray-600 mt-1">{override.razon}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Columna derecha: Permisos detallados */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Permisos del Rol
            </h2>
            
            {modoEdicion && rolSeleccionado ? (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Editando permisos del rol:</strong> Los cambios afectarán a todos los usuarios con este rol. 
                  Para cambios solo de este usuario, usa los permisos específicos.
                </p>
              </div>
            ) : null}

            {/* Vista de permisos por categoría */}
            <div className="space-y-4">
              {rolSeleccionado ? (
                <PermisosChecklist
                  permisos={permisos}
                  seleccionados={permisosDelRol(rolSeleccionado)}
                  onChange={() => {}} // Solo lectura aquí, se edita en la página de roles
                  disabled={!modoEdicion}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>El usuario usa el rol base del sistema</p>
                  <p className="text-sm mt-2">
                    Asigna un rol custom para ver/editar permisos granulares
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Vista previa de permisos efectivos */}
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

      {/* Botones de acción */}
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