import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Download, Mail, RotateCcw, Loader2 } from 'lucide-react';
import { SkillsRadarChart } from './SkillsRadarChart';
import { ASSESSMENT_STEPS } from './assessmentData';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AssessmentSummaryProps {
  scores: Record<string, number>;
  onReset: () => void;
}

export const AssessmentSummary: React.FC<AssessmentSummaryProps> = ({ scores, onReset }) => {
  const exportRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const avgScore = (totalScore / 12).toFixed(1);

  const sortedScores = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const top3 = sortedScores.slice(0, 3);
  const bottom3 = sortedScores.slice(-3).reverse();

  const handleDownload = async () => {
    if (!exportRef.current) return;
    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = 'ocena-umiejetnosci-nm.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast({ title: 'Pobrano!', description: 'Diagram z podsumowaniem został zapisany jako PNG.' });
    } catch {
      toast({ title: 'Błąd', description: 'Nie udało się wygenerować obrazu.', variant: 'destructive' });
    }
  };

  const handleSendEmail = async () => {
    if (!email) return;
    setSending(true);
    try {
      const results = ASSESSMENT_STEPS.map(
        (s) => `${s.title}: ${scores[s.key]}/10`
      ).join('<br/>');

      const htmlBody = `
        <h2>Twoje wyniki Oceny Umiejętności w Network Marketingu</h2>
        <p>${results}</p>
        <hr/>
        <p><strong>Średnia: ${avgScore}/10</strong></p>
        <p><strong>Suma punktów: ${totalScore}/120</strong></p>
        <h3>💪 Mocne strony</h3>
        <p>${top3.map(([key, val]) => `${ASSESSMENT_STEPS.find(s => s.key === key)?.title}: ${val}/10`).join('<br/>')}</p>
        <h3>🎯 Obszary do rozwoju</h3>
        <p>${bottom3.map(([key, val]) => `${ASSESSMENT_STEPS.find(s => s.key === key)?.title}: ${val}/10`).join('<br/>')}</p>
      `;

      const { data, error } = await supabase.functions.invoke('send-single-email', {
        body: {
          template_id: null,
          recipient_email: email,
          subject: 'Moje wyniki - Ocena Umiejętności NM',
          html_body: htmlBody,
          skip_template: true,
        },
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || 'Błąd wysyłki');

      toast({ title: 'Wysłano!', description: `Wyniki zostały wysłane na adres ${email}` });
    } catch (err: any) {
      console.error('Email send error:', err);
      toast({ title: 'Błąd', description: err.message || 'Nie udało się wysłać emaila.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Export container - visible and used for both display and PNG export */}
      <div ref={exportRef} className="bg-background p-6 rounded-xl space-y-6">
        <h2 className="text-xl font-bold text-foreground text-center">
          Ocena Umiejętności w Network Marketingu
        </h2>

        {/* Chart */}
        <div className="w-full max-w-[500px] mx-auto">
          <SkillsRadarChart scores={scores} />
        </div>

        {/* Scores grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
          {ASSESSMENT_STEPS.map((step) => (
            <div key={step.key} className="flex justify-between gap-1 px-2 py-1 rounded" style={{ backgroundColor: step.chartColor + '20' }}>
              <span className="text-foreground truncate">{step.title}</span>
              <span className="font-bold" style={{ color: step.chartColor }}>{scores[step.key]}/10</span>
            </div>
          ))}
        </div>

        {/* Summary row */}
        <div className="flex justify-center gap-8 text-sm font-semibold text-foreground">
          <span>Średnia: {avgScore}/10</span>
          <span>Suma: {totalScore}/120</span>
        </div>

        {/* Top 3 & Bottom 3 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg border border-green-200 bg-green-50/50">
            <h3 className="text-sm font-semibold text-green-600 mb-2">💪 Mocne strony</h3>
            {top3.map(([key, val]) => {
              const step = ASSESSMENT_STEPS.find(s => s.key === key);
              return (
                <div key={key} className="flex justify-between text-sm py-0.5">
                  <span className="text-foreground truncate mr-2">{step?.title}</span>
                  <span className="font-bold text-green-600">{val}</span>
                </div>
              );
            })}
          </div>
          <div className="p-3 rounded-lg border border-red-200 bg-red-50/50">
            <h3 className="text-sm font-semibold text-red-500 mb-2">🎯 Do rozwoju</h3>
            {bottom3.map(([key, val]) => {
              const step = ASSESSMENT_STEPS.find(s => s.key === key);
              return (
                <div key={key} className="flex justify-between text-sm py-0.5">
                  <span className="text-foreground truncate mr-2">{step?.title}</span>
                  <span className="font-bold text-red-500">{val}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actions (outside export area) */}
      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">Zapisz swoje wyniki</h3>
        <Button onClick={handleDownload} variant="gold" className="w-full gap-2">
          <Download className="h-4 w-4" />
          Pobierz diagram z podsumowaniem (PNG)
        </Button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground uppercase">lub wyślij na mail</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="twoj@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleSendEmail} variant="outline" disabled={!email || sending} className="gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {sending ? 'Wysyłanie...' : 'Wyślij'}
          </Button>
        </div>
      </Card>

      <Button onClick={onReset} variant="ghost" className="gap-2 text-muted-foreground">
        <RotateCcw className="h-4 w-4" />
        Wypełnij test ponownie
      </Button>
    </div>
  );
};
