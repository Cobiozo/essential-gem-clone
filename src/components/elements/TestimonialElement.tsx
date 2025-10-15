import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Quote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestimonialElementProps {
  content: string;
  author: string;
  role?: string;
  avatar?: string;
  className?: string;
}

export const TestimonialElement: React.FC<TestimonialElementProps> = ({
  content,
  author,
  role,
  avatar,
  className,
}) => {
  return (
    <Card className={cn('bg-muted/50', className)}>
      <CardContent className="pt-6">
        <Quote className="w-8 h-8 text-primary mb-4 opacity-50" />
        <p className="text-lg mb-6 italic">&quot;{content}&quot;</p>
        <div className="flex items-center gap-3">
          {avatar ? (
            <img
              src={avatar}
              alt={author}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold text-lg">
                {author.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <p className="font-semibold">{author}</p>
            {role && <p className="text-sm text-muted-foreground">{role}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
