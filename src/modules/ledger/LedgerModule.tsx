import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCompany } from '../../context/CompanyContext';
import { useGlobalDateRange } from '../../context/GlobalDateRangeContext';
import LedgerApiService, { TallyLedger } from '../../services/api/ledger/ledgerApiService';
import LedgerList from './components/LedgerList';
import LedgerStatement from './components/LedgerStatement';
import { RefreshCw, AlertCircle, BookOpen, TrendingDown, TrendingUp } from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.abs(n));

const LedgerModule: React.FC = () => {
  const { selectedCompany } = useCompany();
  const { dateRange }       = useGlobalDateRange();

  const [ledgers,         setLedgers]         = useState<TallyLedger[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [selectedLedger,  setSelectedLedger]  = useState<TallyLedger | null>(null);

  const apiRef = useRef(new LedgerApiService());

  const fetchLedgers = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRef.current.getLedgerList(selectedCompany);
      setLedgers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ledgers');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  useEffect(() => {
    setSelectedLedger(null);
    fetchLedgers();
  }, [selectedCompany]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!selectedCompany) {
    return (
      <div className="p-6 text-center text-gray-500">
        Select a company to view ledgers.
      </div>
    );
  }

  if (selectedLedger) {
    return (
      <LedgerStatement
        ledger={selectedLedger}
        companyName={selectedCompany}
        globalFrom={dateRange.from}
        globalTo={dateRange.to}
        onBack={() => setSelectedLedger(null)}
      />
    );
  }

  const drTotal = ledgers.filter(l => l.closingBalance < 0).reduce((s, l) => s + Math.abs(l.closingBalance), 0);
  const crTotal = ledgers.filter(l => l.closingBalance > 0).reduce((s, l) => s + l.closingBalance, 0);

  return (
    <div className="p-4 sm:p-6 space-y-5">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ledgers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Chart of accounts · {selectedCompany}</p>
        </div>
        <button
          onClick={fetchLedgers}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Ledgers</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{ledgers.length}</p>
              <p className="text-xs text-gray-400 mt-1">across all groups</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Dr Balance (Total)</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{fmt(drTotal)}</p>
              <p className="text-xs text-gray-400 mt-1">{ledgers.filter(l => l.closingBalance < 0).length} ledgers</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Cr Balance (Total)</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{fmt(crTotal)}</p>
              <p className="text-xs text-gray-400 mt-1">{ledgers.filter(l => l.closingBalance > 0).length} ledgers</p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">Failed to load ledgers</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      <LedgerList
        ledgers={ledgers}
        loading={loading}
        onSelect={setSelectedLedger}
        onRefresh={fetchLedgers}
      />
    </div>
  );
};

export default LedgerModule;
