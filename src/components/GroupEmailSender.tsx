import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Mail, Send, Users, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GroupEmailSenderProps {
  className?: string;
}

export const GroupEmailSender: React.FC<GroupEmailSenderProps> = ({ className }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    senderEmail: '',
    senderName: '',
    recipients: {
      client: false,
      partner: false,
      specjalista: false,
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.content.trim()) {
      toast({
        title: "Błąd",
        description: "Temat i treść wiadomości są wymagane",
        variant: "destructive",
      });
      return;
    }

    const hasRecipients = Object.values(formData.recipients).some(Boolean);
    if (!hasRecipients) {
      toast({
        title: "Błąd", 
        description: "Wybierz przynajmniej jedną grupę odbiorców",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log("Sending group email with data:", formData);
      
      const { data, error } = await supabase.functions.invoke('send-group-email', {
        body: {
          subject: formData.subject,
          content: formData.content,
          recipients: formData.recipients,
          senderEmail: formData.senderEmail || undefined,
          senderName: formData.senderName || undefined,
        }
      });

      if (error) {
        console.error("Supabase function error:", error);
        throw error;
      }

      console.log("Group email response:", data);

      toast({
        title: "Email wysłany!",
        description: `Wiadomość została pomyślnie wysłana do ${data.recipientCount} odbiorców`,
      });

      // Reset form
      setFormData({
        subject: '',
        content: '',
        senderEmail: '',
        senderName: '',
        recipients: {
          client: false,
          partner: false,
          specjalista: false,
        }
      });
      
      setIsOpen(false);

    } catch (error: any) {
      console.error("Error sending group email:", error);
      toast({
        title: "Błąd wysyłania",
        description: error.message || "Nie udało się wysłać wiadomości grupowej",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className={`gap-2 ${className}`} variant="outline">
          <Mail className="w-4 h-4" />
          Wyślij email grupowy
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Wyślij email grupowy
          </DialogTitle>
          <DialogDescription>
            Wyślij wiadomość email do wybranych grup użytkowników (Klienci, Partnerzy, Specjaliści)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sender Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Informacje o nadawcy (opcjonalne)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="senderName">Imię i nazwisko nadawcy</Label>
                  <Input
                    id="senderName"
                    placeholder="np. Jan Kowalski"
                    value={formData.senderName}
                    onChange={(e) => setFormData(prev => ({ ...prev, senderName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senderEmail">Email nadawcy</Label>
                  <Input
                    id="senderEmail"
                    type="email"
                    placeholder="nadawca@example.com"
                    value={formData.senderEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, senderEmail: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recipients Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Wybierz odbiorców</CardTitle>
              <CardDescription>
                Zaznacz grupy użytkowników, którzy mają otrzymać wiadomość
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="client"
                    checked={formData.recipients.client}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ 
                        ...prev, 
                        recipients: { ...prev.recipients, client: checked as boolean }
                      }))
                    }
                  />
                  <Label htmlFor="client" className="font-medium">
                    Klienci/Użytkownicy
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="partner"
                    checked={formData.recipients.partner}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ 
                        ...prev, 
                        recipients: { ...prev.recipients, partner: checked as boolean }
                      }))
                    }
                  />
                  <Label htmlFor="partner" className="font-medium">
                    Partnerzy
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="specjalista"
                    checked={formData.recipients.specjalista}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ 
                        ...prev, 
                        recipients: { ...prev.recipients, specjalista: checked as boolean }
                      }))
                    }
                  />
                  <Label htmlFor="specjalista" className="font-medium">
                    Specjaliści
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Content */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Treść wiadomości</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Temat wiadomości *</Label>
                <Input
                  id="subject"
                  placeholder="Wprowadź temat wiadomości..."
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Treść wiadomości *</Label>
                <div className="border rounded-md">
                  <RichTextEditor
                    value={formData.content}
                    onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                    placeholder="Napisz treść wiadomości..."
                    className="min-h-[200px]"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Użyj edytora, aby sformatować wiadomość (pogrubienie, kursywa, listy, linki, itp.)
                </p>
              </div>
            </CardContent>
          </Card>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Wysyłanie...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Wyślij email
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};