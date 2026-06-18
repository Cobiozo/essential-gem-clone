import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ChallengeHeroBadge } from "./ChallengeHeroBadge";
import type { ChallengeSettings } from "@/types/challenge";
import { Flame, Sparkles } from "lucide-react";

interface Props {
  settings: ChallengeSettings;
  onJoined: () => void;
}

export const ChallengeOnboarding = ({ settings, onJoined }: Props) => {
  const { user } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const accent = settings.accent_color || "#7c3aed";

  const handleJoin = async () => {
    if (!user?.id || !accepted) return;
    setSaving(true);
    const { error } = await supabase.from("challenge_participants").insert({
      user_id: user.id,
      start_date: startDate,
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
        <div className="space-y-2">
          <Label htmlFor="start_date">Data startu</Label>
          <Input id="start_date" type="date" value={startDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setStartDate(e.target.value)} className="max-w-xs" />
          <p className="text-xs text-muted-foreground">Możesz wystartować dziś lub przesunąć start na kolejny dzień.</p>
        </div>
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
          disabled={!accepted || saving}
          onClick={handleJoin}
        >
          {saving ? "Zapisuję..." : "Dołączam do wyzwania"}
        </Button>
      </Card>
    </div>
  );
};
