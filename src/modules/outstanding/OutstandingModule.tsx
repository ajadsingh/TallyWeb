import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCompany } from '../../context/CompanyContext';
import { useGlobalDateRange } from '../../context/GlobalDateRangeContext';
import OutstandingApiService, {
  PartyOutstanding,
} from '../../services/api/outstanding/outstandingApiService';
import PartiesList from './components/PartiesList';
import PartyDetail from './components/PartyDetail';
import {
  RefreshCw,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Scale,
  Users,
} from 'lucide-react';

type ActiveTab = 'receivable' | 'payable';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.abs(n));

const OutstandingModule: React.FC = () => {
  const { selectedCompany } = useCompany();
  const { dateRange }       = useGlobalDateRange();

  const [activeTab,   setActiveTab]   = useState<ActiveTab>('receivable');
  const [receivables, setReceivables] = useState<PartyOutstanding[]>([]);
  const [payables,    setPayables]    = useState<PartyOutstanding[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // Party detail drill-down
  const [selectedParty, setSelectedParty] = useState<PartyOutstanding | null>(null);
  const [selectedType,  setSelectedType]  = useState<ActiveTab>('receivable');

  const apiRef = useRef(new OutstandingApiService());

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    setError(null);
    try {
      // Sequential — Tally handles one request at a time
      const rec = await apiRef.current.getReceivableParties(selectedCompany);
      const pay = await apiRef.current.getPayableParties(selectedCompany);
      setReceivables(rec);
      setPayables(pay);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch outstanding data');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  useEffect(() => {
    setSelectedParty(null);
    fetchData();
  }, [selectedCompany]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePartyClick = (party: PartyOutstanding) => {
    setSelectedParty(party);
    setSelectedType(activeTab);
  };

  const totalReceivable = receivables.reduce((s, p) => s + Math.abs(p.closingBalance), 0);
  const totalPayable    = payables.reduce((s, p) => s + Math.abs(p.closingBalance), 0);
  const netPosition     = totalReceivable - totalPayable;

  if (!selectedCompany) {
    return (
      <div className="p-6 text-center text-gray-500">
        Select a company to view outstanding.
      </div>
    );
  }

  // ── Party detail drill-down ───────────────────────────────────────────────
  if (selectedParty) {
    return (
      <PartyDetail
        party={selectedParty}
        type={selectedType}
        companyName={selectedCompany}
        globalFrom={dateRange.from}
        globalTo={dateRange.to}
        onBack={() => setSelectedParty(null)}
      />
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 space-y-5 w-full overflow-x-hidden">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outstanding</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Party-wise receivables &amp; payables · {selectedCompany}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Receivable */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Total Receivable
            </span>
            <div className="p-1.5 bg-emerald-100 rounded-lg">
              <TrendingDown className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{fmt(totalReceivable)}</p>
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <Users className="w-3 h-3" />{receivables.length} customers
          </p>
        </div>

        {/* Payable */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-red-600">
              Total Payable
            </span>
            <div className="p-1.5 bg-red-100 rounded-lg">
              <TrendingUp className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-700">{fmt(totalPayable)}</p>
          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
            <Users className="w-3 h-3" />{payables.length} vendors
          </p>
        </div>

        {/* Net position */}
        <div className={`border rounded-xl p-5 ${
          netPosition >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-semibold uppercase tracking-wide ${
              netPosition >= 0 ? 'text-blue-600' : 'text-orange-600'
            }`}>
              Net Position
            </span>
            <div className={`p-1.5 rounded-lg ${netPosition >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
              <Scale className={`w-4 h-4 ${netPosition >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${netPosition >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
            {netPosition >= 0 ? '+' : '-'}{fmt(Math.abs(netPosition))}
          </p>
          <p className={`text-xs mt-1 ${netPosition >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
            {netPosition >= 0 ? 'Net receivable surplus' : 'Net payable surplus'}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Failed to load data</p>
            <p className="text-sm text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Tabs + list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {([
            { id: 'receivable' as ActiveTab, label: 'Receivable — Customers', count: receivables.length, color: 'emerald' },
            { id: 'payable'    as ActiveTab, label: 'Payable — Vendors',      count: payables.length,    color: 'red'     },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? tab.color === 'emerald'
                    ? 'border-emerald-500 text-emerald-700'
                    : 'border-red-500 text-red-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === tab.id
                    ? tab.color === 'emerald' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
              <span className="text-gray-500 text-sm">Loading from Tally…</span>
            </div>
          ) : (
            <PartiesList
              parties={activeTab === 'receivable' ? receivables : payables}
              type={activeTab}
              onPartyClick={handlePartyClick}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default OutstandingModule;


