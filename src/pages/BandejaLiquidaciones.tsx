import { useState, useMemo, Fragment } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useContratos, usePropiedades, usePropietarios, useInquilinos, useLiquidaciones,
  usePreavisosAjuste,
  findById, formatCurrency,
} from '@/hooks/useSupabaseData';
import { Search, Calculator, Eye, CheckCircle2, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getEstadoAjuste } from '@/lib/ajustes';
import { AjusteBadge } from '@/components/AjusteBadge';

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const PAGE_SIZE = 20;

function buildPeriodos() {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let offset = 3; offset >= -12; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push({ value, label: `${MESES_ES[d.getMonth()]} ${d.getFullYear()}` });
  }
  return out;
}

function norm(s: string) {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

type EstadoPeriodo = 'Pendiente' | 'Borrador' | 'Generada' | 'Parcial' | 'Cobrada' | 'Transferida' | 'Anulada';

const estadoMeta: Record<EstadoPeriodo, { label: string; cls: string; icon: any }> = {
  Pendiente:   { label: 'Pendiente',   cls: 'bg-status-warning/15 text-status-warning border-status-warning/30', icon: Clock },
  Borrador:    { label: 'Borrador',    cls: 'bg-muted text-muted-foreground border-border', icon: Clock },
  Generada:    { label: 'Generada',    cls: 'bg-status-info/15 text-status-info border-status-info/30', icon: CheckCircle2 },
  Parcial:     { label: 'Parcial',     cls: 'bg-status-warning/15 text-status-warning border-status-warning/30', icon: AlertCircle },
  Cobrada:     { label: 'Cobrada',     cls: 'bg-status-success/15 text-status-success border-status-success/30', icon: CheckCircle2 },
  Transferida: { label: 'Transferida', cls: 'bg-status-success/15 text-status-success border-status-success/30', icon: CheckCircle2 },
  Anulada:     { label: 'Anulada',     cls: 'bg-status-danger/15 text-status-danger border-status-danger/30', icon: AlertCircle },
};

export default function BandejaLiquidaciones() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const periodos = useMemo(() => buildPeriodos(), []);
  const periodoActual = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const periodo = searchParams.get('periodo') || periodoActual;
  const search = searchParams.get('q') || '';
  const filtroEstado = searchParams.get('estado') || 'todos';
  const filtroTipo = searchParams.get('tipo') || 'todos';
  const filtroPropietario = searchParams.get('propietario') || 'todos';
  const page = Number(searchParams.get('page') || '1');

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === '' || value === 'todos') next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const { data: contratos = [], isLoading } = useContratos();
  const { data: propiedades = [] } = usePropiedades();
  const { data: propietarios = [] } = usePropietarios();
  const { data: inquilinos = [] } = useInquilinos();
  const { data: liquidaciones = [] } = useLiquidaciones();
  const { data: preavisos = [] } = usePreavisosAjuste();

  const contratosActivos = useMemo(
    () => contratos.filter(c => c.estado === 'Activo' || c.estado === 'Por vencer'),
    [contratos]
  );

  // Cruce contrato × liquidación del período
  const rows = useMemo(() => {
    return contratosActivos.map(c => {
      const liq = liquidaciones.find(l => l.contrato_id === c.id && l.periodo === periodo && l.estado !== 'Anulada');
      const prop = findById(propiedades, c.propiedad_id);
      const inq = findById(inquilinos, c.inquilino_id);
      const own = findById(propietarios, c.propietario_id);
      const estado: EstadoPeriodo = (liq?.estado as EstadoPeriodo) || 'Pendiente';
      const adaptado = estado === 'Pendiente' ? 'Pendiente'
        : estado === 'Borrador' ? 'Borrador'
        : (estado === 'Pendiente' as any) ? 'Pendiente'
        : estado === 'Cobrada' ? 'Cobrada'
        : estado === 'Transferida' ? 'Transferida'
        : estado === 'Parcial' ? 'Parcial'
        : 'Generada';
      return { contrato: c, liq, propiedad: prop, inquilino: inq, propietario: own, estado: adaptado as EstadoPeriodo };
    });
  }, [contratosActivos, liquidaciones, periodo, propiedades, inquilinos, propietarios]);

  const filtered = useMemo(() => {
    const q = norm(search);
    return rows.filter(r => {
      if (filtroEstado !== 'todos') {
        if (filtroEstado === 'pendiente' && r.estado !== 'Pendiente' && r.estado !== 'Borrador') return false;
        if (filtroEstado === 'generada' && (r.estado === 'Pendiente' || r.estado === 'Borrador')) return false;
        if (filtroEstado === 'cobrada' && r.estado !== 'Cobrada' && r.estado !== 'Transferida') return false;
      }
      if (filtroTipo !== 'todos' && (r.contrato as any).tipo_contrato !== filtroTipo) return false;
      if (filtroPropietario !== 'todos' && r.contrato.propietario_id !== filtroPropietario) return false;
      if (q) {
        const hay = norm([
          r.contrato.codigo,
          r.propiedad?.direccion, r.propiedad?.unidad,
          r.inquilino?.nombre, r.propietario?.nombre,
        ].filter(Boolean).join(' '));
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, filtroEstado, filtroTipo, filtroPropietario]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  // Resumen del período (sobre todos los activos, no sobre el filtrado)
  const resumen = useMemo(() => {
    const r = { pendientes: 0, generadas: 0, cobradas: 0, total: rows.length };
    rows.forEach(x => {
      if (x.estado === 'Pendiente' || x.estado === 'Borrador') r.pendientes++;
      else if (x.estado === 'Cobrada' || x.estado === 'Transferida') r.cobradas++;
      else r.generadas++;
    });
    return r;
  }, [rows]);

  // Selección bulk
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const seleccionables = paginated.filter(r => r.estado === 'Pendiente').map(r => r.contrato.id);
  const allSelectedInPage = seleccionables.length > 0 && seleccionables.every(id => selected.has(id));
  const toggleAllPage = () => {
    setSelected(prev => {
      const n = new Set(prev);
      if (allSelectedInPage) seleccionables.forEach(id => n.delete(id));
      else seleccionables.forEach(id => n.add(id));
      return n;
    });
  };
  const toggleOne = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const seleccionadosRows = rows.filter(r => selected.has(r.contrato.id) && r.estado === 'Pendiente');
  const totalEstimado = seleccionadosRows.reduce((s, r) => s + Number(r.contrato.alquiler_base || 0), 0);

  const periodoLabel = periodos.find(p => p.value === periodo)?.label ?? periodo;

  const generarBulk = async () => {
    if (!seleccionadosRows.length) return;
    setBulkRunning(true);
    try {
      const liqsInsert = seleccionadosRows.map(r => ({
        contrato_id: r.contrato.id,
        periodo,
        periodo_label: periodoLabel,
        subtotal: Number(r.contrato.alquiler_base),
        total_cobrar: Number(r.contrato.alquiler_base),
        total_cobrado: 0,
        pendiente: Number(r.contrato.alquiler_base),
        comision_inmobiliaria: Number(r.contrato.alquiler_base) * (r.contrato.comision_porcentaje || 0) / 100,
        saldo_anterior: 0,
        neto_propietario: Number(r.contrato.alquiler_base) - (Number(r.contrato.alquiler_base) * (r.contrato.comision_porcentaje || 0) / 100),
        estado: 'Pendiente' as any,
        observaciones: 'Generada en lote — completar servicios y ajustes desde el detalle.',
      }));

      const { data: liqsCreadas, error: liqErr } = await supabase
        .from('liquidaciones').insert(liqsInsert).select('id, contrato_id');
      if (liqErr) throw liqErr;

      const conceptos = (liqsCreadas || []).map(liq => {
        const row = seleccionadosRows.find(r => r.contrato.id === liq.contrato_id);
        return {
          liquidacion_id: liq.id,
          concepto: 'Alquiler',
          monto: Number(row?.contrato.alquiler_base || 0),
          responsable: 'Inquilino',
          aplica_al_inquilino: true,
        };
      });
      if (conceptos.length) {
        const { error: cErr } = await supabase.from('conceptos_liquidacion').insert(conceptos);
        if (cErr) throw cErr;
      }

      queryClient.invalidateQueries({ queryKey: ['liquidaciones'] });
      queryClient.invalidateQueries({ queryKey: ['conceptos_liquidacion'] });

      toast({
        title: `${seleccionadosRows.length} liquidaciones generadas`,
        description: `Período ${periodoLabel}. Revisá cada una para sumar servicios y ajustes.`,
      });
      setSelected(new Set());
      setBulkOpen(false);
    } catch (err: any) {
      toast({ title: 'Error al generar liquidaciones', description: err.message, variant: 'destructive' });
    } finally {
      setBulkRunning(false);
    }
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-12 w-64" /><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Generar liquidaciones</h1>
          <p className="text-muted-foreground">Bandeja mensual: visualizá qué contratos faltan liquidar y procesalos individualmente o en lote.</p>
        </div>
        <div className="flex items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Período a liquidar</Label>
            <Select value={periodo} onValueChange={v => { setParam('periodo', v); setSelected(new Set()); }}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {periodos.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Contratos activos</p>
          <p className="text-2xl font-bold mt-1">{resumen.total}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Pendientes del mes</p>
          <p className="text-2xl font-bold mt-1 text-status-warning">{resumen.pendientes}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Generadas</p>
          <p className="text-2xl font-bold mt-1 text-status-info">{resumen.generadas}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Cobradas / transferidas</p>
          <p className="text-2xl font-bold mt-1 text-status-success">{resumen.cobradas}</p>
        </CardContent></Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar código, dirección, inquilino o propietario..."
                value={search}
                onChange={e => setParam('q', e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filtroEstado} onValueChange={v => setParam('estado', v)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado del período" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="generada">Generadas</SelectItem>
                <SelectItem value="cobrada">Cobradas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroTipo} onValueChange={v => setParam('tipo', v)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                <SelectItem value="Vivienda">Vivienda</SelectItem>
                <SelectItem value="Comercial">Comercial</SelectItem>
                <SelectItem value="Temporario">Temporario</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroPropietario} onValueChange={v => setParam('propietario', v)}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Propietario" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los propietarios</SelectItem>
                {propietarios.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
          <div className="text-sm">
            <strong>{selected.size}</strong> {selected.size === 1 ? 'contrato seleccionado' : 'contratos seleccionados'} ·
            Total estimado: <strong>{formatCurrency(totalEstimado)}</strong>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Limpiar</Button>
            <AlertDialog open={bulkOpen} onOpenChange={setBulkOpen}>
              <AlertDialogTrigger asChild>
                <Button size="sm"><Sparkles className="h-4 w-4 mr-1" /> Generar {selected.size} liquidaciones</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Generar liquidaciones en lote</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-2">
                      <p>Se generarán <strong>{seleccionadosRows.length}</strong> liquidaciones para el período <strong>{periodoLabel}</strong>, cargando únicamente el alquiler base de cada contrato.</p>
                      <p className="text-status-warning">Vas a tener que abrir cada liquidación para sumar servicios, expensas y ajustes del período.</p>
                      <p>Total estimado a cobrar: <strong>{formatCurrency(totalEstimado)}</strong></p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={bulkRunning}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={(e) => { e.preventDefault(); generarBulk(); }} disabled={bulkRunning}>
                    {bulkRunning ? 'Generando...' : 'Generar liquidaciones'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {paginated.length === 0 ? (
            <div className="p-12 text-center">
              {resumen.pendientes === 0 && resumen.total > 0 && filtroEstado === 'todos' && !search ? (
                <>
                  <CheckCircle2 className="h-12 w-12 mx-auto text-status-success mb-3" />
                  <h3 className="font-semibold text-lg">Todo liquidado para {periodoLabel}</h3>
                  <p className="text-muted-foreground text-sm">No quedan contratos pendientes en este período.</p>
                </>
              ) : (
                <>
                  <Search className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-semibold">Sin resultados</h3>
                  <p className="text-muted-foreground text-sm">Ajustá los filtros para ver más contratos.</p>
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={allSelectedInPage}
                      onCheckedChange={toggleAllPage}
                      disabled={seleccionables.length === 0}
                      aria-label="Seleccionar pendientes en página"
                    />
                  </TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Propiedad</TableHead>
                  <TableHead>Inquilino</TableHead>
                  <TableHead className="text-right">Alquiler base</TableHead>
                  <TableHead>Estado del período</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(r => {
                  const meta = estadoMeta[r.estado];
                  const Icon = meta.icon;
                  const esPendiente = r.estado === 'Pendiente' || r.estado === 'Borrador';
                  return (
                    <TableRow key={r.contrato.id}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(r.contrato.id)}
                          onCheckedChange={() => toggleOne(r.contrato.id)}
                          disabled={!esPendiente}
                          aria-label={`Seleccionar ${r.contrato.codigo}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{r.contrato.codigo}</div>
                        <div className="text-xs text-muted-foreground">{(r.contrato as any).tipo_contrato ?? 'Vivienda'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{r.propiedad?.direccion}</div>
                        <div className="text-xs text-muted-foreground">{r.propiedad?.unidad}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{r.inquilino?.nombre}</div>
                        <div className="text-xs text-muted-foreground">Prop.: {r.propietario?.nombre}</div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(r.contrato.alquiler_base), (r.contrato as any).moneda ?? 'ARS')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={meta.cls}>
                          <Icon className="h-3 w-3 mr-1" />
                          {meta.label}
                        </Badge>
                        {r.liq && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {formatCurrency(Number(r.liq.total_cobrar))} · {Number(r.liq.pendiente) > 0 ? `pend. ${formatCurrency(Number(r.liq.pendiente))}` : 'saldada'}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.liq ? (
                          <Button variant="outline" size="sm" onClick={() => navigate(`/liquidaciones/${r.liq!.id}`)}>
                            <Eye className="h-4 w-4 mr-1" /> Ver
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => navigate(`/generar-liquidacion/nueva?contrato=${r.contrato.id}&periodo=${periodo}`)}>
                            <Calculator className="h-4 w-4 mr-1" /> Liquidar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, total)} de {total}
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setParam('page', String(Math.max(1, safePage - 1)))}
                  className={safePage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .map((p, idx, arr) => (
                  <Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <PaginationItem><span className="px-2 text-muted-foreground">…</span></PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationLink
                        isActive={p === safePage}
                        onClick={() => setParam('page', String(p))}
                        className="cursor-pointer"
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  </Fragment>
                ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setParam('page', String(Math.min(totalPages, safePage + 1)))}
                  className={safePage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
