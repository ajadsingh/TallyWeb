import React, { useState, useEffect, useRef } from 'react';
import { useCompany } from '../../context/CompanyContext';
import { useGlobalDateRange } from '../../context/GlobalDateRangeContext';
import ExpensesApiService, {
  ExpenseLedger,
  ExpenseVoucher,
  DateRangeOption,
} from '../../services/api/expenses/expensesApiService';
import ExpenseOverview from './components/ExpenseOverview';
import ExpenseCategoryView from './components/ExpenseCategoryView';
import ExpenseTransactions from './components/ExpenseTransactions';
import { RefreshCw, AlertCircle, BarChart3, Tag, FileText } from 'lucide-react';

type Tab = 'overview' | 'categories' | 'transactions';

const TAB_CONFIG: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'categories', label: 'Category Wise', icon: <Tag className="h-4 w-4" /> },
  { id: 'transactions', label: 'Transactions', icon: <FileText className="h-4 w-4" /> },
];

const ExpensesModule: React.FC = () => {
  const { selectedCompany } = useCompany();
  const { dateRange } = useGlobalDateRange();

  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Ledger state (year-to-date balances per expense head)
  const [ledgers, setLedgers] = useState<ExpenseLedger[]>([]);
  const [ledgersLoading, setLedgersLoading] = useState(false);

  // Voucher (transaction) state
  const [vouchers, setVouchers] = useState<ExpenseVoucher[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const [currentRangeLabel, setCurrentRangeLabel] = useState('');

  const [error, setError] = useState<string | null>(null);

  const apiRef = useRef(new ExpensesApiService());
  const api = apiRef.current;

  // ── Initial load & re-fetch when global date range changes ─────────────
  useEffect(() => {
    if (selectedCompany && dateRange.from) {
      fetchLedgers();
      fetchVouchers('custom', new Date(dateRange.from), new Date(dateRange.to));
    }
  }, [selectedCompany, dateRange]);

  const fetchLedgers = async () => {
    if (!selectedCompany) return;
    try {
      setLedgersLoading(true);
      setError(null);
      const data = await api.getExpenseLedgers(selectedCompany);
      setLedgers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch expense ledgers');
    } finally {
      setLedgersLoading(false);
    }
  };

  const fetchVouchers = async (
    option: DateRangeOption,
    customFrom?: Date,
    customTo?: Date
  ) => {
    if (!selectedCompany) return;
    try {
      setVouchersLoading(true);
      setError(null);
      const data = await api.getExpenseVouchers(selectedCompany, option, customFrom, customTo);
      setVouchers(data);
      setCurrentRangeLabel(api.getDateRange(option, customFrom, customTo).label);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch expense transactions');
    } finally {
      setVouchersLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchLedgers();
    if (dateRange.from) {
      fetchVouchers('custom', new Date(dateRange.from), new Date(dateRange.to));
    } else {
      fetchVouchers('custom');
    }
  };

  const totalExpenses = ledgers.reduce(
    (s, l) => s + Math.abs(l.closingBalance),
    0
  );

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 w-full overflow-x-hidden">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Expenses</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Direct &amp; Indirect expense tracking — all data from Tally
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-400">Total Expenses (YTD)</p>
            <p className="text-xl font-bold text-orange-600">{fmt(totalExpenses)}</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={ledgersLoading || vouchersLoading}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                ledgersLoading || vouchersLoading ? 'animate-spin' : ''
              }`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">Error</p>
            <p className="text-sm text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'overview' && (
            <ExpenseOverview
              ledgers={ledgers}
              vouchers={vouchers}
              ledgersLoading={ledgersLoading}
              vouchersLoading={vouchersLoading}
              currentRangeLabel={currentRangeLabel}
            />
          )}
          {activeTab === 'categories' && (
            <ExpenseCategoryView
              ledgers={ledgers}
              loading={ledgersLoading}
            />
          )}
          {activeTab === 'transactions' && (
            <ExpenseTransactions
              vouchers={vouchers}
              loading={vouchersLoading}
              currentRangeLabel={currentRangeLabel}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpensesModule;


