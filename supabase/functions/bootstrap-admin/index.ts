// Bootstrap initial admin. Disabled by default.
// To run once: set env var BOOTSTRAP_ENABLED=true and BOOTSTRAP_ADMIN_PASSWORD,
// invoke the function, then unset both. Never returns credentials in the response.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "admin@cyt.local";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (Deno.env.get("BOOTSTRAP_ENABLED") !== "true") {
      return new Response(
        JSON.stringify({ ok: false, error: "Bootstrap disabled" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const initialPassword = Deno.env.get("BOOTSTRAP_ADMIN_PASSWORD");
    if (!initialPassword || initialPassword.length < 12) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing BOOTSTRAP_ADMIN_PASSWORD (min 12 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) throw listErr;
    let admin = list.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL);

    if (!admin) {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: initialPassword,
        email_confirm: true,
        user_metadata: { nombre: "Administrador" },
      });
      if (createErr) throw createErr;
      admin = created.user!;
    }

    const { data: central } = await supabase
      .from("sucursales").select("id").eq("es_central", true).maybeSingle();

    const { data: usuarioRow } = await supabase
      .from("usuarios").select("persona_id").eq("id", admin.id).maybeSingle();

    let personaId = usuarioRow?.persona_id ?? null;
    if (!personaId) {
      const { data: nuevaPersona, error: pErr } = await supabase
        .from("personas")
        .insert({ nombre: "Administrador", email: ADMIN_EMAIL, sucursal_id: central?.id ?? null })
        .select("id").single();
      if (pErr) throw pErr;
      personaId = nuevaPersona.id;
      await supabase.from("usuarios").update({ persona_id: personaId }).eq("id", admin.id);
    }

    await supabase.from("user_roles")
      .upsert({ user_id: admin.id, role: "admin", sucursal_id: central?.id ?? null },
              { onConflict: "user_id,role" });

    return new Response(
      JSON.stringify({ ok: true, user_id: admin.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
