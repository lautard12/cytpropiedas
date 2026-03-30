import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePropiedades, usePropietarios, useInquilinos, findById, formatCurrency } from '@/hooks/useSupabaseData';
import { ArrowLeft, ArrowRight, Check, Building2, Users, FileText, Settings, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const PASOS = [
  { label: 'Propiedad', icon: Building2 },
  { label: 'Partes', icon: Users },
  { label: 'Datos generales', icon: FileText },
  { label: 'Reglas', icon: Settings },
  { label: 'Confirmación', icon: CheckCircle },
];

type Responsable = 'Inquilino' | 'Propietario' | '50%' | 'No aplica';

export default function NuevoContrato() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [paso, setPaso] = useState(0);

  const { data: propiedades = [], isLoading: loadingP } = usePropiedades();
  const { data: propietarios = [], isLoading: loadingO } = usePropietarios();
  const { data: inquilinos = [], isLoading: loadingI } = useInquilinos();

  const [propiedadId, setPropiedadId] = useState('');
  const [propietarioId, setPropietarioId] = useState('');
  const [inquilinoId, setInquilinoId] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [alquilerBase, setAlquilerBase] = useState('');
  const [diaVencimiento, setDiaVencimiento] = useState('10');
  const [tipoAjuste, setTipoAjuste] = useState('ICL (Índice Casa Propia)');
  const [frecuenciaAjuste, setFrecuenciaAjuste] = useState('Trimestral');
  const [comision, setComision] = useState('10');
  const [iva, setIva] = useState(false);
  const [tgi, setTgi] = useState<Responsable>('Inquilino');
  const [api, setApi] = useState<Responsable>('Inquilino');
  const [expOrdinarias, setExpOrdinarias] = useState<Responsable>('Inquilino');
  const [expExtraordinarias, setExpExtraordinarias] = useState<Responsable>('Propietario');
  const [seguro, setSeguro] = useState<Responsable>('Inquilino');
  const [servicios, setServicios] = useState<Responsable>('Inquilino');
  const [observaciones, setObservaciones] = useState('');

  const propiedad = findById(propiedades, propiedadId);
  const propietario = findById(propietarios, propietarioId);
  const inquilino = findById(inquilinos, inquilinoId);

  const handlePropiedadChange = (val: string) => {
    setPropiedadId(val);
    const prop = findById(propiedades, val);
    if (prop?.propietario_id) setPropietarioId(prop.propietario_id);
  };

  const canNext = () => {
    switch (paso) {
      case 0: return !!propiedadId;
      case 1: return !!propietarioId && !!inquilinoId;
      case 2: return !!fechaInicio && !!fechaFin && !!alquilerBase;
      default: return true;
    }
  };

  const handleSubmit = () => {
    toast({ title: 'Contrato creado', description: 'El contrato fue registrado exitosamente.' });
    navigate('/contratos');
  };

  const ResponsableSelect = ({ value, onChange, label }: { value: Responsable; onChange: (v: Responsable) => void; label: string }) => (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as Responsable)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="Inquilino">Inquilino</SelectItem>
          <SelectItem value="Propietario">Propietario</SelectItem>
          <SelectItem value="50%">50% cada parte</SelectItem>
          <SelectItem value="No aplica">No aplica</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  if (loadingP || loadingO || loadingI) return <div className="p-8"><Skeleton className="h-64" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Button>
      <h1 className="text-2xl font-bold">Nuevo Contrato</h1>

      <div className="flex items-center gap-2">
        {PASOS.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all', i === paso ? 'bg-primary text-primary-foreground' : i < paso ? 'bg-status-success text-status-success-foreground' : 'bg-muted text-muted-foreground')}>
              {i < paso ? <Check className="h-3 w-3" /> : <p.icon className="h-3 w-3" />}
              <span className="hidden sm:inline">{p.label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </div>
            {i < PASOS.length - 1 && <div className={cn('h-px w-6', i < paso ? 'bg-status-success' : 'bg-border')} />}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          {paso === 0 && (
            <div className="space-y-4">
              <CardTitle className="text-lg">Seleccionar propiedad / unidad</CardTitle>
              <Select value={propiedadId} onValueChange={handlePropiedadChange}>
                <SelectTrigger><SelectValue placeholder="Elegir propiedad..." /></SelectTrigger>
                <SelectContent>
                  {propiedades.map(p => <SelectItem key={p.id} value={p.id}>{p.direccion} — {p.unidad} ({p.tipo})</SelectItem>)}
                </SelectContent>
              </Select>
              {propiedad && (
                <div className="rounded-md bg-muted p-4 text-sm space-y-1">
                  <p><strong>{propiedad.direccion} — {propiedad.unidad}</strong></p>
                  <p>Tipo: {propiedad.tipo} · {propiedad.metros} m² · {propiedad.ambientes} amb.</p>
                  <p>Propietario: {findById(propietarios, propiedad.propietario_id)?.nombre}</p>
                  <p>Estado: <Badge variant="outline">{propiedad.estado}</Badge></p>
                </div>
              )}
            </div>
          )}

          {paso === 1 && (
            <div className="space-y-4">
              <CardTitle className="text-lg">Partes involucradas</CardTitle>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Propietario</Label><Select value={propietarioId} onValueChange={setPropietarioId}><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger><SelectContent>{propietarios.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5"><Label>Inquilino</Label><Select value={inquilinoId} onValueChange={setInquilinoId}><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger><SelectContent>{inquilinos.map(i => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)}</SelectContent></Select></div>
              </div>
            </div>
          )}

          {paso === 2 && (
            <div className="space-y-4">
              <CardTitle className="text-lg">Datos generales del contrato</CardTitle>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Fecha de inicio</Label><Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Fecha de fin</Label><Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Alquiler base ($)</Label><Input type="number" value={alquilerBase} onChange={e => setAlquilerBase(e.target.value)} placeholder="450000" /></div>
                <div className="space-y-1.5"><Label>Día de vencimiento mensual</Label><Input type="number" value={diaVencimiento} onChange={e => setDiaVencimiento(e.target.value)} min="1" max="28" /></div>
                <div className="space-y-1.5"><Label>Tipo de ajuste</Label><Select value={tipoAjuste} onValueChange={setTipoAjuste}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ICL (Índice Casa Propia)">ICL (Índice Casa Propia)</SelectItem><SelectItem value="IPC (INDEC)">IPC (INDEC)</SelectItem><SelectItem value="Acuerdo de partes">Acuerdo de partes</SelectItem></SelectContent></Select></div>
                <div className="space-y-1.5"><Label>Frecuencia de ajuste</Label><Select value={frecuenciaAjuste} onValueChange={setFrecuenciaAjuste}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Trimestral">Trimestral</SelectItem><SelectItem value="Semestral">Semestral</SelectItem><SelectItem value="Anual">Anual</SelectItem></SelectContent></Select></div>
              </div>
            </div>
          )}

          {paso === 3 && (
            <div className="space-y-4">
              <CardTitle className="text-lg">Configurar reglas del contrato</CardTitle>
              <p className="text-sm text-muted-foreground">Estos parámetros definen cómo se calculará cada liquidación mensual de este contrato.</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Comisión inmobiliaria (%)</Label><Input type="number" value={comision} onChange={e => setComision(e.target.value)} min="0" max="100" /></div>
                <div className="flex items-center gap-3 rounded-md border p-3"><Switch checked={iva} onCheckedChange={setIva} /><Label>Aplicar IVA (21%)</Label></div>
                <ResponsableSelect label="TGI (Tasa General de Inmuebles)" value={tgi} onChange={setTgi} />
                <ResponsableSelect label="API (Administración Provincial de Impuestos)" value={api} onChange={setApi} />
                <ResponsableSelect label="Expensas ordinarias" value={expOrdinarias} onChange={setExpOrdinarias} />
                <ResponsableSelect label="Expensas extraordinarias" value={expExtraordinarias} onChange={setExpExtraordinarias} />
                <ResponsableSelect label="Seguro" value={seguro} onChange={setSeguro} />
                <ResponsableSelect label="Servicios (EPE, gas, agua)" value={servicios} onChange={setServicios} />
              </div>
              <div className="space-y-1.5"><Label>Observaciones especiales</Label><Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Notas adicionales sobre este contrato..." /></div>
            </div>
          )}

          {paso === 4 && (
            <div className="space-y-4">
              <CardTitle className="text-lg">Confirmación</CardTitle>
              <p className="text-sm text-muted-foreground">Revisá los datos antes de crear el contrato.</p>
              <div className="grid md:grid-cols-2 gap-4">
                <Card><CardContent className="p-4 text-sm space-y-1"><p className="font-semibold mb-2">Propiedad</p><p>{propiedad?.direccion} — {propiedad?.unidad}</p><p className="text-muted-foreground">{propiedad?.tipo}</p></CardContent></Card>
                <Card><CardContent className="p-4 text-sm space-y-1"><p className="font-semibold mb-2">Partes</p><p>Propietario: {propietario?.nombre}</p><p>Inquilino: {inquilino?.nombre}</p></CardContent></Card>
                <Card><CardContent className="p-4 text-sm space-y-1"><p className="font-semibold mb-2">Datos generales</p><p>Inicio: {fechaInicio}</p><p>Fin: {fechaFin}</p><p>Alquiler: {formatCurrency(Number(alquilerBase) || 0)}</p><p>Vencimiento: día {diaVencimiento}</p><p>Ajuste: {tipoAjuste} — {frecuenciaAjuste}</p></CardContent></Card>
                <Card><CardContent className="p-4 text-sm space-y-1"><p className="font-semibold mb-2">Reglas de liquidación</p><p>Comisión: {comision}%</p><p>IVA: {iva ? 'Sí' : 'No'}</p><p>TGI: {tgi} · API: {api}</p><p>Exp. ord.: {expOrdinarias}</p><p>Exp. ext.: {expExtraordinarias}</p><p>Seguro: {seguro} · Servicios: {servicios}</p></CardContent></Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => paso > 0 ? setPaso(paso - 1) : navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> {paso === 0 ? 'Cancelar' : 'Anterior'}
        </Button>
        {paso < 4 ? (
          <Button onClick={() => setPaso(paso + 1)} disabled={!canNext()}>Siguiente <ArrowRight className="h-4 w-4 ml-1" /></Button>
        ) : (
          <Button onClick={handleSubmit}><Check className="h-4 w-4 mr-1" /> Crear contrato</Button>
        )}
      </div>
    </div>
  );
}
