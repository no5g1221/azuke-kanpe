import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { EditorView } from './components/EditorView';
import { GuestView } from './components/GuestView';
import { PrintSheet } from './components/PrintSheet';
import { useToast } from './components/Toast';
import {
  AlertTriangleIcon,
  BabyIcon,
  ChildIcon,
  EyeIcon,
  FileBlankIcon,
  ListCheckIcon,
  PencilIcon,
  PrinterIcon,
  ShareIcon,
} from './components/icons';
import {
  type AppViewMode,
  INFANT_SAMPLE_KANPE,
  type KanpeData,
  TODDLER_SAMPLE_KANPE,
  createEmptyKanpe,
  normalizeKanpeData,
} from './types/kanpe';
import { decodeKanpeFromHash, getHashPayload } from './utils/shareCodec';
import {
  clearDraft,
  createKanpeStorageKey,
  loadDraft,
  saveDraft,
} from './utils/storage';

type DataSource = 'draft' | 'shared' | null;

interface TabOption {
  mode: AppViewMode;
  label: string;
  icon: ReactNode;
}

const DRAFT_TABS: TabOption[] = [
  { mode: 'editor', label: '編集', icon: <PencilIcon className="w-4 h-4" /> },
  { mode: 'guest', label: 'プレビュー', icon: <EyeIcon className="w-4 h-4" /> },
  { mode: 'print', label: '印刷', icon: <PrinterIcon className="w-4 h-4" /> },
];

const SHARED_TABS: TabOption[] = [
  { mode: 'guest', label: 'カンペ', icon: <EyeIcon className="w-4 h-4" /> },
  { mode: 'print', label: '印刷', icon: <PrinterIcon className="w-4 h-4" /> },
];

export default function App() {
  const { showToast } = useToast();
  const [data, setData] = useState<KanpeData | null>(null);
  const [viewMode, setViewMode] = useState<AppViewMode>('editor');
  const [source, setSource] = useState<DataSource>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [checksKey, setChecksKey] = useState<string>('draft-preview');
  const [storageError, setStorageError] = useState<boolean>(false);
  const [screenshotMode, setScreenshotMode] = useState<boolean>(false);

  const syncFromLocation = useCallback(() => {
    const hash = window.location.hash;
    const decoded = decodeKanpeFromHash(hash);

    if (decoded === null) {
      const draft = loadDraft();
      setShareError(null);
      setChecksKey('draft-preview');
      if (draft) {
        setData(draft);
        setSource('draft');
        setViewMode('editor');
      } else {
        setData(null);
        setSource(null);
        setViewMode('editor');
      }
      return;
    }

    if (decoded.ok) {
      const payload = getHashPayload(hash) ?? '';
      setData(decoded.data);
      setSource('shared');
      setViewMode('guest');
      setShareError(null);
      setChecksKey(createKanpeStorageKey(payload));
      return;
    }

    setData(null);
    setSource('shared');
    setShareError(decoded.error);
  }, []);

  useEffect(() => {
    syncFromLocation();
    window.addEventListener('hashchange', syncFromLocation);
    return () => {
      window.removeEventListener('hashchange', syncFromLocation);
    };
  }, [syncFromLocation]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (viewMode !== 'print') {
      setScreenshotMode(false);
    }
  }, [viewMode]);

  const handleSelectStarter = (starter: 'infant' | 'toddler' | 'empty') => {
    const now = new Date().toISOString();
    let initial: KanpeData;
    if (starter === 'infant') {
      initial = { ...normalizeKanpeData(INFANT_SAMPLE_KANPE), updatedAt: now };
    } else if (starter === 'toddler') {
      initial = { ...normalizeKanpeData(TODDLER_SAMPLE_KANPE), updatedAt: now };
    } else {
      initial = createEmptyKanpe();
    }

    const saved = saveDraft(initial);
    setStorageError(!saved);
    setData(initial);
    setSource('draft');
    setViewMode('editor');
    setChecksKey('draft-preview');
    showToast(
      starter === 'empty'
        ? '白紙のカンペを作成しました'
        : 'サンプルを読み込みました',
    );
  };

  const handleDraftChange = (next: KanpeData) => {
    setData(next);
    const saved = saveDraft(next);
    setStorageError(!saved);
  };

  const handleDraftReset = () => {
    clearDraft();
    setStorageError(false);
    setData(null);
    setSource(null);
    setViewMode('editor');
  };

  const handleImportShared = () => {
    if (!data) {
      return;
    }
    const hasExistingDraft = loadDraft() !== null;
    const message = hasExistingDraft
      ? 'この内容を親用の下書きとして取り込み、編集画面を開きます。\n※この端末に保存済みの下書きは上書きされます。\nよろしいですか？'
      : 'この内容を親用の下書きとして取り込み、編集画面を開きます。よろしいですか？';

    if (!window.confirm(message)) {
      return;
    }

    const next: KanpeData = {
      ...normalizeKanpeData(data),
      updatedAt: new Date().toISOString(),
    };
    const saved = saveDraft(next);
    setStorageError(!saved);

    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}`,
    );
    setData(next);
    setSource('draft');
    setViewMode('editor');
    setChecksKey('draft-preview');
    setShareError(null);
    showToast('下書きとして取り込みました');
  };

  const handleExitShareError = () => {
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}`,
    );
    syncFromLocation();
  };

  const tabs = source === 'shared' ? SHARED_TABS : DRAFT_TABS;
  const hideHeader = screenshotMode && viewMode === 'print';

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900 print:bg-white">
      {!hideHeader ? (
        <header className="bg-slate-800 text-white print:hidden sticky top-0 z-20 shadow-xs">
          <div className="max-w-4xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-lg font-bold tracking-tight">あずけカンペ</span>
              {source === 'shared' && data ? (
                <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-200 text-xs font-medium">
                  共有ビュー
                </span>
              ) : null}
            </div>

            {data ? (
              <nav
                role="tablist"
                aria-label="表示モード切り替え"
                className="inline-flex items-center rounded-xl bg-slate-900/60 p-1 gap-1"
              >
                {tabs.map((tab) => {
                  const selected = viewMode === tab.mode;
                  return (
                    <button
                      key={tab.mode}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setViewMode(tab.mode)}
                      className={`inline-flex items-center justify-center gap-1.5 min-h-11 px-3.5 rounded-lg text-sm font-semibold active:scale-[0.98] transition-all ${
                        selected
                          ? 'bg-white text-slate-900'
                          : 'text-slate-200 hover:bg-slate-700/70'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            ) : null}
          </div>

          {storageError && source === 'draft' ? (
            <div className="bg-amber-500 text-slate-950 text-xs sm:text-sm font-semibold px-4 py-2 text-center">
              保存できませんでした（ブラウザの空き容量やプライベートブラウズ設定をご確認ください）
            </div>
          ) : null}
        </header>
      ) : null}

      <main className={hideHeader ? '' : 'pb-10 print:pb-0'}>
        {shareError ? (
          <div className="max-w-lg mx-auto px-4 py-10 sm:py-14">
            <div className="rounded-2xl bg-red-50 border-2 border-red-500 text-red-950 p-6 space-y-5 shadow-xs">
              <div className="flex items-start gap-3">
                <AlertTriangleIcon className="w-7 h-7 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <h1 className="text-lg sm:text-xl font-bold leading-snug">
                    共有URLが途中で切れているか、正しく読み込めませんでした
                  </h1>
                  <p className="text-xs sm:text-sm text-red-900/80 leading-relaxed">
                    詳細：{shareError}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-white/80 border border-red-200 p-4 space-y-2 text-sm text-red-950">
                <p className="font-bold">
                  もう一度送信元からURLをコピーし直してください
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-xs sm:text-sm leading-relaxed">
                  <li>LINE等で届いたURLを長押しする</li>
                  <li>「コピー」を選ぶ（末尾まで全部選択）</li>
                  <li>ブラウザのアドレス欄に貼り付けて開き直す</li>
                </ol>
              </div>

              <button
                type="button"
                onClick={handleExitShareError}
                className="w-full min-h-12 px-5 py-3 rounded-xl bg-slate-800 text-white text-base font-bold hover:bg-slate-700 active:scale-[0.98] transition-all"
              >
                自分のカンペを新しく作る
              </button>
            </div>
          </div>
        ) : !data ? (
          <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-8">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-800 text-white shadow-sm">
                <ListCheckIcon className="w-7 h-7" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">
                あずけカンペ
              </h1>
              <p className="text-sm sm:text-base text-stone-600 max-w-xl mx-auto leading-relaxed">
                祖父母・ベビーシッターに預ける日の“1日カンペ”を3分で。
                <br className="hidden sm:inline" />
                まず近いテンプレートを選んで始めましょう。
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-stone-200">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-red-50 text-red-600 shrink-0">
                  <AlertTriangleIcon className="w-5 h-5" />
                </span>
                <p className="text-xs sm:text-sm font-medium text-stone-700">
                  絶対NG・アレルギーを赤枠で最優先表示
                </p>
              </div>
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-stone-200">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 text-slate-700 shrink-0">
                  <ShareIcon className="w-5 h-5" />
                </span>
                <p className="text-xs sm:text-sm font-medium text-stone-700">
                  URLを送るだけ・アプリや登録は不要
                </p>
              </div>
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-stone-200">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-stone-100 text-stone-700 shrink-0">
                  <PrinterIcon className="w-5 h-5" />
                </span>
                <p className="text-xs sm:text-sm font-medium text-stone-700">
                  A4印刷・スマホスクショにもそのまま対応
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => handleSelectStarter('infant')}
                className="flex flex-col items-start text-left gap-3 p-5 min-h-28 rounded-2xl border-2 border-stone-200 bg-white shadow-xs hover:border-slate-600 hover:shadow-sm active:scale-[0.98] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-800"
              >
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-amber-100 text-amber-900">
                  <BabyIcon className="w-6 h-6" />
                </span>
                <div>
                  <div className="text-base font-bold text-stone-900">
                    0歳児サンプルで始める
                  </div>
                  <p className="mt-1 text-sm text-stone-600 leading-snug">
                    ミルク量・温度・うつぶせ寝NG・はちみつ厳禁などが入った見本
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectStarter('toddler')}
                className="flex flex-col items-start text-left gap-3 p-5 min-h-28 rounded-2xl border-2 border-stone-200 bg-white shadow-xs hover:border-slate-600 hover:shadow-sm active:scale-[0.98] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-800"
              >
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-100 text-emerald-900">
                  <ChildIcon className="w-6 h-6" />
                </span>
                <div>
                  <div className="text-base font-bold text-stone-900">
                    幼児サンプルで始める
                  </div>
                  <p className="mt-1 text-sm text-stone-600 leading-snug">
                    アレルギー・おやつルール・トイレ声かけ・好きな遊びが入った見本
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectStarter('empty')}
                className="flex flex-col items-start text-left gap-3 p-5 min-h-28 rounded-2xl border-2 border-stone-200 bg-white shadow-xs hover:border-slate-600 hover:shadow-sm active:scale-[0.98] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-800"
              >
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-stone-100 text-stone-700">
                  <FileBlankIcon className="w-6 h-6" />
                </span>
                <div>
                  <div className="text-base font-bold text-stone-900">白紙から作る</div>
                  <p className="mt-1 text-sm text-stone-600 leading-snug">
                    何も入っていないまっさらな状態から入力を始めます
                  </p>
                </div>
              </button>
            </div>

            <p className="text-center text-xs text-stone-500">
              入力内容はこの端末とURLの中だけに保存され、サーバーには送信されません。
            </p>
          </div>
        ) : viewMode === 'editor' && source === 'draft' ? (
          <EditorView
            data={data}
            onChange={handleDraftChange}
            onReset={handleDraftReset}
            onPreview={() => setViewMode('guest')}
            onPrint={() => setViewMode('print')}
            saveFailed={storageError}
          />
        ) : viewMode === 'print' ? (
          <PrintSheet
            data={data}
            onBack={() =>
              setViewMode(source === 'draft' ? 'editor' : 'guest')
            }
            backLabel={source === 'draft' ? '編集に戻る' : 'カンペに戻る'}
            screenshotMode={screenshotMode}
            onScreenshotModeChange={setScreenshotMode}
          />
        ) : (
          <GuestView
            data={data}
            checksKey={checksKey}
            isPreview={source === 'draft'}
            onBackToEditor={
              source === 'draft' ? () => setViewMode('editor') : undefined
            }
            onImportToEditor={
              source === 'shared' ? handleImportShared : undefined
            }
          />
        )}
      </main>
    </div>
  );
}
