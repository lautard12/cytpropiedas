import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePropiedad, useContrato, usePropietario, useInquilino, useLiquidaciones,
  formatCurrency, formatDate,
} from '@/hooks/useSupabaseData';
import { Building2, FileText, Info, ArrowLeft } from 'lucide-react';

export default function PropiedadDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: propiedad, isLoading } = usePropiedad(id || '');
  const { data: contrato } = useContrato(propiedad?.contrato_activo_id || '');
  const { data: propietario } = usePropietario(propiedad?.propietario_id || '');
  const { data: inquilino } = useInquilino(contrato?.inquilino_id || '');
  const { data: allLiquidaciones = [] } = useLiquidaciones();

  if (isLoading) return <div className="p-8"><Skeleton className="h-64" /></div>;
  if (!propiedad) return <div className="p-8 text-center text-muted-foreground">Propiedad no encontrada</div>;

  const liquidaciones = contrato ? allLiquidaciones.filter(l => l.contrato_id === contrato.id) : [];

  const estadoBadge = propiedad.estado === 'Ocupada' ? 'bg-status-success text-status-success-foreground'
    : propiedad.estado === 'Vacante' ? 'bg-status-warning text-status-warning-foreground'
    : 'bg-muted text-muted-foreground';

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/propiedades')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver a Propiedades
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold">{propiedad.direccion} — {propiedad.unidad}</h1>
            <Badge className={estadoBadge}>{propiedad.estado}</Badge>
          </div>
          <div className="mt-1 text-sm text-muted-foreground flex gap-4">
            <span>{propiedad.tipo} · {propiedad.metros} m² · {propiedad.ambientes} amb.</span>
            <span>Propietario: <strong>{propietario?.nombre}</strong></span>
            {inquilino && <span>Inquilino: <strong>{inquilino.nombre}</strong></span>}
          </div>
        </div>
        {contrato && (
          <Badge variant="outline" className="cursor-pointer" onClick={() => navigate(`/contratos/${contrato.id}`)}>
            <FileText className="h-3 w-3 mr-1" /> {contrato.codigo}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="resumen">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="contrato">Contrato</TabsTrigger>
          <TabsTrigger value="configuracion">Configuración Contractual Vigente</TabsTrigger>
          <TabsTrigger value="liquidaciones">Liquidaciones</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Alquiler base</p><p className="text-xl font-bold">{contrato ? formatCurrency(contrato.alquiler_base) : '—'}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Última liquidación</p><p className="text-xl font-bold">{liquidaciones[0] ? formatCurrency(liquidaciones[0].total_cobrar) : '—'}</p><p className="text-xs text-muted-foreground">{liquidaciones[0]?.periodo_label}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Deuda actual</p><p className="text-xl font-bold text-status-danger">{liquidaciones[0] ? formatCurrency(liquidaciones[0].pendiente) : '—'}</p></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="contrato" className="space-y-4">
          {contrato ? (
            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Código:</span> <strong>{contrato.codigo}</strong></div>
                  <div><span className="text-muted-foreground">Estado:</span> <Badge className="ml-1 bg-status-success text-status-success-foreground">{contrato.estado}</Badge></div>
                  <div><span className="text-muted-foreground">Inicio:</span> {formatDate(contrato.fecha_inicio)}</div>
                  <div><span className="text-muted-foreground">Fin:</span> {formatDate(contrato.fecha_fin)}</div>
                  <div><span className="text-muted-foreground">Alquiler base:</span> {formatCurrency(contrato.alquiler_base)}</div>
                  <div><span className="text-muted-foreground">Ajuste:</span> {contrato.tipo_ajuste} ({contrato.frecuencia_ajuste})</div>
                  <div><span className="text-muted-foreground">Inquilino:</span> {inquilino?.nombre}</div>
                  <div><span className="text-muted-foreground">Vencimiento mensual:</span> Día {contrato.dia_vencimiento}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate(`/contratos/${contrato.id}`)}>Ver detalle completo del contrato</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12 text-muted-foreground"><FileText className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>Esta unidad no tiene un contrato vigente.</p></div>
          )}
        </TabsContent>

        <TabsContent value="configuracion" className="space-y-4">
          {contrato ? (
            <>
              <Alert><Info className="h-4 w-4" /><AlertDescription>Estas reglas corresponden al contrato vigente{' '}<Link to={`/contratos/${contrato.id}`} className="font-semibold text-primary underline">{contrato.codigo}</Link>{' '}({formatDate(contrato.fecha_inicio)} — {formatDate(contrato.fecha_fin)}). Al finalizar este contrato, un nuevo contrato podrá tener reglas diferentes.</AlertDescription></Alert>
              <Card>
                <CardHeader><CardTitle className="text-base">Reglas del contrato vigente</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { label: 'Comisión inmobiliaria', value: `${contrato.comision_porcentaje}%` },
                      { label: 'IVA', value: contrato.iva ? 'Sí (21%)' : 'No' },
                      { label: 'TGI', value: contrato.tgi },
                      { label: 'API', value: contrato.api },
                      { label: 'Expensas ordinarias', value: contrato.expensas_ordinarias },
                      { label: 'Expensas extraordinarias', value: contrato.expensas_extraordinarias },
                      { label: 'Seguro', value: contrato.seguro },
                      { label: 'Servicios', value: contrato.servicios },
                    ].map(r => (
                      <div key={r.label} className="flex justify-between items-center rounded-md border p-3">
                        <span className="text-sm text-muted-foreground">{r.label}</span>
                        <Badge variant="outline">{r.value}</Badge>
                      </div>
                    ))}
                  </div>
                  {contrato.reglas_observaciones && (
                    <div className="mt-4 rounded-md bg-muted p-3 text-sm"><span className="text-muted-foreground font-medium">Observaciones: </span>{contrato.reglas_observaciones}</div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground"><FileText className="h-10 w-10 mx-auto mb-3 opacity-40" /><p className="font-medium">Esta unidad no tiene un contrato vigente.</p><p className="text-sm mt-1">Las reglas se configuran al crear un nuevo contrato.</p><Button className="mt-4" onClick={() => navigate('/nuevo-contrato')}>Crear contrato</Button></div>
          )}
        </TabsContent>

        <TabsContent value="liquidaciones" className="space-y-4">
          {contrato && liquidaciones.length > 0 ? (
            <>
              <div className="text-sm text-muted-foreground">Liquidaciones del contrato vigente — <Badge variant="outline">{contrato.codigo}</Badge> — vigente desde {formatDate(contrato.fecha_inicio)}</div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow><TableHead>Período</TableHead><TableHead>Total a cobrar</TableHead><TableHead>Cobrado</TableHead><TableHead>Pendiente</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {liquidaciones.map(l => {
                        const bc = l.estado === 'Cobrada' || l.estado === 'Transferida' ? 'bg-status-success text-status-success-foreground' : l.estado === 'Pendiente' ? 'bg-status-warning text-status-warning-foreground' : l.estado === 'Parcial' ? 'bg-status-danger text-status-danger-foreground' : 'bg-muted text-muted-foreground';
                        return (
                          <TableRow key={l.id} className="cursor-pointer" onClick={() => navigate(`/liquidaciones/${l.id}`)}>
                            <TableCell className="font-medium">{l.periodo_label}</TableCell>
                            <TableCell>{formatCurrency(l.total_cobrar)}</TableCell>
                            <TableCell>{formatCurrency(l.total_cobrado)}</TableCell>
                            <TableCell className={l.pendiente > 0 ? 'text-status-danger font-semibold' : ''}>{formatCurrency(l.pendiente)}</TableCell>
                            <TableCell><Badge className={bc}>{l.estado}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">No hay liquidaciones registradas.</div>
          )}
        </TabsContent>

        <TabsContent value="historial">
          <div className="text-center py-12 text-muted-foreground"><p>Historial de contratos anteriores y movimientos de la unidad.</p><p className="text-sm mt-1">Disponible próximamente.</p></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
