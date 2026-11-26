import {
  type AgePreset,
  type FeedingMode,
  KANPE_VERSION,
  type KanpeData,
  normalizeKanpeData,
} from '../types/kanpe';

const HASH_PREFIX = '#d=';

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

function toCompactFlag(value: boolean): 1 | 0 {
  return value ? 1 : 0;
}

function fromCompactFlag(value: unknown): boolean | undefined {
  if (value === 1 || value === true) {
    return true;
  }
  if (value === 0 || value === false) {
    return false;
  }
  return undefined;
}

function compactKanpe(data: KanpeData): Record<string, unknown> {
  const pr = compactStringFields(data.profile, PROFILE_KEY_MAP);

  const s: Record<string, unknown> = { e: toCompactFlag(data.safety.enabled) };
  if (data.safety.allergies.length > 0) {
    s.a = data.safety.allergies;
  }
  if (data.safety.ngList.length > 0) {
    s.n = data.safety.ngList;
  }
  setIfNonEmptyString(s, 'm', data.safety.medicalNote);

  const f: Record<string, unknown> = {
    e: toCompactFlag(data.feeding.enabled),
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

  const c: Record<string, unknown> = {
    e: toCompactFlag(data.care.enabled),
    ...compactStringFields(
      {
        sleepHowTo: data.care.sleepHowTo,
        diaperToilet: data.care.diaperToilet,
        cryingTips: data.care.cryingTips,
        itemLocations: data.care.itemLocations,
      },
      CARE_KEY_MAP,
    ),
  };

  const cl: Record<string, unknown> = { e: toCompactFlag(data.checklist.enabled) };
  if (data.checklist.items.length > 0) {
    cl.i = data.checklist.items.map((item) => [item.id, item.text]);
  }

  const ct: Record<string, unknown> = {
    e: toCompactFlag(data.contacts.enabled),
    ...compactStringFields(
      {
        primaryName: data.contacts.primaryName,
        primaryPhone: data.contacts.primaryPhone,
        secondaryName: data.contacts.secondaryName,
        secondaryPhone: data.contacts.secondaryPhone,
        hospitalName: data.contacts.hospitalName,
        hospitalPhone: data.contacts.hospitalPhone,
      },
      CONTACTS_KEY_MAP,
    ),
  };

  const root: Record<string, unknown> = {
    v: KANPE_VERSION,
    p: PRESET_TO_SHORT[data.preset],
    s,
    f,
    c,
    cl,
    ct,
  };
  setIfNonEmptyString(root, 'u', data.updatedAt);
  if (Object.keys(pr).length > 0) {
    root.pr = pr;
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
    for (const pair of rawCl.i) {
      if (
        Array.isArray(pair) &&
        pair.length >= 2 &&
        typeof pair[0] === 'string' &&
        typeof pair[1] === 'string'
      ) {
        expandedItems.push({ id: pair[0], text: pair[1] });
      }
    }
  }

  return {
    version: raw.v,
    updatedAt: raw.u,
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

export function encodeKanpeToHash(
  data: KanpeData,
  options: { includeContacts: boolean },
): string {
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
  return `${HASH_PREFIX}${bytesToBase64Url(bytes)}`;
}

export function getHashPayload(hash: string): string | null {
  if (!hash.startsWith(HASH_PREFIX)) {
    return null;
  }
  return hash.slice(HASH_PREFIX.length);
}

export function decodeKanpeFromHash(
  hash: string,
): { ok: true; data: KanpeData } | { ok: false; error: string } | null {
  const payload = getHashPayload(hash);
  if (payload === null) {
    return null;
  }

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

  try {
    const bytes = base64UrlToBytes(payload);
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
