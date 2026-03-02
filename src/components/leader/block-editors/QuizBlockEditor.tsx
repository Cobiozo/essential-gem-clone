import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { QuizBlockData, QuizAnswer, LandingBlock } from '@/types/leaderLanding';

interface Props {
  data: QuizBlockData;
  onChange: (data: QuizBlockData) => void;
  allBlocks: LandingBlock[];
}

export const QuizBlockEditor: React.FC<Props> = ({ data, onChange, allBlocks }) => {
  const updateAnswer = (index: number, partial: Partial<QuizAnswer>) => {
    const answers = [...data.answers];
    answers[index] = { ...answers[index], ...partial };
    onChange({ ...data, answers });
  };

  const addAnswer = () => {
    onChange({ ...data, answers: [...data.answers, { label: 'Nowa opcja', action_type: 'scroll_to_block', action_target: '' }] });
  };

  const removeAnswer = (index: number) => {
    onChange({ ...data, answers: data.answers.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      <h4 className="font-semibold">Edycja Quiz</h4>
      <div><Label>Pytanie</Label><Input value={data.question || ''} onChange={e => onChange({ ...data, question: e.target.value })} /></div>
      
      <Label>Odpowiedzi</Label>
      {data.answers.map((answer, i) => (
        <div key={i} className="border rounded-md p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Input value={answer.label} onChange={e => updateAnswer(i, { label: e.target.value })} placeholder="Tekst odpowiedzi" className="flex-1" />
            <Button variant="ghost" size="icon" onClick={() => removeAnswer(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={answer.action_type} onValueChange={v => updateAnswer(i, { action_type: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="scroll_to_block">Przewiń do bloku</SelectItem>
                <SelectItem value="link">Otwórz link</SelectItem>
              </SelectContent>
            </Select>
            {answer.action_type === 'scroll_to_block' ? (
              <Select value={answer.action_target} onValueChange={v => updateAnswer(i, { action_target: v })}>
                <SelectTrigger><SelectValue placeholder="Wybierz blok" /></SelectTrigger>
                <SelectContent>
                  {allBlocks.filter(b => b.type !== 'quiz').map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.type} ({b.id.slice(-6)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={answer.action_target} onChange={e => updateAnswer(i, { action_target: e.target.value })} placeholder="URL" />
            )}
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addAnswer} className="gap-1"><Plus className="h-3 w-3" /> Dodaj odpowiedź</Button>
    </div>
  );
};
