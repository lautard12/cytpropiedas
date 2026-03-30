import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  propietarios, propiedades, contratos, liquidaciones,
  formatCurrency,
} from '@/data/mockData';
import { Eye } from 'lucide-react';

export default function Propietarios() {
  const navigate = useNavigate();

  const data = propietarios.map(p => {
    const props = propiedades.filter(pr => pr.propietarioId === p.id);
    const cts = contratos.filter(c => c.propietarioId === p.id && (c.estado === 'Activo' || c.estado === 'Por vencer'));
    const netoPendiente = liquidaciones
      .filter(l => {
        const ct = contratos.find(c => c.id === l.contratoId);
        return ct?.propietarioId === p.id && (l.estado === 'Cobrada');
      })
      .reduce((s, l) => s + l.netoPropietario, 0);
    const ultimaLiq = liquidaciones
      .filter(l => {
        const ct = contratos.find(c => c.id === l.contratoId);
        return ct?.propietarioId === p.id;
      })
      .sort((a, b) => b.periodo.localeCompare(a.periodo))[0];

    return { ...p, propiedadesCount: props.length, contratosActivos: cts.length, netoPendiente, ultimaLiq };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Propietarios</h1>
        <p className="text-muted-foreground">Gestión de propietarios e información financiera</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Propiedades</TableHead>
                <TableHead>Contratos activos</TableHead>
                <TableHead>Neto pendiente transferir</TableHead>
                <TableHead>Última liquidación</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(p => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/propietarios/${p.id}`)}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell>{p.propiedadesCount}</TableCell>
                  <TableCell>{p.contratosActivos}</TableCell>
                  <TableCell className={p.netoPendiente > 0 ? 'text-status-warning font-semibold' : ''}>{formatCurrency(p.netoPendiente)}</TableCell>
                  <TableCell>{p.ultimaLiq?.periodoLabel || '—'}</TableCell>
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
