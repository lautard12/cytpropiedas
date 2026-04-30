import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { logAudit } from '@/lib/audit';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  legajoId: string;
  personaNombre: string;
  userId: string;
}

const CAUSAS = ['Renuncia', 'Despido', 'Jubilación', 'Fallecimiento', 'Fin de contrato', 'Otro'];

export default function PersonalBajaDialog({ open, onOpenChange, legajoId, personaNombre, userId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [causa, setCausa] = useState('Renuncia');
  const [detalle, setDetalle] = useState('');
  const [saving, setSaving] = useState(false);

  const onSubmit = async () => {
    if (!fecha || !causa) {
      toast({ title: 'Datos incompletos', description: 'Indicá fecha y causa de baja.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const causaFinal = detalle.trim() ? `${causa} — ${detalle.trim()}` : causa;
      const { error } = await (supabase as any).from('personal').update({
        fecha_baja: fecha,
        causa_baja: causaFinal,
      }).eq('id', legajoId);
      if (error) throw error;

      // Desactivar usuario lógicamente
      await (supabase as any).from('usuarios').update({ activo: false }).eq('id', userId);

      await logAudit({
        accion: 'editar',
        entidad: 'user_role',
        entidad_id: userId,
        descripcion: `Baja de personal: ${personaNombre} — ${causaFinal} (${fecha})`,
        datos_despues: { fecha_baja: fecha, causa_baja: causaFinal },
      });

      qc.invalidateQueries({ queryKey: ['usuarios', 'personal'] });
      toast({ title: 'Baja registrada', description: `${personaNombre} fue dado de baja.` });
      onOpenChange(false);
      setDetalle('');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dar de baja a {personaNombre}</DialogTitle>
          <DialogDescription>El legajo quedará cerrado y el usuario será desactivado.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Fecha de baja *</Label>
            <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Causa de baja *</Label>
            <Select value={causa} onValueChange={setCausa}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CAUSAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Detalle (opcional)</Label>
            <Textarea value={detalle} onChange={e => setDetalle(e.target.value)} rows={3} placeholder="Aclaraciones adicionales…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button variant="destructive" onClick={onSubmit} disabled={saving}>{saving ? 'Procesando…' : 'Confirmar baja'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
