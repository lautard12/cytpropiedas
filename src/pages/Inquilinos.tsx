import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  inquilinos, contratos, liquidaciones, getPropiedad, getContrato,
  formatCurrency,
} from '@/data/mockData';
import { Eye } from 'lucide-react';

export default function Inquilinos() {
  const navigate = useNavigate();

  const data = inquilinos.map(inq => {
    const ct = contratos.find(c => c.inquilinoId === inq.id && (c.estado === 'Activo' || c.estado === 'Por vencer'));
    const prop = ct ? getPropiedad(ct.propiedadId) : null;
    const deuda = liquidaciones
      .filter(l => l.contratoId === ct?.id && l.pendiente > 0)
      .reduce((s, l) => s + l.pendiente, 0);
    const estadoPago = deuda > 0 ? 'Con deuda' : 'Al día';

    return { ...inq, contrato: ct, propiedad: prop, deuda, estadoPago };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inquilinos</h1>
        <p className="text-muted-foreground">Gestión de inquilinos y estado de pagos</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Propiedad</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Estado de pago</TableHead>
                <TableHead>Deuda actual</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(d => (
                <TableRow key={d.id} className="cursor-pointer" onClick={() => navigate(`/inquilinos/${d.id}`)}>
                  <TableCell className="font-medium">{d.nombre}</TableCell>
                  <TableCell className="text-sm">{d.propiedad ? `${d.propiedad.direccion} ${d.propiedad.unidad}` : '—'}</TableCell>
                  <TableCell>{d.contrato ? <Badge variant="outline">{d.contrato.codigo}</Badge> : '—'}</TableCell>
                  <TableCell>
                    <Badge className={d.estadoPago === 'Al día' ? 'bg-status-success text-status-success-foreground' : 'bg-status-danger text-status-danger-foreground'}>
                      {d.estadoPago}
                    </Badge>
                  </TableCell>
                  <TableCell className={d.deuda > 0 ? 'text-status-danger font-semibold' : ''}>{formatCurrency(d.deuda)}</TableCell>
                  <TableCell><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
