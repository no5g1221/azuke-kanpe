import { useEffect, useRef } from 'react';
import type { KanpeData } from '../types/kanpe';
import { useToast } from './Toast';
import {
  AlertTriangleIcon,
  CameraIcon,
  EyeIcon,
  PencilIcon,
  PrinterIcon,
  XIcon,
} from './icons';
import {
  FEEDING_MODE_LABELS,
  getVisibleFeedingFields,
  hasCareContent,
  hasContactsContent,
  hasSafetyContent,
  hasText,
  hasVisibleFeedingContent,
} from './kanpeDisplay';

interface PrintSheetProps {
  data: KanpeData;
  onBack: () => void;
  backLabel: string;
  screenshotMode: boolean;
  onScreenshotModeChange: (on: boolean) => void;
}

function PrintField({ label, value }: { label: string; value: string }) {
  if (!hasText(value)) {
    return null;
  }
  return (
    <div className="space-y-0.5">
      <dt className="text-[11px] font-bold text-stone-500">{label}</dt>
      <dd className="text-xs sm:text-sm text-stone-900 leading-snug whitespace-pre-wrap break-words print:text-[9.5pt]">
        {value}
      </dd>
    </div>
  );
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

export function PrintSheet({
  data,
  onBack,
  backLabel,
  screenshotMode,
  onScreenshotModeChange,
}: PrintSheetProps) {
  const { showToast } = useToast();
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    if (!screenshotMode) {
      return;
    }
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onScreenshotModeChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [screenshotMode, onScreenshotModeChange]);

  const handleEnableScreenshotMode = () => {
    onScreenshotModeChange(true);
    showToast('ダブルタップか右下の「戻る」で解除できます', 'info');
  };

  const handlePaperPointerUp = () => {
    if (!screenshotMode) {
      return;
    }
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      onScreenshotModeChange(false);
      return;
    }
    lastTapRef.current = now;
  };

  const allergies = data.safety.allergies.filter(hasText);
  const ngList = data.safety.ngList.filter(hasText);
  const showSafety = data.safety.enabled && hasSafetyContent(data.safety);

  const { showMilk, showFood } = getVisibleFeedingFields(data.feeding);
  const showFeeding =
    data.feeding.enabled && hasVisibleFeedingContent(data.feeding);

  const showCare = data.care.enabled && hasCareContent(data.care);
  const visibleChecklistItems = data.checklist.enabled
    ? data.checklist.items.filter((item) => hasText(item.text))
    : [];
  const showChecklist = visibleChecklistItems.length > 0;
  const showContacts = data.contacts.enabled && hasContactsContent(data.contacts);

  const leftCards = [
    showFeeding ? (
      <section
        key="feeding"
        className="break-inside-avoid rounded-xl border border-stone-300 p-3 space-y-1.5"
      >
        <h2 className="text-sm font-bold text-stone-900 pb-1 border-b border-stone-200">
          授乳・食事（{FEEDING_MODE_LABELS[data.feeding.mode]}）
        </h2>
        <dl className="space-y-1.5">
          {showMilk ? (
            <>
              <PrintField label="ミルク量・間隔" value={data.feeding.milkAmount} />
              <PrintField label="作り方・哺乳瓶の場所" value={data.feeding.milkHowTo} />
            </>
          ) : null}
          {showFood ? (
            <>
              <PrintField label="離乳食・ごはん" value={data.feeding.foodRules} />
              <PrintField label="おやつルール" value={data.feeding.snackRules} />
            </>
          ) : null}
          <PrintField label="水分補給" value={data.feeding.waterNote} />
        </dl>
      </section>
    ) : null,
    showContacts ? (
      <section
        key="contacts"
        className="break-inside-avoid rounded-xl border border-stone-300 p-3 space-y-1.5"
      >
        <h2 className="text-sm font-bold text-stone-900 pb-1 border-b border-stone-200">
          緊急連絡先
        </h2>
        <div className="space-y-1.5 text-sm">
          {hasText(data.contacts.primaryName) || hasText(data.contacts.primaryPhone) ? (
            <div>
              <div className="text-[11px] font-semibold text-stone-500">連絡先1</div>
              {hasText(data.contacts.primaryName) ? (
                <div className="font-bold leading-tight">{data.contacts.primaryName}</div>
              ) : null}
              {hasText(data.contacts.primaryPhone) ? (
                <div className="text-base font-bold font-mono tracking-wide">
                  {data.contacts.primaryPhone}
                </div>
              ) : null}
            </div>
          ) : null}
          {hasText(data.contacts.secondaryName) || hasText(data.contacts.secondaryPhone) ? (
            <div>
              <div className="text-[11px] font-semibold text-stone-500">連絡先2</div>
              {hasText(data.contacts.secondaryName) ? (
                <div className="font-bold leading-tight">{data.contacts.secondaryName}</div>
              ) : null}
              {hasText(data.contacts.secondaryPhone) ? (
                <div className="text-base font-bold font-mono tracking-wide">
                  {data.contacts.secondaryPhone}
                </div>
              ) : null}
            </div>
          ) : null}
          {hasText(data.contacts.hospitalName) || hasText(data.contacts.hospitalPhone) ? (
            <div>
              <div className="text-[11px] font-semibold text-stone-500">
                かかりつけ医 / 小児救急
              </div>
              {hasText(data.contacts.hospitalName) ? (
                <div className="font-bold leading-tight">{data.contacts.hospitalName}</div>
              ) : null}
              {hasText(data.contacts.hospitalPhone) ? (
                <div className="text-base font-bold font-mono tracking-wide">
                  {data.contacts.hospitalPhone}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    ) : null,
  ].filter(Boolean);

  const rightCards = [
    showCare ? (
      <section
        key="care"
        className="break-inside-avoid rounded-xl border border-stone-300 p-3 space-y-1.5"
      >
        <h2 className="text-sm font-bold text-stone-900 pb-1 border-b border-stone-200">
          お世話・生活ルーティン
        </h2>
        <dl className="space-y-1.5">
          <PrintField label="寝かしつけ・昼寝" value={data.care.sleepHowTo} />
          <PrintField label="オムツ・トイレ" value={data.care.diaperToilet} />
          <PrintField label="泣き止むコツ・遊び" value={data.care.cryingTips} />
          <PrintField label="着替え・物の場所" value={data.care.itemLocations} />
        </dl>
      </section>
    ) : null,
    showChecklist ? (
      <section
        key="checklist"
        className="break-inside-avoid rounded-xl border border-stone-300 p-3 space-y-1.5"
      >
        <h2 className="text-sm font-bold text-stone-900 pb-1 border-b border-stone-200">
          手書きチェックリスト
        </h2>
        <ul className="space-y-1.5 text-xs sm:text-sm print:text-[9.5pt]">
          {visibleChecklistItems.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <span className="mt-0.5 inline-block w-4 h-4 shrink-0 border-2 border-stone-700 rounded-xs" />
                <span className="leading-snug">{item.text}</span>
              </div>
              <span className="text-[11px] text-stone-400 font-mono shrink-0 pt-0.5">
                ____:____
              </span>
            </li>
          ))}
        </ul>
      </section>
    ) : null,
  ].filter(Boolean);

  const hasAnyContent = showSafety || leftCards.length > 0 || rightCards.length > 0;
  const twoColumns = leftCards.length > 0 && rightCards.length > 0;
  const updatedText = formatUpdatedAt(data.updatedAt);

  return (
    <div
      className={
        screenshotMode
          ? 'min-h-dvh flex justify-center items-start bg-stone-100 px-2 py-4 print:p-0 print:bg-white'
          : 'max-w-[210mm] mx-auto px-4 py-5 space-y-4 print:p-0 print:max-w-none'
      }
    >
      {!screenshotMode ? (
        <div className="print:hidden rounded-2xl border border-stone-200 bg-white p-3.5 shadow-xs space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-xl border border-stone-300 bg-white text-stone-800 text-sm font-semibold hover:bg-stone-50 active:scale-[0.98] transition-all"
            >
              {backLabel.includes('編集') ? (
                <PencilIcon className="w-4 h-4" />
              ) : (
                <EyeIcon className="w-4 h-4" />
              )}
              <span>{backLabel}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-700 active:scale-[0.98] transition-all"
            >
              <PrinterIcon className="w-4 h-4" />
              <span>印刷 / PDF保存</span>
            </button>

            <button
              type="button"
              aria-pressed={screenshotMode}
              onClick={handleEnableScreenshotMode}
              className="inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 text-sm font-semibold hover:bg-slate-100 active:scale-[0.98] transition-all"
            >
              <CameraIcon className="w-4 h-4" />
              <span>スクショ専用モード（ボタン非表示）</span>
            </button>
          </div>
          <p className="text-xs text-stone-500">
            A4縦1枚に収まるように自動でレイアウトされます。スマホでLINEに送るならスクショ専用モードが便利です。
          </p>
        </div>
      ) : null}

      <article
        onPointerUp={handlePaperPointerUp}
        onDoubleClick={() => {
          if (screenshotMode) {
            onScreenshotModeChange(false);
          }
        }}
        className="bg-white text-stone-900 w-full max-w-[210mm] mx-auto rounded-2xl border border-stone-200 shadow-sm p-5 sm:p-7 space-y-3.5 print:max-w-none print:p-0 print:border-0 print:shadow-none print:rounded-none print:text-[10pt] print:leading-snug"
      >
        <header className="bg-slate-800 text-white rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-wider text-slate-300">
              おあずかりカンペ
            </p>
            <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
              <h1 className="text-2xl font-bold leading-tight">
                {hasText(data.profile.nickname) ? data.profile.nickname : 'お子さま'}
              </h1>
              {hasText(data.profile.ageText) ? (
                <span className="text-sm font-medium text-slate-200">
                  （{data.profile.ageText}）
                </span>
              ) : null}
            </div>
          </div>

          {(hasText(data.profile.dateLabel) || hasText(data.profile.returnTime)) ? (
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              {hasText(data.profile.dateLabel) ? (
                <span className="text-sm font-semibold text-slate-200">
                  {data.profile.dateLabel}
                </span>
              ) : null}
              {hasText(data.profile.returnTime) ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white text-slate-900 px-3 py-1 text-base sm:text-lg font-bold">
                  <span className="text-xs font-semibold text-slate-600">帰宅予定</span>
                  <span>{data.profile.returnTime}</span>
                </span>
              ) : null}
            </div>
          ) : null}
        </header>

        {showSafety ? (
          <section className="break-inside-avoid rounded-xl bg-red-50 border-2 border-red-500 text-red-950 p-3 space-y-1.5">
            <h2 className="flex items-center gap-1.5 text-sm sm:text-base font-bold text-red-950">
              <AlertTriangleIcon className="w-5 h-5 text-red-600 shrink-0" />
              <span>最優先：絶対NG・アレルギー</span>
            </h2>
            {allergies.length > 0 ? (
              <div className="text-xs sm:text-sm print:text-[9.5pt]">
                <span className="font-bold">アレルギー：</span>
                <span className="font-bold">{allergies.join(' ／ ')}</span>
              </div>
            ) : null}
            {ngList.length > 0 ? (
              <ul className="list-disc pl-5 text-xs sm:text-sm print:text-[9.5pt] space-y-0.5 font-medium sm:columns-2 print:columns-2 gap-x-5">
                {ngList.map((item, idx) => (
                  <li key={`print-ng-${idx}`} className="break-inside-avoid">
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
            {hasText(data.safety.medicalNote) ? (
              <p className="text-xs pt-1 border-t border-red-200 whitespace-pre-wrap leading-snug">
                {data.safety.medicalNote}
              </p>
            ) : null}
          </section>
        ) : null}

        {hasAnyContent ? (
          twoColumns ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3.5 items-start">
              <div className="space-y-3.5">{leftCards}</div>
              <div className="space-y-3.5">{rightCards}</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {leftCards}
              {rightCards}
            </div>
          )
        ) : (
          <p className="py-10 text-center text-sm text-stone-500">
            印刷する内容がまだ入力されていません。編集画面で入力してください。
          </p>
        )}

        <footer className="pt-2 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-400">
          <span>作成：あずけカンペ</span>
          {updatedText ? <span>更新：{updatedText}</span> : null}
        </footer>
      </article>

      {screenshotMode ? (
        <button
          type="button"
          onClick={() => onScreenshotModeChange(false)}
          className="fixed bottom-4 right-4 z-30 print:hidden inline-flex items-center gap-1.5 min-h-11 px-4 rounded-full bg-slate-900/35 text-white backdrop-blur-sm text-sm font-semibold shadow-md hover:bg-slate-900/80 active:scale-[0.98] transition-all"
        >
          <XIcon className="w-4 h-4" />
          <span>戻る</span>
        </button>
      ) : null}
    </div>
  );
}
