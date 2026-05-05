import { useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePropietario, useInquilino, usePropietarios, useInquilinos,
  usePropiedades, useContratos, useLiquidaciones, usePagos,
  findById, formatCurrency, formatDate,
} from '@/hooks/useSupabaseData';
import { ArrowLeft, User, Building2, FileText, Wallet, AlertCircle } from 'lucide-react';

/**
 * Detalle 360° de una persona.
 * Ruta: /personas/:id?rol=propietario|inquilino
 * El :id es el id en la tabla del rol (propietarios.id o inquilinos.id).
 * Se cargan AMBOS perfiles si la persona los tiene, para mostrar todo en una sola pantalla.
 */
export default function PersonaDetalle() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const rol = (searchParams.get('rol') as 'propietario' | 'inquilino') || 'propietario';
  const navigate = useNavigate();

  // Carga inicial por el rol indicado
  const { data: propPrimary, isLoading: lpP } = usePropietario(rol === 'propietario' ? id : '');
  const { data: inqPrimary, isLoading: liP } = useInquilino(rol === 'inquilino' ? id : '');

  // Para el rol cruzado necesitamos el ID en la otra tabla. Lo obtenemos a partir de persona_id.
  const personaId = propPrimary?.persona_id ?? inqPrimary?.persona_id;
  const { data: allProps = [] } = usePropiedades();
  const { data: contratos = [] } = useContratos();
  const { data: liquidaciones = [] } = useLiquidaciones();
  const { data: allPagos = [] } = usePagos();

  // Buscar el rol cruzado en el listado completo (cache-friendly, sin fetch extra)
  const { data: allPropietarios = [] } = usePropietarios();
  const { data: allInquilinos = [] } = useInquilinos();

  const propietario = propPrimary ?? (personaId ? allPropietarios.find(p => p.persona_id === personaId) : undefined);
  const inquilino = inqPrimary ?? (personaId ? allInquilinos.find(i => i.persona_id === personaId) : undefined);

  const persona = propietario ?? inquilino;

  const dataPropietario = useMemo(() => {
    if (!propietario) return null;
    const props = allProps.filter(p => p.propietario_id === propietario.id);
    const cts = contratos.filter(c => c.propietario_id === propietario.id);
    const liqs = liquidaciones.filter(l => {
      const ct = contratos.find(c => c.id === l.contrato_id);
      return ct?.propietario_id === propietario.id;
    });
    const netoPendiente = liqs.filter(l => l.estado === 'Cobrada').reduce((s, l) => s + l.neto_propietario, 0);
    return { props, cts, liqs, netoPendiente };
  }, [propietario, allProps, contratos, liquidaciones]);

  const dataInquilino = useMemo(() => {
    if (!inquilino) return null;
    const ct = contratos.find(c => c.inquilino_id === inquilino.id && (c.estado === 'Activo' || c.estado === 'Por vencer'));
    const allCts = contratos.filter(c => c.inquilino_id === inquilino.id);
    const prop = ct ? findById(allProps, ct.propiedad_id) : undefined;
    const liqs = liquidaciones.filter(l => allCts.some(c => c.id === l.contrato_id));
    const pagos = allPagos.filter(p => allCts.some(c => c.id === p.contrato_id));
    const deuda = liqs.reduce((s, l) => s + l.pendiente, 0);
    return { ct, allCts, prop, liqs, pagos, deuda };
  }, [inquilino, contratos, allProps, liquidaciones, allPagos]);

  if ((rol === 'propietario' && lpP) || (rol === 'inquilino' && liP)) {
    return <div className="p-8"><Skeleton className="h-64" /></div>;
  }
  if (!persona) {
    return <div className="p-8 text-center text-muted-foreground">Persona no encontrada</div>;
  }

  const roles: ('propietario' | 'inquilino')[] = [];
  if (propietario) roles.push('propietario');
  if (inquilino) roles.push('inquilino');

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/personas')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver
      </Button>

      {/* Cabecera */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {persona.nombre}
              {roles.map(r => (
                <Badge
                  key={r}
                  variant="secondary"
                  className={r === 'propietario' ? 'bg-status-info/10 text-status-info' : 'bg-primary/10 text-primary'}
                >
                  {r === 'propietario' ? 'Propietario' : 'Inquilino'}
                </Badge>
              ))}
            </h1>
            <p className="text-sm text-muted-foreground">
              {persona.email || '—'}
              {persona.telefono ? ` · ${persona.telefono}` : ''}
              {persona.dni ? ` · DNI ${persona.dni}` : ''}
              {persona.cuit ? ` · CUIT ${persona.cuit}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Datos generales */}
      <Card>
        <CardHeader><CardTitle className="text-base">Datos de contacto</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-2 text-sm">
          <p><span className="text-muted-foreground">Dirección:</span> {persona.direccion || '—'}</p>
          <p><span className="text-muted-foreground">Email:</span> {persona.email || '—'}</p>
          <p><span className="text-muted-foreground">Teléfono:</span> {persona.telefono || '—'}</p>
          {persona.observaciones && (
            <p className="md:col-span-2"><span className="text-muted-foreground">Observaciones:</span> {persona.observaciones}</p>
          )}
        </CardContent>
      </Card>

      {/* Sección Propietario */}
      {propietario && dataPropietario && (
        <>
          <div className="flex items-center gap-2 pt-4">
            <Building2 className="h-5 w-5 text-status-info" />
            <h2 className="text-lg font-semibold">Como propietario</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Datos bancarios y fiscales</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Banco:</span> {propietario.banco || '—'}</p>
                <p><span className="text-muted-foreground">CBU:</span> {propietario.cbu || '—'}</p>
                <p><span className="text-muted-foreground">Alias:</span> {propietario.alias_cbu || '—'}</p>
                <p><span className="text-muted-foreground">Condición IVA:</span> {propietario.condicion_iva || '—'}</p>
                {propietario.observaciones_fiscales && (
                  <p><span className="text-muted-foreground">Obs. fiscales:</span> {propietario.observaciones_fiscales}</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Resumen</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Propiedades:</span> {dataPropietario.props.length}</p>
                <p><span className="text-muted-foreground">Contratos activos:</span> {dataPropietario.cts.filter(c => c.estado === 'Activo' || c.estado === 'Por vencer').length}</p>
                <p>
                  <span className="text-muted-foreground">Total neto pendiente:</span>{' '}
                  <strong className={dataPropietario.netoPendiente > 0 ? 'text-status-warning' : ''}>
                    {formatCurrency(dataPropietario.netoPendiente)}
                  </strong>
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Propiedades</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Dirección</TableHead><TableHead>Unidad</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
                <TableBody>
                  {dataPropietario.props.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Sin propiedades</TableCell></TableRow>
                  )}
                  {dataPropietario.props.map(p => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/propiedades/${p.id}`)}>
                      <TableCell className="font-medium">{p.direccion}</TableCell>
                      <TableCell>{p.unidad}</TableCell>
                      <TableCell><Badge variant="outline">{p.estado}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Liquidaciones generadas</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Período</TableHead><TableHead>Contrato</TableHead><TableHead>Total cobrar</TableHead><TableHead>Neto propietario</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
                <TableBody>
                  {dataPropietario.liqs.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin liquidaciones</TableCell></TableRow>
                  )}
                  {dataPropietario.liqs.map(l => {
                    const ct = contratos.find(c => c.id === l.contrato_id);
                    const bc = l.estado === 'Cobrada' || l.estado === 'Transferida'
                      ? 'bg-status-success text-status-success-foreground'
                      : l.estado === 'Pendiente'
                      ? 'bg-status-warning text-status-warning-foreground'
                      : 'bg-status-danger text-status-danger-foreground';
                    return (
                      <TableRow key={l.id} className="cursor-pointer" onClick={() => navigate(`/liquidaciones/${l.id}`)}>
                        <TableCell>{l.periodo_label}</TableCell>
                        <TableCell><Badge variant="outline">{ct?.codigo}</Badge></TableCell>
                        <TableCell>{formatCurrency(l.total_cobrar)}</TableCell>
                        <TableCell>{formatCurrency(l.neto_propietario)}</TableCell>
                        <TableCell><Badge className={bc}>{l.estado}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Sección Inquilino */}
      {inquilino && dataInquilino && (
        <>
          <div className="flex items-center gap-2 pt-4">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Como inquilino</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Contrato vigente</p>
                <p className="font-bold">{dataInquilino.ct?.codigo || '—'}</p>
                {dataInquilino.prop && <p className="text-xs text-muted-foreground">{dataInquilino.prop.direccion} {dataInquilino.prop.unidad}</p>}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Deuda actual</p>
                <p className={`text-xl font-bold ${dataInquilino.deuda > 0 ? 'text-status-danger' : 'text-status-success'}`}>
                  {formatCurrency(dataInquilino.deuda)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Garante</p>
                <p className="font-medium">{(inquilino as any).garante_nombre || (inquilino as any).garante || '—'}</p>
                <p className="text-xs text-muted-foreground">{(inquilino as any).garante_telefono || ''}</p>
              </CardContent>
            </Card>
          </div>

          {((inquilino as any).ocupacion || (inquilino as any).ingresos_declarados > 0) && (
            <Card>
              <CardHeader><CardTitle className="text-base">Datos laborales</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-2 text-sm">
                <p><span className="text-muted-foreground">Ocupación:</span> {(inquilino as any).ocupacion || '—'}</p>
                <p><span className="text-muted-foreground">Ingresos declarados:</span> {formatCurrency((inquilino as any).ingresos_declarados || 0)}</p>
                <p><span className="text-muted-foreground">Garante DNI:</span> {(inquilino as any).garante_dni || '—'}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Historial de liquidaciones</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Período</TableHead><TableHead>Total a cobrar</TableHead><TableHead>Cobrado</TableHead><TableHead>Pendiente</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
                <TableBody>
                  {dataInquilino.liqs.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin liquidaciones</TableCell></TableRow>
                  )}
                  {dataInquilino.liqs.map(l => {
                    const bc = l.estado === 'Cobrada' || l.estado === 'Transferida'
                      ? 'bg-status-success text-status-success-foreground'
                      : l.estado === 'Pendiente'
                      ? 'bg-status-warning text-status-warning-foreground'
                      : 'bg-status-danger text-status-danger-foreground';
                    return (
                      <TableRow key={l.id} className="cursor-pointer" onClick={() => navigate(`/liquidaciones/${l.id}`)}>
                        <TableCell className="font-medium">{l.periodo_label}</TableCell>
                        <TableCell>{formatCurrency(l.total_cobrar)}</TableCell>
                        <TableCell>{formatCurrency(l.total_cobrado)}</TableCell>
                        <TableCell className={l.pendiente > 0 ? 'text-status-danger font-semibold' : ''}>{formatCurrency(l.pendiente)}</TableCell>
                        <TableCell><Badge className={bc}>{l.estado}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4" /> Historial de pagos</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Monto</TableHead><TableHead>Medio</TableHead><TableHead>Referencia</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
                <TableBody>
                  {dataInquilino.pagos.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin pagos registrados</TableCell></TableRow>
                  )}
                  {dataInquilino.pagos.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{formatDate(p.fecha)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(p.monto)}</TableCell>
                      <TableCell>{p.medio_pago}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.referencia}</TableCell>
                      <TableCell><Badge className="bg-status-success text-status-success-foreground">{p.estado}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {roles.length === 0 && (
        <Card>
          <CardContent className="p-6 flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" /> Esta persona no tiene roles asignados.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
