import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { pagos, getContrato, getPropiedad, getInquilino, formatCurrency, formatDate } from '@/data/mockData';
import { Eye } from 'lucide-react';

export default function Pagos() {
  const navigate = useNavigate();
  const [filtroMedio, setFiltroMedio] = useState('todos');

  const filtered = pagos.filter(p => {
    if (filtroMedio !== 'todos' && p.medioPago !== filtroMedio) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pagos</h1>
        <p className="text-muted-foreground">Registro de pagos recibidos</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <Select value={filtroMedio} onValueChange={setFiltroMedio}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los medios</SelectItem>
                <SelectItem value="Transferencia">Transferencia</SelectItem>
                <SelectItem value="Efectivo">Efectivo</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="Depósito">Depósito</SelectItem>
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
                <TableHead>Fecha</TableHead>
                <TableHead>Inquilino</TableHead>
                <TableHead>Propiedad</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Medio</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => {
                const ct = getContrato(p.contratoId);
                const prop = ct ? getPropiedad(ct.propiedadId) : null;
                const inq = ct ? getInquilino(ct.inquilinoId) : null;
                return (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.fecha)}</TableCell>
                    <TableCell className="font-medium">{inq?.nombre}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{prop?.direccion} {prop?.unidad}</TableCell>
                    <TableCell><Badge variant="outline">{ct?.codigo}</Badge></TableCell>
                    <TableCell className="font-semibold">{formatCurrency(p.monto)}</TableCell>
                    <TableCell>{p.medioPago}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.referencia}</TableCell>
                    <TableCell>
                      <Badge className={p.estado === 'Confirmado' ? 'bg-status-success text-status-success-foreground' : 'bg-status-warning text-status-warning-foreground'}>
                        {p.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/liquidaciones/${p.liquidacionId}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
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
