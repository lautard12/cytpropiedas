import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useContratos, useLiquidaciones, usePropiedades, usePropietarios,
  useEventosRecientes,
  findById, formatCurrency, formatDate, evolucionMensual,
} from '@/hooks/useSupabaseData';
import { TrendingUp, DollarSign, Clock, Users, Activity } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';

export default function Reportes() {
  const navigate = useNavigate();

  const { data: contratos = [], isLoading: loadingCt } = useContratos();
  const { data: liquidaciones = [], isLoading: loadingLiq } = useLiquidaciones();
  const { data: propiedades = [] } = usePropiedades();
  const { data: propietarios = [] } = usePropietarios();
  const { data: eventosRecientes = [] } = useEventosRecientes(20);

  // Períodos disponibles (orden descendente)
  const periodosDisponibles = [...new Set(liquidaciones.map(l => l.periodo))].sort().reverse();
  const periodoDefault = periodosDisponibles[0] ?? new Date().toISOString().slice(0, 7);
  const [periodo, setPeriodo] = useState<string>('');
  const periodoActivo = periodo || periodoDefault;

  const periodoLabel = (p: string) =>
    liquidaciones.find(l => l.periodo === p)?.periodo_label ?? p;

  if (loadingCt || loadingLiq) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  const liqsPeriodo = liquidaciones.filter(l => l.periodo === periodoActivo);

  const totalCobrado = liqsPeriodo.reduce((s, l) => s + l.total_cobrado, 0);
  const totalPendiente = liqsPeriodo.reduce((s, l) => s + l.pendiente, 0);
  const totalComision = liqsPeriodo.reduce((s, l) => s + l.comision_inmobiliaria, 0);
  const totalNeto = liqsPeriodo.reduce((s, l) => s + l.neto_propietario, 0);
  const gastosRetenidos = Math.max(totalCobrado - totalNeto - totalComision, 0);

  const comisionPorContrato = liqsPeriodo.map(l => {
    const ct = findById(contratos, l.contrato_id);
    const prop = ct ? findById(propiedades, ct.propiedad_id) : undefined;
    const owner = ct ? findById(propietarios, ct.propietario_id) : undefined;
    return {
      contrato: ct?.codigo || '—',
      propiedad: prop ? `${prop.direccion} ${prop.unidad}` : '—',
      propietario: owner?.nombre || '—',
      comision: l.comision_inmobiliaria,
      neto: l.neto_propietario,
      total: l.total_cobrar,
    };
  });

  const contratosActivos = contratos.filter(c => c.estado === 'Activo' || c.estado === 'Por vencer').length;
  const morosos = liqsPeriodo.filter(l => l.estado === 'Pendiente' || l.estado === 'Parcial').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
          <p className="text-muted-foreground">Análisis financiero y operativo</p>
        </div>
        <Select value={periodoActivo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {periodosDisponibles.length === 0 ? (
              <SelectItem value={periodoActivo}>{periodoLabel(periodoActivo)}</SelectItem>
            ) : (
              periodosDisponibles.map(p => (
                <SelectItem key={p} value={p}>{periodoLabel(p)}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>


      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos del período', value: formatCurrency(totalCobrado), icon: DollarSign, color: 'text-status-success' },
          { label: 'Pendiente de cobro', value: formatCurrency(totalPendiente), icon: Clock, color: 'text-status-warning' },
          { label: 'Comisión inmobiliaria', value: formatCurrency(totalComision), icon: TrendingUp, color: 'text-status-info' },
          { label: 'Neto propietarios', value: formatCurrency(totalNeto), icon: Users, color: 'text-foreground' },
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

      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-status-info" />
            Resultado de la Administración
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Total cobrado</span><span className="font-semibold">{formatCurrency(totalCobrado)}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">(-) Neto propietarios</span><span className="font-semibold">{formatCurrency(totalNeto)}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">(-) Gastos retenidos</span><span className="font-semibold">{formatCurrency(gastosRetenidos)}</span></div>
              <div className="flex justify-between py-2 bg-muted/50 rounded px-3"><span className="font-bold">= Saldo administración</span><span className="font-bold text-lg text-status-success">{formatCurrency(totalComision)}</span></div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Contratos activos</span><span className="font-semibold">{contratosActivos}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Inquilinos en mora</span><span className="font-semibold text-status-danger">{morosos}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Contratos por vencer</span><span className="font-semibold text-status-warning">{contratos.filter(c => c.estado === 'Por vencer').length}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Evolución mensual: cobrado vs comisión vs neto propietarios</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={evolucionMensual}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="cobrado" stroke="hsl(142, 71%, 45%)" strokeWidth={2} name="Total cobrado" />
              <Line type="monotone" dataKey="comision" stroke="hsl(217, 91%, 60%)" strokeWidth={2} name="Comisión" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Comisión por contrato — {periodo === '2025-03' ? 'Marzo 2025' : 'Febrero 2025'}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrato</TableHead>
                <TableHead>Propiedad</TableHead>
                <TableHead>Propietario</TableHead>
                <TableHead>Total liquidación</TableHead>
                <TableHead>Comisión</TableHead>
                <TableHead>Neto propietario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comisionPorContrato.map((r, i) => (
                <TableRow key={i}>
                  <TableCell><Badge variant="outline">{r.contrato}</Badge></TableCell>
                  <TableCell className="text-sm">{r.propiedad}</TableCell>
                  <TableCell>{r.propietario}</TableCell>
                  <TableCell>{formatCurrency(r.total)}</TableCell>
                  <TableCell className="font-semibold text-status-info">{formatCurrency(r.comision)}</TableCell>
                  <TableCell>{formatCurrency(r.neto)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={4}>Total</TableCell>
                <TableCell className="text-status-info">{formatCurrency(comisionPorContrato.reduce((s, r) => s + r.comision, 0))}</TableCell>
                <TableCell>{formatCurrency(comisionPorContrato.reduce((s, r) => s + r.neto, 0))}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {/* Contratos con cambios recientes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-status-info" />
            Contratos con cambios recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const recent = eventosRecientes.filter(e => new Date(e.fecha) >= thirtyDaysAgo);
            const uniqueContratos = [...new Set(recent.map(e => e.contrato_id))];
            if (uniqueContratos.length === 0) {
              return <p className="text-sm text-muted-foreground text-center py-4">No hay cambios recientes.</p>;
            }
            return (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.slice(0, 10).map(e => {
                    const ct = findById(contratos, e.contrato_id);
                    return (
                      <TableRow key={e.id} className="cursor-pointer" onClick={() => navigate(`/contratos/${e.contrato_id}`)}>
                        <TableCell><Badge variant="outline">{ct?.codigo || '—'}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{e.tipo.replace(/_/g, ' ')}</Badge></TableCell>
                        <TableCell className="text-sm">{formatDate(e.fecha)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground line-clamp-1">{e.descripcion}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
