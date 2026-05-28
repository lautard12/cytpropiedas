import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, Bell, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { EstadoAjuste } from '@/lib/ajustes';

type Props = {
  estado: EstadoAjuste;
  contratoId: string;
  contratoCodigo?: string;
  notificadoFecha?: string | null;
  /** Si está presente, hace stopPropagation en clicks del popover. */
  compact?: boolean;
};

export function AjusteBadge({ estado, contratoId, contratoCodigo, notificadoFecha, compact }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  if (estado.tipo === 'ninguno') return null;

  const tooltipText = `Frecuencia ${estado.frecuencia.toLowerCase()} · ciclo cada ${estado.mesesCiclo} meses · base ${new Date(estado.fechaBase).toLocaleDateString('es-AR')}${estado.indice ? ` · índice ${estado.indice}` : ''}`;

  if (estado.tipo === 'aplicar') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="bg-status-danger/10 text-status-danger border-status-danger/30 gap-1">
              <AlertTriangle className="h-3 w-3" />
              Aplicar aumento
            </Badge>
          </TooltipTrigger>
          <TooltipContent>{tooltipText}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // tipo === 'preavisar'
  if (notificadoFecha) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="bg-status-success/10 text-status-success border-status-success/30 gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Aviso enviado
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            Propietario notificado el {new Date(notificadoFecha).toLocaleDateString('es-AR')} del ajuste de {estado.periodoAjusteLabel}.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const registrarPreaviso = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('eventos_contrato').insert({
        contrato_id: contratoId,
        periodo: estado.periodoAjuste,
        fecha: new Date().toISOString().slice(0, 10),
        tipo: 'preaviso_ajuste',
        categoria: 'contractual',
        descripcion: `Propietario notificado del ajuste de ${estado.periodoAjusteLabel}${contratoCodigo ? ` (contrato ${contratoCodigo})` : ''}.`,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['eventos_contrato'] });
      toast({ title: 'Aviso registrado', description: `Quedó asentado el preaviso del ajuste de ${estado.periodoAjusteLabel}.` });
      setOpen(false);
    } catch (err: any) {
      toast({ title: 'Error al registrar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => { if (compact) e.stopPropagation(); }}
          className="cursor-pointer"
        >
          <Badge variant="outline" className="bg-status-info/10 text-status-info border-status-info/30 gap-1 hover:bg-status-info/20">
            <Bell className="h-3 w-3" />
            Avisar aumento de {estado.periodoAjusteLabel.split(' ')[0]}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-sm">Aumento próximo período</p>
            <p className="text-xs text-muted-foreground mt-1">
              Este contrato ajusta en <strong>{estado.periodoAjusteLabel}</strong> ({estado.frecuencia.toLowerCase()}). Avisale al propietario antes de cerrar el mes.
            </p>
          </div>
          <Button size="sm" className="w-full" disabled={saving} onClick={registrarPreaviso}>
            {saving ? 'Registrando...' : 'Marcar como notificado'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
