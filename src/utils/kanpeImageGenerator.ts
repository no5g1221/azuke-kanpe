import {
  FEEDING_MODE_LABELS,
  getVisibleFeedingFields,
  hasCareContent,
  hasContactsContent,
  hasSafetyContent,
  hasText,
  hasVisibleFeedingContent,
} from '../components/kanpeDisplay';
import type { KanpeData } from '../types/kanpe';

const LOGICAL_WIDTH = 760;
const OUTER_PADDING = 28;
const CARD_WIDTH = LOGICAL_WIDTH - OUTER_PADDING * 2; // 704px
const CARD_PADDING = 22;
const CARD_CONTENT_WIDTH = CARD_WIDTH - CARD_PADDING * 2; // 660px
const CARD_GAP = 18;

const MAX_CANVAS_AREA = 12_000_000;
const MAX_CANVAS_HEIGHT = 8000;

const FONT_SANS =
  "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Noto Sans JP', system-ui, -apple-system, sans-serif";
const FONT_MONO =
  "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Courier New', monospace";

const COLOR = {
  bg: '#fafaf9',
  slate800: '#1e293b',
  slate600: '#475569',
  slate300: '#cbd5e1',
  slate200: '#e2e8f0',
  slate900: '#0f172a',
  white: '#ffffff',
  stone900: '#1c1917',
  stone700: '#44403c',
  stone500: '#78716c',
  stone400: '#a8a29e',
  stone300: '#d6d3d1',
  stone200: '#e7e5e4',
  red50: '#fef2f2',
  red200: '#fecaca',
  red500: '#ef4444',
  red600: '#dc2626',
  red800: '#991b1b',
  red900: '#7f1d1d',
  red950: '#450a0a',
} as const;

function makeFont(size: number, weight: 400 | 500 | 600 | 700, family = FONT_SANS): string {
  return `${weight} ${size}px ${family}`;
}

function drawRoundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const paragraphs = text.split(/\r\n|\n/);
  const result: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      result.push('');
      continue;
    }

    let current = '';
    for (const ch of paragraph) {
      const candidate = current + ch;
      if (current.length > 0 && ctx.measureText(candidate).width > maxWidth) {
        result.push(current);
        current = ch;
      } else {
        current = candidate;
      }
    }
    if (current.length > 0) {
      result.push(current);
    }
  }

  return result;
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
): number {
  let cursorY = y;
  for (const line of lines) {
    if (line.length > 0) {
      ctx.fillText(line, x, cursorY);
    }
    cursorY += lineHeight;
  }
  return cursorY;
}

function drawWarningTriangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  const s = size / 24;
  ctx.save();
  ctx.strokeStyle = COLOR.red600;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(x + 12 * s, y + 3 * s);
  ctx.lineTo(x + 21.3 * s, y + 19.5 * s);
  ctx.arcTo(x + 22 * s, y + 21 * s, x + 20 * s, y + 21 * s, 1.8 * s);
  ctx.lineTo(x + 4 * s, y + 21 * s);
  ctx.arcTo(x + 2 * s, y + 21 * s, x + 2.7 * s, y + 19.5 * s, 1.8 * s);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + 12 * s, y + 9 * s);
  ctx.lineTo(x + 12 * s, y + 13.5 * s);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x + 12 * s, y + 17 * s, 1.1 * s, 0, Math.PI * 2);
  ctx.fillStyle = COLOR.red600;
  ctx.fill();
  ctx.restore();
}

function formatUpdatedAt(isoString: string): string {
  const timestamp = Date.parse(isoString);
  if (Number.isNaN(timestamp)) {
    return '';
  }
  return new Date(timestamp).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface LayoutBlock {
  height: number;
  draw: (ctx: CanvasRenderingContext2D, y: number) => void;
}

function buildHeaderBlock(
  ctx: CanvasRenderingContext2D,
  data: KanpeData,
): LayoutBlock {
  const nicknameText = hasText(data.profile.nickname)
    ? data.profile.nickname.trim()
    : 'お子さま';
  const ageText = hasText(data.profile.ageText)
    ? `（${data.profile.ageText.trim()}）`
    : '';
  const dateText = hasText(data.profile.dateLabel)
    ? data.profile.dateLabel.trim()
    : '';
  const returnTimeText = hasText(data.profile.returnTime)
    ? data.profile.returnTime.trim()
    : '';

  const badgePadX = 16;
  const badgePadY = 10;
  const badgeLabel = '帰宅予定';

  let badgeW = 0;
  let badgeH = 0;
  let returnLines: string[] = [];

  if (returnTimeText) {
    ctx.font = makeFont(15, 600);
    const labelW = ctx.measureText(badgeLabel).width;
    ctx.font = makeFont(26, 700);
    const timeW = ctx.measureText(returnTimeText).width;
    const maxBadgeW = 240;
    const innerMaxW = maxBadgeW - badgePadX * 2;
    returnLines =
      timeW > innerMaxW
        ? wrapText(ctx, returnTimeText, innerMaxW)
        : [returnTimeText];
    const widestTimeLine = returnLines.reduce(
      (max, line) => Math.max(max, ctx.measureText(line).width),
      0,
    );
    badgeW = Math.min(maxBadgeW, Math.max(labelW, widestTimeLine) + badgePadX * 2);
    badgeH = badgePadY * 2 + 20 + 4 + returnLines.length * 32;
  }

  const leftMaxW = returnTimeText
    ? CARD_CONTENT_WIDTH - badgeW - 18
    : CARD_CONTENT_WIDTH;

  ctx.font = makeFont(32, 700);
  const nicknameLines = wrapText(ctx, nicknameText, leftMaxW);
  const lastNickLine = nicknameLines[nicknameLines.length - 1] ?? '';
  const lastNickLineW = ctx.measureText(lastNickLine).width;

  ctx.font = makeFont(20, 500);
  const ageW = ageText ? ctx.measureText(ageText).width : 0;
  const ageInline = Boolean(ageText) && lastNickLineW + 8 + ageW <= leftMaxW;
  const ageLines = ageText && !ageInline ? wrapText(ctx, ageText, leftMaxW) : [];

  ctx.font = makeFont(18, 600);
  const dateLines = dateText ? wrapText(ctx, dateText, leftMaxW) : [];

  const titleLineH = 40;
  const ageLineH = 28;
  const dateLineH = 26;

  let leftH = 22 + 8; // top label height + gap
  leftH += nicknameLines.length * titleLineH;
  if (ageLines.length > 0) {
    leftH += 4 + ageLines.length * ageLineH;
  }
  if (dateLines.length > 0) {
    leftH += 8 + dateLines.length * dateLineH;
  }

  const contentH = Math.max(leftH, badgeH);
  const totalH = CARD_PADDING * 2 + contentH;

  return {
    height: totalH,
    draw(drawCtx, cardY) {
      drawRoundRectPath(drawCtx, OUTER_PADDING, cardY, CARD_WIDTH, totalH, 18);
      drawCtx.fillStyle = COLOR.slate800;
      drawCtx.fill();

      const x = OUTER_PADDING + CARD_PADDING;
      let y = cardY + CARD_PADDING;

      drawCtx.font = makeFont(15, 600);
      drawCtx.fillStyle = COLOR.slate300;
      drawCtx.fillText('おあずかりカンペ', x, y);
      y += 22 + 8;

      drawCtx.font = makeFont(32, 700);
      drawCtx.fillStyle = COLOR.white;
      const nickEndY = drawLines(drawCtx, nicknameLines, x, y, titleLineH);

      if (ageText && ageInline) {
        drawCtx.font = makeFont(20, 500);
        drawCtx.fillStyle = COLOR.slate200;
        const lastLineW = (() => {
          drawCtx.font = makeFont(32, 700);
          return drawCtx.measureText(lastNickLine).width;
        })();
        drawCtx.font = makeFont(20, 500);
        drawCtx.fillText(ageText, x + lastLineW + 8, nickEndY - titleLineH + 9);
      }

      y = nickEndY;
      if (ageLines.length > 0) {
        y += 4;
        drawCtx.font = makeFont(20, 500);
        drawCtx.fillStyle = COLOR.slate200;
        y = drawLines(drawCtx, ageLines, x, y, ageLineH);
      }

      if (dateLines.length > 0) {
        y += 8;
        drawCtx.font = makeFont(18, 600);
        drawCtx.fillStyle = COLOR.slate200;
        drawLines(drawCtx, dateLines, x, y, dateLineH);
      }

      if (returnTimeText) {
        const bx = OUTER_PADDING + CARD_WIDTH - CARD_PADDING - badgeW;
        const by = cardY + CARD_PADDING + Math.max(0, (contentH - badgeH) / 2);
        drawRoundRectPath(drawCtx, bx, by, badgeW, badgeH, 12);
        drawCtx.fillStyle = COLOR.white;
        drawCtx.fill();

        drawCtx.font = makeFont(15, 600);
        drawCtx.fillStyle = COLOR.slate600;
        drawCtx.fillText(badgeLabel, bx + badgePadX, by + badgePadY);

        drawCtx.font = makeFont(26, 700);
        drawCtx.fillStyle = COLOR.slate900;
        drawLines(
          drawCtx,
          returnLines,
          bx + badgePadX,
          by + badgePadY + 24,
          32,
        );
      }
    },
  };
}

function buildSafetyBlock(
  ctx: CanvasRenderingContext2D,
  data: KanpeData,
): LayoutBlock | null {
  if (!data.safety.enabled || !hasSafetyContent(data.safety)) {
    return null;
  }

  const allergies = data.safety.allergies.filter(hasText);
  const ngList = data.safety.ngList.filter(hasText);
  const hasMedical = hasText(data.safety.medicalNote);

  const bodyLineH = 31; // 20px * 1.55
  const labelLineH = 22;
  const headingH = 30;

  ctx.font = makeFont(20, 700);
  const allergyLinesList = allergies.map((item) =>
    wrapText(ctx, `・${item.trim()}`, CARD_CONTENT_WIDTH),
  );

  ctx.font = makeFont(20, 600);
  const ngLinesList = ngList.map((item) =>
    wrapText(ctx, `・${item.trim()}`, CARD_CONTENT_WIDTH),
  );

  ctx.font = makeFont(20, 400);
  const medicalLines = hasMedical
    ? wrapText(ctx, data.safety.medicalNote.trim(), CARD_CONTENT_WIDTH)
    : [];

  let innerH = headingH;

  if (allergyLinesList.length > 0) {
    innerH += 14 + labelLineH + 6;
    for (let i = 0; i < allergyLinesList.length; i += 1) {
      const lines = allergyLinesList[i];
      if (!lines) continue;
      innerH += lines.length * bodyLineH + (i < allergyLinesList.length - 1 ? 4 : 0);
    }
  }

  if (ngLinesList.length > 0) {
    innerH += 14 + labelLineH + 6;
    for (let i = 0; i < ngLinesList.length; i += 1) {
      const lines = ngLinesList[i];
      if (!lines) continue;
      innerH += lines.length * bodyLineH + (i < ngLinesList.length - 1 ? 4 : 0);
    }
  }

  if (medicalLines.length > 0) {
    innerH += 14 + 1 + 12 + labelLineH + 6 + medicalLines.length * bodyLineH;
  }

  const totalH = CARD_PADDING * 2 + innerH;

  return {
    height: totalH,
    draw(drawCtx, cardY) {
      drawRoundRectPath(drawCtx, OUTER_PADDING, cardY, CARD_WIDTH, totalH, 16);
      drawCtx.fillStyle = COLOR.red50;
      drawCtx.fill();
      drawCtx.lineWidth = 2.5;
      drawCtx.strokeStyle = COLOR.red500;
      drawCtx.stroke();

      const x = OUTER_PADDING + CARD_PADDING;
      let y = cardY + CARD_PADDING;

      drawWarningTriangle(drawCtx, x, y + 2, 24);
      drawCtx.font = makeFont(22, 700);
      drawCtx.fillStyle = COLOR.red900;
      drawCtx.fillText('最優先：絶対NG・アレルギー', x + 32, y + 2);
      y += headingH;

      if (allergyLinesList.length > 0) {
        y += 14;
        drawCtx.font = makeFont(16, 700);
        drawCtx.fillStyle = COLOR.red800;
        drawCtx.fillText('アレルギー', x, y);
        y += labelLineH + 6;

        drawCtx.font = makeFont(20, 700);
        drawCtx.fillStyle = COLOR.red950;
        for (let i = 0; i < allergyLinesList.length; i += 1) {
          const lines = allergyLinesList[i];
          if (!lines) continue;
          y = drawLines(drawCtx, lines, x, y, bodyLineH);
          if (i < allergyLinesList.length - 1) y += 4;
        }
      }

      if (ngLinesList.length > 0) {
        y += 14;
        drawCtx.font = makeFont(16, 700);
        drawCtx.fillStyle = COLOR.red800;
        drawCtx.fillText('してはいけないこと', x, y);
        y += labelLineH + 6;

        drawCtx.font = makeFont(20, 600);
        drawCtx.fillStyle = COLOR.red950;
        for (let i = 0; i < ngLinesList.length; i += 1) {
          const lines = ngLinesList[i];
          if (!lines) continue;
          y = drawLines(drawCtx, lines, x, y, bodyLineH);
          if (i < ngLinesList.length - 1) y += 4;
        }
      }

      if (medicalLines.length > 0) {
        y += 14;
        drawCtx.beginPath();
        drawCtx.moveTo(x, y);
        drawCtx.lineTo(x + CARD_CONTENT_WIDTH, y);
        drawCtx.lineWidth = 1;
        drawCtx.strokeStyle = COLOR.red200;
        drawCtx.stroke();
        y += 13;

        drawCtx.font = makeFont(16, 700);
        drawCtx.fillStyle = COLOR.red800;
        drawCtx.fillText('持病・受診・お薬メモ', x, y);
        y += labelLineH + 6;

        drawCtx.font = makeFont(20, 400);
        drawCtx.fillStyle = COLOR.red950;
        drawLines(drawCtx, medicalLines, x, y, bodyLineH);
      }
    },
  };
}

interface TextFieldSpec {
  label: string;
  value: string;
}

function buildStandardTextCard(
  ctx: CanvasRenderingContext2D,
  title: string,
  fields: TextFieldSpec[],
): LayoutBlock | null {
  const activeFields = fields.filter((f) => hasText(f.value));
  if (activeFields.length === 0) {
    return null;
  }

  const headingH = 28;
  const labelH = 22;
  const bodyLineH = 31; // 20px * 1.55

  ctx.font = makeFont(20, 400);
  const prepared = activeFields.map((f) => ({
    label: f.label,
    lines: wrapText(ctx, f.value.trim(), CARD_CONTENT_WIDTH),
  }));

  let innerH = headingH + 10 + 1 + 14; // heading + pad + divider + gap
  for (let i = 0; i < prepared.length; i += 1) {
    const item = prepared[i];
    if (!item) continue;
    innerH += labelH + 5 + item.lines.length * bodyLineH;
    if (i < prepared.length - 1) {
      innerH += 14;
    }
  }

  const totalH = CARD_PADDING * 2 + innerH;

  return {
    height: totalH,
    draw(drawCtx, cardY) {
      drawRoundRectPath(drawCtx, OUTER_PADDING, cardY, CARD_WIDTH, totalH, 16);
      drawCtx.fillStyle = COLOR.white;
      drawCtx.fill();
      drawCtx.lineWidth = 1.5;
      drawCtx.strokeStyle = COLOR.stone300;
      drawCtx.stroke();

      const x = OUTER_PADDING + CARD_PADDING;
      let y = cardY + CARD_PADDING;

      drawCtx.font = makeFont(21, 700);
      drawCtx.fillStyle = COLOR.stone900;
      drawCtx.fillText(title, x, y);
      y += headingH + 10;

      drawCtx.beginPath();
      drawCtx.moveTo(x, y);
      drawCtx.lineTo(x + CARD_CONTENT_WIDTH, y);
      drawCtx.lineWidth = 1;
      drawCtx.strokeStyle = COLOR.stone200;
      drawCtx.stroke();
      y += 15;

      for (let i = 0; i < prepared.length; i += 1) {
        const item = prepared[i];
        if (!item) continue;

        drawCtx.font = makeFont(16, 700);
        drawCtx.fillStyle = COLOR.stone500;
        drawCtx.fillText(item.label, x, y);
        y += labelH + 5;

        drawCtx.font = makeFont(20, 400);
        drawCtx.fillStyle = COLOR.stone900;
        y = drawLines(drawCtx, item.lines, x, y, bodyLineH);

        if (i < prepared.length - 1) {
          y += 14;
        }
      }
    },
  };
}

function buildFeedingBlock(
  ctx: CanvasRenderingContext2D,
  data: KanpeData,
): LayoutBlock | null {
  if (!data.feeding.enabled || !hasVisibleFeedingContent(data.feeding)) {
    return null;
  }

  const { showMilk, showFood } = getVisibleFeedingFields(data.feeding);
  const fields: TextFieldSpec[] = [];

  if (showMilk) {
    fields.push(
      { label: 'ミルク量・間隔', value: data.feeding.milkAmount },
      { label: '作り方・哺乳瓶の場所', value: data.feeding.milkHowTo },
    );
  }
  if (showFood) {
    fields.push(
      { label: '離乳食・ごはん', value: data.feeding.foodRules },
      { label: 'おやつルール', value: data.feeding.snackRules },
    );
  }
  fields.push({ label: '水分補給', value: data.feeding.waterNote });

  return buildStandardTextCard(
    ctx,
    `授乳・食事（${FEEDING_MODE_LABELS[data.feeding.mode]}）`,
    fields,
  );
}

function buildCareBlock(
  ctx: CanvasRenderingContext2D,
  data: KanpeData,
): LayoutBlock | null {
  if (!data.care.enabled || !hasCareContent(data.care)) {
    return null;
  }

  return buildStandardTextCard(ctx, 'お世話・生活ルーティン', [
    { label: '寝かしつけ・昼寝', value: data.care.sleepHowTo },
    { label: 'オムツ・トイレ', value: data.care.diaperToilet },
    { label: '泣き止むコツ・好きな遊び', value: data.care.cryingTips },
    { label: '着替え・持ち物の置き場所', value: data.care.itemLocations },
  ]);
}

function buildChecklistBlock(
  ctx: CanvasRenderingContext2D,
  data: KanpeData,
): LayoutBlock | null {
  if (!data.checklist.enabled) {
    return null;
  }
  const items = data.checklist.items.filter((item) => hasText(item.text));
  if (items.length === 0) {
    return null;
  }

  const headingH = 28;
  const timePlaceholder = '____:____';
  ctx.font = makeFont(16, 400, FONT_MONO);
  const timeColW = Math.ceil(ctx.measureText(timePlaceholder).width);

  const boxSize = 20;
  const boxGap = 12;
  const timeGap = 14;
  const textMaxW = CARD_CONTENT_WIDTH - boxSize - boxGap - timeColW - timeGap;
  const rowLineH = 30;

  ctx.font = makeFont(20, 400);
  const preparedRows = items.map((item) => {
    const lines = wrapText(ctx, item.text.trim(), textMaxW);
    const rowH = Math.max(30, lines.length * rowLineH);
    return { lines, rowH };
  });

  let innerH = headingH + 10 + 1 + 14;
  for (let i = 0; i < preparedRows.length; i += 1) {
    const row = preparedRows[i];
    if (!row) continue;
    innerH += row.rowH;
    if (i < preparedRows.length - 1) {
      innerH += 12;
    }
  }

  const totalH = CARD_PADDING * 2 + innerH;

  return {
    height: totalH,
    draw(drawCtx, cardY) {
      drawRoundRectPath(drawCtx, OUTER_PADDING, cardY, CARD_WIDTH, totalH, 16);
      drawCtx.fillStyle = COLOR.white;
      drawCtx.fill();
      drawCtx.lineWidth = 1.5;
      drawCtx.strokeStyle = COLOR.stone300;
      drawCtx.stroke();

      const x = OUTER_PADDING + CARD_PADDING;
      let y = cardY + CARD_PADDING;

      drawCtx.font = makeFont(21, 700);
      drawCtx.fillStyle = COLOR.stone900;
      drawCtx.fillText('手書きチェックリスト', x, y);
      y += headingH + 10;

      drawCtx.beginPath();
      drawCtx.moveTo(x, y);
      drawCtx.lineTo(x + CARD_CONTENT_WIDTH, y);
      drawCtx.lineWidth = 1;
      drawCtx.strokeStyle = COLOR.stone200;
      drawCtx.stroke();
      y += 15;

      for (let i = 0; i < preparedRows.length; i += 1) {
        const row = preparedRows[i];
        if (!row) continue;

        drawRoundRectPath(drawCtx, x, y + 4, boxSize, boxSize, 4);
        drawCtx.lineWidth = 2;
        drawCtx.strokeStyle = COLOR.stone700;
        drawCtx.stroke();

        drawCtx.font = makeFont(20, 400);
        drawCtx.fillStyle = COLOR.stone900;
        drawLines(drawCtx, row.lines, x + boxSize + boxGap, y, rowLineH);

        drawCtx.font = makeFont(16, 400, FONT_MONO);
        drawCtx.fillStyle = COLOR.stone400;
        drawCtx.fillText(
          timePlaceholder,
          x + CARD_CONTENT_WIDTH - timeColW,
          y + 4,
        );

        y += row.rowH;
        if (i < preparedRows.length - 1) {
          y += 12;
        }
      }
    },
  };
}

function buildContactsBlock(
  ctx: CanvasRenderingContext2D,
  data: KanpeData,
  includeContacts: boolean,
): LayoutBlock | null {
  if (
    !includeContacts ||
    !data.contacts.enabled ||
    !hasContactsContent(data.contacts)
  ) {
    return null;
  }

  const rawEntries = [
    {
      role: '連絡先 1',
      name: data.contacts.primaryName,
      phone: data.contacts.primaryPhone,
    },
    {
      role: '連絡先 2',
      name: data.contacts.secondaryName,
      phone: data.contacts.secondaryPhone,
    },
    {
      role: 'かかりつけ医 / 小児救急',
      name: data.contacts.hospitalName,
      phone: data.contacts.hospitalPhone,
    },
  ].filter((entry) => hasText(entry.name) || hasText(entry.phone));

  if (rawEntries.length === 0) {
    return null;
  }

  const headingH = 28;
  const roleH = 21;
  const nameLineH = 27;
  const phoneLineH = 31;

  const prepared = rawEntries.map((entry) => {
    ctx.font = makeFont(19, 700);
    const nameLines = hasText(entry.name)
      ? wrapText(ctx, entry.name.trim(), CARD_CONTENT_WIDTH)
      : [];
    ctx.font = makeFont(23, 700, FONT_MONO);
    const phoneLines = hasText(entry.phone)
      ? wrapText(ctx, entry.phone.trim(), CARD_CONTENT_WIDTH)
      : [];
    return {
      role: entry.role,
      nameLines,
      phoneLines,
    };
  });

  let innerH = headingH + 10 + 1 + 14;
  for (let i = 0; i < prepared.length; i += 1) {
    const entry = prepared[i];
    if (!entry) continue;
    innerH += roleH + 4;
    if (entry.nameLines.length > 0) {
      innerH += entry.nameLines.length * nameLineH;
    }
    if (entry.phoneLines.length > 0) {
      innerH += (entry.nameLines.length > 0 ? 4 : 0) + entry.phoneLines.length * phoneLineH;
    }
    if (i < prepared.length - 1) {
      innerH += 14;
    }
  }

  const totalH = CARD_PADDING * 2 + innerH;

  return {
    height: totalH,
    draw(drawCtx, cardY) {
      drawRoundRectPath(drawCtx, OUTER_PADDING, cardY, CARD_WIDTH, totalH, 16);
      drawCtx.fillStyle = COLOR.white;
      drawCtx.fill();
      drawCtx.lineWidth = 1.5;
      drawCtx.strokeStyle = COLOR.stone300;
      drawCtx.stroke();

      const x = OUTER_PADDING + CARD_PADDING;
      let y = cardY + CARD_PADDING;

      drawCtx.font = makeFont(21, 700);
      drawCtx.fillStyle = COLOR.stone900;
      drawCtx.fillText('緊急連絡先', x, y);
      y += headingH + 10;

      drawCtx.beginPath();
      drawCtx.moveTo(x, y);
      drawCtx.lineTo(x + CARD_CONTENT_WIDTH, y);
      drawCtx.lineWidth = 1;
      drawCtx.strokeStyle = COLOR.stone200;
      drawCtx.stroke();
      y += 15;

      for (let i = 0; i < prepared.length; i += 1) {
        const entry = prepared[i];
        if (!entry) continue;

        drawCtx.font = makeFont(16, 700);
        drawCtx.fillStyle = COLOR.stone500;
        drawCtx.fillText(entry.role, x, y);
        y += roleH + 4;

        if (entry.nameLines.length > 0) {
          drawCtx.font = makeFont(19, 700);
          drawCtx.fillStyle = COLOR.stone900;
          y = drawLines(drawCtx, entry.nameLines, x, y, nameLineH);
        }

        if (entry.phoneLines.length > 0) {
          if (entry.nameLines.length > 0) {
            y += 4;
          }
          drawCtx.font = makeFont(23, 700, FONT_MONO);
          drawCtx.fillStyle = COLOR.slate900;
          y = drawLines(drawCtx, entry.phoneLines, x, y, phoneLineH);
        }

        if (i < prepared.length - 1) {
          y += 14;
        }
      }
    },
  };
}

function buildFooterBlock(data: KanpeData): LayoutBlock {
  const updatedText = formatUpdatedAt(data.updatedAt);
  const rightText = updatedText ? `更新：${updatedText}` : '';
  const totalH = 30;

  return {
    height: totalH,
    draw(drawCtx, y) {
      drawCtx.beginPath();
      drawCtx.moveTo(OUTER_PADDING, y);
      drawCtx.lineTo(OUTER_PADDING + CARD_WIDTH, y);
      drawCtx.lineWidth = 1;
      drawCtx.strokeStyle = COLOR.stone200;
      drawCtx.stroke();

      const textY = y + 10;
      drawCtx.font = makeFont(14, 400);
      drawCtx.fillStyle = COLOR.stone400;
      drawCtx.fillText('作成：あずけカンペ', OUTER_PADDING, textY);

      if (rightText) {
        const w = drawCtx.measureText(rightText).width;
        drawCtx.fillText(rightText, OUTER_PADDING + CARD_WIDTH - w, textY);
      }
    },
  };
}

export function buildKanpeImageFilename(data: KanpeData): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePart = `${yyyy}${mm}${dd}`;

  const rawNickname = data.profile.nickname ?? '';
  const sanitized = Array.from(
    rawNickname
      .normalize('NFKC')
      .replace(/[\\/:*?"<>|\s.#%&{}$!'@`+=^~,;\[\]()]/g, ''),
  )
    .slice(0, 12)
    .join('');

  return sanitized
    ? `azuke-kanpe-${sanitized}-${datePart}.png`
    : `azuke-kanpe-${datePart}.png`;
}

export async function generateKanpePngBlob(
  data: KanpeData,
  options: { includeContacts: boolean },
): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('ブラウザ環境でのみ画像を生成できます');
  }

  if (document.fonts && typeof document.fonts.ready?.then === 'function') {
    await document.fonts.ready.catch(() => undefined);
  }

  const measureCanvas = document.createElement('canvas');
  measureCanvas.width = 1;
  measureCanvas.height = 1;
  const measureCtx = measureCanvas.getContext('2d');
  if (!measureCtx) {
    throw new Error('Canvas 2D コンテキストを取得できませんでした');
  }
  measureCtx.textBaseline = 'top';

  const blocks: LayoutBlock[] = [];
  blocks.push(buildHeaderBlock(measureCtx, data));

  const maybeBlocks: Array<LayoutBlock | null> = [
    buildSafetyBlock(measureCtx, data),
    buildFeedingBlock(measureCtx, data),
    buildCareBlock(measureCtx, data),
    buildChecklistBlock(measureCtx, data),
    buildContactsBlock(measureCtx, data, options.includeContacts),
  ];
  for (const block of maybeBlocks) {
    if (block) {
      blocks.push(block);
    }
  }
  blocks.push(buildFooterBlock(data));

  const contentHeight = blocks.reduce((sum, b) => sum + b.height, 0);
  const gapsHeight = Math.max(0, blocks.length - 1) * CARD_GAP;
  const totalHeight = OUTER_PADDING + contentHeight + gapsHeight + OUTER_PADDING;

  let scale = 2;
  if (LOGICAL_WIDTH * scale * totalHeight * scale > MAX_CANVAS_AREA) {
    scale = Math.sqrt(MAX_CANVAS_AREA / (LOGICAL_WIDTH * totalHeight));
  }
  if (totalHeight * scale > MAX_CANVAS_HEIGHT) {
    scale = MAX_CANVAS_HEIGHT / totalHeight;
  }
  scale = Math.max(1, scale);

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(LOGICAL_WIDTH * scale);
  canvas.height = Math.round(totalHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D コンテキストを取得できませんでした');
  }

  ctx.scale(scale, scale);
  ctx.textBaseline = 'top';

  ctx.fillStyle = COLOR.bg;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, totalHeight);

  let cursorY = OUTER_PADDING;
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    if (!block) continue;
    block.draw(ctx, cursorY);
    cursorY += block.height;
    if (i < blocks.length - 1) {
      cursorY += CARD_GAP;
    }
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(
          new Error('画像の生成に失敗しました（端末のメモリ不足の可能性があります）'),
        );
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}
