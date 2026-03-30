import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePropietario, usePropiedades, useContratos, useLiquidaciones,
  formatCurrency, formatDate,
} from '@/hooks/useSupabaseData';
import { ArrowLeft, User } from 'lucide-react';

export default function PropietarioDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: propietario, isLoading } = usePropietario(id || '');
  const { data: allPropiedades = [] } = usePropiedades();
  const { data: contratos = [] } = useContratos();
  const { data: liquidaciones = [] } = useLiquidaciones();

  if (isLoading) return <div className="p-8"><Skeleton className="h-64" /></div>;
  if (!propietario) return <div className="p-8 text-center text-muted-foreground">Propietario no encontrado</div>;

  const props = allPropiedades.filter(p => p.propietario_id === propietario.id);
  const cts = contratos.filter(c => c.propietario_id === propietario.id);
  const liqs = liquidaciones.filter(l => {
    const ct = contratos.find(c => c.id === l.contrato_id);
    return ct?.propietario_id === propietario.id;
  });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/propietarios')}><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Button>
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold">{propietario.nombre}</h1>
          <p className="text-sm text-muted-foreground">{propietario.email} · {propietario.telefono} · CUIT: {propietario.cuit}</p>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Datos bancarios</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Banco:</span> {propietario.banco}</p>
            <p><span className="text-muted-foreground">CBU:</span> {propietario.cbu}</p>
            <p><span className="text-muted-foreground">Dirección:</span> {propietario.direccion}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Resumen</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Propiedades:</span> {props.length}</p>
            <p><span className="text-muted-foreground">Contratos activos:</span> {cts.filter(c => c.estado === 'Activo' || c.estado === 'Por vencer').length}</p>
            <p><span className="text-muted-foreground">Total neto pendiente:</span> <strong className="text-status-warning">{formatCurrency(liqs.filter(l => l.estado === 'Cobrada').reduce((s, l) => s + l.neto_propietario, 0))}</strong></p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Propiedades</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Dirección</TableHead><TableHead>Unidad</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
            <TableBody>
              {props.map(p => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/propiedades/${p.id}`)}>
                  <TableCell className="font-medium">{p.direccion}</TableCell>
                  <TableCell>{p.unidad}</TableCell>
                  <TableCell><Badge variant="outline">{p.estado}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Liquidaciones</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Período</TableHead><TableHead>Contrato</TableHead><TableHead>Total cobrar</TableHead><TableHead>Neto propietario</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
            <TableBody>
              {liqs.map(l => {
                const ct = contratos.find(c => c.id === l.contrato_id);
                const bc = l.estado === 'Cobrada' || l.estado === 'Transferida' ? 'bg-status-success text-status-success-foreground' : l.estado === 'Pendiente' ? 'bg-status-warning text-status-warning-foreground' : 'bg-status-danger text-status-danger-foreground';
                return (
                  <TableRow key={l.id} className="cursor-pointer" onClick={() => navigate(`/liquidaciones/${l.id}`)}>
                    <TableCell>{l.periodo_label}</TableCell>
                    <TableCell><Badge variant="outline">{ct?.codigo}</Badge></TableCell>
                    <TableCell>{formatCurrency(l.total_cobrar)}</TableCell>
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
