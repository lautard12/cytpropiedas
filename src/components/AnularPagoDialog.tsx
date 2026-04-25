import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAnularPago } from '@/hooks/usePagoMutations';
import { formatCurrency } from '@/hooks/useSupabaseData';
import { AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pagoId: string;
  monto: number;
}

export default function AnularPagoDialog({ open, onOpenChange, pagoId, monto }: Props) {
  const { toast } = useToast();
  const anular = useAnularPago();
  const [motivo, setMotivo] = useState('');

  const onConfirm = async () => {
    if (motivo.trim().length < 4) {
      toast({ title: 'Motivo requerido', description: 'Indicá una breve razón (mín. 4 caracteres).', variant: 'destructive' });
      return;
    }
    try {
      await anular.mutateAsync({ pagoId, motivo: motivo.trim() });
      toast({ title: 'Pago anulado', description: 'Se actualizó la liquidación y se registró en auditoría.' });
      setMotivo('');
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Error al anular', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-status-danger" /> Anular pago
          </DialogTitle>
          <DialogDescription>
            Vas a anular un pago de <strong>{formatCurrency(monto)}</strong>.
            La liquidación volverá al estado anterior (Parcial o Pendiente) y queda registrado en la auditoría.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label>Motivo de la anulación *</Label>
          <Textarea
            rows={3}
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Ej: cheque rechazado, error de carga, devolución…"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={anular.isPending}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={anular.isPending}>
            {anular.isPending ? 'Anulando…' : 'Anular pago'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
