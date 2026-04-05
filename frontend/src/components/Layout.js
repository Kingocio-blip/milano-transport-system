import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LayoutDashboard, Users, Bus, UserCheck, ClipboardList, FileText, LogOut, Menu } from 'lucide-react';

const menuItemsAdmin = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/clientes', icon: Users, label: 'Clientes' },
  { path: '/vehiculos', icon: Bus, label: 'Vehiculos' },
  { path: '/conductores', icon: UserCheck, label: 'Conductores' },
  { path: '/servicios', icon: ClipboardList, label: 'Servicios' },
  { path: '/facturas', icon: FileText, label: 'Facturas' },
];

const menuItemsConductor = [
  { path: '/mis-servicios', icon: ClipboardList, label: 'Mis Servicios' },
];

export default function Layout() {
  const { user, rol, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = rol === 'conductor' ? menuItemsConductor : menuItemsAdmin;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Bus size={28} />
            <span className="sidebar-title">MILANO</span>
          </div>
          {rol === 'conductor' && (
            <p style={{fontSize: '12px', color: '#6b7280', marginTop: '5px'}}>
              Panel de Conductor
            </p>
          )}
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path} 
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
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
            <div className="user-menu">
              <div className="user-avatar">{user?.nombre?.[0] || 'U'}</div>
              <span className="user-name">{user?.nombre || 'Usuario'}</span>
              <span style={{fontSize: '12px', color: '#6b7280', marginLeft: '8px'}}>
                ({rol === 'conductor' ? 'Conductor' : 'Administrador'})
              </span>
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