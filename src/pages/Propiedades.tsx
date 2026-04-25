import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePropiedades, usePropietarios, useContratos, useInquilinos, findById, type Propiedad } from '@/hooks/useSupabaseData';
import { useDeletePropiedad } from '@/hooks/usePropiedadMutations';
import PropiedadFormDialog from '@/components/PropiedadFormDialog';
import { useToast } from '@/hooks/use-toast';
import { Search, Eye, Plus, Edit, Trash2 } from 'lucide-react';

export default function Propiedades() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroPropietario, setFiltroPropietario] = useState('todos');
  const [formDialog, setFormDialog] = useState<{ open: boolean; propiedad?: Propiedad }>({ open: false });
  const [delTarget, setDelTarget] = useState<Propiedad | null>(null);

  const { data: propiedades = [], isLoading } = usePropiedades();
  const { data: propietarios = [] } = usePropietarios();
  const { data: contratos = [] } = useContratos();
  const { data: inquilinos = [] } = useInquilinos();
  const deletePropiedad = useDeletePropiedad();

  const filtered = propiedades.filter(p => {
    if (search && !p.direccion.toLowerCase().includes(search.toLowerCase()) && !p.unidad.toLowerCase().includes(search.toLowerCase())) return false;
    if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false;
    if (filtroPropietario !== 'todos' && p.propietario_id !== filtroPropietario) return false;
    return true;
  });

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Propiedades</h1>
          <p className="text-muted-foreground">Gestión de unidades inmobiliarias</p>
        </div>
        <Button onClick={() => setFormDialog({ open: true })}><Plus className="h-4 w-4 mr-1" />Nueva propiedad</Button>
      </div>

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
                {['Vacante','Alquilada','Reservada','En refacción','Inactiva'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => {
                const owner = findById(propietarios, p.propietario_id);
                const ct = findById(contratos, p.contrato_activo_id);
                const inq = ct ? findById(inquilinos, ct.inquilino_id) : undefined;
                const estadoBadge = p.estado === 'Alquilada'
                  ? 'bg-status-success text-status-success-foreground'
                  : p.estado === 'Vacante'
                  ? 'bg-status-warning text-status-warning-foreground'
                  : 'bg-muted text-muted-foreground';
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium cursor-pointer" onClick={() => navigate(`/propiedades/${p.id}`)}>{p.direccion}</TableCell>
                    <TableCell>{p.unidad}</TableCell>
                    <TableCell>{p.tipo}</TableCell>
                    <TableCell>{owner?.nombre || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell><Badge className={estadoBadge}>{p.estado}</Badge></TableCell>
                    <TableCell>{ct ? <Badge variant="outline">{ct.codigo}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{inq?.nombre || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/propiedades/${p.id}`)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setFormDialog({ open: true, propiedad: p })}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setDelTarget(p)}><Trash2 className="h-4 w-4 text-status-danger" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PropiedadFormDialog
        open={formDialog.open}
        onOpenChange={open => setFormDialog({ open, propiedad: open ? formDialog.propiedad : undefined })}
        propiedad={formDialog.propiedad}
      />

      <AlertDialog open={!!delTarget} onOpenChange={open => !open && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar propiedad</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar "{delTarget?.direccion} {delTarget?.unidad}"? Si tiene contratos activos, no se podrá eliminar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!delTarget) return;
              try {
                await deletePropiedad.mutateAsync(delTarget.id);
                toast({ title: 'Propiedad eliminada' });
                setDelTarget(null);
              } catch (e: any) {
                toast({ title: 'No se pudo eliminar', description: e.message, variant: 'destructive' });
              }
            }}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
