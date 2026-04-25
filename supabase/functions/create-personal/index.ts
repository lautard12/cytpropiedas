// Create new personal user (auth user + persona + role) using service role.
// Avoids the "signups disabled" restriction and keeps the current admin session intact.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', userData.user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === 'admin');
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Solo administradores pueden crear personal' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { nombre, email, password, telefono, dni, rol, sucursal_id } = body ?? {};
    if (!nombre || !email || !password || !rol) {
      return new Response(JSON.stringify({ error: 'Faltan datos obligatorios' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Crear usuario en Auth (auto-confirmado)
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email, password,
      email_confirm: true,
      user_metadata: { nombre },
    });
    if (cErr || !created.user) throw new Error(cErr?.message ?? 'No se pudo crear el usuario');
    const newUserId = created.user.id;

    // Crear persona
    const { data: persona, error: pErr } = await admin.from('personas').insert({
      nombre, email, telefono: telefono ?? '', dni: dni ?? '',
      user_id: newUserId, sucursal_id: sucursal_id || null,
    }).select().single();
    if (pErr) throw new Error(pErr.message);

    await admin.from('personas_roles').insert({ persona_id: persona.id, rol: 'personal' });
    await admin.from('user_roles').insert({ user_id: newUserId, role: rol, sucursal_id: sucursal_id || null });

    // Auditoría
    await admin.from('auditoria').insert({
      user_id: userData.user.id,
      user_email: userData.user.email ?? '',
      accion: 'crear', entidad: 'user_role', entidad_id: newUserId,
      descripcion: `Personal dado de alta: ${nombre} (${email}) — rol ${rol}`,
      datos_despues: { nombre, email, rol, sucursal_id },
    });

    return new Response(JSON.stringify({ ok: true, user_id: newUserId, persona_id: persona.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('create-personal error:', e?.message);
    return new Response(JSON.stringify({ error: e?.message ?? 'Error inesperado' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
