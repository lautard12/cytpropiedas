import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/hooks/useSupabaseData';
import { logAudit } from '@/lib/audit';
import { CreditCard, AlertCircle, Receipt } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liquidacionId: string;
  contratoId: string;
  totalCobrar: number;
  totalCobrado: number;
  pendiente: number;
  comisionTotal: number;
  periodoLabel: string;
  mediosPagoAceptados?: string[];
  destinoCobro?: string;
  diaVencimiento?: number;
  /** IDs de conceptos que se están imputando con este pago (opcional). */
  conceptoIds?: string[];
  /** Monto sugerido (suma de conceptos seleccionados). Si se pasa, prevalece sobre pendiente. */
  montoSugerido?: number;
}

const IVA_RATE = 0.21;

export default function RegistrarPagoDialog({
  open, onOpenChange, liquidacionId, contratoId,
  totalCobrar, totalCobrado, pendiente, comisionTotal, periodoLabel,
  mediosPagoAceptados, destinoCobro, diaVencimiento,
  conceptoIds, montoSugerido,
}: Props) {

  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const mediosDisponibles = useMemo(() => {
    const todos = ['Transferencia', 'Efectivo', 'Cheque', 'Mercado Pago', 'Débito automático'];
    if (!mediosPagoAceptados || mediosPagoAceptados.length === 0) return todos;
    return todos.filter(m => mediosPagoAceptados.includes(m));
  }, [mediosPagoAceptados]);

  const [monto, setMonto] = useState(pendiente.toString());
  const [medioPago, setMedioPago] = useState<string>(mediosDisponibles[0] || 'Transferencia');
  const [referencia, setReferencia] = useState('');
  const [fecha, setFecha] = useState(today);
  const [observaciones, setObservaciones] = useState('');

  // Facturación
  const [generaFactura, setGeneraFactura] = useState(true);
  const [tipoFactura, setTipoFactura] = useState<'A' | 'B'>('A');
  const [numeroFactura, setNumeroFactura] = useState('');

  const montoNum = parseFloat(monto) || 0;
  const esTransferencia = medioPago === 'Transferencia';
  const debeFacturar = esTransferencia && generaFactura;

  // Comisión y IVA proporcional al pago
  const { comisionProporcional, ivaComision } = useMemo(() => {
    if (totalCobrar <= 0 || montoNum <= 0) return { comisionProporcional: 0, ivaComision: 0 };
    const comisionProp = comisionTotal * (montoNum / totalCobrar);
    const iva = debeFacturar ? comisionProp * IVA_RATE : 0;
    return {
      comisionProporcional: Math.round(comisionProp * 100) / 100,
      ivaComision: Math.round(iva * 100) / 100,
    };
  }, [montoNum, totalCobrar, comisionTotal, debeFacturar]);

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
    if (debeFacturar && !numeroFactura.trim()) {
      toast({ title: 'Falta el número de factura', description: 'Ingresá el número de la factura A o B emitida.', variant: 'destructive' });
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
        genera_factura: debeFacturar,
        tipo_factura: debeFacturar ? tipoFactura : null,
        numero_factura: debeFacturar ? numeroFactura.trim() : '',
        iva_comision: ivaComision,
      } as any).select().single();
      if (pagoError) throw pagoError;

      const { error: liqError } = await supabase.from('liquidaciones').update({
        total_cobrado: nuevoTotalCobrado,
        pendiente: Math.max(0, nuevoPendiente),
        estado: nuevoEstado as any,
      }).eq('id', liquidacionId);
      if (liqError) throw liqError;

      await logAudit({
        accion: 'crear', entidad: 'pago', entidad_id: nuevoPago.id,
        descripcion: `Pago registrado por ${formatCurrency(montoNum)} (${medioPago})${debeFacturar ? ` · Factura ${tipoFactura} ${numeroFactura}` : ''}`,
        datos_despues: nuevoPago, monto: montoNum,
      });

      queryClient.invalidateQueries({ queryKey: ['pagos'] });
      queryClient.invalidateQueries({ queryKey: ['liquidaciones'] });

      toast({ title: 'Pago registrado', description: `Se registró un pago de ${formatCurrency(montoNum)} por ${medioPago}.` });
      onOpenChange(false);
      setMonto(Math.max(0, nuevoPendiente).toString());
      setReferencia('');
      setObservaciones('');
      setNumeroFactura('');
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

          <div className="space-y-1.5">
            <Label htmlFor="monto">Monto del pago *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input id="monto" type="number" value={monto} onChange={e => setMonto(e.target.value)}
                className="pl-7" placeholder="0" min={0} max={pendiente} />
            </div>
            {montoNum > 0 && montoNum < pendiente && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Pago parcial — quedarán {formatCurrency(nuevoPendiente)} pendientes
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Medio de pago *</Label>
            <Select value={medioPago} onValueChange={setMedioPago}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {mediosDisponibles.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {destinoCobro && (
              <p className="text-xs text-muted-foreground">
                Acuerdo: pagar a <strong>{destinoCobro}</strong>
                {mediosPagoAceptados && mediosPagoAceptados.length > 0 && (
                  <> · Medios pactados: {mediosPagoAceptados.join(', ')}</>
                )}
              </p>
            )}
            {!esTransferencia && (
              <p className="text-xs text-muted-foreground">Sin facturación obligatoria — no se aplica IVA sobre la comisión.</p>
            )}
            {montoNum > 0 && montoNum < pendiente && (
              <p className="text-xs text-status-warning flex items-start gap-1 mt-1">
                <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>Si el faltante se abona después del día {diaVencimiento ?? 10}, se podrán aplicar punitorios sobre ese saldo (previa consulta al propietario).</span>
              </p>
            )}
          </div>

          {/* Facturación condicional */}
          {esTransferencia && (
            <div className="rounded-md border border-status-info/30 bg-status-info/5 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-sm font-semibold">
                  <Receipt className="h-4 w-4 text-status-info" /> Facturación
                </Label>
                <Switch checked={generaFactura} onCheckedChange={setGeneraFactura} />
              </div>
              {generaFactura && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tipo</Label>
                      <Select value={tipoFactura} onValueChange={v => setTipoFactura(v as 'A' | 'B')}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">Factura A</SelectItem>
                          <SelectItem value="B">Factura B</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Número *</Label>
                      <Input value={numeroFactura} onChange={e => setNumeroFactura(e.target.value)} placeholder="0001-00000123" />
                    </div>
                  </div>
                  <div className="text-xs space-y-1 pt-1 border-t border-status-info/20">
                    <div className="flex justify-between"><span className="text-muted-foreground">Comisión proporcional</span><span className="font-medium">{formatCurrency(comisionProporcional)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">IVA s/ comisión (21%)</span><span className="font-semibold text-status-info">{formatCurrency(ivaComision)}</span></div>
                  </div>
                </>
              )}
            </div>
          )}

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

          <div className="space-y-1.5">
            <Label htmlFor="obs">Observaciones</Label>
            <Textarea id="obs" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Notas internas sobre este pago..." rows={2} />
          </div>

          {montoNum > 0 && (
            <div className="rounded-md border p-3 bg-muted/30 space-y-1 text-sm">
              <p className="font-medium text-xs text-muted-foreground uppercase">Resultado después del pago</p>
              <div className="flex justify-between"><span>Nuevo cobrado</span><span className="font-semibold text-status-success">{formatCurrency(nuevoTotalCobrado)}</span></div>
              <div className="flex justify-between"><span>Nuevo pendiente</span>
                <span className={nuevoPendiente > 0 ? 'font-semibold text-status-danger' : 'font-semibold text-status-success'}>
                  {formatCurrency(Math.max(0, nuevoPendiente))}
                </span>
              </div>
              <div className="flex justify-between items-center"><span>Estado</span>
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
