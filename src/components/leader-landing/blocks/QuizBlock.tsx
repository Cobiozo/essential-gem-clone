import React from 'react';
import type { QuizBlockData } from '@/types/leaderLanding';
import { trackLandingEvent } from '../utils/analytics';

interface Props {
  data: QuizBlockData;
  blockId: string;
  pageId: string;
  themeColor: string;
  eqId: string;
}

export const QuizBlock: React.FC<Props> = ({ data, blockId, pageId, themeColor, eqId }) => {
  const handleAnswer = (answer: QuizBlockData['answers'][0]) => {
    trackLandingEvent(pageId, 'quiz_answer', { block_id: blockId, answer: answer.label });

    if (answer.action_type === 'scroll_to_block' && answer.action_target) {
      const target = document.getElementById(answer.action_target);
      target?.scrollIntoView({ behavior: 'smooth' });
    } else if (answer.action_type === 'link' && answer.action_target) {
      const url = answer.action_target.replace('{EQID}', eqId);
      window.open(url, '_blank');
    }
  };

  return (
    <section id={blockId} className="max-w-2xl mx-auto px-6 py-16 text-center">
      <h2 className="text-2xl md:text-3xl font-bold mb-8">{data.question}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {data.answers.map((answer, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(answer)}
            className="px-6 py-4 rounded-xl border-2 text-lg font-medium transition-all hover:scale-105 hover:shadow-lg"
            style={{ borderColor: themeColor, color: themeColor }}
          >
            {answer.label}
          </button>
        ))}
      </div>
    </section>
  );
};
