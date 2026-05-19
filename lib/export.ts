import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  VerticalAlign,
} from 'docx';

export type ExportLayout = 'simple' | 'elegant' | 'grid';

function parseInline(text: string, overrides?: Partial<{ font: string; size: number; color: string }>): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      runs.push(new TextRun({ text: text.slice(last, match.index), ...overrides }));
    }
    if (match[1] !== undefined) {
      runs.push(new TextRun({ text: match[1], bold: true, ...overrides }));
    } else if (match[2] !== undefined) {
      runs.push(new TextRun({ text: match[2], italics: true, color: '64748B', ...overrides }));
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    runs.push(new TextRun({ text: text.slice(last), ...overrides }));
  }

  return runs.length ? runs : [new TextRun({ text, ...overrides })];
}

// ─── PHASE PARSING (for Grid layout) ───────────────────────────────────────

interface TimelineEvent {
  time: string;
  title: string;
  notes: string[];
}

interface Phase {
  name: string;
  events: TimelineEvent[];
}

const PHASE_STYLES: Record<string, { bg: string; accent: string }> = {
  'vendor setup':   { bg: 'F5F4F0', accent: '888888' },
  'setup':          { bg: 'F5F4F0', accent: '888888' },
  'getting ready':  { bg: 'FDF6E3', accent: 'B8973A' },
  'preparation':    { bg: 'FDF6E3', accent: 'B8973A' },
  'photos':         { bg: 'F0F5F0', accent: '5B8B5B' },
  'photo':          { bg: 'F0F5F0', accent: '5B8B5B' },
  'first look':     { bg: 'F0F5F0', accent: '5B8B5B' },
  'portrait':       { bg: 'F0F5F0', accent: '5B8B5B' },
  'ceremony':       { bg: 'F0F4F8', accent: '5B8DB8' },
  'cocktail':       { bg: 'FDF3EE', accent: 'C47A4A' },
  'reception':      { bg: 'F3F0F8', accent: '9B72CF' },
  'dinner':         { bg: 'F3F0F8', accent: '9B72CF' },
  'grand exit':     { bg: 'FDF0F3', accent: 'B85B78' },
  'send off':       { bg: 'FDF0F3', accent: 'B85B78' },
  'send-off':       { bg: 'FDF0F3', accent: 'B85B78' },
  'departure':      { bg: 'FDF0F3', accent: 'B85B78' },
  'exit':           { bg: 'FDF0F3', accent: 'B85B78' },
};
const DEFAULT_PHASE_STYLE = { bg: 'F5F5F5', accent: '999999' };

function getPhaseStyle(name: string): { bg: string; accent: string } {
  const lower = name.toLowerCase();
  for (const [key, style] of Object.entries(PHASE_STYLES)) {
    if (lower.includes(key)) return style;
  }
  return DEFAULT_PHASE_STYLE;
}

function parsePhases(lines: string[]): Phase[] {
  const phases: Phase[] = [];
  let current: Phase | null = null;
  let currentEvent: TimelineEvent | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    if (/^# /.test(line) || /^---/.test(line) || /^### /.test(line)) continue;

    // Phase header
    if (/^## /.test(line)) {
      if (current) phases.push(current);
      current = { name: line.slice(3).trim(), events: [] };
      currentEvent = null;
      continue;
    }

    // Timestamp line: **3:00 PM** or **3:00 PM — Event Title** or **3:00 PM** Event Title
    const timeMatch = line.match(/^\*\*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))\*\*\s*(?:—|–|-|:)?\s*(.*)/);
    if (timeMatch) {
      if (!current) current = { name: 'Other', events: [] };
      currentEvent = {
        time: timeMatch[1].trim(),
        title: (timeMatch[2] || '').replace(/\*\*/g, '').trim(),
        notes: [],
      };
      current.events.push(currentEvent);
      continue;
    }

    // Sub-bullet → note
    if (/^  - /.test(line) && currentEvent) {
      currentEvent.notes.push(line.slice(4).replace(/\*\*/g, '').trim());
      continue;
    }

    // Top-level bullet → title or note
    if (/^- /.test(line) && currentEvent) {
      const text = line.slice(2).replace(/\*\*/g, '').trim();
      if (!currentEvent.title) {
        currentEvent.title = text;
      } else {
        currentEvent.notes.push(text);
      }
      continue;
    }

    // Anything else → attach to current event
    if (currentEvent) {
      const text = line.replace(/\*\*/g, '').trim();
      if (!currentEvent.title) currentEvent.title = text;
      else currentEvent.notes.push(text);
    }
  }

  if (current) phases.push(current);
  return phases;
}

function getTimeRange(events: TimelineEvent[]): string {
  if (events.length === 0) return '';
  const first = events[0].time;
  const last = events[events.length - 1].time;
  if (first === last) return first;
  return `${first} – ${last}`;
}

// ─── SIMPLE LAYOUT ──────────────────────────────────────────────────────────
// Clean, minimal. Georgia headings, system font body. Gold accents on section dividers.
function buildSimple(lines: string[], coupleName: string, weddingDate: string): Paragraph[] {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      children: [new TextRun({ text: coupleName, bold: true, size: 36, font: 'Georgia', color: '1E293B' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: weddingDate, size: 22, color: '64748B' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  );

  for (const line of lines) {
    if (!line.trim()) {
      children.push(new Paragraph({ children: [new TextRun({ text: '' })], spacing: { after: 80 } }));
      continue;
    }
    if (/^# /.test(line)) {
      children.push(new Paragraph({
        children: [new TextRun({ text: line.slice(2), bold: true, size: 32, font: 'Georgia', color: '1E293B' })],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 160 },
      }));
      continue;
    }
    if (/^## /.test(line)) {
      children.push(new Paragraph({
        children: [new TextRun({ text: line.slice(3).toUpperCase(), bold: true, size: 22, color: 'C9A84C', font: 'Georgia' })],
        spacing: { before: 320, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'C9A84C', space: 4 } },
      }));
      continue;
    }
    if (/^### /.test(line)) {
      children.push(new Paragraph({
        children: [new TextRun({ text: line.slice(4), bold: true, size: 24, font: 'Georgia', color: '334155' })],
        spacing: { before: 240, after: 80 },
      }));
      continue;
    }
    if (/^---/.test(line)) {
      children.push(new Paragraph({
        children: [new TextRun({ text: '' })],
        border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0', space: 4 } },
        spacing: { before: 160, after: 160 },
      }));
      continue;
    }
    if (/^  - /.test(line)) {
      children.push(new Paragraph({
        children: parseInline(line.slice(4)),
        indent: { left: convertInchesToTwip(0.75) },
        spacing: { after: 40 },
        bullet: { level: 1 },
      }));
      continue;
    }
    if (/^- /.test(line)) {
      children.push(new Paragraph({
        children: parseInline(line.slice(2)),
        indent: { left: convertInchesToTwip(0.375) },
        spacing: { after: 60 },
        bullet: { level: 0 },
      }));
      continue;
    }
    children.push(new Paragraph({
      children: parseInline(line),
      spacing: { after: 80 },
    }));
  }

  return children;
}

// ─── ELEGANT LAYOUT ─────────────────────────────────────────────────────────
// Serif-heavy, centered headers, ornamental dividers, wider margins feel.
function buildElegant(lines: string[], coupleName: string, weddingDate: string): Paragraph[] {
  const children: Paragraph[] = [];
  const font = 'Garamond';

  // Title block
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '~ ', color: 'C9A84C', size: 28, font }), new TextRun({ text: coupleName, bold: true, size: 44, font, color: '1E293B' }), new TextRun({ text: ' ~', color: 'C9A84C', size: 28, font })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: weddingDate, size: 24, font, color: '64748B', italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: '———', color: 'C9A84C', size: 20, font })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  );

  for (const line of lines) {
    if (!line.trim()) {
      children.push(new Paragraph({ children: [new TextRun({ text: '' })], spacing: { after: 60 } }));
      continue;
    }
    if (/^# /.test(line)) {
      children.push(new Paragraph({
        children: [new TextRun({ text: line.slice(2), bold: true, size: 36, font, color: '1E293B' })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 160 },
      }));
      continue;
    }
    if (/^## /.test(line)) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '— ', color: 'C9A84C', size: 20, font }), new TextRun({ text: line.slice(3), bold: true, size: 24, font, color: '334155' }), new TextRun({ text: ' —', color: 'C9A84C', size: 20, font })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 360, after: 140 },
        }),
      );
      continue;
    }
    if (/^### /.test(line)) {
      children.push(new Paragraph({
        children: [new TextRun({ text: line.slice(4), bold: true, size: 22, font, color: '475569', italics: true })],
        spacing: { before: 240, after: 80 },
      }));
      continue;
    }
    if (/^---/.test(line)) {
      children.push(new Paragraph({
        children: [new TextRun({ text: '· · ·', color: 'C9A84C', size: 18, font })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
      }));
      continue;
    }
    if (/^  - /.test(line)) {
      children.push(new Paragraph({
        children: parseInline(line.slice(4), { font, size: 20 }),
        indent: { left: convertInchesToTwip(0.75) },
        spacing: { after: 40 },
        bullet: { level: 1 },
      }));
      continue;
    }
    if (/^- /.test(line)) {
      children.push(new Paragraph({
        children: parseInline(line.slice(2), { font, size: 21 }),
        indent: { left: convertInchesToTwip(0.375) },
        spacing: { after: 60 },
        bullet: { level: 0 },
      }));
      continue;
    }
    children.push(new Paragraph({
      children: parseInline(line, { font, size: 21 }),
      spacing: { after: 80 },
    }));
  }

  return children;
}

// ─── GRID LAYOUT ────────────────────────────────────────────────────────────
// Sectioned phase cards. Each phase renders as its own shaded card with a
// colored accent dot, phase name, auto-derived time range, and chronological
// event rows (timestamp | title | optional sub-note).
function buildGrid(lines: string[], coupleName: string, weddingDate: string): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

  // Title block
  children.push(
    new Paragraph({
      children: [new TextRun({ text: coupleName, bold: true, size: 36, font: 'Georgia', color: '1E293B' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: weddingDate, size: 20, color: '64748B' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  );

  const phases = parsePhases(lines);

  for (const phase of phases) {
    if (phase.events.length === 0) continue;

    const style = getPhaseStyle(phase.name);
    const timeRange = getTimeRange(phase.events);
    const rows: TableRow[] = [];

    // ── Header row (merged across both columns)
    rows.push(new TableRow({
      children: [
        new TableCell({
          columnSpan: 2,
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: '●  ', color: style.accent, size: 18, font: 'Arial' }),
                new TextRun({ text: phase.name, bold: true, size: 22, font: 'Georgia', color: '1E293B' }),
                ...(timeRange ? [new TextRun({ text: `      ${timeRange}`, size: 17, color: '94A3B8' })] : []),
              ],
            }),
          ],
          shading: { type: ShadingType.CLEAR, fill: style.bg },
          margins: {
            top: convertInchesToTwip(0.12),
            bottom: convertInchesToTwip(0.12),
            left: convertInchesToTwip(0.2),
            right: convertInchesToTwip(0.2),
          },
        }),
      ],
    }));

    // ── Event rows
    for (const event of phase.events) {
      const titleParagraphs: Paragraph[] = [
        new Paragraph({
          children: [new TextRun({ text: event.title || '—', size: 20, font: 'Georgia', color: '334155' })],
          spacing: { after: event.notes.length > 0 ? 40 : 0 },
        }),
      ];
      if (event.notes.length > 0) {
        titleParagraphs.push(
          new Paragraph({
            children: [new TextRun({ text: event.notes.join(' · '), size: 17, color: '94A3B8', italics: true })],
          }),
        );
      }

      rows.push(new TableRow({
        children: [
          // Time column
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: event.time, bold: true, size: 19, font: 'Georgia', color: '475569' })],
              }),
            ],
            width: { size: 1400, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: style.bg },
            verticalAlign: VerticalAlign.TOP,
            margins: {
              top: convertInchesToTwip(0.07),
              bottom: convertInchesToTwip(0.07),
              left: convertInchesToTwip(0.2),
              right: convertInchesToTwip(0.05),
            },
          }),
          // Title + notes column
          new TableCell({
            children: titleParagraphs,
            shading: { type: ShadingType.CLEAR, fill: style.bg },
            verticalAlign: VerticalAlign.TOP,
            margins: {
              top: convertInchesToTwip(0.07),
              bottom: convertInchesToTwip(0.07),
              left: convertInchesToTwip(0.1),
              right: convertInchesToTwip(0.2),
            },
          }),
        ],
      }));
    }

    // ── Assemble card table
    children.push(new Table({
      rows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 2, color: 'E8E5DE' },
        bottom: { style: BorderStyle.SINGLE, size: 2, color: 'E8E5DE' },
        left: { style: BorderStyle.SINGLE, size: 2, color: 'E8E5DE' },
        right: { style: BorderStyle.SINGLE, size: 2, color: 'E8E5DE' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E8E5DE' },
        insideVertical: noBorder,
      },
    }));

    // Gap between cards
    children.push(new Paragraph({
      children: [new TextRun({ text: '' })],
      spacing: { after: 260 },
    }));
  }

  return children;
}

// ─── MAIN EXPORT ────────────────────────────────────────────────────────────
export async function buildDocx(
  content: string,
  coupleName: string,
  weddingDate: string,
  layout: ExportLayout = 'simple',
): Promise<Buffer> {
  const lines = content.split('\n');
  let children: (Paragraph | Table)[];

  switch (layout) {
    case 'elegant':
      children = buildElegant(lines, coupleName, weddingDate);
      break;
    case 'grid':
      children = buildGrid(lines, coupleName, weddingDate);
      break;
    default:
      children = buildSimple(lines, coupleName, weddingDate);
  }

  // Footer credit
  children.push(
    new Paragraph({ children: [new TextRun({ text: '' })], spacing: { before: 480 } }),
    new Paragraph({
      children: [new TextRun({ text: 'Generated by Sundial Timelines', size: 18, color: 'CBD5E1', italics: true })],
      alignment: AlignmentType.CENTER,
    }),
  );

  const margins = layout === 'elegant'
    ? { top: convertInchesToTwip(1.25), bottom: convertInchesToTwip(1.25), left: convertInchesToTwip(1.5), right: convertInchesToTwip(1.5) }
    : { top: convertInchesToTwip(1), bottom: convertInchesToTwip(1), left: convertInchesToTwip(1.25), right: convertInchesToTwip(1.25) };

  const doc = new Document({
    sections: [{
      properties: {
        page: { margin: margins },
      },
      children,
    }],
  });

  return Packer.toBuffer(doc);
}
