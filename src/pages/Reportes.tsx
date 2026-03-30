import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  getDashboardData, contratos, liquidaciones, evolucionMensual,
  getContrato, getPropiedad, getPropietario, formatCurrency,
} from '@/data/mockData';
import { TrendingUp, DollarSign, Clock, Users, AlertTriangle, Building2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function Reportes() {
  const d = getDashboardData();
  const [periodo, setPeriodo] = useState('2025-03');

  const liqsPeriodo = liquidaciones.filter(l => l.periodo === periodo);

  // Comisión por contrato
  const comisionPorContrato = liqsPeriodo.map(l => {
    const ct = getContrato(l.contratoId);
    const prop = ct ? getPropiedad(ct.propiedadId) : null;
    const owner = ct ? getPropietario(ct.propietarioId) : null;
    return {
      contrato: ct?.codigo || '—',
      propiedad: prop ? `${prop.direccion} ${prop.unidad}` : '—',
      propietario: owner?.nombre || '—',
      comision: l.comisionInmobiliaria,
      neto: l.netoPropietario,
      total: l.totalCobrar,
    };
  });

  const contratosVacantes = contratos.filter(c => c.estado === 'Vencido' || c.estado === 'Rescindido').length;
  const contratosActivos = contratos.filter(c => c.estado === 'Activo' || c.estado === 'Por vencer').length;
  const morosos = liqsPeriodo.filter(l => l.estado === 'Pendiente' || l.estado === 'Parcial').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
          <p className="text-muted-foreground">Análisis financiero y operativo</p>
        </div>
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2025-03">Marzo 2025</SelectItem>
            <SelectItem value="2025-02">Febrero 2025</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos del período', value: formatCurrency(liqsPeriodo.reduce((s, l) => s + l.totalCobrado, 0)), icon: DollarSign, color: 'text-status-success' },
          { label: 'Pendiente de cobro', value: formatCurrency(liqsPeriodo.reduce((s, l) => s + l.pendiente, 0)), icon: Clock, color: 'text-status-warning' },
          { label: 'Comisión inmobiliaria', value: formatCurrency(liqsPeriodo.reduce((s, l) => s + l.comisionInmobiliaria, 0)), icon: TrendingUp, color: 'text-status-info' },
          { label: 'Neto propietarios', value: formatCurrency(liqsPeriodo.reduce((s, l) => s + l.netoPropietario, 0)), icon: Users, color: 'text-foreground' },
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

      {/* Resultado Financiero */}
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
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Total cobrado</span><span className="font-semibold">{formatCurrency(d.totalCobrado)}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">(-) Neto propietarios</span><span className="font-semibold">{formatCurrency(d.totalNetoPropietarios)}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">(-) Gastos retenidos</span><span className="font-semibold">{formatCurrency(d.gastosRetenidos)}</span></div>
              <div className="flex justify-between py-2 bg-muted/50 rounded px-3"><span className="font-bold">= Saldo administración</span><span className="font-bold text-lg text-status-success">{formatCurrency(d.saldoAdministracion)}</span></div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Contratos activos</span><span className="font-semibold">{contratosActivos}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Inquilinos en mora</span><span className="font-semibold text-status-danger">{morosos}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Contratos por vencer</span><span className="font-semibold text-status-warning">{contratos.filter(c => c.estado === 'Por vencer').length}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evolución */}
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

      {/* Comisión por contrato */}
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
    </div>
  );
}
