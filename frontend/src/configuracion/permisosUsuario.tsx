import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Role, Permission, CATEGORIAS_PERMISOS } from '@/types/permisos';
import { api } from '@/lib/api';
import { ArrowLeft, Save, User as UserIcon, Shield } from 'lucide-react';

// ==================== COMPONENTES INTEGRADOS ====================

interface PermisosChecklistProps {
  permisos: Permission[];
  seleccionados: number[];
  onChange: (permisoId: number, seleccionado: boolean) => void;
  disabled?: boolean;
}

function PermisosChecklist({ permisos, seleccionados, onChange, disabled = false }: PermisosChecklistProps) {
  const permisosPorCategoria = useMemo(() => {
    const agrupado: Record<string, Permission[]> = {};
    CATEGORIAS_PERMISOS.forEach(cat => {
      agrupado[cat.id] = permisos.filter(p => p.categoria === cat.id);
    });
    return agrupado;
  }, [permisos]);

  const categoriaCompleta = (categoriaId: string): boolean => {
    const permisosCat = permisosPorCategoria[categoriaId] || [];
    if (permisosCat.length === 0) return false;
    return permisosCat.every(p => seleccionados.includes(p.id));
  };

  const toggleCategoria = (categoriaId: string) => {
    const permisosCat = permisosPorCategoria[categoriaId] || [];
    const todosSeleccionados = categoriaCompleta(categoriaId);
    permisosCat.forEach(p => onChange(p.id, !todosSeleccionados));
  };

  return (
    <div className="space-y-6">
      {CATEGORIAS_PERMISOS.map(categoria => {
        const permisosCat = permisosPorCategoria[categoria.id] || [];
        if (permisosCat.length === 0) return null;
        return (
          <div key={categoria.id} className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-800">{categoria.nombre}</h4>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={categoriaCompleta(categoria.id)}
                  onChange={() => toggleCategoria(categoria.id)}
                  disabled={disabled}
                  className="rounded border-gray-300"
                />
                <span className="text-gray-600">Seleccionar todo</span>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {permisosCat.map(permiso => (
                <label key={permiso.id} className="flex items-start gap-2 p-2 rounded hover:bg-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={seleccionados.includes(permiso.id)}
                    onChange={(e) => onChange(permiso.id, e.target.checked)}
                    disabled={disabled || permiso.es_sistema}
                    className="mt-1 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-800">{permiso.nombre}</div>
                    {permiso.descripcion && <div className="text-xs text-gray-500">{permiso.descripcion}</div>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface RolBadgeProps {
  rol: string;
  esSistema?: boolean;
}

function RolBadge({ rol, esSistema = false }: RolBadgeProps) {
  const colores: Record<string, string> = {
    'admin': 'bg-purple-100 text-purple-800',
    'gerente': 'bg-blue-100 text-blue-800',
    'operador': 'bg-green-100 text-green-800',
    'conductor': 'bg-orange-100 text-orange-800',
    'default': 'bg-gray-100 text-gray-800'
  };
  const color = colores[rol.toLowerCase()] || colores.default;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${color}`}>
      <Shield size={14} />
      <span className="capitalize">{rol}</span>
      {esSistema && <span className="text-xs opacity-75">(Sistema)</span>}
    </span>
  );
}

interface PermisosListaProps {
  permisos: string[];
  maxMostrar?: number;
}

function PermisosLista({ permisos, maxMostrar = 5 }: PermisosListaProps) {
  const mostrados = permisos.slice(0, maxMostrar);
  const restantes = permisos.length - maxMostrar;
  return (
    <div className="flex flex-wrap gap-1">
      {mostrados.map((permiso, idx) => (
        <span key={idx} className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100">
          {permiso.length > 20 ? permiso.substring(0, 20) + '...' : permiso}
        </span>
      ))}
      {restantes > 0 && <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">+{restantes} más</span>}
      {permisos.length === 0 && <span className="text-gray-400 text-sm italic">Sin permisos asignados</span>}
    </div>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================

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
  const [rolSeleccionado, setRolSeleccionado] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [userId]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [userData, rolesData, permisosData, authData] = await Promise.all([
        api.get<User>(`/users/${userId}`),
        api.get<Role[]>('/roles'),
        api.get<Permission[]>('/permissions'),
        api.get<{ permisos: string[] }>('/auth/permissions')
      ]);
      setUsuario(userData);
      setRoles(rolesData);
      setPermisos(permisosData);
      setPermisosUsuario(authData.permisos);
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
      await api.put(`/users/${userId}`, { rol_custom_id: rolSeleccionado });
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
    return rol?.permisos?.map(p => p.id) || [];
  };

  const calcularPermisosEfectivos = (): string[] => {
    let base: string[] = [];
    const rol = roles.find(r => r.id === rolSeleccionado);
    if (rol) {
      base = rol.permisos?.map(p => p.codigo) || [];
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
        <button onClick={() => navigate('/usuarios')} className="mt-4 text-blue-600 hover:underline">
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
          <button onClick={() => navigate('/usuarios')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <UserIcon size={28} className="text-gray-600" />
              Permisos de Usuario
            </h1>
            <p className="text-gray-600 mt-1">{usuario.nombre_completo} (@{usuario.username})</p>
          </div>
        </div>
        <button
          onClick={() => modoEdicion ? guardarCambios() : setModoEdicion(true)}
          disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${modoEdicion ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'} disabled:opacity-50`}
        >
          {modoEdicion ? <Save size={20} /> : <Shield size={20} />}
          {modoEdicion ? (saving ? 'Guardando...' : 'Guardar Cambios') : 'Editar Permisos'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Shield size={20} /> Rol Asignado
            </h2>
            {modoEdicion ? (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Seleccionar Rol</label>
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
                  <RolBadge rol={roles.find(r => r.id === usuario.rol_custom_id)?.nombre || 'Custom'} esSistema={roles.find(r => r.id === usuario.rol_custom_id)?.es_sistema} />
                ) : (
                  <RolBadge rol={usuario.rol} esSistema={true} />
                )}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <h3 className="font-semibold text-gray-800 mb-3">Resumen de Permisos</h3>
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
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Permisos del Rol</h2>
            <div className="space-y-4">
              {rolSeleccionado ? (
                <PermisosChecklist permisos={permisos} seleccionados={permisosDelRol(rolSeleccionado)} onChange={() => {}} disabled={!modoEdicion} />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>El usuario usa el rol base del sistema</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border mt-6">
            <h3 className="font-semibold text-gray-800 mb-3">Vista Previa de Permisos Efectivos</h3>
            <PermisosLista permisos={permisosEfectivosPreview} maxMostrar={10} />
          </div>
        </div>
      </div>

      {modoEdicion && (
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <button onClick={() => setModoEdicion(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={guardarCambios} disabled={saving} className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
            <Save size={20} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      )}
    </div>
  );
}