import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useContratos, usePropiedades, usePropietarios, useInquilinos, findById, formatCurrency } from '@/hooks/useSupabaseData';
import { ArrowLeft, Calculator, Save, Info, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { ContratoCombobox } from '@/components/ContratoCombobox';

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function buildPeriodos() {
  // 12 últimos + mes actual + 3 futuros
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let offset = 3; offset >= -12; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push({ value, label: `${MESES_ES[d.getMonth()]} ${d.getFullYear()}` });
  }
  return out;
}

export default function GenerarLiquidacion() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const { data: contratos = [], isLoading } = useContratos();
  const { data: propiedades = [] } = usePropiedades();
  const { data: propietarios = [] } = usePropietarios();
  const { data: inquilinos = [] } = useInquilinos();

  const contratosActivos = contratos.filter(c => c.estado === 'Activo' || c.estado === 'Por vencer');

  const periodos = useMemo(() => buildPeriodos(), []);
  const periodoActual = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const qpContrato = searchParams.get('contrato') || '';
  const qpPeriodo = searchParams.get('periodo') || periodoActual;
  const [contratoId, setContratoId] = useState(qpContrato);
  const [periodo, setPeriodo] = useState(qpPeriodo);
  const [alquiler, setAlquiler] = useState('');
  const [expOrdinarias, setExpOrdinarias] = useState('');
  const [expExtraordinarias, setExpExtraordinarias] = useState('');
  const [tgiMonto, setTgiMonto] = useState('');
  const [apiMonto, setApiMonto] = useState('');
  const [epeMonto, setEpeMonto] = useState('');
  const [gasMonto, setGasMonto] = useState('');
  const [aguasMonto, setAguasMonto] = useState('');
  const [seguroMonto, setSeguroMonto] = useState('');
  const [ajustes, setAjustes] = useState('');
  const [descuentos, setDescuentos] = useState('');
  const [saldoAnterior, setSaldoAnterior] = useState('');
  const [observaciones, setObservaciones] = useState('');
  type ConceptoExtra = { id: string; concepto: string; monto: string; responsable: string };
  const [extras, setExtras] = useState<ConceptoExtra[]>([]);
  const addExtra = () => setExtras(p => [...p, { id: crypto.randomUUID(), concepto: '', monto: '', responsable: 'Inquilino' }]);
  const updExtra = (id: string, patch: Partial<ConceptoExtra>) => setExtras(p => p.map(e => e.id === id ? { ...e, ...patch } : e));
  const delExtra = (id: string) => setExtras(p => p.filter(e => e.id !== id));

  const contrato = contratos.find(c => c.id === contratoId);
  const propiedad = contrato ? findById(propiedades, contrato.propiedad_id) : undefined;
  const propietario = contrato ? findById(propietarios, contrato.propietario_id) : undefined;
  const inquilino = contrato ? findById(inquilinos, contrato.inquilino_id) : undefined;

  const [ultimaLiq, setUltimaLiq] = useState<{ periodo_label: string; alquiler: number } | null>(null);

  const handleContratoChange = async (val: string) => {
    setContratoId(val);
    const ct = contratos.find(c => c.id === val);
    if (!ct) return;
    setAlquiler(String(ct.alquiler_base));
    setExpOrdinarias(''); setExpExtraordinarias(''); setTgiMonto(''); setApiMonto('');
    setEpeMonto(''); setGasMonto(''); setAguasMonto(''); setSeguroMonto('');
    setAjustes(''); setDescuentos(''); setSaldoAnterior(''); setUltimaLiq(null);

    // Últimas liquidaciones del contrato (no anuladas) — escaneamos varias
    // por si la más reciente no tiene todos los conceptos cargados.
    const { data: liqs } = await supabase
      .from('liquidaciones')
      .select('id, periodo, periodo_label, pendiente, estado')
      .eq('contrato_id', val)
      
      .order('periodo', { ascending: false })
      .limit(6);

    if (!liqs || liqs.length === 0) return;

    const ultLiq = liqs[0];
    if (Number(ultLiq.pendiente) > 0) setSaldoAnterior(String(ultLiq.pendiente));

    const ids = liqs.map(l => l.id);
    const { data: conceptos } = await supabase
      .from('conceptos_liquidacion')
      .select('liquidacion_id, concepto, monto')
      .in('liquidacion_id', ids);

    // Ordenamos conceptos por antigüedad de su liquidación (más reciente primero)
    const orden = new Map(ids.map((id, i) => [id, i]));
    const ordenados = (conceptos || []).slice().sort(
      (a, b) => (orden.get(a.liquidacion_id) ?? 99) - (orden.get(b.liquidacion_id) ?? 99)
    );

    // Para cada campo, tomamos el monto más reciente disponible (matcheo flexible)
    const tomar = (matcher: (c: string) => boolean, setter: (v: string) => void) => {
      const found = ordenados.find(c => matcher((c.concepto || '').toLowerCase().trim()));
      if (found && Number(found.monto)) setter(String(Math.abs(Number(found.monto))));
    };

    tomar(c => c.startsWith('alquiler'), setAlquiler);
    tomar(c => c.includes('expensas ord'), setExpOrdinarias);
    tomar(c => c.includes('expensas extra'), setExpExtraordinarias);
    tomar(c => c.startsWith('tgi') || c.includes('abl'), setTgiMonto);
    tomar(c => c === 'api' || c.startsWith('api '), setApiMonto);
    tomar(c => c.startsWith('epe'), setEpeMonto);
    tomar(c => c.startsWith('gas'), setGasMonto);
    tomar(c => c.startsWith('agua'), setAguasMonto);
    tomar(c => c.startsWith('seguro'), setSeguroMonto);

    setUltimaLiq({ periodo_label: ultLiq.periodo_label, alquiler: ct.alquiler_base });
  };

  // Auto-cargar contrato si vino por ?contrato=
  const autoLoadedRef = useRef(false);
  useEffect(() => {
    if (autoLoadedRef.current) return;
    if (!qpContrato) return;
    if (!contratos.length) return;
    if (!contratos.find(c => c.id === qpContrato)) return;
    autoLoadedRef.current = true;
    handleContratoChange(qpContrato);
  }, [qpContrato, contratos]);

  const nums = useMemo(() => {
    const n = (v: string) => Number(v) || 0;
    const extrasTotal = extras.reduce((s, e) => s + n(e.monto), 0);
    const subtotal = n(alquiler) + n(expOrdinarias) + n(expExtraordinarias) + n(tgiMonto) + n(apiMonto) + n(epeMonto) + n(gasMonto) + n(aguasMonto) + n(seguroMonto) + n(ajustes) - n(descuentos) + n(saldoAnterior) + extrasTotal;
    const totalCobrar = subtotal;
    const comision = contrato ? (n(alquiler) * contrato.comision_porcentaje / 100) : 0;
    const neto = totalCobrar - comision;
    return { subtotal, totalCobrar, comision, neto };
  }, [alquiler, expOrdinarias, expExtraordinarias, tgiMonto, apiMonto, epeMonto, gasMonto, aguasMonto, seguroMonto, ajustes, descuentos, saldoAnterior, extras, contrato]);

  const handleGuardar = async (estado: 'borrador' | 'pendiente') => {
    if (!contrato) return;
    setSaving(true);
    try {
      const estadoFinal = estado === 'borrador' ? 'Borrador' : 'Pendiente';
      const periodoLabel = periodos.find(p => p.value === periodo)?.label ?? periodo;
      const n = (v: string) => Number(v) || 0;

      const { data: liq, error: liqErr } = await supabase.from('liquidaciones').insert({
        contrato_id: contrato.id,
        periodo,
        periodo_label: periodoLabel,
        subtotal: nums.subtotal,
        total_cobrar: nums.totalCobrar,
        total_cobrado: 0,
        pendiente: nums.totalCobrar,
        comision_inmobiliaria: nums.comision,
        saldo_anterior: n(saldoAnterior),
        neto_propietario: nums.neto,
        estado: estadoFinal as any,
        observaciones,
      }).select().single();
      if (liqErr) throw liqErr;

      // Insert conceptos (solo los que tienen monto > 0)
      const conceptos = [
        { concepto: 'Alquiler', monto: n(alquiler), responsable: 'Inquilino' },
        { concepto: 'Expensas ordinarias', monto: n(expOrdinarias), responsable: contrato.expensas_ordinarias },
        { concepto: 'Expensas extraordinarias', monto: n(expExtraordinarias), responsable: contrato.expensas_extraordinarias },
        { concepto: 'TGI', monto: n(tgiMonto), responsable: contrato.tgi },
        { concepto: 'API', monto: n(apiMonto), responsable: contrato.api },
        { concepto: 'EPE', monto: n(epeMonto), responsable: 'Inquilino' },
        { concepto: 'Gas', monto: n(gasMonto), responsable: 'Inquilino' },
        { concepto: 'Aguas Santafesinas', monto: n(aguasMonto), responsable: 'Inquilino' },
        { concepto: 'Seguro', monto: n(seguroMonto), responsable: contrato.seguro },
        { concepto: 'Ajustes', monto: n(ajustes), responsable: 'Inquilino' },
        { concepto: 'Descuentos', monto: -n(descuentos), responsable: 'Inquilino' },
        { concepto: 'Saldo anterior', monto: n(saldoAnterior), responsable: 'Inquilino' },
        ...extras
          .filter(e => e.concepto.trim() && n(e.monto) !== 0)
          .map(e => ({ concepto: e.concepto.trim(), monto: n(e.monto), responsable: e.responsable })),
      ].filter(c => c.monto !== 0).map(c => ({ ...c, liquidacion_id: liq.id, aplica_al_inquilino: c.responsable === 'Inquilino' }));

      if (conceptos.length > 0) {
        const { error: cErr } = await supabase.from('conceptos_liquidacion').insert(conceptos);
        if (cErr) throw cErr;
      }

      queryClient.invalidateQueries({ queryKey: ['liquidaciones'] });
      queryClient.invalidateQueries({ queryKey: ['conceptos_liquidacion'] });

      toast({ title: estado === 'borrador' ? 'Borrador guardado' : 'Liquidación generada', description: `Liquidación del contrato ${contrato.codigo} — ${periodoLabel}` });
      navigate('/liquidaciones');
    } catch (err: any) {
      toast({ title: 'Error al generar liquidación', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="p-8"><Skeleton className="h-64" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Button>
      <div>
        <h1 className="text-2xl font-bold">Generar liquidación mensual</h1>
        <p className="text-muted-foreground">Generá la liquidación de un contrato vigente para un período determinado, aplicando automáticamente sus reglas.</p>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold">Contrato</Label>
                  <ContratoCombobox
                    contratos={contratosActivos as any}
                    value={contratoId}
                    onChange={handleContratoChange}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Período a liquidar</Label>
                  <Select value={periodo} onValueChange={setPeriodo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {periodos.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {contrato && (
                <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                  <p><strong>Propiedad:</strong> {propiedad?.direccion} {propiedad?.unidad}</p>
                  <p><strong>Inquilino:</strong> {inquilino?.nombre} · <strong>Propietario:</strong> {propietario?.nombre}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {contrato && (
            <Alert><Info className="h-4 w-4" /><AlertDescription>Reglas del contrato {contrato.codigo}: Comisión {contrato.comision_porcentaje}% sobre alquiler bruto · TGI: {contrato.tgi} · API: {contrato.api} · Exp. ord.: {contrato.expensas_ordinarias} · Seguro: {contrato.seguro}. El IVA s/ comisión se aplica al registrar pagos por transferencia.</AlertDescription></Alert>
          )}

          {contrato && ultimaLiq && (
            <Alert className="border-status-info/40 bg-status-info/5">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Se precargaron los montos de la última liquidación (<strong>{ultimaLiq.periodo_label}</strong>). Revisá y ajustá según las boletas reales del período.
                {contrato.tipo_ajuste && contrato.tipo_ajuste !== 'Fijo' && (
                  <> · Alquiler base del contrato: <strong>{formatCurrency(contrato.alquiler_base)}</strong>. Ajuste vigente: <strong>{contrato.tipo_ajuste} {contrato.frecuencia_ajuste}</strong> — verificá si corresponde aplicar nuevo índice.</>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Conceptos del período</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Alquiler del período ($)</Label><Input type="number" value={alquiler} onChange={e => setAlquiler(e.target.value)} /></div>
                {(!contrato || contrato.expensas_ordinarias === 'Inquilino' || contrato.expensas_ordinarias === '50%') && (
                  <div className="space-y-1.5"><Label>Expensas ordinarias ($){contrato && <Badge variant="outline" className="ml-2 text-xs">{contrato.expensas_ordinarias}</Badge>}</Label><Input type="number" value={expOrdinarias} onChange={e => setExpOrdinarias(e.target.value)} placeholder="0" /></div>
                )}
                {(!contrato || contrato.expensas_extraordinarias === 'Inquilino' || contrato.expensas_extraordinarias === '50%') && (
                  <div className="space-y-1.5"><Label>Expensas extraordinarias ($){contrato && <Badge variant="outline" className="ml-2 text-xs">{contrato.expensas_extraordinarias}</Badge>}</Label><Input type="number" value={expExtraordinarias} onChange={e => setExpExtraordinarias(e.target.value)} placeholder="0" /></div>
                )}
                {(!contrato || contrato.tgi === 'Inquilino' || contrato.tgi === '50%') && (
                  <div className="space-y-1.5"><Label>TGI ($){contrato && <Badge variant="outline" className="ml-2 text-xs">{contrato.tgi}</Badge>}</Label><Input type="number" value={tgiMonto} onChange={e => setTgiMonto(e.target.value)} placeholder="0" /></div>
                )}
                {(!contrato || contrato.api === 'Inquilino' || contrato.api === '50%') && (
                  <div className="space-y-1.5"><Label>API ($){contrato && <Badge variant="outline" className="ml-2 text-xs">{contrato.api}</Badge>}</Label><Input type="number" value={apiMonto} onChange={e => setApiMonto(e.target.value)} placeholder="0" /></div>
                )}
                <div className="space-y-1.5"><Label>EPE ($)</Label><Input type="number" value={epeMonto} onChange={e => setEpeMonto(e.target.value)} placeholder="0" /></div>
                <div className="space-y-1.5"><Label>Gas ($)</Label><Input type="number" value={gasMonto} onChange={e => setGasMonto(e.target.value)} placeholder="0" /></div>
                <div className="space-y-1.5"><Label>Aguas Santafesinas ($)</Label><Input type="number" value={aguasMonto} onChange={e => setAguasMonto(e.target.value)} placeholder="0" /></div>
                {(!contrato || contrato.seguro === 'Inquilino' || contrato.seguro === '50%') && (
                  <div className="space-y-1.5"><Label>Seguro ($){contrato && <Badge variant="outline" className="ml-2 text-xs">{contrato.seguro}</Badge>}</Label><Input type="number" value={seguroMonto} onChange={e => setSeguroMonto(e.target.value)} placeholder="0" /></div>
                )}
                <div className="space-y-1.5"><Label>Ajustes manuales ($)</Label><Input type="number" value={ajustes} onChange={e => setAjustes(e.target.value)} placeholder="0" /></div>
                <div className="space-y-1.5"><Label>Descuentos ($)</Label><Input type="number" value={descuentos} onChange={e => setDescuentos(e.target.value)} placeholder="0" /></div>
                <div className="space-y-1.5"><Label>Saldo anterior ($)</Label><Input type="number" value={saldoAnterior} onChange={e => setSaldoAnterior(e.target.value)} placeholder="0" /></div>
              </div>
              <div className="mt-4 space-y-1.5"><Label>Observaciones</Label><Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Notas sobre esta liquidación..." /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Conceptos adicionales</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Reparaciones, plomería, cerrajería, gastos puntuales del período.</p>
              </div>
              <Button variant="outline" size="sm" onClick={addExtra}><Plus className="h-4 w-4 mr-1" /> Agregar</Button>
            </CardHeader>
            <CardContent>
              {extras.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin conceptos adicionales. Usá "Agregar" para sumar gastos puntuales (ej: reparación caldera).</p>
              ) : (
                <div className="space-y-2">
                  {extras.map(e => (
                    <div key={e.id} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-6 space-y-1"><Label className="text-xs">Concepto</Label><Input value={e.concepto} onChange={ev => updExtra(e.id, { concepto: ev.target.value })} placeholder="Ej: Reparación caldera" /></div>
                      <div className="col-span-3 space-y-1"><Label className="text-xs">Monto ($)</Label><Input type="number" value={e.monto} onChange={ev => updExtra(e.id, { monto: ev.target.value })} placeholder="0" /></div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">A cargo de</Label>
                        <Select value={e.responsable} onValueChange={v => updExtra(e.id, { responsable: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Inquilino">Inquilino</SelectItem>
                            <SelectItem value="Propietario">Propietario</SelectItem>
                            <SelectItem value="50%">50% / 50%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="ghost" size="icon" className="col-span-1" onClick={() => delExtra(e.id)}><Trash2 className="h-4 w-4 text-status-danger" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>



          <div className="flex gap-3">
            <Button variant="outline" onClick={() => handleGuardar('borrador')} disabled={!contratoId || saving}><Save className="h-4 w-4 mr-1" /> Guardar borrador</Button>
            <Button onClick={() => handleGuardar('pendiente')} disabled={!contratoId || saving}><Calculator className="h-4 w-4 mr-1" /> {saving ? 'Generando...' : 'Generar liquidación'}</Button>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="sticky top-20 border-2 border-primary/20">
            <CardHeader><CardTitle className="text-base">Resumen en vivo</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b"><span className="text-muted-foreground">Total conceptos</span><span className="font-semibold">{formatCurrency(nums.subtotal)}</span></div>
              <div className="flex justify-between py-1.5 border-b"><span className="font-semibold">Total a cobrar</span><span className="font-bold text-lg">{formatCurrency(nums.totalCobrar)}</span></div>
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between py-1.5 border-b"><span className="text-muted-foreground">Comisión administración ({contrato?.comision_porcentaje || 0}%)</span><span className="font-semibold text-status-info">{formatCurrency(nums.comision)}</span></div>
              <div className="flex justify-between py-1.5 bg-muted/50 rounded px-2"><span className="font-bold">Neto a transferir al propietario</span><span className="font-bold text-status-success">{formatCurrency(nums.neto)}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
