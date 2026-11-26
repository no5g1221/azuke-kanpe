import { type KeyboardEvent, useState } from 'react';
import { type ChecklistItem, createChecklistItemId } from '../../types/kanpe';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  XIcon,
} from '../icons';

interface ChecklistEditorProps {
  items: ChecklistItem[];
  onChange: (next: ChecklistItem[]) => void;
}

const SUGGESTED_CHECK_ITEMS = [
  'ミルク・食事の時間をメモ',
  'オムツ替え・トイレ',
  'お昼寝の時間をメモ',
  '体温確認（37.5℃以上なら連絡）',
  '帰る前に持ち物確認',
];

export function ChecklistEditor({ items, onChange }: ChecklistEditorProps) {
  const [newText, setNewText] = useState('');

  const addTextItem = (raw: string): boolean => {
    const trimmed = raw.trim();
    if (!trimmed) {
      return false;
    }
    onChange([...items, { id: createChecklistItemId(), text: trimmed }]);
    return true;
  };

  const handleAddNew = () => {
    if (addTextItem(newText)) {
      setNewText('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      handleAddNew();
    }
  };

  const handleUpdateText = (id: string, text: string) => {
    onChange(items.map((item) => (item.id === id ? { ...item, text } : item)));
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) {
      return;
    }
    const current = items[index];
    const target = items[targetIndex];
    if (!current || !target) {
      return;
    }
    const next = [...items];
    next[index] = target;
    next[targetIndex] = current;
    onChange(next);
  };

  const handleDelete = (index: number) => {
    onChange(items.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-3">
      {items.length > 0 ? (
        <ul className="space-y-2" aria-label="チェックリスト項目">
          {items.map((item, idx) => (
            <li
              key={item.id}
              className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 p-2 rounded-xl bg-stone-50 border border-stone-200"
            >
              <span className="w-6 text-center text-xs font-bold text-stone-500 shrink-0">
                {idx + 1}.
              </span>
              <input
                type="text"
                value={item.text}
                onChange={(e) => handleUpdateText(item.id, e.target.value)}
                aria-label={`チェック項目 ${idx + 1}`}
                placeholder="項目を入力..."
                className="flex-1 min-w-40 min-h-11 px-3 py-2 rounded-lg border border-stone-300 bg-white text-base text-stone-900 placeholder:text-stone-400 focus:border-slate-700 focus:outline-none"
              />
              <div className="flex items-center gap-1 ml-auto shrink-0">
                <button
                  type="button"
                  onClick={() => handleMove(idx, -1)}
                  disabled={idx === 0}
                  aria-label={`「${item.text || `項目${idx + 1}`}」を上に移動`}
                  className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-default transition-colors"
                >
                  <ChevronUpIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(idx, 1)}
                  disabled={idx === items.length - 1}
                  aria-label={`「${item.text || `項目${idx + 1}`}」を下に移動`}
                  className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-default transition-colors"
                >
                  <ChevronDownIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(idx)}
                  aria-label={`「${item.text || `項目${idx + 1}`}」を削除`}
                  className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg border border-stone-300 bg-white text-red-700 hover:bg-red-50 transition-colors"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-center text-sm text-stone-500">
          チェック項目がありません。下の入力欄または候補から追加できます。
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="新しいチェック項目"
          placeholder="新しいチェック項目を入力..."
          className="flex-1 min-w-0 min-h-11 px-3.5 py-2 rounded-xl border border-stone-300 bg-stone-50 text-base text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-slate-700 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleAddNew}
          disabled={!newText.trim()}
          className="inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 disabled:bg-stone-300 disabled:text-stone-500 transition-colors shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          <span>追加</span>
        </button>
      </div>

      <div className="space-y-1.5 pt-1">
        <p className="text-xs font-medium text-stone-500">よく使う項目を追加：</p>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_CHECK_ITEMS.map((suggestion) => {
            const exists = items.some((item) => item.text.trim() === suggestion);
            return (
              <button
                key={suggestion}
                type="button"
                disabled={exists}
                onClick={() => addTextItem(suggestion)}
                className={`inline-flex items-center gap-1 min-h-11 px-3 rounded-xl border text-xs sm:text-sm font-medium transition-colors ${
                  exists
                    ? 'bg-stone-100 border-stone-200 text-stone-400 cursor-default'
                    : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100 active:bg-stone-200'
                }`}
              >
                {exists ? (
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <PlusIcon className="w-3.5 h-3.5" />
                )}
                <span>{suggestion}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
