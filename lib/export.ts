import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
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
// Two-column: time on left, activity on right. Uses tables for structure.
function buildGrid(lines: string[], coupleName: string, weddingDate: string): Paragraph[] {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      children: [new TextRun({ text: coupleName, bold: true, size: 36, font: 'Georgia', color: '1E293B' })],
      alignment: AlignmentType.LEFT,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: weddingDate, size: 20, color: '64748B' })],
      alignment: AlignmentType.LEFT,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: '' })],
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'C9A84C', space: 4 } },
      spacing: { after: 300 },
    }),
  );

  // Parse into time blocks for the grid
  let currentTime = '';
  let currentBlock: string[] = [];

  const flushBlock = () => {
    if (!currentTime && currentBlock.length === 0) return;

    const tabParagraphs: Paragraph[] = [];

    // Time header line
    tabParagraphs.push(new Paragraph({
      children: [new TextRun({ text: currentTime || '', bold: true, size: 22, font: 'Georgia', color: 'C9A84C' })],
      border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0', space: 6 } },
      spacing: { before: 200, after: 60 },
    }));

    // Content lines indented
    for (const blockLine of currentBlock) {
      if (/^  - /.test(blockLine)) {
        tabParagraphs.push(new Paragraph({
          children: parseInline(blockLine.slice(4), { size: 19 }),
          indent: { left: convertInchesToTwip(0.5) },
          spacing: { after: 30 },
          bullet: { level: 1 },
        }));
      } else if (/^- /.test(blockLine)) {
        tabParagraphs.push(new Paragraph({
          children: parseInline(blockLine.slice(2), { size: 20 }),
          indent: { left: convertInchesToTwip(0.25) },
          spacing: { after: 40 },
          bullet: { level: 0 },
        }));
      } else {
        tabParagraphs.push(new Paragraph({
          children: parseInline(blockLine, { size: 20 }),
          indent: { left: convertInchesToTwip(0.25) },
          spacing: { after: 40 },
        }));
      }
    }

    children.push(...tabParagraphs);
    currentTime = '';
    currentBlock = [];
  };

  for (const line of lines) {
    if (!line.trim()) continue;

    // Detect time stamps (bold time like **3:00 PM**)
    const timeMatch = line.match(/^\*\*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm).*?)\*\*/);
    if (timeMatch) {
      flushBlock();
      currentTime = timeMatch[1];
      continue;
    }

    if (/^# /.test(line)) {
      flushBlock();
      children.push(new Paragraph({
        children: [new TextRun({ text: line.slice(2), bold: true, size: 32, font: 'Georgia', color: '1E293B' })],
        spacing: { before: 360, after: 160 },
      }));
      continue;
    }
    if (/^## /.test(line)) {
      flushBlock();
      children.push(new Paragraph({
        children: [new TextRun({ text: line.slice(3).toUpperCase(), bold: true, size: 20, color: '64748B', font: 'Georgia' })],
        spacing: { before: 300, after: 100 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: 'C9A84C', space: 4 } },
      }));
      continue;
    }
    if (/^### /.test(line)) {
      flushBlock();
      children.push(new Paragraph({
        children: [new TextRun({ text: line.slice(4), bold: true, size: 22, font: 'Georgia', color: '475569' })],
        spacing: { before: 200, after: 80 },
      }));
      continue;
    }
    if (/^---/.test(line)) {
      flushBlock();
      continue;
    }

    currentBlock.push(line);
  }
  flushBlock();

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
  let children: Paragraph[];

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
