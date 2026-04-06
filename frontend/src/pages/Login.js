import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Bus, Lock, User, AlertCircle } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(username, password);
    if (result.success) {
      // Redirigir según el rol
      if (result.rol === 'conductor') {
        navigate('/mis-servicios');
      } else {
        navigate('/dashboard');
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <div className="login-logo">
            <Bus size={40} />
          </div>
          <h1 className="login-title">MILANO</h1>
          <p className="login-subtitle">Sistema de Gestion de Transporte</p>
        </div>

        {error && (
          <div className="login-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <User size={18} />
              <span>Usuario</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Lock size={18} />
              <span>Contrasena</span>
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Iniciando...' : 'Iniciar Sesion'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--gray-500)' }}>
          Credenciales demo: admin / admin
        </p>
      </div>
    </div>
  );
}