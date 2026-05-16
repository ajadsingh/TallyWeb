import React, { useState } from 'react';
import { useCompany } from '../../context/CompanyContext';

// ── Public types ───────────────────────────────────────────────────────────
export interface DateRange {
  /** YYYY-MM-DD; empty string means "All Time" */
  from: string;
  /** YYYY-MM-DD; empty string means "All Time" */
  to: string;
  label: string;
}

type AccentColor = 'blue' | 'purple' | 'orange' | 'teal' | 'emerald';

interface DateRangeFilterProps {
  /** Initial preset key, defaults to 'thisMonth' */
  defaultKey?: string;
  onChange: (range: DateRange) => void;
  accentColor?: AccentColor;
  /** Show an "All Time" button */
  showAllTime?: boolean;
  className?: string;
}

// ── Accent style map — full Tailwind class strings (required for JIT purge) ─
const ACCENT_STYLES: Record<
  AccentColor,
  { gradient: string; border: string; active: string; hover: string; text: string; ring: string; footer: string; applyBtn: string }
> = {
  blue: {
    gradient: 'from-blue-50 to-indigo-50',
    border: 'border-blue-200',
    active: 'bg-blue-600 text-white shadow-sm border-transparent',
    hover: 'hover:bg-blue-100',
    text: 'text-blue-700',
    ring: 'focus:ring-blue-400',
    footer: 'text-blue-600',
    applyBtn: 'bg-blue-600 hover:bg-blue-700',
  },
  purple: {
    gradient: 'from-purple-50 to-blue-50',
    border: 'border-purple-200',
    active: 'bg-purple-600 text-white shadow-sm border-transparent',
    hover: 'hover:bg-purple-100',
    text: 'text-purple-700',
    ring: 'focus:ring-purple-400',
    footer: 'text-purple-600',
    applyBtn: 'bg-purple-600 hover:bg-purple-700',
  },
  orange: {
    gradient: 'from-orange-50 to-amber-50',
    border: 'border-orange-200',
    active: 'bg-orange-500 text-white shadow-sm border-transparent',
    hover: 'hover:bg-orange-100',
    text: 'text-orange-700',
    ring: 'focus:ring-orange-400',
    footer: 'text-orange-600',
    applyBtn: 'bg-orange-500 hover:bg-orange-600',
  },
  teal: {
    gradient: 'from-teal-50 to-cyan-50',
    border: 'border-teal-200',
    active: 'bg-teal-600 text-white shadow-sm border-transparent',
    hover: 'hover:bg-teal-100',
    text: 'text-teal-700',
    ring: 'focus:ring-teal-400',
    footer: 'text-teal-600',
    applyBtn: 'bg-teal-600 hover:bg-teal-700',
  },
  emerald: {
    gradient: 'from-emerald-50 to-green-50',
    border: 'border-emerald-200',
    active: 'bg-emerald-600 text-white shadow-sm border-transparent',
    hover: 'hover:bg-emerald-100',
    text: 'text-emerald-700',
    ring: 'focus:ring-emerald-400',
    footer: 'text-emerald-600',
    applyBtn: 'bg-emerald-600 hover:bg-emerald-700',
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');
const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Returns the start calendar year of the current Indian FY (April → March). */
export const getFYStartYear = (): number => {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
};

/** Compute a DateRange for a given preset key. */
export const computeRange = (key: string): DateRange => {
  const now = new Date();
  const fyStart = getFYStartYear();

  switch (key) {
    case 'thisMonth': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        from: fmtDate(from),
        to: fmtDate(to),
        label: from.toLocaleString('en-IN', { month: 'short', year: 'numeric' }),
      };
    }
    case 'lastMonth': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        from: fmtDate(from),
        to: fmtDate(to),
        label: from.toLocaleString('en-IN', { month: 'short', year: 'numeric' }),
      };
    }
    case 'last3months': {
      const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: fmtDate(from), to: fmtDate(to), label: 'Last 3 Months' };
    }
    case 'q1':
      return {
        from: `${fyStart}-04-01`,
        to: `${fyStart}-06-30`,
        label: `Q1 Apr\u2013Jun ${fyStart}`,
      };
    case 'q2':
      return {
        from: `${fyStart}-07-01`,
        to: `${fyStart}-09-30`,
        label: `Q2 Jul\u2013Sep ${fyStart}`,
      };
    case 'q3':
      return {
        from: `${fyStart}-10-01`,
        to: `${fyStart}-12-31`,
        label: `Q3 Oct\u2013Dec ${fyStart}`,
      };
    case 'q4':
      return {
        from: `${fyStart + 1}-01-01`,
        to: `${fyStart + 1}-03-31`,
        label: `Q4 Jan\u2013Mar ${fyStart + 1}`,
      };
    case 'currentFY':
      return {
        from: `${fyStart}-04-01`,
        to: fmtDate(now),
        label: `FY ${fyStart}\u2013${String(fyStart + 1).slice(2)}`,
      };
    case 'prevFY':
      return {
        from: `${fyStart - 1}-04-01`,
        to: `${fyStart}-03-31`,
        label: `FY ${fyStart - 1}\u2013${String(fyStart).slice(2)}`,
      };
    case 'allTime':
      return { from: '', to: '', label: 'All Time' };
    default:
      if (key.startsWith('fy:')) {
        const yr = parseInt(key.slice(3));
        return {
          from: `${yr}-04-01`,
          to: `${yr + 1}-03-31`,
          label: `FY ${yr}\u2013${String(yr + 1).slice(2)}`,
        };
      }
      return { from: '', to: '', label: '' };
  }
};

// ── Component ──────────────────────────────────────────────────────────────
const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  defaultKey = 'currentFY',
  onChange,
  accentColor = 'blue',
  showAllTime = false,
  className = '',
}) => {
  const [activeKey, setActiveKey] = useState(defaultKey);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');

  const { availableFYs } = useCompany();
  const style   = ACCENT_STYLES[accentColor];
  const fyStart = getFYStartYear();

  // On mount fire the default range
  const firedDefault = React.useRef(false);
  React.useEffect(() => {
    if (!firedDefault.current) {
      firedDefault.current = true;
      onChange(computeRange(defaultKey));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = (key: string) => {
    setActiveKey(key);
    if (key !== 'custom') onChange(computeRange(key));
  };

  const handleCustomApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFrom || !customTo) return;
    onChange({ from: customFrom, to: customTo, label: `${customFrom} – ${customTo}` });
  };

  const pill = (key: string, label: string) => (
    <button
      key={key}
      type="button"
      onClick={() => select(key)}
      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
        activeKey === key
          ? style.active
          : `bg-white text-gray-600 border-gray-200 ${style.hover}`
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Single scrollable pill row — FYs + Quarters + Custom */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        {/* FY pills (current FY first, then prev FYs from Tally) */}
        {availableFYs.length > 0
          ? availableFYs.map(fy => pill(fy.key, fy.label))
          : pill('currentFY', `FY ${fyStart}–${String(fyStart + 1).slice(2)}`)}
        {/* Quarters of current FY */}
        {pill('q1', 'Q1')}
        {pill('q2', 'Q2')}
        {pill('q3', 'Q3')}
        {pill('q4', 'Q4')}
        {/* Custom */}
        {pill('custom', 'Custom')}
        {showAllTime && pill('allTime', 'All Time')}
      </div>

      {/* Custom inputs — only shown when Custom is active */}
      {activeKey === 'custom' && (
        <form onSubmit={handleCustomApply} className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-[10px] text-gray-400 mb-0.5">From</label>
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className={`px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 ${style.ring}`}
              required
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-0.5">To</label>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className={`px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 ${style.ring}`}
              required
            />
          </div>
          <button
            type="submit"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white ${style.applyBtn}`}
          >
            Apply
          </button>
        </form>
      )}
    </div>
  );
};

export default DateRangeFilter;
