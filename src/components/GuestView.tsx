import { type ReactNode, useEffect, useState } from 'react';
import type { FontSizeMode, KanpeData } from '../types/kanpe';
import {
  loadChecks,
  loadFontSize,
  resetChecks,
  saveChecks,
  saveFontSize,
} from '../utils/storage';
import { useToast } from './Toast';
import {
  AlertTriangleIcon,
  CheckIcon,
  ClockIcon,
  ListCheckIcon,
  MoonIcon,
  PencilIcon,
  PhoneIcon,
  RotateCcwIcon,
  UtensilsIcon,
} from './icons';
import {
  FEEDING_MODE_LABELS,
  getVisibleFeedingFields,
  hasCareContent,
  hasContactsContent,
  hasSafetyContent,
  hasText,
  hasVisibleFeedingContent,
  toTelHref,
} from './kanpeDisplay';

interface GuestViewProps {
  data: KanpeData;
  checksKey: string;
  isPreview: boolean;
  onBackToEditor?: () => void;
  onImportToEditor?: () => void;
}

interface ScaleClasses {
  body: string;
  label: string;
  h1: string;
  h2: string;
  item: string;
  returnTime: string;
}

const FONT_SIZE_OPTIONS: Array<{
  mode: FontSizeMode;
  label: string;
  sampleClass: string;
}> = [
  { mode: 'normal', label: '標準', sampleClass: 'text-sm' },
  { mode: 'large', label: '大', sampleClass: 'text-lg' },
  { mode: 'xlarge', label: '特大', sampleClass: 'text-2xl' },
];

const SCALE: Record<FontSizeMode, ScaleClasses> = {
  normal: {
    body: 'text-base leading-relaxed',
    label: 'text-xs',
    h1: 'text-2xl',
    h2: 'text-lg',
    item: 'text-base leading-snug',
    returnTime: 'text-xl',
  },
  large: {
    body: 'text-lg leading-relaxed',
    label: 'text-sm',
    h1: 'text-3xl',
    h2: 'text-xl',
    item: 'text-lg leading-snug',
    returnTime: 'text-2xl',
  },
  xlarge: {
    body: 'text-[21px] leading-loose',
    label: 'text-base',
    h1: 'text-4xl',
    h2: 'text-2xl',
    item: 'text-[21px] leading-normal',
    returnTime: 'text-3xl',
  },
};

function GuestSection({
  title,
  icon,
  scale,
  children,
}: {
  title: string;
  icon: ReactNode;
  scale: ScaleClasses;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
      <h2
        className={`flex items-center gap-2.5 font-bold text-stone-900 pb-2.5 border-b border-stone-200 ${scale.h2}`}
      >
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-stone-100 text-slate-700 shrink-0">
          {icon}
        </span>
        <span>{title}</span>
      </h2>
      {children}
    </section>
  );
}

function InfoItem({
  label,
  value,
  scale,
}: {
  label: string;
  value: string;
  scale: ScaleClasses;
}) {
  if (!hasText(value)) {
    return null;
  }
  return (
    <div className="space-y-0.5">
      <dt className={`font-bold tracking-wide text-stone-500 ${scale.label}`}>
        {label}
      </dt>
      <dd className={`text-stone-900 whitespace-pre-wrap break-words ${scale.body}`}>
        {value}
      </dd>
    </div>
  );
}

function ContactRow({
  name,
  phone,
  roleLabel,
  scale,
}: {
  name: string;
  phone: string;
  roleLabel: string;
  scale: ScaleClasses;
}) {
  if (!hasText(name) && !hasText(phone)) {
    return null;
  }
  const telHref = toTelHref(phone);
  const displayName = hasText(name) ? name : phone;

  if (telHref) {
    return (
      <a
        href={telHref}
        aria-label={`${displayName}に電話する（${phone}）`}
        className="flex items-center gap-3.5 min-h-16 px-4 py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white shadow-xs transition-all"
      >
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/15 shrink-0">
          <PhoneIcon className="w-6 h-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className={`font-medium text-emerald-100 ${scale.label}`}>
            {roleLabel}
          </div>
          <div className={`font-bold truncate ${scale.h2}`}>{displayName}</div>
          <div className={`font-bold font-mono tracking-wide ${scale.h2}`}>
            {phone}
          </div>
          <div className="text-sm font-medium text-emerald-100 mt-0.5">
            タップして電話する
          </div>
        </div>
      </a>
    );
  }

  return (
    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
      <div className={`font-semibold text-stone-500 ${scale.label}`}>{roleLabel}</div>
      <div className={`font-bold text-stone-900 mt-0.5 ${scale.h2}`}>{name}</div>
    </div>
  );
}

export function GuestView({
  data,
  checksKey,
  isPreview,
  onBackToEditor,
  onImportToEditor,
}: GuestViewProps) {
  const { showToast } = useToast();
  const [fontSize, setFontSize] = useState<FontSizeMode>(() => loadFontSize());
  const [checks, setChecks] = useState<Record<string, boolean>>(() =>
    loadChecks(checksKey),
  );

  useEffect(() => {
    setChecks(loadChecks(checksKey));
  }, [checksKey]);

  const handleFontSizeChange = (mode: FontSizeMode) => {
    setFontSize(mode);
    saveFontSize(mode);
  };

  const handleToggleCheck = (itemId: string) => {
    const next = {
      ...checks,
      [itemId]: !checks[itemId],
    };
    setChecks(next);
    saveChecks(checksKey, next);
  };

  const handleResetChecks = () => {
    const confirmed = window.confirm('チェックした項目をすべて未完了に戻しますか？');
    if (!confirmed) {
      return;
    }
    resetChecks(checksKey);
    setChecks({});
    showToast('チェックをリセットしました');
  };

  const s = SCALE[fontSize];
  const allergies = data.safety.allergies.filter(hasText);
  const ngList = data.safety.ngList.filter(hasText);
  const showSafety = data.safety.enabled && hasSafetyContent(data.safety);

  const visibleChecklistItems = data.checklist.enabled
    ? data.checklist.items.filter((item) => hasText(item.text))
    : [];
  const showChecklist = visibleChecklistItems.length > 0;

  const { showMilk, showFood } = getVisibleFeedingFields(data.feeding);
  const showFeeding =
    data.feeding.enabled && hasVisibleFeedingContent(data.feeding);

  const showCare = data.care.enabled && hasCareContent(data.care);
  const showContacts = data.contacts.enabled && hasContactsContent(data.contacts);

  const hasProfileHeader =
    hasText(data.profile.nickname) ||
    hasText(data.profile.ageText) ||
    hasText(data.profile.dateLabel) ||
    hasText(data.profile.returnTime);

  const hasAnySection =
    showSafety || showChecklist || showFeeding || showCare || showContacts;

  const completedCount = visibleChecklistItems.filter((item) =>
    Boolean(checks[item.id]),
  ).length;
  const totalCheckCount = visibleChecklistItems.length;
  const progressPercent =
    totalCheckCount > 0 ? Math.round((completedCount / totalCheckCount) * 100) : 0;
  const allCompleted = totalCheckCount > 0 && completedCount === totalCheckCount;

  return (
    <div className={`max-w-2xl mx-auto px-4 py-4 space-y-4 ${s.body}`}>
      <div
        role="group"
        aria-label="文字サイズ切り替え"
        className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-white border border-stone-200 shadow-xs"
      >
        {FONT_SIZE_OPTIONS.map((option) => {
          const active = fontSize === option.mode;
          return (
            <button
              key={option.mode}
              type="button"
              aria-pressed={active}
              onClick={() => handleFontSizeChange(option.mode)}
              className={`min-h-12 flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all active:scale-[0.98] ${
                active
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
              }`}
            >
              <span className={`font-bold leading-none ${option.sampleClass}`}>あ</span>
              <span className="text-xs font-bold mt-1">{option.label}</span>
            </button>
          );
        })}
      </div>

      {isPreview && onBackToEditor ? (
        <div className="rounded-2xl bg-amber-100 border border-amber-300 text-amber-950 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold">
            プレビュー中（預け先にはこのように見えます）
          </span>
          <button
            type="button"
            onClick={onBackToEditor}
            className="inline-flex items-center gap-1.5 min-h-11 px-3.5 rounded-xl bg-white border border-amber-400 text-amber-950 text-sm font-bold hover:bg-amber-50 active:scale-[0.98] transition-all"
          >
            <PencilIcon className="w-4 h-4" />
            <span>編集画面に戻る</span>
          </button>
        </div>
      ) : null}

      <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
        <div>
          <h1 className={`font-bold text-stone-900 break-words leading-tight ${s.h1}`}>
            {hasText(data.profile.nickname) ? data.profile.nickname : 'おあずかりカンペ'}
          </h1>
          {(hasText(data.profile.ageText) || hasText(data.profile.dateLabel)) ? (
            <div className={`flex flex-wrap items-center gap-2 mt-1.5 font-medium text-stone-600 ${s.body}`}>
              {hasText(data.profile.ageText) ? (
                <span>{data.profile.ageText}</span>
              ) : null}
              {hasText(data.profile.ageText) && hasText(data.profile.dateLabel) ? (
                <span aria-hidden="true">／</span>
              ) : null}
              {hasText(data.profile.dateLabel) ? (
                <span>{data.profile.dateLabel}</span>
              ) : null}
            </div>
          ) : null}
        </div>

        {hasText(data.profile.returnTime) ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-800 text-white px-4 py-3">
            <span className={`inline-flex items-center gap-1.5 font-semibold text-slate-200 ${s.label}`}>
              <ClockIcon className="w-4 h-4" />
              <span>親の帰宅予定時刻</span>
            </span>
            <span className={`font-bold tracking-wide ${s.returnTime}`}>
              {data.profile.returnTime}
            </span>
          </div>
        ) : null}
      </section>

      {showSafety ? (
        <section
          aria-labelledby="guest-safety-heading"
          className="rounded-2xl bg-red-50 border-2 border-red-500 text-red-950 p-4 sm:p-5 space-y-3"
        >
          <h2
            id="guest-safety-heading"
            className={`flex items-center gap-2 font-bold text-red-950 ${s.h2}`}
          >
            <AlertTriangleIcon className="w-6 h-6 text-red-600 shrink-0" />
            <span>最優先：絶対NG・アレルギー</span>
          </h2>

          {allergies.length > 0 ? (
            <div className="space-y-1">
              <h3 className={`font-bold text-red-900 ${s.label}`}>アレルギー</h3>
              <ul className={`list-disc pl-5 space-y-1 font-bold ${s.body}`}>
                {allergies.map((item, idx) => (
                  <li key={`allergy-${idx}`}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {ngList.length > 0 ? (
            <div className="space-y-1">
              <h3 className={`font-bold text-red-900 ${s.label}`}>してはいけないこと</h3>
              <ul className={`list-disc pl-5 space-y-1 font-semibold ${s.body}`}>
                {ngList.map((item, idx) => (
                  <li key={`ng-${idx}`}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {hasText(data.safety.medicalNote) ? (
            <div className="pt-2 border-t border-red-200">
              <h3 className={`font-bold text-red-900 ${s.label}`}>持病・受診・お薬メモ</h3>
              <p className={`mt-0.5 whitespace-pre-wrap break-words ${s.body}`}>
                {data.safety.medicalNote}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {showChecklist ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-stone-200">
            <h2 className={`flex items-center gap-2.5 font-bold text-stone-900 ${s.h2}`}>
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-stone-100 text-slate-700 shrink-0">
                <ListCheckIcon />
              </span>
              <span>今日の手元チェック</span>
            </h2>
            <span className="text-sm font-bold text-slate-800 bg-stone-100 px-3 py-1 rounded-full">
              {completedCount} / {totalCheckCount} 完了
            </span>
          </div>

          {allCompleted ? (
            <div className="flex justify-center py-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-4 py-1.5 text-sm font-bold shadow-xs animate-badge-in motion-reduce:animate-none">
                <CheckIcon className="w-4 h-4" />
                <span>すべて完了しました！</span>
              </span>
            </div>
          ) : null}

          <div
            className="w-full h-2 rounded-full bg-stone-100 overflow-hidden"
            aria-hidden="true"
          >
            <div
              className="h-full bg-emerald-600 transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="space-y-2">
            {visibleChecklistItems.map((item) => {
              const checked = Boolean(checks[item.id]);
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={checked}
                  onClick={() => handleToggleCheck(item.id)}
                  className={`w-full min-h-[52px] flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 active:scale-[0.98] ${
                    checked
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-white border-stone-200 text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-md border shrink-0 transition-colors ${
                      checked
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white border-stone-400'
                    }`}
                  >
                    {checked ? (
                      <CheckIcon className="w-4 h-4 animate-check-pop motion-reduce:animate-none" />
                    ) : null}
                  </span>
                  <span
                    className={`${s.item} ${
                      checked
                        ? 'line-through decoration-2 decoration-emerald-600/70 text-emerald-900/70'
                        : 'font-medium'
                    }`}
                  >
                    {item.text}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={completedCount === 0}
              onClick={handleResetChecks}
              className="inline-flex items-center gap-1.5 min-h-11 px-3.5 py-2 rounded-xl border border-stone-200 text-sm font-medium text-stone-700 hover:bg-stone-100 active:scale-[0.98] disabled:opacity-40 disabled:cursor-default transition-all"
            >
              <RotateCcwIcon className="w-4 h-4" />
              <span>チェックをリセット</span>
            </button>
          </div>
        </section>
      ) : null}

      {showFeeding ? (
        <GuestSection title="授乳・食事・おやつ" icon={<UtensilsIcon />} scale={s}>
          <dl className="space-y-3">
            <div>
              <span className={`inline-block px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700 font-semibold ${s.label}`}>
                {FEEDING_MODE_LABELS[data.feeding.mode]}
              </span>
            </div>
            {showMilk ? (
              <>
                <InfoItem label="ミルクの量・間隔" value={data.feeding.milkAmount} scale={s} />
                <InfoItem
                  label="ミルクの作り方・哺乳瓶の場所"
                  value={data.feeding.milkHowTo}
                  scale={s}
                />
              </>
            ) : null}
            {showFood ? (
              <>
                <InfoItem label="離乳食・ごはん" value={data.feeding.foodRules} scale={s} />
                <InfoItem label="おやつルール" value={data.feeding.snackRules} scale={s} />
              </>
            ) : null}
            <InfoItem label="水分補給" value={data.feeding.waterNote} scale={s} />
          </dl>
        </GuestSection>
      ) : null}

      {showCare ? (
        <GuestSection title="お世話・生活ルーティン" icon={<MoonIcon />} scale={s}>
          <dl className="space-y-3">
            <InfoItem label="寝かしつけ・お昼寝" value={data.care.sleepHowTo} scale={s} />
            <InfoItem label="オムツ・トイレ" value={data.care.diaperToilet} scale={s} />
            <InfoItem label="ぐずった時・好きな遊び" value={data.care.cryingTips} scale={s} />
            <InfoItem label="着替え・持ち物の置き場所" value={data.care.itemLocations} scale={s} />
          </dl>
        </GuestSection>
      ) : null}

      {showContacts ? (
        <GuestSection title="緊急連絡先" icon={<PhoneIcon />} scale={s}>
          <div className="space-y-2.5">
            <ContactRow
              roleLabel="連絡先 1（メイン）"
              name={data.contacts.primaryName}
              phone={data.contacts.primaryPhone}
              scale={s}
            />
            <ContactRow
              roleLabel="連絡先 2（サブ）"
              name={data.contacts.secondaryName}
              phone={data.contacts.secondaryPhone}
              scale={s}
            />
            <ContactRow
              roleLabel="かかりつけ病院 / 小児救急"
              name={data.contacts.hospitalName}
              phone={data.contacts.hospitalPhone}
              scale={s}
            />
          </div>
        </GuestSection>
      ) : null}

      {!hasAnySection && !hasProfileHeader ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center space-y-2 text-stone-600">
          <p className="font-semibold">まだ表示できる内容がありません。</p>
          {isPreview ? (
            <p className="text-sm text-stone-500">
              編集画面で項目を入力するか、セクションをONにしてください。
            </p>
          ) : null}
        </div>
      ) : !hasAnySection ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-500">
          表示できる詳細セクションがありません。
        </div>
      ) : null}

      {!isPreview && onImportToEditor ? (
        <div className="pt-4 pb-6 text-center">
          <button
            type="button"
            onClick={onImportToEditor}
            className="inline-flex items-center justify-center min-h-11 px-4 py-2 text-sm text-stone-500 underline underline-offset-4 hover:text-stone-800 active:scale-[0.98] transition-all"
          >
            親用：この内容を取り込んで編集する
          </button>
        </div>
      ) : null}
    </div>
  );
}
