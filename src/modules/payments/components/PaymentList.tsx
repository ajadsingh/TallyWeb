import React, { useState, useMemo, useRef } from 'react';
import {
  Search, ArrowUpDown, ChevronRight, ChevronLeft,
  ArrowDownCircle, ArrowUpCircle, Receipt, X, SlidersHorizontal, Check,
} from 'lucide-react';
import { PaymentVoucher } from '../../../services/api/payments/paymentsApiService';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// Avatar initials color palette
const COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-orange-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-amber-500', 'bg-indigo-500',
];
const avatarColor = (name: string) => COLORS[name.charCodeAt(0) % COLORS.length];

// ── Types ────────────────────────────────────────────────────────────────────

type SortKey = 'date' | 'amount' | 'partyName' | 'voucherNumber';
type SortDir = 'asc' | 'desc';
type FilterDir = 'all' | 'in' | 'out';

interface PaymentListProps {
  vouchers: PaymentVoucher[];
  loading: boolean;
  onVoucherClick: (v: PaymentVoucher) => void;
}

const PAGE_SIZE        = 25;
const MOBILE_PAGE_SIZE = 20;

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'date',          label: 'Date (Newest first)'    },
  { key: 'amount',        label: 'Amount (Highest first)' },
  { key: 'partyName',     label: 'Party (A–Z)'            },
  { key: 'voucherNumber', label: 'Voucher No.'            },
];

// ── Component ────────────────────────────────────────────────────────────────

const PaymentList: React.FC<PaymentListProps> = ({ vouchers, loading, onVoucherClick }) => {
  const [search,      setSearch]      = useState('');
  const [sortKey,     setSortKey]     = useState<SortKey>('date');
  const [sortDir,     setSortDir]     = useState<SortDir>('desc');
  const [filterDir,   setFilterDir]   = useState<FilterDir>('all');
  const [page,        setPage]        = useState(1);
  const [mobileCount, setMobileCount] = useState(MOBILE_PAGE_SIZE);
  const [showSort,    setShowSort]    = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); setMobileCount(MOBILE_PAGE_SIZE); };
  const handleSort   = (k: SortKey) => {
    if (k === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir(k === 'date' || k === 'amount' ? 'desc' : 'asc'); }
    setPage(1);
    setShowSort(false);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vouchers
      .filter(v => {
        const dirOk = filterDir === 'all' || v.direction === filterDir;
        const srchOk = !q ||
          v.partyName.toLowerCase().includes(q) ||
          v.voucherNumber.toLowerCase().includes(q) ||
          v.date.includes(q) ||
          v.narration.toLowerCase().includes(q) ||
          v.reference.toLowerCase().includes(q);
        return dirOk && srchOk;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'date') {
          const parse = (d: string) => {
            const [dd, mm, yyyy] = d.split('/');
            return new Date(`${yyyy}-${mm}-${dd}`).getTime();
          };
          cmp = parse(a.date) - parse(b.date);
        } else if (sortKey === 'amount') {
          cmp = a.amount - b.amount;
        } else if (sortKey === 'partyName') {
          cmp = a.partyName.localeCompare(b.partyName);
        } else {
          cmp = a.voucherNumber.localeCompare(b.voucherNumber);
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [vouchers, search, filterDir, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      <span className={`text-blue-500 font-bold text-xs ${sortDir === 'asc' ? 'rotate-180 inline-block' : ''}`}>▲</span>
    ) : (
      <ArrowUpDown className="h-3 w-3 text-gray-300 inline-block" />
    );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200">

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-5 py-3 border-b border-gray-100 space-y-2.5">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Transactions</h2>
            <p className="text-[11px] text-gray-400">
              {filtered.length} of {vouchers.length} entries
            </p>
          </div>
          {/* Direction filter pills */}
          <div className="flex gap-1.5">
            {(['all', 'in', 'out'] as FilterDir[]).map(d => (
              <button
                key={d}
                onClick={() => { setFilterDir(d); setPage(1); setMobileCount(MOBILE_PAGE_SIZE); }}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  filterDir === d
                    ? d === 'in'
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : d === 'out'
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-200 text-gray-500 hover:border-gray-400'
                }`}
              >
                {d === 'all' ? 'All' : d === 'in' ? '↓ In' : '↑ Out'}
              </button>
            ))}
          </div>
        </div>

        {/* Search + Sort row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search party, voucher, narration…"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 w-full bg-gray-50 focus:bg-white transition-colors"
            />
            {search && (
              <button onClick={() => handleSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {/* Sort button — mobile */}
          <button
            onClick={() => setShowSort(true)}
            className="sm:hidden flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 text-sm font-medium shrink-0"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Empty State ──────────────────────────────────────────────── */}
      {!loading && filtered.length === 0 && (
        <div className="p-12 text-center">
          <div className="h-14 w-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Receipt className="h-7 w-7 text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium text-sm">
            {search ? `No results for "${search}"` : 'No transactions found'}
          </p>
          {search && (
            <button onClick={() => handleSearch('')} className="mt-2 text-blue-600 text-sm font-medium">
              Clear search
            </button>
          )}
        </div>
      )}

      {/* ── Mobile: Card list ────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <>
          <div className="sm:hidden divide-y divide-gray-50">
            {filtered.slice(0, mobileCount).map((v, i) => {
              const initial = v.partyName?.[0]?.toUpperCase() ?? '?';
              const color   = avatarColor(v.partyName ?? '');
              return (
                <button
                  key={v.id ?? i}
                  onClick={() => onVoucherClick(v)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-blue-50 transition-colors"
                >
                  {/* Direction badge + avatar */}
                  <div className="relative shrink-0">
                    <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center`}>
                      <span className="text-white font-bold text-sm">{initial}</span>
                    </div>
                    <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center border-2 border-white ${
                      v.direction === 'in' ? 'bg-emerald-500' : 'bg-red-500'
                    }`}>
                      {v.direction === 'in'
                        ? <ArrowDownCircle className="h-2.5 w-2.5 text-white" />
                        : <ArrowUpCircle   className="h-2.5 w-2.5 text-white" />}
                    </div>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate text-[13px] leading-tight">{v.partyName}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {v.date}
                      <span className="mx-1 text-gray-300">·</span>
                      <span className="text-blue-500 font-medium">{v.voucherNumber}</span>
                      {v.voucherType && (
                        <>
                          <span className="mx-1 text-gray-300">·</span>
                          <span className={v.direction === 'in' ? 'text-emerald-600' : 'text-red-500'}>{v.voucherType}</span>
                        </>
                      )}
                    </p>
                    {v.narration && (
                      <p className="text-[10px] text-gray-400 truncate mt-0.5 italic">{v.narration}</p>
                    )}
                  </div>
                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${v.direction === 'in' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {v.direction === 'in' ? '+' : '-'}{fmt(v.amount)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 shrink-0 ml-0.5" />
                </button>
              );
            })}
            {mobileCount < filtered.length && (
              <div className="px-4 py-4 text-center">
                <button
                  onClick={() => setMobileCount(c => c + MOBILE_PAGE_SIZE)}
                  className="w-full py-3 rounded-xl border border-blue-200 text-blue-600 font-semibold text-sm bg-blue-50"
                >
                  Load more ({filtered.length - mobileCount} remaining)
                </button>
              </div>
            )}
          </div>

          {/* ── Desktop: Table ──────────────────────────────────────── */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {([
                    { key: 'date' as SortKey,          label: 'Date'       },
                    { key: 'voucherNumber' as SortKey, label: 'Voucher #'  },
                    { key: 'partyName' as SortKey,     label: 'Party'      },
                    { key: null,                        label: 'Type'       },
                    { key: 'amount' as SortKey,        label: 'Amount', right: true },
                  ] as { key: SortKey | null; label: string; right?: boolean }[]).map((col, ci) => (
                    <th
                      key={ci}
                      onClick={() => col.key && handleSort(col.key)}
                      className={`px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide select-none ${
                        col.key ? 'cursor-pointer hover:text-gray-700' : ''
                      } ${col.right ? 'text-right' : 'text-left'}`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {col.label}
                        {col.key && <SortIcon k={col.key} />}
                      </span>
                    </th>
                  ))}
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">
                    Narration
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map((v, i) => (
                  <tr
                    key={v.id ?? i}
                    onClick={() => onVoucherClick(v)}
                    className="hover:bg-blue-50 transition-colors duration-100 cursor-pointer"
                  >
                    <td className="px-5 py-3 whitespace-nowrap text-gray-600 text-xs">{v.date}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="text-blue-600 font-medium">{v.voucherNumber}</span>
                    </td>
                    <td className="px-5 py-3 max-w-[200px]">
                      <span className="truncate block text-gray-700 font-medium">{v.partyName}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        v.direction === 'in'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {v.direction === 'in'
                          ? <ArrowDownCircle className="h-3 w-3" />
                          : <ArrowUpCircle   className="h-3 w-3" />}
                        {v.voucherType}
                      </span>
                    </td>
                    <td className={`px-5 py-3 text-right font-bold ${
                      v.direction === 'in' ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {v.direction === 'in' ? '+' : '-'}{fmt(v.amount)}
                    </td>
                    <td className="px-5 py-3 max-w-[220px]">
                      <span className="truncate block text-gray-400 text-xs italic">
                        {v.narration || v.reference || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-500">
                <span>Page {page} of {totalPages} · {filtered.length} entries</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Mobile Sort Sheet ────────────────────────────────────────── */}
      {showSort && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:hidden" onClick={() => setShowSort(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-t-3xl px-4 pt-4 pb-8" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-base font-semibold text-gray-800 mb-3">Sort by</h3>
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => handleSort(opt.key)}
                className="flex items-center justify-between w-full px-4 py-3.5 rounded-xl mb-1.5 border border-gray-100 active:bg-blue-50 transition-colors"
              >
                <span className="text-sm text-gray-700">{opt.label}</span>
                {sortKey === opt.key && <Check className="h-4 w-4 text-blue-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentList;
