// Admin-only CRUD on moderator role + permissions. Bypasses RLS via service role.
import { verifyAdmin, corsHeaders, jsonResponse } from "../_shared/admin-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;
  const { supabaseAdmin, userId: adminId } = auth;

  let body: any;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }

  const action = String(body?.action || "");
  const targetUserId = String(body?.user_id || "");
  if (!targetUserId) return jsonResponse({ error: "user_id required" }, 400);

  try {
    if (action === "add") {
      // upsert role
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles").select("user_id")
        .eq("user_id", targetUserId).eq("role", "moderator").maybeSingle();
      if (!existingRole) {
        const { error: roleErr } = await supabaseAdmin
          .from("user_roles").insert({ user_id: targetUserId, role: "moderator" });
        if (roleErr) return jsonResponse({ error: roleErr.message }, 400);
      }
      const modules = body?.modules && typeof body.modules === "object" ? body.modules : {};
      const { error: permErr } = await supabaseAdmin
        .from("moderator_permissions")
        .upsert({ user_id: targetUserId, modules, granted_by: adminId }, { onConflict: "user_id" });
      if (permErr) return jsonResponse({ error: permErr.message }, 400);

      await supabaseAdmin.from("admin_activity_log").insert({
        admin_user_id: adminId,
        action_type: "moderator_add",
        action_description: `Nadano rolę moderator użytkownikowi ${targetUserId}`,
        target_table: "user_roles",
        target_id: targetUserId,
        details: { modules },
      });
      return jsonResponse({ ok: true });
    }

    if (action === "update_modules") {
      const modules = body?.modules && typeof body.modules === "object" ? body.modules : {};
      const { error } = await supabaseAdmin
        .from("moderator_permissions")
        .upsert({ user_id: targetUserId, modules, granted_by: adminId }, { onConflict: "user_id" });
      if (error) return jsonResponse({ error: error.message }, 400);

      await supabaseAdmin.from("admin_activity_log").insert({
        admin_user_id: adminId,
        action_type: "moderator_update",
        action_description: `Zaktualizowano uprawnienia moderatora ${targetUserId}`,
        target_table: "moderator_permissions",
        target_id: targetUserId,
        details: { modules },
      });
      return jsonResponse({ ok: true });
    }

    if (action === "remove") {
      await supabaseAdmin.from("moderator_permissions").delete().eq("user_id", targetUserId);
      await supabaseAdmin.from("user_roles").delete()
        .eq("user_id", targetUserId).eq("role", "moderator");

      await supabaseAdmin.from("admin_activity_log").insert({
        admin_user_id: adminId,
        action_type: "moderator_remove",
        action_description: `Odebrano rolę moderator użytkownikowi ${targetUserId}`,
        target_table: "user_roles",
        target_id: targetUserId,
        details: {},
      });
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error("[admin-set-moderator]", e);
    return jsonResponse({ error: e?.message || "Server error" }, 500);
  }
});
