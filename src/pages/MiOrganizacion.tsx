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
import { Building2, Building, Users, Plus, Edit, Trash2, Upload, UserMinus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOrganizacion, useSucursales, useUpdateOrganizacion, useDeleteSucursal, type Sucursal } from '@/hooks/useOrganizacion';
import { usePersonalUsuarios } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import SucursalFormDialog from '@/components/SucursalFormDialog';
import PersonalFormDialog from '@/components/PersonalFormDialog';
import PersonalBajaDialog from '@/components/PersonalBajaDialog';

export default function MiOrganizacion() {
  const { toast } = useToast();
  const { data: org, isLoading } = useOrganizacion();
  const { data: sucursales = [] } = useSucursales();
  const { data: personal = [] } = usePersonalUsuarios();
  const updateOrg = useUpdateOrganizacion();
  const deleteSuc = useDeleteSucursal();

  const [form, setForm] = useState({ nombre: '', cuit: '', direccion: '', telefono: '', email: '', logo_url: '', fecha_baja: '' });
  const [sucDialog, setSucDialog] = useState<{ open: boolean; sucursal?: Sucursal }>({ open: false });
  const [personalDialog, setPersonalDialog] = useState(false);
  const [bajaDialog, setBajaDialog] = useState<{ open: boolean; legajoId?: string; nombre?: string; userId?: string }>({ open: false });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (file: File) => {
    if (!org) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Archivo inválido', description: 'Subí una imagen (PNG, JPG o SVG).', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Imagen muy grande', description: 'El logo debe pesar menos de 2 MB.', variant: 'destructive' });
      return;
    }
    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop() ?? 'png';
      const path = `logos/${org.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('org-assets').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('org-assets').getPublicUrl(path);
      setForm(f => ({ ...f, logo_url: pub.publicUrl }));
      toast({ title: 'Logo subido', description: 'No olvides guardar los cambios.' });
    } catch (e: any) {
      toast({ title: 'Error al subir', description: e.message, variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
    }
  };
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
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="h-24 w-24 rounded-lg border bg-muted/30 overflow-hidden flex items-center justify-center shrink-0">
                  {form.logo_url
                    ? <img src={form.logo_url} alt="Logo de la organización" className="h-full w-full object-contain" />
                    : <Building2 className="h-10 w-10 text-muted-foreground" />}
                </div>
                <div className="space-y-2 flex-1">
                  <Label>Logo de la inmobiliaria</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={uploadingLogo} onClick={() => document.getElementById('logo-upload-input')?.click()}>
                      <Upload className="h-4 w-4 mr-1" />
                      {uploadingLogo ? 'Subiendo…' : 'Subir imagen'}
                    </Button>
                    <input id="logo-upload-input" type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ''; }} />
                    {form.logo_url && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, logo_url: '' })}>Quitar</Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">PNG, JPG o SVG. Máx. 2 MB. Recordá guardar los cambios.</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="md:col-span-2 space-y-1"><Label>Nombre *</Label><Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
                <div className="space-y-1"><Label>CUIT</Label><Input value={form.cuit} onChange={e => setForm({ ...form, cuit: e.target.value })} /></div>
                <div className="space-y-1"><Label>Teléfono</Label><Input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
                <div className="md:col-span-2 space-y-1"><Label>Dirección</Label><Input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} /></div>
                <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
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
                <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Sucursal</TableHead><TableHead>Roles</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                  {personal.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Aún no hay personal cargado.</TableCell></TableRow>}
                  {personal.map(p => {
                    const esBaja = p.legajo && !p.legajo.activo;
                    return (
                      <TableRow key={p.id} className={esBaja ? 'opacity-60' : ''}>
                        <TableCell className="font-medium">{p.nombre}</TableCell>
                        <TableCell className="text-muted-foreground">{p.email}</TableCell>
                        <TableCell className="text-muted-foreground">{p.legajo?.sucursal_nombre ?? '—'}</TableCell>
                        <TableCell>{p.roles.map(r => <Badge key={r} variant="secondary" className="mr-1 capitalize">{r}</Badge>)}</TableCell>
                        <TableCell>
                          {esBaja
                            ? <Badge className="bg-status-danger text-status-danger-foreground" title={`${p.legajo?.causa_baja ?? ''} (${p.legajo?.fecha_baja ?? ''})`}>Baja</Badge>
                            : <Badge className="bg-status-success text-status-success-foreground">Activo</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          {p.legajo?.activo && (
                            <Button variant="ghost" size="sm" onClick={() => setBajaDialog({ open: true, legajoId: p.legajo!.id, nombre: p.nombre, userId: p.user_id })}>
                              <UserMinus className="h-4 w-4 text-status-danger" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SucursalFormDialog open={sucDialog.open} onOpenChange={open => setSucDialog({ open, sucursal: open ? sucDialog.sucursal : undefined })} organizacionId={org.id} sucursal={sucDialog.sucursal} />
      <PersonalFormDialog open={personalDialog} onOpenChange={setPersonalDialog} />
      {bajaDialog.legajoId && (
        <PersonalBajaDialog
          open={bajaDialog.open}
          onOpenChange={open => setBajaDialog(s => ({ ...s, open }))}
          legajoId={bajaDialog.legajoId}
          personaNombre={bajaDialog.nombre ?? ''}
          userId={bajaDialog.userId ?? ''}
        />
      )}
    </div>
  );
}
