import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useInquilinos, useContratos, useLiquidaciones, usePropiedades, findById, formatCurrency, type Persona } from '@/hooks/useSupabaseData';
import { useRemoveRolOrDeletePersona } from '@/hooks/usePersonaMutations';
import { PersonaFormDialog } from '@/components/PersonaFormDialog';
import { useToast } from '@/hooks/use-toast';
import { Eye, Plus, Pencil, Trash2, Search } from 'lucide-react';

export default function Inquilinos() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: inquilinos = [], isLoading } = useInquilinos();
  const { data: contratos = [] } = useContratos();
  const { data: liquidaciones = [] } = useLiquidaciones();
  const { data: propiedades = [] } = usePropiedades();
  const removeRol = useRemoveRolOrDeletePersona();

  const [search, setSearch] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Persona | undefined>();
  const [deleting, setDeleting] = useState<Persona | undefined>();

  const data = useMemo(() => {
    const term = search.trim().toLowerCase();
    return inquilinos
      .filter(p => !term || `${p.nombre} ${p.dni} ${p.email}`.toLowerCase().includes(term))
      .map(inq => {
        const ct = contratos.find(c => c.inquilino_id === inq.id && (c.estado === 'Activo' || c.estado === 'Por vencer'));
        const prop = ct ? findById(propiedades, ct.propiedad_id) : undefined;
        const deuda = liquidaciones
          .filter(l => l.contrato_id === ct?.id && l.pendiente > 0)
          .reduce((s, l) => s + l.pendiente, 0);
        const estadoPago = deuda > 0 ? 'Con deuda' : 'Al día';
        return { ...inq, contrato: ct, propiedad: prop, deuda, estadoPago };
      });
  }, [inquilinos, contratos, liquidaciones, propiedades, search]);

  const contratosDeleting = deleting ? contratos.filter(c => c.inquilino_id === deleting.id) : [];
  const blockDelete = contratosDeleting.length > 0;

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await removeRol.mutateAsync({ personaId: deleting.id, rol: 'inquilino' });
      const otherRoles = deleting.roles.filter(r => r !== 'inquilino');
      toast({
        title: otherRoles.length > 0 ? 'Rol removido' : 'Inquilino eliminado',
        description: otherRoles.length > 0
          ? `${deleting.nombre} sigue cargado como ${otherRoles.join(', ')}.`
          : `${deleting.nombre} fue eliminado del sistema.`,
      });
      setDeleting(undefined);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message ?? 'No se pudo eliminar.', variant: 'destructive' });
    }
  };

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inquilinos</h1>
          <p className="text-muted-foreground">Gestión de inquilinos y estado de pagos</p>
        </div>
        <Button onClick={() => { setEditing(undefined); setOpenForm(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo inquilino
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, DNI o email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Propiedad</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Estado de pago</TableHead>
                  <TableHead>Deuda actual</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {search ? 'Sin resultados' : 'No hay inquilinos cargados'}
                  </TableCell></TableRow>
                )}
                {data.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium cursor-pointer" onClick={() => navigate(`/inquilinos/${d.id}`)}>{d.nombre}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.dni || '—'}</TableCell>
                    <TableCell className="text-sm">{d.propiedad ? `${d.propiedad.direccion} ${d.propiedad.unidad}` : '—'}</TableCell>
                    <TableCell>{d.contrato ? <Badge variant="outline">{d.contrato.codigo}</Badge> : '—'}</TableCell>
                    <TableCell>
                      <Badge className={d.estadoPago === 'Al día' ? 'bg-status-success text-status-success-foreground' : 'bg-status-danger text-status-danger-foreground'}>
                        {d.estadoPago}
                      </Badge>
                    </TableCell>
                    <TableCell className={d.deuda > 0 ? 'text-status-danger font-semibold' : ''}>{formatCurrency(d.deuda)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/inquilinos/${d.id}`)} title="Ver"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(d); setOpenForm(true); }} title="Editar"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleting(d)} title="Eliminar"><Trash2 className="h-4 w-4 text-status-danger" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PersonaFormDialog open={openForm} onOpenChange={setOpenForm} rol="inquilino" persona={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{blockDelete ? 'No se puede eliminar' : '¿Eliminar inquilino?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {blockDelete ? (
                <>
                  <strong>{deleting?.nombre}</strong> tiene {contratosDeleting.length} contrato(s) asociado(s).
                  Reasigná o eliminá esos contratos antes de borrar el inquilino.
                </>
              ) : deleting && deleting.roles.length > 1 ? (
                <>
                  <strong>{deleting.nombre}</strong> también tiene rol de <em>{deleting.roles.filter(r => r !== 'inquilino').join(', ')}</em>.
                  Solo se quitará el rol de inquilino; el contacto se conserva.
                </>
              ) : (
                <>Vas a eliminar a <strong>{deleting?.nombre}</strong> del sistema. Esta acción no se puede deshacer.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {!blockDelete && (
              <AlertDialogAction onClick={handleDelete} className="bg-status-danger text-status-danger-foreground hover:bg-status-danger/90">
                Eliminar
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
