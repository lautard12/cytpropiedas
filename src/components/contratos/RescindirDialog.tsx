import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { differenceInMonths } from 'date-fns';
import { formatCurrency } from '@/hooks/useSupabaseData';
import { AlertTriangle } from 'lucide-react';

export function RescindirDialog({
  open, onClose, contrato,
}: {
  open: boolean; onClose: () => void;
  contrato: any;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0,10));
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);

  const fechaFin = new Date(contrato.fecha_fin);
  const fechaEf = new Date(fecha);
  const mesesRest = Math.max(0, differenceInMonths(fechaFin, fechaEf));
  const valorRest = mesesRest * Number(contrato.alquiler_base);
  const pct = Number(contrato.multa_rescision_porcentaje ?? 0);
  const multa = Math.round(valorRest * pct / 100);
  const moneda = contrato.moneda ?? 'ARS';

  const submit = async () => {
    setSaving(true);
    const { data, error } = await (supabase as any).rpc('rescindir_contrato', {
      _contrato_id: contrato.id,
      _fecha_efectiva: fecha,
      _motivo: motivo,
    });
    setSaving(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Contrato rescindido', description: data?.multa_monto > 0 ? `Multa generada: ${formatCurrency(data.multa_monto, moneda)}` : 'Sin multa.' });
    qc.invalidateQueries({ queryKey: ['contratos'] });
    qc.invalidateQueries({ queryKey: ['rescisiones'] });
    qc.invalidateQueries({ queryKey: ['eventos_contrato', contrato.id] });
    qc.invalidateQueries({ queryKey: ['liquidaciones'] });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-status-danger" /> Rescindir contrato anticipadamente</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Fecha efectiva</Label><Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>% multa pactada</Label><Input value={`${pct}%`} disabled /></div>
          </div>
          <div className="space-y-1.5"><Label>Motivo</Label><Textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2} placeholder="Motivo de la rescisión" /></div>
          <div className="rounded-md border bg-muted p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Meses restantes</span><strong>{mesesRest}</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Valor restante</span><strong>{formatCurrency(valorRest, moneda)}</strong></div>
            <div className="flex justify-between border-t pt-1"><span className="text-muted-foreground">Multa a aplicar ({pct}%)</span><strong className="text-status-danger">{formatCurrency(multa, moneda)}</strong></div>
          </div>
          {multa > 0 && (
            <p className="text-xs text-muted-foreground">Se generará una liquidación al inquilino por la multa y se marcará el contrato como Rescindido.</p>
          )}
          {pct === 0 && (
            <p className="text-xs text-status-warning">Este contrato no tiene multa pactada. Editá el contrato si corresponde aplicar una.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" onClick={submit} disabled={saving}>{saving ? 'Procesando...' : 'Confirmar rescisión'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
