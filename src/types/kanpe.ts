export type AgePreset = 'infant' | 'toddler';
export type FeedingMode = 'milk' | 'mixed' | 'food';
export type FontSizeMode = 'normal' | 'large' | 'xlarge';
export type AppViewMode = 'editor' | 'guest' | 'print';

export interface ChecklistItem {
  id: string;
  text: string;
}

export interface KanpeProfile {
  nickname: string;
  ageText: string;
  dateLabel: string;
  returnTime: string;
}

export interface KanpeSafety {
  enabled: boolean;
  allergies: string[];
  ngList: string[];
  medicalNote: string;
}

export interface KanpeFeeding {
  enabled: boolean;
  mode: FeedingMode;
  milkAmount: string;
  milkHowTo: string;
  foodRules: string;
  snackRules: string;
  waterNote: string;
}

export interface KanpeCare {
  enabled: boolean;
  sleepHowTo: string;
  diaperToilet: string;
  cryingTips: string;
  itemLocations: string;
}

export interface KanpeChecklist {
  enabled: boolean;
  items: ChecklistItem[];
}

export interface KanpeContacts {
  enabled: boolean;
  primaryName: string;
  primaryPhone: string;
  secondaryName: string;
  secondaryPhone: string;
  hospitalName: string;
  hospitalPhone: string;
}

export interface KanpeData {
  version: 1;
  updatedAt: string;
  preset: AgePreset;
  profile: KanpeProfile;
  safety: KanpeSafety;
  feeding: KanpeFeeding;
  care: KanpeCare;
  checklist: KanpeChecklist;
  contacts: KanpeContacts;
}

export const KANPE_VERSION = 1 as const;

export function createChecklistItemId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `chk-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `chk-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyKanpe(): KanpeData {
  return {
    version: KANPE_VERSION,
    updatedAt: new Date().toISOString(),
    preset: 'infant',
    profile: {
      nickname: '',
      ageText: '',
      dateLabel: '',
      returnTime: '',
    },
    safety: {
      enabled: true,
      allergies: [],
      ngList: [],
      medicalNote: '',
    },
    feeding: {
      enabled: true,
      mode: 'milk',
      milkAmount: '',
      milkHowTo: '',
      foodRules: '',
      snackRules: '',
      waterNote: '',
    },
    care: {
      enabled: true,
      sleepHowTo: '',
      diaperToilet: '',
      cryingTips: '',
      itemLocations: '',
    },
    checklist: {
      enabled: true,
      items: [],
    },
    contacts: {
      enabled: true,
      primaryName: '',
      primaryPhone: '',
      secondaryName: '',
      secondaryPhone: '',
      hospitalName: '',
      hospitalPhone: '',
    },
  };
}

export const INFANT_SAMPLE_KANPE: KanpeData = {
  version: KANPE_VERSION,
  updatedAt: '2026-11-26T00:00:00.000Z',
  preset: 'infant',
  profile: {
    nickname: 'ひなちゃん',
    ageText: '生後8か月',
    dateLabel: '12月7日（土）',
    returnTime: '18:00ごろ',
  },
  safety: {
    enabled: true,
    allergies: ['卵（検査で陽性・まだ食べさせていません）'],
    ngList: [
      'うつぶせ寝はさせない（必ず仰向けで寝かせる）',
      'はちみつ・黒糖は1歳まで厳禁（ボツリヌス症予防）',
      'ソファ・大人用ベッドに一人で寝かせない（転落防止）',
      'ボタン電池・小さなおもちゃを手の届く所に置かない',
    ],
    medicalNote: '熱が37.5℃以上ある、または顔色が悪い時はすぐ電話してください。母子手帳と保険証は青いバッグの前ポケットにあります。',
  },
  feeding: {
    enabled: true,
    mode: 'mixed',
    milkAmount: '1回160ml（9:00 / 13:00 / 17:00ごろ目安）',
    milkHowTo:
      '70℃以上のお湯で粉を溶かし、水を足してから流水で冷まします。手首の内側に垂らして人肌（40℃くらい）を確認。飲み残しは1時間で捨ててください。',
    foodRules: '12:00ごろに離乳食（2回食）。冷凍キューブを耐熱皿に出し、電子レンジ600Wで40秒温めてよく混ぜて冷ましてから与えてください。',
    snackRules: 'ぐずった時は赤ちゃんせんべいを1枚まで。必ず座った状態で目を離さずにお願いします。',
    waterNote: '麦茶・白湯をストローマグでこまめに（テーブルの上に置いています）。',
  },
  care: {
    enabled: true,
    sleepHowTo: 'お昼寝は10:30ごろと14:30ごろが目安。眠そう（目をこする）になったら、抱っこで軽く揺らしておしゃぶりを渡すと10分ほどで寝ます。',
    diaperToilet: '3〜4時間ごと、またはうんちが出たらすぐ交換。おしりかぶれしやすいので、おしりふきで優しく押さえるように拭いてください。',
    cryingTips: 'お腹が空いた時・眠い時以外は、ベランダの窓から外を見たり、カシャカシャ鳴る布絵本を見せると落ち着くことが多いです。',
    itemLocations:
      'オムツ・おしりふき：リビング白い棚の2段目／粉ミルク・哺乳瓶：キッチン左の引き出し／着替え・ガーゼ：玄関の青いバッグの中',
  },
  checklist: {
    enabled: true,
    items: [
      { id: 'infant-1', text: 'ミルクを飲んだ時間と量をメモする' },
      { id: 'infant-2', text: '離乳食を食べた量・様子を見る' },
      { id: 'infant-3', text: 'オムツ替え（おしっこ・うんちの回数確認）' },
      { id: 'infant-4', text: 'お昼寝の開始・起床時間をメモ（仰向け確認）' },
      { id: 'infant-5', text: '体温確認（37.5℃以上・ぐったりなら連絡）' },
    ],
  },
  contacts: {
    enabled: true,
    primaryName: 'ママ（さくら）',
    primaryPhone: '090-1234-5678',
    secondaryName: 'パパ（たくみ）',
    secondaryPhone: '090-8765-4321',
    hospitalName: '〇〇こどもクリニック（かかりつけ）',
    hospitalPhone: '03-1234-5678',
  },
};

export const TODDLER_SAMPLE_KANPE: KanpeData = {
  version: KANPE_VERSION,
  updatedAt: '2026-11-26T00:00:00.000Z',
  preset: 'toddler',
  profile: {
    nickname: 'そうたくん',
    ageText: '3歳2か月',
    dateLabel: '12月8日（日）',
    returnTime: '17:30ごろ',
  },
  safety: {
    enabled: true,
    allergies: ['卵（加熱したものも含め完全除去）', 'えび・かに（甲殻類）'],
    ngList: [
      'ナッツ類・ミニトマト・ぶどうは丸のまま与えない（窒息注意）',
      'ジュースや甘い炭酸飲料は飲ませない',
      '公園などでは絶対に手をつないで道路に出ないよう見守る',
    ],
    medicalNote: '卵を誤食するとじんましんが出ます。万が一出た場合はすぐ救急相談(#8000)と親へ連絡してください。',
  },
  feeding: {
    enabled: true,
    mode: 'food',
    milkAmount: '',
    milkHowTo: '',
    foodRules: '12:00ごろにお昼ごはん。用意したお弁当を電子レンジ500Wで1分半温めてください。食べ残しは無理に食べさせなくて大丈夫です。',
    snackRules: '15:00に1回、テーブル上の透明な袋に入ったおやつを1袋だけ。チョコレートは1個まででお願いします。',
    waterNote: '水筒の麦茶をこまめに飲ませてください（牛乳はコップ1杯までOK）。',
  },
  care: {
    enabled: true,
    sleepHowTo: '13:00ごろからお昼寝。好きな絵本を1冊読んであげてから電気を暗くすると、トントンで寝ることが多いです（15:00までには起こしてください）。',
    diaperToilet: '普段はパンツですが、夢中になると忘れるので1〜2時間おきに「トイレ行こうか」と声かけをお願いします。お昼寝の時だけオムツに履き替えます。',
    cryingTips: '好きな遊び：電車のおもちゃ、ブロック、『はらぺこあおむし』の絵本。どうしてもぐずった時は電車の動画を15分だけ見せてOKです。',
    itemLocations: '着替え一式・お昼寝用オムツ：黄色いリュックの中／おしりふき・ビニール袋：リュックの外ポケット／ばんそうこう：リビングの救急箱',
  },
  checklist: {
    enabled: true,
    items: [
      { id: 'toddler-1', text: 'お昼ごはんの完食・アレルギー確認' },
      { id: 'toddler-2', text: '1〜2時間おきにトイレの声かけをする' },
      { id: 'toddler-3', text: '13:00ごろお昼寝（オムツへ履き替え）' },
      { id: 'toddler-4', text: '15:00におやつと水分補給' },
      { id: 'toddler-5', text: '帰宅前に着替え・荷物の確認' },
    ],
  },
  contacts: {
    enabled: true,
    primaryName: 'ママ（あおい）',
    primaryPhone: '090-1111-2222',
    secondaryName: 'パパ（けんじ）',
    secondaryPhone: '090-3333-4444',
    hospitalName: '△△小児科クリニック',
    hospitalPhone: '03-9876-5432',
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const result: string[] = [];
  for (const item of value) {
    if (typeof item === 'string') {
      result.push(item);
    }
  }
  return result;
}

function asEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  return fallback;
}

function asValidTimestamp(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value))) {
    return value;
  }
  return fallback;
}

function normalizeChecklistItems(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seenIds = new Set<string>();
  const items: ChecklistItem[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const rawItem = value[index];
    if (!isRecord(rawItem) || typeof rawItem.text !== 'string') {
      continue;
    }
    const baseId =
      typeof rawItem.id === 'string' && rawItem.id.length > 0 ? rawItem.id : `item-${index}`;
    let uniqueId = baseId;
    if (seenIds.has(uniqueId)) {
      uniqueId = `${baseId}-${index}`;
      let suffix = 1;
      while (seenIds.has(uniqueId)) {
        uniqueId = `${baseId}-${index}-${suffix}`;
        suffix += 1;
      }
    }
    seenIds.add(uniqueId);
    items.push({ id: uniqueId, text: rawItem.text });
  }

  return items;
}

export function normalizeKanpeData(raw: unknown): KanpeData {
  const base = createEmptyKanpe();
  if (!isRecord(raw)) {
    return base;
  }

  const rawProfile = isRecord(raw.profile) ? raw.profile : {};
  const rawSafety = isRecord(raw.safety) ? raw.safety : {};
  const rawFeeding = isRecord(raw.feeding) ? raw.feeding : {};
  const rawCare = isRecord(raw.care) ? raw.care : {};
  const rawChecklist = isRecord(raw.checklist) ? raw.checklist : {};
  const rawContacts = isRecord(raw.contacts) ? raw.contacts : {};

  return {
    version: KANPE_VERSION,
    updatedAt: asValidTimestamp(raw.updatedAt, base.updatedAt),
    preset: asEnum(raw.preset, ['infant', 'toddler'] as const, base.preset),
    profile: {
      nickname: asString(rawProfile.nickname, base.profile.nickname),
      ageText: asString(rawProfile.ageText, base.profile.ageText),
      dateLabel: asString(rawProfile.dateLabel, base.profile.dateLabel),
      returnTime: asString(rawProfile.returnTime, base.profile.returnTime),
    },
    safety: {
      enabled: asBool(rawSafety.enabled, base.safety.enabled),
      allergies: asStringArray(rawSafety.allergies),
      ngList: asStringArray(rawSafety.ngList),
      medicalNote: asString(rawSafety.medicalNote, base.safety.medicalNote),
    },
    feeding: {
      enabled: asBool(rawFeeding.enabled, base.feeding.enabled),
      mode: asEnum(rawFeeding.mode, ['milk', 'mixed', 'food'] as const, base.feeding.mode),
      milkAmount: asString(rawFeeding.milkAmount, base.feeding.milkAmount),
      milkHowTo: asString(rawFeeding.milkHowTo, base.feeding.milkHowTo),
      foodRules: asString(rawFeeding.foodRules, base.feeding.foodRules),
      snackRules: asString(rawFeeding.snackRules, base.feeding.snackRules),
      waterNote: asString(rawFeeding.waterNote, base.feeding.waterNote),
    },
    care: {
      enabled: asBool(rawCare.enabled, base.care.enabled),
      sleepHowTo: asString(rawCare.sleepHowTo, base.care.sleepHowTo),
      diaperToilet: asString(rawCare.diaperToilet, base.care.diaperToilet),
      cryingTips: asString(rawCare.cryingTips, base.care.cryingTips),
      itemLocations: asString(rawCare.itemLocations, base.care.itemLocations),
    },
    checklist: {
      enabled: asBool(rawChecklist.enabled, base.checklist.enabled),
      items: normalizeChecklistItems(rawChecklist.items),
    },
    contacts: {
      enabled: asBool(rawContacts.enabled, base.contacts.enabled),
      primaryName: asString(rawContacts.primaryName, base.contacts.primaryName),
      primaryPhone: asString(rawContacts.primaryPhone, base.contacts.primaryPhone),
      secondaryName: asString(rawContacts.secondaryName, base.contacts.secondaryName),
      secondaryPhone: asString(rawContacts.secondaryPhone, base.contacts.secondaryPhone),
      hospitalName: asString(rawContacts.hospitalName, base.contacts.hospitalName),
      hospitalPhone: asString(rawContacts.hospitalPhone, base.contacts.hospitalPhone),
    },
  };
}
