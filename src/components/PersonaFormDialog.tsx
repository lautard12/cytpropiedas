import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  emptyPersonaForm,
  findPersonaByIdentity,
  useAddRolToPersona,
  useCreatePersona,
  useUpdatePersona,
  type PersonaFormValues,
} from '@/hooks/usePersonaMutations';
import type { Persona, RolPersona } from '@/hooks/useSupabaseData';

const optionalText = (max: number) => z.string().trim().max(max).default('');

const baseSchema = z.object({
  nombre: z.string().trim().min(2, 'Nombre requerido (mín. 2 caracteres)').max(120),
  dni: optionalText(20),
  cuit: optionalText(20),
  email: optionalText(120).refine(
    v => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    'Email inválido',
  ),
  telefono: optionalText(40),
  direccion: optionalText(200),
  banco: optionalText(80),
  cbu: optionalText(40),
  garante: optionalText(120),
  garante_telefono: optionalText(40),
  observaciones: optionalText(1000),
});

const ROL_LABEL: Record<RolPersona, string> = {
  propietario: 'Propietario',
  inquilino: 'Inquilino',
  garante: 'Garante',
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rol: RolPersona;
  persona?: Persona;
}

export function PersonaFormDialog({ open, onOpenChange, rol, persona }: Props) {
  const { toast } = useToast();
  const isEdit = !!persona;
  const [values, setValues] = useState<PersonaFormValues>(emptyPersonaForm);
  const [errors, setErrors] = useState<Partial<Record<keyof PersonaFormValues, string>>>({});
  const [duplicate, setDuplicate] = useState<Awaited<ReturnType<typeof findPersonaByIdentity>>>(null);
  const [checking, setChecking] = useState(false);

  const createPersona = useCreatePersona();
  const updatePersona = useUpdatePersona();
  const addRol = useAddRolToPersona();

  useEffect(() => {
    if (open) {
      const p: any = persona;
      setValues(persona ? {
        nombre: p.nombre,
        dni: p.dni,
        cuit: p.cuit,
        email: p.email,
        telefono: p.telefono,
        direccion: p.direccion,
        banco: p.banco ?? '',
        cbu: p.cbu ?? '',
        garante: p.garante_nombre ?? p.garante ?? '',
        garante_telefono: p.garante_telefono ?? '',
        observaciones: p.observaciones,
      } : emptyPersonaForm);
      setErrors({});
      setDuplicate(null);
    }
  }, [open, persona]);

  const update = (key: keyof PersonaFormValues, val: string) => {
    setValues(v => ({ ...v, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }));
    if (!isEdit && (key === 'dni' || key === 'cuit' || key === 'email')) setDuplicate(null);
  };

  // Detect existing person when creating
  const checkDuplicate = async () => {
    if (isEdit) return;
    if (!values.dni.trim() && !values.cuit.trim() && !values.email.trim()) {
      setDuplicate(null);
      return;
    }
    setChecking(true);
    try {
      const found = await findPersonaByIdentity(values);
      setDuplicate(found);
    } catch (e) {
      // silent: best-effort lookup
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async () => {
    const result = baseSchema.safeParse(values);
    if (!result.success) {
      const next: typeof errors = {};
      result.error.issues.forEach(i => {
        const k = i.path[0] as keyof PersonaFormValues;
        if (k && !next[k]) next[k] = i.message;
      });
      setErrors(next);
      return;
    }
    const data = result.data as PersonaFormValues;

    try {
      if (isEdit && persona) {
        await updatePersona.mutateAsync({ id: persona.id, values: data, rol });
        toast({ title: 'Cambios guardados', description: `${data.nombre} actualizado correctamente.` });
        onOpenChange(false);
        return;
      }

      // Re-check duplicates on submit (in case user didn't blur)
      const existing = duplicate ?? await findPersonaByIdentity(data);
      if (existing) {
        if (existing.roles.includes(rol)) {
          toast({
            title: 'Ya existe',
            description: `${existing.nombre} ya está cargado como ${ROL_LABEL[rol].toLowerCase()}.`,
            variant: 'destructive',
          });
          return;
        }
        await addRol.mutateAsync({ personaId: existing.id, rol });
        toast({
          title: 'Rol agregado',
          description: `${existing.nombre} ahora también es ${ROL_LABEL[rol].toLowerCase()}.`,
        });
      } else {
        await createPersona.mutateAsync({ values: data, rol });
        toast({ title: 'Creado', description: `${data.nombre} agregado como ${ROL_LABEL[rol].toLowerCase()}.` });
      }
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message ?? 'No se pudo guardar.', variant: 'destructive' });
    }
  };

  const isPropietario = rol === 'propietario';
  const isInquilino = rol === 'inquilino';
  const saving = createPersona.isPending || updatePersona.isPending || addRol.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Editar ${ROL_LABEL[rol].toLowerCase()}` : `Nuevo ${ROL_LABEL[rol].toLowerCase()}`}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modificá los datos de contacto de la persona.'
              : `Completá los datos. Si la persona ya existe en el sistema, le agregamos el rol de ${ROL_LABEL[rol].toLowerCase()}.`}
          </DialogDescription>
        </DialogHeader>

        {duplicate && !isEdit && (
          <div className="rounded-md border border-status-info/40 bg-status-info/5 p-3 text-sm">
            <p className="font-medium">Persona existente: {duplicate.nombre}</p>
            <p className="text-muted-foreground mt-1">
              Roles actuales: {duplicate.roles.map(r => <Badge key={r} variant="secondary" className="mr-1">{ROL_LABEL[r]}</Badge>)}
            </p>
            {duplicate.roles.includes(rol)
              ? <p className="mt-2 text-status-warning">Ya está cargado como {ROL_LABEL[rol].toLowerCase()}.</p>
              : <p className="mt-2">Al guardar, le agregamos el rol de <strong>{ROL_LABEL[rol].toLowerCase()}</strong> sin duplicar el contacto.</p>}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3 py-2">
          <div className="md:col-span-2 space-y-1">
            <Label>Nombre completo *</Label>
            <Input value={values.nombre} onChange={e => update('nombre', e.target.value)} />
            {errors.nombre && <p className="text-xs text-status-danger">{errors.nombre}</p>}
          </div>
          <div className="space-y-1">
            <Label>DNI</Label>
            <Input value={values.dni} onChange={e => update('dni', e.target.value)} onBlur={checkDuplicate} placeholder="32.678.901" />
            {errors.dni && <p className="text-xs text-status-danger">{errors.dni}</p>}
          </div>
          <div className="space-y-1">
            <Label>CUIT</Label>
            <Input value={values.cuit} onChange={e => update('cuit', e.target.value)} onBlur={checkDuplicate} placeholder="20-12345678-9" />
            {errors.cuit && <p className="text-xs text-status-danger">{errors.cuit}</p>}
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" value={values.email} onChange={e => update('email', e.target.value)} onBlur={checkDuplicate} />
            {errors.email && <p className="text-xs text-status-danger">{errors.email}</p>}
          </div>
          <div className="space-y-1">
            <Label>Teléfono</Label>
            <Input value={values.telefono} onChange={e => update('telefono', e.target.value)} placeholder="341 456-7890" />
            {errors.telefono && <p className="text-xs text-status-danger">{errors.telefono}</p>}
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label>Dirección</Label>
            <Input value={values.direccion} onChange={e => update('direccion', e.target.value)} />
            {errors.direccion && <p className="text-xs text-status-danger">{errors.direccion}</p>}
          </div>

          {isPropietario && (
            <>
              <div className="space-y-1">
                <Label>Banco</Label>
                <Input value={values.banco} onChange={e => update('banco', e.target.value)} placeholder="Banco Nación" />
              </div>
              <div className="space-y-1">
                <Label>CBU / Alias</Label>
                <Input value={values.cbu} onChange={e => update('cbu', e.target.value)} />
              </div>
            </>
          )}

          {isInquilino && (
            <>
              <div className="space-y-1">
                <Label>Garante</Label>
                <Input value={values.garante} onChange={e => update('garante', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Teléfono garante</Label>
                <Input value={values.garante_telefono} onChange={e => update('garante_telefono', e.target.value)} />
              </div>
            </>
          )}

          <div className="md:col-span-2 space-y-1">
            <Label>Observaciones</Label>
            <Textarea value={values.observaciones} onChange={e => update('observaciones', e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || checking}>
            {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
