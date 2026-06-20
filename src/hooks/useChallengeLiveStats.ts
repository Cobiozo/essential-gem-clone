import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TopIndividual {
  participant_id: string;
  user_id: string;
  full_name: string;
  total_points: number;
  current_streak: number;
}

export interface TopPair {
  pair_id: string;
  a: { participant_id: string; full_name: string; total_points: number } | null;
  b: { participant_id: string; full_name: string; total_points: number } | null;
  combined: number;
}

export interface ChallengeLiveStats {
  participantsCount: number;
  topIndividuals: TopIndividual[];
  topPairs: TopPair[];
  loading: boolean;
  refresh: () => void;
}

export function useChallengeLiveStats(limit = 5): ChallengeLiveStats {
  const [participantsCount, setCount] = useState(0);
  const [topIndividuals, setTopIndividuals] = useState<TopIndividual[]>([]);
  const [topPairs, setTopPairs] = useState<TopPair[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: parts } = await supabase
      .from("challenge_participants")
      .select("id, user_id, total_points, current_streak, status")
      .in("status", ["active", "completed"]);
    const all = (parts ?? []) as any[];
    setCount(all.length);

    const userIds = all.map(p => p.user_id);
    let profilesMap = new Map<string, string>();
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);
      profilesMap = new Map(
        (profs ?? []).map((p: any) => [
          p.user_id,
          [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || "—",
        ]),
      );
    }

    const indiv = [...all]
      .sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0))
      .slice(0, limit)
      .map(p => ({
        participant_id: p.id,
        user_id: p.user_id,
        full_name: profilesMap.get(p.user_id) ?? "—",
        total_points: p.total_points ?? 0,
        current_streak: p.current_streak ?? 0,
      }));
    setTopIndividuals(indiv);

    const partsById = new Map(all.map(p => [p.id, p]));
    const { data: pairs } = await supabase
      .from("challenge_peer_pairs")
      .select("id, participant_a_id, participant_b_id");
    const pairRows: TopPair[] = ((pairs ?? []) as any[])
      .map(pr => {
        const a = partsById.get(pr.participant_a_id);
        const b = partsById.get(pr.participant_b_id);
        return {
          pair_id: pr.id,
          a: a ? { participant_id: a.id, full_name: profilesMap.get(a.user_id) ?? "—", total_points: a.total_points ?? 0 } : null,
          b: b ? { participant_id: b.id, full_name: profilesMap.get(b.user_id) ?? "—", total_points: b.total_points ?? 0 } : null,
          combined: (a?.total_points ?? 0) + (b?.total_points ?? 0),
        };
      })
      .sort((x, y) => y.combined - x.combined)
      .slice(0, limit);
    setTopPairs(pairRows);
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    load();
    let t: any;
    const channel = supabase
      .channel("challenge-live-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "challenge_participants" }, () => {
        clearTimeout(t);
        t = setTimeout(load, 1000);
      })
      .subscribe();
    return () => {
      clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { participantsCount, topIndividuals, topPairs, loading, refresh: load };
}
