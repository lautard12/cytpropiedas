import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useContrato, usePropiedad, usePropietario, useInquilino, useLiquidaciones,
  useEventosContrato,
  formatCurrency, formatDate,
  type EventoContrato,
} from '@/hooks/useSupabaseData';
import {
  ArrowLeft, FileText, Calculator, Edit, CalendarDays, TrendingUp,
  RefreshCw, Percent, XCircle, ShieldCheck, DollarSign, AlertTriangle,
  MessageSquare, Handshake, Paperclip, Clock, BarChart3, Zap,
} from 'lucide-react';
import { differenceInMonths } from 'date-fns';
import { GarantiasSection } from '@/components/contratos/GarantiasSection';
import { RescindirDialog } from '@/components/contratos/RescindirDialog';
import { RenovacionSection } from '@/components/contratos/RenovacionSection';

const TIPO_ICON: Record<string, React.ElementType> = {
  inicio_contrato: FileText,
  renovacion: RefreshCw,
  ajuste_alquiler: TrendingUp,
  cambio_comision: Percent,
  cambio_responsable: ShieldCheck,
  rescision: XCircle,
  finalizacion: XCircle,
  deposito_garantia: DollarSign,
  punitorio: AlertTriangle,
  bonificacion: Zap,
  descuento: Zap,
  honorarios: DollarSign,
  gasto_especial: DollarSign,
  observacion: MessageSquare,
  acuerdo: Handshake,
  comprobante: Paperclip,
};

const CATEGORIA_COLOR: Record<string, string> = {
  contractual: 'bg-status-info text-status-info-foreground',
  financiero: 'bg-status-warning text-status-warning-foreground',
  administrativo: 'bg-muted text-muted-foreground',
  documental: 'bg-secondary text-secondary-foreground',
};

function TimelineEvent({ evento }: { evento: EventoContrato }) {
  const Icon = TIPO_ICON[evento.tipo] || MessageSquare;
  const catColor = CATEGORIA_COLOR[evento.categoria] || 'bg-muted text-muted-foreground';

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-muted bg-background">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="w-px flex-1 bg-border" />
      </div>
      <div className="pb-6 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-muted-foreground font-medium">{formatDate(evento.fecha)}</span>
          <Badge className={`text-[10px] px-1.5 py-0 ${catColor}`}>
            {evento.tipo.replace(/_/g, ' ')}
          </Badge>
        </div>
        <p className="text-sm">{evento.descripcion}</p>
        {evento.monto != null && evento.monto !== 0 && (
          <p className="text-sm font-semibold mt-1">{formatCurrency(evento.monto)}</p>
        )}
      </div>
    </div>
  );
}

export default function ContratoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rescindirOpen, setRescindirOpen] = useState(false);
  const { data: contrato, isLoading } = useContrato(id || '');
  const { data: propiedad } = usePropiedad(contrato?.propiedad_id || '');
  const { data: propietario } = usePropietario(contrato?.propietario_id || '');
  const { data: inquilino } = useInquilino(contrato?.inquilino_id || '');
  const { data: allLiquidaciones = [] } = useLiquidaciones();
  const { data: eventos = [] } = useEventosContrato(id || '');

  if (isLoading) return <div className="p-8"><Skeleton className="h-64" /></div>;
  if (!contrato) return <div className="p-8 text-center text-muted-foreground">Contrato no encontrado</div>;

  const liquidaciones = allLiquidaciones.filter(l => l.contrato_id === contrato.id).sort((a, b) => b.periodo.localeCompare(a.periodo));

  const estadoBadge = contrato.estado === 'Activo' ? 'bg-status-success text-status-success-foreground'
    : contrato.estado === 'Por vencer' ? 'bg-status-warning text-status-warning-foreground'
    : 'bg-status-danger text-status-danger-foreground';

  const eventosContractuales = eventos.filter(e => e.categoria === 'contractual');
  const eventosEspeciales = eventos.filter(e => e.categoria !== 'contractual');

  // Resumen ejecutivo calculations
  const mesesVigencia = differenceInMonths(new Date(), new Date(contrato.fecha_inicio));
  const totalCobradoAcum = liquidaciones.reduce((s, l) => s + l.total_cobrado, 0);
  const pendienteActual = liquidaciones.reduce((s, l) => s + l.pendiente, 0);
  const comisionAcum = liquidaciones.reduce((s, l) => s + l.comision_inmobiliaria, 0);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/contratos')}><ArrowLeft className="h-4 w-4 mr-1" /> Volver a Contratos</Button>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <FileText className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold">Contrato {contrato.codigo}</h1>
            <Badge className={estadoBadge}>{contrato.estado}</Badge>
            <Badge variant="outline">{(contrato as any).tipo_contrato ?? 'Vivienda'}</Badge>
            <Badge variant="secondary">{(contrato as any).moneda ?? 'ARS'}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{propiedad?.direccion} {propiedad?.unidad} · {formatDate(contrato.fecha_inicio)} — {formatDate(contrato.fecha_fin)}</p>
          <p className="text-sm text-muted-foreground">Alquiler base: <strong>{formatCurrency(contrato.alquiler_base, (contrato as any).moneda ?? 'ARS')}</strong> · Vencimiento mensual: día {contrato.dia_vencimiento}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Edit className="h-4 w-4 mr-1" /> Editar</Button>
          {contrato.estado === 'Activo' && (
            <Button variant="outline" size="sm" onClick={() => setRescindirOpen(true)}>
              <AlertTriangle className="h-4 w-4 mr-1 text-status-danger" /> Rescindir
            </Button>
          )}
          <Button size="sm" onClick={() => navigate('/generar-liquidacion')}><Calculator className="h-4 w-4 mr-1" /> Generar liquidación</Button>
        </div>
      </div>

      <Tabs defaultValue="resumen">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="garantias">Garantías</TabsTrigger>
          <TabsTrigger value="renovacion">Renovación</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        {/* TAB RESUMEN — contenido original */}
        <TabsContent value="resumen" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Partes involucradas</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div><span className="text-muted-foreground">Propietario:</span><p className="font-medium">{propietario?.nombre}</p><p className="text-muted-foreground">{propietario?.telefono} · {propietario?.email}</p></div>
                <div><span className="text-muted-foreground">Inquilino:</span><p className="font-medium">{inquilino?.nombre}</p><p className="text-muted-foreground">{inquilino?.telefono} · {inquilino?.email}</p><p className="text-muted-foreground">Garante: {inquilino?.garante}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Condiciones económicas</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Alquiler base</span><span className="font-semibold">{formatCurrency(contrato.alquiler_base, (contrato as any).moneda ?? 'ARS')}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Moneda</span><span>{(contrato as any).moneda ?? 'ARS'}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Índice de ajuste</span><span>{(contrato as any).indice_ajuste ?? contrato.tipo_ajuste}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Frecuencia de ajuste</span><span>{contrato.frecuencia_ajuste}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Comisión inmobiliaria</span><span className="font-semibold">{contrato.comision_porcentaje}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">IVA</span><span>{contrato.iva ? 'Sí (21%)' : 'No'}</span></div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reglas de liquidación</CardTitle>
              <p className="text-sm text-muted-foreground">Configuración que se aplica automáticamente al generar la liquidación mensual de este contrato.</p>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Comisión', value: `${contrato.comision_porcentaje}%` },
                  { label: 'IVA', value: contrato.iva ? 'Sí (21%)' : 'No' },
                  { label: 'TGI', value: contrato.tgi },
                  { label: 'API', value: contrato.api },
                  { label: 'Expensas ordinarias', value: contrato.expensas_ordinarias },
                  { label: 'Expensas extraordinarias', value: contrato.expensas_extraordinarias },
                  { label: 'Seguro', value: contrato.seguro },
                  { label: 'Servicios', value: contrato.servicios },
                ].map(r => (
                  <div key={r.label} className="rounded-md border p-3"><p className="text-xs text-muted-foreground mb-1">{r.label}</p><p className="font-medium text-sm">{r.value}</p></div>
                ))}
              </div>
              {contrato.reglas_observaciones && (
                <div className="mt-4 rounded-md bg-muted p-3 text-sm"><span className="text-muted-foreground font-medium">Observaciones: </span>{contrato.reglas_observaciones}</div>
              )}

              <div className="mt-4 grid md:grid-cols-3 gap-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Medios de pago aceptados</p>
                  <p className="font-medium text-sm">
                    {contrato.medios_pago_aceptados && contrato.medios_pago_aceptados.length > 0
                      ? contrato.medios_pago_aceptados.join(', ')
                      : '—'}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Destino del cobro</p>
                  <p className="font-medium text-sm">{contrato.destino_cobro || 'Inmobiliaria'}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Tasa de mora diaria</p>
                  <p className="font-medium text-sm">
                    {contrato.tasa_mora_diaria ? `${contrato.tasa_mora_diaria}% (compuesto)` : 'Sin tasa configurada'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="garantias" className="space-y-6">
          <GarantiasSection contratoId={contrato.id} />
        </TabsContent>

        <TabsContent value="renovacion" className="space-y-6">
          <RenovacionSection contrato={contrato} />
        </TabsContent>

        {/* TAB HISTORIAL — 4 bloques */}
        <TabsContent value="historial" className="space-y-6">
          {/* 1. Resumen ejecutivo */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Meses de vigencia', value: String(mesesVigencia), icon: CalendarDays, color: 'text-foreground' },
              { label: 'Total cobrado', value: formatCurrency(totalCobradoAcum), icon: DollarSign, color: 'text-status-success' },
              { label: 'Pendiente actual', value: formatCurrency(pendienteActual), icon: Clock, color: pendienteActual > 0 ? 'text-status-danger' : 'text-foreground' },
              { label: 'Comisión acumulada', value: formatCurrency(comisionAcum), icon: TrendingUp, color: 'text-status-info' },
              { label: 'Eventos registrados', value: String(eventos.length), icon: BarChart3, color: 'text-foreground' },
            ].map(k => (
              <Card key={k.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <k.icon className={`h-4 w-4 ${k.color}`} />
                    <span className="text-xs text-muted-foreground">{k.label}</span>
                  </div>
                  <p className="text-xl font-bold">{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 2. Historial contractual */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-status-info" />
                Historial contractual
              </CardTitle>
              <p className="text-sm text-muted-foreground">Cambios en las condiciones y estado del contrato a lo largo del tiempo.</p>
            </CardHeader>
            <CardContent>
              {eventosContractuales.length > 0 ? (
                <div className="ml-1">
                  {eventosContractuales.map(e => <TimelineEvent key={e.id} evento={e} />)}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No hay eventos contractuales registrados.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Historial mensual financiero */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-status-success" />
                Historial mensual financiero
              </CardTitle>
              <p className="text-sm text-muted-foreground">Evolución mes a mes de las liquidaciones de este contrato. Reemplaza la planilla Excel de seguimiento.</p>
            </CardHeader>
            <CardContent>
              {liquidaciones.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground mb-1">Total cobrado acum.</p><p className="font-bold text-status-success">{formatCurrency(totalCobradoAcum)}</p></div>
                    <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground mb-1">Total pendiente</p><p className="font-bold text-status-danger">{formatCurrency(pendienteActual)}</p></div>
                    <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground mb-1">Comisión acum.</p><p className="font-bold text-status-info">{formatCurrency(comisionAcum)}</p></div>
                    <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground mb-1">Neto propietario acum.</p><p className="font-bold">{formatCurrency(liquidaciones.reduce((s, l) => s + l.neto_propietario, 0))}</p></div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Período</TableHead>
                        <TableHead>Total a cobrar</TableHead>
                        <TableHead>Cobrado</TableHead>
                        <TableHead>Pendiente</TableHead>
                        <TableHead>Comisión</TableHead>
                        <TableHead>Neto propietario</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {liquidaciones.map(l => {
                        const bc = l.estado === 'Cobrada' || l.estado === 'Transferida' ? 'bg-status-success text-status-success-foreground' : l.estado === 'Pendiente' ? 'bg-status-warning text-status-warning-foreground' : l.estado === 'Parcial' ? 'bg-status-danger text-status-danger-foreground' : 'bg-muted text-muted-foreground';
                        return (
                          <TableRow key={l.id} className="cursor-pointer" onClick={() => navigate(`/liquidaciones/${l.id}`)}>
                            <TableCell className="font-medium">{l.periodo_label}</TableCell>
                            <TableCell>{formatCurrency(l.total_cobrar)}</TableCell>
                            <TableCell>{formatCurrency(l.total_cobrado)}</TableCell>
                            <TableCell className={l.pendiente > 0 ? 'text-status-danger font-semibold' : ''}>{formatCurrency(l.pendiente)}</TableCell>
                            <TableCell className="text-status-info">{formatCurrency(l.comision_inmobiliaria)}</TableCell>
                            <TableCell>{formatCurrency(l.neto_propietario)}</TableCell>
                            <TableCell><Badge className={bc}>{l.estado}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No hay liquidaciones registradas para este contrato.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. Eventos especiales */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-status-warning" />
                Eventos especiales
              </CardTitle>
              <p className="text-sm text-muted-foreground">Depósitos, punitorios, bonificaciones, gastos especiales, observaciones y documentos asociados al contrato.</p>
            </CardHeader>
            <CardContent>
              {eventosEspeciales.length > 0 ? (
                <div className="ml-1">
                  {eventosEspeciales.map(e => <TimelineEvent key={e.id} evento={e} />)}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No hay eventos especiales registrados.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <RescindirDialog open={rescindirOpen} onClose={() => setRescindirOpen(false)} contrato={contrato} />
    </div>
  );
}
