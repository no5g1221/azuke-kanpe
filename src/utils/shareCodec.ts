import {
  type AgePreset,
  type FeedingMode,
  KANPE_VERSION,
  type KanpeData,
  normalizeKanpeData,
} from '../types/kanpe';

const HASH_PREFIX_RAW = '#d=';
const HASH_PREFIX_COMPRESSED = '#z=';

const PRESET_TO_SHORT: Record<AgePreset, 'i' | 't'> = {
  infant: 'i',
  toddler: 't',
};

const SHORT_TO_PRESET: Record<string, AgePreset> = {
  i: 'infant',
  t: 'toddler',
};

const FEEDING_TO_SHORT: Record<FeedingMode, 'm' | 'x' | 'f'> = {
  milk: 'm',
  mixed: 'x',
  food: 'f',
};

const SHORT_TO_FEEDING: Record<string, FeedingMode> = {
  m: 'milk',
  x: 'mixed',
  f: 'food',
};

const PROFILE_KEY_MAP = {
  nickname: 'n',
  ageText: 'a',
  dateLabel: 'd',
  returnTime: 'r',
} as const;

const CARE_KEY_MAP = {
  sleepHowTo: 'sh',
  diaperToilet: 'dt',
  cryingTips: 'ct',
  itemLocations: 'il',
} as const;

const CONTACTS_KEY_MAP = {
  primaryName: 'pn',
  primaryPhone: 'pp',
  secondaryName: 'sn',
  secondaryPhone: 'sp',
  hospitalName: 'hn',
  hospitalPhone: 'hp',
} as const;

const FEEDING_STR_KEY_MAP = {
  milkAmount: 'ma',
  milkHowTo: 'mh',
  foodRules: 'fr',
  snackRules: 'sr',
  waterNote: 'wn',
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function setIfNonEmptyString(
  target: Record<string, unknown>,
  key: string,
  value: string,
): void {
  if (value.length > 0) {
    target[key] = value;
  }
}

function compactStringFields<M extends Record<string, string>>(
  source: { [K in keyof M]: string },
  keyMap: M,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(keyMap) as Array<keyof M>) {
    const shortKey = keyMap[key];
    const val = source[key];
    if (shortKey && val.length > 0) {
      out[shortKey] = val;
    }
  }
  return out;
}

function expandStringFields(
  source: Record<string, unknown>,
  keyMap: Record<string, string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [longKey, shortKey] of Object.entries(keyMap)) {
    if (typeof source[shortKey] === 'string') {
      out[longKey] = source[shortKey];
    }
  }
  return out;
}

function fromCompactFlag(value: unknown): boolean {
  if (value === 0 || value === false) {
    return false;
  }
  return true;
}

function encodeShortTimestamp(isoString: string): string {
  const ms = Date.parse(isoString);
  if (Number.isNaN(ms) || ms < 0) {
    return '';
  }
  return Math.floor(ms / 60000).toString(36);
}

function decodeShortTimestamp(raw: unknown): unknown {
  if (typeof raw !== 'string' || raw.length === 0) {
    return undefined;
  }
  if (raw.includes('-') || raw.includes(':')) {
    return raw;
  }
  if (/^[0-9a-z]+$/i.test(raw)) {
    const minutes = Number.parseInt(raw, 36);
    if (Number.isFinite(minutes) && minutes >= 0) {
      return new Date(minutes * 60000).toISOString();
    }
  }
  return undefined;
}

function compactKanpe(data: KanpeData): Record<string, unknown> {
  const pr = compactStringFields(data.profile, PROFILE_KEY_MAP);

  const root: Record<string, unknown> = {
    v: KANPE_VERSION,
    p: PRESET_TO_SHORT[data.preset],
  };

  const shortUpdatedAt = encodeShortTimestamp(data.updatedAt);
  setIfNonEmptyString(root, 'u', shortUpdatedAt);

  if (Object.keys(pr).length > 0) {
    root.pr = pr;
  }

  if (!data.safety.enabled) {
    root.s = { e: 0 };
  } else {
    const s: Record<string, unknown> = {};
    if (data.safety.allergies.length > 0) {
      s.a = data.safety.allergies;
    }
    if (data.safety.ngList.length > 0) {
      s.n = data.safety.ngList;
    }
    setIfNonEmptyString(s, 'm', data.safety.medicalNote);
    if (Object.keys(s).length > 0) {
      root.s = s;
    }
  }

  if (!data.feeding.enabled) {
    root.f = { e: 0 };
  } else {
    root.f = {
      m: FEEDING_TO_SHORT[data.feeding.mode],
      ...compactStringFields(
        {
          milkAmount: data.feeding.milkAmount,
          milkHowTo: data.feeding.milkHowTo,
          foodRules: data.feeding.foodRules,
          snackRules: data.feeding.snackRules,
          waterNote: data.feeding.waterNote,
        },
        FEEDING_STR_KEY_MAP,
      ),
    };
  }

  if (!data.care.enabled) {
    root.c = { e: 0 };
  } else {
    const c = compactStringFields(
      {
        sleepHowTo: data.care.sleepHowTo,
        diaperToilet: data.care.diaperToilet,
        cryingTips: data.care.cryingTips,
        itemLocations: data.care.itemLocations,
      },
      CARE_KEY_MAP,
    );
    if (Object.keys(c).length > 0) {
      root.c = c;
    }
  }

  if (!data.checklist.enabled) {
    root.cl = { e: 0 };
  } else {
    const items = data.checklist.items
      .filter((item) => item.text.trim().length > 0)
      .map((item) => item.text);
    if (items.length > 0) {
      root.cl = { i: items };
    }
  }

  if (!data.contacts.enabled) {
    root.ct = { e: 0 };
  } else {
    const ct = compactStringFields(
      {
        primaryName: data.contacts.primaryName,
        primaryPhone: data.contacts.primaryPhone,
        secondaryName: data.contacts.secondaryName,
        secondaryPhone: data.contacts.secondaryPhone,
        hospitalName: data.contacts.hospitalName,
        hospitalPhone: data.contacts.hospitalPhone,
      },
      CONTACTS_KEY_MAP,
    );
    if (Object.keys(ct).length > 0) {
      root.ct = ct;
    }
  }

  return root;
}

function expandKanpe(raw: Record<string, unknown>): Record<string, unknown> {
  const rawPr = isRecord(raw.pr) ? raw.pr : {};
  const rawS = isRecord(raw.s) ? raw.s : {};
  const rawF = isRecord(raw.f) ? raw.f : {};
  const rawC = isRecord(raw.c) ? raw.c : {};
  const rawCl = isRecord(raw.cl) ? raw.cl : {};
  const rawCt = isRecord(raw.ct) ? raw.ct : {};

  const expandedItems: Array<{ id: string; text: string }> = [];
  if (Array.isArray(rawCl.i)) {
    for (let index = 0; index < rawCl.i.length; index += 1) {
      const entry = rawCl.i[index];
      if (typeof entry === 'string') {
        expandedItems.push({ id: `item-${index}`, text: entry });
      } else if (
        Array.isArray(entry) &&
        entry.length >= 2 &&
        typeof entry[0] === 'string' &&
        typeof entry[1] === 'string'
      ) {
        expandedItems.push({ id: entry[0], text: entry[1] });
      }
    }
  }

  return {
    version: raw.v,
    updatedAt: decodeShortTimestamp(raw.u),
    preset: typeof raw.p === 'string' ? SHORT_TO_PRESET[raw.p] : undefined,
    profile: expandStringFields(rawPr, PROFILE_KEY_MAP),
    safety: {
      enabled: fromCompactFlag(rawS.e),
      allergies: rawS.a,
      ngList: rawS.n,
      medicalNote: rawS.m,
    },
    feeding: {
      enabled: fromCompactFlag(rawF.e),
      mode: typeof rawF.m === 'string' ? SHORT_TO_FEEDING[rawF.m] : undefined,
      ...expandStringFields(rawF, FEEDING_STR_KEY_MAP),
    },
    care: {
      enabled: fromCompactFlag(rawC.e),
      ...expandStringFields(rawC, CARE_KEY_MAP),
    },
    checklist: {
      enabled: fromCompactFlag(rawCl.e),
      items: expandedItems,
    },
    contacts: {
      enabled: fromCompactFlag(rawCt.e),
      ...expandStringFields(rawCt, CONTACTS_KEY_MAP),
    },
  };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(payload: string): Uint8Array {
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLength);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function compressDeflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(bytes)])
    .stream()
    .pipeThrough(new CompressionStream('deflate-raw'));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

async function decompressDeflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(bytes)])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

export async function encodeKanpeToHash(
  data: KanpeData,
  options: { includeContacts: boolean },
): Promise<string> {
  const normalized = normalizeKanpeData(data);
  const prepared: KanpeData = options.includeContacts
    ? normalized
    : {
        ...normalized,
        contacts: {
          enabled: false,
          primaryName: '',
          primaryPhone: '',
          secondaryName: '',
          secondaryPhone: '',
          hospitalName: '',
          hospitalPhone: '',
        },
      };

  const compact = compactKanpe(prepared);
  const json = JSON.stringify(compact);
  const bytes = new TextEncoder().encode(json);
  const rawHash = `${HASH_PREFIX_RAW}${bytesToBase64Url(bytes)}`;

  if (typeof globalThis.CompressionStream === 'function') {
    try {
      const compressed = await compressDeflateRaw(bytes);
      const compressedHash = `${HASH_PREFIX_COMPRESSED}${bytesToBase64Url(compressed)}`;
      if (compressedHash.length < rawHash.length) {
        return compressedHash;
      }
    } catch {
      // Fall back to uncompressed format if compression fails
    }
  }

  return rawHash;
}

export function getHashPayload(hash: string): string | null {
  if (hash.startsWith(HASH_PREFIX_COMPRESSED)) {
    return hash.slice(HASH_PREFIX_COMPRESSED.length);
  }
  if (hash.startsWith(HASH_PREFIX_RAW)) {
    return hash.slice(HASH_PREFIX_RAW.length);
  }
  return null;
}

export async function decodeKanpeFromHash(
  hash: string,
): Promise<{ ok: true; data: KanpeData } | { ok: false; error: string } | null> {
  const isCompressed = hash.startsWith(HASH_PREFIX_COMPRESSED);
  const isRaw = hash.startsWith(HASH_PREFIX_RAW);
  if (!isCompressed && !isRaw) {
    return null;
  }

  const payload = isCompressed
    ? hash.slice(HASH_PREFIX_COMPRESSED.length)
    : hash.slice(HASH_PREFIX_RAW.length);

  if (payload.length === 0) {
    return {
      ok: false,
      error: '共有リンクのデータが空です。送られたリンクをもう一度確認してください。',
    };
  }

  if (!/^[A-Za-z0-9_-]+$/.test(payload)) {
    return {
      ok: false,
      error: 'リンクの形式が正しくありません。URLの末尾まで全てコピーされているか確認してください。',
    };
  }

  if (payload.length % 4 === 1) {
    return {
      ok: false,
      error: 'リンクが途中で切れている可能性があります。送ってくれた方にもう一度リンクを送ってもらってください。',
    };
  }

  if (isCompressed && typeof globalThis.DecompressionStream !== 'function') {
    return {
      ok: false,
      error: 'お使いのブラウザはこの共有リンクの形式に対応していません。最新のブラウザで開き直してください。',
    };
  }

  try {
    const rawBytes = base64UrlToBytes(payload);
    const bytes = isCompressed ? await decompressDeflateRaw(rawBytes) : rawBytes;
    const json = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const parsed: unknown = JSON.parse(json);

    if (!isRecord(parsed)) {
      return {
        ok: false,
        error: 'リンクのデータ形式を読み取れませんでした。もう一度リンクを送ってもらってください。',
      };
    }

    if (parsed.v !== undefined && parsed.v !== KANPE_VERSION) {
      return {
        ok: false,
        error: 'このリンクは未対応のバージョンです。最新のページで開き直してください。',
      };
    }

    const expanded = expandKanpe(parsed);
    return { ok: true, data: normalizeKanpeData(expanded) };
  } catch {
    return {
      ok: false,
      error:
        'リンクが壊れているか、途中で切れている可能性があります。送ってくれた方にもう一度リンクを送ってもらってください。',
    };
  }
}

export function buildShareUrl(hash: string): string {
  const normalizedHash = hash.startsWith('#') ? hash : `#${hash}`;
  if (typeof window === 'undefined') {
    return normalizedHash;
  }
  return `${window.location.origin}${window.location.pathname}${window.location.search}${normalizedHash}`;
}
