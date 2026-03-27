import { useState } from 'react';
import { BirthDate } from '../lib/types';

interface Props {
  value: BirthDate | null;
  onChange: (bd: BirthDate) => void;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1920 + 1 }, (_, i) => currentYear - i);
const months = Array.from({ length: 12 }, (_, i) => i + 1);
const days = Array.from({ length: 31 }, (_, i) => i + 1);

export default function BirthDateInput({ value, onChange }: Props) {
  const [year, setYear] = useState(value?.year?.toString() || '');
  const [month, setMonth] = useState(value?.month?.toString() || '');
  const [day, setDay] = useState(value?.day?.toString() || '');

  const handleSubmit = () => {
    const y = parseInt(year);
    const m = parseInt(month);
    const d = parseInt(day);
    if (y >= 1920 && y <= currentYear && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      onChange({ year: y, month: m, day: d });
    }
  };

  const selectClass = 'glass border border-border rounded-lg px-2 py-3 text-base text-text-primary text-center focus:outline-none focus:border-accent min-h-[48px] appearance-none cursor-pointer';

  return (
    <div className="flex items-end gap-2 flex-wrap">
      <div>
        <label className="text-sm text-text-secondary block mb-1">年</label>
        <select
          value={year}
          onChange={e => setYear(e.target.value)}
          className={`${selectClass} w-24`}
        >
          <option value="">--</option>
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm text-text-secondary block mb-1">月</label>
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className={`${selectClass} w-20`}
        >
          <option value="">--</option>
          {months.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm text-text-secondary block mb-1">日</label>
        <select
          value={day}
          onChange={e => setDay(e.target.value)}
          className={`${selectClass} w-20`}
        >
          <option value="">--</option>
          {days.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
      <button
        onClick={handleSubmit}
        disabled={!year || !month || !day}
        className="px-5 py-3 rounded-lg bg-accent text-bg-primary text-base font-bold hover:bg-accent-light transition-colors disabled:opacity-50 min-h-[48px]"
      >
        {value ? '更新' : '設定'}
      </button>
      {value && (
        <span className="text-sm text-emerald-400 font-bold ml-1">
          {value.year}年{value.month}月{value.day}日
        </span>
      )}
    </div>
  );
}
