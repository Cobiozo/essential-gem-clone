import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Trophy, ArrowLeft } from "lucide-react";
import type { ChallengeSettings } from "@/types/challenge";
import { TasksEditor } from "@/components/challenge/admin/TasksEditor";
import { ParticipantsTable } from "@/components/challenge/admin/ParticipantsTable";
import { AccessManager } from "@/components/challenge/admin/AccessManager";
import { ChallengeStats } from "@/components/challenge/admin/ChallengeStats";
import { PeerPairsTab } from "@/components/challenge/admin/PeerPairsTab";
import { ChallengeBannerEditor } from "@/components/challenge/admin/ChallengeBannerEditor";
import { ChallengeArchivePanel } from "@/components/challenge/admin/ChallengeArchivePanel";

export default function ChallengeAdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [settings, setSettings] = useState<ChallengeSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [modules, setModules] = useState<Array<{ id: string; title: string }>>([]);


  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(!!data);
      if (data) {
        const [{ data: s }, { data: mods }] = await Promise.all([
          supabase.from("challenge_settings").select("*").eq("id", true).maybeSingle(),
          supabase.from("training_modules").select("id, title").eq("is_active", true).order("position"),
        ]);
        setSettings(s as any);
        setModules((mods ?? []) as any);
      }
    })();
  }, [user?.id]);


  if (isAdmin === null) return <div className="min-h-[60vh] flex items-center justify-center"><LoadingSpinner /></div>;
  if (!isAdmin) {
    return <div className="p-8 text-center text-muted-foreground">Brak dostępu.</div>;
  }
  if (!settings) return <div className="min-h-[60vh] flex items-center justify-center"><LoadingSpinner /></div>;

  const updateField = (k: keyof ChallengeSettings, v: any) => setSettings({ ...settings, [k]: v });

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase.from("challenge_settings") as any).update({
      title: settings.title,
      subtitle: settings.subtitle,
      terms_html: settings.terms_html,
      instructions_html: settings.instructions_html,
      banner_url: settings.banner_url,
      accent_color: settings.accent_color,
      duration_days: settings.duration_days,
      excluded_weekdays: settings.excluded_weekdays,
      ranking_visible_to_participants: settings.ranking_visible_to_participants,
      is_enabled: settings.is_enabled,
      global_start_date: settings.global_start_date,
      allow_late_join: settings.allow_late_join,
    }).eq("id", true);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Zapisano ustawienia");
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}><ArrowLeft className="w-4 h-4 mr-1" /> Admin</Button>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Wyzwanie 90-dniowe</h1>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="min-w-0">

      <Tabs defaultValue="settings">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="settings">Ustawienia</TabsTrigger>
          <TabsTrigger value="banner">Baner</TabsTrigger>
          <TabsTrigger value="tasks">Zadania</TabsTrigger>
          <TabsTrigger value="participants">Uczestnicy</TabsTrigger>
          <TabsTrigger value="pairs">Pary</TabsTrigger>
          <TabsTrigger value="access">Dostęp</TabsTrigger>
          <TabsTrigger value="stats">Statystyki</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card className="p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tytuł</Label>
                <Input value={settings.title} onChange={(e) => updateField("title", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Kolor akcentu</Label>
                <Input type="color" value={settings.accent_color} onChange={(e) => updateField("accent_color", e.target.value)} className="h-10 w-24" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Podtytuł</Label>
                <Input value={settings.subtitle ?? ""} onChange={(e) => updateField("subtitle", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>URL banera</Label>
                <Input value={settings.banner_url ?? ""} onChange={(e) => updateField("banner_url", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Czas trwania (dni)</Label>
                <Input type="number" min={1} value={settings.duration_days} onChange={(e) => updateField("duration_days", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Globalna data startu wyzwania</Label>
                <Input type="date" value={settings.global_start_date ?? ""} onChange={(e) => updateField("global_start_date", e.target.value || null)} />
                <p className="text-xs text-muted-foreground">Wszyscy uczestnicy startują tego samego dnia. Puste = brak startu.</p>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={settings.allow_late_join !== false} onCheckedChange={(v) => updateField("allow_late_join", v)} />
                <Label>Pozwól dołączać po starcie</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={settings.ranking_visible_to_participants} onCheckedChange={(v) => updateField("ranking_visible_to_participants", v)} />
                <Label>Pokaż ranking uczestnikom</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={settings.is_enabled} onCheckedChange={(v) => updateField("is_enabled", v)} />
                <Label>Moduł aktywny</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Regulamin (HTML)</Label>
              <Textarea rows={6} value={settings.terms_html} onChange={(e) => updateField("terms_html", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Instrukcja (HTML)</Label>
              <Textarea rows={6} value={settings.instructions_html} onChange={(e) => updateField("instructions_html", e.target.value)} />
            </div>
            <Button onClick={save} disabled={saving}>{saving ? "Zapisuję..." : "Zapisz"}</Button>
          </Card>
        </TabsContent>

        <TabsContent value="banner">
          <ChallengeBannerEditor />
        </TabsContent>
        <TabsContent value="tasks">
          <TasksEditor durationDays={settings.duration_days} />
        </TabsContent>
        <TabsContent value="participants">
          <ParticipantsTable />
        </TabsContent>
        <TabsContent value="pairs">
          <PeerPairsTab />
        </TabsContent>
        <TabsContent value="access">
          <AccessManager />
        </TabsContent>
        <TabsContent value="stats">
          <ChallengeStats />
        </TabsContent>
        </Tabs>
        </div>
        <aside className="hidden lg:block">
          <ChallengeArchivePanel />
        </aside>
      </div>
    </div>
  );
}
