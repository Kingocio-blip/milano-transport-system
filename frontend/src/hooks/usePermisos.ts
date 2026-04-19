import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';

// Cache global para evitar múltiples llamadas
let permisosCache: string[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60000; // 1 minuto

export function usePermisos() {
  const [permisos, setPermisos] = useState<string[]>(permisosCache || []);
  const [loading, setLoading] = useState(!permisosCache);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Si ya hay cache válido, no recargar
    if (permisosCache && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
      setPermisos(permisosCache);
      setLoading(false);
      return;
    }

    // Evitar doble fetch en StrictMode
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    cargarPermisos();
  }, []);

  const cargarPermisos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/permissions');
      
      let listaPermisos: string[] = [];
      
      if (response && typeof response === 'object' && Array.isArray(response.permisos)) {
        listaPermisos = response.permisos;
      }
      
      // Guardar en cache global
      permisosCache = listaPermisos;
      cacheTimestamp = Date.now();
      
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
    if (permisos.includes('admin.todo')) return true;
    if (permisos.includes(codigo)) return true;
    
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

  const recargar = useCallback(() => {
    permisosCache = null;
    fetchedRef.current = false;
    cargarPermisos();
  }, []);

  return {
    permisos,
    loading,
    error,
    tienePermiso,
    tieneAlguno,
    tieneTodos,
    recargar
  };
}

export function useProtegerPermiso(codigo: string) {
  const { tienePermiso, loading } = usePermisos();
  return {
    permitido: tienePermiso(codigo),
    loading
  };
}