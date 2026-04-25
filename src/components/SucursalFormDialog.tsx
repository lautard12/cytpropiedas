import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useCreateSucursal, useUpdateSucursal, type Sucursal } from '@/hooks/useOrganizacion';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  organizacionId: string;
  sucursal?: Sucursal;
}

export default function SucursalFormDialog({ open, onOpenChange, organizacionId, sucursal }: Props) {
  const { toast } = useToast();
  const create = useCreateSucursal();
  const update = useUpdateSucursal();
  const isEdit = !!sucursal;

  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [esCentral, setEsCentral] = useState(false);
  const [activa, setActiva] = useState(true);

  useEffect(() => {
    if (open) {
      setNombre(sucursal?.nombre ?? '');
      setDireccion(sucursal?.direccion ?? '');
      setTelefono(sucursal?.telefono ?? '');
      setEsCentral(sucursal?.es_central ?? false);
      setActiva(sucursal?.activa ?? true);
    }
  }, [open, sucursal]);

  const onSubmit = async () => {
    if (nombre.trim().length < 2) { toast({ title: 'Nombre requerido', variant: 'destructive' }); return; }
    try {
      if (isEdit && sucursal) {
        await update.mutateAsync({ id: sucursal.id, nombre, direccion, telefono, es_central: esCentral, activa });
        toast({ title: 'Sucursal actualizada' });
      } else {
        await create.mutateAsync({ organizacion_id: organizacionId, nombre, direccion, telefono, es_central: esCentral, activa });
        toast({ title: 'Sucursal creada' });
      }
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const saving = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar sucursal' : 'Nueva sucursal'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1"><Label>Nombre *</Label><Input value={nombre} onChange={e => setNombre(e.target.value)} /></div>
          <div className="space-y-1"><Label>Dirección</Label><Input value={direccion} onChange={e => setDireccion(e.target.value)} /></div>
          <div className="space-y-1"><Label>Teléfono</Label><Input value={telefono} onChange={e => setTelefono(e.target.value)} /></div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div><Label>Sucursal central</Label><p className="text-xs text-muted-foreground">Marca esta sucursal como principal.</p></div>
            <Switch checked={esCentral} onCheckedChange={setEsCentral} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div><Label>Activa</Label><p className="text-xs text-muted-foreground">Si está inactiva no se asigna personal nuevo.</p></div>
            <Switch checked={activa} onCheckedChange={setActiva} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={saving}>{saving ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
