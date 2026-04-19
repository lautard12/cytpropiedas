import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePropietarios, usePropiedades, useContratos, useLiquidaciones, formatCurrency, type Persona } from '@/hooks/useSupabaseData';
import { useRemoveRolOrDeletePersona } from '@/hooks/usePersonaMutations';
import { PersonaFormDialog } from '@/components/PersonaFormDialog';
import { useToast } from '@/hooks/use-toast';
import { Eye, Plus, Pencil, Trash2, Search } from 'lucide-react';

export default function Propietarios() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: propietarios = [], isLoading } = usePropietarios();
  const { data: propiedades = [] } = usePropiedades();
  const { data: contratos = [] } = useContratos();
  const { data: liquidaciones = [] } = useLiquidaciones();
  const removeRol = useRemoveRolOrDeletePersona();

  const [search, setSearch] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Persona | undefined>();
  const [deleting, setDeleting] = useState<Persona | undefined>();

  const data = useMemo(() => {
    const term = search.trim().toLowerCase();
    return propietarios
      .filter(p => !term || `${p.nombre} ${p.dni} ${p.cuit} ${p.email}`.toLowerCase().includes(term))
      .map(p => {
        const props = propiedades.filter(pr => pr.propietario_id === p.id);
        const cts = contratos.filter(c => c.propietario_id === p.id && (c.estado === 'Activo' || c.estado === 'Por vencer'));
        const netoPendiente = liquidaciones
          .filter(l => {
            const ct = contratos.find(c => c.id === l.contrato_id);
            return ct?.propietario_id === p.id && l.estado === 'Cobrada';
          })
          .reduce((s, l) => s + l.neto_propietario, 0);
        const ultimaLiq = liquidaciones
          .filter(l => {
            const ct = contratos.find(c => c.id === l.contrato_id);
            return ct?.propietario_id === p.id;
          })
          .sort((a, b) => b.periodo.localeCompare(a.periodo))[0];
        return { ...p, propiedadesCount: props.length, contratosActivos: cts.length, netoPendiente, ultimaLiq };
      });
  }, [propietarios, propiedades, contratos, liquidaciones, search]);

  const contratosDeleting = deleting ? contratos.filter(c => c.propietario_id === deleting.id) : [];
  const propiedadesDeleting = deleting ? propiedades.filter(pr => pr.propietario_id === deleting.id) : [];
  const blockDelete = contratosDeleting.length > 0 || propiedadesDeleting.length > 0;

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await removeRol.mutateAsync({ personaId: deleting.id, rol: 'propietario' });
      const otherRoles = deleting.roles.filter(r => r !== 'propietario');
      toast({
        title: otherRoles.length > 0 ? 'Rol removido' : 'Propietario eliminado',
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
          <h1 className="text-2xl font-bold tracking-tight">Propietarios</h1>
          <p className="text-muted-foreground">Gestión de propietarios e información financiera</p>
        </div>
        <Button onClick={() => { setEditing(undefined); setOpenForm(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo propietario
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, DNI, CUIT o email…"
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
                  <TableHead>CUIT</TableHead>
                  <TableHead>Propiedades</TableHead>
                  <TableHead>Contratos activos</TableHead>
                  <TableHead>Neto pendiente</TableHead>
                  <TableHead>Última liquidación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {search ? 'Sin resultados' : 'No hay propietarios cargados'}
                  </TableCell></TableRow>
                )}
                {data.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium cursor-pointer" onClick={() => navigate(`/propietarios/${p.id}`)}>{p.nombre}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.cuit || '—'}</TableCell>
                    <TableCell>{p.propiedadesCount}</TableCell>
                    <TableCell>{p.contratosActivos}</TableCell>
                    <TableCell className={p.netoPendiente > 0 ? 'text-status-warning font-semibold' : ''}>{formatCurrency(p.netoPendiente)}</TableCell>
                    <TableCell>{p.ultimaLiq?.periodo_label || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/propietarios/${p.id}`)} title="Ver"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setOpenForm(true); }} title="Editar"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleting(p)} title="Eliminar"><Trash2 className="h-4 w-4 text-status-danger" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PersonaFormDialog open={openForm} onOpenChange={setOpenForm} rol="propietario" persona={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{blockDelete ? 'No se puede eliminar' : '¿Eliminar propietario?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {blockDelete ? (
                <>
                  <strong>{deleting?.nombre}</strong> tiene {propiedadesDeleting.length} propiedad(es) y {contratosDeleting.length} contrato(s) asociados.
                  Reasigná o eliminá esos registros antes de borrar el propietario.
                </>
              ) : deleting && deleting.roles.length > 1 ? (
                <>
                  <strong>{deleting.nombre}</strong> también tiene rol de <em>{deleting.roles.filter(r => r !== 'propietario').join(', ')}</em>.
                  Solo se quitará el rol de propietario; el contacto se conserva.
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
