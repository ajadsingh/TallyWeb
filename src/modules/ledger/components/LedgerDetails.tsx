import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft, TrendingUp, TrendingDown, Building2, FileText,
  RefreshCw, Search, CheckCircle, XCircle, Info, X, ChevronDown, ChevronUp,
  CreditCard, Package,
} from 'lucide-react';
import { useGlobalDateRange } from '../../../context/GlobalDateRangeContext';
import { TallyLedger } from '../../../services/api/ledger/ledgerApiService';
import VoucherApiService, { VoucherTransaction } from '../../../services/api/voucher/voucherApiService';

const AVATAR_COLORS = [
  'bg-blue-500','bg-emerald-500','bg-violet-500','bg-orange-500',
  'bg-pink-500', 'bg-cyan-500',  'bg-amber-500', 'bg-indigo-500',
];
const getAvatarColor = (name: string) =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(Math.abs(v));

interface LedgerDetailsProps {
  ledger: TallyLedger;
  companyName: string;
  serverUrl: string;
  onBack: () => void;
}

const LedgerDetails: React.FC<LedgerDetailsProps> = ({ ledger, companyName, serverUrl, onBack }) => {
  // ── Derived flags (FIRST — used everywhere below) ─────────────────────
  const isPos = ledger.closingBalance > 0;
  const isNeg = ledger.closingBalance < 0;

  // ── Global date range ─────────────────────────────────────────────────
  const { dateRange } = useGlobalDateRange();

  // ── State ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]       = useState<'details' | 'transactions'>('transactions');
  const [transactions, setTransactions] = useState<VoucherTransaction[]>([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [searchTerm, setSearchTerm]     = useState('');
  const [typeFilter, setTypeFilter]     = useState('all');
  const [expandedTx, setExpandedTx]     = useState<string | null>(null);

  const voucherApi = useRef(new VoucherApiService());

  useEffect(() => {
    if (serverUrl) voucherApi.current.setBaseURL(`http://${serverUrl}`);
  }, [serverUrl]);

  // Reset state + auto-fetch when ledger or global date range changes
  useEffect(() => {
    setTransactions([]);
    setError(null);
    setSearchTerm('');
    setExpandedTx(null);
    setTypeFilter('all');
    if (companyName && ledger.name) runFetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledger.name, companyName, dateRange]);

  // ── Fetch ──────────────────────────────────────────────────────────────
  const runFetch = async () => {
    setLoading(true);
    setError(null);
    setExpandedTx(null);
    try {
      const tFrom = dateRange.from ? dateRange.from.replace(/-/g, '') : '';
      const tTo   = dateRange.to   ? dateRange.to.replace(/-/g, '')   : '';
      const list  = await voucherApi.current.getVoucherTransactions(companyName, ledger.name, tFrom, tTo);
      setTransactions(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  // ── Derived lists ──────────────────────────────────────────────────────
  const voucherTypes = useMemo(() =>
    ['all', ...Array.from(new Set(transactions.map(t => t.voucherType))).sort()],
    [transactions]);

  const filteredTx = useMemo(() => {
    let list = transactions;
    if (typeFilter !== 'all') list = list.filter(t => t.voucherType === typeFilter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(t =>
        t.voucherNumber.toLowerCase().includes(q) ||
        t.partyName.toLowerCase().includes(q) ||
        t.voucherType.toLowerCase().includes(q));
    }
    return list;
  }, [transactions, typeFilter, searchTerm]);

  // ── Details tab ────────────────────────────────────────────────────────
  const renderDetails = () => (
    <div className="space-y-4">
      {/* Balance cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 rounded-2xl p-4">
          <p className="text-xs text-blue-500 font-medium">Opening Balance</p>
          <p className="text-lg font-bold text-blue-900 mt-1 leading-tight">
            {formatCurrency(ledger.openingBalance)}
          </p>
          <p className="text-[10px] text-blue-400 mt-0.5">
            {ledger.openingBalance >= 0 ? 'Dr' : 'Cr'}
          </p>
        </div>
        <div className={`rounded-2xl p-4 ${isPos ? 'bg-green-50' : isNeg ? 'bg-red-50' : 'bg-gray-100'}`}>
          <p className={`text-xs font-medium ${isPos ? 'text-green-500' : isNeg ? 'text-red-500' : 'text-gray-400'}`}>
            Closing Balance
          </p>
          <p className={`text-lg font-bold mt-1 leading-tight ${isPos ? 'text-green-900' : isNeg ? 'text-red-900' : 'text-gray-700'}`}>
            {formatCurrency(ledger.closingBalance)}
          </p>
          <p className={`text-[10px] mt-0.5 ${isPos ? 'text-green-400' : isNeg ? 'text-red-400' : 'text-gray-300'}`}>
            {isNeg ? 'Cr' : 'Dr'}
          </p>
        </div>
      </div>

      {/* Net change */}
      {(ledger.openingBalance !== 0 || ledger.closingBalance !== 0) && (
        <div className={`rounded-2xl px-4 py-3 flex items-center gap-2 text-sm font-medium ${
          ledger.closingBalance > ledger.openingBalance ? 'bg-green-50 text-green-700'
          : ledger.closingBalance < ledger.openingBalance ? 'bg-red-50 text-red-700'
          : 'bg-gray-50 text-gray-600'}`}>
          {ledger.closingBalance >= ledger.openingBalance
            ? <TrendingUp className="w-4 h-4 shrink-0" />
            : <TrendingDown className="w-4 h-4 shrink-0" />}
          Net change: {formatCurrency(Math.abs(ledger.closingBalance - ledger.openingBalance))}
          {' '}· {ledger.closingBalance > ledger.openingBalance ? 'increased'
            : ledger.closingBalance < ledger.openingBalance ? 'decreased' : 'no change'}
        </div>
      )}

      {/* Properties */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-bold text-gray-700">Ledger Properties</h3>
        </div>
        {[
          { label: 'Parent Group', value: ledger.parent || '—' },
          { label: 'Tax Type',     value: ledger.taxType || 'Not specified' },
          { label: 'Master ID',    value: String(ledger.masterId || '—') },
        ].map(row => (
          <div key={row.label} className="flex items-start justify-between text-sm gap-3">
            <span className="text-gray-400 shrink-0">{row.label}</span>
            <span className="font-medium text-gray-800 text-right break-all">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Configuration flags */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-bold text-gray-700">Configuration</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Bill-wise Details', value: ledger.isBillWiseOn },
            { label: 'Cost Centres',       value: ledger.isCostCentresOn },
            { label: 'Revenue Ledger',     value: ledger.isRevenue },
            { label: 'Deemed Positive',    value: ledger.isDeemedPositive },
            { label: 'Can Delete',         value: ledger.canDelete },
            { label: 'Payroll Ledger',     value: ledger.forPayroll },
          ].map(flag => (
            <div key={flag.label} className="flex items-center gap-2 py-1">
              {flag.value
                ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                : <XCircle    className="w-4 h-4 text-gray-200 shrink-0" />}
              <span className="text-xs text-gray-600">{flag.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Transactions tab ───────────────────────────────────────────────────
  const renderTransactions = () => (
    <div className="space-y-4">
      {/* Period indicator — global period set at the top bar */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Period</p>
          <p className="text-sm font-bold text-teal-700 mt-0.5">{dateRange.label || 'All Time'}</p>
        </div>
        <button
          onClick={() => runFetch()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 text-teal-700 text-xs font-semibold disabled:opacity-50 active:bg-teal-100"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 rounded-2xl px-4 py-3">
          <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 flex-1 leading-relaxed">{error}</p>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4 text-red-400" />
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-50 overflow-hidden">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
              <div className="h-10 w-10 rounded-xl bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-2/3" />
                <div className="h-2.5 bg-gray-100 rounded w-1/3" />
              </div>
              <div className="h-3 bg-gray-200 rounded w-16 shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && transactions.length === 0 && !error && (
        <div className="flex flex-col items-center gap-3 py-14">
          <div className="h-14 w-14 bg-gray-100 rounded-2xl flex items-center justify-center">
            <FileText className="w-7 h-7 text-gray-300" />
          </div>
          <p className="text-sm text-gray-500 text-center max-w-[240px]">
            No transactions found for the selected period
          </p>
        </div>
      )}

      {/* Results */}
      {!loading && transactions.length > 0 && (
        <>
          <div className="flex items-center gap-3 px-1">
            <span className="text-xs font-semibold text-gray-900">{transactions.length} vouchers</span>
            {typeFilter !== 'all' && (
              <span className="text-xs text-teal-600">{filteredTx.length} shown</span>
            )}
          </div>

          {/* Type filter pills */}
          {voucherTypes.length > 2 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {voucherTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                    typeFilter === type ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {type === 'all' ? 'All Types' : type}
                </button>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search party, voucher no…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {filteredTx.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">No results</div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-50 overflow-hidden">
              {filteredTx.map((tx, idx) => {
                const txKey    = `${tx.voucherNumber}-${idx}`;
                const expanded = expandedTx === txKey;
                const color    = getAvatarColor(tx.partyName || tx.voucherType);
                const initial  = (tx.partyName || tx.voucherType)?.[0]?.toUpperCase() ?? '?';
                const hasLedger = (tx.ledgerEntries?.length ?? 0) > 0;
                const hasInv    = (tx.inventoryEntries?.length ?? 0) > 0;

                return (
                  <div key={txKey}>
                    {/* Row */}
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-teal-50 transition-colors"
                      onClick={() => setExpandedTx(expanded ? null : txKey)}
                    >
                      <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                        <span className="text-white font-bold text-sm">{initial}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-[13px] leading-tight truncate">
                          {tx.partyName && tx.partyName !== 'Unknown' ? tx.partyName : tx.voucherType}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 shrink-0">
                            {tx.voucherType}
                          </span>
                          <span className="text-[11px] text-gray-400">{tx.date}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 mr-1">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(tx.amount)}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[80px]">
                          {tx.voucherNumber || '—'}
                        </p>
                      </div>
                      {expanded
                        ? <ChevronUp   className="h-4 w-4 text-teal-500 shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-gray-300 shrink-0" />}
                    </button>

                    {/* Expanded detail */}
                    {expanded && (
                      <div className="px-4 pb-4 bg-teal-50/40 space-y-3 border-t border-teal-100">
                        {/* Summary */}
                        <div className="flex items-center justify-between pt-3 pb-1">
                          <div>
                            <p className="text-xs font-semibold text-teal-700">{tx.voucherType}</p>
                            <p className="text-[11px] text-gray-500">{tx.voucherNumber} · {tx.date}</p>
                          </div>
                          <p className="text-sm font-bold text-teal-700">{formatCurrency(tx.amount)}</p>
                        </div>

                        {/* Ledger entries */}
                        {hasLedger && (
                          <div>
                            <div className="flex items-center gap-1.5 mb-2">
                              <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                                Ledger Entries ({tx.ledgerEntries.length})
                              </p>
                            </div>
                            <div className="space-y-1.5">
                              {tx.ledgerEntries.map((e, ei) => (
                                <div key={ei} className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-gray-100 gap-2">
                                  <span className="text-xs text-gray-700 flex-1 leading-tight">{e.ledgerName}</span>
                                  <div className="text-right shrink-0">
                                    <span className={`text-xs font-bold ${e.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {formatCurrency(e.amount)}
                                    </span>
                                    <p className="text-[9px] text-gray-400">{e.amount >= 0 ? 'Dr' : 'Cr'}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Inventory entries */}
                        {hasInv && (
                          <div>
                            <div className="flex items-center gap-1.5 mb-2">
                              <Package className="w-3.5 h-3.5 text-gray-400" />
                              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                                Stock Items ({tx.inventoryEntries.length})
                              </p>
                            </div>
                            <div className="space-y-1.5">
                              {tx.inventoryEntries.map((e, ei) => (
                                <div key={ei} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 border border-gray-100">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-700 truncate">{e.stockName}</p>
                                    {e.quantity > 0 && (
                                      <p className="text-[10px] text-gray-400 mt-0.5">
                                        {e.quantity}{e.unit ? ` ${e.unit}` : ''}
                                        {e.rate > 0 ? ` @ ${formatCurrency(e.rate)}` : ''}
                                      </p>
                                    )}
                                  </div>
                                  <span className="text-xs font-bold text-teal-600 shrink-0">
                                    {formatCurrency(e.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* No entries fallback */}
                        {!hasLedger && !hasInv && (
                          <div className="bg-white rounded-xl px-4 py-3 border border-gray-100 text-center">
                            <p className="text-xs text-gray-400">No detailed entries returned by Tally</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">

      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="h-9 w-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 active:bg-gray-100 shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate leading-tight">
              {ledger.name}
            </h1>
            <p className="text-xs text-gray-400 truncate">{ledger.parent || 'No group'}</p>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-base sm:text-lg font-bold ${isPos ? 'text-green-600' : isNeg ? 'text-red-600' : 'text-gray-600'}`}>
              {formatCurrency(ledger.closingBalance)}
            </p>
            <p className="text-[10px] text-gray-400">{isNeg ? 'Cr' : 'Dr'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-3 bg-gray-100 rounded-2xl p-1 flex gap-0.5">
          {([
            ['details',      Building2, 'Details'],
            ['transactions', FileText,  'Transactions'],
          ] as [string, React.ElementType, string][]).map(([id, Icon, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id as 'details' | 'transactions')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                activeTab === id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        {activeTab === 'details' ? renderDetails() : renderTransactions()}
      </div>
    </div>
  );
};

export default LedgerDetails;
