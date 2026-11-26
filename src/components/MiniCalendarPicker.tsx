import { type KeyboardEvent, useId, useRef, useState } from 'react';
import { formatDateLabel } from '../utils/fieldFormatters';

interface MiniCalendarPickerProps {
  value: string;
  onChange: (dateStr: string) => void;
}

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateStr(year: number, month0: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${pad2(month0 + 1)}-${pad2(day)}`;
}

function parseDateStr(
  value: string,
): { year: number; month0: number; day: number } | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match || !match[1] || !match[2] || !match[3]) {
    return null;
  }
  const year = Number.parseInt(match[1], 10);
  const month0 = Number.parseInt(match[2], 10) - 1;
  const day = Number.parseInt(match[3], 10);
  const check = new Date(year, month0, day);
  if (
    check.getFullYear() !== year ||
    check.getMonth() !== month0 ||
    check.getDate() !== day
  ) {
    return null;
  }
  return { year, month0, day };
}

export function MiniCalendarPicker({
  value,
  onChange,
}: MiniCalendarPickerProps) {
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const now = new Date();
  const todayStr = toDateStr(now.getFullYear(), now.getMonth(), now.getDate());
  const parsed = parseDateStr(value);
  const displayLabel = formatDateLabel(value, '');

  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() =>
    parsed ? parsed.year : now.getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(() =>
    parsed ? parsed.month0 : now.getMonth(),
  );

  const openOrToggle = () => {
    if (!isOpen) {
      const target = parseDateStr(value);
      const current = new Date();
      setViewYear(target ? target.year : current.getFullYear());
      setViewMonth(target ? target.month0 : current.getMonth());
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const closeAndFocusTrigger = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handlePrevMonth = () => {
    const d = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const handleNextMonth = () => {
    const d = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const handleSelectDate = (dateStr: string) => {
    onChange(dateStr);
    closeAndFocusTrigger();
  };

  const handleSelectToday = () => {
    const current = new Date();
    const today = toDateStr(
      current.getFullYear(),
      current.getMonth(),
      current.getDate(),
    );
    setViewYear(current.getFullYear());
    setViewMonth(current.getMonth());
    onChange(today);
    closeAndFocusTrigger();
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const handlePanelKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeAndFocusTrigger();
    }
  };

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          aria-haspopup="dialog"
          onClick={openOrToggle}
          className="flex-1 min-w-0 min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 text-base text-left hover:bg-white focus:bg-white focus:border-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 active:scale-[0.99] transition-all"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="w-5 h-5 text-stone-500 shrink-0"
          >
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </svg>

          <span
            className={`flex-1 min-w-0 truncate ${
              displayLabel ? 'text-stone-900 font-medium' : 'text-stone-400'
            }`}
          >
            {displayLabel || '日付を選ぶ'}
          </span>

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`w-5 h-5 text-stone-400 shrink-0 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {displayLabel ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label="預ける日付をクリア"
            className="inline-flex items-center min-h-[44px] px-2.5 rounded-lg text-xs font-semibold text-stone-500 hover:text-stone-800 hover:bg-stone-100 active:scale-[0.98] transition-all shrink-0"
          >
            クリア
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="日付を選択"
          onKeyDown={handlePanelKeyDown}
          className="mt-2 w-full rounded-2xl border border-stone-200 bg-white shadow-sm p-3 space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="前の月"
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-stone-200 bg-stone-50 text-lg font-bold text-stone-700 hover:bg-stone-100 active:scale-[0.96] transition-all"
            >
              ‹
            </button>
            <span
              aria-live="polite"
              className="text-base font-bold text-stone-900"
            >
              {viewYear}年{viewMonth + 1}月
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="次の月"
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-stone-200 bg-stone-50 text-lg font-bold text-stone-700 hover:bg-stone-100 active:scale-[0.96] transition-all"
            >
              ›
            </button>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleSelectToday}
              className="inline-flex items-center justify-center min-h-[44px] px-3 rounded-xl border border-stone-300 bg-white text-sm font-semibold text-stone-800 hover:bg-stone-100 active:scale-[0.98] transition-all"
            >
              今日
            </button>
            <button
              type="button"
              onClick={closeAndFocusTrigger}
              className="inline-flex items-center justify-center gap-1 min-h-[44px] px-3 rounded-xl border border-stone-300 bg-white text-sm font-semibold text-stone-700 hover:bg-stone-100 active:scale-[0.98] transition-all"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="w-4 h-4"
              >
                <line x1="18" x2="6" y1="6" y2="18" />
                <line x1="6" x2="18" y1="6" y2="18" />
              </svg>
              <span>閉じる</span>
            </button>
          </div>

          <div className="grid grid-cols-7 pt-1" role="row">
            {WEEKDAY_LABELS.map((label, idx) => (
              <div
                key={label}
                className={`text-xs font-bold text-center py-1 ${
                  idx === 0
                    ? 'text-red-600'
                    : idx === 6
                      ? 'text-blue-600'
                      : 'text-stone-600'
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstWeekday }, (_, i) => (
              <div key={`empty-${i}`} aria-hidden="true" />
            ))}
            {Array.from({ length: daysInMonth }, (_, idx) => {
              const day = idx + 1;
              const dateStr = toDateStr(viewYear, viewMonth, day);
              const weekdayCol = (firstWeekday + idx) % 7;
              const isSelected = value === dateStr;
              const isToday = todayStr === dateStr;

              const colorClass = isSelected
                ? 'bg-slate-800 text-white font-bold'
                : weekdayCol === 0
                  ? 'text-red-600 hover:bg-stone-100'
                  : weekdayCol === 6
                    ? 'text-blue-600 hover:bg-stone-100'
                    : 'text-stone-900 hover:bg-stone-100';

              const todayRingClass =
                isToday && !isSelected
                  ? 'ring-2 ring-inset ring-slate-400 font-semibold'
                  : '';

              return (
                <button
                  key={dateStr}
                  type="button"
                  aria-label={formatDateLabel(dateStr, '')}
                  aria-pressed={isSelected}
                  aria-current={isToday ? 'date' : undefined}
                  onClick={() => handleSelectDate(dateStr)}
                  className={`w-full h-11 min-w-[40px] rounded-lg text-base flex items-center justify-center transition-all active:scale-[0.96] ${colorClass} ${todayRingClass}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
