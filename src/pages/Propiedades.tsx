import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { propiedades, propietarios, contratos, inquilinos, getPropietario, getContrato, getInquilino } from '@/data/mockData';
import { Search, Building2, Eye } from 'lucide-react';

export default function Propiedades() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroPropietario, setFiltroPropietario] = useState('todos');

  const filtered = propiedades.filter(p => {
    if (search && !p.direccion.toLowerCase().includes(search.toLowerCase()) && !p.unidad.toLowerCase().includes(search.toLowerCase())) return false;
    if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false;
    if (filtroPropietario !== 'todos' && p.propietarioId !== filtroPropietario) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Propiedades</h1>
        <p className="text-muted-foreground">Gestión de unidades inmobiliarias</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por dirección..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="Ocupada">Ocupada</SelectItem>
                <SelectItem value="Vacante">Vacante</SelectItem>
                <SelectItem value="En refacción">En refacción</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroPropietario} onValueChange={setFiltroPropietario}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Propietario" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los propietarios</SelectItem>
                {propietarios.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dirección</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Propietario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Inquilino</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => {
                const owner = getPropietario(p.propietarioId);
                const ct = p.contratoActivoId ? getContrato(p.contratoActivoId) : null;
                const inq = ct ? getInquilino(ct.inquilinoId) : null;
                const estadoBadge = p.estado === 'Ocupada'
                  ? 'bg-status-success text-status-success-foreground'
                  : p.estado === 'Vacante'
                  ? 'bg-status-warning text-status-warning-foreground'
                  : 'bg-muted text-muted-foreground';
                return (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/propiedades/${p.id}`)}>
                    <TableCell className="font-medium">{p.direccion}</TableCell>
                    <TableCell>{p.unidad}</TableCell>
                    <TableCell>{p.tipo}</TableCell>
                    <TableCell>{owner?.nombre}</TableCell>
                    <TableCell><Badge className={estadoBadge}>{p.estado}</Badge></TableCell>
                    <TableCell>{ct ? <Badge variant="outline">{ct.codigo}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{inq?.nombre || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
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
