import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Conductores from './pages/Conductores';
import Vehiculos from './pages/Vehiculos';
import Servicios from './pages/Servicios';
import Facturas from './pages/Facturas';
import PanelConductor from './pages/PanelConductor';
import './App.css';

// Componente para proteger rutas de admin
const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (user?.role === 'conductor') {
    return <Navigate to="/conductor/mis-servicios" replace />;
  }
  
  return <Layout>{children}</Layout>;
};

// Componente para proteger rutas de conductor
const ConductorRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? (
            user?.role === 'conductor' ? (
              <Navigate to="/conductor/mis-servicios" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          ) : (
            <Login />
          )
        } />
        
        {/* Rutas de Admin */}
        <Route path="/dashboard" element={
          <AdminRoute>
            <Dashboard />
          </AdminRoute>
        } />
        
        <Route path="/clientes" element={
          <AdminRoute>
            <Clientes />
          </AdminRoute>
        } />
        
        <Route path="/conductores" element={
          <AdminRoute>
            <Conductores />
          </AdminRoute>
        } />
        
        <Route path="/vehiculos" element={
          <AdminRoute>
            <Vehiculos />
          </AdminRoute>
        } />
        
        <Route path="/servicios" element={
          <AdminRoute>
            <Servicios />
          </AdminRoute>
        } />
        
        <Route path="/facturas" element={
          <AdminRoute>
            <Facturas />
          </AdminRoute>
        } />
        
        {/* Ruta de Conductor */}
        <Route path="/conductor/mis-servicios" element={
          <ConductorRoute>
            <PanelConductor />
          </ConductorRoute>
        } />
        
        {/* Redirección por defecto */}
        <Route path="/" element={
          isAuthenticated ? (
            user?.role === 'conductor' ? (
              <Navigate to="/conductor/mis-servicios" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        } />
        
        {/* Ruta 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;