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
      
      // DEBUG: Ver qué devuelve la API
      console.log('Respuesta permisos:', response);
      console.log('Tipo:', typeof response);
      console.log('Es array?', Array.isArray(response));
      
      // La API puede devolver: { permisos: [...] } o directamente [...]
      let listaPermisos: string[] = [];
      
      if (Array.isArray(response)) {
        // Si devuelve array directo
        listaPermisos = response;
      } else if (response && typeof response === 'object') {
        // Si devuelve objeto con propiedad permisos
        if (Array.isArray(response.permisos)) {
          listaPermisos = response.permisos;
        } else if (Array.isArray(response.data?.permisos)) {
          // Si viene anidado en data
          listaPermisos = response.data.permisos;
        } else {
          // Intentar encontrar un array en el objeto
          const posibleArray = Object.values(response).find(v => Array.isArray(v));
          if (posibleArray) {
            listaPermisos = posibleArray as string[];
          }
        }
      }
      
      console.log('Permisos extraídos:', listaPermisos);
      setPermisos(listaPermisos);
      setError(null);
    } catch (err) {
      setError('Error cargando permisos');
      console.error('Error en cargarPermisos:', err);
      setPermisos([]); // Asegurar que sea array vacío en error
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