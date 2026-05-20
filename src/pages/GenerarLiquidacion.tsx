import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { ArrowLeft, Calculator, Save, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

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
  const [contratoId, setContratoId] = useState('');
  const [periodo, setPeriodo] = useState(periodoActual);
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

    const { data: ultLiq } = await supabase
      .from('liquidaciones')
      .select('id, periodo_label, pendiente')
      .eq('contrato_id', val)
      .neq('estado', 'Anulada')
      .order('periodo', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!ultLiq) return;
    if (Number(ultLiq.pendiente) > 0) setSaldoAnterior(String(ultLiq.pendiente));

    const { data: conceptos } = await supabase
      .from('conceptos_liquidacion')
      .select('concepto, monto')
      .eq('liquidacion_id', ultLiq.id);

    let alqAnterior = ct.alquiler_base;
    (conceptos || []).forEach(c => {
      const m = String(Math.abs(Number(c.monto) || 0));
      switch (c.concepto) {
        case 'Alquiler': alqAnterior = Number(c.monto) || ct.alquiler_base; setAlquiler(m); break;
        case 'Expensas ordinarias': setExpOrdinarias(m); break;
        case 'Expensas extraordinarias': setExpExtraordinarias(m); break;
        case 'TGI': setTgiMonto(m); break;
        case 'API': setApiMonto(m); break;
        case 'EPE': setEpeMonto(m); break;
        case 'Gas': setGasMonto(m); break;
        case 'Aguas Santafesinas': setAguasMonto(m); break;
        case 'Seguro': setSeguroMonto(m); break;
      }
    });
    setUltimaLiq({ periodo_label: ultLiq.periodo_label, alquiler: alqAnterior });
  };

  const nums = useMemo(() => {
    const n = (v: string) => Number(v) || 0;
    const subtotal = n(alquiler) + n(expOrdinarias) + n(expExtraordinarias) + n(tgiMonto) + n(apiMonto) + n(epeMonto) + n(gasMonto) + n(aguasMonto) + n(seguroMonto) + n(ajustes) - n(descuentos) + n(saldoAnterior);
    const totalCobrar = subtotal;
    const comision = contrato ? (n(alquiler) * contrato.comision_porcentaje / 100) : 0;
    const neto = totalCobrar - comision;
    return { subtotal, totalCobrar, comision, neto };
  }, [alquiler, expOrdinarias, expExtraordinarias, tgiMonto, apiMonto, epeMonto, gasMonto, aguasMonto, seguroMonto, ajustes, descuentos, saldoAnterior, contrato]);

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
                  <Select value={contratoId} onValueChange={handleContratoChange}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar contrato..." /></SelectTrigger>
                    <SelectContent>
                      {contratosActivos.map(c => {
                        const p = findById(propiedades, c.propiedad_id);
                        return <SelectItem key={c.id} value={c.id}>{c.codigo} — {p?.direccion} {p?.unidad}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
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

          <Card>
            <CardHeader><CardTitle className="text-base">Conceptos del período</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Alquiler del período ($)</Label><Input type="number" value={alquiler} onChange={e => setAlquiler(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Expensas ordinarias ($){contrato && <Badge variant="outline" className="ml-2 text-xs">{contrato.expensas_ordinarias}</Badge>}</Label><Input type="number" value={expOrdinarias} onChange={e => setExpOrdinarias(e.target.value)} placeholder="0" /></div>
                <div className="space-y-1.5"><Label>Expensas extraordinarias ($){contrato && <Badge variant="outline" className="ml-2 text-xs">{contrato.expensas_extraordinarias}</Badge>}</Label><Input type="number" value={expExtraordinarias} onChange={e => setExpExtraordinarias(e.target.value)} placeholder="0" /></div>
                <div className="space-y-1.5"><Label>TGI ($){contrato && <Badge variant="outline" className="ml-2 text-xs">{contrato.tgi}</Badge>}</Label><Input type="number" value={tgiMonto} onChange={e => setTgiMonto(e.target.value)} placeholder="0" /></div>
                <div className="space-y-1.5"><Label>API ($){contrato && <Badge variant="outline" className="ml-2 text-xs">{contrato.api}</Badge>}</Label><Input type="number" value={apiMonto} onChange={e => setApiMonto(e.target.value)} placeholder="0" /></div>
                <div className="space-y-1.5"><Label>EPE ($)</Label><Input type="number" value={epeMonto} onChange={e => setEpeMonto(e.target.value)} placeholder="0" /></div>
                <div className="space-y-1.5"><Label>Gas ($)</Label><Input type="number" value={gasMonto} onChange={e => setGasMonto(e.target.value)} placeholder="0" /></div>
                <div className="space-y-1.5"><Label>Aguas Santafesinas ($)</Label><Input type="number" value={aguasMonto} onChange={e => setAguasMonto(e.target.value)} placeholder="0" /></div>
                <div className="space-y-1.5"><Label>Seguro ($){contrato && <Badge variant="outline" className="ml-2 text-xs">{contrato.seguro}</Badge>}</Label><Input type="number" value={seguroMonto} onChange={e => setSeguroMonto(e.target.value)} placeholder="0" /></div>
                <div className="space-y-1.5"><Label>Ajustes manuales ($)</Label><Input type="number" value={ajustes} onChange={e => setAjustes(e.target.value)} placeholder="0" /></div>
                <div className="space-y-1.5"><Label>Descuentos ($)</Label><Input type="number" value={descuentos} onChange={e => setDescuentos(e.target.value)} placeholder="0" /></div>
                <div className="space-y-1.5"><Label>Saldo anterior ($)</Label><Input type="number" value={saldoAnterior} onChange={e => setSaldoAnterior(e.target.value)} placeholder="0" /></div>
              </div>
              <div className="mt-4 space-y-1.5"><Label>Observaciones</Label><Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Notas sobre esta liquidación..." /></div>
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
