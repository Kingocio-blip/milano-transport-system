// ============================================
// MILANO - Documentación Page (OPTIMIZADO)
// ============================================

import { useState, useMemo } from 'react';
import { useClientesStore, useVehiculosStore, useConductoresStore, useServiciosStore } from '../store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  FileArchive,
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  Search,
  Folder,
  File,
  Image,
  FileSpreadsheet,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Documento } from '@/types';

// FIX: Usar tipo del types/index.ts en lugar de redefinir
type CategoriaDocumento = 'todos' | 'contratos' | 'itv' | 'seguros' | 'licencias' | 'planos';

export default function Documentacion() {
  const { clientes } = useClientesStore();
  const { vehiculos } = useVehiculosStore();
  const { conductores } = useConductoresStore();
  const { servicios } = useServiciosStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState<CategoriaDocumento>('todos');

  // FIX: Generar documentos simulados con fechas seguras (nunca undefined)
  const documentos: Documento[] = useMemo(() => {
    const ahora = new Date().toISOString();
    
    return [
      // Contratos de clientes
      ...clientes.flatMap(c => {
        const fechaSegura = c.fechaAlta ? new Date(c.fechaAlta).toISOString() : ahora;
        return [{
          id: `doc-${c.id}-1`,
          nombre: `Contrato_${c.codigo || c.id}_2024.pdf`,
          tipo: 'contrato' as const,
          categoria: 'contratos',
          url: '#',
          entidadId: c.id,
          entidadTipo: 'Cliente',
          entidad: c.nombre,
          fechaSubida: fechaSegura,
          tamaño: 2.4 * 1024 * 1024, // bytes
          subidoPor: 'Sistema',
        }];
      }),
      
      // ITV de vehículos
      ...vehiculos
        .filter(v => v.itv?.fechaUltima)
        .map(v => {
          const fechaSegura = v.itv?.fechaUltima 
            ? new Date(v.itv.fechaUltima).toISOString() 
            : ahora;
          return {
            id: `doc-${v.id}-itv`,
            nombre: `ITV_${v.matricula.replace(/\s/g, '')}.pdf`,
            tipo: 'itv' as const,
            categoria: 'itv',
            url: '#',
            entidadId: v.id,
            entidadTipo: 'Vehículo',
            entidad: `${v.marca || ''} ${v.modelo || ''} (${v.matricula})`.trim(),
            fechaSubida: fechaSegura,
            tamaño: 1.2 * 1024 * 1024,
            subidoPor: 'Sistema',
          };
        }),
      
      // Seguros de vehículos
      ...vehiculos
        .filter(v => v.seguro?.fechaVencimiento)
        .map(v => {
          const fechaSegura = v.seguro?.fechaVencimiento
            ? new Date(v.seguro.fechaVencimiento).toISOString()
            : ahora;
          return {
            id: `doc-${v.id}-seguro`,
            nombre: `Seguro_${v.matricula.replace(/\s/g, '')}.pdf`,
            tipo: 'seguro' as const,
            categoria: 'seguros',
            url: '#',
            entidadId: v.id,
            entidadTipo: 'Vehículo',
            entidad: `${v.marca || ''} ${v.modelo || ''} (${v.matricula})`.trim(),
            fechaSubida: fechaSegura,
            tamaño: 3.1 * 1024 * 1024,
            subidoPor: 'Sistema',
          };
        }),
      
      // Licencias de conductores
      ...conductores.map(c => {
        const fechaSegura = c.fechaAlta 
          ? new Date(c.fechaAlta).toISOString() 
          : ahora;
        return {
          id: `doc-${c.id}-licencia`,
          nombre: `Licencia_${c.dni}.pdf`,
          tipo: 'licencia' as const,
          categoria: 'licencias',
          url: '#',
          entidadId: c.id,
          entidadTipo: 'Conductor',
          entidad: `${c.nombre} ${c.apellidos}`,
          fechaSubida: fechaSegura,
          tamaño: 0.8 * 1024 * 1024,
          subidoPor: 'Sistema',
        };
      }),
      
      // Planos de rutas
      ...servicios
        .filter(s => s.rutas && s.rutas.length > 0)
        .flatMap(s => 
          (s.rutas || []).map((r, index) => {
            const fechaSegura = s.fechaInicio
              ? new Date(s.fechaInicio).toISOString()
              : ahora;
            return {
              id: `doc-${s.id}-plano-${index}`,
              nombre: `Plano_Ruta_${index + 1}.pdf`,
              tipo: 'plano' as const,
              categoria: 'planos',
              url: '#',
              entidadId: s.id,
              entidadTipo: 'Servicio',
              entidad: s.titulo || s.descripcion || 'Servicio',
              fechaSubida: fechaSegura,
              tamaño: 4.5 * 1024 * 1024,
              subidoPor: 'Sistema',
            };
          })
        ),
    ];
  }, [clientes, vehiculos, conductores, servicios]);

  // FIX: Filtrar documentos con useMemo para performance
  const documentosFiltrados = useMemo(() => {
    return documentos.filter(doc => {
      const matchesSearch = 
        doc.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.entidad || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategoria = categoriaActiva === 'todos' || doc.categoria === categoriaActiva;
      return matchesSearch && matchesCategoria;
    });
  }, [documentos, searchQuery, categoriaActiva]);

  // FIX: Estadísticas con useMemo
  const stats = useMemo(() => ({
    total: documentos.length,
    contratos: documentos.filter(d => d.categoria === 'contratos').length,
    itv: documentos.filter(d => d.categoria === 'itv').length,
    seguros: documentos.filter(d => d.categoria === 'seguros').length,
    licencias: documentos.filter(d => d.categoria === 'licencias').length,
    planos: documentos.filter(d => d.categoria === 'planos').length,
  }), [documentos]);

  // FIX: Formatear tamaño de archivo
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '-';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // FIX: Formatear fecha segura
  const formatDateSafe = (fecha: string | Date | undefined): string => {
    if (!fecha) return '-';
    try {
      return format(new Date(fecha), 'dd/MM/yyyy', { locale: es });
    } catch {
      return '-';
    }
  };

  const getIconoPorTipo = (tipo: string) => {
    switch (tipo) {
      case 'contrato':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'factura':
        return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
      case 'plano':
        return <Image className="h-5 w-5 text-purple-500" />;
      case 'seguro':
        return <FileArchive className="h-5 w-5 text-amber-500" />;
      case 'licencia':
        return <FileText className="h-5 w-5 text-cyan-500" />;
      case 'itv':
        return <FileText className="h-5 w-5 text-red-500" />;
      default:
        return <File className="h-5 w-5 text-slate-500" />;
    }
  };

  // FIX: Documentos recientes ordenados y seguros
  const documentosRecientes = useMemo(() => {
    return [...documentos]
      .filter(d => d.fechaSubida)
      .sort((a, b) => new Date(b.fechaSubida!).getTime() - new Date(a.fechaSubida!).getTime())
      .slice(0, 3);
  }, [documentos]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documentación</h1>
          <p className="text-slate-500">Gestión de archivos y documentos</p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Subir Documento
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card 
          className={categoriaActiva === 'todos' ? 'ring-2 ring-[#1e3a5f]' : ''}
        >
          <CardContent 
            className="p-4 cursor-pointer" 
            onClick={() => setCategoriaActiva('todos')}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-slate-100 p-2">
                <Folder className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-slate-500">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {[
          { key: 'contratos', label: 'Contratos', color: 'blue' },
          { key: 'itv', label: 'ITV', color: 'red' },
          { key: 'seguros', label: 'Seguros', color: 'amber' },
          { key: 'licencias', label: 'Licencias', color: 'cyan' },
          { key: 'planos', label: 'Planos', color: 'purple' },
        ].map(({ key, label, color }) => (
          <Card 
            key={key}
            className={categoriaActiva === key ? 'ring-2 ring-[#1e3a5f]' : ''}
          >
            <CardContent 
              className="p-4 cursor-pointer" 
              onClick={() => setCategoriaActiva(key as CategoriaDocumento)}
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-full bg-${color}-100 p-2`}>
                  <FileText className={`h-5 w-5 text-${color}-600`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats[key as keyof typeof stats]}</p>
                  <p className="text-sm text-slate-500">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Buscar documentos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Documents Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos</CardTitle>
          <CardDescription>
            {categoriaActiva === 'todos' 
              ? 'Todos los documentos' 
              : `Documentos de ${categoriaActiva}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documentosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Folder className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <p>No se encontraron documentos</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {documentosFiltrados.map((doc) => (
                <div 
                  key={doc.id} 
                  className="flex items-start gap-4 p-4 rounded-lg border hover:bg-slate-50 transition-colors"
                >
                  <div className="rounded-lg bg-slate-100 p-3">
                    {getIconoPorTipo(doc.tipo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" title={doc.nombre}>
                      {doc.nombre}
                    </p>
                    <p className="text-sm text-slate-500">{doc.entidad || '-'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {doc.entidadTipo}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {formatFileSize(doc.tamaño)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatDateSafe(doc.fechaSubida)}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="mr-2 h-4 w-4" />
                        Descargar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Access */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Documentos Pendientes</CardTitle>
            <CardDescription>
              Documentos que requieren atención
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <FileText className="h-5 w-5 text-amber-600" />
                <div className="flex-1">
                  <p className="font-medium">ITV 3456 MNP</p>
                  <p className="text-sm text-slate-600">Próxima a vencer (5 días)</p>
                </div>
                <Button size="sm" variant="outline">
                  Ver
                </Button>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                <FileArchive className="h-5 w-5 text-red-600" />
                <div className="flex-1">
                  <p className="font-medium">Seguro 7890 QRS</p>
                  <p className="text-sm text-slate-600">Vencido</p>
                </div>
                <Button size="sm" variant="outline">
                  Renovar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subidas Recientes</CardTitle>
            <CardDescription>
              Últimos documentos añadidos al sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documentosRecientes.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                  {getIconoPorTipo(doc.tipo)}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{doc.nombre}</p>
                    <p className="text-xs text-slate-500">{doc.entidad || '-'}</p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatDateSafe(doc.fechaSubida)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}