import React, { useState, useMemo, useRef } from 'react';
import {
  TrendingUp, Users, Package, DollarSign, Calendar, Receipt, User,
  Search, X, ChevronLeft, ChevronRight, FileText, SlidersHorizontal,
  Check,
} from 'lucide-react';
import { PurchaseVoucher } from '../../../services/api/purchases/purchasesApiService';
import { formatCurrency } from '../../../shared/utils/formatters';

// ── Avatar helpers ─────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-pink-500',   'bg-cyan-500', 'bg-indigo-500',  'bg-rose-500',
];
const getAvatarColor = (name: string) =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

/* ─────────────────────────────────────────────────────────────────────────
   PurchaseVoucherDetail — bottom-sheet on mobile, side-panel on desktop
   ───────────────────────────────────────────────────────────────────────── */
const PurchaseVoucherDetail: React.FC<{
  voucher: PurchaseVoucher;
  onClose: () => void;
}> = ({ voucher, onClose }) => {
  const gst = voucher.gstBreakdown;
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Panel */}
      {/* Mobile: slides up from bottom. Desktop: slides in from right */}
      <div className="fixed z-50 flex flex-col overflow-hidden bg-white shadow-2xl
                      inset-x-0 bottom-0 rounded-t-3xl max-h-[90vh]
                      sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[480px] sm:rounded-none sm:max-h-full">

        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-purple-100 rounded-xl shrink-0">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Purchase Voucher</p>
              <p className="text-base font-bold text-gray-800 truncate">{voucher.voucherNumber || '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors shrink-0 ml-2">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Key info grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-2xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Date</p>
              <p className="text-sm font-semibold text-gray-800">{voucher.date}</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Type</p>
              <p className="text-sm font-semibold text-gray-800">{voucher.voucherType || 'Purchase'}</p>
            </div>
            <div className="bg-purple-50 rounded-2xl p-3 col-span-2">
              <p className="text-xs text-purple-400 mb-0.5">Supplier</p>
              <p className="text-sm font-semibold text-purple-800">{voucher.partyName}</p>
            </div>
            {voucher.reference && (
              <div className="bg-gray-50 rounded-2xl p-3 col-span-2">
                <p className="text-xs text-gray-400 mb-0.5">Reference</p>
                <p className="text-sm font-medium text-gray-700">{voucher.reference}</p>
              </div>
            )}
          </div>

          {/* Stock Items */}
          {voucher.stockItems && voucher.stockItems.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Items ({voucher.stockItems.length})
              </h3>
              <div className="rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">Item</th>
                      <th className="px-3 py-2 text-center text-gray-500 font-medium">Qty</th>
                      <th className="px-3 py-2 text-right text-gray-500 font-medium">Rate</th>
                      <th className="px-3 py-2 text-right text-gray-500 font-medium">Amt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {voucher.stockItems.map((item, i) => (
                      <tr key={i} className="hover:bg-purple-50">
                        <td className="px-3 py-2 font-medium text-gray-800 max-w-[130px] truncate" title={item.name}>
                          {item.name}
                          {item.hsn && (
                            <span className="block text-gray-400 text-[10px]">HSN: {item.hsn}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-600">
                          {item.billedQty || item.actualQty}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-600">{item.rate}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-800">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* GST Breakdown */}
          {gst && (gst.cgst > 0 || gst.sgst > 0 || gst.igst > 0) && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Tax Breakdown</h3>
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-1.5 text-sm">
                {gst.cgst > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">CGST {gst.cgstRate ? `(${gst.cgstRate}%)` : ''}</span>
                    <span className="font-medium text-gray-800">{formatCurrency(gst.cgst)}</span>
                  </div>
                )}
                {gst.sgst > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">SGST {gst.sgstRate ? `(${gst.sgstRate}%)` : ''}</span>
                    <span className="font-medium text-gray-800">{formatCurrency(gst.sgst)}</span>
                  </div>
                )}
                {gst.igst > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">IGST {gst.igstRate ? `(${gst.igstRate}%)` : ''}</span>
                    <span className="font-medium text-gray-800">{formatCurrency(gst.igst)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-amber-200 pt-1.5 font-semibold">
                  <span className="text-gray-700">Total Tax</span>
                  <span className="text-amber-700">{formatCurrency(gst.total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Narration */}
          {voucher.narration && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Narration</h3>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-2xl px-4 py-3 leading-relaxed">
                {voucher.narration}
              </p>
            </div>
          )}
        </div>

        {/* Footer total */}
        <div className="shrink-0 border-t border-gray-200 px-5 py-4 bg-gray-50 flex items-center justify-between">
          <span className="text-sm text-gray-500">Total Amount</span>
          <span className="text-2xl font-bold text-purple-700">{formatCurrency(voucher.amount)}</span>
        </div>
      </div>
    </>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   PurchaseOverview
   ───────────────────────────────────────────────────────────────────────── */
interface PurchaseOverviewProps {
  purchaseVouchers: PurchaseVoucher[];
  currentRangeLabel: string;
  loading: boolean;
}

type SortKey = 'date' | 'voucherNumber' | 'partyName' | 'amount';

const PAGE_SIZE        = 20;
const MOBILE_PAGE_SIZE = 20;

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'date',          label: 'Date (Newest first)'    },
  { key: 'amount',        label: 'Amount (Highest first)' },
  { key: 'partyName',     label: 'Supplier (A–Z)'         },
  { key: 'voucherNumber', label: 'Voucher Number'         },
];

const PurchaseOverview: React.FC<PurchaseOverviewProps> = ({
  purchaseVouchers,
  currentRangeLabel,
  loading,
}) => {
  const [search, setSearch]               = useState('');
  const [sortKey, setSortKey]             = useState<SortKey>('date');
  const [sortDir, setSortDir]             = useState<'asc' | 'desc'>('desc');
  const [page, setPage]                   = useState(1);
  const [mobileCount, setMobileCount]     = useState(MOBILE_PAGE_SIZE);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<PurchaseVoucher | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalPurchases  = useMemo(() => purchaseVouchers.reduce((s, v) => s + v.amount, 0), [purchaseVouchers]);
  const totalVouchers   = purchaseVouchers.length;
  const uniqueSuppliers = useMemo(() => new Set(purchaseVouchers.map(v => v.partyName)).size, [purchaseVouchers]);
  const avgOrderValue   = totalVouchers > 0 ? totalPurchases / totalVouchers : 0;

  // ── Top suppliers ─────────────────────────────────────────────────────────
  const topSuppliers = useMemo(() => {
    const map: Record<string, number> = {};
    purchaseVouchers.forEach(v => { map[v.partyName] = (map[v.partyName] || 0) + v.amount; });
    return Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 5);
  }, [purchaseVouchers]);

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = q
      ? purchaseVouchers.filter(
          v => v.partyName.toLowerCase().includes(q) || v.voucherNumber.toLowerCase().includes(q)
        )
      : purchaseVouchers;
    return [...list].sort((a, b) => {
      let cmp = 0;
      if      (sortKey === 'date')          cmp = a.date.localeCompare(b.date);
      else if (sortKey === 'voucherNumber') cmp = a.voucherNumber.localeCompare(b.voucherNumber);
      else if (sortKey === 'partyName')     cmp = a.partyName.localeCompare(b.partyName);
      else if (sortKey === 'amount')        cmp = a.amount - b.amount;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [purchaseVouchers, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
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

  // ── KPI card definitions ───────────────────────────────────────────────────
  const kpiCards = [
    {
      label: 'Total Purchases',
      value: formatCurrency(totalPurchases),
      sub: currentRangeLabel,
      icon: <DollarSign className="h-6 w-6 text-white" />,
      bg: 'from-purple-500 to-purple-600',
      icon_bg: 'bg-purple-400',
    },
    {
      label: 'Total Orders',
      value: totalVouchers.toLocaleString('en-IN'),
      sub: 'Purchase vouchers',
      icon: <Package className="h-6 w-6 text-white" />,
      bg: 'from-blue-500 to-blue-600',
      icon_bg: 'bg-blue-400',
    },
    {
      label: 'Active Suppliers',
      value: uniqueSuppliers.toLocaleString('en-IN'),
      sub: 'Unique vendors',
      icon: <Users className="h-6 w-6 text-white" />,
      bg: 'from-emerald-500 to-emerald-600',
      icon_bg: 'bg-emerald-400',
    },
    {
      label: 'Avg Order Value',
      value: formatCurrency(avgOrderValue),
      sub: 'Per transaction',
      icon: <TrendingUp className="h-6 w-6 text-white" />,
      bg: 'from-amber-500 to-amber-600',
      icon_bg: 'bg-amber-400',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ── Loading banner ────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center h-12 bg-purple-50 rounded-xl border border-purple-100">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500 mr-2.5" />
          <span className="text-purple-700 text-sm font-medium">Loading purchase data…</span>
        </div>
      )}

      {/* ── KPI Strip ─────────────────────────────────────────────────── */}
      <div className={`transition-opacity duration-200 ${loading ? 'opacity-40 pointer-events-none' : ''}`}>
        {/* Mobile: horizontal scroll snap */}
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide sm:hidden snap-x snap-mandatory">
          {kpiCards.map(c => (
            <div
              key={c.label}
              className={`snap-start shrink-0 w-[calc(50vw-24px)] bg-gradient-to-br ${c.bg} text-white rounded-2xl p-4 shadow-md`}
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
        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map(c => (
            <div key={c.label} className={`bg-gradient-to-r ${c.bg} text-white rounded-xl p-5 shadow-md`}>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-white/80 text-xs font-medium mb-0.5">{c.label}</p>
                  <p className="text-2xl font-bold truncate">{c.value}</p>
                  <p className="text-white/60 text-xs mt-0.5 truncate">{c.sub}</p>
                </div>
                <div className={`h-12 w-12 shrink-0 ${c.icon_bg} rounded-xl flex items-center justify-center ml-3`}>
                  {c.icon}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Transactions Card ─────────────────────────────────────────── */}
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 transition-opacity duration-200 ${loading ? 'opacity-40 pointer-events-none' : ''}`}>

        {/* Search + Sort bar */}
        <div className="px-4 sm:px-5 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">Transactions</h2>
              <p className="text-[11px] text-gray-400">
                {filtered.length} of {totalVouchers} · {currentRangeLabel}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search supplier or voucher…"
                value={search}
                onChange={e => handleSearch(e.target.value)}
                className="pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 w-full bg-gray-50 focus:bg-white transition-colors"
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

        {/* Empty state */}
        {purchaseVouchers.length === 0 && !loading ? (
          <div className="p-12 text-center">
            <div className="h-14 w-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Receipt className="h-7 w-7 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium text-sm">
              No purchase vouchers for {currentRangeLabel.toLowerCase()}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-500 text-sm">No results match your search.</p>
            <button onClick={() => handleSearch('')} className="mt-2 text-purple-600 text-sm font-medium">
              Clear search
            </button>
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
                    onClick={() => setSelectedVoucher(voucher)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-purple-50 transition-colors"
                  >
                    {/* Avatar */}
                    <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                      <span className="text-white font-bold text-sm">{initial}</span>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate text-[13px] leading-tight">
                        {voucher.partyName}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {voucher.date}
                        <span className="mx-1 text-gray-300">·</span>
                        <span className="text-purple-500 font-medium">{voucher.voucherNumber}</span>
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
                    className="w-full py-3 rounded-xl border border-purple-200 text-purple-600 font-semibold text-sm bg-purple-50 active:bg-purple-100 transition-colors"
                  >
                    Load more ({filtered.length - mobileCount} remaining)
                  </button>
                </div>
              )}
              {mobileCount >= filtered.length && filtered.length > MOBILE_PAGE_SIZE && (
                <p className="px-4 py-3 text-center text-xs text-gray-400">
                  All {filtered.length} transactions shown
                </p>
              )}
            </div>

            {/* ── Desktop: Table ── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {([
                      { key: 'date' as SortKey,          label: 'Date'       },
                      { key: 'voucherNumber' as SortKey, label: 'Voucher #'  },
                      { key: 'partyName' as SortKey,     label: 'Supplier'   },
                      { key: 'amount' as SortKey,        label: 'Amount', right: true },
                    ] as { key: SortKey; label: string; right?: boolean }[]).map(col => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className={`px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 ${col.right ? 'text-right' : 'text-left'}`}
                      >
                        {col.label}
                        {sortKey === col.key && (
                          <span className="ml-1 text-purple-500">{sortDir === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((voucher, i) => (
                    <tr
                      key={voucher.id ?? `${voucher.voucherNumber}-${i}`}
                      onClick={() => setSelectedVoucher(voucher)}
                      className="hover:bg-purple-50 transition-colors duration-100 cursor-pointer"
                    >
                      <td className="px-5 py-3 whitespace-nowrap text-gray-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          {voucher.date}
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-purple-600 font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <Receipt className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          {voucher.voucherNumber}
                        </span>
                      </td>
                      <td className="px-5 py-3 max-w-[220px]">
                        <span className="inline-flex items-center gap-1.5 text-gray-700 truncate">
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
                    const pg    = start + i;
                    return (
                      <button
                        key={pg}
                        onClick={() => setPage(pg)}
                        className={`min-w-[28px] h-[28px] rounded-lg text-xs font-medium ${
                          pg === page ? 'bg-purple-600 text-white' : 'hover:bg-gray-100'
                        }`}
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

      {/* ── Top Suppliers ─────────────────────────────────────────────── */}
      {topSuppliers.length > 0 && (
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-5 transition-opacity duration-200 ${loading ? 'opacity-40 pointer-events-none' : ''}`}>
          <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-3">
            Top 5 Suppliers
          </h3>
          <div className="space-y-2.5">
            {topSuppliers.map(([supplier, amount], index) => {
              const pct = totalPurchases > 0 ? (amount / totalPurchases) * 100 : 0;
              const color = getAvatarColor(supplier);
              return (
                <div key={supplier} className="flex items-center gap-3">
                  {/* Rank avatar */}
                  <div className={`h-8 w-8 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                    <span className="text-white text-xs font-bold">{index + 1}</span>
                  </div>
                  {/* Name + bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 truncate mr-2" title={supplier}>
                        {supplier}
                      </span>
                      <span className="text-sm font-bold text-gray-900 shrink-0">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{pct.toFixed(1)}% of total</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Mobile Sort Bottom Sheet ──────────────────────────────────── */}
      {showSortSheet && (
        <div className="fixed inset-0 z-50 sm:hidden" onClick={() => setShowSortSheet(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl pb-8 pt-4 px-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
            <p className="text-base font-bold text-gray-800 mb-3">Sort By</p>
            <div className="space-y-1">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => handleSort(opt.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors ${
                    sortKey === opt.key ? 'bg-purple-50 text-purple-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex-1 font-medium text-sm">{opt.label}</span>
                  {sortKey === opt.key && <Check className="h-4 w-4 text-purple-500 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Voucher detail panel ──────────────────────────────────────── */}
      {selectedVoucher && (
        <PurchaseVoucherDetail
          voucher={selectedVoucher}
          onClose={() => setSelectedVoucher(null)}
        />
      )}
    </div>
  );
};

export default PurchaseOverview;
