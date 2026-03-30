import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  getInquilino, contratos, liquidaciones, pagos as allPagos,
  getPropiedad, getContrato, formatCurrency, formatDate,
} from '@/data/mockData';
import { ArrowLeft, User } from 'lucide-react';

export default function InquilinoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const inquilino = getInquilino(id || '');
  if (!inquilino) return <div className="p-8 text-center text-muted-foreground">Inquilino no encontrado</div>;

  const ct = contratos.find(c => c.inquilinoId === inquilino.id && (c.estado === 'Activo' || c.estado === 'Por vencer'));
  const prop = ct ? getPropiedad(ct.propiedadId) : null;
  const liqs = liquidaciones.filter(l => l.contratoId === ct?.id);
  const pagosInq = allPagos.filter(p => p.contratoId === ct?.id);
  const deuda = liqs.reduce((s, l) => s + l.pendiente, 0);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/inquilinos')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver
      </Button>

      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{inquilino.nombre}</h1>
          <p className="text-sm text-muted-foreground">{inquilino.email} · {inquilino.telefono} · DNI: {inquilino.dni}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Contrato vigente</p>
            <p className="font-bold">{ct?.codigo || '—'}</p>
            {prop && <p className="text-xs text-muted-foreground">{prop.direccion} {prop.unidad}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Deuda actual</p>
            <p className={`text-xl font-bold ${deuda > 0 ? 'text-status-danger' : 'text-status-success'}`}>{formatCurrency(deuda)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Garante</p>
            <p className="font-medium">{inquilino.garante}</p>
            <p className="text-xs text-muted-foreground">{inquilino.garanteTelefono}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Historial de liquidaciones</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Total a cobrar</TableHead>
                <TableHead>Cobrado</TableHead>
                <TableHead>Pendiente</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liqs.map(l => {
                const bc = l.estado === 'Cobrada' || l.estado === 'Transferida' ? 'bg-status-success text-status-success-foreground'
                  : l.estado === 'Pendiente' ? 'bg-status-warning text-status-warning-foreground'
                  : 'bg-status-danger text-status-danger-foreground';
                return (
                  <TableRow key={l.id} className="cursor-pointer" onClick={() => navigate(`/liquidaciones/${l.id}`)}>
                    <TableCell className="font-medium">{l.periodoLabel}</TableCell>
                    <TableCell>{formatCurrency(l.totalCobrar)}</TableCell>
                    <TableCell>{formatCurrency(l.totalCobrado)}</TableCell>
                    <TableCell className={l.pendiente > 0 ? 'text-status-danger font-semibold' : ''}>{formatCurrency(l.pendiente)}</TableCell>
                    <TableCell><Badge className={bc}>{l.estado}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Historial de pagos</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Medio</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagosInq.map(p => (
                <TableRow key={p.id}>
                  <TableCell>{formatDate(p.fecha)}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(p.monto)}</TableCell>
                  <TableCell>{p.medioPago}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.referencia}</TableCell>
                  <TableCell><Badge className="bg-status-success text-status-success-foreground">{p.estado}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
