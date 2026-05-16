import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useCompany } from '../../context/CompanyContext';
import { useGlobalDateRange } from '../../context/GlobalDateRangeContext';
import PurchasesApiService, { PurchaseVoucher } from '../../services/api/purchases/purchasesApiService';
import { DateRange } from '../../shared/components/DateRangeFilter';
import PurchaseOverview from './components/PurchaseOverview';
import PurchaseAnalytics from './components/PurchaseAnalytics';
import SupplierManagement from './components/SupplierManagement';
import PurchaseTransactions from './components/PurchaseTransactions';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../sales/components/Tabs';
import { RefreshCw, AlertCircle, BarChart3, FileText, Users, ArrowUpDown } from 'lucide-react';

/** Compute the previous equivalent period (same duration, shifted back). */
function computePrevPeriod(range: DateRange): DateRange {
  const from = new Date(range.from);
  const to   = new Date(range.to);
  const durationMs = to.getTime() - from.getTime();
  const prevTo   = new Date(from.getTime() - 86_400_000);
  const prevFrom = new Date(prevTo.getTime() - durationMs);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: fmt(prevFrom), to: fmt(prevTo), label: `Prev ${range.label}` };
}

const PurchasesModule: React.FC = () => {
  const { selectedCompany } = useCompany();
  const { dateRange } = useGlobalDateRange();

  const [purchaseVouchers, setPurchaseVouchers] = useState<PurchaseVoucher[]>([]);
  const [loading, setLoading]                   = useState(false);
  const [rangeLabel, setRangeLabel]             = useState('');

  const [prevVouchers, setPrevVouchers] = useState<PurchaseVoucher[]>([]);
  const [prevLoading, setPrevLoading]   = useState(false);
  const [prevLabel, setPrevLabel]       = useState('');

  const [error, setError] = useState<string | null>(null);

  const purchaseApiRef = useRef(new PurchasesApiService());

  const fetchCurrent = useCallback(async (range: DateRange) => {
    if (!selectedCompany) return;
    try {
      setLoading(true);
      setError(null);
      const from = range.from ? new Date(range.from) : undefined;
      const to   = range.to   ? new Date(range.to)   : undefined;
      const vouchers = await purchaseApiRef.current.getPurchaseVouchers(
        selectedCompany, 'custom', from, to
      );
      setPurchaseVouchers(vouchers);
      setRangeLabel(range.label);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch purchase data');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  const fetchPrev = useCallback(async (range: DateRange) => {
    if (!selectedCompany || !range.from) return; // skip prev for all-time
    const prev = computePrevPeriod(range);
    try {
      setPrevLoading(true);
      const vouchers = await purchaseApiRef.current.getPurchaseVouchers(
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

  useEffect(() => {
    if (selectedCompany) {
      fetchCurrent(dateRange);
      fetchPrev(dateRange);
    }
  }, [selectedCompany, dateRange]);

  if (error && !purchaseVouchers.length) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Purchases</h1>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <div>
              <h3 className="font-medium text-red-800">Error loading purchase data</h3>
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
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Purchases</h1>
          <p className="text-xs text-gray-400 mt-0.5">All purchase data from Tally</p>
        </div>
        <button
          onClick={() => { fetchCurrent(dateRange); fetchPrev(dateRange); }}
          disabled={loading}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 text-sm font-medium transition-colors shadow-sm"
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
          <TabsTrigger value="suppliers" icon={Users}>
            <span className="font-semibold whitespace-nowrap">Suppliers</span>
          </TabsTrigger>
          <TabsTrigger value="comparison" icon={ArrowUpDown}>
            <span className="font-semibold whitespace-nowrap">Compare</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <PurchaseOverview
            purchaseVouchers={purchaseVouchers}
            currentRangeLabel={rangeLabel}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="flex items-center gap-2 mb-4 mt-1">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl shadow-sm">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800">Purchase Analytics</h2>
              <p className="text-xs text-gray-500">{rangeLabel}</p>
            </div>
            {loading && <RefreshCw className="w-4 h-4 animate-spin text-purple-500 ml-auto" />}
          </div>
          <PurchaseAnalytics
            purchaseVouchers={purchaseVouchers}
            currentRangeLabel={rangeLabel}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="suppliers">
          <SupplierManagement
            purchaseVouchers={purchaseVouchers}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="comparison">
          <div className="flex items-center gap-2 mb-4 mt-1">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl shadow-sm">
              <ArrowUpDown className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800">Period Comparison</h2>
              <p className="text-xs text-gray-500">{rangeLabel} vs {prevLabel}</p>
            </div>
            {(loading || prevLoading) && <RefreshCw className="w-4 h-4 animate-spin text-purple-500 ml-auto" />}
          </div>
          <PurchaseTransactions
            currentPeriodVouchers={purchaseVouchers}
            previousPeriodVouchers={prevVouchers}
            currentPeriodLabel={rangeLabel}
            previousPeriodLabel={prevLabel}
            loading={loading || prevLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PurchasesModule;


