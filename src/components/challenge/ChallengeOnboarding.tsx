import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ChallengeHeroBadge } from "./ChallengeHeroBadge";
import type { ChallengeSettings } from "@/types/challenge";
import { Flame, Sparkles, Calendar, Clock } from "lucide-react";

interface Props {
  settings: ChallengeSettings;
  onJoined: () => void;
}

export const ChallengeOnboarding = ({ settings, onJoined }: Props) => {
  const { user } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const accent = settings.accent_color || "#7c3aed";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const globalStart = settings.global_start_date ? new Date(settings.global_start_date + "T00:00:00") : null;
  const startInFuture = !!globalStart && globalStart > today;
  const startToday = !!globalStart && globalStart.getTime() === today.getTime();
  const startInPast = !!globalStart && globalStart < today;

  const daysUntilStart = globalStart ? Math.ceil((globalStart.getTime() - today.getTime()) / 86400000) : 0;
  const daysSinceStart = globalStart ? Math.floor((today.getTime() - globalStart.getTime()) / 86400000) + 1 : 0;

  const canJoin =
    !!globalStart &&
    (startInFuture || startToday || (startInPast && settings.allow_late_join !== false));

  const handleJoin = async () => {
    if (!user?.id || !accepted || !canJoin || !globalStart) return;
    setSaving(true);
    const { error } = await supabase.from("challenge_participants").insert({
      user_id: user.id,
      start_date: settings.global_start_date!,
      accepted_terms_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      toast.error("Nie udało się dołączyć: " + error.message);
      return;
    }
    toast.success("Dołączyłeś do wyzwania! Powodzenia 💪");
    onJoined();
  };

  const startLabel = globalStart
    ? globalStart.toLocaleDateString("pl-PL", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div
        className="relative overflow-hidden rounded-3xl p-8 md:p-12"
        style={{
          background: `linear-gradient(135deg, ${accent}, ${accent}aa 60%, hsl(var(--background)))`,
        }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
        <div className="relative space-y-4 text-white">
          <ChallengeHeroBadge accent="#fff" />
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            {settings.title}
          </h1>
          {settings.subtitle && <p className="text-lg md:text-xl opacity-90 max-w-2xl">{settings.subtitle}</p>}
          <div className="flex flex-wrap gap-3 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-sm">
              <Flame className="w-4 h-4" /> {settings.duration_days} dni
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-sm">
              <Sparkles className="w-4 h-4" /> Punkty + ranking
            </span>
          </div>
        </div>
      </div>

      <Card className="p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="p-3 rounded-xl" style={{ background: `${accent}22`, color: accent }}>
          <Calendar className="w-6 h-6" />
        </div>
        <div className="flex-1">
          {!globalStart && (
            <>
              <p className="font-semibold">Termin startu zostanie wkrótce ogłoszony</p>
              <p className="text-sm text-muted-foreground">Administrator nie ustalił jeszcze daty startu wyzwania.</p>
            </>
          )}
          {startInFuture && (
            <>
              <p className="font-semibold">Start wyzwania: {startLabel}</p>
              <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Za {daysUntilStart} {daysUntilStart === 1 ? "dzień" : "dni"} — możesz zapisać się już teraz.
              </p>
            </>
          )}
          {startToday && (
            <>
              <p className="font-semibold">Wyzwanie startuje dzisiaj!</p>
              <p className="text-sm text-muted-foreground">Dołącz i zacznij realizować zadania Dnia 1.</p>
            </>
          )}
          {startInPast && (
            <>
              <p className="font-semibold">Wyzwanie trwa — dzień {Math.min(daysSinceStart, settings.duration_days)} z {settings.duration_days}</p>
              <p className="text-sm text-muted-foreground">
                {settings.allow_late_join !== false
                  ? "Możesz dołączyć — zaczniesz od aktualnego dnia wyzwania."
                  : "Rejestracja po starcie została zamknięta przez administratora."}
              </p>
            </>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <Tabs defaultValue="instructions">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="instructions">Instrukcja</TabsTrigger>
            <TabsTrigger value="terms">Regulamin</TabsTrigger>
          </TabsList>
          <TabsContent value="instructions" className="mt-4">
            <article className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: settings.instructions_html || "<p class='text-muted-foreground'>Instrukcja zostanie wkrótce uzupełniona przez administratora.</p>" }} />
          </TabsContent>
          <TabsContent value="terms" className="mt-4">
            <article className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: settings.terms_html || "<p class='text-muted-foreground'>Regulamin zostanie wkrótce uzupełniony przez administratora.</p>" }} />
          </TabsContent>
        </Tabs>
      </Card>

      <Card className="p-6 space-y-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(!!v)} className="mt-0.5" />
          <span className="text-sm leading-relaxed">
            Akceptuję regulamin i instrukcję wyzwania. Rozumiem zasady punktowania oraz harmonogram zadań.
          </span>
        </label>
        <Button
          size="lg"
          className="w-full sm:w-auto"
          style={{ background: accent, color: "white" }}
          disabled={!accepted || saving || !canJoin}
          onClick={handleJoin}
        >
          {saving ? "Zapisuję..." : "Dołączam do wyzwania"}
        </Button>
      </Card>
    </div>
  );
};
