import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { usePropiedades, useInquilinos, usePropietarios, findById, formatCurrency } from '@/hooks/useSupabaseData';

const norm = (s: string) =>
  (s ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

interface Contrato {
  id: string;
  codigo: string;
  propiedad_id?: string | null;
  inquilino_id?: string | null;
  propietario_id?: string | null;
  estado: string;
  alquiler_base: number;
  moneda?: string;
}

interface Props {
  contratos: Contrato[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}

export function ContratoCombobox({ contratos, value, onChange, placeholder = 'Seleccionar contrato...' }: Props) {
  const [open, setOpen] = useState(false);
  const { data: propiedades = [] } = usePropiedades();
  const { data: inquilinos = [] } = useInquilinos();
  const { data: propietarios = [] } = usePropietarios();

  const items = useMemo(() => contratos.map(c => {
    const prop = findById(propiedades, c.propiedad_id);
    const inq = findById(inquilinos, c.inquilino_id);
    const own = findById(propietarios, c.propietario_id);
    const direccion = `${prop?.direccion ?? ''} ${prop?.unidad ?? ''}`.trim();
    return {
      c,
      direccion,
      inquilino: inq?.nombre ?? '',
      propietario: own?.nombre ?? '',
      search: norm(`${c.codigo} ${direccion} ${inq?.nombre ?? ''} ${own?.nombre ?? ''}`),
    };
  }), [contratos, propiedades, inquilinos, propietarios]);

  const selected = items.find(i => i.c.id === value);

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case 'Activo': return 'bg-status-success text-status-success-foreground';
      case 'Por vencer': return 'bg-status-warning text-status-warning-foreground';
      case 'Vencido': return 'bg-status-danger text-status-danger-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-auto py-2"
        >
          {selected ? (
            <span className="flex flex-col items-start text-left min-w-0">
              <span className="truncate font-medium">{selected.direccion || selected.c.codigo}</span>
              <span className="text-xs text-muted-foreground truncate">
                {selected.c.codigo}{selected.inquilino ? ` · ${selected.inquilino}` : ''}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width] min-w-[360px]" align="start">
        <Command
          filter={(itemValue, search) => {
            const item = items.find(i => i.c.id === itemValue);
            if (!item) return 0;
            return item.search.includes(norm(search)) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Buscar por código, dirección, inquilino o propietario..." />
          <div className="px-3 py-1.5 text-xs text-muted-foreground border-b">
            {items.length} contrato{items.length === 1 ? '' : 's'} disponible{items.length === 1 ? '' : 's'}
          </div>
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            <CommandGroup>
              {items.map(({ c, direccion, inquilino }) => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  onSelect={(v) => { onChange(v); setOpen(false); }}
                  className="flex items-start gap-2 py-2"
                >
                  <Check className={cn('mt-1 h-4 w-4 shrink-0', value === c.id ? 'opacity-100' : 'opacity-0')} />
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate">{direccion || c.codigo}</span>
                      <Badge className={cn('text-[10px] py-0 px-1.5 h-4', estadoBadge(c.estado))}>{c.estado}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground truncate">
                      {c.codigo}
                      {inquilino && ` · ${inquilino}`}
                      {` · ${formatCurrency(c.alquiler_base, (c.moneda as any) ?? 'ARS')}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
