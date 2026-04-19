// ============================================
// MILANO - Layout Component (Actualizado para JWT Robusto)
// ============================================

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../store';
import { usePermisos } from '../hooks/usePermisos';
import { ThemeToggle } from './ThemeToggle';
import {
  Bus,
  Users,
  Briefcase,
  MapPin,
  UserCircle,
  Euro,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  UsersRound,
  Shield,
} from 'lucide-react';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: Bus },
  { path: '/clientes', label: 'Clientes', icon: Users },
  { path: '/servicios', label: 'Servicios', icon: Briefcase },
  { path: '/flota', label: 'Flota', icon: Bus },
  { path: '/rutas', label: 'Rutas', icon: MapPin },
  { path: '/conductores', label: 'Conductores', icon: UserCircle },
  { path: '/facturacion', label: 'Facturación', icon: Euro },
  { path: '/costes', label: 'Costes', icon: FileText },
  { path: '/documentacion', label: 'Documentación', icon: FileText },
];

// Items de configuración/administración
const adminItems = [
  { path: '/usuarios', label: 'Usuarios', icon: UsersRound, permiso: 'usuarios.ver' },
  { path: '/configuracion', label: 'Configuración', icon: Settings },
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, logout, isAuthenticated } = useAuthStore();
  const { tienePermiso } = usePermisos();

  const handleLogout = async () => {
    await logout(); // Ahora es async y llama al backend
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex transition-colors duration-200">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-[#1e3a5f] text-white transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bus className="h-8 w-8" />
            {sidebarOpen && <span className="font-bold text-xl">MILANO</span>}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {/* Menú principal */}
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {sidebarOpen && <span className="text-sm">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Separador Admin */}
          {sidebarOpen && (
            <div className="mt-6 mb-2 px-4">
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-3 h-3" />
                Administración
              </p>
            </div>
          )}
          {!sidebarOpen && <div className="mt-6 mb-2 border-t border-white/10 mx-3"></div>}

          {/* Menú Admin */}
          <ul className="space-y-1 px-2">
            {adminItems.map((item) => {
              // Si tiene permiso definido, verificarlo
              if (item.permiso && !tienePermiso(item.permiso)) {
                return null;
              }

              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {sidebarOpen && <span className="text-sm">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Toggle Sidebar */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center justify-center w-full p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 transition-colors duration-200">
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            {[...menuItems, ...adminItems].find((item) => 
              item.path === location.pathname || location.pathname.startsWith(item.path + '/')
            )?.label || 'Dashboard'}
          </h1>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <button className="relative p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{usuario?.nombre || 'Usuario'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{usuario?.rol || 'Admin'}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8f] flex items-center justify-center text-white font-medium shadow-md">
                {(usuario?.nombre?.[0] || 'U').toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                title="Cerrar sesión"
              >
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