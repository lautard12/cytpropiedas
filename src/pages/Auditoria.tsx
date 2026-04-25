import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuditoria } from '@/hooks/useAuditoria';
import { formatCurrency } from '@/hooks/useSupabaseData';
import { ChevronDown, ChevronRight, Shield } from 'lucide-react';

const accionBadge = (a: string) => {
  switch (a) {
    case 'crear': return 'bg-status-success text-status-success-foreground';
    case 'editar': return 'bg-status-info text-status-info-foreground';
    case 'anular': return 'bg-status-warning text-status-warning-foreground';
    case 'eliminar': return 'bg-status-danger text-status-danger-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
};

export default function Auditoria() {
  const [filtros, setFiltros] = useState({ entidad: 'todas', accion: 'todas', desde: '', hasta: '' });
  const { data: rows = [], isLoading } = useAuditoria(filtros);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Auditoría</h1>
          <p className="text-muted-foreground text-sm">Registro de cambios sensibles. Solo visible para administradores.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-4 gap-3">
            <div className="space-y-1"><Label>Entidad</Label>
              <Select value={filtros.entidad} onValueChange={v => setFiltros({ ...filtros, entidad: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['todas','contrato','liquidacion','pago','propiedad','persona','organizacion','sucursal','user_role'].map(e =>
                    <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Acción</Label>
              <Select value={filtros.accion} onValueChange={v => setFiltros({ ...filtros, accion: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['todas','crear','editar','anular','eliminar','otro'].map(a =>
                    <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Desde</Label><Input type="date" value={filtros.desde} onChange={e => setFiltros({ ...filtros, desde: e.target.value })} /></div>
            <div className="space-y-1"><Label>Hasta</Label><Input type="date" value={filtros.hasta} onChange={e => setFiltros({ ...filtros, hasta: e.target.value })} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Eventos ({rows.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? <Skeleton className="h-64 m-4" /> : (
            <Table>
              <TableHeader><TableRow><TableHead className="w-8"></TableHead><TableHead>Fecha</TableHead><TableHead>Usuario</TableHead><TableHead>Acción</TableHead><TableHead>Entidad</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Sin registros para los filtros seleccionados.</TableCell></TableRow>}
                {rows.map(r => (
                  <Collapsible key={r.id} asChild open={expanded === r.id} onOpenChange={o => setExpanded(o ? r.id : null)}>
                    <>
                      <TableRow className="cursor-pointer">
                        <TableCell><CollapsibleTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6">{expanded === r.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</Button></CollapsibleTrigger></TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString('es-AR')}</TableCell>
                        <TableCell className="text-xs">{r.user_email || '—'}</TableCell>
                        <TableCell><Badge className={accionBadge(r.accion)}>{r.accion}</Badge></TableCell>
                        <TableCell className="capitalize text-sm">{r.entidad}</TableCell>
                        <TableCell className="text-sm">{r.descripcion}</TableCell>
                        <TableCell className="text-right text-sm">{r.monto != null ? formatCurrency(r.monto) : '—'}</TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/30">
                            <div className="grid md:grid-cols-2 gap-4 p-2">
                              <div>
                                <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Antes</p>
                                <pre className="text-xs bg-background border rounded p-2 max-h-64 overflow-auto">{r.datos_antes ? JSON.stringify(r.datos_antes, null, 2) : '—'}</pre>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Después</p>
                                <pre className="text-xs bg-background border rounded p-2 max-h-64 overflow-auto">{r.datos_despues ? JSON.stringify(r.datos_despues, null, 2) : '—'}</pre>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
