import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useChallengeAccess } from "@/hooks/useChallengeAccess";
import { ChallengeOnboarding } from "@/components/challenge/ChallengeOnboarding";
import { ChallengeDashboard } from "@/components/challenge/ChallengeDashboard";
import { ChallengeBanner } from "@/components/challenge/ChallengeBanner";
import { useChallengeBanner } from "@/hooks/useChallengeBanner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { ChallengeParticipant, ChallengeSettings } from "@/types/challenge";

export default function ChallengePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: hasAccess, isLoading: accessLoading } = useChallengeAccess();
  const { config: bannerConfig } = useChallengeBanner();
  const [settings, setSettings] = useState<ChallengeSettings | null>(null);
  const [participant, setParticipant] = useState<ChallengeParticipant | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from("challenge_settings").select("*").eq("id", true).maybeSingle(),
      supabase.from("challenge_participants").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    setSettings(s as any);
    setParticipant(p as any);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user?.id && hasAccess) load();
    else if (!accessLoading) setLoading(false);
  }, [user?.id, hasAccess, accessLoading]);

  if (authLoading || accessLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold">Moduł niedostępny</h1>
          <p className="text-muted-foreground">
            Wyzwanie 90-dniowe jest dostępne tylko dla wybranych użytkowników. Skontaktuj się z administratorem lub liderem swojej struktury.
          </p>
        </div>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <>
      {bannerConfig.enabled && bannerConfig.image_url ? <ChallengeBanner config={bannerConfig} /> : null}
      {!participant
        ? <ChallengeOnboarding settings={settings} onJoined={load} />
        : <ChallengeDashboard settings={settings} participant={participant} />}
    </>
  );
}
