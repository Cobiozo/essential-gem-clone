import React from 'react';

export interface BgPattern {
  value: string;
  label: string;
  category: 'geometric' | 'material';
  getCss: (opacity: number, color: string) => React.CSSProperties;
}

export const BG_PATTERNS: BgPattern[] = [
  // ─── Geometric ───
  {
    value: 'dots',
    label: 'Kropki',
    category: 'geometric',
    getCss: (op, col) => ({
      backgroundImage: `radial-gradient(circle, ${col} 1px, transparent 1px)`,
      backgroundSize: '20px 20px',
      opacity: op,
    }),
  },
  {
    value: 'diagonal-lines',
    label: 'Ukośne linie',
    category: 'geometric',
    getCss: (op, col) => ({
      backgroundImage: `repeating-linear-gradient(45deg, ${col} 0, ${col} 1px, transparent 0, transparent 50%)`,
      backgroundSize: '10px 10px',
      opacity: op,
    }),
  },
  {
    value: 'grid',
    label: 'Siatka',
    category: 'geometric',
    getCss: (op, col) => ({
      backgroundImage: `linear-gradient(${col} 1px, transparent 1px), linear-gradient(90deg, ${col} 1px, transparent 1px)`,
      backgroundSize: '20px 20px',
      opacity: op,
    }),
  },
  {
    value: 'cross',
    label: 'Krzyżyki',
    category: 'geometric',
    getCss: (op, col) => ({
      backgroundImage: `linear-gradient(${col} 1px, transparent 1px), linear-gradient(90deg, ${col} 1px, transparent 1px)`,
      backgroundSize: '40px 40px',
      backgroundPosition: 'center center',
      opacity: op,
    }),
  },
  {
    value: 'diamonds',
    label: 'Romby',
    category: 'geometric',
    getCss: (op, col) => ({
      backgroundImage: `
        linear-gradient(45deg, ${col} 25%, transparent 25%),
        linear-gradient(-45deg, ${col} 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, ${col} 75%),
        linear-gradient(-45deg, transparent 75%, ${col} 75%)
      `,
      backgroundSize: '20px 20px',
      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
      opacity: op,
    }),
  },
  {
    value: 'chevrons',
    label: 'Jodełka',
    category: 'geometric',
    getCss: (op, col) => ({
      backgroundImage: `
        linear-gradient(135deg, ${col} 25%, transparent 25%),
        linear-gradient(225deg, ${col} 25%, transparent 25%)
      `,
      backgroundSize: '20px 10px',
      opacity: op,
    }),
  },
  {
    value: 'triangles',
    label: 'Trójkąty',
    category: 'geometric',
    getCss: (op, col) => ({
      backgroundImage: `
        linear-gradient(60deg, ${col} 25%, transparent 25.5%),
        linear-gradient(-60deg, ${col} 25%, transparent 25.5%)
      `,
      backgroundSize: '24px 42px',
      opacity: op,
    }),
  },
  {
    value: 'circles',
    label: 'Okręgi',
    category: 'geometric',
    getCss: (op, col) => ({
      backgroundImage: `radial-gradient(circle, transparent 60%, ${col} 61%, ${col} 63%, transparent 64%)`,
      backgroundSize: '40px 40px',
      opacity: op,
    }),
  },
  {
    value: 'hexagons',
    label: 'Heksagony',
    category: 'geometric',
    getCss: (op, col) => ({
      backgroundImage: `
        radial-gradient(circle farthest-side at 0% 50%, ${col} 23.5%, transparent 0) 21px 30px,
        radial-gradient(circle farthest-side at 0% 50%, ${col} 24%, transparent 0) 19px 30px,
        linear-gradient(${col} 14%, transparent 0, transparent 85%, ${col} 0) 0 0,
        linear-gradient(150deg, ${col} 24%, transparent 0) 0 0,
        linear-gradient(30deg, ${col} 24%, transparent 0) 0 0,
        linear-gradient(210deg, ${col} 24%, transparent 0) 0 0,
        linear-gradient(330deg, ${col} 24%, transparent 0) 0 0
      `,
      backgroundSize: '40px 60px',
      opacity: op,
    }),
  },
  {
    value: 'waves',
    label: 'Fale',
    category: 'geometric',
    getCss: (op, col) => {
      const enc = encodeURIComponent(col);
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='100' height='20'><path d='M0 10 Q25 0 50 10 Q75 20 100 10' fill='none' stroke='${enc}' stroke-width='1'/></svg>`;
      return {
        backgroundImage: `url("data:image/svg+xml,${svg}")`,
        backgroundSize: '100px 20px',
        opacity: op,
      };
    },
  },
  {
    value: 'zigzag',
    label: 'Zygzak',
    category: 'geometric',
    getCss: (op, col) => ({
      backgroundImage: `
        linear-gradient(135deg, ${col} 25%, transparent 25%) -10px 0,
        linear-gradient(225deg, ${col} 25%, transparent 25%) -10px 0,
        linear-gradient(315deg, ${col} 25%, transparent 25%),
        linear-gradient(45deg, ${col} 25%, transparent 25%)
      `,
      backgroundSize: '20px 20px',
      opacity: op,
    }),
  },

  // ─── Materials ───
  {
    value: 'noise',
    label: 'Szum',
    category: 'material',
    getCss: (op) => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='1200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/></filter><rect width='1200' height='1200' filter='url(#n)'/></svg>`;
      return {
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
        backgroundSize: 'cover',
        opacity: op,
      };
    },
  },
  {
    value: 'paper',
    label: 'Papier',
    category: 'material',
    getCss: (op) => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='1200'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='5' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='1200' height='1200' filter='url(#p)'/></svg>`;
      return {
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
        backgroundSize: 'cover',
        opacity: op,
      };
    },
  },
  {
    value: 'linen',
    label: 'Len',
    category: 'material',
    getCss: (op) => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='l'><feTurbulence type='turbulence' baseFrequency='0.65 0.1' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(#l)'/></svg>`;
      return {
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
        backgroundSize: '200px 200px',
        opacity: op,
      };
    },
  },
  {
    value: 'fabric',
    label: 'Materiał',
    category: 'material',
    getCss: (op, col) => ({
      backgroundImage: `
        linear-gradient(0deg, ${col} 1px, transparent 1px),
        linear-gradient(90deg, ${col} 1px, transparent 1px)
      `,
      backgroundSize: '4px 4px',
      opacity: op,
    }),
  },
  {
    value: 'canvas',
    label: 'Płótno',
    category: 'material',
    getCss: (op) => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='c'><feTurbulence type='turbulence' baseFrequency='0.4 0.15' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(#c)'/></svg>`;
      return {
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
        backgroundSize: '200px 200px',
        opacity: op,
      };
    },
  },
  {
    value: 'leather',
    label: 'Skóra',
    category: 'material',
    getCss: (op) => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='le'><feTurbulence type='turbulence' baseFrequency='0.3' numOctaves='6' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(#le)'/></svg>`;
      return {
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
        backgroundSize: '200px 200px',
        opacity: op,
      };
    },
  },
  {
    value: 'wood',
    label: 'Drewno',
    category: 'material',
    getCss: (op) => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='w'><feTurbulence type='fractalNoise' baseFrequency='0.02 0.2' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='300' height='300' filter='url(#w)'/></svg>`;
      return {
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
        backgroundSize: '300px 300px',
        opacity: op,
      };
    },
  },
  {
    value: 'concrete',
    label: 'Beton',
    category: 'material',
    getCss: (op) => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='250' height='250'><filter id='co'><feTurbulence type='fractalNoise' baseFrequency='0.15' numOctaves='6' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='250' height='250' filter='url(#co)'/></svg>`;
      return {
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
        backgroundSize: '250px 250px',
        opacity: op,
      };
    },
  },
  {
    value: 'marble',
    label: 'Marmur',
    category: 'material',
    getCss: (op) => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='m'><feTurbulence type='fractalNoise' baseFrequency='0.01' numOctaves='8' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='300' height='300' filter='url(#m)'/></svg>`;
      return {
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
        backgroundSize: '300px 300px',
        opacity: op,
      };
    },
  },
  {
    value: 'sand',
    label: 'Piasek',
    category: 'material',
    getCss: (op) => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='s'><feTurbulence type='turbulence' baseFrequency='0.5' numOctaves='5' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(#s)'/></svg>`;
      return {
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
        backgroundSize: '200px 200px',
        opacity: op,
      };
    },
  },
];

/**
 * Determine if a hex color is dark (luminance < 0.5)
 */
function isColorDark(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return true;
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum < 0.5;
}

/**
 * Get pattern overlay CSS properties for a given pattern.
 */
export function getPatternStyle(
  pattern: string,
  opacity?: number,
  color?: string,
  bgColor?: string,
): React.CSSProperties {
  const def = BG_PATTERNS.find((p) => p.value === pattern);
  if (!def) return {};
  const op = opacity ?? 0.08;
  const col = color || (bgColor && !isColorDark(bgColor) ? '#000000' : '#ffffff');
  return def.getCss(op, col);
}
