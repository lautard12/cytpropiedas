import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/hooks/useSupabaseData';
import { logAudit } from '@/lib/audit';
import { CreditCard, AlertCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liquidacionId: string;
  contratoId: string;
  totalCobrar: number;
  totalCobrado: number;
  pendiente: number;
  periodoLabel: string;
}

export default function RegistrarPagoDialog({
  open, onOpenChange, liquidacionId, contratoId,
  totalCobrar, totalCobrado, pendiente, periodoLabel,
}: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const [monto, setMonto] = useState(pendiente.toString());
  const [medioPago, setMedioPago] = useState<string>('Transferencia');
  const [referencia, setReferencia] = useState('');
  const [fecha, setFecha] = useState(today);
  const [observaciones, setObservaciones] = useState('');

  const montoNum = parseFloat(monto) || 0;
  const nuevoTotalCobrado = totalCobrado + montoNum;
  const nuevoPendiente = totalCobrar - nuevoTotalCobrado;
  const nuevoEstado = nuevoPendiente <= 0 ? 'Cobrada' : nuevoTotalCobrado > 0 ? 'Parcial' : 'Pendiente';

  const handleSubmit = async () => {
    if (montoNum <= 0) {
      toast({ title: 'Error', description: 'El monto debe ser mayor a 0', variant: 'destructive' });
      return;
    }
    if (montoNum > pendiente) {
      toast({ title: 'Atención', description: 'El monto supera el pendiente. Verificá el importe.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: nuevoPago, error: pagoError } = await supabase.from('pagos').insert({
        liquidacion_id: liquidacionId,
        contrato_id: contratoId,
        monto: montoNum,
        medio_pago: medioPago as any,
        referencia: referencia || `PAG-${fecha.replace(/-/g, '')}`,
        fecha,
        estado: 'Confirmado' as any,
        observaciones,
      }).select().single();
      if (pagoError) throw pagoError;

      const { error: liqError } = await supabase.from('liquidaciones').update({
        total_cobrado: nuevoTotalCobrado,
        pendiente: Math.max(0, nuevoPendiente),
        estado: nuevoEstado as any,
      }).eq('id', liquidacionId);
      if (liqError) throw liqError;

      await logAudit({
        accion: 'crear', entidad: 'pago', entidad_id: nuevoPago.id,
        descripcion: `Pago registrado por ${formatCurrency(montoNum)} (${medioPago})`,
        datos_despues: nuevoPago, monto: montoNum,
      });

      queryClient.invalidateQueries({ queryKey: ['pagos'] });
      queryClient.invalidateQueries({ queryKey: ['liquidaciones'] });

      toast({ title: 'Pago registrado', description: `Se registró un pago de ${formatCurrency(montoNum)} por ${medioPago}.` });
      onOpenChange(false);
      setMonto(Math.max(0, nuevoPendiente).toString());
      setReferencia('');
      setObservaciones('');
    } catch (err: any) {
      toast({ title: 'Error al registrar pago', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Registrar pago
          </DialogTitle>
          <DialogDescription>
            Liquidación {periodoLabel} · Pendiente: <span className="font-semibold text-foreground">{formatCurrency(pendiente)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Resumen rápido */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md bg-muted p-2">
              <p className="text-muted-foreground">Total a cobrar</p>
              <p className="font-bold text-sm">{formatCurrency(totalCobrar)}</p>
            </div>
            <div className="rounded-md bg-muted p-2">
              <p className="text-muted-foreground">Ya cobrado</p>
              <p className="font-bold text-sm text-status-success">{formatCurrency(totalCobrado)}</p>
            </div>
            <div className="rounded-md bg-muted p-2">
              <p className="text-muted-foreground">Pendiente</p>
              <p className="font-bold text-sm text-status-danger">{formatCurrency(pendiente)}</p>
            </div>
          </div>

          {/* Monto */}
          <div className="space-y-1.5">
            <Label htmlFor="monto">Monto del pago *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="monto"
                type="number"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                className="pl-7"
                placeholder="0"
                min={0}
                max={pendiente}
              />
            </div>
            {montoNum > 0 && montoNum < pendiente && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Pago parcial — quedarán {formatCurrency(nuevoPendiente)} pendientes
              </p>
            )}
          </div>

          {/* Medio de pago */}
          <div className="space-y-1.5">
            <Label>Medio de pago *</Label>
            <Select value={medioPago} onValueChange={setMedioPago}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Transferencia">Transferencia bancaria</SelectItem>
                <SelectItem value="Efectivo">Efectivo</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="Depósito">Depósito bancario</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fecha y Referencia */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fecha">Fecha del pago</Label>
              <Input id="fecha" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="referencia">Referencia / Nro.</Label>
              <Input id="referencia" value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Ej: TRF-001" />
            </div>
          </div>

          {/* Observaciones */}
          <div className="space-y-1.5">
            <Label htmlFor="obs">Observaciones</Label>
            <Textarea id="obs" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Notas internas sobre este pago..." rows={2} />
          </div>

          {/* Preview del resultado */}
          {montoNum > 0 && (
            <div className="rounded-md border p-3 bg-muted/30 space-y-1 text-sm">
              <p className="font-medium text-xs text-muted-foreground uppercase">Resultado después del pago</p>
              <div className="flex justify-between">
                <span>Nuevo cobrado</span>
                <span className="font-semibold text-status-success">{formatCurrency(nuevoTotalCobrado)}</span>
              </div>
              <div className="flex justify-between">
                <span>Nuevo pendiente</span>
                <span className={nuevoPendiente > 0 ? 'font-semibold text-status-danger' : 'font-semibold text-status-success'}>
                  {formatCurrency(Math.max(0, nuevoPendiente))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Estado</span>
                <Badge className={
                  nuevoEstado === 'Cobrada' ? 'bg-status-success text-status-success-foreground' :
                  nuevoEstado === 'Parcial' ? 'bg-status-warning text-status-warning-foreground' :
                  'bg-muted text-muted-foreground'
                }>{nuevoEstado}</Badge>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading || montoNum <= 0}>
            {loading ? 'Registrando...' : 'Confirmar pago'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
