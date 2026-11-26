import { type KeyboardEvent, useState } from 'react';
import { CheckIcon, PlusIcon, XIcon } from '../icons';

interface TagListEditorProps {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  quickChips?: string[];
  tone: 'danger' | 'default';
  inputId: string;
}

export function TagListEditor({
  label,
  items,
  onChange,
  placeholder,
  quickChips = [],
  tone,
  inputId,
}: TagListEditorProps) {
  const [draft, setDraft] = useState('');

  const addItem = (raw: string): boolean => {
    const trimmed = raw.trim();
    if (!trimmed || items.includes(trimmed)) {
      return false;
    }
    onChange([...items, trimmed]);
    return true;
  };

  const handleAddFromInput = () => {
    if (addItem(draft)) {
      setDraft('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      handleAddFromInput();
    }
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, idx) => idx !== index));
  };

  const chipStyle =
    tone === 'danger'
      ? 'bg-red-100 text-red-950 border-red-300'
      : 'bg-stone-100 text-stone-900 border-stone-300';

  const removeHoverStyle =
    tone === 'danger'
      ? 'text-red-800 hover:bg-red-200'
      : 'text-stone-600 hover:bg-stone-200';

  return (
    <div className="space-y-2.5">
      <label htmlFor={inputId} className="block text-sm font-semibold text-stone-800">
        {label}
      </label>

      {items.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label={`${label}の一覧`}>
          {items.map((item, idx) => (
            <li
              key={`${item}-${idx}`}
              className={`inline-flex items-center max-w-full rounded-xl border pl-3 pr-1 py-1 text-sm font-medium ${chipStyle}`}
            >
              <span className="break-words">{item}</span>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                aria-label={`「${item}」を削除`}
                className={`inline-flex items-center justify-center min-h-11 min-w-11 ml-1 rounded-lg transition-colors shrink-0 ${removeHoverStyle}`}
              >
                <XIcon className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-stone-500">まだ登録されていません</p>
      )}

      <div className="flex gap-2">
        <input
          id={inputId}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 min-w-0 min-h-11 px-3.5 py-2 rounded-xl border border-stone-300 bg-stone-50 text-base text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-slate-700 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleAddFromInput}
          disabled={!draft.trim()}
          className="inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 disabled:bg-stone-300 disabled:text-stone-500 transition-colors shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          <span>追加</span>
        </button>
      </div>

      {quickChips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {quickChips.map((chip) => {
            const added = items.includes(chip);
            return (
              <button
                key={chip}
                type="button"
                disabled={added}
                onClick={() => addItem(chip)}
                className={`inline-flex items-center gap-1 min-h-11 px-3 rounded-xl border text-xs sm:text-sm font-medium transition-colors ${
                  added
                    ? 'bg-stone-100 border-stone-200 text-stone-400 cursor-default'
                    : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100 active:bg-stone-200'
                }`}
              >
                {added ? (
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <PlusIcon className="w-3.5 h-3.5" />
                )}
                <span>{chip}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
