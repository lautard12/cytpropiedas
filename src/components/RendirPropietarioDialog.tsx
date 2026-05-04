import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/hooks/useSupabaseData';
import { Send, Upload } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liquidacionId: string;
  netoPropietario: number;
  propietarioNombre?: string;
  periodoLabel: string;
}

export default function RendirPropietarioDialog({
  open, onOpenChange, liquidacionId, netoPropietario, propietarioNombre, periodoLabel,
}: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const [fecha, setFecha] = useState(today);
  const [medio, setMedio] = useState<string>('Transferencia');
  const [referencia, setReferencia] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let comprobanteUrl: string | null = null;
      if (file) {
        const path = `${liquidacionId}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from('rendiciones').upload(path, file);
        if (upErr) throw upErr;
        comprobanteUrl = path;
      }

      const { error } = await (supabase as any).rpc('rendir_propietario', {
        _liquidacion_id: liquidacionId,
        _fecha_transferencia: fecha,
        _medio: medio,
        _referencia: referencia,
        _comprobante_url: comprobanteUrl,
        _observaciones: observaciones,
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['liquidaciones'] });
      queryClient.invalidateQueries({ queryKey: ['rendiciones_propietario'] });
      queryClient.invalidateQueries({ queryKey: ['eventos_contrato'] });

      toast({ title: 'Rendición registrada', description: `Se rindió ${formatCurrency(netoPropietario)} al propietario.` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error al rendir', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> Rendir al propietario</DialogTitle>
          <DialogDescription>
            Liquidación {periodoLabel} · Neto a transferir:{' '}
            <span className="font-semibold text-foreground">{formatCurrency(netoPropietario)}</span>
            {propietarioNombre && <> · {propietarioNombre}</>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha de transferencia</Label>
              <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Medio</Label>
              <Select value={medio} onValueChange={setMedio}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Mercado Pago">Mercado Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Referencia / Nro. de operación</Label>
            <Input value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Ej: TRF-44581" />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Upload className="h-3.5 w-3.5" /> Comprobante (opcional)</Label>
            <Input type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
          <div className="space-y-1.5">
            <Label>Observaciones</Label>
            <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Procesando...' : 'Confirmar rendición'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
