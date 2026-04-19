import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface PermisosResponse {
  permisos: string[];
}

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
      const response = await api.get('/auth/permissions');
      
      // La API devuelve: { user_id, username, rol, rol_custom, permisos: [...] }
      let listaPermisos: string[] = [];
      
      if (response && typeof response === 'object') {
        if (Array.isArray(response.permisos)) {
          listaPermisos = response.permisos;
        }
      }
      
      setPermisos(listaPermisos);
      setError(null);
    } catch (err) {
      setError('Error cargando permisos');
      console.error('Error en cargarPermisos:', err);
      setPermisos([]);
    } finally {
      setLoading(false);
    }
  };

  const tienePermiso = useCallback((codigo: string): boolean => {
    if (!codigo) return false;
    
    // SUPER ADMIN: si tiene admin.todo, puede hacer TODO
    if (permisos.includes('admin.todo')) return true;
    
    // Verificar permiso específico
    if (permisos.includes(codigo)) return true;
    
    // Verificar wildcard de categoría (ej: "usuarios.*")
    const partes = codigo.split('.');
    const categoria = partes[0];
    if (permisos.includes(`${categoria}.*`)) return true;
    
    return false;
  }, [permisos]);

  const tieneAlguno = useCallback((codigos: string[]): boolean => {
    if (!codigos || !Array.isArray(codigos)) return false;
    return codigos.some(codigo => tienePermiso(codigo));
  }, [tienePermiso]);

  const tieneTodos = useCallback((codigos: string[]): boolean => {
    if (!codigos || !Array.isArray(codigos)) return false;
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