// ============================================
// MILANO - Router con proteccion por permisos y redireccion por rol
// ============================================

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useAuthStore } from './store';
import { usePermisos } from './hooks/usePermisos';

// Pages
import Dashboard from './pages/Dashboard';
import CRM from './pages/CRM';
import Servicios from './pages/Servicios';
import Flota from './pages/Flota';
import Rutas from './pages/Rutas';
import Conductores from './pages/Conductores';
import Facturacion from './pages/Facturacion';
import Costes from './pages/Costes';
import Comunicacion from './pages/Comunicacion';
import Configuracion from './pages/Configuracion';
import Login from './pages/Login';
import PanelConductor from './pages/PanelConductor';

// Configuracion
import { Roles } from './configuracion/roles';
import { RolForm } from './configuracion/rolForm';
import { PermisosUsuario } from './configuracion/permisosUsuario';

// Usuarios
import Usuarios from './pages/Usuarios';
import UsuarioForm from './pages/UsuarioForm';

// ============================================
// COMPONENTES DE PROTECCION DE RUTAS
// ============================================

/** Redirige si no esta autenticado */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Redirige si ya esta autenticado */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Redirige conductores al Panel Conductor, admin/operador al Dashboard */
function RoleRedirect() {
  const navigate = useNavigate();
  const { isAuthenticated, usuario } = useAuthStore();
  const { tienePermiso, loading } = usePermisos();

  useEffect(() => {
    if (!isAuthenticated) return;
    if (loading) return;

    // Si es conductor (solo tiene panel_conductor), ir a panel
    if (tienePermiso('panel_conductor.ver') && !tienePermiso('dashboard.ver')) {
      navigate('/panel-conductor', { replace: true });
    }
    // Si no, quedarse en dashboard (ruta /)
  }, [isAuthenticated, loading, tienePermiso, navigate]);

  return <Dashboard />;
}

/** Ruta protegida por permiso especifico */
function PermissionRoute({ permiso, children }: { permiso: string; children: React.ReactNode }) {
  const { loading, tienePermiso } = usePermisos();
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#1e3a5f] dark:border-blue-400" />
      </div>
    );
  }
  if (!tienePermiso(permiso)) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Acceso denegado</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">No tienes permiso para ver esta pagina.</p>
        <Navigate to="/" replace />
      </div>
    );
  }
  return <>{children}</>;
}

// ============================================
// MAPA DE PERMISOS POR RUTA
// ============================================

const ROUTE_PERMISSIONS: Record<string, string> = {
  '/': 'dashboard.ver',
  '/clientes': 'clientes.ver',
  '/servicios': 'servicios.ver',
  '/flota': 'vehiculos.ver',
  '/rutas': 'servicios.ver',
  '/conductores': 'conductores.ver',
  '/facturacion': 'facturacion.ver',
  '/costes': 'configuracion.ver',
  '/comunicacion': 'dashboard.ver',
  '/usuarios': 'usuarios.ver',
  '/configuracion': 'configuracion.ver',
};

/** Wrapper que aplica permiso a una pagina segun la ruta actual */
function PermissionWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const permiso = ROUTE_PERMISSIONS[location.pathname];
  
  // Si la ruta no tiene permiso definido, mostrar directamente
  if (!permiso) return <>{children}</>;
  
  return <PermissionRoute permiso={permiso}>{children}</PermissionRoute>;
}

import { useLocation } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta publica - Login */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        
        {/* Ruta publica - Panel Conductor (accesible directamente) */}
        <Route path="/panel-conductor" element={<PanelConductor />} />
        
        {/* Rutas protegidas con Layout */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<RoleRedirect />} />
          <Route path="clientes" element={<PermissionRoute permiso="clientes.ver"><CRM /></PermissionRoute>} />
          <Route path="servicios" element={<PermissionRoute permiso="servicios.ver"><Servicios /></PermissionRoute>} />
          <Route path="flota" element={<PermissionRoute permiso="vehiculos.ver"><Flota /></PermissionRoute>} />
          <Route path="rutas" element={<PermissionRoute permiso="servicios.ver"><Rutas /></PermissionRoute>} />
          <Route path="conductores" element={<PermissionRoute permiso="conductores.ver"><Conductores /></PermissionRoute>} />
          <Route path="facturacion" element={<PermissionRoute permiso="facturacion.ver"><Facturacion /></PermissionRoute>} />
          <Route path="costes" element={<PermissionRoute permiso="configuracion.ver"><Costes /></PermissionRoute>} />
          <Route path="comunicacion" element={<PermissionRoute permiso="dashboard.ver"><Comunicacion /></PermissionRoute>} />
          <Route path="usuarios" element={<PermissionRoute permiso="usuarios.ver"><Usuarios /></PermissionRoute>} />
          <Route path="usuarios/nuevo" element={<PermissionRoute permiso="usuarios.crear"><UsuarioForm /></PermissionRoute>} />
          <Route path="usuarios/:id/editar" element={<PermissionRoute permiso="usuarios.editar"><UsuarioForm /></PermissionRoute>} />
          <Route path="configuracion" element={<PermissionRoute permiso="configuracion.ver"><Configuracion /></PermissionRoute>}>
            <Route index element={<Navigate to="/configuracion/roles" replace />} />
            <Route path="roles" element={<Roles />} />
            <Route path="roles/nuevo" element={<RolForm />} />
            <Route path="roles/:id/editar" element={<RolForm />} />
            <Route path="usuarios/:userId/permisos" element={<PermisosUsuario />} />
          </Route>
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
