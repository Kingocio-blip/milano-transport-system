import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Vehiculos from './pages/Vehiculos';
import Conductores from './pages/Conductores';
import Servicios from './pages/Servicios';
import Facturas from './pages/Facturas';
import PanelConductor from './pages/PanelConductor';

function App() {
  const { token, rol, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Si no hay token, mostrar login
  if (!token) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    );
  }

  // Si es conductor, mostrar solo su panel
  if (rol === 'conductor') {
    return (
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/mis-servicios" />} />
            <Route path="mis-servicios" element={<PanelConductor />} />
            <Route path="*" element={<Navigate to="/mis-servicios" />} />
          </Route>
        </Routes>
      </Router>
    );
  }

  // Si es admin, mostrar todo
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="vehiculos" element={<Vehiculos />} />
          <Route path="conductores" element={<Conductores />} />
          <Route path="servicios" element={<Servicios />} />
          <Route path="facturas" element={<Facturas />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;