import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useLiquidaciones, useContratos, usePropiedades, useInquilinos, useAllConceptos, findById, formatCurrency } from '@/hooks/useSupabaseData';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye } from 'lucide-react';


export default function Liquidaciones() {
  const navigate = useNavigate();
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos');

  const { data: liquidaciones = [], isLoading } = useLiquidaciones();
  const { data: contratos = [] } = useContratos();
  const { data: propiedades = [] } = usePropiedades();
  const { data: inquilinos = [] } = useInquilinos();
  const { data: allConceptos = [] } = useAllConceptos();

  const conceptosPorLiq = allConceptos.reduce<Record<string, { total: number; cobrados: number; pendientes: string[] }>>((acc, c) => {
    if (!c.aplica_al_inquilino) return acc;
    if (!acc[c.liquidacion_id]) acc[c.liquidacion_id] = { total: 0, cobrados: 0, pendientes: [] };
    acc[c.liquidacion_id].total += 1;
    if (c.pago_id) acc[c.liquidacion_id].cobrados += 1;
    else acc[c.liquidacion_id].pendientes.push(c.concepto);
    return acc;
  }, {});

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;


  const periodosDisponibles = Array.from(new Set(liquidaciones.map(l => l.periodo)))
    .sort((a, b) => b.localeCompare(a))
    .map(p => {
      const [y, m] = p.split('-');
      const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      return { value: p, label: `${meses[parseInt(m,10)-1]} ${y}` };
    });

  const filtered = liquidaciones.filter(l => {
    if (filtroEstado !== 'todos' && l.estado !== filtroEstado) return false;
    if (filtroPeriodo !== 'todos' && l.periodo !== filtroPeriodo) return false;
    return true;
  });

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case 'Cobrada': case 'Transferida': return 'bg-status-success text-status-success-foreground';
      case 'Pendiente': return 'bg-status-warning text-status-warning-foreground';
      case 'Parcial': return 'bg-status-danger text-status-danger-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Liquidaciones</h1>
          <p className="text-muted-foreground">Liquidaciones mensuales por contrato y período</p>
        </div>
        <Button onClick={() => navigate('/generar-liquidacion')}>Generar liquidación mensual</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los períodos</SelectItem>
                {periodosDisponibles.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="Borrador">Borrador</SelectItem>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
                <SelectItem value="Parcial">Parcial</SelectItem>
                <SelectItem value="Cobrada">Cobrada</SelectItem>
                <SelectItem value="Transferida">Transferida</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <TooltipProvider delayDuration={150}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Propiedad</TableHead>
                <TableHead>Inquilino</TableHead>
                <TableHead>Modalidad</TableHead>
                <TableHead>Total a cobrar</TableHead>
                <TableHead>Cobrado</TableHead>
                <TableHead className="w-40">Conceptos</TableHead>
                <TableHead>Neto propietario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(l => {
                const ct = findById(contratos, l.contrato_id);
                const prop = ct ? findById(propiedades, ct.propiedad_id) : undefined;
                const inq = ct ? findById(inquilinos, ct.inquilino_id) : undefined;
                const conc = conceptosPorLiq[l.id] || { total: 0, cobrados: 0, pendientes: [] };
                const pct = conc.total > 0 ? (conc.cobrados / conc.total) * 100 : 0;
                const barColor = conc.total === 0 ? 'bg-muted'
                  : conc.cobrados === conc.total ? '[&>div]:bg-status-success'
                  : conc.cobrados > 0 ? '[&>div]:bg-status-warning'
                  : '[&>div]:bg-muted-foreground/40';
                const esPropMode = ((l as any).destino_cobro ?? 'Inmobiliaria') === 'Propietario';
                const estadoLabel = l.estado === 'Transferida'
                  ? (esPropMode ? 'Comisión cobrada' : 'Rendida')
                  : l.estado;
                return (
                  <TableRow key={l.id} className="cursor-pointer" onClick={() => navigate(`/liquidaciones/${l.id}`)}>
                    <TableCell className="font-medium">{l.periodo_label}</TableCell>
                    <TableCell><Badge variant="outline">{ct?.codigo}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{prop?.direccion} {prop?.unidad}</TableCell>
                    <TableCell>{inq?.nombre}</TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className={esPropMode ? 'border-status-warning/50 text-status-warning' : 'border-status-info/50 text-status-info'}>
                            {esPropMode ? 'Cobra prop.' : 'Cobra inmob.'}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs">
                          {esPropMode
                            ? 'El inquilino paga directo al propietario; la inmobiliaria solo cobra su comisión.'
                            : 'El inquilino paga a la inmobiliaria, que luego rinde al propietario.'}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{formatCurrency(l.total_cobrar)}</TableCell>
                    <TableCell>{formatCurrency(l.total_cobrado)}</TableCell>
                    <TableCell>
                      {conc.total > 0 ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium">{conc.cobrados}/{conc.total}</span>
                                {conc.pendientes.length > 0 && (
                                  <span className="text-status-warning text-[10px]">Faltan {conc.pendientes.length}</span>
                                )}
                              </div>
                              <Progress value={pct} className={`h-1.5 ${barColor}`} />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            {conc.pendientes.length === 0
                              ? <p className="text-xs">Todos los conceptos cobrados</p>
                              : <div className="text-xs space-y-0.5">
                                  <p className="font-semibold mb-1">Pendientes:</p>
                                  {conc.pendientes.map((p, i) => <p key={i}>• {p}</p>)}
                                </div>}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{esPropMode ? <span className="text-muted-foreground text-xs">N/A</span> : formatCurrency(l.neto_propietario)}</TableCell>
                    <TableCell><Badge className={estadoBadge(l.estado)}>{estadoLabel}</Badge></TableCell>
                    <TableCell><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </TooltipProvider>
        </CardContent>
      </Card>

    </div>
  );
}
