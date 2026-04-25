import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useSucursales } from '@/hooks/useOrganizacion';
import { logAudit } from '@/lib/audit';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function PersonalFormDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: sucursales = [] } = useSucursales();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  const [dni, setDni] = useState('');
  const [rol, setRol] = useState<'admin' | 'administrativo'>('administrativo');
  const [sucursalId, setSucursalId] = useState<string>(sucursales.find(s => s.es_central)?.id ?? '');
  const [saving, setSaving] = useState(false);

  const onSubmit = async () => {
    if (nombre.trim().length < 2 || !email.includes('@') || password.length < 6) {
      toast({ title: 'Datos incompletos', description: 'Nombre, email válido y contraseña (mín. 6) son obligatorios.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      // Signup estándar (auto-confirm activo en este proyecto)
      const { data: signUp, error: signErr } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin, data: { nombre } },
      });
      if (signErr) throw signErr;
      const newUserId = signUp.user?.id;
      if (!newUserId) throw new Error('No se obtuvo el ID del nuevo usuario.');

      // Crear persona (rol personal)
      const { data: persona, error: pErr } = await supabase.from('personas').insert({
        nombre, email, telefono, dni,
        user_id: newUserId,
        sucursal_id: sucursalId || null,
      }).select().single();
      if (pErr) throw pErr;

      await supabase.from('personas_roles').insert({ persona_id: persona.id, rol: 'personal' as any });

      // Asignar rol de aplicación
      await supabase.from('user_roles').insert({
        user_id: newUserId, role: rol, sucursal_id: sucursalId || null,
      });

      await logAudit({
        accion: 'crear', entidad: 'user_role', entidad_id: newUserId,
        descripcion: `Personal dado de alta: ${nombre} (${email}) — rol ${rol}`,
        datos_despues: { nombre, email, rol, sucursal_id: sucursalId },
      });

      qc.invalidateQueries({ queryKey: ['personal'] });
      qc.invalidateQueries({ queryKey: ['personas'] });
      toast({ title: 'Personal creado', description: `${nombre} fue dado de alta.` });
      setNombre(''); setEmail(''); setPassword(''); setTelefono(''); setDni('');
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alta de personal</DialogTitle>
          <DialogDescription>Crea el usuario del sistema y la persona vinculada en una sola acción.</DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-3 py-2">
          <div className="md:col-span-2 space-y-1"><Label>Nombre completo *</Label><Input value={nombre} onChange={e => setNombre(e.target.value)} /></div>
          <div className="space-y-1"><Label>Email *</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className="space-y-1"><Label>Contraseña inicial *</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
          <div className="space-y-1"><Label>DNI</Label><Input value={dni} onChange={e => setDni(e.target.value)} /></div>
          <div className="space-y-1"><Label>Teléfono</Label><Input value={telefono} onChange={e => setTelefono(e.target.value)} /></div>
          <div className="space-y-1">
            <Label>Rol *</Label>
            <Select value={rol} onValueChange={v => setRol(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="administrativo">Administrativo</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Sucursal</Label>
            <Select value={sucursalId} onValueChange={setSucursalId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
              <SelectContent>
                {sucursales.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre}{s.es_central ? ' (Central)' : ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={saving}>{saving ? 'Creando…' : 'Crear personal'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
