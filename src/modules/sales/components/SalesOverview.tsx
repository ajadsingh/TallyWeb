import React, { useState, useMemo, useRef } from 'react';
import { SalesVoucher } from '../../../services/api/sales/salesApiService';
import { formatCurrency } from '../../../shared/utils/formatters';
import { Calendar, User, Receipt, DollarSign, Users, TrendingUp, Search, ArrowUpDown, ChevronLeft, ChevronRight, X, SlidersHorizontal, Check } from 'lucide-react';

interface SalesOverviewProps {
  salesVouchers: SalesVoucher[];
  currentRangeLabel: string;
  loading: boolean;
  onVoucherClick: (voucher: SalesVoucher) => void;
}

type SortKey = 'date' | 'voucherNumber' | 'partyName' | 'amount';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 20;
const MOBILE_PAGE_SIZE = 20;

// Avatar color palette for customer initials
const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-orange-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-amber-500', 'bg-indigo-500',
];
const getAvatarColor = (name: string) =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const SalesOverview: React.FC<SalesOverviewProps> = ({
  salesVouchers,
  currentRangeLabel,
  loading,
  onVoucherClick,
}) => {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [mobileCount, setMobileCount] = useState(MOBILE_PAGE_SIZE);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalSales   = useMemo(() => salesVouchers.reduce((s, v) => s + v.amount, 0), [salesVouchers]);
  const totalOrders  = salesVouchers.length;
  const uniqueCustomers = useMemo(() => new Set(salesVouchers.map(v => v.partyName)).size, [salesVouchers]);
  const avgOrderValue   = totalOrders > 0 ? totalSales / totalOrders : 0;

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? salesVouchers.filter(
          v =>
            v.partyName.toLowerCase().includes(q) ||
            v.voucherNumber.toLowerCase().includes(q) ||
            v.date.includes(q)
        )
      : salesVouchers;

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') {
        // dates are DD/MM/YYYY
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
  }, [salesVouchers, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
    setMobileCount(MOBILE_PAGE_SIZE);
    setShowSortSheet(false);
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
    setMobileCount(MOBILE_PAGE_SIZE);
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      <span className={`text-blue-500 font-bold ${sortDir === 'asc' ? 'rotate-180 inline-block' : ''}`}>▲</span>
    ) : (
      <ArrowUpDown className="h-3 w-3 text-gray-300 inline-block" />
    );

  const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ReactNode }[] = [
    { key: 'date',          label: 'Date (Newest first)',    icon: <Calendar className="h-4 w-4" /> },
    { key: 'amount',        label: 'Amount (Highest first)', icon: <DollarSign className="h-4 w-4" /> },
    { key: 'partyName',     label: 'Customer (A–Z)',         icon: <User className="h-4 w-4" /> },
    { key: 'voucherNumber', label: 'Voucher Number',         icon: <Receipt className="h-4 w-4" /> },
  ];

  const kpiCards = [
    {
      label: 'Total Sales',
      value: formatCurrency(totalSales),
      sub: currentRangeLabel,
      icon: <DollarSign className="h-7 w-7 text-white" />,
      bg: 'from-emerald-500 to-emerald-600',
      icon_bg: 'bg-emerald-400',
    },
    {
      label: 'Total Orders',
      value: totalOrders.toLocaleString('en-IN'),
      sub: 'Sales vouchers',
      icon: <Receipt className="h-7 w-7 text-white" />,
      bg: 'from-indigo-500 to-indigo-600',
      icon_bg: 'bg-indigo-400',
    },
    {
      label: 'Unique Customers',
      value: uniqueCustomers.toLocaleString('en-IN'),
      sub: 'Distinct buyers',
      icon: <Users className="h-7 w-7 text-white" />,
      bg: 'from-violet-500 to-violet-600',
      icon_bg: 'bg-violet-400',
    },
    {
      label: 'Avg Order Value',
      value: formatCurrency(avgOrderValue),
      sub: 'Per transaction',
      icon: <TrendingUp className="h-7 w-7 text-white" />,
      bg: 'from-orange-500 to-orange-600',
      icon_bg: 'bg-orange-400',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 w-full overflow-x-hidden">
      {loading && (
        <div className="flex items-center justify-center h-12 bg-blue-50 rounded-xl border border-blue-100">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2.5" />
          <span className="text-blue-700 text-sm font-medium">Loading sales data…</span>
        </div>
      )}

      {/* ── KPI Strip — horizontal scroll snap on mobile ───────────────── */}
      <div className={`transition-opacity duration-200 ${loading ? 'opacity-40 pointer-events-none' : ''}`}>
        {/* Mobile: horizontal scroll */}
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide sm:hidden snap-x snap-mandatory">
          {kpiCards.map(c => (
            <div
              key={c.label}
              className={`snap-start shrink-0 w-[44vw] bg-gradient-to-br ${c.bg} text-white rounded-2xl p-4 shadow-md`}
            >
              <div className={`h-9 w-9 ${c.icon_bg} rounded-xl flex items-center justify-center mb-3`}>
                {c.icon}
              </div>
              <p className="text-white/70 text-[11px] font-medium">{c.label}</p>
              <p className="text-xl font-bold mt-0.5 truncate">{c.value}</p>
              <p className="text-white/50 text-[10px] mt-0.5 truncate">{c.sub}</p>
            </div>
          ))}
        </div>
        {/* Desktop: 4-col grid */}
        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiCards.map(c => (
            <div key={c.label} className={`bg-gradient-to-r ${c.bg} text-white rounded-xl p-4 shadow-md`}>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-white/80 text-[11px] font-medium mb-0.5">{c.label}</p>
                  <p className="text-2xl font-bold truncate">{c.value}</p>
                  <p className="text-white/60 text-xs mt-0.5 truncate">{c.sub}</p>
                </div>
                <div className={`h-12 w-12 shrink-0 ${c.icon_bg} rounded-lg flex items-center justify-center ml-2`}>
                  {c.icon}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Transactions Card ──────────────────────────────────────────── */}
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 transition-opacity duration-200 ${loading ? 'opacity-40 pointer-events-none' : ''}`}>

        {/* ── Search + Sort bar ───────────────────────────────────────── */}
        <div className="px-4 sm:px-5 py-3 border-b border-gray-100">
          {/* Title row */}
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">Transactions</h2>
              <p className="text-[11px] text-gray-400">
                {filtered.length} of {totalOrders} · {currentRangeLabel}
              </p>
            </div>
          </div>
          {/* Search + Sort row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search customer, voucher…"
                value={search}
                onChange={e => handleSearch(e.target.value)}
                className="pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 w-full bg-gray-50 focus:bg-white transition-colors"
              />
              {search && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {/* Sort button — mobile only */}
            <button
              onClick={() => setShowSortSheet(true)}
              className="sm:hidden flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 text-sm font-medium shrink-0 active:bg-gray-100"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="text-xs">Sort</span>
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="h-14 w-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Receipt className="h-7 w-7 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium text-sm">
              {search ? `No results for "${search}"` : `No sales for ${currentRangeLabel.toLowerCase()}`}
            </p>
            {search && (
              <button
                onClick={() => handleSearch('')}
                className="mt-3 text-blue-600 text-sm font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── Mobile: Card list ── */}
            <div className="sm:hidden divide-y divide-gray-50">
              {filtered.slice(0, mobileCount).map((voucher, i) => {
                const initial = voucher.partyName?.[0]?.toUpperCase() ?? '?';
                const color   = getAvatarColor(voucher.partyName ?? '');
                return (
                  <button
                    key={voucher.id ?? `${voucher.voucherNumber}-${i}`}
                    onClick={() => onVoucherClick(voucher)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-blue-50 transition-colors"
                  >
                    {/* Avatar */}
                    <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                      <span className="text-white font-bold text-sm">{initial}</span>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate text-[13px] leading-tight">{voucher.partyName}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {voucher.date}
                        <span className="mx-1 text-gray-300">·</span>
                        <span className="text-blue-500 font-medium">{voucher.voucherNumber}</span>
                      </p>
                    </div>
                    {/* Amount */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(voucher.amount)}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 shrink-0 ml-0.5" />
                  </button>
                );
              })}

              {/* Load More */}
              {mobileCount < filtered.length && (
                <div className="px-4 py-4 text-center">
                  <button
                    onClick={() => setMobileCount(c => c + MOBILE_PAGE_SIZE)}
                    className="w-full py-3 rounded-xl border border-blue-200 text-blue-600 font-semibold text-sm bg-blue-50 active:bg-blue-100 transition-colors"
                  >
                    Load more ({filtered.length - mobileCount} remaining)
                  </button>
                </div>
              )}
              {mobileCount >= filtered.length && filtered.length > MOBILE_PAGE_SIZE && (
                <p className="px-4 py-3 text-center text-xs text-gray-400">All {filtered.length} transactions shown</p>
              )}
            </div>

            {/* ── Desktop: Table ── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {(
                      [
                        { key: 'date' as SortKey, label: 'Date' },
                        { key: 'voucherNumber' as SortKey, label: 'Voucher #' },
                        { key: 'partyName' as SortKey, label: 'Customer' },
                        { key: 'amount' as SortKey, label: 'Amount', right: true },
                      ] as { key: SortKey; label: string; right?: boolean }[]
                    ).map(col => (
                      <th
                        key={col.key}
                        className={`px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 ${col.right ? 'text-right' : 'text-left'}`}
                        onClick={() => handleSort(col.key)}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {col.label} <SortIcon k={col.key} />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((voucher, i) => (
                    <tr
                      key={voucher.id ?? `${voucher.voucherNumber}-${i}`}
                      className="hover:bg-blue-50 transition-colors duration-100 cursor-pointer"
                      onClick={() => onVoucherClick(voucher)}
                    >
                      <td className="px-5 py-3 whitespace-nowrap text-gray-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          {voucher.date}
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-blue-600 font-medium">
                          <Receipt className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          {voucher.voucherNumber}
                        </span>
                      </td>
                      <td className="px-5 py-3 max-w-[220px]">
                        <span className="inline-flex items-center gap-1.5 truncate text-gray-700">
                          <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="truncate" title={voucher.partyName}>{voucher.partyName}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-right font-semibold text-gray-900">
                        {formatCurrency(voucher.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Desktop Pagination */}
            {totalPages > 1 && (
              <div className="hidden sm:flex px-5 py-3 border-t border-gray-100 items-center justify-between text-sm text-gray-600">
                <span className="text-xs">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                    const pg = start + i;
                    return (
                      <button
                        key={pg}
                        onClick={() => setPage(pg)}
                        className={`min-w-[28px] h-[28px] rounded-lg text-xs font-medium ${pg === page ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                      >
                        {pg}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Mobile Sort Bottom Sheet ─────────────────────────────────────── */}
      {showSortSheet && (
        <div
          className="fixed inset-0 z-50 sm:hidden"
          onClick={() => setShowSortSheet(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />
          {/* Sheet */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl pb-8 pt-4 px-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
            <p className="text-base font-bold text-gray-800 mb-3">Sort By</p>
            <div className="space-y-1">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => handleSort(opt.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors ${
                    sortKey === opt.key
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className={sortKey === opt.key ? 'text-blue-500' : 'text-gray-400'}>{opt.icon}</span>
                  <span className="flex-1 font-medium text-sm">{opt.label}</span>
                  {sortKey === opt.key && <Check className="h-4 w-4 text-blue-500 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesOverview;
