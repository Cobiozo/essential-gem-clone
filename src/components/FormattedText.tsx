import React from 'react';

interface TextStyle {
  fontSize: number;
  fontWeight: string;
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  backgroundColor: string;
  lineHeight: number;
  letterSpacing: number;
  fontFamily: string;
}

interface FormattedTextProps {
  text: string;
  formatting?: TextStyle | null;
  className?: string;
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span' | 'div';
}

export const FormattedText: React.FC<FormattedTextProps> = ({ 
  text, 
  formatting, 
  className = '', 
  as = 'p' 
}) => {
  if (!text) return null;

  const style: React.CSSProperties = formatting ? {
    fontSize: `${formatting.fontSize}px`,
    fontWeight: formatting.fontWeight,
    fontStyle: formatting.fontStyle,
    textDecoration: formatting.textDecoration,
    textAlign: formatting.textAlign,
    color: formatting.color,
    backgroundColor: formatting.backgroundColor === 'transparent' ? undefined : formatting.backgroundColor,
    lineHeight: formatting.lineHeight,
    letterSpacing: `${formatting.letterSpacing}px`,
    fontFamily: formatting.fontFamily,
  } : {};

  const Component = as;

  return (
    <Component 
      className={className} 
      style={style}
    >
      {text}
    </Component>
  );
};