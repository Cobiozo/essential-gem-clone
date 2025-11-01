import React from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { isProblematicColor } from '@/lib/colorUtils';

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

  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const style: React.CSSProperties = formatting ? {
    fontSize: `${formatting.fontSize}px`,
    fontWeight: formatting.fontWeight,
    fontStyle: formatting.fontStyle,
    textDecoration: formatting.textDecoration,
    textAlign: formatting.textAlign,
    lineHeight: formatting.lineHeight,
    letterSpacing: `${formatting.letterSpacing}px`,
    fontFamily: formatting.fontFamily,
    // Ensure proper text wrapping and responsiveness
    wordWrap: 'break-word',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
    hyphens: 'auto',
    whiteSpace: 'normal',
    maxWidth: '100%',
    width: '100%',
  } : {
    // Default styles for non-formatted text
    wordWrap: 'break-word',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
    whiteSpace: 'normal',
  };

  // Conditionally apply color and backgroundColor if they're not problematic
  if (formatting) {
    if (formatting.color && !isProblematicColor(formatting.color, isDarkMode, 'text')) {
      style.color = formatting.color;
    }
    if (formatting.backgroundColor && formatting.backgroundColor !== 'transparent') {
      if (!isProblematicColor(formatting.backgroundColor, isDarkMode, 'background')) {
        style.backgroundColor = formatting.backgroundColor;
      }
    }
  }

  const Component = as;

  // Combine base classes with custom classes for proper text handling
  const combinedClassName = `${className} ${formatting ? 'break-words hyphens-auto' : ''}`.trim();

  return (
    <Component 
      className={combinedClassName} 
      style={style}
      dangerouslySetInnerHTML={{ __html: text }}
    />
  );
};