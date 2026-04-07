import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';
import { 
  LayoutDashboard, 
  Users, 
  UserCircle, 
  Bus, 
  Calendar, 
  FileText, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import './Layout.css';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/clientes', label: 'Clientes', icon: Users },
    { path: '/conductores', label: 'Conductores', icon: UserCircle },
    { path: '/vehiculos', label: 'Vehículos', icon: Bus },
    { path: '/servicios', label: 'Servicios', icon: Calendar },
    { path: '/facturas', label: 'Facturas', icon: FileText },
  ];

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>MILANO</h2>
          <button 
            className="close-sidebar"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={24} />
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="sidebar-footer">
          <div className="user-info">
            <span>{user?.username || 'Usuario'}</span>
            <small>{user?.role || 'Admin'}</small>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={20} />
            <span>Salir</span>
          </button>
        </div>
      </aside>

      {/* Overlay para móvil */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="main-content">
        <header className="top-header">
          <button 
            className="menu-toggle"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <h1>{menuItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}</h1>
        </header>
        
        <div className="content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;