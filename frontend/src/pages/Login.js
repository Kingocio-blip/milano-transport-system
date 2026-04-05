import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Bus, Lock, Mail, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(email, password);
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
              <Mail size={18} />
              <span>Email</span>
            </label>
            <input
              type="email"
              className="form-input"
              placeholder="admin@milano.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? 'Iniciando...' : 'Iniciar Sesion'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--gray-500)' }}>
          Credenciales demo: admin@milano.com / admin123
        </p>
      </div>
    </div>
  );
}