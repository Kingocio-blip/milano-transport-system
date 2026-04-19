import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { usePermisos } from '../hooks/usePermisos';
import { 
  ArrowLeft, 
  Save, 
  User, 
  Mail, 
  Lock, 
  Shield, 
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  UserCog
} from 'lucide-react';

interface RolCustom {
  id: number;
  nombre: string;
}

interface FormData {
  username: string;
  email: string;
  password: string;
  nombre_completo: string;
  rol: string;
  rol_custom_id: string;
  activo: boolean;
}

const ROLES_BASE = [
  { value: 'admin', label: 'Administrador', color: 'purple', desc: 'Acceso total al sistema' },
  { value: 'gerente', label: 'Gerente', color: 'blue', desc: 'Gestión operativa y reportes' },
  { value: 'operador', label: 'Operador', color: 'green', desc: 'Gestión de servicios diarios' },
  { value: 'conductor', label: 'Conductor', color: 'yellow', desc: 'Acceso al panel de conductor' }
];

export default function UsuarioForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const esEdicion = !!id;
  const { tienePermiso } = usePermisos();

  const puedeEditar = tienePermiso('usuarios.editar');
  const puedeCrear = tienePermiso('usuarios.crear');

  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    nombre_completo: '',
    rol: 'operador',
    rol_custom_id: '',
    activo: true
  });

  const [rolesCustom, setRolesCustom] = useState<RolCustom[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (esEdicion && !puedeEditar) {
      navigate('/usuarios');
      return;
    }
    if (!esEdicion && !puedeCrear) {
      navigate('/usuarios');
      return;
    }

    cargarRolesCustom();
    if (esEdicion) {
      cargarUsuario();
    }
  }, [id]);

  const cargarRolesCustom = async () => {
    try {
      const response = await api.get('/roles');
      setRolesCustom(response.data.filter((r: any) => r.activo));
    } catch (err) {
      console.error('Error cargando roles custom:', err);
    }
  };

  const cargarUsuario = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/users/${id}`);
      const usuario = response.data;
      
      setFormData({
        username: usuario.username,
        email: usuario.email,
        password: '',
        nombre_completo: usuario.nombre_completo,
        rol: usuario.rol,
        rol_custom_id: usuario.rol_custom_id?.toString() || '',
        activo: usuario.activo
      });
    } catch (err: any) {
      setError('Error al cargar el usuario');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const errors: string[] = [];
    if (!formData.nombre_completo.trim()) errors.push('El nombre completo es obligatorio');
    if (!formData.username.trim()) errors.push('El nombre de usuario es obligatorio');
    if (!formData.email.trim()) errors.push('El email es obligatorio');
    if (!esEdicion && !formData.password) errors.push('La contraseña es obligatoria para nuevos usuarios');
    if (formData.password && formData.password.length < 6) errors.push('La contraseña debe tener al menos 6 caracteres');
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      return;
    }

    setSaving(true);
    setError('');

    try {
      const dataToSend: any = {
        username: formData.username,
        email: formData.email,
        nombre_completo: formData.nombre_completo,
        rol: formData.rol,
        rol_custom_id: formData.rol_custom_id ? parseInt(formData.rol_custom_id) : null,
        activo: formData.activo
      };

      if (!esEdicion || formData.password) {
        dataToSend.password = formData.password;
      }

      if (esEdicion) {
        await api.put(`/users/${id}`, dataToSend);
      } else {
        await api.post('/users', dataToSend);
      }

      setSuccess(true);
      setTimeout(() => navigate('/usuarios'), 1500);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((d: any) => d.msg || d.message).join('. '));
      } else {
        setError('Error al guardar el usuario. Verifica los datos e intenta nuevamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const getFieldError = (field: string) => {
    if (!touched[field]) return false;
    if (field === 'nombre_completo') return !formData.nombre_completo.trim();
    if (field === 'username') return !formData.username.trim();
    if (field === 'email') return !formData.email.trim() || !formData.email.includes('@');
    if (field === 'password') return !esEdicion && !formData.password;
    return false;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/usuarios"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {esEdicion ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h1>
          <p className="text-gray-500 mt-1">
            {esEdicion ? 'Modifica los datos del usuario existente' : 'Crea una nueva cuenta de acceso'}
          </p>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start text-red-700">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center text-green-700">
          <Check className="w-5 h-5 mr-2 flex-shrink-0" />
          <span>Usuario {esEdicion ? 'actualizado' : 'creado'} correctamente. Redirigiendo...</span>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 space-y-8">
          
          {/* Sección: Información Personal */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              Información Personal
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre completo *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    name="nombre_completo"
                    value={formData.nombre_completo}
                    onChange={handleChange}
                    onBlur={() => setTouched(prev => ({ ...prev, nombre_completo: true }))}
                    required
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors ${
                      getFieldError('nombre_completo') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Ej: Juan Pérez García"
                  />
                </div>
                {getFieldError('nombre_completo') && (
                  <p className="mt-1 text-sm text-red-600">El nombre completo es obligatorio</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de usuario *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium">@</span>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    onBlur={() => setTouched(prev => ({ ...prev, username: true }))}
                    required
                    disabled={esEdicion}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors ${
                      getFieldError('username') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    } ${esEdicion ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                    placeholder="juanperez"
                  />
                </div>
                {esEdicion ? (
                  <p className="mt-1 text-xs text-gray-500">El nombre de usuario no se puede modificar</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">Solo letras, números y guiones. Sin espacios.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                    required
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors ${
                      getFieldError('email') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="juan@empresa.com"
                  />
                </div>
                {getFieldError('email') && (
                  <p className="mt-1 text-sm text-red-600">Introduce un email válido</p>
                )}
              </div>
            </div>
          </div>

          {/* Sección: Seguridad */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-400" />
              Seguridad
            </h3>
            
            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña {esEdicion ? '(solo si deseas cambiarla)' : '*'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                  required={!esEdicion}
                  minLength={6}
                  className={`w-full pl-10 pr-12 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors ${
                    getFieldError('password') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder={esEdicion ? '•••••••• (sin cambios)' : 'Mínimo 6 caracteres'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {getFieldError('password') && (
                <p className="mt-1 text-sm text-red-600">La contraseña debe tener al menos 6 caracteres</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {esEdicion ? 'Deja en blanco para mantener la contraseña actual' : 'Usa una combinación de letras, números y símbolos'}
              </p>
            </div>
          </div>

          {/* Sección: Roles y Permisos */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-400" />
              Roles y Permisos
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Rol base *
                </label>
                <div className="space-y-3">
                  {ROLES_BASE.map((rol) => (
                    <label
                      key={rol.value}
                      className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all hover:border-blue-300 ${
                        formData.rol === rol.value 
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                          : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="rol"
                        value={rol.value}
                        checked={formData.rol === rol.value}
                        onChange={handleChange}
                        className="mt-1 mr-3 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full bg-${rol.color}-500`}></span>
                          <span className="font-medium text-gray-900">{rol.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{rol.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <UserCog className="w-4 h-4" />
                  Rol personalizado (opcional)
                </label>
                <select
                  name="rol_custom_id"
                  value={formData.rol_custom_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                >
                  <option value="">Sin rol personalizado</option>
                  {rolesCustom.map(rol => (
                    <option key={rol.id} value={rol.id}>
                      {rol.nombre}
                    </option>
                  ))}
                </select>
                {rolesCustom.length === 0 && (
                  <p className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    No hay roles personalizados activos. Crea uno en Configuración → Roles.
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Los roles personalizados añaden permisos específicos adicionales al rol base.
                </p>
              </div>
            </div>
          </div>

          {/* Sección: Estado */}
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  name="activo"
                  checked={formData.activo}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-900">Usuario activo</span>
                <p className="text-xs text-gray-500">
                  Los usuarios inactivos no pueden iniciar sesión en el sistema
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <Link
            to="/usuarios"
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
          >
            Cancelar
          </Link>
          <div className="flex gap-3">
            {!esEdicion && (
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    username: '',
                    email: '',
                    password: '',
                    nombre_completo: '',
                    rol: 'operador',
                    rol_custom_id: '',
                    activo: true
                  });
                  setTouched({});
                  setError('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                Limpiar
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {esEdicion ? 'Guardar cambios' : 'Crear usuario'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}