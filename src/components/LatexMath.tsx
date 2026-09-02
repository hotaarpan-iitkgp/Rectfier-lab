import React, { useMemo } from 'react';
import katex from 'katex';
import { useTheme } from '../context/ThemeContext';

interface LatexMathProps {
  math: string;
  block?: boolean;
  className?: string;
}

export const LatexMath: React.FC<LatexMathProps> = ({ math, block = false, className = '' }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: block,
        throwOnError: false,
        output: 'htmlAndMathml',
      });
    } catch (error) {
      console.warn('KaTeX rendering error:', error);
      return `<span class="text-red-400 font-mono">${math}</span>`;
    }
  }, [math, block]);

  const textColor = isLight ? 'text-slate-900' : 'text-slate-100';

  if (block) {
    return (
      <div
        className={`my-2 overflow-x-auto py-1 font-serif leading-relaxed ${textColor} ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className={`inline-block font-serif ${textColor} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

