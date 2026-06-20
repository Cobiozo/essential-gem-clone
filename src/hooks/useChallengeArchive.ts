import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ArchivedEdition {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  participants_count: number;
  completed_count: number;
  total_points_awarded: number;
  top_participants: any[];
  top_pairs: any[];
  snapshot: any;
  created_at: string;
}

export function useChallengeArchive() {
  const [editions, setEditions] = useState<ArchivedEdition[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.from("challenge_editions_archive") as any)
      .select("*")
      .order("end_date", { ascending: false });
    setEditions((data ?? []) as ArchivedEdition[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const archiveCurrent = useCallback(async () => {
    setArchiving(true);
    try {
      const { error } = await supabase.functions.invoke("challenge-archive-edition", {});
      if (error) throw error;
      await load();
    } finally {
      setArchiving(false);
    }
  }, [load]);

  return { editions, loading, archiving, refresh: load, archiveCurrent };
}
