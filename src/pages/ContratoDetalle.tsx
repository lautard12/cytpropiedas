import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useContrato, usePropiedad, usePropietario, useInquilino, useLiquidaciones,
  formatCurrency, formatDate,
} from '@/hooks/useSupabaseData';
import { ArrowLeft, FileText, Calculator, Edit } from 'lucide-react';

export default function ContratoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: contrato, isLoading } = useContrato(id || '');
  const { data: propiedad } = usePropiedad(contrato?.propiedad_id || '');
  const { data: propietario } = usePropietario(contrato?.propietario_id || '');
  const { data: inquilino } = useInquilino(contrato?.inquilino_id || '');
  const { data: allLiquidaciones = [] } = useLiquidaciones();

  if (isLoading) return <div className="p-8"><Skeleton className="h-64" /></div>;
  if (!contrato) return <div className="p-8 text-center text-muted-foreground">Contrato no encontrado</div>;

  const liquidaciones = allLiquidaciones.filter(l => l.contrato_id === contrato.id);

  const estadoBadge = contrato.estado === 'Activo' ? 'bg-status-success text-status-success-foreground'
    : contrato.estado === 'Por vencer' ? 'bg-status-warning text-status-warning-foreground'
    : 'bg-status-danger text-status-danger-foreground';

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/contratos')}><ArrowLeft className="h-4 w-4 mr-1" /> Volver a Contratos</Button>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold">Contrato {contrato.codigo}</h1>
            <Badge className={estadoBadge}>{contrato.estado}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{propiedad?.direccion} {propiedad?.unidad} · {formatDate(contrato.fecha_inicio)} — {formatDate(contrato.fecha_fin)}</p>
          <p className="text-sm text-muted-foreground">Alquiler base: <strong>{formatCurrency(contrato.alquiler_base)}</strong> · Vencimiento mensual: día {contrato.dia_vencimiento}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Edit className="h-4 w-4 mr-1" /> Editar</Button>
          <Button size="sm" onClick={() => navigate('/generar-liquidacion')}><Calculator className="h-4 w-4 mr-1" /> Generar liquidación</Button>
        </div>
      </div>

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
            <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Alquiler base</span><span className="font-semibold">{formatCurrency(contrato.alquiler_base)}</span></div>
            <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Tipo de ajuste</span><span>{contrato.tipo_ajuste}</span></div>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Historial mensual de liquidaciones</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Período</TableHead><TableHead>Total a cobrar</TableHead><TableHead>Cobrado</TableHead><TableHead>Comisión</TableHead><TableHead>Neto propietario</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
            <TableBody>
              {liquidaciones.map(l => {
                const bc = l.estado === 'Cobrada' || l.estado === 'Transferida' ? 'bg-status-success text-status-success-foreground' : l.estado === 'Pendiente' ? 'bg-status-warning text-status-warning-foreground' : l.estado === 'Parcial' ? 'bg-status-danger text-status-danger-foreground' : 'bg-muted text-muted-foreground';
                return (
                  <TableRow key={l.id} className="cursor-pointer" onClick={() => navigate(`/liquidaciones/${l.id}`)}>
                    <TableCell className="font-medium">{l.periodo_label}</TableCell>
                    <TableCell>{formatCurrency(l.total_cobrar)}</TableCell>
                    <TableCell>{formatCurrency(l.total_cobrado)}</TableCell>
                    <TableCell>{formatCurrency(l.comision_inmobiliaria)}</TableCell>
                    <TableCell>{formatCurrency(l.neto_propietario)}</TableCell>
                    <TableCell><Badge className={bc}>{l.estado}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
