import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { usePropietarios, type Propiedad } from '@/hooks/useSupabaseData';
import { emptyPropiedadForm, useCreatePropiedad, useUpdatePropiedad, type PropiedadFormValues } from '@/hooks/usePropiedadMutations';

const schema = z.object({
  direccion: z.string().trim().min(3, 'Dirección requerida').max(200),
  unidad: z.string().trim().max(40).default(''),
  tipo: z.enum(['Departamento','Casa','Local','Oficina','Cochera','Galpon','Terreno','Otro']),
  propietario_id: z.string().uuid().nullable(),
  estado: z.enum(['Vacante','Alquilada','Reservada','En refacción','Inactiva']),
  metros: z.coerce.number().min(0).default(0),
  ambientes: z.coerce.number().int().min(0).default(1),
  observaciones: z.string().max(1000).default(''),
  latitud: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitud: z.coerce.number().min(-180).max(180).nullable().optional(),
  matricula_catastral: z.string().trim().max(80).default(''),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  propiedad?: Propiedad & { latitud?: number | null; longitud?: number | null; matricula_catastral?: string | null };
}

export default function PropiedadFormDialog({ open, onOpenChange, propiedad }: Props) {
  const { toast } = useToast();
  const isEdit = !!propiedad;
  const { data: propietarios = [] } = usePropietarios();
  const create = useCreatePropiedad();
  const update = useUpdatePropiedad();

  const [v, setV] = useState<PropiedadFormValues>(emptyPropiedadForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setV(propiedad ? {
        direccion: propiedad.direccion,
        unidad: propiedad.unidad,
        tipo: propiedad.tipo,
        propietario_id: propiedad.propietario_id,
        estado: propiedad.estado,
        metros: Number(propiedad.metros) || 0,
        ambientes: Number(propiedad.ambientes) || 1,
        observaciones: propiedad.observaciones,
        latitud: propiedad.latitud ?? null,
        longitud: propiedad.longitud ?? null,
        matricula_catastral: propiedad.matricula_catastral ?? '',
      } : emptyPropiedadForm);
      setErrors({});
    }
  }, [open, propiedad]);

  const set = <K extends keyof PropiedadFormValues>(k: K, val: PropiedadFormValues[K]) =>
    setV(prev => ({ ...prev, [k]: val }));

  const onSubmit = async () => {
    const parsed = schema.safeParse({
      ...v,
      latitud: v.latitud === null || v.latitud === undefined ? null : v.latitud,
      longitud: v.longitud === null || v.longitud === undefined ? null : v.longitud,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach(i => { const k = i.path[0] as string; if (k && !next[k]) next[k] = i.message; });
      setErrors(next);
      return;
    }
    try {
      const data = parsed.data as PropiedadFormValues;
      if (isEdit && propiedad) {
        await update.mutateAsync({ id: propiedad.id, values: data });
        toast({ title: 'Propiedad actualizada' });
      } else {
        await create.mutateAsync(data);
        toast({ title: 'Propiedad creada' });
      }
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const saving = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar propiedad' : 'Nueva propiedad'}</DialogTitle>
          <DialogDescription>Datos de la unidad inmueble. Latitud, longitud y matrícula catastral son opcionales.</DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-3 py-2">
          <div className="md:col-span-2 space-y-1">
            <Label>Dirección *</Label>
            <Input value={v.direccion} onChange={e => set('direccion', e.target.value)} placeholder="Av. Pellegrini 1234" />
            {errors.direccion && <p className="text-xs text-status-danger">{errors.direccion}</p>}
          </div>
          <div className="space-y-1">
            <Label>Unidad / Piso</Label>
            <Input value={v.unidad} onChange={e => set('unidad', e.target.value)} placeholder="3B" />
          </div>
          <div className="space-y-1">
            <Label>Tipo *</Label>
            <Select value={v.tipo} onValueChange={val => set('tipo', val)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Departamento','Casa','Local','Oficina','Cochera','Galpon','Terreno','Otro'].map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Propietario</Label>
            <Select value={v.propietario_id ?? '__none__'} onValueChange={val => set('propietario_id', val === '__none__' ? null : val)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin asignar</SelectItem>
                {propietarios.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Estado</Label>
            <Select value={v.estado} onValueChange={val => set('estado', val)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Vacante','Alquilada','Reservada','En refacción','Inactiva'].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Metros²</Label>
            <Input type="number" value={v.metros} onChange={e => set('metros', Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label>Ambientes</Label>
            <Input type="number" value={v.ambientes} onChange={e => set('ambientes', Number(e.target.value))} />
          </div>

          <div className="md:col-span-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Datos catastrales (opcional)</p>
          </div>
          <div className="space-y-1">
            <Label>Latitud</Label>
            <Input type="number" step="any" value={v.latitud ?? ''} onChange={e => set('latitud', e.target.value === '' ? null : Number(e.target.value))} placeholder="-32.9442" />
          </div>
          <div className="space-y-1">
            <Label>Longitud</Label>
            <Input type="number" step="any" value={v.longitud ?? ''} onChange={e => set('longitud', e.target.value === '' ? null : Number(e.target.value))} placeholder="-60.6505" />
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label>Matrícula catastral</Label>
            <Input value={v.matricula_catastral} onChange={e => set('matricula_catastral', e.target.value)} placeholder="16-09-04-1234-005-0001" />
          </div>

          <div className="md:col-span-2 space-y-1">
            <Label>Observaciones</Label>
            <Textarea rows={2} value={v.observaciones} onChange={e => set('observaciones', e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={saving}>{saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
