import type { AgePreset, FeedingMode, KanpeData } from '../types/kanpe';

export const PRESET_LABELS: Record<AgePreset, string> = {
  infant: '0歳児（乳児）',
  toddler: '1歳〜（幼児）',
};

export const FEEDING_MODE_LABELS: Record<FeedingMode, string> = {
  milk: 'ミルク中心',
  mixed: '混合（ミルク＋離乳食）',
  food: 'ごはん・おやつ',
};

export function toTelHref(phone: string): string {
  const cleaned = phone.replace(/[^\d+#*]/g, '');
  return cleaned ? `tel:${cleaned.replace(/#/g, '%23')}` : '';
}

export function hasText(value: string): boolean {
  return value.trim().length > 0;
}

export function getVisibleFeedingFields(feeding: KanpeData['feeding']): {
  showMilk: boolean;
  showFood: boolean;
} {
  switch (feeding.mode) {
    case 'milk':
      return { showMilk: true, showFood: false };
    case 'mixed':
      return { showMilk: true, showFood: true };
    case 'food':
      return { showMilk: false, showFood: true };
  }
}

export function hasVisibleFeedingContent(feeding: KanpeData['feeding']): boolean {
  const { showMilk, showFood } = getVisibleFeedingFields(feeding);
  return (
    (showMilk && (hasText(feeding.milkAmount) || hasText(feeding.milkHowTo))) ||
    (showFood && (hasText(feeding.foodRules) || hasText(feeding.snackRules))) ||
    hasText(feeding.waterNote)
  );
}

export function hasSafetyContent(safety: KanpeData['safety']): boolean {
  return (
    safety.allergies.some(hasText) ||
    safety.ngList.some(hasText) ||
    hasText(safety.medicalNote)
  );
}

export function hasFeedingContent(feeding: KanpeData['feeding']): boolean {
  return (
    hasText(feeding.milkAmount) ||
    hasText(feeding.milkHowTo) ||
    hasText(feeding.foodRules) ||
    hasText(feeding.snackRules) ||
    hasText(feeding.waterNote)
  );
}

export function hasCareContent(care: KanpeData['care']): boolean {
  return (
    hasText(care.sleepHowTo) ||
    hasText(care.diaperToilet) ||
    hasText(care.cryingTips) ||
    hasText(care.itemLocations)
  );
}

export function hasContactsContent(contacts: KanpeData['contacts']): boolean {
  return (
    hasText(contacts.primaryName) ||
    hasText(contacts.primaryPhone) ||
    hasText(contacts.secondaryName) ||
    hasText(contacts.secondaryPhone) ||
    hasText(contacts.hospitalName) ||
    hasText(contacts.hospitalPhone)
  );
}
