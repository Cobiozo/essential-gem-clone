import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Download, Mail, RotateCcw } from 'lucide-react';
import { SkillsRadarChart } from './SkillsRadarChart';
import { ASSESSMENT_STEPS } from './assessmentData';
import { useToast } from '@/hooks/use-toast';

interface AssessmentSummaryProps {
  scores: Record<string, number>;
  onReset: () => void;
}

export const AssessmentSummary: React.FC<AssessmentSummaryProps> = ({ scores, onReset }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const avgScore = (totalScore / 12).toFixed(1);

  const handleDownload = async () => {
    if (!chartRef.current) return;
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = 'ocena-umiejetnosci-nm.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast({ title: 'Pobrano!', description: 'Diagram został zapisany jako PNG.' });
    } catch {
      toast({ title: 'Błąd', description: 'Nie udało się wygenerować obrazu.', variant: 'destructive' });
    }
  };

  const handleSendEmail = () => {
    if (!email) return;
    const results = ASSESSMENT_STEPS.map(
      (s) => `${s.title}: ${scores[s.key]}/10`
    ).join('\n');
    const body = `Moje wyniki Oceny Umiejętności w Network Marketingu:\n\n${results}\n\nŚrednia: ${avgScore}/10\nSuma: ${totalScore}/120`;
    const subject = 'Moje wyniki - Ocena Umiejętności NM';
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast({ title: 'Otwarto klienta e-mail', description: 'Sprawdź swoją pocztę.' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left column */}
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            🎉 Twój spersonalizowany wykres jest gotowy!
          </h1>
          <p className="text-muted-foreground">
            Przeanalizowaliśmy Twoje odpowiedzi i stworzyliśmy wykres umiejętności.
            Średnia ocena: <strong className="text-foreground">{avgScore}/10</strong>,
            suma punktów: <strong className="text-foreground">{totalScore}/120</strong>.
          </p>
        </div>

        {/* Top 3 & Bottom 3 */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-green-600 mb-2">💪 Twoje mocne strony</h3>
            {Object.entries(scores)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3)
              .map(([key, val]) => {
                const step = ASSESSMENT_STEPS.find(s => s.key === key);
                return (
                  <div key={key} className="flex justify-between text-sm py-1">
                    <span className="text-foreground truncate mr-2">{step?.title}</span>
                    <span className="font-bold text-green-600">{val}</span>
                  </div>
                );
              })}
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-red-500 mb-2">🎯 Obszary do rozwoju</h3>
            {Object.entries(scores)
              .sort(([, a], [, b]) => a - b)
              .slice(0, 3)
              .map(([key, val]) => {
                const step = ASSESSMENT_STEPS.find(s => s.key === key);
                return (
                  <div key={key} className="flex justify-between text-sm py-1">
                    <span className="text-foreground truncate mr-2">{step?.title}</span>
                    <span className="font-bold text-red-500">{val}</span>
                  </div>
                );
              })}
          </Card>
        </div>

        {/* Actions */}
        <Card className="p-5 space-y-4">
          <h3 className="font-semibold text-foreground">Zapisz swoje wyniki</h3>
          <Button onClick={handleDownload} variant="gold" className="w-full gap-2">
            <Download className="h-4 w-4" />
            Pobierz diagram (PNG)
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
              <Mail className="h-4 w-4" />
              Wyślij
            </Button>
          </div>
        </Card>

        <Button onClick={onReset} variant="ghost" className="gap-2 text-muted-foreground">
          <RotateCcw className="h-4 w-4" />
          Wypełnij test ponownie
        </Button>
      </div>

      {/* Right column — chart */}
      <div>
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2 text-center">Twoje koło umiejętności</h3>
          <div ref={chartRef} className="w-full aspect-square max-w-[500px] mx-auto bg-background p-4 rounded-xl">
            <SkillsRadarChart scores={scores} />
          </div>
        </Card>
      </div>
    </div>
  );
};
