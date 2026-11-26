export interface SelectOption {
  value: string;
  label: string;
}

export const AGE_YEAR_OPTIONS: readonly SelectOption[] = [
  { value: '', label: '未選択' },
  ...Array.from({ length: 7 }, (_, i) => ({
    value: String(i),
    label: `${i}歳`,
  })),
];

export const AGE_MONTH_OPTIONS: readonly SelectOption[] = [
  { value: '', label: '指定なし' },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i),
    label: `${i}ヶ月`,
  })),
];

export const MILK_VOLUME_OPTIONS: readonly SelectOption[] = [
  { value: '', label: '未選択' },
  ...Array.from({ length: 23 }, (_, i) => {
    const ml = 20 + i * 10;
    const text = `${ml}ml`;
    return { value: text, label: text };
  }),
  { value: '欲しがるだけ', label: '欲しがるだけ' },
];

export const MILK_INTERVAL_OPTIONS: readonly SelectOption[] = [
  { value: '', label: '未選択' },
  ...Array.from({ length: 11 }, (_, i) => {
    const hours = 1 + i * 0.5;
    const value = `${hours}時間`;
    return { value, label: `${value}おき` };
  }),
  { value: '欲しがった時', label: '欲しがった時' },
];

const AGE_YEAR_VALUES = new Set(
  AGE_YEAR_OPTIONS.filter((o) => o.value !== '').map((o) => o.value),
);
const AGE_MONTH_VALUES = new Set(
  AGE_MONTH_OPTIONS.filter((o) => o.value !== '').map((o) => o.value),
);
const MILK_VOLUME_VALUES = new Set(
  MILK_VOLUME_OPTIONS.filter((o) => o.value !== '').map((o) => o.value),
);
const MILK_INTERVAL_VALUES = new Set(
  MILK_INTERVAL_OPTIONS.filter((o) => o.value !== '').map((o) => o.value),
);

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

function normalizeText(value: string): string {
  return typeof value === 'string' ? value.normalize('NFKC') : '';
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return false;
  }
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function extractTime(normalizedText: string): string {
  const colonMatch = normalizedText.match(/(\d{1,2}):(\d{2})/);
  if (colonMatch && colonMatch[1] !== undefined && colonMatch[2] !== undefined) {
    const hour = Number.parseInt(colonMatch[1], 10);
    const minute = Number.parseInt(colonMatch[2], 10);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
  }

  const jpMatch = normalizedText.match(/(\d{1,2})\s*時(?:\s*(\d{1,2})\s*分)?/);
  if (jpMatch && jpMatch[1] !== undefined) {
    const hour = Number.parseInt(jpMatch[1], 10);
    const minute =
      jpMatch[2] !== undefined ? Number.parseInt(jpMatch[2], 10) : 0;
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
  }

  return '';
}

export function formatAgeText(years: string, months: string): string {
  const y = AGE_YEAR_VALUES.has(years) ? years : '';
  const m = AGE_MONTH_VALUES.has(months) ? months : '';

  if (y === '0' && m !== '') {
    return `生後${m}ヶ月`;
  }
  if (y === '0' && m === '') {
    return '0歳';
  }
  if (y !== '' && m !== '') {
    return `${y}歳${m}ヶ月`;
  }
  if (y !== '' && m === '') {
    return `${y}歳`;
  }
  if (y === '' && m !== '') {
    return `生後${m}ヶ月`;
  }
  return '';
}

export function parseAgeText(ageText: string): { years: string; months: string } {
  const normalized = normalizeText(ageText);
  if (!normalized.trim()) {
    return { years: '', months: '' };
  }

  const yearsMatch = normalized.match(/(\d+)\s*歳/);
  let years = '';
  if (yearsMatch && yearsMatch[1] !== undefined) {
    const parsedYear = String(Number.parseInt(yearsMatch[1], 10));
    if (AGE_YEAR_VALUES.has(parsedYear)) {
      years = parsedYear;
    }
  }

  const monthsMatch = normalized.match(/(\d+)\s*[ヶかカケヵ箇]?\s*月/);
  let months = '';
  if (monthsMatch && monthsMatch[1] !== undefined) {
    const parsedMonth = String(Number.parseInt(monthsMatch[1], 10));
    if (AGE_MONTH_VALUES.has(parsedMonth)) {
      months = parsedMonth;
    }
  }

  if (!yearsMatch && (months !== '' || normalized.includes('生後'))) {
    years = '0';
  }

  return { years, months };
}

export function formatDateLabel(dateStr: string, startTime: string): string {
  const normalizedDate = normalizeText(dateStr).trim();
  let formattedDate = '';
  const dateMatch = normalizedDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (
    dateMatch &&
    dateMatch[1] !== undefined &&
    dateMatch[2] !== undefined &&
    dateMatch[3] !== undefined
  ) {
    const year = Number.parseInt(dateMatch[1], 10);
    const month = Number.parseInt(dateMatch[2], 10);
    const day = Number.parseInt(dateMatch[3], 10);
    if (isValidCalendarDate(year, month, day)) {
      const localDate = new Date(year, month - 1, day);
      const weekday = WEEKDAYS[localDate.getDay()] ?? '';
      formattedDate = `${year}年${month}月${day}日(${weekday})`;
    }
  }

  const normalizedTime = normalizeText(startTime).trim();
  let formattedTime = '';
  const timeMatch = normalizedTime.match(/^(\d{2}):(\d{2})$/);
  if (timeMatch && timeMatch[1] !== undefined && timeMatch[2] !== undefined) {
    const hour = Number.parseInt(timeMatch[1], 10);
    const minute = Number.parseInt(timeMatch[2], 10);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      formattedTime = `${timeMatch[1]}:${timeMatch[2]}`;
    }
  }

  if (formattedDate && formattedTime) {
    return `${formattedDate} ${formattedTime}〜`;
  }
  if (formattedDate) {
    return formattedDate;
  }
  if (formattedTime) {
    return `${formattedTime}〜`;
  }
  return '';
}

export function parseDateLabel(dateLabel: string): {
  date: string;
  startTime: string;
} {
  const normalized = normalizeText(dateLabel);
  if (!normalized.trim()) {
    return { date: '', startTime: '' };
  }

  let date = '';
  const jpMatch = normalized.match(
    /(?:(\d{4})\s*年\s*)?(\d{1,2})\s*月\s*(\d{1,2})\s*日/,
  );
  if (jpMatch && jpMatch[2] !== undefined && jpMatch[3] !== undefined) {
    const year =
      jpMatch[1] !== undefined
        ? Number.parseInt(jpMatch[1], 10)
        : new Date().getFullYear();
    const month = Number.parseInt(jpMatch[2], 10);
    const day = Number.parseInt(jpMatch[3], 10);
    if (isValidCalendarDate(year, month, day)) {
      date = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  } else {
    const isoMatch = normalized.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (
      isoMatch &&
      isoMatch[1] !== undefined &&
      isoMatch[2] !== undefined &&
      isoMatch[3] !== undefined
    ) {
      const year = Number.parseInt(isoMatch[1], 10);
      const month = Number.parseInt(isoMatch[2], 10);
      const day = Number.parseInt(isoMatch[3], 10);
      if (isValidCalendarDate(year, month, day)) {
        date = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }

  return {
    date,
    startTime: extractTime(normalized),
  };
}

export function parseTimeValue(timeText: string): string {
  const normalized = normalizeText(timeText);
  if (!normalized.trim()) {
    return '';
  }
  return extractTime(normalized);
}

export function formatMilkAmount(volume: string, interval: string): string {
  const validVolume = MILK_VOLUME_VALUES.has(volume) ? volume : '';
  const validInterval = MILK_INTERVAL_VALUES.has(interval) ? interval : '';

  const formattedInterval =
    validInterval === ''
      ? ''
      : validInterval === '欲しがった時'
        ? '欲しがった時'
        : `${validInterval}おき`;

  if (validVolume && formattedInterval) {
    return `${validVolume} / ${formattedInterval}`;
  }
  if (validVolume) {
    return validVolume;
  }
  if (formattedInterval) {
    return formattedInterval;
  }
  return '';
}

export function parseMilkAmount(milkAmount: string): {
  volume: string;
  interval: string;
} {
  const normalized = normalizeText(milkAmount).toLowerCase();
  if (!normalized.trim()) {
    return { volume: '', interval: '' };
  }

  let volume = '';
  if (normalized.includes('欲しがるだけ')) {
    volume = '欲しがるだけ';
  } else {
    const mlMatch = normalized.match(/(\d+)\s*ml/);
    if (mlMatch && mlMatch[1] !== undefined) {
      const candidate = `${Number.parseInt(mlMatch[1], 10)}ml`;
      if (MILK_VOLUME_VALUES.has(candidate)) {
        volume = candidate;
      }
    }
  }

  let interval = '';
  if (normalized.includes('欲しがった時')) {
    interval = '欲しがった時';
  } else {
    const hourMatch = normalized.match(/(\d+(?:\.\d+)?)\s*時間/);
    if (hourMatch && hourMatch[1] !== undefined) {
      const num = Number.parseFloat(hourMatch[1]);
      if (!Number.isNaN(num)) {
        const candidate = `${num}時間`;
        if (MILK_INTERVAL_VALUES.has(candidate)) {
          interval = candidate;
        }
      }
    }
  }

  return { volume, interval };
}

export const TIME_HOUR_OPTIONS: readonly SelectOption[] = [
  { value: '', label: '--時' },
  ...Array.from({ length: 24 }, (_, i) => {
    const val = String(i).padStart(2, '0');
    return { value: val, label: `${val}時` };
  }),
];

export const TIME_MINUTE_STEP_OPTIONS: readonly SelectOption[] = [
  { value: '', label: '--分' },
  { value: '00', label: '00分' },
  { value: '15', label: '15分' },
  { value: '30', label: '30分' },
  { value: '45', label: '45分' },
];

export function splitTimeValue(time: string): { hour: string; minute: string } {
  const normalized = parseTimeValue(time);
  if (!normalized) {
    return { hour: '', minute: '' };
  }
  const [h, m] = normalized.split(':');
  return {
    hour: h ?? '',
    minute: m ?? '',
  };
}

export function joinTimeValue(hour: string, minute: string): string {
  if (!/^\d{2}$/.test(hour)) {
    return '';
  }
  const h = Number.parseInt(hour, 10);
  if (h < 0 || h > 23) {
    return '';
  }
  let validMinute = '00';
  if (/^\d{2}$/.test(minute)) {
    const m = Number.parseInt(minute, 10);
    if (m >= 0 && m <= 59) {
      validMinute = minute;
    }
  }
  return `${hour}:${validMinute}`;
}
