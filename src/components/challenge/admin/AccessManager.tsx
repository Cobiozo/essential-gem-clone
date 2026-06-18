import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Trash2, UserPlus, Search } from "lucide-react";

interface AccessRow {
  id: string;
  user_id: string;
  granted_at: string;
  profile: { full_name: string | null; email: string | null } | null;
}

export const AccessManager = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("challenge_user_access").select("id, user_id, granted_at").order("granted_at", { ascending: false });
    const ids = (data ?? []).map((r: any) => r.user_id);
    let profiles: any[] = [];
    if (ids.length) {
      const { data: p } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      profiles = p ?? [];
    }
    const map = new Map(profiles.map((p: any) => [p.id, p]));
    setRows(((data ?? []) as any[]).map(r => ({ ...r, profile: map.get(r.user_id) ?? null })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!q.trim() || q.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(8);
      const existing = new Set(rows.map(r => r.user_id));
      setResults((data ?? []).filter((p: any) => !existing.has(p.id)));
    }, 250);
    return () => clearTimeout(t);
  }, [q, rows]);

  const grant = async (uid: string) => {
    const { error } = await (supabase.from("challenge_user_access") as any).insert({ user_id: uid, granted_by: user?.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Nadano dostęp");
    setQ(""); setResults([]);
    load();
  };

  const revoke = async (id: string) => {
    if (!confirm("Odebrać dostęp?")) return;
    const { error } = await supabase.from("challenge_user_access").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <Card className="p-4 space-y-4">
      <div>
        <h3 className="font-semibold mb-1">Nadaj dostęp do wyzwania</h3>
        <p className="text-xs text-muted-foreground mb-2">Tylko użytkownicy z dostępem zobaczą moduł w PureBox.</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Szukaj po imieniu lub email (min. 2 znaki)…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {results.length > 0 && (
          <div className="mt-2 border rounded-lg divide-y">
            {results.map((p) => (
              <button key={p.id} onClick={() => grant(p.id)} className="w-full flex items-center justify-between p-2 hover:bg-muted/50 text-left">
                <div>
                  <div className="text-sm font-medium">{p.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{p.email}</div>
                </div>
                <UserPlus className="w-4 h-4 text-primary" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-sm">Użytkownicy z dostępem</h4>
          <Badge variant="secondary">{rows.length}</Badge>
        </div>
        {loading ? <p className="text-sm text-muted-foreground">Ładuję…</p> : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak nadanych dostępów.</p>
        ) : (
          <div className="space-y-1.5">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-2 rounded border bg-muted/30">
                <div>
                  <div className="text-sm font-medium">{r.profile?.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.profile?.email ?? r.user_id}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => revoke(r.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
