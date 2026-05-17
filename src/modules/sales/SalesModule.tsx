import React, { useState, useEffect, useCallback } from 'react';
import { useCompany } from '../../context/CompanyContext';
import { useGlobalDateRange } from '../../context/GlobalDateRangeContext';
import SalesApiService, { SalesVoucher } from '../../services/api/sales/salesApiService';
import { DateRange } from '../../shared/components/DateRangeFilter';
import { SimpleVoucherModal } from './components/SimpleVoucherModal';
import SalesOverview from './components/SalesOverview';
import SalesAnalytics from './components/SalesAnalytics';
import SalesComparison from './components/SalesComparison';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/Tabs';
import { RefreshCw, AlertCircle, BarChart3, FileText, ArrowUpDown, TrendingUp } from 'lucide-react';

/** Compute the previous equivalent period (same duration, shifted back). */
function computePrevPeriod(range: DateRange): DateRange {
  const from = new Date(range.from);
  const to   = new Date(range.to);
  const durationMs = to.getTime() - from.getTime();
  const prevTo   = new Date(from.getTime() - 86_400_000); // 1 day before start
  const prevFrom = new Date(prevTo.getTime() - durationMs);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: fmt(prevFrom), to: fmt(prevTo), label: `Prev ${range.label}` };
}

const SalesModule: React.FC = () => {
  const { selectedCompany } = useCompany();
  const { dateRange } = useGlobalDateRange();

  // ── All tabs share the same fetch for the selected global period ─────────
  const [salesVouchers, setSalesVouchers]   = useState<SalesVoucher[]>([]);
  const [loading, setLoading]               = useState(false);
  const [rangeLabel, setRangeLabel]         = useState('');

  // Comparison: previous equivalent period
  const [prevVouchers, setPrevVouchers]     = useState<SalesVoucher[]>([]);
  const [prevLoading, setPrevLoading]       = useState(false);
  const [prevLabel, setPrevLabel]           = useState('');

  const [error, setError]                   = useState<string | null>(null);

  // Modal state
  const [selectedVoucherGuid, setSelectedVoucherGuid]     = useState('');
  const [selectedVoucherNumber, setSelectedVoucherNumber] = useState('');
  const [selectedVoucherData, setSelectedVoucherData]     = useState<SalesVoucher | null>(null);
  const [isModalOpen, setIsModalOpen]                     = useState(false);

  const salesApi = new SalesApiService();

  // ── Fetch current period ─────────────────────────────────────────────────
  const fetchCurrent = useCallback(async (range: DateRange) => {
    if (!selectedCompany || !range.from) return;
    try {
      setLoading(true);
      setError(null);
      const vouchers = await salesApi.getSalesVouchers(
        selectedCompany, 'custom', new Date(range.from), new Date(range.to)
      );
      setSalesVouchers(vouchers);
      setRangeLabel(range.label);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales data');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  // ── Fetch previous period ────────────────────────────────────────────────
  const fetchPrev = useCallback(async (range: DateRange) => {
    if (!selectedCompany || !range.from) return;
    const prev = computePrevPeriod(range);
    try {
      setPrevLoading(true);
      const vouchers = await salesApi.getSalesVouchers(
        selectedCompany, 'custom', new Date(prev.from), new Date(prev.to)
      );
      setPrevVouchers(vouchers);
      setPrevLabel(prev.label);
    } catch {
      setPrevVouchers([]);
    } finally {
      setPrevLoading(false);
    }
  }, [selectedCompany]);

  // ── Re-fetch whenever company or global date range changes ────────────────
  useEffect(() => {
    if (selectedCompany && dateRange.from) {
      fetchCurrent(dateRange);
      fetchPrev(dateRange);
    }
  }, [selectedCompany, dateRange]);

  // ── Modal handlers ───────────────────────────────────────────────────────
  const handleVoucherClick = (voucher: SalesVoucher) => {
    setSelectedVoucherGuid(voucher.guid);
    setSelectedVoucherNumber(voucher.voucherNumber);
    setSelectedVoucherData(voucher);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedVoucherGuid('');
    setSelectedVoucherNumber('');
    setSelectedVoucherData(null);
  };

  // ── Error state ──────────────────────────────────────────────────────────
  if (error && !salesVouchers.length) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Sales Dashboard</h1>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <div>
              <h3 className="font-medium text-red-800">Error loading sales data</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <button
                onClick={() => fetchCurrent(dateRange)}
                className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 w-full max-w-full overflow-x-hidden">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sales</h1>
          <p className="text-xs text-gray-400 mt-0.5">All sales data from Tally</p>
        </div>
        <button
          onClick={() => { fetchCurrent(dateRange); fetchPrev(dateRange); }}
          disabled={loading}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex w-full bg-gray-100 rounded-2xl p-1 overflow-x-auto scrollbar-hide gap-0.5">
          <TabsTrigger value="overview" icon={FileText}>
            <span className="font-semibold whitespace-nowrap">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" icon={BarChart3}>
            <span className="font-semibold whitespace-nowrap">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="comparison" icon={ArrowUpDown}>
            <span className="font-semibold whitespace-nowrap">Compare</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <SalesOverview
            salesVouchers={salesVouchers}
            currentRangeLabel={rangeLabel}
            loading={loading}
            onVoucherClick={handleVoucherClick}
          />
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics">
          <div className="flex items-center gap-2 mb-4 mt-1">
            <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl shadow-sm">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800">Sales Analytics</h2>
              <p className="text-xs text-gray-500">{rangeLabel}</p>
            </div>
            {loading && <RefreshCw className="w-4 h-4 animate-spin text-blue-500 ml-auto" />}
          </div>
          <SalesAnalytics
            salesVouchers={salesVouchers}
            currentRangeLabel={rangeLabel}
            loading={loading}
          />
        </TabsContent>

        {/* Comparison */}
        <TabsContent value="comparison">
          <div className="flex items-center gap-2 mb-4 mt-1">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl shadow-sm">
              <ArrowUpDown className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800">Period Comparison</h2>
              <p className="text-xs text-gray-500">{rangeLabel} vs {prevLabel}</p>
            </div>
            {(loading || prevLoading) && <RefreshCw className="w-4 h-4 animate-spin text-purple-500 ml-auto" />}
          </div>
          <SalesComparison
            currentPeriodVouchers={salesVouchers}
            currentPeriodLabel={rangeLabel}
            loading={loading || prevLoading}
            previousPeriodVouchers={prevVouchers}
            previousPeriodLabel={prevLabel}
          />
        </TabsContent>
      </Tabs>

      {/* Voucher Detail Modal */}
      <SimpleVoucherModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        voucherGuid={selectedVoucherGuid}
        voucherNumber={selectedVoucherNumber}
        voucherData={selectedVoucherData}
      />
    </div>
  );
};

export default SalesModule;
