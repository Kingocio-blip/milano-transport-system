import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LayoutDashboard, Users, Bus, UserCheck, ClipboardList, FileText, LogOut, Bell, Settings, Menu } from 'lucide-react';

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/clientes', icon: Users, label: 'Clientes' },
  { path: '/vehiculos', icon: Bus, label: 'Vehiculos' },
  { path: '/conductores', icon: UserCheck, label: 'Conductores' },
  { path: '/servicios', icon: ClipboardList, label: 'Servicios' },
  { path: '/facturas', icon: FileText, label: 'Facturas' },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Bus size={28} />
            <span className="sidebar-title">MILANO</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="sidebar-logout" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Cerrar Sesion</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="header">
          <button className="menu-toggle">
            <Menu size={24} />
          </button>
          <div className="header-right">
            <button className="header-button">
              <Bell size={20} />
              <span className="badge">3</span>
            </button>
            <button className="header-button">
              <Settings size={20} />
            </button>
            <div className="user-menu">
              <div className="user-avatar">{user?.nombre?.[0] || 'A'}</div>
              <span className="user-name">{user?.nombre || 'Admin'}</span>
            </div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}