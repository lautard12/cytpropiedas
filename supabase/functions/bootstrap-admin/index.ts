// Bootstrap del usuario administrador inicial.
// Crea (si no existe) un usuario admin@cyt.local / lautaro con rol 'admin'
// y lo vincula a una persona con rol 'personal' en la sucursal central.
// Idempotente: se puede invocar varias veces, no duplica.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "admin@cyt.local";
const ADMIN_PASSWORD = "lautaro";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // ¿ya existe?
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) throw listErr;
    let admin = list.users.find(u => u.email?.toLowerCase() === ADMIN_EMAIL);

    if (!admin) {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { nombre: "Administrador" },
      });
      if (createErr) throw createErr;
      admin = created.user!;
    }

    // sucursal central
    const { data: central } = await supabase
      .from("sucursales").select("id").eq("es_central", true).maybeSingle();

    // persona vinculada
    const { data: existingPersona } = await supabase
      .from("personas").select("id").eq("user_id", admin.id).maybeSingle();

    let personaId = existingPersona?.id;
    if (!personaId) {
      const { data: nuevaPersona, error: pErr } = await supabase
        .from("personas")
        .insert({
          nombre: "Administrador",
          email: ADMIN_EMAIL,
          user_id: admin.id,
          sucursal_id: central?.id ?? null,
        })
        .select("id").single();
      if (pErr) throw pErr;
      personaId = nuevaPersona.id;
    }

    // rol persona = personal
    await supabase.from("personas_roles")
      .upsert({ persona_id: personaId, rol: "personal" }, { onConflict: "persona_id,rol" });

    // rol app = admin
    await supabase.from("user_roles")
      .upsert({ user_id: admin.id, role: "admin", sucursal_id: central?.id ?? null },
              { onConflict: "user_id,role" });

    return new Response(
      JSON.stringify({ ok: true, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, user_id: admin.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
