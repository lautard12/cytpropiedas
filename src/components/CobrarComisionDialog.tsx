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
import { DollarSign, Upload } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cobroId: string;
  montoComision: number;
  ivaComision: number;
  gastosReintegroInicial: number;
  propietarioNombre?: string;
  periodoLabel: string;
}

export default function CobrarComisionDialog({
  open, onOpenChange, cobroId, montoComision, ivaComision,
  gastosReintegroInicial, propietarioNombre, periodoLabel,
}: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const [fecha, setFecha] = useState(today);
  const [medio, setMedio] = useState('Transferencia');
  const [referencia, setReferencia] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [gastos, setGastos] = useState(String(gastosReintegroInicial || 0));
  const [file, setFile] = useState<File | null>(null);

  const gastosNum = Number(gastos) || 0;
  const total = montoComision + ivaComision + gastosNum;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let comprobanteUrl: string | null = null;
      if (file) {
        const path = `${cobroId}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from('rendiciones').upload(path, file);
        if (upErr) throw upErr;
        comprobanteUrl = path;
      }

      const { error } = await (supabase as any).rpc('confirmar_cobro_comision', {
        _cobro_id: cobroId,
        _fecha: fecha,
        _medio: medio,
        _referencia: referencia,
        _comprobante_url: comprobanteUrl,
        _observaciones: observaciones,
        _monto_gastos_reintegro: gastosNum,
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['cobros_comision_propietario'] });
      queryClient.invalidateQueries({ queryKey: ['liquidaciones'] });
      queryClient.invalidateQueries({ queryKey: ['eventos_contrato'] });

      toast({ title: 'Comisión cobrada', description: `Se registró el cobro de ${formatCurrency(total)} al propietario.` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Cobrar comisión al propietario</DialogTitle>
          <DialogDescription>
            Liquidación {periodoLabel}{propietarioNombre && <> · {propietarioNombre}</>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Comisión inmobiliaria</span><span className="font-medium">{formatCurrency(montoComision)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">IVA s/ comisión</span><span className="font-medium">{formatCurrency(ivaComision)}</span></div>
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Gastos a reintegrar</span>
              <Input type="number" value={gastos} onChange={e => setGastos(e.target.value)} className="w-32 h-8 text-right" />
            </div>
            <div className="flex justify-between border-t pt-2 mt-2"><span className="font-semibold">Total a cobrar</span><span className="font-bold text-base">{formatCurrency(total)}</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha de cobro</Label>
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
            <Label>Referencia / Nro.</Label>
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
          <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Procesando...' : 'Confirmar cobro'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
