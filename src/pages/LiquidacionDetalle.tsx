import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useLiquidacion, useContrato, usePropiedad, usePropietario, useInquilino,
  useConceptosLiquidacion, usePagosByLiquidacion, useLiquidaciones,
  useEventosPorPeriodo,
  formatCurrency, formatDate,
} from '@/hooks/useSupabaseData';
import {
  ArrowLeft, CreditCard, CheckCircle, FileText, ChevronLeft, ChevronRight,
  MessageSquare, AlertTriangle, DollarSign, Zap,
} from 'lucide-react';
import RegistrarPagoDialog from '@/components/RegistrarPagoDialog';

const TIPO_ICON: Record<string, React.ElementType> = {
  punitorio: AlertTriangle,
  bonificacion: Zap,
  gasto_especial: DollarSign,
  observacion: MessageSquare,
};

export default function LiquidacionDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: liq, isLoading } = useLiquidacion(id || '');
  const { data: contrato } = useContrato(liq?.contrato_id || '');
  const { data: propiedad } = usePropiedad(contrato?.propiedad_id || '');
  const { data: propietario } = usePropietario(contrato?.propietario_id || '');
  const { data: inquilino } = useInquilino(contrato?.inquilino_id || '');
  const { data: conceptos = [] } = useConceptosLiquidacion(liq?.id || '');
  const { data: pagos = [] } = usePagosByLiquidacion(liq?.id || '');
  const { data: allLiquidaciones = [] } = useLiquidaciones();
  const { data: eventosPeriodo = [] } = useEventosPorPeriodo(liq?.contrato_id || '', liq?.periodo || '');

  if (isLoading) return <div className="p-8"><Skeleton className="h-64" /></div>;
  if (!liq) return <div className="p-8 text-center text-muted-foreground">Liquidación no encontrada</div>;

  // Prev/next navigation
  const contratoLiqs = allLiquidaciones
    .filter(l => l.contrato_id === liq.contrato_id)
    .sort((a, b) => a.periodo.localeCompare(b.periodo));
  const currentIdx = contratoLiqs.findIndex(l => l.id === liq.id);
  const prevLiq = currentIdx > 0 ? contratoLiqs[currentIdx - 1] : null;
  const nextLiq = currentIdx < contratoLiqs.length - 1 ? contratoLiqs[currentIdx + 1] : null;

  const estadoBadge = liq.estado === 'Cobrada' || liq.estado === 'Transferida' ? 'bg-status-success text-status-success-foreground'
    : liq.estado === 'Pendiente' ? 'bg-status-warning text-status-warning-foreground'
    : liq.estado === 'Parcial' ? 'bg-status-danger text-status-danger-foreground'
    : 'bg-muted text-muted-foreground';

  const medioBadge = (medio: string) => {
    switch (medio) {
      case 'Transferencia': return 'bg-status-info text-status-info-foreground';
      case 'Efectivo': return 'bg-status-success text-status-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/liquidaciones')}><ArrowLeft className="h-4 w-4 mr-1" /> Volver a Liquidaciones</Button>
        <div className="flex gap-2">
          {prevLiq && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/liquidaciones/${prevLiq.id}`)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> {prevLiq.periodo_label}
            </Button>
          )}
          {nextLiq && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/liquidaciones/${nextLiq.id}`)}>
              {nextLiq.periodo_label} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Liquidación mensual — Contrato {contrato?.codigo} — {liq.periodo_label}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{propiedad?.direccion} {propiedad?.unidad} · Inquilino: {inquilino?.nombre} · Propietario: {propietario?.nombre}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={estadoBadge}>{liq.estado}</Badge>
          <Button variant="outline" size="sm"><CreditCard className="h-4 w-4 mr-1" /> Registrar pago</Button>
          {liq.estado === 'Cobrada' && <Button size="sm"><CheckCircle className="h-4 w-4 mr-1" /> Marcar transferido</Button>}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conceptos del período</CardTitle>
              <p className="text-xs text-muted-foreground">Los conceptos y responsables se determinan según las reglas del contrato {contrato?.codigo}</p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Concepto</TableHead><TableHead>Responsable</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
                <TableBody>
                  {conceptos.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.concepto}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{c.responsable}</Badge></TableCell>
                      <TableCell className="text-right">{formatCurrency(c.monto)}</TableCell>
                    </TableRow>
                  ))}
                  {liq.saldo_anterior !== 0 && (
                    <TableRow><TableCell className="font-medium">Saldo anterior</TableCell><TableCell></TableCell><TableCell className="text-right">{formatCurrency(liq.saldo_anterior)}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagos — mini timeline */}
          <Card>
            <CardHeader><CardTitle className="text-base">Pagos registrados</CardTitle></CardHeader>
            <CardContent>
              {pagos.length > 0 ? (
                <div className="space-y-0">
                  {pagos.map((p, i) => (
                    <div key={p.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-muted bg-background">
                          <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        {i < pagos.length - 1 && <div className="w-px flex-1 bg-border" />}
                      </div>
                      <div className="pb-4 flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm">{formatCurrency(p.monto)}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(p.fecha)} · Ref: {p.referencia}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-[10px] ${medioBadge(p.medio_pago)}`}>{p.medio_pago}</Badge>
                            <Badge className="bg-status-success text-status-success-foreground text-[10px]">{p.estado}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Sin pagos registrados</p>
              )}
            </CardContent>
          </Card>

          {/* Eventos del período */}
          {eventosPeriodo.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-status-warning" />
                  Eventos del período
                </CardTitle>
                <p className="text-xs text-muted-foreground">Eventos registrados durante {liq.periodo_label} para este contrato.</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {eventosPeriodo.map(e => {
                    const Icon = TIPO_ICON[e.tipo] || MessageSquare;
                    return (
                      <div key={e.id} className="flex items-start gap-3 rounded-md border p-3">
                        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs text-muted-foreground">{formatDate(e.fecha)}</span>
                            <Badge variant="outline" className="text-[10px]">{e.tipo.replace(/_/g, ' ')}</Badge>
                          </div>
                          <p className="text-sm">{e.descripcion}</p>
                          {e.monto != null && e.monto !== 0 && (
                            <p className="text-sm font-semibold mt-1">{formatCurrency(e.monto)}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Resumen económico</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b"><span className="text-muted-foreground">Subtotal conceptos</span><span className="font-semibold">{formatCurrency(liq.subtotal)}</span></div>
              <div className="flex justify-between py-1.5 border-b"><span className="text-muted-foreground">Total a cobrar</span><span className="font-bold text-lg">{formatCurrency(liq.total_cobrar)}</span></div>
              <div className="flex justify-between py-1.5 border-b"><span className="text-muted-foreground">Cobrado</span><span className="text-status-success font-semibold">{formatCurrency(liq.total_cobrado)}</span></div>
              <div className="flex justify-between py-1.5 border-b"><span className="text-muted-foreground">Pendiente</span><span className={liq.pendiente > 0 ? 'text-status-danger font-semibold' : ''}>{formatCurrency(liq.pendiente)}</span></div>
              <div className="h-px bg-border my-2"></div>
              <div className="flex justify-between py-1.5 border-b"><span className="text-muted-foreground">Comisión inmobiliaria</span><span className="text-status-info font-semibold">{formatCurrency(liq.comision_inmobiliaria)}</span></div>
              <div className="flex justify-between py-1.5 bg-muted/50 rounded px-2"><span className="font-semibold">Neto propietario</span><span className="font-bold">{formatCurrency(liq.neto_propietario)}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Contrato asociado</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Código</span><Badge variant="outline" className="cursor-pointer" onClick={() => navigate(`/contratos/${contrato?.id}`)}>{contrato?.codigo}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Comisión</span><span>{contrato?.comision_porcentaje}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">IVA</span><span>{contrato?.iva ? 'Sí' : 'No'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">TGI</span><span>{contrato?.tgi}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">API</span><span>{contrato?.api}</span></div>
            </CardContent>
          </Card>

          {liq.observaciones && (
            <Card><CardHeader><CardTitle className="text-base">Observaciones</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{liq.observaciones}</p></CardContent></Card>
          )}
        </div>
      </div>
    </div>
  );
}
