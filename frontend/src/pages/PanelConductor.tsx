// ============================================
// MILANO - Panel del Conductor
// ============================================

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Bus, 
  Clock, 
  MapPin, 
  Phone, 
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { removeToken } from '../lib/api';
import { useConductoresStore, useServiciosStore, useUIStore } from '../store';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toDateString } from '../lib/utils';

export default function PanelConductor() {
  const navigate = useNavigate();
  const { showToast } = useUIStore();
  const { conductores, fetchConductores } = useConductoresStore();
  const { servicios, fetchServicios } = useServiciosStore();
  const [conductorActual, setConductorActual] = useState<any>(null);

  useEffect(() => {
    fetchConductores();
    fetchServicios();
  }, [fetchConductores, fetchServicios]);

  // Simular conductor logueado (en producción vendría del token)
  useEffect(() => {
    if (conductores.length > 0) {
      setConductorActual(conductores[0]);
    }
  }, [conductores]);

  const handleLogout = () => {
    removeToken();
    navigate('/login');
  };

  // Servicios asignados al conductor (estados válidos: pendiente o en_progreso)
  const misServicios = servicios.filter(s => 
    s.conductoresAsignados?.includes(conductorActual?.id) &&
    (s.estado === 'planificando' || s.estado === 'en_curso')
  );

  // Servicios de hoy
  const hoy = new Date();
  const serviciosHoy = misServicios.filter(s => {
    const fechaInicio = s.fechaInicio ? parseISO(toDateString(s.fechaInicio)) : null;
    return fechaInicio && format(fechaInicio, 'yyyy-MM-dd') === format(hoy, 'yyyy-MM-dd');
  });

  if (!conductorActual) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-[#1e3a5f] text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg">
                {conductorActual.nombre} {conductorActual.apellidos}
              </h1>
              <p className="text-sm text-white/70">{conductorActual.codigo}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white hover:bg-white/20">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Info del Conductor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Mi Información
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Teléfono</p>
                  <p className="font-medium">{conductorActual.telefono || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Bus className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Licencia</p>
                  <p className="font-medium">Tipo {conductorActual.licencia?.tipo || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Caducidad Licencia</p>
                  <p className="font-medium">
                    {conductorActual.licencia?.fechaCaducidad 
                      ? format(parseISO(toDateString(conductorActual.licencia.fechaCaducidad)), 'dd/MM/yyyy', { locale: es })
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Servicios de Hoy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Servicios de Hoy
              <Badge variant="secondary">{serviciosHoy.length}</Badge>
            </CardTitle>
            <CardDescription>
              {format(hoy, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {serviciosHoy.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <CheckCircle2 className="mx-auto h-12 w-12 mb-2" />
                <p>No tienes servicios asignados para hoy</p>
              </div>
            ) : (
              <div className="space-y-4">
                {serviciosHoy.map(servicio => (
                  <div key={servicio.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-lg">{servicio.codigo}</h3>
                        <p className="text-slate-600">{servicio.titulo || servicio.descripcion}</p>
                        <p className="text-sm text-slate-500">{servicio.clienteNombre}</p>
                      </div>
                      <Badge className={
                        servicio.estado === 'en_curso' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-blue-100 text-blue-700'
                      }>
                        {servicio.estado === 'en_progreso' ? 'En Curso' : 'Pendiente'}
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-2 md:grid-cols-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span>{servicio.tipo}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span>{servicio.descripcion || 'No especificado'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximos Servicios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximos Servicios
            </CardTitle>
          </CardHeader>
          <CardContent>
            {misServicios.filter(s => !serviciosHoy.includes(s)).length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <AlertCircle className="mx-auto h-12 w-12 mb-2" />
                <p>No tienes más servicios asignados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {misServicios
                  .filter(s => !serviciosHoy.includes(s))
                  .map(servicio => (
                    <div key={servicio.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div>
                        <p className="font-medium">{servicio.codigo} - {servicio.titulo || servicio.descripcion}</p>
                        <p className="text-sm text-slate-500">
                          {servicio.fechaInicio 
                            ? format(parseISO(toDateString(servicio.fechaInicio)), 'dd/MM/yyyy', { locale: es })
                            : '-'}
                        </p>
                      </div>
                      <Badge variant="outline">{servicio.tipo}</Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}