import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useRendiciones, useLiquidaciones, useContratos, usePropiedades, usePropietarios,
  findById, formatCurrency, formatDate,
} from '@/hooks/useSupabaseData';
import { Eye, Send } from 'lucide-react';

export default function Rendiciones() {
  const navigate = useNavigate();
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroPropietario, setFiltroPropietario] = useState('todos');

  const { data: rendiciones = [], isLoading } = useRendiciones();
  const { data: liquidaciones = [] } = useLiquidaciones();
  const { data: contratos = [] } = useContratos();
  const { data: propiedades = [] } = usePropiedades();
  const { data: propietarios = [] } = usePropietarios();

  const filtered = useMemo(() => rendiciones.filter(r => {
    if (filtroEstado !== 'todos' && r.estado !== filtroEstado) return false;
    if (filtroPropietario !== 'todos' && r.propietario_id !== filtroPropietario) return false;
    return true;
  }), [rendiciones, filtroEstado, filtroPropietario]);

  const totales = useMemo(() => {
    const pendientes = rendiciones.filter(r => r.estado === 'Acreditada');
    return {
      pendientesCount: pendientes.length,
      pendientesMonto: pendientes.reduce((s, r) => s + Number(r.monto_neto || 0), 0),
      transferidasMes: rendiciones.filter(r => r.estado === 'Transferida').reduce((s, r) => s + Number(r.monto_neto || 0), 0),
    };
  }, [rendiciones]);

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rendiciones a propietarios</h1>
        <p className="text-muted-foreground">Liquidaciones acreditadas y transferencias realizadas a los propietarios.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Pendientes de rendir</p>
          <p className="text-2xl font-bold text-status-info">{totales.pendientesCount}</p>
          <p className="text-sm text-muted-foreground">{formatCurrency(totales.pendientesMonto)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total transferido</p>
          <p className="text-2xl font-bold text-status-success">{formatCurrency(totales.transferidasMes)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total rendiciones</p>
          <p className="text-2xl font-bold">{rendiciones.length}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="Acreditada">Acreditada (a rendir)</SelectItem>
              <SelectItem value="Transferida">Transferida</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroPropietario} onValueChange={setFiltroPropietario}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Propietario" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los propietarios</SelectItem>
              {propietarios.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Acreditada</TableHead>
                <TableHead>Transferida</TableHead>
                <TableHead>Propietario</TableHead>
                <TableHead>Propiedad</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Comisión</TableHead>
                <TableHead>IVA</TableHead>
                <TableHead>Neto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Sin rendiciones</TableCell></TableRow>
              )}
              {filtered.map(r => {
                const liq = liquidaciones.find(l => l.id === r.liquidacion_id);
                const ct = liq ? contratos.find(c => c.id === liq.contrato_id) : undefined;
                const prop = ct ? findById(propiedades, ct.propiedad_id) : undefined;
                const prop_o = r.propietario_id ? findById(propietarios, r.propietario_id) : undefined;
                return (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => liq && navigate(`/liquidaciones/${liq.id}`)}>
                    <TableCell>{formatDate(r.fecha_acreditacion)}</TableCell>
                    <TableCell>{r.fecha_transferencia ? formatDate(r.fecha_transferencia) : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{prop_o?.nombre || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{prop?.direccion} {prop?.unidad}</TableCell>
                    <TableCell><Badge variant="outline">{liq?.periodo_label}</Badge></TableCell>
                    <TableCell>{formatCurrency(r.comision_retenida)}</TableCell>
                    <TableCell>{formatCurrency(r.iva_retenido)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(r.monto_neto)}</TableCell>
                    <TableCell>
                      <Badge className={r.estado === 'Transferida' ? 'bg-status-success text-status-success-foreground' : 'bg-status-info text-status-info-foreground'}>
                        {r.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.estado === 'Acreditada'
                        ? <Button size="sm" variant="outline"><Send className="h-3 w-3 mr-1" /> Rendir</Button>
                        : <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>}
                    </TableCell>
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
