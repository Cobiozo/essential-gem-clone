import React from 'react';

interface TextStyle {
  fontSize: number;
  fontWeight: string | number;
  fontStyle: 'normal' | 'italic';
  textDecoration: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  color: string;
  backgroundColor?: string;
  lineHeight: number;
  letterSpacing: number;
  fontFamily: string;
  textTransform?: string;
}

interface FormattedHTMLProps {
  html: string;
  formatting?: Partial<TextStyle> | null;
  className?: string;
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span' | 'div' | 'article';
}

export const FormattedHTML: React.FC<FormattedHTMLProps> = ({
  html,
  formatting,
  className = '',
  as = 'div'
}) => {
  if (!html) return null;

  const style: React.CSSProperties = formatting ? {
    fontSize: formatting.fontSize ? `${formatting.fontSize}px` : undefined,
    fontWeight: formatting.fontWeight as any,
    fontStyle: formatting.fontStyle,
    textDecoration: formatting.textDecoration as any,
    textAlign: formatting.textAlign as any,
    color: formatting.color,
    backgroundColor: formatting.backgroundColor === 'transparent' ? undefined : formatting.backgroundColor,
    lineHeight: formatting.lineHeight,
    letterSpacing: formatting.letterSpacing ? `${formatting.letterSpacing}px` : undefined,
    fontFamily: formatting.fontFamily,
    textTransform: formatting.textTransform as any,
    wordWrap: 'break-word',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
    hyphens: 'auto',
    whiteSpace: 'normal',
    maxWidth: '100%',
    width: '100%',
  } : {
    wordWrap: 'break-word',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
    whiteSpace: 'normal',
  };

  const Component: any = as;

  return (
    <Component
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
