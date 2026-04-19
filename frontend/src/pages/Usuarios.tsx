import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { usePermisos } from '../hooks/usePermisos';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  User, 
  AlertCircle,
  MoreVertical,
  Mail,
  Shield
} from 'lucide-react';

interface Usuario {
  id: number;
  username: string;
  email: string;
  nombre_completo: string;
  rol: string;
  rol_custom_id?: number;
  rol_custom_nombre?: string;
  activo: boolean;
  created_at: string;
}

const ROLES_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',
  gerente: 'bg-blue-100 text-blue-800',
  operador: 'bg-green-100 text-green-800',
  conductor: 'bg-yellow-100 text-yellow-800'
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [usuarioEliminar, setUsuarioEliminar] = useState<Usuario | null>(null);
  const [filtroRol, setFiltroRol] = useState('');
  
  const { puede } = usePermisos();
  const navigate = useNavigate();

  const puedeVer = puede('usuarios.ver');
  const puedeCrear = puede('usuarios.crear');
  const puedeEditar = puede('usuarios.editar');
  const puedeEliminar = puede('usuarios.eliminar');

  useEffect(() => {
    if (!puedeVer) {
      navigate('/dashboard');
      return;
    }
    cargarUsuarios();
  }, [puedeVer]);

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setUsuarios(response.data);
    } catch (err) {
      setError('Error al cargar usuarios');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id: number) => {
    try {
      await api.delete(`/users/${id}`);
      setUsuarios(usuarios.filter(u => u.id !== id));
      setUsuarioEliminar(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al eliminar usuario');
    }
  };

  const usuariosFiltrados = usuarios.filter(usuario => {
    const term = searchTerm.toLowerCase();
    const matchSearch = 
      usuario.username.toLowerCase().includes(term) ||
      usuario.email.toLowerCase().includes(term) ||
      usuario.nombre_completo.toLowerCase().includes(term);
    
    const matchRol = !filtroRol || usuario.rol === filtroRol;
    
    return matchSearch && matchRol;
  });

  const rolesDisponibles = ['admin', 'gerente', 'operador', 'conductor'];

  if (!puedeVer) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500 mt-1">Gestiona el acceso al sistema</p>
        </div>
        
        {puedeCrear && (
          <Link
            to="/usuarios/nuevo"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Usuario
          </Link>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          
          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white outline-none min-w-[180px]"
          >
            <option value="">Todos los roles</option>
            {rolesDisponibles.map(rol => (
              <option key={rol} value={rol}>
                {rol.charAt(0).toUpperCase() + rol.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center text-red-700">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          {error}
          <button 
            onClick={cargarUsuarios}
            className="ml-auto text-sm font-medium hover:underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Cargando usuarios...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500 font-medium">No se encontraron usuarios</p>
                      {searchTerm && (
                        <p className="text-sm text-gray-400 mt-1">
                          Intenta con otros términos de búsqueda
                        </p>
                      )}
                    </td>
                  </tr>
                ) : (
                  usuariosFiltrados.map((usuario) => (
                    <tr 
                      key={usuario.id} 
                      className="hover:bg-gray-50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold mr-3 shadow-sm">
                            {usuario.nombre_completo.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {usuario.nombre_completo}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              @{usuario.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center text-gray-600 text-sm">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          {usuario.email}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium w-fit ${ROLES_COLORS[usuario.rol] || 'bg-gray-100 text-gray-800'}`}>
                            <Shield className="w-3 h-3 mr-1" />
                            {usuario.rol}
                          </span>
                          {usuario.rol_custom_nombre && (
                            <span className="text-xs text-gray-500 ml-1">
                              + {usuario.rol_custom_nombre}
                            </span>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          usuario.activo 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${usuario.activo ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {puedeEditar && (
                            <Link
                              to={`/usuarios/${usuario.id}/editar`}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Link>
                          )}
                          {puedeEliminar && (
                            <button
                              onClick={() => setUsuarioEliminar(usuario)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer tabla */}
        {!loading && usuariosFiltrados.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-500 flex justify-between items-center">
            <span>{usuariosFiltrados.length} usuario{usuariosFiltrados.length !== 1 ? 's' : ''}</span>
            <span className="text-gray-400">Total: {usuarios.length}</span>
          </div>
        )}
      </div>

      {/* Modal Confirmar Eliminación */}
      {usuarioEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Eliminar usuario</h3>
            </div>
            
            <p className="text-gray-600 mb-2">
              ¿Estás seguro de eliminar a <strong className="text-gray-900">{usuarioEliminar.nombre_completo}</strong>?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Usuario: @{usuarioEliminar.username} • Email: {usuarioEliminar.email}
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setUsuarioEliminar(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleEliminar(usuarioEliminar.id)}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors font-medium shadow-sm"
              >
                Eliminar usuario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}