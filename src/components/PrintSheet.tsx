import { useEffect, useState } from 'react';
import type { KanpeData } from '../types/kanpe';
import {
  buildKanpeImageFilename,
  generateKanpePngBlob,
} from '../utils/kanpeImageGenerator';
import { useToast } from './Toast';
import {
  AlertTriangleIcon,
  DownloadIcon,
  EyeIcon,
  ImageIcon,
  PencilIcon,
  PrinterIcon,
  ShareIcon,
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
}

interface ImageExportModalProps {
  data: KanpeData;
  isOpen: boolean;
  onClose: () => void;
}

function ImageExportModal({ data, isOpen, onClose }: ImageExportModalProps) {
  const { showToast } = useToast();
  const canIncludeContacts =
    data.contacts.enabled && hasContactsContent(data.contacts);

  const [includeContacts, setIncludeContacts] = useState(true);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setIncludeContacts(true);
    }
  }, [isOpen]);

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
    if (!isOpen) {
      setStatus('idle');
      setPreviewUrl(null);
      setFile(null);
      setErrorMessage('');
      return;
    }

    let cancelled = false;
    let createdUrl: string | null = null;

    setStatus('loading');
    setPreviewUrl(null);
    setFile(null);
    setErrorMessage('');

    generateKanpePngBlob(data, {
      includeContacts: canIncludeContacts && includeContacts,
    })
      .then((blob) => {
        if (cancelled) {
          return;
        }
        const url = URL.createObjectURL(blob);
        createdUrl = url;
        const generatedFile = new File([blob], buildKanpeImageFilename(data), {
          type: 'image/png',
        });
        setPreviewUrl(url);
        setFile(generatedFile);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setErrorMessage(
          err instanceof Error ? err.message : '画像の生成に失敗しました',
        );
        setStatus('error');
      });

    return () => {
      cancelled = true;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isOpen, data, includeContacts, canIncludeContacts, retryToken]);

  if (!isOpen) {
    return null;
  }

  let canShareFile = false;
  if (
    file &&
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function'
  ) {
    try {
      canShareFile = navigator.canShare({ files: [file] });
    } catch {
      canShareFile = false;
    }
  }

  const handleShare = async () => {
    if (!file) {
      return;
    }
    try {
      await navigator.share({ files: [file], title: 'あずけカンペ' });
    } catch (err: unknown) {
      if (
        (err instanceof DOMException && err.name === 'AbortError') ||
        (typeof err === 'object' &&
          err !== null &&
          'name' in err &&
          (err as { name?: string }).name === 'AbortError')
      ) {
        return;
      }
      showToast('共有できませんでした。「画像を保存（PNG）」をお試しください', 'info');
    }
  };

  const handleDownload = () => {
    if (!previewUrl || !file) {
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = previewUrl;
    anchor.download = file.name;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    showToast('画像を保存しました');
  };

  return (
    <div
      className="fixed inset-0 z-50 print:hidden flex items-end sm:items-center justify-center bg-slate-950/60 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-export-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white text-stone-900 shadow-xl p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
              <ImageIcon className="w-5 h-5" />
            </span>
            <div>
              <h2
                id="image-export-modal-title"
                className="text-lg font-bold text-stone-900"
              >
                1枚の画像として保存
              </h2>
              <p className="text-xs text-stone-500">
                LINEでそのまま送れるスマホ向け縦長PNGを作成します
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="画像保存モーダルを閉じる"
            className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl text-stone-500 hover:bg-stone-100 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {canIncludeContacts ? (
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="block text-sm font-bold text-stone-900">
                  緊急連絡先を画像に含める
                </span>
                <p className="text-xs text-stone-600 leading-relaxed">
                  LINE等へそのまま送る場合はON、別途伝える場合はOFFにできます。
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={includeContacts}
                aria-label="緊急連絡先を画像に含める"
                onClick={() => setIncludeContacts((prev) => !prev)}
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
          </div>
        ) : null}

        {status === 'loading' ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-stone-600">
            <span
              aria-hidden="true"
              className="w-10 h-10 rounded-full border-4 border-stone-200 border-t-emerald-700 animate-spin motion-reduce:animate-none"
            />
            <p className="text-sm font-semibold">1枚の画像を作成しています…</p>
          </div>
        ) : status === 'error' ? (
          <div className="rounded-xl border border-red-300 bg-red-50 text-red-900 p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangleIcon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-bold">画像を作成できませんでした</p>
                <p className="text-xs text-red-800">{errorMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRetryToken((prev) => prev + 1)}
              className="w-full min-h-11 px-4 rounded-xl bg-red-700 text-white text-sm font-bold hover:bg-red-800 active:scale-[0.98] transition-all"
            >
              もう一度試す
            </button>
          </div>
        ) : status === 'ready' && previewUrl ? (
          <div className="space-y-3">
            <p className="text-xs text-stone-600 bg-stone-50 rounded-xl px-3 py-2 leading-relaxed">
              スマホでうまく保存できない場合は、下の画像を長押しして保存できます
            </p>

            <div className="max-h-[50dvh] overflow-y-auto rounded-xl border border-stone-200 bg-stone-100 p-2">
              <img
                src={previewUrl}
                alt="あずけカンペの画像プレビュー"
                className="w-full h-auto rounded-lg shadow-xs"
              />
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              {canShareFile ? (
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full inline-flex items-center justify-center gap-2 min-h-12 px-5 py-3 rounded-xl bg-emerald-700 text-white text-base font-bold hover:bg-emerald-800 active:scale-[0.98] transition-all"
                >
                  <ShareIcon className="w-5 h-5" />
                  <span>LINE等で送る / 共有</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleDownload}
                className={
                  canShareFile
                    ? 'w-full inline-flex items-center justify-center gap-2 min-h-12 px-5 py-3 rounded-xl border border-stone-300 bg-white text-stone-800 text-base font-bold hover:bg-stone-50 active:scale-[0.98] transition-all'
                    : 'w-full inline-flex items-center justify-center gap-2 min-h-12 px-5 py-3 rounded-xl bg-slate-800 text-white text-base font-bold hover:bg-slate-700 active:scale-[0.98] transition-all'
                }
              >
                <DownloadIcon className="w-5 h-5" />
                <span>画像を保存（PNG）</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
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

export function PrintSheet({ data, onBack, backLabel }: PrintSheetProps) {
  const { showToast } = useToast();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

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

  const handleOpenImageModal = () => {
    if (!hasAnyContent) {
      showToast('先に編集画面で内容を入力してください', 'info');
      return;
    }
    setIsImageModalOpen(true);
  };

  return (
    <div className="max-w-[210mm] mx-auto px-4 py-5 space-y-4 print:p-0 print:max-w-none">
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
            onClick={handleOpenImageModal}
            className="inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-xl bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800 active:scale-[0.98] transition-all"
          >
            <ImageIcon className="w-4 h-4" />
            <span>1枚の画像として保存</span>
          </button>
        </div>
        <p className="text-xs text-stone-500">
          A4縦1枚に収まるように印刷できます。スマホでLINEに送るなら『1枚の画像として保存』が便利です。
        </p>
      </div>

      <article className="bg-white text-stone-900 w-full max-w-[210mm] mx-auto rounded-2xl border border-stone-200 shadow-sm p-5 sm:p-7 space-y-3.5 print:max-w-none print:p-0 print:border-0 print:shadow-none print:rounded-none print:text-[10pt] print:leading-snug">
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

      <ImageExportModal
        data={data}
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
      />
    </div>
  );
}
