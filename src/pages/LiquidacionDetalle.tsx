import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

import {
  useLiquidacion, useContrato, usePropiedad, usePropietario, useInquilino,
  useConceptosLiquidacion, usePagosByLiquidacion, useLiquidaciones,
  useEventosPorPeriodo, useRendicionByLiquidacion, useConsultaMoraByLiquidacion,
  useCobroComisionByLiquidacion,
  formatCurrency, formatDate,
} from '@/hooks/useSupabaseData';
import {
  ArrowLeft, CreditCard, CheckCircle, FileText, ChevronLeft, ChevronRight,
  MessageSquare, AlertTriangle, DollarSign, Zap, Ban, Send, Clock, MessageCircle,
  ThumbsUp, ThumbsDown,
} from 'lucide-react';
import RegistrarPagoDialog from '@/components/RegistrarPagoDialog';
import AnularPagoDialog from '@/components/AnularPagoDialog';
import RendirPropietarioDialog from '@/components/RendirPropietarioDialog';
import CobrarComisionDialog from '@/components/CobrarComisionDialog';
import ConceptoGastoDialog from '@/components/ConceptoGastoDialog';
import ConsultarMoraDialog from '@/components/ConsultarMoraDialog';
import { Plus, Wrench } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';


const TIPO_ICON: Record<string, React.ElementType> = {
  punitorio: AlertTriangle,
  bonificacion: Zap,
  gasto_especial: DollarSign,
  observacion: MessageSquare,
};

export default function LiquidacionDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pagoOpen, setPagoOpen] = useState(false);
  const [rendirOpen, setRendirOpen] = useState(false);
  const [cobrarOpen, setCobrarOpen] = useState(false);
  const [consultaOpen, setConsultaOpen] = useState(false);
  const [resolviendo, setResolviendo] = useState(false);
  const [acreditando, setAcreditando] = useState(false);
  const [anularPago, setAnularPago] = useState<{ id: string; monto: number } | null>(null);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: liq, isLoading } = useLiquidacion(id || '');
  const { data: contrato } = useContrato(liq?.contrato_id || '');
  const { data: propiedad } = usePropiedad(contrato?.propiedad_id || '');
  const { data: propietario } = usePropietario(contrato?.propietario_id || '');
  const { data: inquilino } = useInquilino(contrato?.inquilino_id || '');
  const { data: conceptos = [] } = useConceptosLiquidacion(liq?.id || '');
  const { data: pagos = [] } = usePagosByLiquidacion(liq?.id || '');
  const { data: allLiquidaciones = [] } = useLiquidaciones();
  const { data: eventosPeriodo = [] } = useEventosPorPeriodo(liq?.contrato_id || '', liq?.periodo || '');
  const { data: rendicion } = useRendicionByLiquidacion(liq?.id || '');
  const { data: cobroComision } = useCobroComisionByLiquidacion(liq?.id || '');
  const { data: consultaMora } = useConsultaMoraByLiquidacion(liq?.id || '');


  // IVA acumulado de los pagos
  const ivaComisionTotal = useMemo(
    () => pagos.filter(p => p.estado === 'Confirmado').reduce((s, p) => s + (Number(p.iva_comision) || 0), 0),
    [pagos]
  );

  // Días de mora estimados
  const moraInfo = useMemo(() => {
    if (!liq || !contrato || liq.pendiente <= 0) return null;
    const tasa = Number(contrato.tasa_mora_diaria || 0);
    if (tasa <= 0) return null;
    const [yStr, mStr] = liq.periodo.split('-');
    const venc = new Date(Number(yStr), Number(mStr) - 1, contrato.dia_vencimiento);
    venc.setDate(venc.getDate() + Number(contrato.dias_gracia_mora || 0));
    const hoy = new Date();
    const dias = Math.max(0, Math.floor((hoy.getTime() - venc.getTime()) / 86400000));
    if (dias === 0) return null;
    const interes = liq.pendiente * (Math.pow(1 + tasa / 100, dias) - 1);
    return { dias, interes: Math.round(interes * 100) / 100, tasa };
  }, [liq, contrato]);


  if (isLoading) return <div className="p-8"><Skeleton className="h-64" /></div>;
  if (!liq) return <div className="p-8 text-center text-muted-foreground">Liquidación no encontrada</div>;

  // Prev/next navigation
  const contratoLiqs = allLiquidaciones
    .filter(l => l.contrato_id === liq.contrato_id)
    .sort((a, b) => a.periodo.localeCompare(b.periodo));
  const currentIdx = contratoLiqs.findIndex(l => l.id === liq.id);
  const prevLiq = currentIdx > 0 ? contratoLiqs[currentIdx - 1] : null;
  const nextLiq = currentIdx < contratoLiqs.length - 1 ? contratoLiqs[currentIdx + 1] : null;

  const estadoBadge =
    liq.estado === 'Transferida' ? 'bg-status-success text-status-success-foreground'
    : liq.estado === 'Acreditada' ? 'bg-status-info text-status-info-foreground'
    : liq.estado === 'Cobrada' ? 'bg-status-success text-status-success-foreground'
    : liq.estado === 'Pendiente' ? 'bg-status-warning text-status-warning-foreground'
    : liq.estado === 'Parcial' ? 'bg-status-danger text-status-danger-foreground'
    : 'bg-muted text-muted-foreground';

  const handleResolverMora = async (aprobada: boolean) => {
    if (!consultaMora) return;
    setResolviendo(true);
    try {
      const { error } = await (supabase as any).rpc('resolver_consulta_mora', {
        _consulta_id: consultaMora.id,
        _aprobada: aprobada,
        _observaciones: '',
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['consultas_mora', liq?.id] });
      queryClient.invalidateQueries({ queryKey: ['liquidaciones'] });
      queryClient.invalidateQueries({ queryKey: ['conceptos_liquidacion'] });
      queryClient.invalidateQueries({ queryKey: ['eventos_contrato'] });
      toast({
        title: aprobada ? 'Punitorios aplicados' : 'Punitorio condonado',
        description: aprobada ? 'Se agregó el concepto de mora a la liquidación.' : 'Se registró que el propietario no autorizó la mora.',
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setResolviendo(false); }
  };

  const handleNotificarWhatsApp = async () => {
    if (!liq || !inquilino) return;
    const tel = (inquilino as any).telefono || '';
    if (!tel) {
      toast({ title: 'Sin teléfono', description: 'El inquilino no tiene teléfono cargado.', variant: 'destructive' });
      return;
    }
    const telLimpio = tel.replace(/[^\d]/g, '');
    const dirCompleta = `${propiedad?.direccion ?? ''} ${propiedad?.unidad ?? ''}`.trim();
    const venc = `${String(contrato?.dia_vencimiento ?? 10).padStart(2, '0')}/${liq.periodo.split('-')[1]}/${liq.periodo.split('-')[0]}`;
    const msg =
      `Hola ${inquilino.nombre}, te recordamos que la liquidación de ${liq.periodo_label} ` +
      `(${dirCompleta}) vence el ${venc}. ` +
      `Total: ${formatCurrency(liq.total_cobrar)}. Saldo pendiente: ${formatCurrency(liq.pendiente)}. Gracias!`;
    const url = `https://wa.me/${telLimpio}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');

    try {
      await supabase.from('eventos_contrato').insert({
        contrato_id: liq.contrato_id,
        liquidacion_id: liq.id,
        periodo: liq.periodo,
        fecha: new Date().toISOString().split('T')[0],
        tipo: 'notificacion_enviada',
        categoria: 'comunicacion',
        descripcion: `Recordatorio de cobranza enviado por WhatsApp a ${inquilino.nombre}`,
      } as any);
      queryClient.invalidateQueries({ queryKey: ['eventos_contrato'] });
    } catch { /* no bloquea */ }
  };

  const handleAcreditar = async () => {
    if (!liq) return;
    setAcreditando(true);
    try {
      const { error } = await (supabase as any).rpc('marcar_acreditada', {
        _liquidacion_id: liq.id,
        _fecha_acreditacion: new Date().toISOString().split('T')[0],
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['liquidaciones'] });
      queryClient.invalidateQueries({ queryKey: ['rendiciones_propietario'] });
      queryClient.invalidateQueries({ queryKey: ['eventos_contrato'] });
      toast({ title: 'Liquidación acreditada', description: 'Lista para rendir al propietario.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setAcreditando(false); }
  };


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
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {(() => {
            const modalidad = (liq as any).destino_cobro ?? 'Inmobiliaria';
            const esPropMode = modalidad === 'Propietario';
            const estadoLabel = liq.estado === 'Transferida'
              ? (esPropMode ? 'Comisión cobrada' : 'Rendida')
              : liq.estado;
            return (
              <>
                <Badge className={estadoBadge}>{estadoLabel}</Badge>
                <Badge variant="outline" className={esPropMode ? 'border-status-warning/50 text-status-warning' : 'border-status-info/50 text-status-info'}>
                  {esPropMode ? 'Cobra el propietario' : 'Cobra la inmobiliaria'}
                </Badge>
                {(liq.estado === 'Pendiente' || liq.estado === 'Parcial') && (
                  <Button variant="outline" size="sm" onClick={handleNotificarWhatsApp}>
                    <MessageCircle className="h-4 w-4 mr-1" /> Avisar por WhatsApp
                  </Button>
                )}
                {(liq.estado === 'Pendiente' || liq.estado === 'Parcial' || liq.estado === 'Borrador') && (
                  <Button variant="outline" size="sm" onClick={() => setPagoOpen(true)}>
                    <CreditCard className="h-4 w-4 mr-1" /> {esPropMode ? 'Registrar pago directo' : 'Registrar pago'}
                  </Button>
                )}
                {!esPropMode && liq.estado === 'Cobrada' && (
                  <Button size="sm" onClick={handleAcreditar} disabled={acreditando}>
                    <CheckCircle className="h-4 w-4 mr-1" /> {acreditando ? 'Procesando...' : 'Marcar acreditada'}
                  </Button>
                )}
                {!esPropMode && liq.estado === 'Acreditada' && (
                  <Button size="sm" onClick={() => setRendirOpen(true)}>
                    <Send className="h-4 w-4 mr-1" /> Rendir al propietario
                  </Button>
                )}
                {esPropMode && cobroComision && cobroComision.estado === 'Pendiente' && (
                  <Button size="sm" onClick={() => setCobrarOpen(true)}>
                    <DollarSign className="h-4 w-4 mr-1" /> Cobrar comisión al propietario
                  </Button>
                )}
              </>
            );
          })()}
        </div>

      </div>

      {moraInfo && (
        <Alert className="border-status-danger/40 bg-status-danger/5">
          <Clock className="h-4 w-4 text-status-danger" />
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>
              <strong className="text-status-danger">En mora — {moraInfo.dias} días.</strong>{' '}
              Punitorios estimados ({moraInfo.tasa}% diario):{' '}
              <strong>{formatCurrency(moraInfo.interes)}</strong>
            </span>

            {!consultaMora && (
              <Button size="sm" variant="outline" onClick={() => setConsultaOpen(true)}>
                <MessageSquare className="h-4 w-4 mr-1" /> Consultar al propietario
              </Button>
            )}

            {consultaMora?.estado === 'Pendiente' && (
              <div className="flex gap-2 items-center">
                <Badge className="bg-status-warning text-status-warning-foreground">Esperando respuesta</Badge>
                <Button size="sm" variant="outline" onClick={() => handleResolverMora(true)} disabled={resolviendo}>
                  <ThumbsUp className="h-4 w-4 mr-1" /> Aprobar
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleResolverMora(false)} disabled={resolviendo}>
                  <ThumbsDown className="h-4 w-4 mr-1" /> Rechazar
                </Button>
              </div>
            )}

            {consultaMora?.estado === 'Aprobada' && (
              <Badge className="bg-status-success text-status-success-foreground">
                Punitorio aprobado · {consultaMora.fecha_respuesta && formatDate(consultaMora.fecha_respuesta)}
              </Badge>
            )}

            {consultaMora?.estado === 'Rechazada' && (
              <Badge variant="outline" className="border-status-info/40 text-status-info">
                Punitorio condonado por el propietario · {consultaMora.fecha_respuesta && formatDate(consultaMora.fecha_respuesta)}
              </Badge>
            )}
          </AlertDescription>
        </Alert>
      )}


      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base">Conceptos del período</CardTitle>
                <p className="text-xs text-muted-foreground">Tildá los conceptos a medida que el inquilino los va abonando. Después registrá el pago agrupado.</p>
              </div>
              {(() => {
                const cobrablesPendientes = conceptos.filter(c => c.aplica_al_inquilino && !c.pago_id);
                const cobradosCount = conceptos.filter(c => c.aplica_al_inquilino && c.pago_id).length;
                const totalCobrables = conceptos.filter(c => c.aplica_al_inquilino).length;
                const sumaSel = conceptos
                  .filter(c => seleccionados.has(c.id))
                  .reduce((s, c) => s + Number(c.monto || 0), 0);
                return (
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline" className="text-xs">
                      Cobrados {cobradosCount}/{totalCobrables}
                    </Badge>
                    {seleccionados.size > 0 && (
                      <Button size="sm" onClick={() => setPagoOpen(true)}>
                        <CreditCard className="h-4 w-4 mr-1" />
                        Cobrar {seleccionados.size} ({formatCurrency(sumaSel)})
                      </Button>
                    )}
                    {seleccionados.size === 0 && cobrablesPendientes.length > 0 && liq.estado !== 'Transferida' && liq.estado !== 'Acreditada' && (
                      <p className="text-[10px] text-muted-foreground">Tildá conceptos para cobrar</p>
                    )}
                  </div>
                );
              })()}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="w-28">Estado</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {conceptos.map(c => {
                    const cobrado = !!c.pago_id;
                    const cobrable = c.aplica_al_inquilino;
                    const seleccionado = seleccionados.has(c.id);
                    return (
                      <TableRow key={c.id} className={cobrado ? 'bg-status-success/5' : ''}>
                        <TableCell>
                          {cobrable && !cobrado && (
                            <Checkbox
                              checked={seleccionado}
                              onCheckedChange={(v) => {
                                setSeleccionados(prev => {
                                  const n = new Set(prev);
                                  if (v) n.add(c.id); else n.delete(c.id);
                                  return n;
                                });
                              }}
                            />
                          )}
                          {cobrado && <CheckCircle className="h-4 w-4 text-status-success" />}
                        </TableCell>
                        <TableCell className={`font-medium ${cobrado ? 'text-muted-foreground' : ''}`}>{c.concepto}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{c.responsable}</Badge></TableCell>
                        <TableCell className="text-right">{formatCurrency(c.monto)}</TableCell>
                        <TableCell>
                          {cobrado ? (
                            <Badge className="bg-status-success text-status-success-foreground text-[10px]">Cobrado</Badge>
                          ) : cobrable ? (
                            <Badge variant="outline" className="text-[10px] border-status-warning/40 text-status-warning">Pendiente</Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">A cargo prop.</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {liq.saldo_anterior !== 0 && (
                    <TableRow><TableCell></TableCell><TableCell className="font-medium">Saldo anterior</TableCell><TableCell></TableCell><TableCell className="text-right">{formatCurrency(liq.saldo_anterior)}</TableCell><TableCell></TableCell></TableRow>
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
                  {pagos.map((p, i) => {
                    const anulado = p.estado === 'Anulado';
                    return (
                      <div key={p.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 bg-background ${anulado ? 'border-status-danger/40' : 'border-muted'}`}>
                            {anulado ? <Ban className="h-3.5 w-3.5 text-status-danger" /> : <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />}
                          </div>
                          {i < pagos.length - 1 && <div className="w-px flex-1 bg-border" />}
                        </div>
                        <div className="pb-4 flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className={`font-semibold text-sm ${anulado ? 'line-through text-muted-foreground' : ''}`}>{formatCurrency(p.monto)}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(p.fecha)} · Ref: {p.referencia}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`text-[10px] ${medioBadge(p.medio_pago)}`}>{p.medio_pago}</Badge>
                              <Badge className={`text-[10px] ${anulado ? 'bg-status-danger text-status-danger-foreground' : 'bg-status-success text-status-success-foreground'}`}>{p.estado}</Badge>
                              {!anulado && (
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setAnularPago({ id: p.id, monto: p.monto })}>
                                  <Ban className="h-3 w-3 mr-1" /> Anular
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
          {(() => {
            const esPropMode = ((liq as any).destino_cobro ?? 'Inmobiliaria') === 'Propietario';
            const gastosReintegro = Number(cobroComision?.monto_gastos_reintegro || 0);
            const ivaCobro = Number(cobroComision?.iva_comision || 0);
            const totalCobrarProp = liq.comision_inmobiliaria + (ivaCobro || ivaComisionTotal) + gastosReintegro;
            return (
              <Card>
                <CardHeader><CardTitle className="text-base">Resumen económico</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between py-1.5 border-b"><span className="text-muted-foreground">Subtotal conceptos</span><span className="font-semibold">{formatCurrency(liq.subtotal)}</span></div>
                  <div className="flex justify-between py-1.5 border-b"><span className="text-muted-foreground">Total a cobrar al inquilino</span><span className="font-bold text-lg">{formatCurrency(liq.total_cobrar)}</span></div>
                  <div className="flex justify-between py-1.5 border-b"><span className="text-muted-foreground">{esPropMode ? 'Informado como pagado' : 'Cobrado'}</span><span className="text-status-success font-semibold">{formatCurrency(liq.total_cobrado)}</span></div>
                  <div className="flex justify-between py-1.5 border-b"><span className="text-muted-foreground">Pendiente</span><span className={liq.pendiente > 0 ? 'text-status-danger font-semibold' : ''}>{formatCurrency(liq.pendiente)}</span></div>
                  <div className="h-px bg-border my-2"></div>

                  {!esPropMode && (
                    <>
                      <div className="flex justify-between py-1.5 border-b"><span className="text-muted-foreground">Comisión inmobiliaria</span><span className="text-status-info font-semibold">{formatCurrency(liq.comision_inmobiliaria)}</span></div>
                      {ivaComisionTotal > 0 && (
                        <div className="flex justify-between py-1.5 border-b"><span className="text-muted-foreground">IVA s/ comisión (facturado)</span><span className="text-status-info font-semibold">{formatCurrency(ivaComisionTotal)}</span></div>
                      )}
                      <div className="flex justify-between py-1.5 bg-muted/50 rounded px-2"><span className="font-semibold">Neto propietario</span><span className="font-bold">{formatCurrency(liq.neto_propietario)}</span></div>
                      {rendicion && (
                        <div className="mt-2 rounded-md border border-status-info/30 bg-status-info/5 p-2 text-xs space-y-0.5">
                          <p className="font-semibold text-status-info">Rendición</p>
                          <p>Acreditada: {formatDate(rendicion.fecha_acreditacion)}</p>
                          {rendicion.fecha_transferencia && <p>Transferida: {formatDate(rendicion.fecha_transferencia)} · {rendicion.medio}{rendicion.referencia ? ` · ${rendicion.referencia}` : ''}</p>}
                        </div>
                      )}
                    </>
                  )}

                  {esPropMode && (
                    <div className="rounded-md border border-status-warning/30 bg-status-warning/5 p-3 space-y-1.5">
                      <p className="font-semibold text-status-warning text-xs uppercase tracking-wide">A cobrar al propietario</p>
                      <div className="flex justify-between"><span className="text-muted-foreground">Comisión inmobiliaria</span><span className="font-medium">{formatCurrency(liq.comision_inmobiliaria)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">IVA s/ comisión</span><span className="font-medium">{formatCurrency(ivaCobro || ivaComisionTotal)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Gastos a reintegrar</span><span className="font-medium">{formatCurrency(gastosReintegro)}</span></div>
                      <div className="flex justify-between border-t border-status-warning/30 pt-1.5 mt-1.5"><span className="font-semibold">Total a cobrar</span><span className="font-bold">{formatCurrency(totalCobrarProp)}</span></div>
                    </div>
                  )}

                  {esPropMode && cobroComision && (
                    <div className={`mt-2 rounded-md border p-2 text-xs space-y-0.5 ${cobroComision.estado === 'Cobrada' ? 'border-status-success/30 bg-status-success/5' : 'border-status-warning/30 bg-status-warning/5'}`}>
                      <p className={`font-semibold ${cobroComision.estado === 'Cobrada' ? 'text-status-success' : 'text-status-warning'}`}>Cobro de comisión · {cobroComision.estado}</p>
                      {cobroComision.fecha_cobro && <p>Cobrada: {formatDate(cobroComision.fecha_cobro)} · {cobroComision.medio}{cobroComision.referencia ? ` · ${cobroComision.referencia}` : ''}</p>}
                      {cobroComision.estado === 'Pendiente' && <p className="text-muted-foreground">Pendiente de cobrar al propietario.</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}


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

      <RegistrarPagoDialog
        open={pagoOpen}
        onOpenChange={(open) => {
          setPagoOpen(open);
          if (!open) setSeleccionados(new Set());
        }}
        liquidacionId={liq.id}
        contratoId={liq.contrato_id}
        totalCobrar={liq.total_cobrar}
        totalCobrado={liq.total_cobrado}
        pendiente={liq.pendiente}
        comisionTotal={liq.comision_inmobiliaria}
        periodoLabel={liq.periodo_label}
        mediosPagoAceptados={contrato?.medios_pago_aceptados}
        destinoCobro={contrato?.destino_cobro}
        diaVencimiento={contrato?.dia_vencimiento}
        conceptoIds={seleccionados.size > 0 ? Array.from(seleccionados) : undefined}
        montoSugerido={seleccionados.size > 0
          ? conceptos.filter(c => seleccionados.has(c.id)).reduce((s, c) => s + Number(c.monto || 0), 0)
          : undefined}
      />


      {moraInfo && (
        <ConsultarMoraDialog
          open={consultaOpen}
          onOpenChange={setConsultaOpen}
          liquidacionId={liq.id}
          diasAtraso={moraInfo.dias}
          montoEstimado={moraInfo.interes}
          tasaDiaria={moraInfo.tasa}
          propietarioNombre={propietario?.nombre}
        />
      )}

      <RendirPropietarioDialog
        open={rendirOpen}
        onOpenChange={setRendirOpen}
        liquidacionId={liq.id}
        netoPropietario={liq.neto_propietario}
        propietarioNombre={propietario?.nombre}
        periodoLabel={liq.periodo_label}
      />

      {cobroComision && (
        <CobrarComisionDialog
          open={cobrarOpen}
          onOpenChange={setCobrarOpen}
          cobroId={cobroComision.id}
          montoComision={Number(cobroComision.monto_comision || 0)}
          ivaComision={Number(cobroComision.iva_comision || 0)}
          gastosReintegroInicial={Number(cobroComision.monto_gastos_reintegro || 0)}
          propietarioNombre={propietario?.nombre}
          periodoLabel={liq.periodo_label}
        />
      )}

      {anularPago && (
        <AnularPagoDialog
          open={!!anularPago}
          onOpenChange={open => !open && setAnularPago(null)}
          pagoId={anularPago.id}
          monto={anularPago.monto}
        />
      )}
    </div>
  );
}
