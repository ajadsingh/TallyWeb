import React, { useState, useMemo } from 'react';
import { Search, BookOpen, TrendingUp, TrendingDown, RefreshCw, ChevronRight, Clock, SlidersHorizontal, Check, X, AlertCircle } from 'lucide-react';
import { TallyLedger } from '../../../services/api/ledger/ledgerApiService';

// ── Avatar colour helpers ─────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-orange-500',
  'bg-pink-500',  'bg-cyan-500',   'bg-amber-500',  'bg-indigo-500',
];
const getAvatarColor = (name: string) =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

type FilterType = 'all' | 'positive' | 'negative';
type SortType = 'name-asc' | 'name-desc' | 'balance-high' | 'balance-low';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(amount));

const formatLastFetch = (ts: number | null) => {
  if (!ts) return 'Never';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
};

interface LedgerListProps {
  cachedLedgers: TallyLedger[];
  isLoading: boolean;
  loadError: string | null;
  onLedgerSelect: (ledger: TallyLedger) => void;
  onRefresh: () => void;
  lastFetchTime: number | null;
}

const SORT_OPTIONS: { key: SortType; label: string }[] = [
  { key: 'name-asc',     label: 'Name A → Z' },
  { key: 'name-desc',    label: 'Name Z → A' },
  { key: 'balance-high', label: 'Balance High → Low' },
  { key: 'balance-low',  label: 'Balance Low → High' },
];

const LedgerList: React.FC<LedgerListProps> = ({
  cachedLedgers, isLoading, loadError, onLedgerSelect, onRefresh, lastFetchTime,
}) => {
  const [searchTerm, setSearchTerm]       = useState('');
  const [filter, setFilter]               = useState<FilterType>('all');
  const [sort, setSort]                   = useState<SortType>('name-asc');
  const [showSortSheet, setShowSortSheet] = useState(false);

  const stats = useMemo(() => ({
    total: cachedLedgers.length,
    dr:    cachedLedgers.filter(l => l.closingBalance > 0).length,
    cr:    cachedLedgers.filter(l => l.closingBalance < 0).length,
    zero:  cachedLedgers.filter(l => l.closingBalance === 0).length,
  }), [cachedLedgers]);

  const displayed = useMemo(() => {
    let list = [...cachedLedgers];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.parent.toLowerCase().includes(q));
    }
    if (filter === 'dr') list = list.filter(l => l.closingBalance > 0);
    if (filter === 'cr') list = list.filter(l => l.closingBalance < 0);
    list.sort((a, b) => {
      if (sort === 'name-asc')     return a.name.localeCompare(b.name);
      if (sort === 'name-desc')    return b.name.localeCompare(a.name);
      if (sort === 'balance-high') return Math.abs(b.closingBalance) - Math.abs(a.closingBalance);
      return Math.abs(a.closingBalance) - Math.abs(b.closingBalance);
    });
    return list;
  }, [cachedLedgers, searchTerm, filter, sort]);

  // ── Loading skeleton ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 sm:px-6 pt-5 pb-3 flex-shrink-0">
          <div className="h-7 w-44 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-4 w-28 bg-gray-100 rounded mt-2 animate-pulse" />
        </div>
        <div className="px-4 sm:px-6 pb-3 grid grid-cols-4 gap-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="px-4 sm:px-6 pb-4">
          <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
        </div>
        <div className="flex-1 px-4 sm:px-6">
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-50 overflow-hidden">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
                <div className="h-10 w-10 rounded-xl bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/5" />
                  <div className="h-2.5 bg-gray-100 rounded w-2/5" />
                </div>
                <div className="h-3 bg-gray-200 rounded w-16 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Load error ────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-[60vh] px-6">
        <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-800">Failed to load ledgers</p>
          <p className="text-xs text-gray-500 mt-1 max-w-xs">{loadError}</p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────
  if (cachedLedgers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-[60vh] px-6">
        <div className="h-16 w-16 bg-gray-100 rounded-2xl flex items-center justify-center">
          <BookOpen className="w-8 h-8 text-gray-300" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-800">No Ledgers Found</p>
          <p className="text-sm text-gray-500 mt-1">No ledger accounts found for this company.</p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-4 sm:px-6 pt-5 pb-3 flex-shrink-0 flex items-start justify-between">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Ledger Accounts</h1>
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" /> {formatLastFetch(lastFetchTime)}
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="h-9 w-9 flex items-center justify-center border border-gray-200 rounded-xl bg-white text-gray-600 active:bg-gray-100 shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI strip */}
      <div className="flex-shrink-0 px-4 sm:px-6 pb-3">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total', value: stats.total, bg: 'bg-blue-50',  text: 'text-blue-700',  Icon: BookOpen },
            { label: 'Dr',    value: stats.dr,    bg: 'bg-green-50', text: 'text-green-700', Icon: TrendingUp },
            { label: 'Cr',    value: stats.cr,    bg: 'bg-red-50',   text: 'text-red-700',   Icon: TrendingDown },
            { label: 'Zero',  value: stats.zero,  bg: 'bg-gray-100', text: 'text-gray-600',  Icon: BookOpen },
          ].map(kpi => (
            <div key={kpi.label} className={`${kpi.bg} rounded-2xl p-3 text-center`}>
              <p className={`text-xl font-bold ${kpi.text}`}>{kpi.value}</p>
              <p className={`text-[10px] font-medium ${kpi.text} opacity-75`}>{kpi.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex-shrink-0 px-4 sm:px-6 pb-2 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search name or group…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowSortSheet(true)}
          className="flex items-center gap-1.5 px-3.5 py-2.5 bg-gray-100 rounded-xl text-sm font-medium text-gray-600 shrink-0"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex-shrink-0 px-4 sm:px-6 pb-3 flex gap-2 items-center">
        {([['all', 'All'], ['dr', 'Debit (Dr)'], ['cr', 'Credit (Cr)']] as [FilterType, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400 self-center">
          {displayed.length} result{displayed.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Search className="w-10 h-10 text-gray-300" />
            <p className="text-sm text-gray-500">No ledgers match your search</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-50 overflow-hidden">
            {displayed.map((ledger, idx) => {
              const color   = getAvatarColor(ledger.name);
              const initial = ledger.name[0]?.toUpperCase() ?? '?';
              const isDr    = ledger.closingBalance > 0;
              const isCr    = ledger.closingBalance < 0;
              return (
                <button
                  key={`${ledger.name}-${idx}`}
                  type="button"
                  onClick={() => onLedgerSelect(ledger)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-blue-50 transition-colors"
                >
                  <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                    <span className="text-white font-bold text-sm">{initial}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate text-[13px] leading-tight">{ledger.name}</p>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{ledger.parent || '—'}</p>
                  </div>
                  <div className="text-right shrink-0 mr-1">
                    <p className={`text-sm font-bold ${isDr ? 'text-green-600' : isCr ? 'text-red-600' : 'text-gray-500'}`}>
                      {formatCurrency(ledger.closingBalance)}
                    </p>
                    <p className={`text-[10px] mt-0.5 ${isDr ? 'text-green-400' : isCr ? 'text-red-400' : 'text-gray-400'}`}>
                      {isCr ? 'Cr' : 'Dr'}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sort bottom sheet */}
      {showSortSheet && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowSortSheet(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl px-5 pt-4 pb-8">
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <h3 className="text-base font-bold text-gray-800 mb-3">Sort By</h3>
            <div className="space-y-1">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => { setSort(opt.key); setShowSortSheet(false); }}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl active:bg-gray-50"
                >
                  <span className={`text-sm font-medium ${sort === opt.key ? 'text-blue-600' : 'text-gray-700'}`}>
                    {opt.label}
                  </span>
                  {sort === opt.key && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LedgerList;
