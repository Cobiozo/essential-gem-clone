import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Search, Send } from "lucide-react";
import { logShareSend } from "@/lib/challengeShareLog";

interface Contact {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  resourceId: string;
  resourceTitle?: string;
  minRecipients: number;
  onDone?: () => void;
}

export const ShareToContactsDialog = ({
  open, onOpenChange, resourceId, resourceTitle, minRecipients, onDone,
}: Props) => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !user?.id) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("team_contacts")
        .select("id, full_name, phone, email")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);
      setContacts((data ?? []) as any);
      setLoading(false);
    })();
  }, [open, user?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(c =>
      (c.full_name ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q)
    );
  }, [contacts, query]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const send = async () => {
    if (selected.size < minRecipients) {
      toast.error(`Wybierz minimum ${minRecipients} odbiorców`);
      return;
    }
    setSending(true);
    try {
      for (const recipientId of selected) {
        await logShareSend({ resourceId, recipientId, channel: "crm_contact" });
      }
      toast.success(`Wysłano do ${selected.size} odbiorców. Zadanie zostanie zaliczone w ciągu kilkudziesięciu sekund.`);
      setSelected(new Set());
      onOpenChange(false);
      onDone?.();
    } catch (e: any) {
      toast.error(e.message || "Błąd wysyłki");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Udostępnij zasób</DialogTitle>
          <DialogDescription>
            {resourceTitle && <span className="font-medium">{resourceTitle}<br /></span>}
            Wybierz minimum <strong>{minRecipients}</strong> kontaktów z Twojego CRM. Każdy unikalny odbiorca = jedno zaliczone udostępnienie.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Szukaj kontaktu..."
              className="pl-8"
            />
          </div>
          <ScrollArea className="h-72 rounded border">
            {loading ? (
              <div className="p-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Ładuję kontakty...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Brak kontaktów. Dodaj je najpierw w module Kontakty.
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map(c => (
                  <label key={c.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40">
                    <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.full_name ?? "(bez nazwy)"}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </ScrollArea>
          <p className="text-xs text-muted-foreground">
            Zaznaczono: <strong>{selected.size}</strong> / wymagane min. {minRecipients}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Anuluj</Button>
          <Button onClick={send} disabled={sending || selected.size < minRecipients}>
            {sending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
            Wyślij i zalicz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
