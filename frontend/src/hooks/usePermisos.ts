// ============================================
// MILANO - Hook de Permisos (Optimizado con Auth Store)
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store';

// Cache global para evitar múltiples llamadas
let permisosCache: string[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60000; // 1 minuto

export function usePermisos() {
  const { permisos: permisosStore, fetchPermissions, isAuthenticated } = useAuthStore();
  const [permisos, setPermisos] = useState<string[]>(permisosCache || permisosStore || []);
  const [loading, setLoading] = useState(!permisosCache && permisosStore.length === 0);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Si no está autenticado, no cargar permisos
    if (!isAuthenticated) {
      setPermisos([]);
      setLoading(false);
      return;
    }

    // Si ya hay cache válido, usarlo
    if (permisosCache && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
      setPermisos(permisosCache);
      setLoading(false);
      return;
    }

    // Si el store ya tiene permisos, usarlos
    if (permisosStore.length > 0) {
      setPermisos(permisosStore);
      permisosCache = permisosStore;
      cacheTimestamp = Date.now();
      setLoading(false);
      return;
    }

    // Evitar doble fetch en StrictMode
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    cargarPermisos();
  }, [isAuthenticated, permisosStore]);

  const cargarPermisos = async () => {
    try {
      setLoading(true);
      await fetchPermissions();
      // Los permisos se actualizan en el store y el useEffect los sincronizará
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
    const permisosActuales = permisos.length > 0 ? permisos : permisosStore;
    
    if (permisosActuales.includes('admin.todo')) return true;
    if (permisosActuales.includes(codigo)) return true;
    
    const partes = codigo.split('.');
    const categoria = partes[0];
    if (permisosActuales.includes(`${categoria}.*`)) return true;
    
    return false;
  }, [permisos, permisosStore]);

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
    cacheTimestamp = 0;
    fetchedRef.current = false;
    cargarPermisos();
  }, []);

  return {
    permisos: permisos.length > 0 ? permisos : permisosStore,
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