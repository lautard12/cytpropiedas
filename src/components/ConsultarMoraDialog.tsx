import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/hooks/useSupabaseData';
import { AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liquidacionId: string;
  diasAtraso: number;
  montoEstimado: number;
  tasaDiaria: number;
  propietarioNombre?: string;
}

export default function ConsultarMoraDialog({
  open, onOpenChange, liquidacionId, diasAtraso, montoEstimado, tasaDiaria, propietarioNombre,
}: Props) {
  const queryClient = useQueryClient();
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { error } = await (supabase as any).rpc('solicitar_autorizacion_mora', {
        _liquidacion_id: liquidacionId,
        _observaciones: observaciones,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['consultas_mora', liquidacionId] });
      queryClient.invalidateQueries({ queryKey: ['eventos_contrato'] });
      toast({ title: 'Consulta registrada', description: 'Esperando respuesta del propietario para aplicar el punitorio.' });
      onOpenChange(false);
      setObservaciones('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-status-warning" /> Consultar al propietario
          </DialogTitle>
          <DialogDescription>
            Antes de aplicar punitorios, consultá con {propietarioNombre || 'el propietario'} si autoriza el cobro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-md bg-muted p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Días de atraso</span><strong>{diasAtraso}</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tasa diaria</span><strong>{tasaDiaria}%</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Punitorio estimado</span><strong className="text-status-danger">{formatCurrency(montoEstimado)}</strong></div>
          </div>

          <div className="space-y-1.5">
            <Label>Observaciones (opcional)</Label>
            <Textarea
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Ej: Inquilino avisó que pagaba el 15. Consultar si aplicamos."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Enviando...' : 'Registrar consulta'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
