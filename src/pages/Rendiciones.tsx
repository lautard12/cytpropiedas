import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useRendiciones, useLiquidaciones, useContratos, usePropiedades, usePropietarios,
  useCobrosComision,
  findById, formatCurrency, formatDate,
} from '@/hooks/useSupabaseData';
import { Eye, Send, DollarSign } from 'lucide-react';

export default function Rendiciones() {
  const navigate = useNavigate();
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroPropietario, setFiltroPropietario] = useState('todos');
  const [filtroCobroEstado, setFiltroCobroEstado] = useState('todos');

  const { data: rendiciones = [], isLoading } = useRendiciones();
  const { data: cobros = [] } = useCobrosComision();
  const { data: liquidaciones = [] } = useLiquidaciones();
  const { data: contratos = [] } = useContratos();
  const { data: propiedades = [] } = usePropiedades();
  const { data: propietarios = [] } = usePropietarios();

  const filtered = useMemo(() => rendiciones.filter(r => {
    if (filtroEstado !== 'todos' && r.estado !== filtroEstado) return false;
    if (filtroPropietario !== 'todos' && r.propietario_id !== filtroPropietario) return false;
    return true;
  }), [rendiciones, filtroEstado, filtroPropietario]);

  const filteredCobros = useMemo(() => cobros.filter((c: any) => {
    if (filtroCobroEstado !== 'todos' && c.estado !== filtroCobroEstado) return false;
    if (filtroPropietario !== 'todos' && c.propietario_id !== filtroPropietario) return false;
    return true;
  }), [cobros, filtroCobroEstado, filtroPropietario]);

  const totales = useMemo(() => {
    const pendientes = rendiciones.filter(r => r.estado === 'Acreditada');
    const cobrosPendientes = cobros.filter((c: any) => c.estado === 'Pendiente');
    return {
      pendientesCount: pendientes.length,
      pendientesMonto: pendientes.reduce((s, r) => s + Number(r.monto_neto || 0), 0),
      transferidasMes: rendiciones.filter(r => r.estado === 'Transferida').reduce((s, r) => s + Number(r.monto_neto || 0), 0),
      cobrosPendCount: cobrosPendientes.length,
      cobrosPendMonto: cobrosPendientes.reduce((s, c: any) => s + Number(c.total_cobrar || 0), 0),
    };
  }, [rendiciones, cobros]);

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rendiciones y cobros a propietarios</h1>
        <p className="text-muted-foreground">Rendiciones (cuando cobra la inmobiliaria) y cobros de comisión (cuando cobra el propietario).</p>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Pendientes de rendir</p>
          <p className="text-2xl font-bold text-status-info">{totales.pendientesCount}</p>
          <p className="text-sm text-muted-foreground">{formatCurrency(totales.pendientesMonto)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total transferido</p>
          <p className="text-2xl font-bold text-status-success">{formatCurrency(totales.transferidasMes)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Comisiones a cobrar</p>
          <p className="text-2xl font-bold text-status-warning">{totales.cobrosPendCount}</p>
          <p className="text-sm text-muted-foreground">{formatCurrency(totales.cobrosPendMonto)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total rendiciones</p>
          <p className="text-2xl font-bold">{rendiciones.length}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="rendiciones">
        <TabsList>
          <TabsTrigger value="rendiciones"><Send className="h-4 w-4 mr-1.5" /> Rendiciones al propietario</TabsTrigger>
          <TabsTrigger value="cobros"><DollarSign className="h-4 w-4 mr-1.5" /> Cobros de comisión</TabsTrigger>
        </TabsList>

        <TabsContent value="rendiciones" className="space-y-4">
          <Card>
            <CardContent className="p-4 flex flex-wrap gap-3">
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="Acreditada">Acreditada (a rendir)</SelectItem>
                  <SelectItem value="Transferida">Transferida</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroPropietario} onValueChange={setFiltroPropietario}>
                <SelectTrigger className="w-[220px]"><SelectValue placeholder="Propietario" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los propietarios</SelectItem>
                  {propietarios.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Acreditada</TableHead>
                    <TableHead>Transferida</TableHead>
                    <TableHead>Propietario</TableHead>
                    <TableHead>Propiedad</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Comisión</TableHead>
                    <TableHead>IVA</TableHead>
                    <TableHead>Neto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Sin rendiciones</TableCell></TableRow>
                  )}
                  {filtered.map(r => {
                    const liq = liquidaciones.find(l => l.id === r.liquidacion_id);
                    const ct = liq ? contratos.find(c => c.id === liq.contrato_id) : undefined;
                    const prop = ct ? findById(propiedades, ct.propiedad_id) : undefined;
                    const prop_o = r.propietario_id ? findById(propietarios, r.propietario_id) : undefined;
                    return (
                      <TableRow key={r.id} className="cursor-pointer" onClick={() => liq && navigate(`/liquidaciones/${liq.id}`)}>
                        <TableCell>{formatDate(r.fecha_acreditacion)}</TableCell>
                        <TableCell>{r.fecha_transferencia ? formatDate(r.fecha_transferencia) : <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>{prop_o?.nombre || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{prop?.direccion} {prop?.unidad}</TableCell>
                        <TableCell><Badge variant="outline">{liq?.periodo_label}</Badge></TableCell>
                        <TableCell>{formatCurrency(r.comision_retenida)}</TableCell>
                        <TableCell>{formatCurrency(r.iva_retenido)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(r.monto_neto)}</TableCell>
                        <TableCell>
                          <Badge className={r.estado === 'Transferida' ? 'bg-status-success text-status-success-foreground' : 'bg-status-info text-status-info-foreground'}>
                            {r.estado}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {r.estado === 'Acreditada'
                            ? <Button size="sm" variant="outline"><Send className="h-3 w-3 mr-1" /> Rendir</Button>
                            : <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cobros" className="space-y-4">
          <Card>
            <CardContent className="p-4 flex flex-wrap gap-3">
              <Select value={filtroCobroEstado} onValueChange={setFiltroCobroEstado}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value="Cobrada">Cobrada</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroPropietario} onValueChange={setFiltroPropietario}>
                <SelectTrigger className="w-[220px]"><SelectValue placeholder="Propietario" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los propietarios</SelectItem>
                  {propietarios.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Propietario</TableHead>
                    <TableHead>Propiedad</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Comisión</TableHead>
                    <TableHead>IVA</TableHead>
                    <TableHead>Gastos</TableHead>
                    <TableHead>Total a cobrar</TableHead>
                    <TableHead>Fecha cobro</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCobros.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Sin cobros de comisión</TableCell></TableRow>
                  )}
                  {filteredCobros.map((c: any) => {
                    const liq = liquidaciones.find(l => l.id === c.liquidacion_id);
                    const ct = liq ? contratos.find(x => x.id === liq.contrato_id) : undefined;
                    const prop = ct ? findById(propiedades, ct.propiedad_id) : undefined;
                    const prop_o = c.propietario_id ? findById(propietarios, c.propietario_id) : undefined;
                    return (
                      <TableRow key={c.id} className="cursor-pointer" onClick={() => liq && navigate(`/liquidaciones/${liq.id}`)}>
                        <TableCell>{prop_o?.nombre || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{prop?.direccion} {prop?.unidad}</TableCell>
                        <TableCell><Badge variant="outline">{liq?.periodo_label}</Badge></TableCell>
                        <TableCell>{formatCurrency(c.monto_comision)}</TableCell>
                        <TableCell>{formatCurrency(c.iva_comision)}</TableCell>
                        <TableCell>{formatCurrency(c.monto_gastos_reintegro)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(c.total_cobrar)}</TableCell>
                        <TableCell>{c.fecha_cobro ? formatDate(c.fecha_cobro) : <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>
                          <Badge className={c.estado === 'Cobrada' ? 'bg-status-success text-status-success-foreground' : 'bg-status-warning text-status-warning-foreground'}>
                            {c.estado}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {c.estado === 'Pendiente'
                            ? <Button size="sm" variant="outline"><DollarSign className="h-3 w-3 mr-1" /> Cobrar</Button>
                            : <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
