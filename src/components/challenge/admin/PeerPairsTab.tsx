import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Users, Shuffle, Trash2, Link as LinkIcon } from "lucide-react";

interface Participant {
  id: string;
  user_id: string;
  profile?: { first_name?: string | null; last_name?: string | null; email?: string | null; eq_id?: string | null } | null;
}

interface Pair {
  id: string;
  participant_a_id: string;
  participant_b_id: string;
  created_at: string;
}

export const PeerPairsTab = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const [pRes, prRes, profRes] = await Promise.all([
      supabase.from("challenge_participants").select("id, user_id").eq("status", "active"),
      supabase.from("challenge_peer_pairs").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, first_name, last_name, email, eq_id"),
    ]);
    const profMap = new Map((profRes.data ?? []).map((p: any) => [p.user_id, p]));
    const list = (pRes.data ?? []).map((p: any) => ({ ...p, profile: profMap.get(p.user_id) ?? null }));
    setParticipants(list);
    setPairs((prRes.data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pairedIds = new Set(pairs.flatMap(p => [p.participant_a_id, p.participant_b_id]));

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : (prev.length >= 2 ? [prev[1], id] : [...prev, id]));
  };

  const createPair = async () => {
    if (selected.length !== 2) { toast.error("Zaznacz dokładnie 2 uczestników"); return; }
    if (!user?.id) return;
    const [a, b] = selected;
    const { error } = await (supabase.from("challenge_peer_pairs") as any).insert({
      participant_a_id: a, participant_b_id: b, created_by: user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Sparowano");
    setSelected([]);
    load();
  };

  const removePair = async (id: string) => {
    if (!confirm("Usunąć tę parę?")) return;
    const { error } = await supabase.from("challenge_peer_pairs").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Usunięto");
    load();
  };

  const autoPair = async () => {
    if (!user?.id) return;
    const free = participants.filter(p => !pairedIds.has(p.id));
    if (free.length < 2) { toast.error("Za mało wolnych uczestników"); return; }
    const shuffled = [...free].sort(() => Math.random() - 0.5);
    const newPairs: any[] = [];
    for (let i = 0; i + 1 < shuffled.length; i += 2) {
      newPairs.push({ participant_a_id: shuffled[i].id, participant_b_id: shuffled[i + 1].id, created_by: user.id });
    }
    const { error } = await (supabase.from("challenge_peer_pairs") as any).insert(newPairs);
    if (error) { toast.error(error.message); return; }
    toast.success(`Utworzono ${newPairs.length} par`);
    load();
  };

  const displayName = (p?: Participant["profile"]) =>
    [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim() || p?.email || "";

  const name = (id: string) => {
    const p = participants.find(x => x.id === id);
    return displayName(p?.profile) || id.slice(0, 8);
  };

  const filtered = participants.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return displayName(p.profile).toLowerCase().includes(s) || (p.profile?.email ?? "").toLowerCase().includes(s) || (p.profile?.eq_id ?? "").toLowerCase().includes(s);
  });

  if (loading) return <div className="flex justify-center py-8"><LoadingSpinner /></div>;

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /><h3 className="font-semibold">Pary kontrolne</h3></div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={autoPair}><Shuffle className="w-3.5 h-3.5 mr-1.5" /> Auto-sparuj losowo</Button>
            <Button size="sm" onClick={createPair} disabled={selected.length !== 2}>
              <LinkIcon className="w-3.5 h-3.5 mr-1.5" /> Sparuj zaznaczonych ({selected.length}/2)
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Para wzajemnie weryfikuje swoje zadania peer-review. Admin może w każdej chwili rozparować i utworzyć inną parę.
        </p>
      </Card>

      <Card className="p-4 space-y-3">
        <h4 className="text-sm font-semibold">Istniejące pary ({pairs.length})</h4>
        {pairs.length === 0 && <p className="text-sm text-muted-foreground">Brak par. Sparuj uczestników poniżej.</p>}
        <ul className="space-y-1.5">
          {pairs.map(p => (
            <li key={p.id} className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <span>{name(p.participant_a_id)} ⇄ {name(p.participant_b_id)}</span>
              <Button size="sm" variant="ghost" onClick={() => removePair(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">Uczestnicy ({participants.length})</h4>
          <Input placeholder="Szukaj…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        </div>
        <ul className="space-y-1 max-h-[480px] overflow-y-auto">
          {filtered.map(p => {
            const isPaired = pairedIds.has(p.id);
            const isSel = selected.includes(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => !isPaired && toggle(p.id)}
                  disabled={isPaired}
                  className={`w-full flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm text-left transition ${
                    isSel ? "border-primary bg-primary/10" : isPaired ? "opacity-60" : "hover:bg-muted/50"
                  }`}
                >
                  <span>{displayName(p.profile) || p.user_id.slice(0, 8)}{p.profile?.eq_id ? <span className="text-xs text-muted-foreground ml-2">EQ {p.profile.eq_id}</span> : null}</span>
                  {isPaired ? <Badge variant="secondary">Sparowany</Badge> : isSel ? <Badge>Zaznaczony</Badge> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
};
