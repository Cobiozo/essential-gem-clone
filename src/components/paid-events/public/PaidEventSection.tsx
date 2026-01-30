import React from 'react';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';

interface SectionItem {
  text: string;
  icon?: string;
}

interface PaidEventSectionProps {
  id: string;
  title: string;
  content?: string | null;
  items?: SectionItem[];
  iconName?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  className?: string;
}

export const PaidEventSection: React.FC<PaidEventSectionProps> = ({
  id,
  title,
  content,
  items,
  iconName,
  backgroundColor,
  textColor,
  className,
}) => {
  // Get icon component dynamically
  const IconComponent = iconName && (LucideIcons as any)[iconName];

  const sectionStyle: React.CSSProperties = {
    backgroundColor: backgroundColor || undefined,
    color: textColor || undefined,
  };

  return (
    <section
      id={id}
      className={cn('py-8 md:py-12 scroll-mt-16', className)}
      style={sectionStyle}
    >
      <div className="space-y-6">
        {/* Section Header */}
        <div className="flex items-center gap-3">
          {IconComponent && (
            <div className="p-2 rounded-lg bg-primary/10">
              <IconComponent className="w-6 h-6 text-primary" />
            </div>
          )}
          <h2 className="text-2xl md:text-3xl font-bold">{title}</h2>
        </div>

        {/* HTML Content */}
        {content && (
          <div
            className="prose prose-lg max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}

        {/* Items List */}
        {items && items.length > 0 && (
          <ul className="space-y-3">
            {items.map((item, index) => {
              const ItemIcon = item.icon && (LucideIcons as any)[item.icon];
              return (
                <li key={index} className="flex items-start gap-3">
                  {ItemIcon ? (
                    <ItemIcon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  ) : (
                    <LucideIcons.Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  )}
                  <span className="text-base">{item.text}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};
