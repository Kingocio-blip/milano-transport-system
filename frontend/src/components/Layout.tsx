// ============================================
// MILANO - Layout Component
// ============================================

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useUsuarioStore } from '../store';
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
  ChevronDown,
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
  { path: '/configuracion', label: 'Configuración', icon: Settings },
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, logout } = useUsuarioStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
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
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
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
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <h1 className="text-xl font-semibold text-slate-800">
            {menuItems.find((item) => item.path === location.pathname)?.label || 'Dashboard'}
          </h1>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="relative p-2 text-slate-500 hover:text-slate-700 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-700">{usuario?.nombre || 'Usuario'}</p>
                <p className="text-xs text-slate-500">{usuario?.rol || 'Admin'}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-medium">
                {(usuario?.nombre?.[0] || 'U').toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-red-600 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}