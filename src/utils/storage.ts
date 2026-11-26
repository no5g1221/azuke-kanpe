import { type FontSizeMode, type KanpeData, normalizeKanpeData } from '../types/kanpe';

export const DRAFT_KEY = 'azuke_kanpe_draft_v1';
export const CHECKS_KEY = 'azuke_kanpe_checks_v1';
export const FONT_SIZE_KEY = 'azuke_kanpe_font_v1';

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    return window.localStorage;
  } catch {
    return null;
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function loadDraft(): KanpeData | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(DRAFT_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainRecord(parsed)) {
      return null;
    }
    return normalizeKanpeData(parsed);
  } catch {
    return null;
  }
}

export function saveDraft(data: KanpeData): boolean {
  const storage = getStorage();
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(DRAFT_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(DRAFT_KEY);
  } catch {
    // Ignore storage removal errors
  }
}

export function createKanpeStorageKey(source: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `k_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function readAllChecks(): Record<string, Record<string, boolean>> {
  const storage = getStorage();
  if (!storage) {
    return {};
  }
  try {
    const raw = storage.getItem(CHECKS_KEY);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainRecord(parsed)) {
      return {};
    }
    const sanitized: Record<string, Record<string, boolean>> = {};
    for (const [kanpeKey, entry] of Object.entries(parsed)) {
      if (!isPlainRecord(entry)) {
        continue;
      }
      const itemMap: Record<string, boolean> = {};
      for (const [itemId, checked] of Object.entries(entry)) {
        if (typeof checked === 'boolean') {
          itemMap[itemId] = checked;
        }
      }
      sanitized[kanpeKey] = itemMap;
    }
    return sanitized;
  } catch {
    return {};
  }
}

function writeAllChecks(all: Record<string, Record<string, boolean>>): boolean {
  const storage = getStorage();
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(CHECKS_KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

export function loadChecks(kanpeKey: string): Record<string, boolean> {
  if (!kanpeKey) {
    return {};
  }
  const all = readAllChecks();
  const entry = all[kanpeKey];
  return entry ? { ...entry } : {};
}

export function saveChecks(kanpeKey: string, checks: Record<string, boolean>): boolean {
  if (!kanpeKey) {
    return false;
  }
  const all = readAllChecks();
  const sanitized: Record<string, boolean> = {};
  for (const [id, val] of Object.entries(checks)) {
    if (typeof val === 'boolean') {
      sanitized[id] = val;
    }
  }
  all[kanpeKey] = sanitized;
  return writeAllChecks(all);
}

export function resetChecks(kanpeKey: string): void {
  if (!kanpeKey) {
    return;
  }
  const all = readAllChecks();
  if (!(kanpeKey in all)) {
    return;
  }
  delete all[kanpeKey];
  writeAllChecks(all);
}

export function loadFontSize(): FontSizeMode {
  const storage = getStorage();
  if (!storage) {
    return 'normal';
  }
  try {
    const val = storage.getItem(FONT_SIZE_KEY);
    if (val === 'normal' || val === 'large' || val === 'xlarge') {
      return val;
    }
    return 'normal';
  } catch {
    return 'normal';
  }
}

export function saveFontSize(mode: FontSizeMode): boolean {
  const storage = getStorage();
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(FONT_SIZE_KEY, mode);
    return true;
  } catch {
    return false;
  }
}
