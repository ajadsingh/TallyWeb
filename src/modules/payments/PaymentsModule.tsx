import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { RefreshCw, AlertCircle, ArrowDownCircle, ArrowUpCircle, TrendingUp, ArrowLeftRight } from 'lucide-react';
import { useCompany } from '../../context/CompanyContext';
import { useGlobalDateRange } from '../../context/GlobalDateRangeContext';
import PaymentsApiService, { PaymentVoucher } from '../../services/api/payments/paymentsApiService';
import PaymentList from './components/PaymentList';
import PaymentDetailModal from './components/PaymentDetailModal';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const apiInstance = new PaymentsApiService();

const PaymentsModule: React.FC = () => {
  const { selectedCompany } = useCompany();
  const { dateRange }       = useGlobalDateRange();

  const [vouchers, setVouchers] = useState<PaymentVoucher[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [rangeLabel, setRangeLabel] = useState('');

  // Modal
  const [selectedVoucher, setSelectedVoucher] = useState<PaymentVoucher | null>(null);
  const [modalOpen,       setModalOpen]       = useState(false);

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    setError(null);
    try {
      const from = dateRange.from ? new Date(dateRange.from) : undefined;
      const to   = dateRange.to   ? new Date(dateRange.to)   : undefined;
      const data = await apiInstance.getPaymentVouchers(selectedCompany, from, to);
      setVouchers(data);
      setRangeLabel(dateRange.label);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── KPIs ────────────────────────────────────────────────────────────────
  const totalIn  = useMemo(() => vouchers.filter(v => v.direction === 'in').reduce((s, v) => s + v.amount, 0), [vouchers]);
  const totalOut = useMemo(() => vouchers.filter(v => v.direction === 'out').reduce((s, v) => s + v.amount, 0), [vouchers]);
  const netFlow  = totalIn - totalOut;
  const countIn  = useMemo(() => vouchers.filter(v => v.direction === 'in').length,  [vouchers]);
  const countOut = useMemo(() => vouchers.filter(v => v.direction === 'out').length, [vouchers]);

  const handleVoucherClick = (v: PaymentVoucher) => {
    setSelectedVoucher(v);
    setModalOpen(true);
  };

  // ── Error state ──────────────────────────────────────────────────────────
  if (error && !vouchers.length) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Payments</h1>
        <div className="bg-white rounded-xl border border-red-200 p-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-800">Error loading data</h3>
            <p className="text-sm text-red-600 mt-1">{error}</p>
            <button onClick={fetchData} className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 text-sm font-medium">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 w-full overflow-x-hidden">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Payments</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Receipts &amp; Payments · {rangeLabel}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* ── Loading bar ─────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center h-12 bg-blue-50 rounded-xl border border-blue-100">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2.5" />
          <span className="text-blue-700 text-sm font-medium">Loading…</span>
        </div>
      )}

      {/* ── KPI Cards ───────────────────────────────────────────────── */}
      <div className={`transition-opacity duration-200 ${loading ? 'opacity-40 pointer-events-none' : ''}`}>
        {/* Mobile horizontal scroll */}
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide sm:hidden snap-x snap-mandatory">
          {[
            {
              label: 'Money Received',
              value: fmt(totalIn),
              sub: `${countIn} receipts`,
              bg: 'from-emerald-500 to-emerald-600',
              ibg: 'bg-emerald-400',
              Icon: ArrowDownCircle,
            },
            {
              label: 'Money Paid',
              value: fmt(totalOut),
              sub: `${countOut} payments`,
              bg: 'from-red-500 to-red-600',
              ibg: 'bg-red-400',
              Icon: ArrowUpCircle,
            },
            {
              label: 'Net Cash Flow',
              value: fmt(Math.abs(netFlow)),
              sub: netFlow >= 0 ? 'Net inflow' : 'Net outflow',
              bg: netFlow >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600',
              ibg: netFlow >= 0 ? 'bg-blue-400' : 'bg-orange-400',
              Icon: TrendingUp,
            },
            {
              label: 'Total Entries',
              value: vouchers.length.toLocaleString('en-IN'),
              sub: rangeLabel,
              bg: 'from-violet-500 to-violet-600',
              ibg: 'bg-violet-400',
              Icon: ArrowLeftRight,
            },
          ].map(c => (
            <div
              key={c.label}
              className={`snap-start shrink-0 w-[44vw] bg-gradient-to-br ${c.bg} text-white rounded-2xl p-4 shadow-md`}
            >
              <div className={`h-9 w-9 ${c.ibg} rounded-xl flex items-center justify-center mb-3`}>
                <c.Icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-white/70 text-[11px] font-medium">{c.label}</p>
              <p className="text-xl font-bold mt-0.5 truncate">{c.value}</p>
              <p className="text-white/50 text-[10px] mt-0.5 truncate">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Desktop 4-col grid */}
        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: 'Money Received',
              value: fmt(totalIn),
              sub: `${countIn} receipt entries`,
              bg: 'from-emerald-500 to-emerald-600',
              ibg: 'bg-emerald-400',
              Icon: ArrowDownCircle,
            },
            {
              label: 'Money Paid',
              value: fmt(totalOut),
              sub: `${countOut} payment entries`,
              bg: 'from-red-500 to-red-600',
              ibg: 'bg-red-400',
              Icon: ArrowUpCircle,
            },
            {
              label: 'Net Cash Flow',
              value: (netFlow >= 0 ? '+' : '-') + fmt(Math.abs(netFlow)),
              sub: netFlow >= 0 ? 'Net inflow ▲' : 'Net outflow ▼',
              bg: netFlow >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600',
              ibg: netFlow >= 0 ? 'bg-blue-400' : 'bg-orange-400',
              Icon: TrendingUp,
            },
            {
              label: 'Total Entries',
              value: vouchers.length.toLocaleString('en-IN'),
              sub: rangeLabel,
              bg: 'from-violet-500 to-violet-600',
              ibg: 'bg-violet-400',
              Icon: ArrowLeftRight,
            },
          ].map(c => (
            <div key={c.label} className={`bg-gradient-to-r ${c.bg} text-white rounded-xl p-4 shadow-md`}>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-white/80 text-[11px] font-medium mb-0.5">{c.label}</p>
                  <p className="text-2xl font-bold truncate">{c.value}</p>
                  <p className="text-white/60 text-xs mt-0.5 truncate">{c.sub}</p>
                </div>
                <div className={`h-12 w-12 shrink-0 ${c.ibg} rounded-lg flex items-center justify-center ml-2`}>
                  <c.Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Transaction List ─────────────────────────────────────────── */}
      <div className={`transition-opacity duration-200 ${loading ? 'opacity-40 pointer-events-none' : ''}`}>
        <PaymentList
          vouchers={vouchers}
          loading={loading}
          onVoucherClick={handleVoucherClick}
        />
      </div>

      {/* ── Detail Modal ─────────────────────────────────────────────── */}
      <PaymentDetailModal
        isOpen={modalOpen}
        voucher={selectedVoucher}
        companyName={selectedCompany ?? ''}
        onClose={() => { setModalOpen(false); setSelectedVoucher(null); }}
      />
    </div>
  );
};

export default PaymentsModule;
