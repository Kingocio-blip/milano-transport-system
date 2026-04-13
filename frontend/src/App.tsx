// ============================================
// MILANO - Sistema de Gestión de Transporte
// Main App Component (Con API Backend)
// ============================================

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useUsuarioStore } from './store';

// Pages
import Dashboard from './pages/Dashboard';
import CRM from './pages/CRM';
import Servicios from './pages/Servicios';
import Flota from './pages/Flota';
import Rutas from './pages/Rutas';
import Conductores from './pages/Conductores';
import Facturacion from './pages/Facturacion';
import Costes from './pages/Costes';
import Documentacion from './pages/Documentacion';
import Configuracion from './pages/Configuracion';
import Login from './pages/Login';
import PanelConductor from './pages/PanelConductor';

// Componente para proteger rutas
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useUsuarioStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Componente para redirigir si ya está autenticado
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useUsuarioStore();
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública - Login */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        
        {/* Ruta pública - Panel Conductor */}
        <Route 
          path="/panel-conductor" 
          element={<PanelConductor />} 
        />
        
        {/* Rutas protegidas con Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="clientes" element={<CRM />} />
          <Route path="servicios" element={<Servicios />} />
          <Route path="flota" element={<Flota />} />
          <Route path="rutas" element={<Rutas />} />
          <Route path="conductores" element={<Conductores />} />
          <Route path="facturacion" element={<Facturacion />} />
          <Route path="costes" element={<Costes />} />
          <Route path="documentacion" element={<Documentacion />} />
          <Route path="configuracion" element={<Configuracion />} />
        </Route>
        
        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;