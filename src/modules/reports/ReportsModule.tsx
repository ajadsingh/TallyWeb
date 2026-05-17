import React, { useState, useCallback, useRef } from 'react';
import { RefreshCw, AlertCircle, FileText, TrendingUp, Scale, Droplets, Receipt } from 'lucide-react';
import { useCompany } from '../../context/CompanyContext';
import { useGlobalDateRange } from '../../context/GlobalDateRangeContext';
import { BalanceSheetApiService, BalanceSheetData } from '../../services/api/balanceSheetApiService';
import ReportsApiService, {
  ProfitLossData, TrialBalanceData, CashFlowData, GSTSummaryData
} from '../../services/api/reports/reportsApiService';
import BalanceSheetView from '../company/components/BalanceSheetView';
import ProfitLossReport from './components/ProfitLossReport';
import TrialBalanceReport from './components/TrialBalanceReport';
import CashFlowReport from './components/CashFlowReport';
import GstReport from './components/GstReport';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(amount);
}

type TabId = 'balance-sheet' | 'profit-loss' | 'trial-balance' | 'cash-flow' | 'gst';

interface TabConfig {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
}

const TABS: TabConfig[] = [
  { id: 'balance-sheet', label: 'Balance Sheet',   shortLabel: 'B/S', icon: <Scale className="w-4 h-4" /> },
  { id: 'profit-loss',   label: 'Profit & Loss',   shortLabel: 'P&L', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'trial-balance', label: 'Trial Balance',   shortLabel: 'T/B', icon: <FileText className="w-4 h-4" /> },
  { id: 'gst',           label: 'GST Summary',     shortLabel: 'GST', icon: <Receipt className="w-4 h-4" /> },
  { id: 'cash-flow',     label: 'Cash Flow',       shortLabel: 'C/F', icon: <Droplets className="w-4 h-4" /> },
];

// ─── Skeleton ────────────────────────────────────────────────────────────────

const Skeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="grid grid-cols-3 gap-4">
      {[0, 1, 2].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
    </div>
    <div className="grid grid-cols-2 gap-4">
      {[0, 1].map(i => <div key={i} className="h-48 bg-gray-100 rounded-xl" />)}
    </div>
  </div>
);

// ─── Error Banner ─────────────────────────────────────────────────────────────

const ErrorBanner: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
    <div className="flex-1">
      <p className="text-sm font-semibold text-red-700">Failed to load report</p>
      <p className="text-sm text-red-600 mt-0.5">{message}</p>
    </div>
    <button onClick={onRetry}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-700 border border-red-300 rounded-lg hover:bg-red-100">
      <RefreshCw className="w-3.5 h-3.5" /> Retry
    </button>
  </div>
);

// ─── Module ───────────────────────────────────────────────────────────────────

const ReportsModule: React.FC = () => {
  const { selectedCompany } = useCompany();
  const { dateRange }       = useGlobalDateRange();

  const [activeTab, setActiveTab]   = useState<TabId>('balance-sheet');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // Per-tab data
  const [bsData, setBsData]   = useState<BalanceSheetData | null>(null);
  const [plData, setPlData]   = useState<ProfitLossData | null>(null);
  const [tbData, setTbData]   = useState<TrialBalanceData | null>(null);
  const [cfData, setCfData]   = useState<CashFlowData | null>(null);
  const [gstData, setGstData] = useState<GSTSummaryData | null>(null);

  // Track which tabs have been loaded for the current date range
  const loadedRef = useRef<Set<string>>(new Set());

  const cacheKey = `${activeTab}|${dateRange.from}|${dateRange.to}`;

  const bsApi  = useRef(new BalanceSheetApiService());
  const rptApi = useRef(new ReportsApiService());

  const load = useCallback(async (tab: TabId, force = false) => {
    const key = `${tab}|${dateRange.from}|${dateRange.to}`;
    if (!force && loadedRef.current.has(key)) return;
    if (!selectedCompany) return;

    const from8 = dateRange.from?.replace(/-/g, '') ?? '';
    const to8   = dateRange.to?.replace(/-/g, '')   ?? '';
    if (!from8 || !to8) return;

    setLoading(true);
    setError(null);

    try {
      switch (tab) {
        case 'balance-sheet':
          setBsData(await bsApi.current.getBalanceSheet(from8, to8, selectedCompany));
          break;
        case 'profit-loss':
          setPlData(await rptApi.current.getProfitLoss(selectedCompany, dateRange.from, dateRange.to));
          break;
        case 'trial-balance':
          setTbData(await rptApi.current.getTrialBalance(selectedCompany, dateRange.from, dateRange.to));
          break;
        case 'cash-flow':
          setCfData(await rptApi.current.getCashFlow(selectedCompany, dateRange.from, dateRange.to));
          break;
        case 'gst':
          setGstData(await rptApi.current.getGstSummary(selectedCompany, dateRange.from, dateRange.to));
          break;
      }
      loadedRef.current.add(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, dateRange]);

  // When tab changes, load if not already loaded
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setError(null);
    load(tab);
  };

  // Initial load for default tab + reload on date range change
  React.useEffect(() => {
    loadedRef.current.clear(); // Invalidate all caches on date change
    load(activeTab, true);
  }, [dateRange.from, dateRange.to, selectedCompany]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    loadedRef.current.delete(cacheKey);
    load(activeTab, true);
  };

  if (!selectedCompany) {
    return (
      <div className="p-6 text-center text-gray-500">
        Select a company to view reports.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-screen-xl mx-auto w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {dateRange.label}
            {selectedCompany && <span className="ml-2 text-gray-400">· {selectedCompany}</span>}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto scrollbar-hide w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel}</span>
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="min-h-[300px]">
        {error && <ErrorBanner message={error} onRetry={handleRefresh} />}

        {!error && loading && <Skeleton />}

        {!error && !loading && activeTab === 'balance-sheet' && bsData && (
          <BalanceSheetView balanceSheet={bsData} loading={false} formatCurrency={formatCurrency} />
        )}
        {!error && !loading && activeTab === 'profit-loss' && plData && (
          <ProfitLossReport data={plData} formatCurrency={formatCurrency} />
        )}
        {!error && !loading && activeTab === 'trial-balance' && tbData && (
          <TrialBalanceReport data={tbData} formatCurrency={formatCurrency} />
        )}
        {!error && !loading && activeTab === 'cash-flow' && cfData && (
          <CashFlowReport data={cfData} formatCurrency={formatCurrency} />
        )}
        {!error && !loading && activeTab === 'gst' && gstData && (
          <GstReport data={gstData} formatCurrency={formatCurrency} />
        )}

        {!error && !loading && (
          (activeTab === 'balance-sheet' && !bsData) ||
          (activeTab === 'profit-loss'   && !plData) ||
          (activeTab === 'trial-balance' && !tbData) ||
          (activeTab === 'cash-flow'     && !cfData) ||
          (activeTab === 'gst'           && !gstData)
        ) && (
          <div className="py-14 text-center text-gray-400 text-sm">
            No data returned for this period.
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsModule;
