import { useId } from 'react';
import {
  type SelectOption,
  TIME_HOUR_OPTIONS,
  TIME_MINUTE_STEP_OPTIONS,
  joinTimeValue,
  splitTimeValue,
} from '../utils/fieldFormatters';

interface TimeSelectPickerProps {
  value: string;
  onChange: (timeStr: string) => void;
  label?: string;
}

const SELECT_CLASS =
  'flex-1 min-w-0 min-h-[44px] px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 text-base text-stone-900 focus:bg-white focus:border-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500';

export function TimeSelectPicker({
  value,
  onChange,
  label = '時刻',
}: TimeSelectPickerProps) {
  const baseId = useId();
  const { hour, minute } = splitTimeValue(value);

  const minuteOptions: SelectOption[] = TIME_MINUTE_STEP_OPTIONS.filter(
    (opt) => !(hour !== '' && opt.value === ''),
  );
  if (
    minute !== '' &&
    !minuteOptions.some((opt) => opt.value === minute)
  ) {
    minuteOptions.push({ value: minute, label: `${minute}分` });
    minuteOptions.sort((a, b) => {
      if (a.value === '') return -1;
      if (b.value === '') return 1;
      return Number.parseInt(a.value, 10) - Number.parseInt(b.value, 10);
    });
  }

  const handleHourChange = (nextHour: string) => {
    if (nextHour === '') {
      onChange('');
      return;
    }
    onChange(joinTimeValue(nextHour, minute));
  };

  const handleMinuteChange = (nextMinute: string) => {
    if (hour === '') {
      return;
    }
    onChange(joinTimeValue(hour, nextMinute));
  };

  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-1.5"
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
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>

      <select
        id={`${baseId}-h`}
        aria-label={`${label}（時）`}
        value={hour}
        onChange={(e) => handleHourChange(e.target.value)}
        className={SELECT_CLASS}
      >
        {TIME_HOUR_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <span aria-hidden="true" className="text-stone-500 font-bold shrink-0">
        :
      </span>

      <select
        id={`${baseId}-m`}
        aria-label={`${label}（分）`}
        value={hour === '' ? '' : minute}
        disabled={hour === ''}
        title={hour === '' ? '先に「時」を選んでください' : undefined}
        onChange={(e) => handleMinuteChange(e.target.value)}
        className={`${SELECT_CLASS} disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {minuteOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {hour !== '' ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={`${label}をクリア`}
          className="inline-flex items-center min-h-[44px] px-2.5 rounded-lg text-xs font-semibold text-stone-500 hover:text-stone-800 hover:bg-stone-100 active:scale-[0.98] transition-all shrink-0"
        >
          クリア
        </button>
      ) : null}
    </div>
  );
}
