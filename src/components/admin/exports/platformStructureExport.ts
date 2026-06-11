import * as XLSX from 'xlsx';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
} from 'docx';
import { saveAs } from 'file-saver';

export interface PlatformProfile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  eq_id: string | null;
  upline_eq_id: string | null;
  phone_number: string | null;
  country: string | null;
  city: string | null;
  is_active: boolean | null;
  blocked_at: string | null;
  created_at: string;
  avatar_url: string | null;
}

export interface PlatformNode {
  profile: PlatformProfile;
  roles: string[];
  children: PlatformNode[];
  depth: number;
  directCount: number;
  downlineCount: number;
  uplinePath: string; // "EQ1 → EQ2 → EQ3"
}

const ROLE_ORDER = [
  'admin',
  'moderator',
  'leader',
  'guardian',
  'specjalista',
  'partner',
  'klient',
  'client',
  'guest_plc',
];

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  moderator: 'Moderator',
  leader: 'Lider',
  guardian: 'Opiekun',
  specjalista: 'Specjalista',
  partner: 'Partner',
  klient: 'Klient',
  client: 'Klient',
  guest_plc: 'Gość PLC',
};

export function sortRoles(roles: string[]): string[] {
  return [...new Set(roles)].sort(
    (a, b) =>
      (ROLE_ORDER.indexOf(a) === -1 ? 99 : ROLE_ORDER.indexOf(a)) -
      (ROLE_ORDER.indexOf(b) === -1 ? 99 : ROLE_ORDER.indexOf(b)),
  );
}

export function buildTree(
  profiles: PlatformProfile[],
  rolesByUser: Map<string, string[]>,
): { roots: PlatformNode[]; nodesByEq: Map<string, PlatformNode>; allNodes: PlatformNode[] } {
  const nodesByEq = new Map<string, PlatformNode>();
  const orphans: PlatformNode[] = [];
  const allNodes: PlatformNode[] = [];

  profiles.forEach((p) => {
    const node: PlatformNode = {
      profile: p,
      roles: sortRoles(rolesByUser.get(p.user_id) ?? []),
      children: [],
      depth: 0,
      directCount: 0,
      downlineCount: 0,
      uplinePath: '',
    };
    allNodes.push(node);
    if (p.eq_id) nodesByEq.set(p.eq_id, node);
  });

  const roots: PlatformNode[] = [];
  allNodes.forEach((node) => {
    const upEq = node.profile.upline_eq_id;
    const parent = upEq ? nodesByEq.get(upEq) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort children
  const sortChildren = (arr: PlatformNode[]) => {
    arr.sort((a, b) => {
      const an = `${a.profile.last_name ?? ''} ${a.profile.first_name ?? ''}`.trim().toLowerCase();
      const bn = `${b.profile.last_name ?? ''} ${b.profile.first_name ?? ''}`.trim().toLowerCase();
      return an.localeCompare(bn, 'pl');
    });
    arr.forEach((n) => sortChildren(n.children));
  };
  sortChildren(roots);

  // Compute depth, directCount, downlineCount, uplinePath
  const visit = (node: PlatformNode, depth: number, path: string[]) => {
    node.depth = depth;
    node.uplinePath = path.join(' → ');
    node.directCount = node.children.length;
    let total = node.children.length;
    const childPath = [...path, node.profile.eq_id ?? '—'];
    node.children.forEach((c) => {
      visit(c, depth + 1, childPath);
      total += c.downlineCount;
    });
    node.downlineCount = total;
  };
  roots.forEach((r) => visit(r, 0, []));

  return { roots, nodesByEq, allNodes };
}

export interface Summary {
  total: number;
  byRole: Record<string, number>;
  rootCount: number;
  withUpline: number;
  activeCount: number;
  blockedCount: number;
}

export function summarize(allNodes: PlatformNode[]): Summary {
  const byRole: Record<string, number> = {};
  let withUpline = 0;
  let rootCount = 0;
  let active = 0;
  let blocked = 0;
  allNodes.forEach((n) => {
    n.roles.forEach((r) => {
      byRole[r] = (byRole[r] ?? 0) + 1;
    });
    if (n.profile.upline_eq_id) withUpline += 1;
    else rootCount += 1;
    if (n.profile.blocked_at || n.profile.is_active === false) blocked += 1;
    else active += 1;
  });
  return {
    total: allNodes.length,
    byRole,
    rootCount,
    withUpline,
    activeCount: active,
    blockedCount: blocked,
  };
}

function formatName(p: PlatformProfile): string {
  return `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || (p.email ?? p.user_id);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pl-PL');
  } catch {
    return iso;
  }
}

function flatten(roots: PlatformNode[]): PlatformNode[] {
  const out: PlatformNode[] = [];
  const walk = (n: PlatformNode) => {
    out.push(n);
    n.children.forEach(walk);
  };
  roots.forEach(walk);
  return out;
}

/* -------------------- EXCEL -------------------- */

export function exportToExcel(roots: PlatformNode[], allNodes: PlatformNode[]) {
  const summary = summarize(allNodes);
  const wb = XLSX.utils.book_new();
  const now = new Date().toLocaleString('pl-PL');

  // Summary sheet
  const summaryRows: (string | number)[][] = [
    ['Struktura platformy — podsumowanie'],
    ['Data eksportu', now],
    [],
    ['Łączna liczba użytkowników', summary.total],
    ['Z uplinem', summary.withUpline],
    ['Korzenie (bez uplina)', summary.rootCount],
    ['Aktywni', summary.activeCount],
    ['Zablokowani / nieaktywni', summary.blockedCount],
    [],
    ['Rola', 'Liczba'],
  ];
  Object.entries(summary.byRole)
    .sort((a, b) => b[1] - a[1])
    .forEach(([role, count]) => summaryRows.push([ROLE_LABELS[role] ?? role, count]));

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 36 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Podsumowanie');

  // Flat user list
  const header = [
    'EQ ID',
    'Upline EQ ID',
    'Ścieżka uplinów',
    'Imię',
    'Nazwisko',
    'Email',
    'Telefon',
    'Kraj',
    'Miasto',
    'Role',
    'Status',
    'Rejestracja',
    'Bezpośredni',
    'Cały downline',
  ];
  const flat = flatten(roots);
  const rows = flat.map((n) => [
    n.profile.eq_id ?? '',
    n.profile.upline_eq_id ?? '',
    n.uplinePath,
    n.profile.first_name ?? '',
    n.profile.last_name ?? '',
    n.profile.email ?? '',
    n.profile.phone_number ?? '',
    n.profile.country ?? '',
    n.profile.city ?? '',
    n.roles.map((r) => ROLE_LABELS[r] ?? r).join(', '),
    n.profile.blocked_at || n.profile.is_active === false ? 'Zablokowany' : 'Aktywny',
    formatDate(n.profile.created_at),
    n.directCount,
    n.downlineCount,
  ]);
  const wsUsers = XLSX.utils.aoa_to_sheet([header, ...rows]);
  wsUsers['!cols'] = [
    { wch: 14 }, { wch: 14 }, { wch: 40 }, { wch: 16 }, { wch: 18 },
    { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 24 },
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
  ];
  wsUsers['!freeze'] = { xSplit: 0, ySplit: 1 } as any;
  wsUsers['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: header.length - 1, r: rows.length } }) };
  XLSX.utils.book_append_sheet(wb, wsUsers, 'Użytkownicy');

  // Tree sheet
  const treeRows: (string | number)[][] = [['Hierarchia', 'EQ ID', 'Role', 'Bezpośredni', 'Downline']];
  const walk = (n: PlatformNode) => {
    const indent = '    '.repeat(n.depth);
    treeRows.push([
      `${indent}${formatName(n.profile)}`,
      n.profile.eq_id ?? '',
      n.roles.map((r) => ROLE_LABELS[r] ?? r).join(', '),
      n.directCount,
      n.downlineCount,
    ]);
    n.children.forEach(walk);
  };
  roots.forEach(walk);
  const wsTree = XLSX.utils.aoa_to_sheet(treeRows);
  wsTree['!cols'] = [{ wch: 56 }, { wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsTree, 'Struktura');

  XLSX.writeFile(wb, `struktura-platformy-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* -------------------- WORD -------------------- */

const border = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
const allBorders = { top: border, bottom: border, left: border, right: border };

function summaryTable(summary: Summary): Table {
  const rows: TableRow[] = [
    new TableRow({
      children: ['Metryka', 'Wartość'].map(
        (t) =>
          new TableCell({
            borders: allBorders,
            width: { size: 4680, type: WidthType.DXA },
            shading: { fill: 'EEF2FF', type: ShadingType.CLEAR, color: 'auto' },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: t, bold: true })] })],
          }),
      ),
    }),
  ];
  const push = (k: string, v: string | number) =>
    rows.push(
      new TableRow({
        children: [k, String(v)].map(
          (t) =>
            new TableCell({
              borders: allBorders,
              width: { size: 4680, type: WidthType.DXA },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun(t)] })],
            }),
        ),
      }),
    );

  push('Łączna liczba użytkowników', summary.total);
  push('Z uplinem', summary.withUpline);
  push('Korzenie (bez uplina)', summary.rootCount);
  push('Aktywni', summary.activeCount);
  push('Zablokowani / nieaktywni', summary.blockedCount);
  Object.entries(summary.byRole)
    .sort((a, b) => b[1] - a[1])
    .forEach(([role, count]) => push(`Rola: ${ROLE_LABELS[role] ?? role}`, count));

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4680, 4680],
    rows,
  });
}

function nodeParagraph(n: PlatformNode): Paragraph {
  const indent = '    '.repeat(n.depth);
  const rolesText = n.roles.map((r) => ROLE_LABELS[r] ?? r).join(', ') || '—';
  const isAdmin = n.roles.includes('admin');
  return new Paragraph({
    spacing: { before: 20, after: 20 },
    children: [
      new TextRun({ text: `${indent}• `, color: '888888' }),
      new TextRun({
        text: formatName(n.profile),
        bold: true,
        color: isAdmin ? 'B91C1C' : '111111',
      }),
      new TextRun({
        text: `  [${rolesText}]`,
        color: '555555',
        size: 18,
      }),
      new TextRun({
        text: `  EQ:${n.profile.eq_id ?? '—'}  Σ${n.downlineCount}`,
        color: '888888',
        size: 18,
      }),
    ],
  });
}

export async function exportToWord(roots: PlatformNode[], allNodes: PlatformNode[]) {
  const summary = summarize(allNodes);
  const now = new Date().toLocaleString('pl-PL');

  const treeParagraphs: Paragraph[] = [];
  const walk = (n: PlatformNode) => {
    treeParagraphs.push(nodeParagraph(n));
    n.children.forEach(walk);
  };
  roots.forEach((r) => {
    walk(r);
    treeParagraphs.push(new Paragraph({ children: [new TextRun('')] }));
  });

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 20 } } },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 36, bold: true, font: 'Arial' },
          paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 28, bold: true, font: 'Arial' },
          paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.LEFT,
            children: [new TextRun('Struktura platformy')],
          }),
          new Paragraph({
            children: [new TextRun({ text: `Stan na: ${now}`, color: '666666' })],
          }),
          new Paragraph({ children: [new TextRun('')] }),
          new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Podsumowanie')] }),
          summaryTable(summary),
          new Paragraph({ children: [new TextRun('')] }),
          new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Hierarchia użytkowników')] }),
          ...treeParagraphs,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `struktura-platformy-${new Date().toISOString().slice(0, 10)}.docx`);
}

/* -------------------- HTML -------------------- */

function escapeHtml(s: string | null | undefined): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderNodeHtml(n: PlatformNode): string {
  const name = escapeHtml(formatName(n.profile));
  const isAdmin = n.roles.includes('admin');
  const roleBadges = n.roles
    .map(
      (r) =>
        `<span class="badge role-${escapeHtml(r)}">${escapeHtml(ROLE_LABELS[r] ?? r)}</span>`,
    )
    .join(' ');
  const meta = [
    n.profile.email ? `<a href="mailto:${escapeHtml(n.profile.email)}">${escapeHtml(n.profile.email)}</a>` : '',
    n.profile.phone_number ? escapeHtml(n.profile.phone_number) : '',
    [n.profile.city, n.profile.country].filter(Boolean).map(escapeHtml).join(', '),
    `Zarejestrowany: ${escapeHtml(formatDate(n.profile.created_at))}`,
    n.profile.blocked_at || n.profile.is_active === false
      ? '<span class="status blocked">Zablokowany</span>'
      : '<span class="status active">Aktywny</span>',
  ]
    .filter(Boolean)
    .join(' · ');

  const childrenHtml = n.children.length
    ? `<div class="children">${n.children.map(renderNodeHtml).join('')}</div>`
    : '';

  if (n.children.length === 0) {
    return `<div class="leaf ${isAdmin ? 'is-admin' : ''}">
        <div class="row">
          <span class="name">${name}</span>
          ${roleBadges}
          <span class="eq">${escapeHtml(n.profile.eq_id ?? '—')}</span>
        </div>
        <div class="meta">${meta}</div>
      </div>`;
  }

  return `<details open class="${isAdmin ? 'is-admin' : ''}">
    <summary>
      <span class="name">${name}</span>
      ${roleBadges}
      <span class="eq">${escapeHtml(n.profile.eq_id ?? '—')}</span>
      <span class="counts">(${n.directCount}) Σ${n.downlineCount}</span>
    </summary>
    <div class="meta">${meta}</div>
    ${childrenHtml}
  </details>`;
}

export function exportToHtml(roots: PlatformNode[], allNodes: PlatformNode[]) {
  const summary = summarize(allNodes);
  const now = new Date().toLocaleString('pl-PL');
  const summaryCards = Object.entries(summary.byRole)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([role, count]) => `
      <div class="card">
        <div class="card-label">${escapeHtml(ROLE_LABELS[role] ?? role)}</div>
        <div class="card-value">${count}</div>
      </div>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<title>Struktura platformy — ${escapeHtml(now)}</title>
<style>
  :root {
    --bg: #ffffff; --fg: #0f172a; --muted: #64748b;
    --primary: #2563eb; --primary-soft: #eff6ff;
    --destructive: #b91c1c; --destructive-soft: #fef2f2;
    --warning: #d97706; --success: #15803d;
    --border: #e2e8f0;
  }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Inter, Arial, sans-serif; color: var(--fg); background: var(--bg); margin: 0; padding: 24px; line-height: 1.45; font-size: 13px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: var(--muted); margin-bottom: 20px; }
  .summary { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; margin-bottom: 20px; }
  .card { border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; background: #fafbfc; }
  .card-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .03em; }
  .card-value { font-size: 20px; font-weight: 600; margin-top: 2px; }
  .top { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
  .stat { font-size: 12px; color: var(--muted); }
  .stat b { color: var(--fg); font-weight: 600; }
  details, .leaf { border-left: 2px solid var(--border); margin: 2px 0 2px 8px; padding: 4px 0 4px 10px; }
  details > summary { cursor: pointer; list-style: none; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 2px 0; }
  details > summary::-webkit-details-marker { display: none; }
  details > summary::before { content: "▸"; color: var(--muted); display: inline-block; transition: transform .15s; width: 10px; }
  details[open] > summary::before { transform: rotate(90deg); }
  .leaf .row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding-left: 10px; }
  .name { font-weight: 600; }
  .eq { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 11px; color: var(--muted); background: #f1f5f9; padding: 1px 6px; border-radius: 4px; }
  .counts { color: var(--muted); font-size: 11px; margin-left: auto; }
  .meta { color: var(--muted); font-size: 11px; padding: 2px 0 4px 18px; }
  .meta a { color: var(--primary); text-decoration: none; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; background: #e2e8f0; color: #334155; text-transform: uppercase; letter-spacing: .03em; }
  .badge.role-admin { background: var(--destructive); color: white; }
  .badge.role-moderator { background: #f59e0b; color: white; }
  .badge.role-leader { background: var(--primary); color: white; }
  .badge.role-guardian { background: #7c3aed; color: white; }
  .badge.role-specjalista { background: #0d9488; color: white; }
  .badge.role-partner { background: #1e293b; color: white; }
  .badge.role-klient, .badge.role-client { background: #94a3b8; color: white; }
  .badge.role-guest_plc { background: #cbd5e1; color: #334155; }
  details.is-admin > summary, .leaf.is-admin { background: var(--destructive-soft); border-radius: 4px; }
  .status { font-size: 10px; padding: 1px 5px; border-radius: 3px; }
  .status.active { background: #dcfce7; color: var(--success); }
  .status.blocked { background: #fee2e2; color: var(--destructive); }
  .roots { margin-top: 8px; }
  @media print { body { padding: 12px; font-size: 11px; } details { break-inside: avoid; } }
</style>
</head>
<body>
  <h1>Struktura platformy</h1>
  <div class="sub">Wygenerowano: ${escapeHtml(now)}</div>
  <div class="top">
    <span class="stat">Użytkowników: <b>${summary.total}</b></span>
    <span class="stat">Z uplinem: <b>${summary.withUpline}</b></span>
    <span class="stat">Korzeni: <b>${summary.rootCount}</b></span>
    <span class="stat">Aktywni: <b>${summary.activeCount}</b></span>
    <span class="stat">Zablokowani: <b>${summary.blockedCount}</b></span>
  </div>
  <div class="summary">${summaryCards}</div>
  <div class="roots">${roots.map(renderNodeHtml).join('')}</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  saveAs(blob, `struktura-platformy-${new Date().toISOString().slice(0, 10)}.html`);
}
