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
import {
  contratos, getPropiedad, getPropietario, getInquilino, formatCurrency,
} from '@/data/mockData';
import { ArrowLeft, Calculator, Save, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function GenerarLiquidacion() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const contratosActivos = contratos.filter(c => c.estado === 'Activo' || c.estado === 'Por vencer');

  const [contratoId, setContratoId] = useState('');
  const [periodo, setPeriodo] = useState('2025-04');
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().split('T')[0]);

  // Montos editables
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
  const propiedad = contrato ? getPropiedad(contrato.propiedadId) : null;
  const propietario = contrato ? getPropietario(contrato.propietarioId) : null;
  const inquilino = contrato ? getInquilino(contrato.inquilinoId) : null;

  // Auto-fill when selecting contrato
  const handleContratoChange = (val: string) => {
    setContratoId(val);
    const ct = contratos.find(c => c.id === val);
    if (ct) {
      setAlquiler(String(ct.alquilerBase));
    }
  };

  // Calculations
  const nums = useMemo(() => {
    const n = (v: string) => Number(v) || 0;
    const subtotal = n(alquiler) + n(expOrdinarias) + n(expExtraordinarias) + n(tgiMonto) + n(apiMonto) + n(epeMonto) + n(gasMonto) + n(aguasMonto) + n(seguroMonto) + n(ajustes) - n(descuentos) + n(saldoAnterior);
    const ivaAmount = contrato?.reglas.iva ? subtotal * 0.21 : 0;
    const totalCobrar = subtotal + ivaAmount;
    const comision = contrato ? (n(alquiler) * contrato.reglas.comisionPorcentaje / 100) : 0;
    const neto = totalCobrar - comision;
    return { subtotal, ivaAmount, totalCobrar, comision, neto };
  }, [alquiler, expOrdinarias, expExtraordinarias, tgiMonto, apiMonto, epeMonto, gasMonto, aguasMonto, seguroMonto, ajustes, descuentos, saldoAnterior, contrato]);

  const handleGuardar = (estado: string) => {
    toast({
      title: estado === 'borrador' ? 'Borrador guardado' : 'Liquidación generada',
      description: `Liquidación del contrato ${contrato?.codigo} — ${periodo === '2025-04' ? 'Abril 2025' : periodo}`,
    });
    navigate('/liquidaciones');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver
      </Button>

      <div>
        <h1 className="text-2xl font-bold">Generar liquidación mensual</h1>
        <p className="text-muted-foreground">
          Generá la liquidación de un contrato vigente para un período determinado, aplicando automáticamente sus reglas.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Selector contrato */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold">Contrato</Label>
                  <Select value={contratoId} onValueChange={handleContratoChange}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar contrato..." /></SelectTrigger>
                    <SelectContent>
                      {contratosActivos.map(c => {
                        const p = getPropiedad(c.propiedadId);
                        return (
                          <SelectItem key={c.id} value={c.id}>
                            {c.codigo} — {p?.direccion} {p?.unidad}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Período a liquidar</Label>
                  <Select value={periodo} onValueChange={setPeriodo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025-04">Abril 2025</SelectItem>
                      <SelectItem value="2025-03">Marzo 2025</SelectItem>
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

          {/* Reglas aplicadas */}
          {contrato && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Reglas del contrato {contrato.codigo}: Comisión {contrato.reglas.comisionPorcentaje}% · IVA {contrato.reglas.iva ? 'Sí' : 'No'} · TGI: {contrato.reglas.tgi} · API: {contrato.reglas.api} · Exp. ord.: {contrato.reglas.expensasOrdinarias} · Seguro: {contrato.reglas.seguro}
              </AlertDescription>
            </Alert>
          )}

          {/* Conceptos */}
          <Card>
            <CardHeader><CardTitle className="text-base">Conceptos del período</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Alquiler del período ($)</Label>
                  <Input type="number" value={alquiler} onChange={e => setAlquiler(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Expensas ordinarias ($){contrato && <Badge variant="outline" className="ml-2 text-xs">{contrato.reglas.expensasOrdinarias}</Badge>}</Label>
                  <Input type="number" value={expOrdinarias} onChange={e => setExpOrdinarias(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>Expensas extraordinarias ($){contrato && <Badge variant="outline" className="ml-2 text-xs">{contrato.reglas.expensasExtraordinarias}</Badge>}</Label>
                  <Input type="number" value={expExtraordinarias} onChange={e => setExpExtraordinarias(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>TGI ($){contrato && <Badge variant="outline" className="ml-2 text-xs">{contrato.reglas.tgi}</Badge>}</Label>
                  <Input type="number" value={tgiMonto} onChange={e => setTgiMonto(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>API ($){contrato && <Badge variant="outline" className="ml-2 text-xs">{contrato.reglas.api}</Badge>}</Label>
                  <Input type="number" value={apiMonto} onChange={e => setApiMonto(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>EPE ($)</Label>
                  <Input type="number" value={epeMonto} onChange={e => setEpeMonto(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>Gas ($)</Label>
                  <Input type="number" value={gasMonto} onChange={e => setGasMonto(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>Aguas Santafesinas ($)</Label>
                  <Input type="number" value={aguasMonto} onChange={e => setAguasMonto(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>Seguro ($){contrato && <Badge variant="outline" className="ml-2 text-xs">{contrato.reglas.seguro}</Badge>}</Label>
                  <Input type="number" value={seguroMonto} onChange={e => setSeguroMonto(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>Ajustes manuales ($)</Label>
                  <Input type="number" value={ajustes} onChange={e => setAjustes(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>Descuentos ($)</Label>
                  <Input type="number" value={descuentos} onChange={e => setDescuentos(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>Saldo anterior ($)</Label>
                  <Input type="number" value={saldoAnterior} onChange={e => setSaldoAnterior(e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                <Label>Observaciones</Label>
                <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Notas sobre esta liquidación..." />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => handleGuardar('borrador')}>
              <Save className="h-4 w-4 mr-1" /> Guardar borrador
            </Button>
            <Button onClick={() => handleGuardar('pendiente')} disabled={!contratoId}>
              <Calculator className="h-4 w-4 mr-1" /> Generar liquidación
            </Button>
          </div>
        </div>

        {/* Sidebar - Resumen en vivo */}
        <div className="space-y-4">
          <Card className="sticky top-20 border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="text-base">Resumen en vivo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Total conceptos</span>
                <span className="font-semibold">{formatCurrency(nums.subtotal)}</span>
              </div>
              {contrato?.reglas.iva && (
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">IVA (21%)</span>
                  <span className="font-semibold">{formatCurrency(nums.ivaAmount)}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5 border-b">
                <span className="font-semibold">Total a cobrar</span>
                <span className="font-bold text-lg">{formatCurrency(nums.totalCobrar)}</span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Comisión administración ({contrato?.reglas.comisionPorcentaje || 0}%)</span>
                <span className="font-semibold text-status-info">{formatCurrency(nums.comision)}</span>
              </div>
              <div className="flex justify-between py-1.5 bg-muted/50 rounded px-2">
                <span className="font-bold">Neto a transferir al propietario</span>
                <span className="font-bold text-status-success">{formatCurrency(nums.neto)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
