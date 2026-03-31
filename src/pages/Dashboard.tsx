import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useContratos, useLiquidaciones, usePropiedades, usePropietarios, useInquilinos,
  useEventosRecientes,
  formatCurrency, formatDate, findById, evolucionMensual,
} from '@/hooks/useSupabaseData';
import {
  DollarSign, Clock, TrendingUp, Users, FileText, AlertTriangle, Activity,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const PIE_COLORS = ['hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 72%, 51%)'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: contratos = [], isLoading: loadingCt } = useContratos();
  const { data: liquidaciones = [], isLoading: loadingLiq } = useLiquidaciones();
  const { data: propiedades = [] } = usePropiedades();
  const { data: propietarios = [] } = usePropietarios();
  const { data: inquilinos = [] } = useInquilinos();
  const { data: eventosRecientes = [] } = useEventosRecientes(8);

  const loading = loadingCt || loadingLiq;

  const liqsMarzo = liquidaciones.filter(l => l.periodo === '2025-03');

  const totalCobrado = liqsMarzo.reduce((s, l) => s + l.total_cobrado, 0);
  const totalPendiente = liqsMarzo.reduce((s, l) => s + l.pendiente, 0);
  const totalComision = liqsMarzo.reduce((s, l) => s + l.comision_inmobiliaria, 0);
  const totalNetoPropietarios = liqsMarzo.reduce((s, l) => s + l.neto_propietario, 0);
  const contratosActivos = contratos.filter(c => c.estado === 'Activo' || c.estado === 'Por vencer').length;
  const inquilinosMora = liqsMarzo.filter(l => l.estado === 'Pendiente' || l.estado === 'Parcial').length;
  const pendienteTransferencia = liqsMarzo.filter(l => l.estado === 'Cobrada').reduce((s, l) => s + l.neto_propietario, 0);
  const gastosRetenidos = Math.max(totalCobrado - totalNetoPropietarios - totalComision, 0);

  const pieData = [
    { name: 'Cobrado', value: totalCobrado },
    { name: 'Pendiente', value: totalPendiente },
  ];

  const contratosPorVencer = contratos.filter(c => c.estado === 'Por vencer');
  const liqsPendientes = liqsMarzo.filter(l => l.estado === 'Pendiente' || l.estado === 'Parcial');
  const liqsPendientesTransf = liqsMarzo.filter(l => l.estado === 'Cobrada');

  const kpis = [
    { label: 'Cobrado del mes', value: formatCurrency(totalCobrado), icon: DollarSign, color: 'text-status-success' },
    { label: 'Pendiente de cobro', value: formatCurrency(totalPendiente), icon: Clock, color: 'text-status-warning' },
    { label: 'Comisión de administración', value: formatCurrency(totalComision), icon: TrendingUp, color: 'text-status-info' },
    { label: 'Neto a transferir a propietarios', value: formatCurrency(totalNetoPropietarios), icon: Users, color: 'text-foreground' },
    { label: 'Contratos activos', value: String(contratosActivos), icon: FileText, color: 'text-status-info' },
    { label: 'Inquilinos en mora', value: String(inquilinosMora), icon: AlertTriangle, color: 'text-status-danger' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold tracking-tight">Dashboard</h1></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Resumen de administración — Marzo 2025</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <p className="text-xl font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resultado Financiero */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-status-info" />
            Resultado Financiero de la Administración — Marzo 2025
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Total cobrado</span>
                <span className="font-semibold">{formatCurrency(totalCobrado)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">(-) Neto propietarios</span>
                <span className="font-semibold">{formatCurrency(totalNetoPropietarios)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">(-) Gastos retenidos</span>
                <span className="font-semibold">{formatCurrency(gastosRetenidos)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-primary/30">
                <span className="font-semibold">= Comisión inmobiliaria</span>
                <span className="font-bold text-status-info">{formatCurrency(totalComision)}</span>
              </div>
              <div className="flex justify-between py-2 bg-muted/50 rounded-md px-3">
                <span className="font-bold">= Saldo administración</span>
                <span className="font-bold text-lg text-status-success">{formatCurrency(totalComision)}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-status-warning" />
                  Pendiente de cobro
                </span>
                <span className="font-semibold text-status-warning">{formatCurrency(totalPendiente)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-status-warning" />
                  Pendiente de transferencia
                </span>
                <span className="font-semibold text-status-warning">{formatCurrency(pendienteTransferencia)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolución mensual de cobros</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={evolucionMensual}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="cobrado" fill="hsl(142, 71%, 45%)" radius={[3, 3, 0, 0]} name="Cobrado" />
                <Bar dataKey="pendiente" fill="hsl(38, 92%, 50%)" radius={[3, 3, 0, 0]} name="Pendiente" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución del período</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contratos próximos a vencer</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Propiedad</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contratosPorVencer.map(c => {
                  const prop = findById(propiedades, c.propiedad_id);
                  return (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/contratos/${c.id}`)}>
                      <TableCell className="font-medium">{c.codigo}</TableCell>
                      <TableCell>{prop?.direccion} {prop?.unidad}</TableCell>
                      <TableCell>{new Date(c.fecha_fin).toLocaleDateString('es-AR')}</TableCell>
                      <TableCell>
                        <Badge className="bg-status-warning text-status-warning-foreground">{c.estado}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inquilinos con deuda</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inquilino</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Pendiente</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liqsPendientes.map(l => {
                  const ct = findById(contratos, l.contrato_id);
                  const inq = findById(inquilinos, ct?.inquilino_id ?? null);
                  return (
                    <TableRow key={l.id} className="cursor-pointer" onClick={() => navigate(`/liquidaciones/${l.id}`)}>
                      <TableCell className="font-medium">{inq?.nombre || '—'}</TableCell>
                      <TableCell><Badge variant="outline">{ct?.codigo}</Badge></TableCell>
                      <TableCell className="text-status-danger font-semibold">{formatCurrency(l.pendiente)}</TableCell>
                      <TableCell>
                        <Badge className={l.estado === 'Pendiente' ? 'bg-status-warning text-status-warning-foreground' : 'bg-status-danger text-status-danger-foreground'}>
                          {l.estado}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Liquidaciones pendientes de transferencia */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Liquidaciones pendientes de transferencia al propietario</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrato</TableHead>
                <TableHead>Propiedad</TableHead>
                <TableHead>Propietario</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Neto a transferir</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liqsPendientesTransf.map(l => {
                const ct = findById(contratos, l.contrato_id);
                const prop = findById(propiedades, ct?.propiedad_id ?? null);
                const owner = findById(propietarios, ct?.propietario_id ?? null);
                return (
                  <TableRow key={l.id} className="cursor-pointer" onClick={() => navigate(`/liquidaciones/${l.id}`)}>
                    <TableCell><Badge variant="outline">{ct?.codigo}</Badge></TableCell>
                    <TableCell>{prop?.direccion} {prop?.unidad}</TableCell>
                    <TableCell>{owner?.nombre}</TableCell>
                    <TableCell>{l.periodo_label}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(l.neto_propietario)}</TableCell>
                    <TableCell>
                      <Badge className="bg-status-success text-status-success-foreground">Cobrada</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {/* Trazabilidad — últimos movimientos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-status-info" />
            Trazabilidad — Últimos movimientos registrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eventosRecientes.length > 0 ? (
            <div className="space-y-3">
              {eventosRecientes.map(e => {
                const ct = findById(contratos, e.contrato_id);
                return (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/contratos/${e.contrato_id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-muted-foreground font-medium">{formatDate(e.fecha)}</span>
                        <Badge variant="outline" className="text-[10px]">{e.tipo.replace(/_/g, ' ')}</Badge>
                        <Badge variant="outline" className="text-[10px]">{ct?.codigo}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{e.descripcion}</p>
                    </div>
                    {e.monto != null && e.monto !== 0 && (
                      <span className="text-sm font-semibold ml-4">{formatCurrency(e.monto)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No hay movimientos registrados.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
