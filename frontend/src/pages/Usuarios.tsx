// ============================================
// MILANO - Usuarios (Rediseñado)
// Stats, cards/list toggle, dark mode, filtros
// ============================================

import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { usePermisos } from '../hooks/usePermisos';
import { SkeletonPage } from '../components/LoadingScreen';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Plus, Search, Edit2, Trash2, User, AlertCircle, Mail, Shield,
  Users, CheckCircle2, XCircle, LayoutGrid, List, Loader2,
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
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  gerente: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  operador: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  conductor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

const ROLES_LABELS: Record<string, string> = {
  admin: 'Administrador', gerente: 'Gerente', operador: 'Operador', conductor: 'Conductor',
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [usuarioEliminar, setUsuarioEliminar] = useState<Usuario | null>(null);
  const [filtroRol, setFiltroRol] = useState<string>('todos');
  const [vistaMode, setVistaMode] = useState<'cards' | 'lista'>('lista');

  const permisosHook = usePermisos();
  const navigate = useNavigate();

  const tienePermisoFn = typeof permisosHook?.tienePermiso === 'function'
    ? permisosHook.tienePermiso : () => false;
  const permisosArray = Array.isArray(permisosHook?.permisos) ? permisosHook.permisos : [];
  const permisosLoading = !!permisosHook?.loading;

  const puedeVer = tienePermisoFn('usuarios.ver');
  const puedeCrear = tienePermisoFn('usuarios.crear') || permisosArray.includes('admin.todo');
  const puedeEditar = tienePermisoFn('usuarios.editar') || permisosArray.includes('admin.todo');
  const puedeEliminar = tienePermisoFn('usuarios.eliminar') || permisosArray.includes('admin.todo');

  useEffect(() => { cargarUsuarios(); }, []);

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      const data = response.data || response;
      setUsuarios(Array.isArray(data) ? data : []);
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
      setUsuarios(prev => prev.filter(u => u.id !== id));
      setUsuarioEliminar(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al eliminar usuario');
    }
  };

  const handleEditarUsuario = (id: number) => navigate(`/usuarios/${id}/editar`);
  const handleNuevoUsuario = () => navigate('/usuarios/nuevo');

  // Filtrados
  const filtrados = useMemo(() => {
    if (!Array.isArray(usuarios)) return [];
    const term = (searchTerm || '').toLowerCase();
    return usuarios.filter(u => {
      if (!u) return false;
      const matchSearch = !term ||
        (u.username || '').toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term) ||
        (u.nombre_completo || '').toLowerCase().includes(term);
      const matchRol = filtroRol === 'todos' || u.rol === filtroRol;
      return matchSearch && matchRol;
    });
  }, [usuarios, searchTerm, filtroRol]);

  // Stats
  const stats = useMemo(() => ({
    total: usuarios.length,
    activos: usuarios.filter(u => u.activo).length,
    inactivos: usuarios.filter(u => !u.activo).length,
    roles: {} as Record<string, number>,
  }), [usuarios]);

  // Contar por rol
  usuarios.forEach(u => { stats.roles[u.rol] = (stats.roles[u.rol] || 0) + 1; });

  const rolesDisponibles = ['admin', 'gerente', 'operador', 'conductor'];

  if (!puedeVer && !permisosLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="rounded-xl border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-6">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Acceso denegado</h3>
          <p className="text-red-600 dark:text-red-400 mb-4">No tienes permiso para ver esta seccion.</p>
          <Button onClick={() => navigate('/')} variant="destructive">Volver al Dashboard</Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <SkeletonPage type="mixed" tableCols={5} vistaMode={vistaMode} />;
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Usuarios</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Gestion de accesos y roles</p>
        </div>
        {puedeCrear && (
          <Button onClick={handleNuevoUsuario} className="bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600 dark:hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Nuevo Usuario
          </Button>
        )}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Usuarios', value: stats.total, icon: Users, color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' },
          { label: 'Activos', value: stats.activos, icon: CheckCircle2, color: 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400' },
          { label: 'Inactivos', value: stats.inactivos, icon: XCircle, color: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' },
          { label: 'Admin', value: stats.roles['admin'] || 0, icon: Shield, color: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center gap-3">
            <div className={`rounded-lg p-2.5 ${s.color}`}><s.icon className="h-5 w-5" /></div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{s.value}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Roles mini-stats */}
      {rolesDisponibles.filter(r => stats.roles[r]).length > 0 && (
        <div className="flex flex-wrap gap-3">
          {rolesDisponibles.filter(r => stats.roles[r]).map(rol => (
            <div key={rol} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 flex items-center gap-2">
              <Badge className={ROLES_COLORS[rol] || ''}>{ROLES_LABELS[rol] || rol}</Badge>
              <span className="text-sm font-medium dark:text-slate-200">{stats.roles[rol] || 0}</span>
            </div>
          ))}
        </div>
      )}

      {/* FILTROS */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar por nombre, email o usuario..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 dark:bg-slate-900 dark:border-slate-700" />
        </div>
        <div className="flex gap-2">
          <Select value={filtroRol} onValueChange={setFiltroRol}>
            <SelectTrigger className="w-[160px] dark:bg-slate-900 dark:border-slate-700"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los roles</SelectItem>
              {rolesDisponibles.map(rol => (
                <SelectItem key={rol} value={rol}>{ROLES_LABELS[rol] || rol}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex border rounded-lg overflow-hidden dark:border-slate-700">
            <button onClick={() => setVistaMode('cards')}
              className={`p-2 ${vistaMode === 'cards' ? 'bg-[#1e3a5f] text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}>
              <LayoutGrid className="h-4 w-4" /></button>
            <button onClick={() => setVistaMode('lista')}
              className={`p-2 ${vistaMode === 'lista' ? 'bg-[#1e3a5f] text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}>
              <List className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-4 flex items-center text-red-700 dark:text-red-300">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <Button variant="link" onClick={cargarUsuarios} className="text-red-600 dark:text-red-400">Reintentar</Button>
        </div>
      )}

      {/* VISTA LISTA */}
      {vistaMode === 'lista' ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Usuario</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Contacto</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Rol</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-500 dark:text-slate-400">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtrados.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-400 dark:text-slate-500">
                    <User className="h-10 w-10 mx-auto mb-2" /><p className="text-sm">No se encontraron usuarios</p>
                  </td></tr>
                ) : filtrados.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#1e3a5f] dark:bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                          {(u.nombre_completo || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium dark:text-slate-200">{u.nombre_completo || 'Sin nombre'}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">@{u.username || 'unknown'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <Mail className="h-3.5 w-3.5" />{u.email || 'Sin email'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={ROLES_COLORS[u.rol] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}>
                        <Shield className="w-3 h-3 mr-1" />{ROLES_LABELS[u.rol] || u.rol}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={u.activo
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${u.activo ? 'bg-green-500' : 'bg-red-500'}`} />
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        {puedeEditar && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditarUsuario(u.id)}>
                            <Edit2 className="h-3.5 w-3.5" /></Button>
                        )}
                        {puedeEliminar && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setUsuarioEliminar(u)}>
                            <Trash2 className="h-3.5 w-3.5" /></Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtrados.length > 0 && (
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex justify-between">
              <span>{`${filtrados.length} usuario${filtrados.length !== 1 ? 's' : ''}`}</span>
              <span>{`Total: ${usuarios.length}`}</span>
            </div>
          )}
        </div>
      ) : (
        /* VISTA CARDS */
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.length === 0 ? (
            <div className="col-span-full flex flex-col items-center py-16 text-slate-400 dark:text-slate-500">
              <User className="h-12 w-12 mb-3" /><p className="text-sm">No se encontraron usuarios</p>
            </div>
          ) : filtrados.map(u => (
            <div key={u.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1e3a5f] dark:bg-blue-600 flex items-center justify-center text-white font-bold">
                    {(u.nombre_completo || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold dark:text-slate-100">{u.nombre_completo || 'Sin nombre'}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">@{u.username}</p>
                  </div>
                </div>
                <Badge className={u.activo
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}>
                  {u.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400 mb-3">
                <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{u.email || 'Sin email'}</p>
                <p className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />{ROLES_LABELS[u.rol] || u.rol}</p>
              </div>
              <div className="flex gap-1 justify-end pt-3 border-t border-slate-100 dark:border-slate-700">
                {puedeEditar && (
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditarUsuario(u.id)}>
                    <Edit2 className="h-3.5 w-3.5" /></Button>
                )}
                {puedeEliminar && (
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setUsuarioEliminar(u)}>
                    <Trash2 className="h-3.5 w-3.5" /></Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DIALOG: CONFIRMAR ELIMINACION */}
      <Dialog open={!!usuarioEliminar} onOpenChange={() => setUsuarioEliminar(null)}>
        <DialogContent className="dark:border-slate-700 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />Eliminar usuario
            </DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              {`Estas seguro de eliminar a ${usuarioEliminar?.nombre_completo || ''}? Esta accion no se puede deshacer.`}
            </DialogDescription>
          </DialogHeader>
          {usuarioEliminar && (
            <div className="py-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {`Usuario: @${usuarioEliminar.username} • Email: ${usuarioEliminar.email}`}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUsuarioEliminar(null)} className="dark:border-slate-600 dark:text-slate-300">
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => usuarioEliminar && handleEliminar(usuarioEliminar.id)}>
              Eliminar usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
