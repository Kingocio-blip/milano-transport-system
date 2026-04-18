import React from 'react';
import { Check, X, AlertCircle, Shield } from 'lucide-react';

interface PermisosBadgeProps {
  codigo: string;
  tienePermiso: boolean;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function PermisosBadge({ 
  codigo, 
  tienePermiso, 
  size = 'md',
  showIcon = true 
}: PermisosBadgeProps) {
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  if (tienePermiso) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 font-medium ${sizeClasses[size]}`}>
        {showIcon && <Check size={iconSizes[size]} />}
        <span>Permitido</span>
      </span>
    );
  }

  // Si es un permiso negado explícitamente (empieza con !)
  if (codigo.startsWith('!')) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-red-100 text-red-800 font-medium ${sizeClasses[size]}`}>
        {showIcon && <AlertCircle size={iconSizes[size]} />}
        <span>Denegado</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-600 font-medium ${sizeClasses[size]}`}>
      {showIcon && <X size={iconSizes[size]} />}
      <span>No permitido</span>
    </span>
  );
}

// Badge para mostrar el rol del usuario
interface RolBadgeProps {
  rol: string;
  esSistema?: boolean;
}

export function RolBadge({ rol, esSistema = false }: RolBadgeProps) {
  const colores: Record<string, string> = {
    'admin': 'bg-purple-100 text-purple-800',
    'gerente': 'bg-blue-100 text-blue-800',
    'operador': 'bg-green-100 text-green-800',
    'conductor': 'bg-orange-100 text-orange-800',
    'default': 'bg-gray-100 text-gray-800'
  };

  const color = colores[rol.toLowerCase()] || colores.default;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${color}`}>
      {esSistema && <Shield size={14} />}
      <span className="capitalize">{rol}</span>
      {esSistema && <span className="text-xs opacity-75">(Sistema)</span>}
    </span>
  );
}

// Lista compacta de permisos
interface PermisosListaProps {
  permisos: string[];
  maxMostrar?: number;
}

export function PermisosLista({ permisos, maxMostrar = 5 }: PermisosListaProps) {
  const mostrados = permisos.slice(0, maxMostrar);
  const restantes = permisos.length - maxMostrar;

  return (
    <div className="flex flex-wrap gap-1">
      {mostrados.map((permiso, idx) => (
        <span 
          key={idx}
          className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100"
          title={permiso}
        >
          {permiso.length > 20 ? permiso.substring(0, 20) + '...' : permiso}
        </span>
      ))}
      {restantes > 0 && (
        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
          +{restantes} más
        </span>
      )}
      {permisos.length === 0 && (
        <span className="text-gray-400 text-sm italic">Sin permisos asignados</span>
      )}
    </div>
  );
}
