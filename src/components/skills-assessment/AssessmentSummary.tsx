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

  const generateExportImage = async (): Promise<string | null> => {
    if (!exportRef.current) return null;
    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#1a1a2e',
        scale: 2,
      });
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  };

  const handleDownload = async () => {
    const dataUrl = await generateExportImage();
    if (!dataUrl) {
      toast({ title: 'Błąd', description: 'Nie udało się wygenerować obrazu.', variant: 'destructive' });
      return;
    }
    const link = document.createElement('a');
    link.download = 'ocena-umiejetnosci-nm.png';
    link.href = dataUrl;
    link.click();
    toast({ title: 'Pobrano!', description: 'Diagram z podsumowaniem został zapisany jako PNG.' });
  };

  const handleSendEmail = async () => {
    if (!email) return;
    setSending(true);
    try {
      // Generate chart image as base64
      const chartDataUrl = await generateExportImage();

      const results = ASSESSMENT_STEPS.map(
        (s) => `<tr><td style="padding:4px 8px;color:#ccc;">${s.title}</td><td style="padding:4px 8px;font-weight:bold;color:${s.chartColor};">${scores[s.key]}/10</td></tr>`
      ).join('');

      const chartImgHtml = chartDataUrl
        ? `<div style="text-align:center;margin-bottom:20px;"><img src="${chartDataUrl}" alt="Koło Umiejętności" style="max-width:500px;width:100%;border-radius:12px;" /></div>`
        : '';

      const htmlBody = `
        <div style="background:#1a1a2e;color:#ffffff;padding:24px;border-radius:12px;font-family:Arial,sans-serif;">
          <h2 style="text-align:center;color:#ffffff;margin-bottom:20px;">Ocena Umiejętności w Network Marketingu</h2>
          ${chartImgHtml}
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            ${results}
          </table>
          <hr style="border-color:#333;"/>
          <p style="text-align:center;font-size:16px;color:#ffffff;"><strong>Średnia: ${avgScore}/10 &nbsp;|&nbsp; Suma: ${totalScore}/120</strong></p>
          <div style="display:flex;gap:16px;margin-top:16px;">
            <div style="flex:1;background:#0a2e1a;padding:12px;border-radius:8px;border:1px solid #22c55e33;">
              <h3 style="color:#22c55e;font-size:14px;margin-bottom:8px;">💪 Mocne strony</h3>
              ${top3.map(([key, val]) => `<p style="color:#ccc;margin:2px 0;">${ASSESSMENT_STEPS.find(s => s.key === key)?.title}: <strong style="color:#22c55e;">${val}/10</strong></p>`).join('')}
            </div>
            <div style="flex:1;background:#2e0a0a;padding:12px;border-radius:8px;border:1px solid #ef444433;">
              <h3 style="color:#ef4444;font-size:14px;margin-bottom:8px;">🎯 Do rozwoju</h3>
              ${bottom3.map(([key, val]) => `<p style="color:#ccc;margin:2px 0;">${ASSESSMENT_STEPS.find(s => s.key === key)?.title}: <strong style="color:#ef4444;">${val}/10</strong></p>`).join('')}
            </div>
          </div>
        </div>
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
      {/* Hidden export container with hardcoded colors for html2canvas */}
      <div
        ref={exportRef}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: '600px',
          background: '#1a1a2e',
          color: '#ffffff',
          padding: '24px',
          borderRadius: '12px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <h2 style={{ textAlign: 'center', color: '#ffffff', marginBottom: '16px', fontSize: '18px', fontWeight: 700 }}>
          Ocena Umiejętności w Network Marketingu
        </h2>
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          <SkillsRadarChart scores={scores} exportMode />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '16px' }}>
          {ASSESSMENT_STEPS.map((step) => (
            <div key={step.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderRadius: '4px', backgroundColor: step.chartColor + '30' }}>
              <span style={{ color: '#ffffff', fontSize: '12px' }}>{step.title}</span>
              <span style={{ fontWeight: 700, fontSize: '12px', color: step.chartColor }}>{scores[step.key]}/10</span>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>
          Średnia: {avgScore}/10 &nbsp;|&nbsp; Suma: {totalScore}/120
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
          <div style={{ padding: '10px', borderRadius: '8px', border: '1px solid #22c55e44', backgroundColor: '#0a2e1a' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#22c55e', marginBottom: '6px' }}>💪 Mocne strony</h3>
            {top3.map(([key, val]) => {
              const step = ASSESSMENT_STEPS.find(s => s.key === key);
              return (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '2px 0' }}>
                  <span style={{ color: '#cccccc' }}>{step?.title}</span>
                  <span style={{ fontWeight: 700, color: '#22c55e' }}>{val}</span>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ef444444', backgroundColor: '#2e0a0a' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444', marginBottom: '6px' }}>🎯 Do rozwoju</h3>
            {bottom3.map(([key, val]) => {
              const step = ASSESSMENT_STEPS.find(s => s.key === key);
              return (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '2px 0' }}>
                  <span style={{ color: '#cccccc' }}>{step?.title}</span>
                  <span style={{ fontWeight: 700, color: '#ef4444' }}>{val}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Visible summary */}
      <div className="bg-background p-6 rounded-xl space-y-6">
        <h2 className="text-xl font-bold text-foreground text-center">
          Ocena Umiejętności w Network Marketingu
        </h2>
        <div className="w-full max-w-[500px] mx-auto">
          <SkillsRadarChart scores={scores} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
          {ASSESSMENT_STEPS.map((step) => (
            <div key={step.key} className="flex justify-between gap-1 px-2 py-1 rounded" style={{ backgroundColor: step.chartColor + '20' }}>
              <span className="text-foreground">{step.title}</span>
              <span className="font-bold" style={{ color: step.chartColor }}>{scores[step.key]}/10</span>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-8 text-sm font-semibold text-foreground">
          <span>Średnia: {avgScore}/10</span>
          <span>Suma: {totalScore}/120</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg border border-green-200 bg-green-50/50">
            <h3 className="text-sm font-semibold text-green-600 mb-2">💪 Mocne strony</h3>
            {top3.map(([key, val]) => {
              const step = ASSESSMENT_STEPS.find(s => s.key === key);
              return (
                <div key={key} className="flex justify-between text-sm py-0.5">
                  <span className="text-foreground mr-2">{step?.title}</span>
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
                  <span className="text-foreground mr-2">{step?.title}</span>
                  <span className="font-bold text-red-500">{val}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actions */}
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
