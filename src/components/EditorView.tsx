import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  type FeedingMode,
  INFANT_SAMPLE_KANPE,
  type KanpeData,
  TODDLER_SAMPLE_KANPE,
  normalizeKanpeData,
} from '../types/kanpe';
import {
  AGE_MONTH_OPTIONS,
  AGE_YEAR_OPTIONS,
  MILK_INTERVAL_OPTIONS,
  MILK_VOLUME_OPTIONS,
  formatAgeText,
  formatDateLabel,
  formatMilkAmount,
  parseAgeText,
  parseDateLabel,
  parseMilkAmount,
  parseTimeValue,
} from '../utils/fieldFormatters';
import { buildShareUrl, encodeKanpeToHash } from '../utils/shareCodec';
import { MiniCalendarPicker } from './MiniCalendarPicker';
import { TimeSelectPicker } from './TimeSelectPicker';
import { useToast } from './Toast';
import { ChecklistEditor } from './editor/ChecklistEditor';
import { TagListEditor } from './editor/TagListEditor';
import {
  AlertTriangleIcon,
  BabyIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChildIcon,
  ClockIcon,
  CloudCheckIcon,
  CopyIcon,
  EyeIcon,
  ListCheckIcon,
  MoonIcon,
  PhoneIcon,
  PrinterIcon,
  RotateCcwIcon,
  ShareIcon,
  UtensilsIcon,
  XIcon,
} from './icons';
import { getVisibleFeedingFields, hasText } from './kanpeDisplay';

interface EditorViewProps {
  data: KanpeData;
  onChange: (next: KanpeData) => void;
  onReset: () => void;
  onPreview: () => void;
  onPrint: () => void;
  saveFailed: boolean;
}

type SectionKey = 'profile' | 'safety' | 'feeding' | 'care' | 'checklist' | 'contacts';
type ToggleableSectionKey = Exclude<SectionKey, 'profile'>;

const FEEDING_TAB_OPTIONS: Array<{ mode: FeedingMode; label: string }> = [
  { mode: 'milk', label: 'ミルク中心' },
  { mode: 'mixed', label: 'ミルク＋離乳食' },
  { mode: 'food', label: '幼児食・おやつ' },
];

const ALLERGY_QUICK_CHIPS = [
  '卵',
  '乳',
  '小麦',
  'えび・かに',
  'そば',
  '落花生（ピーナッツ）',
];

const NG_QUICK_CHIPS = [
  'はちみつ厳禁',
  'うつぶせ寝NG',
  '熱い飲み物注意',
  'スマホ動画NG',
];

function hasUserContent(data: KanpeData): boolean {
  const { profile, safety, feeding, care, checklist, contacts } = data;
  return (
    hasText(profile.nickname) ||
    hasText(profile.ageText) ||
    hasText(profile.dateLabel) ||
    hasText(profile.returnTime) ||
    safety.allergies.some(hasText) ||
    safety.ngList.some(hasText) ||
    hasText(safety.medicalNote) ||
    hasText(feeding.milkAmount) ||
    hasText(feeding.milkHowTo) ||
    hasText(feeding.foodRules) ||
    hasText(feeding.snackRules) ||
    hasText(feeding.waterNote) ||
    hasText(care.sleepHowTo) ||
    hasText(care.diaperToilet) ||
    hasText(care.cryingTips) ||
    hasText(care.itemLocations) ||
    checklist.items.some((item) => hasText(item.text)) ||
    hasText(contacts.primaryName) ||
    hasText(contacts.primaryPhone) ||
    hasText(contacts.secondaryName) ||
    hasText(contacts.secondaryPhone) ||
    hasText(contacts.hospitalName) ||
    hasText(contacts.hospitalPhone)
  );
}

const PICKER_CLASS =
  'w-full min-h-[44px] px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 text-base text-stone-900 focus:bg-white focus:border-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500';

function FormattedPreview({
  value,
  normalized,
}: {
  value: string;
  normalized: string;
}) {
  const isCustomLegacy = hasText(value) && value !== normalized;
  return (
    <div className="mt-1.5 space-y-0.5">
      <p className="text-xs text-stone-500">
        カンペ表示：{hasText(value) ? value : '未設定（預け先には表示されません）'}
      </p>
      {isCustomLegacy ? (
        <p className="text-xs text-amber-700">
          ※以前の自由入力の内容です。選び直すと選択内容で上書きされます
        </p>
      ) : null}
    </div>
  );
}

function formatSavedTime(isoString: string): string {
  const timestamp = Date.parse(isoString);
  if (Number.isNaN(timestamp)) {
    return '';
  }
  return new Date(timestamp).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface SectionToggleProps {
  enabled: boolean;
  label: string;
  onToggle: () => void;
}

function SectionToggle({ enabled, label, onToggle }: SectionToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={`${label}をカンペに含める`}
      onClick={onToggle}
      className={`inline-flex items-center gap-2 min-h-11 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 ${
        enabled
          ? 'bg-slate-800 border-slate-800 text-white'
          : 'bg-stone-100 border-stone-300 text-stone-600'
      }`}
    >
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full ${
          enabled ? 'bg-emerald-400' : 'bg-stone-400'
        }`}
      />
      <span>{enabled ? 'ON' : 'OFF'}</span>
    </button>
  );
}

interface AccordionSectionProps {
  sectionId: string;
  title: string;
  subtitle?: string;
  icon: ReactNode;
  isOpen: boolean;
  onToggleOpen: () => void;
  enabled?: boolean;
  onToggleEnabled?: () => void;
  accent?: 'danger' | 'default';
  children: ReactNode;
}

function AccordionSection({
  sectionId,
  title,
  subtitle,
  icon,
  isOpen,
  onToggleOpen,
  enabled,
  onToggleEnabled,
  accent = 'default',
  children,
}: AccordionSectionProps) {
  const isDisabled = enabled === false;
  const borderClass =
    accent === 'danger' && !isDisabled
      ? 'border-red-300 bg-white'
      : 'border-stone-200 bg-white';

  return (
    <section className={`rounded-2xl border shadow-xs overflow-hidden ${borderClass}`}>
      <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-3">
        <button
          type="button"
          aria-expanded={isOpen && !isDisabled}
          aria-controls={`${sectionId}-panel`}
          onClick={onToggleOpen}
          className="flex-1 min-w-0 min-h-11 flex items-center gap-2.5 text-left rounded-xl px-1.5 py-1 hover:bg-stone-50 transition-colors"
        >
          <span
            className={`inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${
              accent === 'danger'
                ? 'bg-red-50 text-red-700'
                : 'bg-stone-100 text-slate-700'
            }`}
          >
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 truncate">
              {title}
            </h2>
            {subtitle ? (
              <p className="text-xs text-stone-500 truncate">{subtitle}</p>
            ) : null}
          </div>
          {!isDisabled ? (
            <span className="text-stone-400 shrink-0 px-1">
              {isOpen ? (
                <ChevronUpIcon className="w-5 h-5" />
              ) : (
                <ChevronDownIcon className="w-5 h-5" />
              )}
            </span>
          ) : null}
        </button>

        {typeof enabled === 'boolean' && onToggleEnabled ? (
          <SectionToggle enabled={enabled} label={title} onToggle={onToggleEnabled} />
        ) : (
          <span className="text-xs font-semibold text-stone-500 px-2 shrink-0">
            必須
          </span>
        )}
      </div>

      {isDisabled ? (
        <div className="px-4 sm:px-5 pb-3.5 text-xs text-stone-500 border-t border-stone-100 pt-2.5 bg-stone-50/70">
          OFF：預け先ビューや印刷シートには表示されません
        </div>
      ) : isOpen ? (
        <div
          id={`${sectionId}-panel`}
          className="px-4 sm:px-5 pb-5 pt-4 border-t border-stone-200 space-y-4"
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}

interface ShareModalProps {
  data: KanpeData;
  isOpen: boolean;
  onClose: () => void;
}

function ShareModal({ data, isOpen, onClose }: ShareModalProps) {
  const { showToast } = useToast();
  const [includeContacts, setIncludeContacts] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'fallback'>('idle');
  const urlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const copyTimerRef = useRef<number | null>(null);

  const shareUrl = useMemo(() => {
    if (!isOpen) {
      return '';
    }
    const hash = encodeKanpeToHash(data, { includeContacts });
    return buildShareUrl(hash);
  }, [data, includeContacts, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  if (!isOpen) {
    return null;
  }

  const hasAnyContact =
    data.contacts.enabled &&
    (hasText(data.contacts.primaryName) ||
      hasText(data.contacts.primaryPhone) ||
      hasText(data.contacts.secondaryName) ||
      hasText(data.contacts.secondaryPhone) ||
      hasText(data.contacts.hospitalName) ||
      hasText(data.contacts.hospitalPhone));

  const markCopied = () => {
    setCopyState('copied');
    showToast('URLをコピーしました');
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = window.setTimeout(() => {
      setCopyState('idle');
    }, 2500);
  };

  const handleCopy = async () => {
    if (!shareUrl) {
      return;
    }
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(shareUrl);
        markCopied();
        return;
      }
      throw new Error('Clipboard unavailable');
    } catch {
      const el = urlTextareaRef.current;
      if (el) {
        el.focus();
        el.select();
        try {
          if (document.execCommand('copy')) {
            markCopied();
            return;
          }
        } catch {
          // Fall through to manual copy guidance
        }
      }
      setCopyState('fallback');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white text-stone-900 shadow-xl p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-800 shrink-0">
              <ShareIcon className="w-5 h-5" />
            </span>
            <div>
              <h2 id="share-modal-title" className="text-lg font-bold text-stone-900">
                預け先へ URL で共有
              </h2>
              <p className="text-xs text-stone-500">
                サーバーに保存せず、URL自体にカンペを埋め込みます
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="共有モーダルを閉じる"
            className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl text-stone-500 hover:bg-stone-100 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-stone-900">
                  URLに電話番号・連絡先を含める
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
                  おすすめ：OFF
                </span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                チェックOFFなら連絡先を除外してURLを生成します（プライバシー保護）。
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={includeContacts}
              aria-label="URLに電話番号・連絡先を含める"
              onClick={() => {
                setIncludeContacts((prev) => !prev);
                setCopyState('idle');
              }}
              className={`relative inline-flex items-center min-h-11 min-w-16 px-1.5 rounded-full transition-colors shrink-0 ${
                includeContacts ? 'bg-slate-800' : 'bg-stone-300'
              }`}
            >
              <span
                className={`inline-block w-7 h-7 rounded-full bg-white shadow-xs transition-transform ${
                  includeContacts ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {!includeContacts ? (
            <p className="text-xs font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              連絡先はLINEのメッセージ本文や紙に直接伝えてください。
            </p>
          ) : !hasAnyContact ? (
            <p className="text-xs text-stone-500">
              ※現在、連絡先カードがOFFまたは未入力のため連絡先は含まれません。
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-semibold text-stone-700">共有用 URL</span>
            <span>文字数：{shareUrl.length}文字</span>
          </div>
          <textarea
            ref={urlTextareaRef}
            readOnly
            rows={3}
            value={shareUrl}
            aria-label="生成された共有URL"
            onClick={(e) => e.currentTarget.select()}
            className="w-full p-3 rounded-xl border border-stone-300 bg-stone-50 font-mono text-base text-stone-700 break-all resize-none focus:outline-none focus:border-slate-700"
          />
          {shareUrl.length > 2000 ? (
            <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              URLが長め（{shareUrl.length}文字）です。一部の古いアプリでは途中で切れる場合があります。
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="w-full inline-flex items-center justify-center gap-2 min-h-12 px-5 py-3 rounded-xl bg-emerald-700 text-white text-base font-bold hover:bg-emerald-800 active:bg-emerald-900 active:scale-[0.98] transition-all"
        >
          {copyState === 'copied' ? (
            <>
              <CheckIcon className="w-5 h-5" />
              <span>コピーしました！</span>
            </>
          ) : (
            <>
              <CopyIcon className="w-5 h-5" />
              <span>共有URLをコピー</span>
            </>
          )}
        </button>

        {copyState === 'fallback' ? (
          <p className="text-xs font-medium text-amber-800 text-center">
            自動コピーできない環境のため、上のURL欄を長押ししてコピーしてください。
          </p>
        ) : null}

        <p className="text-xs text-stone-600 bg-stone-50 rounded-xl p-3 leading-relaxed">
          コピーしたら、LINEやメールのトーク画面にそのまま貼り付けて送ってください。受け取った方はリンクを開くだけで見られます（アプリのインストールやログインは不要です）。
        </p>
      </div>
    </div>
  );
}

export function EditorView({
  data,
  onChange,
  onReset,
  onPreview,
  onPrint,
  saveFailed,
}: EditorViewProps) {
  const { showToast } = useToast();
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    profile: true,
    safety: true,
    feeding: true,
    care: true,
    checklist: true,
    contacts: true,
  });
  const [isShareOpen, setIsShareOpen] = useState(false);

  const updateSection = <K extends SectionKey>(
    key: K,
    patch: Partial<KanpeData[K]>,
  ) => {
    onChange({
      ...data,
      updatedAt: new Date().toISOString(),
      [key]: {
        ...data[key],
        ...patch,
      },
    });
  };

  const toggleSectionOpen = (key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSectionEnabled = (key: ToggleableSectionKey) => {
    const nextEnabled = !data[key].enabled;
    updateSection(key, { enabled: nextEnabled } as Partial<KanpeData[typeof key]>);
    if (nextEnabled) {
      setOpenSections((prev) => ({ ...prev, [key]: true }));
    }
  };

  const handleLoadPreset = (presetType: 'infant' | 'toddler') => {
    if (hasUserContent(data)) {
      const ok = window.confirm(
        '現在の入力内容がテンプレートの内容で上書きされます。よろしいですか？',
      );
      if (!ok) {
        return;
      }
    }
    const sample =
      presetType === 'infant' ? INFANT_SAMPLE_KANPE : TODDLER_SAMPLE_KANPE;
    onChange({
      ...normalizeKanpeData(sample),
      updatedAt: new Date().toISOString(),
    });
    showToast('サンプルを読み込みました');
  };

  const handleInsert8000 = () => {
    const hasExisting =
      hasText(data.contacts.hospitalName) || hasText(data.contacts.hospitalPhone);
    if (hasExisting && data.contacts.hospitalPhone.trim() !== '#8000') {
      const ok = window.confirm(
        '入力済みの病院名・電話番号を「小児救急電話相談（#8000）」に置き換えますか？',
      );
      if (!ok) {
        return;
      }
    }
    updateSection('contacts', {
      hospitalName: hasText(data.contacts.hospitalName)
        ? data.contacts.hospitalName
        : '小児救急電話相談',
      hospitalPhone: '#8000',
    });
    showToast('#8000を入力しました');
  };

  const handleResetClick = () => {
    const confirmed = window.confirm(
      '現在編集中のカンペを消去して、最初の選択画面（サンプル／白紙）に戻りますか？',
    );
    if (confirmed) {
      onReset();
    }
  };

  const savedTimeText = formatSavedTime(data.updatedAt);
  const { showMilk, showFood } = getVisibleFeedingFields(data.feeding);

  const parsedAge = parseAgeText(data.profile.ageText);
  const normalizedAgeText = formatAgeText(parsedAge.years, parsedAge.months);
  const parsedDate = parseDateLabel(data.profile.dateLabel);
  const normalizedDateLabel = formatDateLabel(parsedDate.date, parsedDate.startTime);
  const parsedReturnTime = parseTimeValue(data.profile.returnTime);
  const parsedMilk = parseMilkAmount(data.feeding.milkAmount);
  const normalizedMilkAmount = formatMilkAmount(parsedMilk.volume, parsedMilk.interval);

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            aria-live="polite"
            className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold ${
              saveFailed ? 'text-amber-800' : 'text-emerald-800'
            }`}
          >
            <CloudCheckIcon className="w-4 h-4 shrink-0" />
            <span>
              {saveFailed
                ? '自動保存に失敗しました'
                : `自動保存済み${savedTimeText ? `（${savedTimeText}）` : ''}`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleLoadPreset('infant')}
              className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl border border-stone-300 bg-stone-50 text-xs sm:text-sm font-semibold text-stone-800 hover:bg-stone-100 active:scale-[0.98] transition-all"
            >
              <BabyIcon className="w-4 h-4 text-amber-700" />
              <span>0歳児テンプレ</span>
            </button>
            <button
              type="button"
              onClick={() => handleLoadPreset('toddler')}
              className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl border border-stone-300 bg-stone-50 text-xs sm:text-sm font-semibold text-stone-800 hover:bg-stone-100 active:scale-[0.98] transition-all"
            >
              <ChildIcon className="w-4 h-4 text-emerald-700" />
              <span>幼児テンプレ</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onPreview}
            className="inline-flex items-center justify-center gap-2 min-h-12 px-4 rounded-xl border border-stone-300 bg-white text-stone-800 text-sm font-bold hover:bg-stone-50 active:scale-[0.98] transition-all"
          >
            <EyeIcon className="w-4 h-4" />
            <span>預け先画面をプレビュー</span>
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center justify-center gap-2 min-h-12 px-4 rounded-xl border border-stone-300 bg-white text-stone-800 text-sm font-bold hover:bg-stone-50 active:scale-[0.98] transition-all"
          >
            <PrinterIcon className="w-4 h-4" />
            <span>印刷 / 画像保存へ</span>
          </button>
          <button
            type="button"
            onClick={() => setIsShareOpen(true)}
            className="inline-flex items-center justify-center gap-2 min-h-12 px-4 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-700 active:bg-slate-900 active:scale-[0.98] transition-all"
          >
            <ShareIcon className="w-4 h-4" />
            <span>URL共有</span>
          </button>
        </div>
      </div>

      <AccordionSection
        sectionId="profile"
        title="1. 基本情報・帰宅予定"
        subtitle="お子さまの呼び名や預ける日時・帰宅予定時刻"
        icon={<ClockIcon />}
        isOpen={openSections.profile}
        onToggleOpen={() => toggleSectionOpen('profile')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <label className="block">
            <span className="block text-sm font-semibold text-stone-800">
              ニックネーム
            </span>
            <span className="block text-xs text-stone-500 mb-1.5">
              本名不要・愛称やイニシャルでもOK（共有URLに含まれます）
            </span>
            <input
              type="text"
              value={data.profile.nickname}
              onChange={(e) => updateSection('profile', { nickname: e.target.value })}
              placeholder="例：ひなちゃん"
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-300 bg-stone-50 text-base text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </label>

          <div>
            <span className="block text-sm font-semibold text-stone-800">
              月齢・年齢
            </span>
            <span className="block text-xs text-stone-500 mb-1.5">
              0歳児は「月齢」のみ、1歳以上は両方または年齢を選択
            </span>
            <div className="grid grid-cols-2 gap-3">
              <label htmlFor="profile-age-years" className="block">
                <span className="block text-xs font-semibold text-stone-600 mb-1">
                  年齢
                </span>
                <select
                  id="profile-age-years"
                  value={parsedAge.years}
                  onChange={(e) =>
                    updateSection('profile', {
                      ageText: formatAgeText(e.target.value, parsedAge.months),
                    })
                  }
                  className={PICKER_CLASS}
                >
                  {AGE_YEAR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label htmlFor="profile-age-months" className="block">
                <span className="block text-xs font-semibold text-stone-600 mb-1">
                  月齢
                </span>
                <select
                  id="profile-age-months"
                  value={parsedAge.months}
                  onChange={(e) =>
                    updateSection('profile', {
                      ageText: formatAgeText(parsedAge.years, e.target.value),
                    })
                  }
                  className={PICKER_CLASS}
                >
                  {AGE_MONTH_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <FormattedPreview
              value={data.profile.ageText}
              normalized={normalizedAgeText}
            />
          </div>

          <div className="sm:col-span-2">
            <span className="block text-sm font-semibold text-stone-800">
              預ける日時
            </span>
            <div className="mt-1.5 space-y-3">
              <div>
                <span className="block text-xs font-semibold text-stone-600 mb-1">
                  預ける日付
                </span>
                <MiniCalendarPicker
                  value={parsedDate.date}
                  onChange={(d) =>
                    updateSection('profile', {
                      dateLabel: formatDateLabel(d, parsedDate.startTime),
                    })
                  }
                />
              </div>

              <div className="sm:max-w-md">
                <span className="block text-xs font-semibold text-stone-600 mb-1">
                  開始時刻（任意）
                </span>
                <TimeSelectPicker
                  label="開始時刻"
                  value={parsedDate.startTime}
                  onChange={(t) =>
                    updateSection('profile', {
                      dateLabel: formatDateLabel(parsedDate.date, t),
                    })
                  }
                />
              </div>
            </div>
            <FormattedPreview
              value={data.profile.dateLabel}
              normalized={normalizedDateLabel}
            />
          </div>

          <div className="sm:col-span-2">
            <span className="block text-sm font-semibold text-stone-800 mb-1.5">
              親の帰宅予定時刻
            </span>
            <div className="sm:max-w-md">
              <TimeSelectPicker
                label="親の帰宅予定時刻"
                value={parsedReturnTime}
                onChange={(t) =>
                  updateSection('profile', { returnTime: t })
                }
              />
            </div>
            <FormattedPreview
              value={data.profile.returnTime}
              normalized={parsedReturnTime}
            />
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        sectionId="safety"
        title="2. 最優先：絶対NG・アレルギー"
        subtitle="預け先画面の一番上に赤枠で大きく表示されます"
        icon={<AlertTriangleIcon />}
        isOpen={openSections.safety}
        onToggleOpen={() => toggleSectionOpen('safety')}
        enabled={data.safety.enabled}
        onToggleEnabled={() => toggleSectionEnabled('safety')}
        accent="danger"
      >
        <TagListEditor
          inputId="allergy-input"
          label="アレルギー"
          items={data.safety.allergies}
          onChange={(allergies) => updateSection('safety', { allergies })}
          placeholder="例：卵（加熱でもNG）"
          quickChips={ALLERGY_QUICK_CHIPS}
          tone="danger"
        />

        <div className="pt-2 border-t border-stone-200">
          <TagListEditor
            inputId="ng-input"
            label="絶対NG（してはいけないこと）"
            items={data.safety.ngList}
            onChange={(ngList) => updateSection('safety', { ngList })}
            placeholder="例：ミニトマトは丸のまま与えない"
            quickChips={NG_QUICK_CHIPS}
            tone="danger"
          />
        </div>

        <div className="pt-2 border-t border-stone-200">
          <label className="block">
            <span className="block text-sm font-semibold text-stone-800 mb-1.5">
              持病・常備薬・かかりつけ医メモ
            </span>
            <textarea
              rows={3}
              value={data.safety.medicalNote}
              onChange={(e) => updateSection('safety', { medicalNote: e.target.value })}
              placeholder="例：37.5℃以上で連絡／母子手帳は青いバッグの前ポケット"
              className="w-full p-3.5 rounded-xl border border-stone-300 bg-stone-50 text-base text-stone-900 placeholder:text-stone-400 resize-y focus:bg-white focus:border-slate-700 focus:outline-none"
            />
          </label>
        </div>
      </AccordionSection>

      <AccordionSection
        sectionId="feeding"
        title="3. 授乳・食事・おやつ"
        subtitle="食事スタイルに応じて必要な入力欄だけ表示します"
        icon={<UtensilsIcon />}
        isOpen={openSections.feeding}
        onToggleOpen={() => toggleSectionOpen('feeding')}
        enabled={data.feeding.enabled}
        onToggleEnabled={() => toggleSectionEnabled('feeding')}
      >
        <div className="space-y-2">
          <span className="block text-sm font-semibold text-stone-800">
            食事スタイル
          </span>
          <div
            role="tablist"
            aria-label="食事スタイル切り替え"
            className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1 rounded-xl bg-stone-100 border border-stone-200"
          >
            {FEEDING_TAB_OPTIONS.map((option) => {
              const selected = data.feeding.mode === option.mode;
              return (
                <button
                  key={option.mode}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => updateSection('feeding', { mode: option.mode })}
                  className={`min-h-11 px-3 rounded-lg text-sm font-bold transition-colors ${
                    selected
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-stone-700 hover:bg-white/70'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {showMilk ? (
          <div className="grid grid-cols-1 gap-4">
            <div>
              <span className="block text-sm font-semibold text-stone-800 mb-1.5">
                ミルクの量・間隔
              </span>
              <div className="grid grid-cols-2 gap-3">
                <label htmlFor="feeding-milk-volume" className="block">
                  <span className="block text-xs font-semibold text-stone-600 mb-1">
                    1回の量
                  </span>
                  <select
                    id="feeding-milk-volume"
                    value={parsedMilk.volume}
                    onChange={(e) =>
                      updateSection('feeding', {
                        milkAmount: formatMilkAmount(
                          e.target.value,
                          parsedMilk.interval,
                        ),
                      })
                    }
                    className={PICKER_CLASS}
                  >
                    {MILK_VOLUME_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label htmlFor="feeding-milk-interval" className="block">
                  <span className="block text-xs font-semibold text-stone-600 mb-1">
                    間隔
                  </span>
                  <select
                    id="feeding-milk-interval"
                    value={parsedMilk.interval}
                    onChange={(e) =>
                      updateSection('feeding', {
                        milkAmount: formatMilkAmount(
                          parsedMilk.volume,
                          e.target.value,
                        ),
                      })
                    }
                    className={PICKER_CLASS}
                  >
                    {MILK_INTERVAL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <FormattedPreview
                value={data.feeding.milkAmount}
                normalized={normalizedMilkAmount}
              />
            </div>
            <label className="block">
              <span className="block text-sm font-semibold text-stone-800 mb-1.5">
                作り方・哺乳瓶の場所
              </span>
              <textarea
                rows={3}
                value={data.feeding.milkHowTo}
                onChange={(e) => updateSection('feeding', { milkHowTo: e.target.value })}
                placeholder="例：70℃以上のお湯で溶かして人肌まで冷ます。哺乳瓶はキッチン左の棚"
                className="w-full p-3.5 rounded-xl border border-stone-300 bg-stone-50 text-base text-stone-900 placeholder:text-stone-400 resize-y focus:bg-white focus:border-slate-700 focus:outline-none"
              />
            </label>
          </div>
        ) : null}

        {showFood ? (
          <div className="grid grid-cols-1 gap-4">
            <label className="block">
              <span className="block text-sm font-semibold text-stone-800 mb-1.5">
                食事ルール（離乳食・ごはん）
              </span>
              <textarea
                rows={3}
                value={data.feeding.foodRules}
                onChange={(e) => updateSection('feeding', { foodRules: e.target.value })}
                placeholder="例：12時に用意したお弁当を500Wで1分半温める"
                className="w-full p-3.5 rounded-xl border border-stone-300 bg-stone-50 text-base text-stone-900 placeholder:text-stone-400 resize-y focus:bg-white focus:border-slate-700 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-stone-800 mb-1.5">
                おやつルール
              </span>
              <textarea
                rows={2}
                value={data.feeding.snackRules}
                onChange={(e) => updateSection('feeding', { snackRules: e.target.value })}
                placeholder="例：15時にテーブルの上の袋を1つだけ"
                className="w-full p-3.5 rounded-xl border border-stone-300 bg-stone-50 text-base text-stone-900 placeholder:text-stone-400 resize-y focus:bg-white focus:border-slate-700 focus:outline-none"
              />
            </label>
          </div>
        ) : null}

        <label className="block">
          <span className="block text-sm font-semibold text-stone-800 mb-1.5">
            水分補給メモ
          </span>
          <textarea
            rows={2}
            value={data.feeding.waterNote}
            onChange={(e) => updateSection('feeding', { waterNote: e.target.value })}
            placeholder="例：麦茶・白湯をストローマグでこまめに"
            className="w-full p-3.5 rounded-xl border border-stone-300 bg-stone-50 text-base text-stone-900 placeholder:text-stone-400 resize-y focus:bg-white focus:border-slate-700 focus:outline-none"
          />
        </label>
      </AccordionSection>

      <AccordionSection
        sectionId="care"
        title="4. お世話・生活ルーティン"
        subtitle="寝かしつけ・オムツ／トイレ・泣き止むコツ・物の場所"
        icon={<MoonIcon />}
        isOpen={openSections.care}
        onToggleOpen={() => toggleSectionOpen('care')}
        enabled={data.care.enabled}
        onToggleEnabled={() => toggleSectionEnabled('care')}
      >
        <div className="grid grid-cols-1 gap-4">
          <label className="block">
            <span className="block text-sm font-semibold text-stone-800 mb-1.5">
              寝かしつけ・昼寝
            </span>
            <textarea
              rows={3}
              value={data.care.sleepHowTo}
              onChange={(e) => updateSection('care', { sleepHowTo: e.target.value })}
              placeholder="例：13時ごろ絵本1冊読んでトントン。15時までには起こす"
              className="w-full p-3.5 rounded-xl border border-stone-300 bg-stone-50 text-base text-stone-900 placeholder:text-stone-400 resize-y focus:bg-white focus:border-slate-700 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-stone-800 mb-1.5">
              オムツ・トイレ
            </span>
            <textarea
              rows={3}
              value={data.care.diaperToilet}
              onChange={(e) => updateSection('care', { diaperToilet: e.target.value })}
              placeholder="例：3〜4時間ごとに交換／1〜2時間おきにトイレ声かけ"
              className="w-full p-3.5 rounded-xl border border-stone-300 bg-stone-50 text-base text-stone-900 placeholder:text-stone-400 resize-y focus:bg-white focus:border-slate-700 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-stone-800 mb-1.5">
              泣き止むコツ・好きな遊び
            </span>
            <textarea
              rows={3}
              value={data.care.cryingTips}
              onChange={(e) => updateSection('care', { cryingTips: e.target.value })}
              placeholder="例：電車の絵本やブロックが好き。ぐずったら窓の外を見せる"
              className="w-full p-3.5 rounded-xl border border-stone-300 bg-stone-50 text-base text-stone-900 placeholder:text-stone-400 resize-y focus:bg-white focus:border-slate-700 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-stone-800 mb-1.5">
              着替え・持ち物の置き場所
            </span>
            <textarea
              rows={3}
              value={data.care.itemLocations}
              onChange={(e) => updateSection('care', { itemLocations: e.target.value })}
              placeholder="例：オムツ：リビング白い棚2段目／着替え：玄関の青いバッグ"
              className="w-full p-3.5 rounded-xl border border-stone-300 bg-stone-50 text-base text-stone-900 placeholder:text-stone-400 resize-y focus:bg-white focus:border-slate-700 focus:outline-none"
            />
          </label>
        </div>
      </AccordionSection>

      <AccordionSection
        sectionId="checklist"
        title="5. 預け先用・手元チェックリスト"
        subtitle="預け先が1タップで完了チェックできます"
        icon={<ListCheckIcon />}
        isOpen={openSections.checklist}
        onToggleOpen={() => toggleSectionOpen('checklist')}
        enabled={data.checklist.enabled}
        onToggleEnabled={() => toggleSectionEnabled('checklist')}
      >
        <ChecklistEditor
          items={data.checklist.items}
          onChange={(items) => updateSection('checklist', { items })}
        />
      </AccordionSection>

      <AccordionSection
        sectionId="contacts"
        title="6. 緊急連絡先"
        subtitle="URL共有時は電話番号を除外する設定も選べます"
        icon={<PhoneIcon />}
        isOpen={openSections.contacts}
        onToggleOpen={() => toggleSectionOpen('contacts')}
        enabled={data.contacts.enabled}
        onToggleEnabled={() => toggleSectionEnabled('contacts')}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200">
            <label className="block">
              <span className="block text-xs font-semibold text-stone-600 mb-1">
                連絡先1（名前）
              </span>
              <input
                type="text"
                value={data.contacts.primaryName}
                onChange={(e) =>
                  updateSection('contacts', { primaryName: e.target.value })
                }
                placeholder="例：ママ（さくら）"
                className="w-full min-h-11 px-3 py-2 rounded-xl border border-stone-300 bg-white text-base text-stone-900 placeholder:text-stone-400 focus:border-slate-700 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-stone-600 mb-1">
                連絡先1（電話番号）
              </span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="off"
                value={data.contacts.primaryPhone}
                onChange={(e) =>
                  updateSection('contacts', { primaryPhone: e.target.value })
                }
                placeholder="例：090-1234-5678"
                className="w-full min-h-11 px-3 py-2 rounded-xl border border-stone-300 bg-white text-base text-stone-900 placeholder:text-stone-400 focus:border-slate-700 focus:outline-none"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200">
            <label className="block">
              <span className="block text-xs font-semibold text-stone-600 mb-1">
                連絡先2（名前）
              </span>
              <input
                type="text"
                value={data.contacts.secondaryName}
                onChange={(e) =>
                  updateSection('contacts', { secondaryName: e.target.value })
                }
                placeholder="例：パパ（たくみ）"
                className="w-full min-h-11 px-3 py-2 rounded-xl border border-stone-300 bg-white text-base text-stone-900 placeholder:text-stone-400 focus:border-slate-700 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-stone-600 mb-1">
                連絡先2（電話番号）
              </span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="off"
                value={data.contacts.secondaryPhone}
                onChange={(e) =>
                  updateSection('contacts', { secondaryPhone: e.target.value })
                }
                placeholder="例：090-8765-4321"
                className="w-full min-h-11 px-3 py-2 rounded-xl border border-stone-300 bg-white text-base text-stone-900 placeholder:text-stone-400 focus:border-slate-700 focus:outline-none"
              />
            </label>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-stone-700">
                かかりつけ病院 / #8000
              </span>
              <button
                type="button"
                onClick={handleInsert8000}
                className="inline-flex items-center min-h-11 px-3 rounded-xl border border-stone-300 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
              >
                #8000（小児救急電話相談）を入れる
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs font-semibold text-stone-600 mb-1">
                  病院・相談窓口の名称
                </span>
                <input
                  type="text"
                  value={data.contacts.hospitalName}
                  onChange={(e) =>
                    updateSection('contacts', { hospitalName: e.target.value })
                  }
                  placeholder="例：〇〇こどもクリニック"
                  className="w-full min-h-11 px-3 py-2 rounded-xl border border-stone-300 bg-white text-base text-stone-900 placeholder:text-stone-400 focus:border-slate-700 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-semibold text-stone-600 mb-1">
                  電話番号
                </span>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  value={data.contacts.hospitalPhone}
                  onChange={(e) =>
                    updateSection('contacts', { hospitalPhone: e.target.value })
                  }
                  placeholder="例：03-1234-5678 / #8000"
                  className="w-full min-h-11 px-3 py-2 rounded-xl border border-stone-300 bg-white text-base text-stone-900 placeholder:text-stone-400 focus:border-slate-700 focus:outline-none"
                />
              </label>
            </div>
          </div>
        </div>
      </AccordionSection>

      <div className="pt-2 pb-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setIsShareOpen(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-12 px-6 py-3 rounded-xl bg-slate-800 text-white text-base font-bold hover:bg-slate-700 active:scale-[0.98] transition-all"
        >
          <ShareIcon className="w-5 h-5" />
          <span>共有URLを作成する</span>
        </button>
        <button
          type="button"
          onClick={handleResetClick}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-11 px-5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-700 text-sm font-medium hover:bg-stone-100 active:scale-[0.98] transition-all"
        >
          <RotateCcwIcon className="w-4 h-4" />
          <span>最初からやり直す</span>
        </button>
      </div>

      <ShareModal
        data={data}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
    </div>
  );
}
