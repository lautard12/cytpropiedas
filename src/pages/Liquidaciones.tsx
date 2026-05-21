import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useLiquidaciones, useContratos, usePropiedades, useInquilinos, findById, formatCurrency } from '@/hooks/useSupabaseData';
import { Eye } from 'lucide-react';

export default function Liquidaciones() {
  const navigate = useNavigate();
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos');

  const { data: liquidaciones = [], isLoading } = useLiquidaciones();
  const { data: contratos = [] } = useContratos();
  const { data: propiedades = [] } = usePropiedades();
  const { data: inquilinos = [] } = useInquilinos();

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  const filtered = liquidaciones.filter(l => {
    if (filtroEstado !== 'todos' && l.estado !== filtroEstado) return false;
    if (filtroPeriodo !== 'todos' && l.periodo !== filtroPeriodo) return false;
    return true;
  });

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case 'Cobrada': case 'Transferida': return 'bg-status-success text-status-success-foreground';
      case 'Pendiente': return 'bg-status-warning text-status-warning-foreground';
      case 'Parcial': return 'bg-status-danger text-status-danger-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Liquidaciones</h1>
          <p className="text-muted-foreground">Liquidaciones mensuales por contrato y período</p>
        </div>
        <Button onClick={() => navigate('/generar-liquidacion')}>Generar liquidación mensual</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los períodos</SelectItem>
                {periodosDisponibles.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="Borrador">Borrador</SelectItem>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
                <SelectItem value="Parcial">Parcial</SelectItem>
                <SelectItem value="Cobrada">Cobrada</SelectItem>
                <SelectItem value="Transferida">Transferida</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Propiedad</TableHead>
                <TableHead>Inquilino</TableHead>
                <TableHead>Total a cobrar</TableHead>
                <TableHead>Cobrado</TableHead>
                <TableHead>Comisión</TableHead>
                <TableHead>Neto propietario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(l => {
                const ct = findById(contratos, l.contrato_id);
                const prop = ct ? findById(propiedades, ct.propiedad_id) : undefined;
                const inq = ct ? findById(inquilinos, ct.inquilino_id) : undefined;
                return (
                  <TableRow key={l.id} className="cursor-pointer" onClick={() => navigate(`/liquidaciones/${l.id}`)}>
                    <TableCell className="font-medium">{l.periodo_label}</TableCell>
                    <TableCell><Badge variant="outline">{ct?.codigo}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{prop?.direccion} {prop?.unidad}</TableCell>
                    <TableCell>{inq?.nombre}</TableCell>
                    <TableCell>{formatCurrency(l.total_cobrar)}</TableCell>
                    <TableCell>{formatCurrency(l.total_cobrado)}</TableCell>
                    <TableCell>{formatCurrency(l.comision_inmobiliaria)}</TableCell>
                    <TableCell>{formatCurrency(l.neto_propietario)}</TableCell>
                    <TableCell><Badge className={estadoBadge(l.estado)}>{l.estado}</Badge></TableCell>
                    <TableCell><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button></TableCell>
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
