import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Trash2, UserPlus, Search, Loader2, GraduationCap, ShieldCheck } from "lucide-react";

interface Row {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  eq_id: string | null;
  role: string | null;
  has_access: boolean;
  has_certificate: boolean;
  granted_by_role: string | null;
  granted_by_name: string | null;
  granted_at: string | null;
  access_id: string | null;
}

export const AccessManager = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [ssModuleId, setSsModuleId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    const { data: settings } = await supabase
      .from("challenge_settings")
      .select("szybki_start_module_id")
      .eq("id", true)
      .maybeSingle();
    const moduleId = (settings as any)?.szybki_start_module_id ?? null;
    setSsModuleId(moduleId);

    const { data: access } = await supabase
      .from("challenge_user_access")
      .select("id, user_id, granted_by, granted_at, granted_by_role")
      .order("granted_at", { ascending: false });

    const ids = (access ?? []).map((r: any) => r.user_id);
    const granterIds = Array.from(new Set((access ?? []).map((r: any) => r.granted_by).filter(Boolean)));

    const [profilesRes, rolesRes, certsRes, granterProfilesRes] = await Promise.all([
      ids.length
        ? supabase.from("profiles").select("user_id, first_name, last_name, email, eq_id").in("user_id", ids)
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? supabase.from("user_roles").select("user_id, role").in("user_id", ids)
        : Promise.resolve({ data: [] as any[] }),
      ids.length && moduleId
        ? supabase.from("certificates").select("user_id").eq("module_id", moduleId).in("user_id", ids)
        : Promise.resolve({ data: [] as any[] }),
      granterIds.length
        ? supabase.from("profiles").select("user_id, first_name, last_name").in("user_id", granterIds as string[])
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const profileMap = new Map<string, any>((profilesRes.data ?? []).map((p: any) => [p.user_id, p]));
    const roleMap = new Map<string, string>((rolesRes.data ?? []).map((r: any) => [r.user_id, r.role]));
    const certSet = new Set<string>((certsRes.data ?? []).map((c: any) => c.user_id));
    const granterMap = new Map<string, string>(
      (granterProfilesRes.data ?? []).map((p: any) => [
        p.user_id,
        `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "—",
      ])
    );

    const built: Row[] = (access ?? []).map((a: any) => {
      const p = profileMap.get(a.user_id);
      const isAdmin = a.granted_by_role === "admin" || !a.granted_by;
      return {
        user_id: a.user_id,
        first_name: p?.first_name ?? null,
        last_name: p?.last_name ?? null,
        email: p?.email ?? null,
        eq_id: p?.eq_id ?? null,
        role: roleMap.get(a.user_id) ?? null,
        has_access: true,
        has_certificate: certSet.has(a.user_id),
        granted_by_role: a.granted_by_role ?? "admin",
        granted_by_name: isAdmin ? "Administrator" : granterMap.get(a.granted_by) ?? "Lider",
        granted_at: a.granted_at ?? null,
        access_id: a.id,
      };
    });

    setRows(built);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!q.trim() || q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email, eq_id")
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,eq_id.ilike.%${q}%`)
        .limit(8);
      const existing = new Set(rows.map(r => r.user_id));
      setSearchResults((data ?? []).filter((p: any) => !existing.has(p.user_id)));
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q, rows]);

  const grant = async (uid: string) => {
    setSaving(uid);
    const { error } = await (supabase.from("challenge_user_access") as any).upsert({
      user_id: uid,
      granted_by: user?.id,
      granted_by_role: "admin",
    }, { onConflict: "user_id" });
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Nadano dostęp");
    setQ(""); setSearchResults([]);
    load();
  };

  const revoke = async (row: Row) => {
    if (!row.access_id) return;
    if (!confirm(`Odebrać dostęp użytkownikowi ${row.first_name ?? ""} ${row.last_name ?? ""}?`)) return;
    setSaving(row.user_id);
    const { error } = await supabase.from("challenge_user_access").delete().eq("id", row.access_id);
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Odebrano dostęp");
    load();
  };

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const s = q.toLowerCase();
    return rows.filter(r =>
      r.first_name?.toLowerCase().includes(s) ||
      r.last_name?.toLowerCase().includes(s) ||
      r.email?.toLowerCase().includes(s) ||
      r.eq_id?.toLowerCase().includes(s)
    );
  }, [rows, q]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Dostęp do Wyzwania 90-dniowego
          </CardTitle>
          <CardDescription>
            Admin może niezależnie nadać dostęp każdemu użytkownikowi. Liderzy nadają dostęp członkom swojej struktury z certyfikatem „Szybki Start". W tabeli widać, kto nadał dostęp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Szukaj po imieniu, nazwisku, email lub EQ ID (min. 2 znaki)…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {searching && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Szukam…
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="border rounded-lg divide-y">
              <div className="px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground bg-muted/30">
                Dodaj nowy dostęp
              </div>
              {searchResults.map((p) => (
                <div key={p.user_id} className="flex items-center justify-between p-3 hover:bg-muted/30">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {p.first_name} {p.last_name}
                      {p.eq_id && <span className="ml-2 text-xs text-muted-foreground">EQ: {p.eq_id}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                  </div>
                  <Button size="sm" onClick={() => grant(p.user_id)} disabled={saving === p.user_id}>
                    <UserPlus className="w-4 h-4 mr-1" />
                    Nadaj dostęp
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span>Użytkownicy z dostępem</span>
            <Badge variant="secondary">{filtered.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {q ? "Brak wyników." : "Brak nadanych dostępów."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Użytkownik</th>
                    <th className="text-left px-3 py-2">EQ ID</th>
                    <th className="text-left px-3 py-2">Email</th>
                    <th className="text-left px-3 py-2">Rola</th>
                    <th className="text-left px-3 py-2">Szybki Start</th>
                    <th className="text-left px-3 py-2">Nadane przez</th>
                    <th className="text-left px-3 py-2">Data</th>
                    <th className="text-right px-3 py-2">Akcja</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((r) => (
                    <tr key={r.user_id} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium">
                        {(r.first_name || r.last_name) ? `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{r.eq_id ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.email ?? "—"}</td>
                      <td className="px-3 py-2">
                        {r.role ? <Badge variant="outline" className="text-[10px]">{r.role}</Badge> : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {r.has_certificate ? (
                          <Badge className="bg-emerald-600/15 text-emerald-700 border-emerald-300 text-[10px]">
                            <GraduationCap className="w-3 h-3 mr-1" /> Tak
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600">
                            Brak
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={r.granted_by_role === "admin" ? "default" : "secondary"} className="text-[10px]">
                          {r.granted_by_name}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {r.granted_at ? new Date(r.granted_at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" }) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Switch checked={r.has_access} onCheckedChange={() => revoke(r)} disabled={saving === r.user_id} />
                          <Button variant="ghost" size="icon" onClick={() => revoke(r)} disabled={saving === r.user_id}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {!ssModuleId && (
        <p className="text-xs text-orange-600">
          ⚠️ W ustawieniach Wyzwania nie wybrano modułu „Szybki Start" (kolumna <code>szybki_start_module_id</code>). Liderzy nie będą mogli nadawać dostępu, dopóki to pole nie zostanie ustawione.
        </p>
      )}
    </div>
  );
};
