// ============================================
// MILANO - Layout con menu filtrado por permisos
// ============================================

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../store';
import { usePermisos } from '../hooks/usePermisos';
import { ThemeToggle } from './ThemeToggle';
import {
  Bus, Users, Briefcase, MapPin, UserCircle, Euro,
  FileText, Settings, LogOut, Menu, X, Bell,
  UsersRound, Shield,
} from 'lucide-react';

// Items del menu con permiso requerido
interface MenuItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permiso?: string;
}

const menuItems: MenuItem[] = [
  { path: '/', label: 'Dashboard', icon: Bus, permiso: 'dashboard.ver' },
  { path: '/clientes', label: 'Clientes', icon: Users, permiso: 'clientes.ver' },
  { path: '/servicios', label: 'Servicios', icon: Briefcase, permiso: 'servicios.ver' },
  { path: '/flota', label: 'Flota', icon: Bus, permiso: 'vehiculos.ver' },
  { path: '/rutas', label: 'Rutas', icon: MapPin, permiso: 'servicios.ver' },
  { path: '/conductores', label: 'Conductores', icon: UserCircle, permiso: 'conductores.ver' },
  { path: '/facturacion', label: 'Facturacion', icon: Euro, permiso: 'facturacion.ver' },
  { path: '/costes', label: 'Costes', icon: FileText, permiso: 'configuracion.ver' },
  { path: '/documentacion', label: 'Documentacion', icon: FileText, permiso: 'configuracion.ver' },
];

const adminItems: MenuItem[] = [
  { path: '/usuarios', label: 'Usuarios', icon: UsersRound, permiso: 'usuarios.ver' },
  { path: '/configuracion', label: 'Configuracion', icon: Settings, permiso: 'configuracion.ver' },
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, logout } = useAuthStore();
  const { tienePermiso, loading: permisosLoading } = usePermisos();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Filtrar items segun permisos
  const visibleMenu = menuItems.filter(item => {
    if (!item.permiso) return true;
    return tienePermiso(item.permiso);
  });

  const visibleAdmin = adminItems.filter(item => {
    if (!item.permiso) return true;
    return tienePermiso(item.permiso);
  });

  // Si es conductor puro (solo panel_conductor), redirigir
  if (!permisosLoading && tienePermiso('panel_conductor.ver') && !tienePermiso('dashboard.ver')) {
    navigate('/panel-conductor', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex transition-colors duration-200">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-[#1e3a5f] text-white transition-all duration-300 flex flex-col flex-shrink-0`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bus className="h-8 w-8" />
            {sidebarOpen && <span className="font-bold text-xl">MILANO</span>}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {/* Menu principal - filtrado por permisos */}
          {visibleMenu.length > 0 && (
            <ul className="space-y-1 px-2">
              {visibleMenu.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <li key={item.path}>
                    <Link to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        active ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}>
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {sidebarOpen && <span className="text-sm">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Admin section - solo si hay items visibles */}
          {visibleAdmin.length > 0 && (
            <>
              {sidebarOpen ? (
                <div className="mt-6 mb-2 px-4">
                  <p className="text-xs font-medium text-white/40 uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-3 h-3" />Administracion
                  </p>
                </div>
              ) : (
                <div className="mt-6 mb-2 border-t border-white/10 mx-3" />
              )}
              <ul className="space-y-1 px-2">
                {visibleAdmin.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <li key={item.path}>
                      <Link to={item.path}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          active ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}>
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        {sidebarOpen && <span className="text-sm">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </nav>

        {/* Footer sidebar */}
        <div className="p-4 border-t border-white/10 space-y-2">
          {/* Panel Conductor link (solo si tiene permiso) */}
          {tienePermiso('panel_conductor.ver') && (
            <Link to="/panel-conductor"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive('/panel-conductor') ? 'bg-green-500/30 text-green-300' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}>
              <UserCircle className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm">Panel Conductor</span>}
            </Link>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center justify-center w-full p-2 rounded-lg hover:bg-white/10 transition-colors">
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 transition-colors duration-200">
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            {[...visibleMenu, ...visibleAdmin].find((item) =>
              item.path === location.pathname || location.pathname.startsWith(item.path + '/')
            )?.label || 'Dashboard'}
          </h1>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button className="relative p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{usuario?.nombre || 'Usuario'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{usuario?.rol || 'Admin'}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8f] flex items-center justify-center text-white font-medium shadow-md">
                {(usuario?.nombre?.[0] || 'U').toUpperCase()}
              </div>
              <button onClick={handleLogout}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                title="Cerrar sesion">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
