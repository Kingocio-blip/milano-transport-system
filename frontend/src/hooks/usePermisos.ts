import { useState, useEffect, useCallback } from 'react';
import { UserPermissionsResponse } from '@/types/permisos';
import { api } from '@/lib/api';

export function usePermisos() {
  const [permisos, setPermisos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarPermisos();
  }, []);

  const cargarPermisos = async () => {
    try {
      setLoading(true);
      const response = await api.get<UserPermissionsResponse>('/auth/permissions');
      setPermisos(response.data.permisos);
      setError(null);
    } catch (err) {
      setError('Error cargando permisos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const tienePermiso = useCallback((codigo: string): boolean => {
    if (permisos.includes('admin.todo')) return true;
    if (permisos.includes(codigo)) return true;
    const partes = codigo.split('.');
    const categoria = partes[0];
    if (permisos.includes(`${categoria}.*`)) return true;
    return false;
  }, [permisos]);

  const tieneAlguno = useCallback((codigos: string[]): boolean => {
    return codigos.some(codigo => tienePermiso(codigo));
  }, [tienePermiso]);

  const tieneTodos = useCallback((codigos: string[]): boolean => {
    return codigos.every(codigo => tienePermiso(codigo));
  }, [tienePermiso]);

  return {
    permisos,
    loading,
    error,
    tienePermiso,
    tieneAlguno,
    tieneTodos,
    recargar: cargarPermisos
  };
}

export function useProtegerPermiso(codigo: string) {
  const { tienePermiso, loading } = usePermisos();
  return {
    permitido: tienePermiso(codigo),
    loading
  };
}