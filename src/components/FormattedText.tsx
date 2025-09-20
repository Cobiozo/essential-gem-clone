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
    // Ensure proper text wrapping and responsiveness
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    hyphens: 'auto',
    maxWidth: '100%',
    width: '100%',
  } : {};

  const Component = as;

  // Combine base classes with custom classes for proper text handling
  const combinedClassName = `${className} ${formatting ? 'break-words hyphens-auto' : ''}`.trim();

  return (
    <Component 
      className={combinedClassName} 
      style={style}
    >
      {text}
    </Component>
  );
};