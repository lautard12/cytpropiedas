import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useGarantiasContrato, formatDate, formatCurrency, type GarantiaContrato, type TipoGarantia } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Plus, FileText, AlertTriangle, Trash2, Upload } from 'lucide-react';
import { differenceInDays } from 'date-fns';

const TIPOS: { value: TipoGarantia; label: string }[] = [
  { value: 'Propietaria', label: 'Garantía propietaria' },
  { value: 'Garante', label: 'Garante personal' },
  { value: 'Seguro_Caucion', label: 'Seguro de caución' },
  { value: 'Recibo_Sueldo', label: 'Recibo de sueldo' },
  { value: 'Otro', label: 'Otro' },
];

const ESTADO_BADGE: Record<string, string> = {
  Vigente: 'bg-status-success text-status-success-foreground',
  Vencida: 'bg-status-danger text-status-danger-foreground',
  Reemplazada: 'bg-muted text-muted-foreground',
  Anulada: 'bg-muted text-muted-foreground',
};

export function GarantiasSection({ contratoId }: { contratoId: string }) {
  const { data: garantias = [], isLoading } = useGarantiasContrato(contratoId);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const refetch = () => qc.invalidateQueries({ queryKey: ['garantias_contrato', contratoId] });

  const anular = async (g: GarantiaContrato) => {
    if (!confirm('¿Anular esta garantía?')) return;
    const { error } = await (supabase as any).from('garantias_contrato')
      .update({ estado: 'Anulada' }).eq('id', g.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Garantía anulada' }); refetch(); }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-status-success" />
            Garantías del contrato
          </CardTitle>
          <p className="text-sm text-muted-foreground">Documentación de respaldo del contrato. Se admiten múltiples garantías combinadas.</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Agregar</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Cargando...</p>
          : garantias.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay garantías cargadas para este contrato.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead>Cobertura</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {garantias.map(g => {
                  const dias = g.fecha_vencimiento ? differenceInDays(new Date(g.fecha_vencimiento), new Date()) : null;
                  const proxVenc = dias !== null && dias <= 30 && dias >= 0 && g.estado === 'Vigente';
                  return (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">
                        {TIPOS.find(t => t.value === g.tipo)?.label ?? g.tipo}
                      </TableCell>
                      <TableCell className="text-sm">
                        {g.tipo === 'Seguro_Caucion'
                          ? <>{g.aseguradora} {g.numero_poliza && <span className="text-muted-foreground">· N° {g.numero_poliza}</span>}</>
                          : g.tipo === 'Recibo_Sueldo'
                          ? <>{g.empleador || g.descripcion}</>
                          : g.descripcion || '—'}
                      </TableCell>
                      <TableCell>{g.monto_cobertura ? formatCurrency(g.monto_cobertura) : '—'}</TableCell>
                      <TableCell>
                        {g.fecha_vencimiento ? (
                          <div className="flex items-center gap-1.5">
                            {formatDate(g.fecha_vencimiento)}
                            {proxVenc && <Badge className="bg-status-warning text-status-warning-foreground text-[10px]"><AlertTriangle className="h-3 w-3 mr-0.5" />{dias}d</Badge>}
                          </div>
                        ) : <span className="text-muted-foreground">Sin vencimiento</span>}
                      </TableCell>
                      <TableCell><Badge className={ESTADO_BADGE[g.estado]}>{g.estado}</Badge></TableCell>
                      <TableCell className="text-right">
                        {g.documento_url && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={g.documento_url} target="_blank" rel="noreferrer"><FileText className="h-4 w-4" /></a>
                          </Button>
                        )}
                        {g.estado === 'Vigente' && (
                          <Button size="sm" variant="ghost" onClick={() => anular(g)}><Trash2 className="h-4 w-4" /></Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
      </CardContent>
      <GarantiaDialog open={open} onClose={() => setOpen(false)} contratoId={contratoId} onSaved={refetch} />
    </Card>
  );
}

function GarantiaDialog({ open, onClose, contratoId, onSaved }: { open: boolean; onClose: () => void; contratoId: string; onSaved: () => void }) {
  const { toast } = useToast();
  const [tipo, setTipo] = useState<TipoGarantia>('Recibo_Sueldo');
  const [descripcion, setDescripcion] = useState('');
  const [aseguradora, setAseguradora] = useState('');
  const [numeroPoliza, setNumeroPoliza] = useState('');
  const [empleador, setEmpleador] = useState('');
  const [montoCobertura, setMontoCobertura] = useState('');
  const [fechaEmision, setFechaEmision] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTipo('Recibo_Sueldo'); setDescripcion(''); setAseguradora(''); setNumeroPoliza('');
    setEmpleador(''); setMontoCobertura(''); setFechaEmision(''); setFechaVencimiento('');
    setObservaciones(''); setFile(null);
  };

  const submit = async () => {
    setSaving(true);
    try {
      let documento_url: string | null = null;
      if (file) {
        const path = `${contratoId}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from('garantias').upload(path, file);
        if (upErr) throw upErr;
        const { data } = await supabase.storage.from('garantias').createSignedUrl(path, 60 * 60 * 24 * 365);
        documento_url = data?.signedUrl ?? null;
      }
      const { error } = await (supabase as any).from('garantias_contrato').insert({
        contrato_id: contratoId,
        tipo,
        descripcion,
        aseguradora,
        numero_poliza: numeroPoliza,
        empleador,
        monto_cobertura: montoCobertura ? Number(montoCobertura) : null,
        fecha_emision: fechaEmision || null,
        fecha_vencimiento: fechaVencimiento || null,
        observaciones,
        documento_url,
        estado: 'Vigente',
      });
      if (error) throw error;
      toast({ title: 'Garantía registrada' });
      reset(); onSaved(); onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Agregar garantía</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de garantía</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoGarantia)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Monto de cobertura (opcional)</Label>
              <Input type="number" value={montoCobertura} onChange={e => setMontoCobertura(e.target.value)} />
            </div>
          </div>

          {tipo === 'Seguro_Caucion' && (
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Aseguradora</Label><Input value={aseguradora} onChange={e => setAseguradora(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>N° de póliza</Label><Input value={numeroPoliza} onChange={e => setNumeroPoliza(e.target.value)} /></div>
            </div>
          )}

          {tipo === 'Recibo_Sueldo' && (
            <div className="space-y-1.5"><Label>Empleador</Label><Input value={empleador} onChange={e => setEmpleador(e.target.value)} /></div>
          )}

          {(tipo === 'Propietaria' || tipo === 'Garante' || tipo === 'Otro') && (
            <div className="space-y-1.5"><Label>Descripción</Label><Input value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder={tipo === 'Garante' ? 'Nombre y datos del garante' : 'Detalle de la garantía'} /></div>
          )}

          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Fecha de emisión</Label><Input type="date" value={fechaEmision} onChange={e => setFechaEmision(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Fecha de vencimiento</Label><Input type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} /></div>
          </div>

          <div className="space-y-1.5">
            <Label>Documento (PDF, imagen)</Label>
            <div className="flex items-center gap-2">
              <Input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} accept=".pdf,image/*" />
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5"><Label>Observaciones</Label><Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Guardando...' : 'Guardar garantía'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
