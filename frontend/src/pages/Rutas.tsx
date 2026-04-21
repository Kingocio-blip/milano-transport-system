// ============================================
// MILANO - Rutas (Rediseñado v2)
// Conectado con servicios + Google Maps + normativa RD 261/2022
// ============================================

import { useState, useEffect, useMemo } from 'react';
import { useServiciosStore, useUIStore } from '../store';
import { rutasApi } from '@/lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  Route, MapPin, Clock, Bus, Search, Navigation, Eye,
  AlertCircle, CheckCircle2, ExternalLink, Loader2, X,
  LayoutGrid, List, Phone, MessageSquare, Calendar, TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SkeletonPage } from '../components/LoadingScreen';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

// ============================================
// HELPERS
// ============================================

const parseDateSafe = (date: string | Date | undefined): Date | null => {
  if (!date) return null;
  try {
    const parsed = typeof date === 'string' ? parseISO(date) : date;
    return isValid(parsed) ? parsed : null;
  } catch { return null; }
};

const fmtDate = (d: string | Date | undefined): string => {
  const date = parseDateSafe(d);
  return date ? format(date, 'dd/MM/yyyy HH:mm', { locale: es }) : '-';
};

const estadoColors: Record<string, string> = {
  planificada: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  activa: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  completada: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  cancelada: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const estadoLabels: Record<string, string> = {
  planificada: 'Planificada', activa: 'Activa', completada: 'Completada', cancelada: 'Cancelada',
};

// ============================================
// COMPONENTE: MapaRuta
// ============================================

function MapaRuta({ origen, destino, paradas, height = 350 }: {
  origen?: string; destino?: string; paradas?: any[]; height?: number;
}) {
  if (!origen || !destino) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center" style={{ height }}>
        <p className="text-sm text-slate-500 dark:text-slate-400">Sin datos de ruta</p>
      </div>
    );
  }
  const url = `https://maps.google.com/maps?q=${encodeURIComponent(`${origen} a ${destino}`)}&t=m&z=10&ie=UTF8&iwloc=&output=embed`;
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden" style={{ height }}>
      <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" src={url} title="Mapa de ruta" />
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function Rutas() {
  const { servicios, fetchServicios } = useServiciosStore();
  const { showToast } = useUIStore();

  const [rutas, setRutas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [vistaMode, setVistaMode] = useState<'cards' | 'lista'>('cards');
  const [rutaSeleccionada, setRutaSeleccionada] = useState<any | null>(null);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);

  useEffect(() => {
    fetchRutas();
    fetchServicios();
  }, [fetchServicios]);

  const fetchRutas = async () => {
    setLoading(true);
    try {
      const response = await rutasApi.getAll();
      setRutas(response.data || []);
    } catch (err: any) {
      console.warn('Error fetchRutas:', err.message);
      // Fallback: mostrar rutas desde servicios
      const rutasFromServicios = servicios
        .filter(s => s.origen && s.destino)
        .map(s => ({
          id: `srv-${s.id}`,
          servicio_id: s.id,
          codigo: s.codigo,
          titulo: s.titulo,
          estado: s.estado === 'en_curso' ? 'activa' : 'planificada',
          origen: s.origen,
          destino: s.destino,
          paradas: s.rutas || [],
          servicio: s,
          fecha_creacion: s.fechaCreacion,
        }));
      setRutas(rutasFromServicios);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar
  const filtradas = useMemo(() => {
    return rutas.filter(r => {
      const sq = searchQuery.toLowerCase().trim();
      const ms = sq === '' ||
        r.titulo?.toLowerCase().includes(sq) ||
        r.codigo?.toLowerCase().includes(sq) ||
        r.origen?.toLowerCase().includes(sq) ||
        r.destino?.toLowerCase().includes(sq);
      return ms && (estadoFiltro === 'todos' || r.estado === estadoFiltro);
    });
  }, [rutas, searchQuery, estadoFiltro]);

  // Stats
  const stats = useMemo(() => ({
    total: rutas.length,
    activas: rutas.filter(r => r.estado === 'activa').length,
    planificadas: rutas.filter(r => r.estado === 'planificada').length,
    completadas: rutas.filter(r => r.estado === 'completada').length,
  }), [rutas]);

  // Obtener servicio asociado
  const getServicio = (ruta: any) => {
    if (ruta.servicio) return ruta.servicio;
    return servicios.find(s => String(s.id) === String(ruta.servicio_id));
  };

  if (loading && rutas.length === 0) return <SkeletonPage type="mixed" tableCols={6} vistaMode={vistaMode} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Rutas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Hojas de ruta generadas desde servicios</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchRutas} variant="outline" className="dark:border-slate-600 dark:text-slate-300">
            <Loader2 className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Rutas', value: stats.total, icon: Route, color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' },
          { label: 'Activas', value: stats.activas, icon: TrendingUp, color: 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400' },
          { label: 'Planificadas', value: stats.planificadas, icon: Clock, color: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' },
          { label: 'Completadas', value: stats.completadas, icon: CheckCircle2, color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center gap-3">
            <div className={`rounded-lg p-2.5 ${s.color}`}><s.icon className="h-5 w-5" /></div>
            <div><p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{s.value}</p><p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar ruta..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 dark:bg-slate-900 dark:border-slate-700" />
        </div>
        <div className="flex gap-2">
          <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)}
            className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm dark:text-slate-200">
            <option value="todos">Todos</option>
            <option value="planificada">Planificadas</option>
            <option value="activa">Activas</option>
            <option value="completada">Completadas</option>
            <option value="cancelada">Canceladas</option>
          </select>
          <div className="flex border rounded-lg overflow-hidden dark:border-slate-700">
            <button onClick={() => setVistaMode('cards')} className={`p-2 ${vistaMode === 'cards' ? 'bg-[#1e3a5f] text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}><LayoutGrid className="h-4 w-4" /></button>
            <button onClick={() => setVistaMode('lista')} className={`p-2 ${vistaMode === 'lista' ? 'bg-[#1e3a5f] text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}><List className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* Vista CARDS */}
      {vistaMode === 'cards' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtradas.length === 0 ? (
            <div className="col-span-full flex flex-col items-center py-16 text-slate-400 dark:text-slate-500">
              <Route className="h-12 w-12 mb-3" /><p className="text-sm">No hay rutas</p>
              <p className="text-xs mt-1">Las rutas se generan automaticamente al crear servicios con paradas</p>
            </div>
          ) : filtradas.map(r => {
            const svc = getServicio(r);
            const numParadas = r.paradas?.length || 0;
            return (
              <div key={r.id} onClick={() => { setRutaSeleccionada(r); setIsDetalleOpen(true); }}
                className="group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="font-mono text-xs text-[#1e3a5f] dark:text-blue-400 font-semibold">{r.codigo || r.servicio?.codigo || 'SIN-CODIGO'}</span>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 line-clamp-1">{r.titulo}</h3>
                  </div>
                  <Badge className={estadoColors[r.estado] || estadoColors.planificada}>{estadoLabels[r.estado] || r.estado}</Badge>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-slate-600 dark:text-slate-400 truncate flex-1">{r.origen || 'Sin origen'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Navigation className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-slate-600 dark:text-slate-400 truncate flex-1">{r.destino || 'Sin destino'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-3">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{r.duracion_minutos ? `${Math.round(r.duracion_minutos / 60)}h` : '-'}</span>
                  <span className="flex items-center gap-1"><Route className="h-3 w-3" />{numParadas} paradas</span>
                  <span className="flex items-center gap-1"><Bus className="h-3 w-3" />{r.conductores_necesarios || 1} conductor{r.conductores_necesarios > 1 ? 'es' : ''}</span>
                </div>

                {r.requiere_pernocta && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mb-3 p-1.5 rounded bg-amber-50 dark:bg-amber-900/20">
                    <AlertCircle className="h-3 w-3" /> Requiere pernocta
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                  {svc && (
                    <Link to={`/servicios?id=${svc.id}`} onClick={e => e.stopPropagation()}
                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> Ver servicio
                    </Link>
                  )}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); setRutaSeleccionada(r); setIsDetalleOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Vista LISTA */
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-left">
                <tr><th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Codigo</th><th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Ruta</th><th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Origen {'->'} Destino</th><th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Estado</th><th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Paradas</th><th className="px-4 py-3"></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtradas.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400 dark:text-slate-500"><Route className="h-10 w-10 mx-auto mb-2" />No hay rutas</td></tr>
                ) : filtradas.map(r => (
                  <tr key={r.id} onClick={() => { setRutaSeleccionada(r); setIsDetalleOpen(true); }} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[#1e3a5f] dark:text-blue-400">{r.codigo || '-'}</td>
                    <td className="px-4 py-3 font-medium dark:text-slate-200">{r.titulo}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{r.origen || '-'} {'->'} {r.destino || '-'}</td>
                    <td className="px-4 py-3"><Badge className={estadoColors[r.estado] || ''}>{estadoLabels[r.estado] || r.estado}</Badge></td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{(r.paradas || []).length}</td>
                    <td className="px-4 py-3"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); setRutaSeleccionada(r); setIsDetalleOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DIALOG: Detalle de Ruta */}
      <Dialog open={isDetalleOpen} onOpenChange={setIsDetalleOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
          {rutaSeleccionada && (
            <>
              <DialogHeader>
                <DialogTitle className="dark:text-slate-100 flex items-center gap-2">
                  <Route className="h-5 w-5" />{rutaSeleccionada.titulo}
                </DialogTitle>
              </DialogHeader>

              <div className="flex items-center gap-2 mb-4">
                <Badge className={estadoColors[rutaSeleccionada.estado] || ''}>{estadoLabels[rutaSeleccionada.estado] || rutaSeleccionada.estado}</Badge>
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{rutaSeleccionada.codigo}</span>
                {rutaSeleccionada.requiere_pernocta && (
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Pernocta</Badge>
                )}
              </div>

              {/* Mapa */}
              <MapaRuta
                origen={rutaSeleccionada.origen}
                destino={rutaSeleccionada.destino}
                paradas={rutaSeleccionada.paradas}
                height={350}
              />

              {/* Info grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Distancia</p>
                  <p className="font-semibold dark:text-slate-200">{rutaSeleccionada.distancia_km ? `${rutaSeleccionada.distancia_km} km` : 'Calculando...'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Duracion</p>
                  <p className="font-semibold dark:text-slate-200">{rutaSeleccionada.duracion_minutos ? `${Math.round(rutaSeleccionada.duracion_minutos / 60)}h ${rutaSeleccionada.duracion_minutos % 60}min` : '-'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Conductores</p>
                  <p className="font-semibold dark:text-slate-200">{rutaSeleccionada.conductores_necesarios || 1} necesarios</p>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Creada</p>
                  <p className="font-semibold dark:text-slate-200">{fmtDate(rutaSeleccionada.fecha_creacion)}</p>
                </div>
              </div>

              {/* Paradas */}
              {rutaSeleccionada.paradas && rutaSeleccionada.paradas.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-sm mb-2 dark:text-slate-300">Paradas ({rutaSeleccionada.paradas.length})</h4>
                  <ScrollArea className="max-h-60">
                    <div className="space-y-2">
                      {rutaSeleccionada.paradas.map((p: any, idx: number) => (
                        <div key={idx} className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                          p.tipo === 'origen' ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20' :
                          p.tipo === 'destino' ? 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20' :
                          p.tipo === 'descanso' ? 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20' :
                          'border-slate-200 dark:border-slate-700'
                        }`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            p.tipo === 'origen' ? 'bg-green-500 text-white' :
                            p.tipo === 'destino' ? 'bg-red-500 text-white' :
                            p.tipo === 'descanso' ? 'bg-amber-500 text-white' :
                            'bg-blue-500 text-white'
                          }`}>{idx + 1}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium dark:text-slate-200 truncate">{p.ubicacion || '-'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{p.tipo} {p.hora && `· ${p.hora}`}</p>
                          </div>
                          {p.notas && <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[200px] truncate">{p.notas}</p>}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Servicio asociado */}
              {(() => {
                const svc = getServicio(rutaSeleccionada);
                return svc ? (
                  <div className="mt-4 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
                    <h4 className="text-sm font-medium mb-2 dark:text-slate-300">Servicio asociado</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium dark:text-slate-200">{svc.codigo} · {svc.titulo}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{svc.clienteNombre} · {svc.estado}</p>
                      </div>
                      <Button size="sm" variant="outline" asChild className="dark:border-slate-600">
                        <Link to={`/servicios?id=${svc.id}`} onClick={() => setIsDetalleOpen(false)}>Ver servicio</Link>
                      </Button>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Normativa */}
              {rutaSeleccionada.observaciones_normativa && (
                <div className="mt-4 p-3 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
                  <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" /> Observaciones normativa
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">{rutaSeleccionada.observaciones_normativa}</p>
                </div>
              )}

              {/* Enlace Google Maps */}
              {rutaSeleccionada.google_maps_url && (
                <div className="mt-4">
                  <a href={rutaSeleccionada.google_maps_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1">
                    <ExternalLink className="h-4 w-4" /> Abrir en Google Maps
                  </a>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsDetalleOpen(false)} className="dark:border-slate-600 dark:text-slate-300">Cerrar</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
