import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRenovaciones, formatDate } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays } from 'date-fns';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';

const RESP_BADGE: Record<string, string> = {
  Pendiente: 'bg-status-warning text-status-warning-foreground',
  Acepta: 'bg-status-success text-status-success-foreground',
  Rechaza: 'bg-status-danger text-status-danger-foreground',
};

export function RenovacionSection({ contrato }: { contrato: any }) {
  const { data: renovaciones = [] } = useRenovaciones(contrato.id);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);

  const diasRestantes = differenceInDays(new Date(contrato.fecha_fin), new Date());
  const visible = diasRestantes <= 90 || renovaciones.length > 0;
  const activa = renovaciones.find((r: any) => r.resultado === 'Pendiente');

  if (!visible || contrato.estado !== 'Activo') return null;

  const iniciar = async () => {
    setCreating(true);
    const { error } = await (supabase as any).from('renovaciones_contrato').insert({
      contrato_id: contrato.id,
      fecha_consulta: new Date().toISOString().slice(0,10),
    });
    setCreating(false);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Consulta de renovación iniciada' }); qc.invalidateQueries({ queryKey: ['renovaciones', contrato.id] }); }
  };

  const setRespuesta = async (id: string, parte: 'propietario' | 'inquilino', valor: string) => {
    const upd: any = {};
    upd[`respuesta_${parte}`] = valor;
    upd[`fecha_respuesta_${parte}`] = new Date().toISOString().slice(0,10);
    const { error } = await (supabase as any).from('renovaciones_contrato').update(upd).eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else qc.invalidateQueries({ queryKey: ['renovaciones', contrato.id] });
  };

  const cerrar = async (id: string, resultado: 'Renovado' | 'No_Renovado') => {
    const { error } = await (supabase as any).from('renovaciones_contrato').update({ resultado }).eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: resultado === 'Renovado' ? 'Renovación registrada' : 'Marcado como no renovado' }); qc.invalidateQueries({ queryKey: ['renovaciones', contrato.id] }); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-status-info" />
          Renovación del contrato
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {diasRestantes >= 0
            ? `Quedan ${diasRestantes} días para el vencimiento. Se sugiere consultar a las partes con 90 días de anticipación.`
            : `El contrato venció hace ${Math.abs(diasRestantes)} días.`}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {!activa && (
          <Button size="sm" onClick={iniciar} disabled={creating}><RefreshCw className="h-4 w-4 mr-1" /> Iniciar consulta de renovación</Button>
        )}
        {renovaciones.map((r: any) => (
          <div key={r.id} className="rounded-md border p-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Consulta del {formatDate(r.fecha_consulta)}</span>
              <Badge variant="outline">{r.resultado}</Badge>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label2>Propietario</Label2>
                <div className="flex items-center gap-2">
                  <Badge className={RESP_BADGE[r.respuesta_propietario]}>{r.respuesta_propietario}</Badge>
                  {r.resultado === 'Pendiente' && (
                    <Select value={r.respuesta_propietario} onValueChange={(v) => setRespuesta(r.id, 'propietario', v)}>
                      <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pendiente">Pendiente</SelectItem>
                        <SelectItem value="Acepta">Acepta</SelectItem>
                        <SelectItem value="Rechaza">Rechaza</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div>
                <Label2>Inquilino</Label2>
                <div className="flex items-center gap-2">
                  <Badge className={RESP_BADGE[r.respuesta_inquilino]}>{r.respuesta_inquilino}</Badge>
                  {r.resultado === 'Pendiente' && (
                    <Select value={r.respuesta_inquilino} onValueChange={(v) => setRespuesta(r.id, 'inquilino', v)}>
                      <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pendiente">Pendiente</SelectItem>
                        <SelectItem value="Acepta">Acepta</SelectItem>
                        <SelectItem value="Rechaza">Rechaza</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>
            {r.resultado === 'Pendiente' && (
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => cerrar(r.id, 'Renovado')}><CheckCircle className="h-4 w-4 mr-1 text-status-success" /> Marcar renovado</Button>
                <Button size="sm" variant="outline" onClick={() => cerrar(r.id, 'No_Renovado')}><XCircle className="h-4 w-4 mr-1 text-status-danger" /> No renueva</Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Label2({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mb-1">{children}</p>;
}
