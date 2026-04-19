// ============================================
// MILANO - Login Page (Rediseñado)
// Moderno, animado, con dark mode
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Bus, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store';

export default function Login() {
  const navigate = useNavigate();
  const { login, error: authError, clearError } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    clearError();
    setIsLoading(true);

    try {
      const success = await login(username, password);
      if (success) {
        navigate('/');
      } else {
        setError(authError || 'Error al iniciar sesion');
      }
    } catch (err: any) {
      setError(err.message || 'Usuario o contraseña incorrectos');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#0f172a] to-[#1e3a5f] dark:from-black dark:via-slate-950 dark:to-slate-900">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-[#1e3a5f]/5 blur-3xl" />
      </div>

      {/* Card */}
      <div
        className={`w-full max-w-md px-4 transition-all duration-700 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#3b82f6] shadow-lg shadow-blue-500/25">
              <Bus className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              MILANO Transport
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Sistema de Gestion de Transporte
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {(error || authError) && (
              <Alert variant="destructive" className="text-sm dark:border-red-800 dark:bg-red-900/20">
                <AlertDescription>{error || authError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-700 dark:text-slate-300">Usuario</Label>
              <Input
                id="username"
                type="text"
                placeholder="Nombre de usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-11 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">Contrasena</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Contrasena"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-[#1e3a5f] hover:bg-[#152a45] dark:bg-blue-600 dark:hover:bg-blue-700 text-base font-semibold shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesion...
                </>
              ) : (
                'Iniciar Sesion'
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Conexion segura con encriptacion SSL</span>
          </div>
        </div>

        {/* Version */}
        <p className="text-center text-xs text-slate-500/60 dark:text-slate-600 mt-6">
          MILANO Transport v2.0
        </p>
      </div>
    </div>
  );
}
