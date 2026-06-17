import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, AlertCircle, Receipt } from 'lucide-react';
import { useCompany } from '../../context/CompanyContext';
import { useGlobalDateRange } from '../../context/GlobalDateRangeContext';
import ReportsApiService, { GSTSummaryData } from '../../services/api/reports/reportsApiService';
import GstReport from '../reports/components/GstReport';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const GSTModule: React.FC = () => {
  const { selectedCompany } = useCompany();
  const { dateRange } = useGlobalDateRange();
  const apiRef = useRef(new ReportsApiService());

  const [data, setData] = useState<GSTSummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGstSummary = async () => {
    if (!selectedCompany || !dateRange.from || !dateRange.to) return;
    setLoading(true);
    setError(null);

    try {
      const result = await apiRef.current.getGstSummary(selectedCompany, dateRange.from, dateRange.to);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load GST summary');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGstSummary();
  }, [selectedCompany, dateRange.from, dateRange.to]);

  if (!selectedCompany) {
    return (
      <div className="p-6 text-center text-gray-500">
        Select a company to view GST details.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-screen-xl mx-auto w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GST Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {dateRange.label} · {selectedCompany}
          </p>
        </div>
        <button
          onClick={loadGstSummary}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold">Unable to load GST summary</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4">
          <div className="h-28 rounded-3xl bg-gray-100 animate-pulse" />
          <div className="h-48 rounded-3xl bg-gray-100 animate-pulse" />
        </div>
      ) : data ? (
        <GstReport data={data} formatCurrency={formatCurrency} />
      ) : (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center text-gray-500">
          <Receipt className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm">No GST summary available. Check your voucher data and re-run the report.</p>
        </div>
      )}
    </div>
  );
};

export default GSTModule;
