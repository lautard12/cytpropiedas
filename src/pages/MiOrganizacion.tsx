import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Building, Users, Plus, Edit, Trash2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOrganizacion, useSucursales, useUpdateOrganizacion, useDeleteSucursal, type Sucursal } from '@/hooks/useOrganizacion';
import { usePersonas } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import SucursalFormDialog from '@/components/SucursalFormDialog';
import PersonalFormDialog from '@/components/PersonalFormDialog';

export default function MiOrganizacion() {
  const { toast } = useToast();
  const { data: org, isLoading } = useOrganizacion();
  const { data: sucursales = [] } = useSucursales();
  const { data: personal = [] } = usePersonas('personal' as any);
  const updateOrg = useUpdateOrganizacion();
  const deleteSuc = useDeleteSucursal();

  const [form, setForm] = useState({ nombre: '', cuit: '', direccion: '', telefono: '', email: '', logo_url: '', fecha_baja: '' });
  const [sucDialog, setSucDialog] = useState<{ open: boolean; sucursal?: Sucursal }>({ open: false });
  const [personalDialog, setPersonalDialog] = useState(false);

  useEffect(() => {
    if (org) setForm({
      nombre: org.nombre, cuit: org.cuit, direccion: org.direccion,
      telefono: org.telefono, email: org.email, logo_url: org.logo_url,
      fecha_baja: org.fecha_baja ?? '',
    });
  }, [org]);

  const guardarOrg = async () => {
    if (!org) return;
    try {
      await updateOrg.mutateAsync({ id: org.id, ...form, fecha_baja: form.fecha_baja || null });
      toast({ title: 'Datos guardados' });
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  if (isLoading || !org) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi Organización</h1>
        <p className="text-muted-foreground">Datos de la inmobiliaria, sucursales y personal.</p>
      </div>

      <Tabs defaultValue="datos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="datos"><Building2 className="h-4 w-4 mr-1" />Datos</TabsTrigger>
          <TabsTrigger value="sucursales"><Building className="h-4 w-4 mr-1" />Sucursales</TabsTrigger>
          <TabsTrigger value="personal"><Users className="h-4 w-4 mr-1" />Personal</TabsTrigger>
        </TabsList>

        <TabsContent value="datos">
          <Card>
            <CardHeader><CardTitle>Datos generales</CardTitle><CardDescription>Información de tu inmobiliaria.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="md:col-span-2 space-y-1"><Label>Nombre *</Label><Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
                <div className="space-y-1"><Label>CUIT</Label><Input value={form.cuit} onChange={e => setForm({ ...form, cuit: e.target.value })} /></div>
                <div className="space-y-1"><Label>Teléfono</Label><Input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
                <div className="md:col-span-2 space-y-1"><Label>Dirección</Label><Input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} /></div>
                <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-1"><Label>Logo (URL)</Label><Input value={form.logo_url} onChange={e => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…" /></div>
                <div className="space-y-1"><Label>Fecha de alta</Label><Input value={org.fecha_alta} disabled /></div>
                <div className="space-y-1"><Label>Fecha de baja</Label><Input type="date" value={form.fecha_baja ?? ''} onChange={e => setForm({ ...form, fecha_baja: e.target.value })} /></div>
              </div>
              <div className="flex justify-end"><Button onClick={guardarOrg} disabled={updateOrg.isPending}>{updateOrg.isPending ? 'Guardando…' : 'Guardar cambios'}</Button></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sucursales">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div><CardTitle>Sucursales</CardTitle><CardDescription>Gestión de sucursales.</CardDescription></div>
              <Button size="sm" onClick={() => setSucDialog({ open: true })}><Plus className="h-4 w-4 mr-1" />Nueva sucursal</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Dirección</TableHead><TableHead>Teléfono</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                  {sucursales.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.nombre} {s.es_central && <Badge variant="outline" className="ml-1 text-[10px]">Central</Badge>}</TableCell>
                      <TableCell className="text-muted-foreground">{s.direccion}</TableCell>
                      <TableCell className="text-muted-foreground">{s.telefono}</TableCell>
                      <TableCell><Badge className={s.activa ? 'bg-status-success text-status-success-foreground' : 'bg-muted'}>{s.activa ? 'Activa' : 'Inactiva'}</Badge></TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => setSucDialog({ open: true, sucursal: s })}><Edit className="h-4 w-4" /></Button>
                        {!s.es_central && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-status-danger" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Eliminar sucursal</AlertDialogTitle><AlertDialogDescription>¿Eliminar "{s.nombre}"? Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={async () => { try { await deleteSuc.mutateAsync(s.id); toast({ title: 'Eliminada' }); } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); } }}>Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div><CardTitle>Personal</CardTitle><CardDescription>Usuarios del sistema con su rol y sucursal.</CardDescription></div>
              <Button size="sm" onClick={() => setPersonalDialog(true)}><Plus className="h-4 w-4 mr-1" />Nuevo personal</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Teléfono</TableHead><TableHead>Roles</TableHead></TableRow></TableHeader>
                <TableBody>
                  {personal.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Aún no hay personal cargado.</TableCell></TableRow>}
                  {personal.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell className="text-muted-foreground">{p.email}</TableCell>
                      <TableCell className="text-muted-foreground">{p.telefono}</TableCell>
                      <TableCell>{p.roles.map(r => <Badge key={r} variant="secondary" className="mr-1 capitalize">{r}</Badge>)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SucursalFormDialog open={sucDialog.open} onOpenChange={open => setSucDialog({ open, sucursal: open ? sucDialog.sucursal : undefined })} organizacionId={org.id} sucursal={sucDialog.sucursal} />
      <PersonalFormDialog open={personalDialog} onOpenChange={setPersonalDialog} />
    </div>
  );
}
