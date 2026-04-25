import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAnularPago() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ pagoId, motivo }: { pagoId: string; motivo: string }) => {
      const { data, error } = await supabase.rpc('anular_pago', { _pago_id: pagoId, _motivo: motivo });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pagos'] });
      qc.invalidateQueries({ queryKey: ['liquidaciones'] });
      qc.invalidateQueries({ queryKey: ['eventos_contrato'] });
    },
  });
}
