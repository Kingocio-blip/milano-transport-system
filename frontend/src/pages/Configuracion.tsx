// ============================================
// MILANO - Configuración Page (CON ROLES)
// ============================================

import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { Separator } from '../components/ui/separator';
import {
 Settings,
 Building2,
 Bell,
 Users,
 Shield,
 Save,
 Mail,
 Smartphone,
} from 'lucide-react';

export default function Configuracion() {
 const navigate = useNavigate();
 const location = useLocation();
 
 // Determinar si estamos en sub-ruta de roles
 const isRolesRoute = location.pathname.includes('/configuracion/roles') || 
            location.pathname.includes('/configuracion/usuarios');

 const [configuracion, setConfiguracion] = useState({
  empresa: {
   nombre: 'MILANO Transporte S.L.',
   nif: 'B12345678',
   direccion: 'Carrer de la Indústria, 123',
   ciudad: 'Barcelona',
   cp: '08001',
   telefono: '+34 93 123 45 67',
   email: 'info@milano-transporte.es',
  },
  facturacion: {
   serie: '2024',
   numeroActual: 45,
   iva: 21,
   diasVencimiento: 30,
  },
  conductores: {
   maxHorasDia: 9,
   maxHorasSemana: 45,
   descansoMinimo: 11,
  },
  notificaciones: {
   email: true,
   whatsapp: false,
   alertasITV: true,
   alertasSeguros: true,
   alertasLicencias: true,
   recordatoriosFacturas: true,
  },
 });

 const handleGuardar = () => {
  alert('Configuración guardada correctamente');
 };

 // Si estamos en ruta de roles, renderizar solo el Outlet
 if (isRolesRoute) {
  return <Outlet />;
 }

 return (
  <div className="space-y-6">
   {/* Header */}
   <div className="flex items-center justify-between">
    <div>
     <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Configuración</h1>
     <p className="text-slate-500 dark:text-slate-400">Ajustes del sistema y preferencias</p>
    </div>
    <Button onClick={handleGuardar}>
     <Save className="mr-2 h-4 w-4" />
     Guardar Cambios
    </Button>
   </div>

   <Tabs defaultValue="empresa" className="space-y-4">
    <TabsList>
     <TabsTrigger value="empresa">
      <Building2 className="mr-2 h-4 w-4" />
      Empresa
     </TabsTrigger>
     <TabsTrigger value="facturacion">
      <Settings className="mr-2 h-4 w-4" />
      Facturación
     </TabsTrigger>
     <TabsTrigger value="conductores">
      <Users className="mr-2 h-4 w-4" />
      Conductores
     </TabsTrigger>
     <TabsTrigger value="notificaciones">
      <Bell className="mr-2 h-4 w-4" />
      Notificaciones
     </TabsTrigger>
     {/* NUEVO: Tab de Roles */}
     <TabsTrigger value="roles" onClick={() => navigate('/configuracion/roles')}>
      <Shield className="mr-2 h-4 w-4" />
      Roles y Permisos
     </TabsTrigger>
    </TabsList>

    {/* Empresa */}
    <TabsContent value="empresa">
     <Card>
      <CardHeader>
       <CardTitle>Datos de la Empresa</CardTitle>
       <CardDescription>
        Información general de MILANO Transporte
       </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
       <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
         <Label htmlFor="nombre">Nombre de la Empresa</Label>
         <Input 
          id="nombre"
          value={configuracion.empresa.nombre}
          onChange={(e) => setConfiguracion({
           ...configuracion,
           empresa: {...configuracion.empresa, nombre: e.target.value}
          })}
         />
        </div>
        <div className="space-y-2">
         <Label htmlFor="nif">NIF/CIF</Label>
         <Input 
          id="nif"
          value={configuracion.empresa.nif}
          onChange={(e) => setConfiguracion({
           ...configuracion,
           empresa: {...configuracion.empresa, nif: e.target.value}
          })}
         />
        </div>
       </div>
       <div className="space-y-2">
        <Label htmlFor="direccion">Dirección</Label>
        <Input 
         id="direccion"
         value={configuracion.empresa.direccion}
         onChange={(e) => setConfiguracion({
          ...configuracion,
          empresa: {...configuracion.empresa, direccion: e.target.value}
         })}
        />
       </div>
       <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
         <Label htmlFor="ciudad">Ciudad</Label>
         <Input 
          id="ciudad"
          value={configuracion.empresa.ciudad}
          onChange={(e) => setConfiguracion({
           ...configuracion,
           empresa: {...configuracion.empresa, ciudad: e.target.value}
          })}
         />
        </div>
        <div className="space-y-2">
         <Label htmlFor="cp">Código Postal</Label>
         <Input 
          id="cp"
          value={configuracion.empresa.cp}
          onChange={(e) => setConfiguracion({
           ...configuracion,
           empresa: {...configuracion.empresa, cp: e.target.value}
          })}
         />
        </div>
       </div>
       <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
         <Label htmlFor="telefono">Teléfono</Label>
         <Input 
          id="telefono"
          value={configuracion.empresa.telefono}
          onChange={(e) => setConfiguracion({
           ...configuracion,
           empresa: {...configuracion.empresa, telefono: e.target.value}
          })}
         />
        </div>
        <div className="space-y-2">
         <Label htmlFor="email">Email</Label>
         <Input 
          id="email"
          type="email"
          value={configuracion.empresa.email}
          onChange={(e) => setConfiguracion({
           ...configuracion,
           empresa: {...configuracion.empresa, email: e.target.value}
          })}
         />
        </div>
       </div>
      </CardContent>
     </Card>
    </TabsContent>

    {/* Facturación */}
    <TabsContent value="facturacion">
     <Card>
      <CardHeader>
       <CardTitle>Configuración de Facturación</CardTitle>
       <CardDescription>
        Ajustes para la generación de facturas
       </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
       <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
         <Label htmlFor="serie">Serie de Facturas</Label>
         <Input 
          id="serie"
          value={configuracion.facturacion.serie}
          onChange={(e) => setConfiguracion({
           ...configuracion,
           facturacion: {...configuracion.facturacion, serie: e.target.value}
          })}
         />
        </div>
        <div className="space-y-2">
         <Label htmlFor="numero">Número Actual</Label>
         <Input 
          id="numero"
          type="number"
          value={configuracion.facturacion.numeroActual}
          onChange={(e) => setConfiguracion({
           ...configuracion,
           facturacion: {...configuracion.facturacion, numeroActual: parseInt(e.target.value)}
          })}
         />
        </div>
        <div className="space-y-2">
         <Label htmlFor="iva">IVA (%)</Label>
         <Input 
          id="iva"
          type="number"
          value={configuracion.facturacion.iva}
          onChange={(e) => setConfiguracion({
           ...configuracion,
           facturacion: {...configuracion.facturacion, iva: parseInt(e.target.value)}
          })}
         />
        </div>
       </div>
       <div className="space-y-2">
        <Label htmlFor="vencimiento">Días hasta Vencimiento</Label>
        <Input 
         id="vencimiento"
         type="number"
         value={configuracion.facturacion.diasVencimiento}
         onChange={(e) => setConfiguracion({
          ...configuracion,
          facturacion: {...configuracion.facturacion, diasVencimiento: parseInt(e.target.value)}
         })}
        />
       </div>
      </CardContent>
     </Card>
    </TabsContent>

    {/* Conductores */}
    <TabsContent value="conductores">
     <Card>
      <CardHeader>
       <CardTitle>Configuración de Conductores</CardTitle>
       <CardDescription>
        Límites y restricciones para conductores
       </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
       <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
         <Label htmlFor="maxHorasDia">Máximo Horas/Día</Label>
         <Input 
          id="maxHorasDia"
          type="number"
          value={configuracion.conductores.maxHorasDia}
          onChange={(e) => setConfiguracion({
           ...configuracion,
           conductores: {...configuracion.conductores, maxHorasDia: parseInt(e.target.value)}
          })}
         />
        </div>
        <div className="space-y-2">
         <Label htmlFor="maxHorasSemana">Máximo Horas/Semana</Label>
         <Input 
          id="maxHorasSemana"
          type="number"
          value={configuracion.conductores.maxHorasSemana}
          onChange={(e) => setConfiguracion({
           ...configuracion,
           conductores: {...configuracion.conductores, maxHorasSemana: parseInt(e.target.value)}
          })}
         />
        </div>
        <div className="space-y-2">
         <Label htmlFor="descanso">Descanso Mínimo (horas)</Label>
         <Input 
          id="descanso"
          type="number"
          value={configuracion.conductores.descansoMinimo}
          onChange={(e) => setConfiguracion({
           ...configuracion,
           conductores: {...configuracion.conductores, descansoMinimo: parseInt(e.target.value)}
          })}
         />
        </div>
       </div>
      </CardContent>
     </Card>
    </TabsContent>

    {/* Notificaciones */}
    <TabsContent value="notificaciones">
     <Card>
      <CardHeader>
       <CardTitle>Configuración de Notificaciones</CardTitle>
       <CardDescription>
        Gestión de alertas y comunicaciones
       </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
       <div className="space-y-4">
        <h3 className="font-medium">Canales de Notificación</h3>
        <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-slate-400" />
          <div>
           <p className="font-medium">Email</p>
           <p className="text-sm text-slate-500">Recibir notificaciones por correo</p>
          </div>
         </div>
         <Switch 
          checked={configuracion.notificaciones.email}
          onCheckedChange={(checked) => setConfiguracion({
           ...configuracion,
           notificaciones: {...configuracion.notificaciones, email: checked}
          })}
         />
        </div>
        <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
          <Smartphone className="h-5 w-5 text-slate-400" />
          <div>
           <p className="font-medium">WhatsApp</p>
           <p className="text-sm text-slate-500">Recibir notificaciones por WhatsApp</p>
          </div>
         </div>
         <Switch 
          checked={configuracion.notificaciones.whatsapp}
          onCheckedChange={(checked) => setConfiguracion({
           ...configuracion,
           notificaciones: {...configuracion.notificaciones, whatsapp: checked}
          })}
         />
        </div>
       </div>

       <Separator />

       <div className="space-y-4">
        <h3 className="font-medium">Tipos de Alertas</h3>
        <div className="flex items-center justify-between">
         <div>
          <p className="font-medium">ITV Próximas</p>
          <p className="text-sm text-slate-500">Alertar cuando la ITV esté próxima a vencer</p>
         </div>
         <Switch 
          checked={configuracion.notificaciones.alertasITV}
          onCheckedChange={(checked) => setConfiguracion({
           ...configuracion,
           notificaciones: {...configuracion.notificaciones, alertasITV: checked}
          })}
         />
        </div>
        <div className="flex items-center justify-between">
         <div>
          <p className="font-medium">Seguros Próximos</p>
          <p className="text-sm text-slate-500">Alertar cuando el seguro esté próximo a vencer</p>
         </div>
         <Switch 
          checked={configuracion.notificaciones.alertasSeguros}
          onCheckedChange={(checked) => setConfiguracion({
           ...configuracion,
           notificaciones: {...configuracion.notificaciones, alertasSeguros: checked}
          })}
         />
        </div>
        <div className="flex items-center justify-between">
         <div>
          <p className="font-medium">Licencias Próximas</p>
          <p className="text-sm text-slate-500">Alertar cuando las licencias estén próximas a caducar</p>
         </div>
         <Switch 
          checked={configuracion.notificaciones.alertasLicencias}
          onCheckedChange={(checked) => setConfiguracion({
           ...configuracion,
           notificaciones: {...configuracion.notificaciones, alertasLicencias: checked}
          })}
         />
        </div>
        <div className="flex items-center justify-between">
         <div>
          <p className="font-medium">Recordatorios de Facturas</p>
          <p className="text-sm text-slate-500">Enviar recordatorios de facturas pendientes</p>
         </div>
         <Switch 
          checked={configuracion.notificaciones.recordatoriosFacturas}
          onCheckedChange={(checked) => setConfiguracion({
           ...configuracion,
           notificaciones: {...configuracion.notificaciones, recordatoriosFacturas: checked}
          })}
         />
        </div>
       </div>
      </CardContent>
     </Card>
    </TabsContent>
   </Tabs>
  </div>
 );
}