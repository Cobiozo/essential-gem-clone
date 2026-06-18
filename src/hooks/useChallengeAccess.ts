import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useChallengeAccess() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["challenge-access", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase.rpc("has_challenge_access", { _uid: user.id });
      if (error) {
        console.warn("[useChallengeAccess]", error);
        return false;
      }
      return !!data;
    },
  });
}
