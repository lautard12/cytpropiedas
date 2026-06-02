import { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, Info, Wrench } from 'lucide-react';
import {
  ConceptoLiquidacion,
  TipoImpactoConcepto,
  PagadoPorConcepto,
  formatCurrency,
} from '@/hooks/useSupabaseData';

type Responsable = 'Inquilino' | 'Propietario' | 'Compartido';
type Periodo = 'Actual' | 'ProximoPeriodo';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contratoId: string;
  /** Si está presente, el concepto se inserta en esta liquidación (Actual). */
  liquidacionId?: string;
  /** Conceptos existentes de la misma liquidación, para sugerir vínculo de compensación. */
  conceptosExistentes?: ConceptoLiquidacion[];
  /** Forzar período (cuando se carga desde una liquidación específica). */
  forzarPeriodoActual?: boolean;
}

const TIPOS_GASTO = [
  'Reparación',
  'Mantenimiento',
  'Servicio',
  'Impuesto',
  'Expensas extraordinarias',
  'Multa',
  'Otro',
];

/** Deriva el `tipo_impacto` para la PARTE del gasto correspondiente a un responsable concreto. */
function derivarImpacto(
  responsableParte: 'Inquilino' | 'Propietario',
  pagadoPor: PagadoPorConcepto
): TipoImpactoConcepto {
  if (pagadoPor === 'Pendiente') return 'informativo';
  if (responsableParte === 'Inquilino') {
    if (pagadoPor === 'Inmobiliaria') return 'cobrar_al_inquilino';
    if (pagadoPor === 'Propietario') return 'cobrar_al_inquilino'; // + reintegrar_al_propietario (par)
    return 'informativo'; // inquilino pagó lo suyo
  }
  // responsableParte === 'Propietario'
  if (pagadoPor === 'Inmobiliaria') return 'descontar_al_propietario';
  if (pagadoPor === 'Inquilino') return 'reintegrar_al_inquilino';
  return 'informativo'; // propietario pagó lo suyo
}

const ETIQUETA_IMPACTO: Record<TipoImpactoConcepto, string> = {
  cobrar_al_inquilino: 'Se le cobra al inquilino',
  descontar_al_propietario: 'Se descuenta del neto al propietario',
  reintegrar_al_inquilino: 'Se le reintegra al inquilino (resta de su cuenta)',
  reintegrar_al_propietario: 'Se reconoce a favor del propietario',
  informativo: 'Informativo (no afecta totales)',
};

export default function ConceptoGastoDialog({
  open,
  onOpenChange,
  contratoId,
  liquidacionId,
  conceptosExistentes = [],
  forzarPeriodoActual,
}: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [tipoGasto, setTipoGasto] = useState('Reparación');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [responsable, setResponsable] = useState<Responsable>('Propietario');
  const [pctInquilino, setPctInquilino] = useState('50'); // solo si Compartido
  const [pagadoPor, setPagadoPor] = useState<PagadoPorConcepto>('Inmobiliaria');
  const [periodo, setPeriodo] = useState<Periodo>('Actual');
  const [comprobanteUrl, setComprobanteUrl] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [vinculoId, setVinculoId] = useState<string>('none');

  useEffect(() => {
    if (!open) return;
    // reset
    setTipoGasto('Reparación');
    setDescripcion('');
    setMonto('');
    setResponsable('Propietario');
    setPctInquilino('50');
    setPagadoPor('Inmobiliaria');
    setPeriodo(forzarPeriodoActual ? 'Actual' : 'Actual');
    setComprobanteUrl('');
    setObservaciones('');
    setVinculoId('none');
  }, [open, forzarPeriodoActual]);

  const montoNum = Number(monto) || 0;

  // Partes derivadas según responsable
  const partes = useMemo(() => {
    const out: { responsable: 'Inquilino' | 'Propietario'; monto: number }[] = [];
    if (responsable === 'Inquilino') out.push({ responsable: 'Inquilino', monto: montoNum });
    else if (responsable === 'Propietario') out.push({ responsable: 'Propietario', monto: montoNum });
    else {
      const pct = Math.min(100, Math.max(0, Number(pctInquilino) || 0));
      const inq = Math.round((montoNum * pct) / 100);
      const prop = montoNum - inq;
      if (inq > 0) out.push({ responsable: 'Inquilino', monto: inq });
      if (prop > 0) out.push({ responsable: 'Propietario', monto: prop });
    }
    return out;
  }, [responsable, montoNum, pctInquilino]);

  const impactosPrevisualizados = useMemo(() => {
    return partes.map(p => {
      const impacto = derivarImpacto(p.responsable, pagadoPor);
      // Caso especial: inquilino-responsable + propietario-pagó → además genera reintegrar_al_propietario
      const extra =
        p.responsable === 'Inquilino' && pagadoPor === 'Propietario'
          ? ('reintegrar_al_propietario' as TipoImpactoConcepto)
          : null;
      return { ...p, impacto, extra };
    });
  }, [partes, pagadoPor]);

  // Sugerencias de vínculo: si vamos a generar un reintegro_al_inquilino, mostrar descontar_al_propietario sin vínculo
  const sugerenciasVinculo = useMemo(() => {
    const generaReintegroInquilino = impactosPrevisualizados.some(p => p.impacto === 'reintegrar_al_inquilino');
    if (!generaReintegroInquilino) return [];
    return conceptosExistentes.filter(
      c =>
        c.tipo_impacto === 'descontar_al_propietario' &&
        !conceptosExistentes.some(r => r.concepto_relacionado_id === c.id)
    );
  }, [impactosPrevisualizados, conceptosExistentes]);

  const advertenciaDoble = useMemo(() => {
    // Si genera reintegrar_al_inquilino y hay un descontar_al_propietario del mismo monto sin vínculo → avisar
    if (vinculoId !== 'none') return null;
    const generaReintegro = impactosPrevisualizados.find(p => p.impacto === 'reintegrar_al_inquilino');
    if (!generaReintegro) return null;
    const colision = conceptosExistentes.find(
      c =>
        c.tipo_impacto === 'descontar_al_propietario' &&
        Number(c.monto) === generaReintegro.monto &&
        !conceptosExistentes.some(r => r.concepto_relacionado_id === c.id)
    );
    if (!colision) return null;
    return `Ya existe un descuento al propietario por ${formatCurrency(colision.monto)} ("${colision.concepto}") sin vincular. Si registrás este reintegro sin vincularlo, podrías estar descontándole al propietario dos veces.`;
  }, [impactosPrevisualizados, conceptosExistentes, vinculoId]);

  const puedeGuardar = montoNum > 0 && descripcion.trim().length > 0 && !saving;

  async function handleGuardar() {
    if (!puedeGuardar) return;
    setSaving(true);
    try {
      const conceptoBase = descripcion.trim();
      const tipoLabel = tipoGasto;
      const periodoReal: Periodo = forzarPeriodoActual ? 'Actual' : periodo;

      // Si es ProximoPeriodo o no hay liquidación destino, va a pendientes
      if (periodoReal === 'ProximoPeriodo' || !liquidacionId) {
        // Insertar 1 fila por parte impacto
        const filas: any[] = [];
        for (const p of impactosPrevisualizados) {
          if (p.impacto === 'informativo' && !p.extra) continue;
          filas.push({
            contrato_id: contratoId,
            concepto: `${tipoLabel}: ${conceptoBase}`,
            monto: p.monto,
            tipo_impacto: p.impacto,
            pagado_por: pagadoPor,
            observaciones,
            comprobante_url: comprobanteUrl || null,
          });
          if (p.extra) {
            filas.push({
              contrato_id: contratoId,
              concepto: `${tipoLabel}: ${conceptoBase} (a favor del propietario)`,
              monto: p.monto,
              tipo_impacto: p.extra,
              pagado_por: pagadoPor,
              observaciones,
              comprobante_url: comprobanteUrl || null,
            });
          }
        }
        if (filas.length === 0) {
          toast({ title: 'Nada que guardar', description: 'El gasto quedaría como informativo. Agregalo como observación del contrato.' });
        } else {
          const { error } = await supabase.from('conceptos_pendientes_contrato' as any).insert(filas);
          if (error) throw error;
          toast({ title: 'Pendiente registrado', description: 'Se aplicará al generar la próxima liquidación.' });
        }
      } else {
        // Inserción en la liquidación actual
        // Primer pasada: insertar la parte "principal" para conseguir IDs
        const insertados: { id: string; impacto: TipoImpactoConcepto; monto: number }[] = [];
        for (const p of impactosPrevisualizados) {
          if (p.impacto === 'informativo' && !p.extra) {
            // Solo informativo → registrar evento en lugar de concepto
            await supabase.from('eventos_contrato').insert({
              contrato_id: contratoId,
              liquidacion_id: liquidacionId,
              fecha: new Date().toISOString().split('T')[0],
              tipo: 'gasto_informativo',
              categoria: 'financiero',
              descripcion: `${tipoLabel}: ${conceptoBase} — pagado por ${pagadoPor} (informativo)`,
              monto: p.monto,
              documento_url: comprobanteUrl || null,
            });
            continue;
          }

          const responsableTxt = p.responsable;
          const row: any = {
            liquidacion_id: liquidacionId,
            concepto: `${tipoLabel}: ${conceptoBase}`,
            monto: p.monto,
            responsable: responsableTxt,
            tipo_impacto: p.impacto,
            pagado_por: pagadoPor,
            periodo_impacto: 'Actual',
            comprobante_url: comprobanteUrl || null,
            observaciones,
            concepto_relacionado_id: vinculoId !== 'none' && p.impacto === 'reintegrar_al_inquilino' ? vinculoId : null,
          };
          const { data, error } = await supabase
            .from('conceptos_liquidacion')
            .insert(row)
            .select('id')
            .single();
          if (error) throw error;
          insertados.push({ id: data!.id as string, impacto: p.impacto, monto: p.monto });

          if (p.extra) {
            // Par vinculado: cobrar_al_inquilino ↔ reintegrar_al_propietario
            await supabase.from('conceptos_liquidacion').insert({
              liquidacion_id: liquidacionId,
              concepto: `${tipoLabel}: ${conceptoBase} (a favor del propietario)`,
              monto: p.monto,
              responsable: 'Propietario',
              tipo_impacto: p.extra,
              pagado_por: pagadoPor,
              periodo_impacto: 'Actual',
              comprobante_url: comprobanteUrl || null,
              observaciones,
              concepto_relacionado_id: data!.id,
            });
          }
        }
        toast({ title: 'Gasto registrado', description: `${tipoLabel}: ${conceptoBase}` });
      }

      qc.invalidateQueries({ queryKey: ['conceptos_liquidacion'] });
      qc.invalidateQueries({ queryKey: ['liquidaciones'] });
      qc.invalidateQueries({ queryKey: ['conceptos_pendientes_contrato'] });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'No se pudo registrar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> Agregar gasto / reparación</DialogTitle>
          <DialogDescription>
            Respondé las preguntas y el sistema deriva automáticamente cómo impacta en la liquidación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 1. Tipo y monto */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Tipo de gasto</Label>
              <Select value={tipoGasto} onValueChange={setTipoGasto}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_GASTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Descripción</Label>
              <Input value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Ej.: cambio de termotanque" />
            </div>
          </div>

          <div>
            <Label>Monto (siempre positivo)</Label>
            <Input type="number" min="0" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0" />
          </div>

          {/* 2. Responsable */}
          <div>
            <Label>¿A quién le corresponde pagarlo?</Label>
            <Select value={responsable} onValueChange={v => setResponsable(v as Responsable)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Inquilino">Inquilino</SelectItem>
                <SelectItem value="Propietario">Propietario</SelectItem>
                <SelectItem value="Compartido">Compartido</SelectItem>
              </SelectContent>
            </Select>
            {responsable === 'Compartido' && (
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground">% a cargo del inquilino</Label>
                <Input type="number" min="0" max="100" value={pctInquilino} onChange={e => setPctInquilino(e.target.value)} />
              </div>
            )}
          </div>

          {/* 3. Pagado por */}
          <div>
            <Label>¿Quién lo pagó o adelantó?</Label>
            <Select value={pagadoPor} onValueChange={v => setPagadoPor(v as PagadoPorConcepto)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Inmobiliaria">Inmobiliaria</SelectItem>
                <SelectItem value="Inquilino">Inquilino</SelectItem>
                <SelectItem value="Propietario">Propietario</SelectItem>
                <SelectItem value="Pendiente">Pendiente / sin definir</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 4. Período impacto */}
          {!forzarPeriodoActual && (
            <div>
              <Label>¿En qué período debe impactar?</Label>
              <Select value={periodo} onValueChange={v => setPeriodo(v as Periodo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Actual">Período actual</SelectItem>
                  <SelectItem value="ProximoPeriodo">Próximo período (queda pendiente)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 5. Comprobante + obs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Comprobante (URL)</Label>
              <Input value={comprobanteUrl} onChange={e => setComprobanteUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label>Observaciones</Label>
              <Textarea rows={2} value={observaciones} onChange={e => setObservaciones(e.target.value)} />
            </div>
          </div>

          {/* 6. Vínculo (si corresponde) */}
          {sugerenciasVinculo.length > 0 && (
            <div>
              <Label>Compensa a un gasto ya cargado (opcional)</Label>
              <Select value={vinculoId} onValueChange={setVinculoId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No vincular —</SelectItem>
                  {sugerenciasVinculo.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.concepto} · {formatCurrency(c.monto)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Vincular evita que el mismo gasto se le descuente dos veces al propietario.
              </p>
            </div>
          )}

          {/* Preview */}
          {montoNum > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1 text-sm">
                  <div className="font-medium">Impacto previsto:</div>
                  {impactosPrevisualizados.map((p, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span>
                        <Badge variant="outline" className="mr-2">{p.responsable}</Badge>
                        {ETIQUETA_IMPACTO[p.impacto]}
                      </span>
                      <span className="font-mono">{formatCurrency(p.monto)}</span>
                    </div>
                  ))}
                  {impactosPrevisualizados.some(p => p.extra) && (
                    <div className="text-xs text-muted-foreground pt-1">
                      Además se reconoce a favor del propietario el monto que el inquilino le pagó.
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {advertenciaDoble && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{advertenciaDoble}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleGuardar} disabled={!puedeGuardar}>
            {saving ? 'Guardando…' : 'Guardar gasto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
