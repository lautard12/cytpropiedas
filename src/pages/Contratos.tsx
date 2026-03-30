import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useContratos, usePropiedades, usePropietarios, useInquilinos, findById, formatCurrency, formatDate } from '@/hooks/useSupabaseData';
import { Search, Eye } from 'lucide-react';

export default function Contratos() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  const { data: contratos = [], isLoading } = useContratos();
  const { data: propiedades = [] } = usePropiedades();
  const { data: propietarios = [] } = usePropietarios();
  const { data: inquilinos = [] } = useInquilinos();

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  const filtered = contratos.filter(c => {
    if (filtroEstado !== 'todos' && c.estado !== filtroEstado) return false;
    if (search) {
      const prop = findById(propiedades, c.propiedad_id);
      const inq = findById(inquilinos, c.inquilino_id);
      const owner = findById(propietarios, c.propietario_id);
      const text = `${c.codigo} ${prop?.direccion} ${inq?.nombre} ${owner?.nombre}`.toLowerCase();
      if (!text.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case 'Activo': return 'bg-status-success text-status-success-foreground';
      case 'Por vencer': return 'bg-status-warning text-status-warning-foreground';
      case 'Vencido': return 'bg-status-danger text-status-danger-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contratos</h1>
          <p className="text-muted-foreground">Gestión de contratos de alquiler</p>
        </div>
        <Button onClick={() => navigate('/nuevo-contrato')}>Nuevo contrato</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar contrato, propiedad, inquilino..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="Activo">Activo</SelectItem>
                <SelectItem value="Por vencer">Por vencer</SelectItem>
                <SelectItem value="Vencido">Vencido</SelectItem>
                <SelectItem value="Rescindido">Rescindido</SelectItem>
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
                <TableHead>Código</TableHead>
                <TableHead>Propiedad</TableHead>
                <TableHead>Propietario</TableHead>
                <TableHead>Inquilino</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Alquiler</TableHead>
                <TableHead>Comisión</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => {
                const prop = findById(propiedades, c.propiedad_id);
                const owner = findById(propietarios, c.propietario_id);
                const inq = findById(inquilinos, c.inquilino_id);
                return (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/contratos/${c.id}`)}>
                    <TableCell className="font-medium">{c.codigo}</TableCell>
                    <TableCell>{prop?.direccion} {prop?.unidad}</TableCell>
                    <TableCell>{owner?.nombre}</TableCell>
                    <TableCell>{inq?.nombre}</TableCell>
                    <TableCell>{formatDate(c.fecha_inicio)}</TableCell>
                    <TableCell>{formatDate(c.fecha_fin)}</TableCell>
                    <TableCell>{formatCurrency(c.alquiler_base)}</TableCell>
                    <TableCell>{c.comision_porcentaje}%</TableCell>
                    <TableCell><Badge className={estadoBadge(c.estado)}>{c.estado}</Badge></TableCell>
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
