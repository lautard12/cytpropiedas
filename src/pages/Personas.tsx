import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  usePropietarios, useInquilinos, usePropiedades, useContratos, useLiquidaciones,
  formatCurrency, type Persona, type RolPersona,
} from '@/hooks/useSupabaseData';
import { useRemoveRolOrDeletePersona } from '@/hooks/usePersonaMutations';
import { PersonaFormDialog } from '@/components/PersonaFormDialog';
import { useToast } from '@/hooks/use-toast';
import { Eye, Plus, Pencil, Trash2, Search, ChevronDown, Users } from 'lucide-react';

type TabKey = 'todas' | 'propietarios' | 'inquilinos' | 'garantes';

interface PersonaUnificada {
  /** persona_id (clave maestra de la persona) */
  personaId: string;
  nombre: string;
  dni: string;
  cuit: string;
  email: string;
  telefono: string;
  roles: RolPersona[];
  /** id en tabla propietarios (si tiene ese rol) */
  propietarioId?: string;
  /** id en tabla inquilinos (si tiene ese rol) */
  inquilinoId?: string;
  propietarioRow?: Persona;
  inquilinoRow?: Persona;
  // Métricas agregadas
  propiedadesCount: number;
  contratosActivos: number;
  netoPendiente: number;
  deuda: number;
}

interface GaranteRow {
  nombre: string;
  telefono: string;
  dni: string;
  // Inquilinos a los que garantiza
  inquilinos: { nombre: string; inquilinoId: string }[];
}

export default function Personas() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as TabKey) || 'todas';

  const { data: propietarios = [], isLoading: lp } = usePropietarios();
  const { data: inquilinos = [], isLoading: li } = useInquilinos();
  const { data: propiedades = [] } = usePropiedades();
  const { data: contratos = [] } = useContratos();
  const { data: liquidaciones = [] } = useLiquidaciones();
  const removeRol = useRemoveRolOrDeletePersona();

  const [search, setSearch] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [formRol, setFormRol] = useState<RolPersona>('propietario');
  const [editing, setEditing] = useState<{ persona: Persona; rol: RolPersona } | undefined>();
  const [deleting, setDeleting] = useState<{ persona: Persona; rol: RolPersona } | undefined>();

  const isLoading = lp || li;

  // Unificar por persona_id
  const personasUnificadas = useMemo<PersonaUnificada[]>(() => {
    const byPersonaId = new Map<string, PersonaUnificada>();

    for (const p of propietarios) {
      const props = propiedades.filter(pr => pr.propietario_id === p.id);
      const cts = contratos.filter(c => c.propietario_id === p.id && (c.estado === 'Activo' || c.estado === 'Por vencer'));
      const netoPendiente = liquidaciones
        .filter(l => {
          const ct = contratos.find(c => c.id === l.contrato_id);
          return ct?.propietario_id === p.id && l.estado === 'Cobrada';
        })
        .reduce((s, l) => s + l.neto_propietario, 0);

      byPersonaId.set(p.persona_id, {
        personaId: p.persona_id,
        nombre: p.nombre, dni: p.dni, cuit: p.cuit, email: p.email, telefono: p.telefono,
        roles: ['propietario'],
        propietarioId: p.id,
        propietarioRow: p,
        propiedadesCount: props.length,
        contratosActivos: cts.length,
        netoPendiente,
        deuda: 0,
      });
    }

    for (const i of inquilinos) {
      const ct = contratos.find(c => c.inquilino_id === i.id && (c.estado === 'Activo' || c.estado === 'Por vencer'));
      const deuda = liquidaciones
        .filter(l => l.contrato_id === ct?.id && l.pendiente > 0)
        .reduce((s, l) => s + l.pendiente, 0);

      const existing = byPersonaId.get(i.persona_id);
      if (existing) {
        existing.roles.push('inquilino');
        existing.inquilinoId = i.id;
        existing.inquilinoRow = i;
        existing.deuda += deuda;
        if (ct) existing.contratosActivos += 1;
      } else {
        byPersonaId.set(i.persona_id, {
          personaId: i.persona_id,
          nombre: i.nombre, dni: i.dni, cuit: i.cuit, email: i.email, telefono: i.telefono,
          roles: ['inquilino'],
          inquilinoId: i.id,
          inquilinoRow: i,
          propiedadesCount: 0,
          contratosActivos: ct ? 1 : 0,
          netoPendiente: 0,
          deuda,
        });
      }
    }

    return Array.from(byPersonaId.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [propietarios, inquilinos, propiedades, contratos, liquidaciones]);

  // Garantes: derivados de inquilinos.garante_*
  const garantes = useMemo<GaranteRow[]>(() => {
    const map = new Map<string, GaranteRow>();
    for (const i of inquilinos) {
      const nombre = (i as any).garante_nombre || (i as any).garante;
      if (!nombre || !nombre.trim()) continue;
      const key = `${nombre.toLowerCase()}|${(i as any).garante_dni || ''}`;
      const row = map.get(key) ?? {
        nombre,
        telefono: (i as any).garante_telefono || '',
        dni: (i as any).garante_dni || '',
        inquilinos: [],
      };
      row.inquilinos.push({ nombre: i.nombre, inquilinoId: i.id });
      map.set(key, row);
    }
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [inquilinos]);

  const term = search.trim().toLowerCase();
  const filteredPersonas = personasUnificadas.filter(p =>
    !term || `${p.nombre} ${p.dni} ${p.cuit} ${p.email}`.toLowerCase().includes(term)
  );

  const dataByTab: PersonaUnificada[] = useMemo(() => {
    if (tab === 'propietarios') return filteredPersonas.filter(p => p.roles.includes('propietario'));
    if (tab === 'inquilinos') return filteredPersonas.filter(p => p.roles.includes('inquilino'));
    return filteredPersonas;
  }, [filteredPersonas, tab]);

  const filteredGarantes = garantes.filter(g =>
    !term || `${g.nombre} ${g.dni} ${g.telefono}`.toLowerCase().includes(term)
  );

  const setTab = (k: TabKey) => {
    const next = new URLSearchParams(searchParams);
    if (k === 'todas') next.delete('tab'); else next.set('tab', k);
    setSearchParams(next, { replace: true });
  };

  const openNew = (rol: RolPersona) => {
    setFormRol(rol);
    setEditing(undefined);
    setOpenForm(true);
  };

  const openEdit = (p: PersonaUnificada, rol: RolPersona) => {
    const persona = rol === 'propietario' ? p.propietarioRow : p.inquilinoRow;
    if (!persona) return;
    setFormRol(rol);
    setEditing({ persona, rol });
    setOpenForm(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await removeRol.mutateAsync({ personaId: deleting.persona.id, rol: deleting.rol });
      const otras = deleting.persona.roles.filter(r => r !== deleting.rol);
      toast({
        title: otras.length > 0 ? 'Rol removido' : 'Persona eliminada',
        description: otras.length > 0
          ? `${deleting.persona.nombre} sigue cargado como ${otras.join(', ')}.`
          : `${deleting.persona.nombre} fue eliminado del sistema.`,
      });
      setDeleting(undefined);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message ?? 'No se pudo eliminar.', variant: 'destructive' });
    }
  };

  // Validación previa: ¿se puede borrar este rol?
  const deleteBlock = useMemo(() => {
    if (!deleting) return { blocked: false, motivo: '' };
    if (deleting.rol === 'propietario') {
      const propId = deleting.persona.id;
      const props = propiedades.filter(pr => pr.propietario_id === propId);
      const cts = contratos.filter(c => c.propietario_id === propId);
      if (props.length || cts.length) {
        return { blocked: true, motivo: `Tiene ${props.length} propiedad(es) y ${cts.length} contrato(s) asociados. Reasigná o eliminá esos registros primero.` };
      }
    } else {
      const inqId = deleting.persona.id;
      const cts = contratos.filter(c => c.inquilino_id === inqId);
      if (cts.length) return { blocked: true, motivo: `Tiene ${cts.length} contrato(s) asociado(s). Reasigná o cerrá esos contratos primero.` };
    }
    return { blocked: false, motivo: '' };
  }, [deleting, propiedades, contratos]);

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" /> Personas
          </h1>
          <p className="text-muted-foreground">Propietarios, inquilinos y garantes en un solo lugar</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" /> Nueva persona
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openNew('propietario')}>Como propietario</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openNew('inquilino')}>Como inquilino</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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

          <Tabs value={tab} onValueChange={v => setTab(v as TabKey)}>
            <TabsList>
              <TabsTrigger value="todas">Todas ({personasUnificadas.length})</TabsTrigger>
              <TabsTrigger value="propietarios">
                Propietarios ({personasUnificadas.filter(p => p.roles.includes('propietario')).length})
              </TabsTrigger>
              <TabsTrigger value="inquilinos">
                Inquilinos ({personasUnificadas.filter(p => p.roles.includes('inquilino')).length})
              </TabsTrigger>
              <TabsTrigger value="garantes">Garantes ({garantes.length})</TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="mt-4">
              {tab === 'garantes' ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>DNI</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Garantiza a</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGarantes.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          {search ? 'Sin resultados' : 'No hay garantes cargados'}
                        </TableCell></TableRow>
                      )}
                      {filteredGarantes.map((g, idx) => (
                        <TableRow key={`${g.nombre}-${idx}`}>
                          <TableCell className="font-medium">{g.nombre}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{g.dni || '—'}</TableCell>
                          <TableCell className="text-sm">{g.telefono || '—'}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {g.inquilinos.map(i => (
                                <Badge
                                  key={i.inquilinoId}
                                  variant="outline"
                                  className="cursor-pointer"
                                  onClick={() => navigate(`/personas/${i.inquilinoId}?rol=inquilino`)}
                                >
                                  {i.nombre}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>DNI / CUIT</TableHead>
                        <TableHead>Contacto</TableHead>
                        <TableHead className="text-right">Propiedades</TableHead>
                        <TableHead className="text-right">Contratos activos</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dataByTab.length === 0 && (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          {search ? 'Sin resultados' : 'No hay personas cargadas'}
                        </TableCell></TableRow>
                      )}
                      {dataByTab.map(p => {
                        // Para link al detalle: priorizamos el rol del tab; si Todas, propietario primero, sino inquilino
                        const linkRol: RolPersona =
                          tab === 'inquilinos' ? 'inquilino'
                          : tab === 'propietarios' ? 'propietario'
                          : (p.roles.includes('propietario') ? 'propietario' : 'inquilino');
                        const linkId = linkRol === 'propietario' ? p.propietarioId : p.inquilinoId;
                        const goDetail = () => linkId && navigate(`/personas/${linkId}?rol=${linkRol}`);

                        return (
                          <TableRow key={p.personaId}>
                            <TableCell className="font-medium cursor-pointer" onClick={goDetail}>{p.nombre}</TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                {p.roles.includes('propietario') && (
                                  <Badge variant="secondary" className="bg-status-info/10 text-status-info">Propietario</Badge>
                                )}
                                {p.roles.includes('inquilino') && (
                                  <Badge variant="secondary" className="bg-primary/10 text-primary">Inquilino</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {p.dni || '—'}{p.cuit ? ` · ${p.cuit}` : ''}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {p.email || p.telefono || '—'}
                            </TableCell>
                            <TableCell className="text-right">{p.propiedadesCount || '—'}</TableCell>
                            <TableCell className="text-right">{p.contratosActivos || '—'}</TableCell>
                            <TableCell className="text-right">
                              {p.deuda > 0 && (
                                <div className="text-status-danger font-semibold text-xs">
                                  Debe {formatCurrency(p.deuda)}
                                </div>
                              )}
                              {p.netoPendiente > 0 && (
                                <div className="text-status-warning font-semibold text-xs">
                                  A pagar {formatCurrency(p.netoPendiente)}
                                </div>
                              )}
                              {p.deuda === 0 && p.netoPendiente === 0 && <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={goDetail} title="Ver">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" title="Editar"><Pencil className="h-4 w-4" /></Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {p.roles.map(r => (
                                      <DropdownMenuItem key={r} onClick={() => openEdit(p, r)}>
                                        Editar como {r}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" title="Eliminar">
                                      <Trash2 className="h-4 w-4 text-status-danger" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {p.roles.map(r => {
                                      const persona = r === 'propietario' ? p.propietarioRow : p.inquilinoRow;
                                      if (!persona) return null;
                                      return (
                                        <DropdownMenuItem key={r} onClick={() => setDeleting({ persona, rol: r })}>
                                          Quitar rol de {r}
                                        </DropdownMenuItem>
                                      );
                                    })}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <PersonaFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        rol={formRol}
        persona={editing?.persona}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteBlock.blocked ? 'No se puede eliminar' : `¿Quitar rol de ${deleting?.rol}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteBlock.blocked ? (
                <><strong>{deleting?.persona.nombre}</strong>: {deleteBlock.motivo}</>
              ) : deleting && deleting.persona.roles.length > 1 ? (
                <>
                  <strong>{deleting.persona.nombre}</strong> también tiene rol de{' '}
                  <em>{deleting.persona.roles.filter(r => r !== deleting.rol).join(', ')}</em>.
                  Solo se quitará el rol de {deleting.rol}; el contacto se conserva.
                </>
              ) : (
                <>Vas a eliminar a <strong>{deleting?.persona.nombre}</strong> del sistema. Esta acción no se puede deshacer.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {!deleteBlock.blocked && (
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-status-danger text-status-danger-foreground hover:bg-status-danger/90"
              >
                Confirmar
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
