import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import OutstandingApiService, {
  PartyOutstanding,
  PartyTransaction,
  VoucherDetail,
} from '../../../services/api/outstanding/outstandingApiService';
import VoucherModal from './VoucherModal';

interface PartyDetailProps {
  party: PartyOutstanding;
  type: 'receivable' | 'payable';
  companyName: string;
  globalFrom: string;
  globalTo: string;
  onBack: () => void;
}

// helpers

/** YYYYMMDD to "DD MMM YYYY" */
const formatTallyDate = (d: string): string => {
  if (d.length === 8) {
    return new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`)
      .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return d;
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(Math.abs(n));

const quickRange = (key: string): { from: string; to: string } => {
  const now  = new Date();
  const y    = now.getFullYear();
  const m    = now.getMonth();
  const pad  = (n: number) => String(n).padStart(2, '0');
  const fmtD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const fyStart     = m >= 3 ? y : y - 1;
  const prevFyStart = fyStart - 1;

  if (key === 'currentFY') return { from: `${fyStart}-04-01`,    to: `${fyStart + 1}-03-31` };
  if (key === 'prevFY')    return { from: `${prevFyStart}-04-01`, to: `${fyStart}-03-31`     };
  if (key === 'thisMonth') return { from: `${y}-${pad(m + 1)}-01`, to: fmtD(new Date(y, m + 1, 0)) };
  if (key === 'last3m')    return { from: fmtD(new Date(y, m - 2, 1)), to: fmtD(new Date(y, m + 1, 0)) };
  if (key === 'last6m')    return { from: fmtD(new Date(y, m - 5, 1)), to: fmtD(new Date(y, m + 1, 0)) };
  return { from: `${prevFyStart}-04-01`, to: `${fyStart + 1}-03-31` };
};

const PRESETS = [
  { key: 'currentFY',  label: 'This FY'    },
  { key: 'prevFY',     label: 'Last FY'    },
  { key: 'thisMonth',  label: 'This Month' },
  { key: 'last3m',     label: 'Last 3 Mo'  },
  { key: 'last6m',     label: 'Last 6 Mo'  },
  { key: 'allTime',    label: 'All Time'   },
] as const;

const api = new OutstandingApiService();

const PartyDetail: React.FC<PartyDetailProps> = ({
  party, type, companyName, globalFrom, globalTo, onBack,
}) => {
  const [transactions, setTransactions] = useState<PartyTransaction[]>([]);
  const [loading, setLoading]           = useState(false);
  const [error,   setError]             = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string>('global');

  const [fromDate, setFromDate] = useState(globalFrom || quickRange('currentFY').from);
  const [toDate,   setToDate]   = useState(globalTo   || quickRange('currentFY').to);

  // Voucher detail modal
  const [modalOpen,      setModalOpen]      = useState(false);
  const [modalLoading,   setModalLoading]   = useState(false);
  const [modalError,     setModalError]     = useState<string | null>(null);
  const [modalVoucher,   setModalVoucher]   = useState<VoucherDetail | null>(null);

  const openVoucher = async (txn: PartyTransaction) => {
    if (!txn.voucherNumber) return;
    setModalOpen(true);
    setModalLoading(true);
    setModalError(null);
    setModalVoucher(null);
    try {
      const detail = await api.getVoucherDetail(companyName, txn.voucherNumber, txn.date);
      setModalVoucher(detail);
      if (!detail) setModalError('Voucher not found in Tally for this date.');
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to fetch voucher');
    } finally {
      setModalLoading(false);
    }
  };

  const fetchTransactions = useCallback(async (from: string, to: string) => {
    if (!companyName) return;
    setLoading(true);
    setError(null);
    try {
      const txns = await api.getPartyTransactions(
        companyName,
        party.name,
        from.replace(/-/g, ''),
        to.replace(/-/g, ''),
      );
      setTransactions(txns);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [companyName, party.name]);

  useEffect(() => {
    fetchTransactions(fromDate, toDate);
  }, [party.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyPreset = (key: string) => {
    const r = quickRange(key);
    setActivePreset(key);
    setFromDate(r.from);
    setToDate(r.to);
    fetchTransactions(r.from, r.to);
  };

  let runningBalance = party.openingBalance;
  const txnsWithBalance = transactions.map(t => {
    if (type === 'receivable') {
      runningBalance += t.drAmount - t.crAmount;
    } else {
      runningBalance += t.crAmount - t.drAmount;
    }
    return { ...t, balance: runningBalance };
  });

  const totalDr     = transactions.reduce((s, t) => s + t.drAmount, 0);
  const totalCr     = transactions.reduce((s, t) => s + t.crAmount, 0);
  const outstanding = Math.abs(party.closingBalance);

  const accentText  = type === 'receivable' ? 'text-emerald-600' : 'text-red-600';
  const accentBadge = type === 'receivable'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-red-50 text-red-700 border-red-200';
  const debitLabel  = type === 'receivable' ? 'Sales / Invoice'   : 'Purchase / Invoice';
  const creditLabel = type === 'receivable' ? 'Receipt / Payment' : 'Payment Made';

  return (
    <div className="p-4 sm:p-6 space-y-5 w-full overflow-x-hidden">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to list"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-800">{party.name}</h1>
              <span className={`px-2 py-0.5 text-xs font-semibold border rounded-full ${accentBadge}`}>
                {type === 'receivable' ? 'Customer' : 'Vendor'}
              </span>
            </div>
            {party.parent && (
              <p className="text-xs text-gray-400 mt-0.5">{party.parent}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">{type === 'receivable' ? 'To Receive' : 'To Pay'}</p>
          <p className={`text-2xl font-bold ${accentText}`}>{fmt(outstanding)}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">Opening Balance</p>
          <p className="text-base font-bold text-gray-700">{fmt(party.openingBalance)}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
          <p className="text-xs text-blue-500 mb-1">
            {type === 'receivable' ? 'Total Sales (Dr)' : 'Total Purchases (Cr)'}
          </p>
          <p className="text-base font-bold text-blue-700">
            {fmt(type === 'receivable' ? totalDr : totalCr)}
          </p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">
            {type === 'receivable' ? 'Receipts (Cr)' : 'Payments (Dr)'}
          </p>
          <p className="text-base font-bold text-gray-700">
            {fmt(type === 'receivable' ? totalCr : totalDr)}
          </p>
        </div>
        <div className={`border rounded-xl p-3 ${
          type === 'receivable' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
        }`}>
          <p className={`text-xs mb-1 ${accentText}`}>Net Outstanding</p>
          <p className={`text-base font-bold ${accentText}`}>{fmt(outstanding)}</p>
        </div>
      </div>

      {/* Date range picker */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              disabled={loading}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                activePreset === p.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => { setFromDate(e.target.value); setActivePreset('custom'); }}
              disabled={loading}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">To</label>
            <input
              type="date"
              value={toDate}
              onChange={e => { setToDate(e.target.value); setActivePreset('custom'); }}
              disabled={loading}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
            />
          </div>
          <button
            onClick={() => fetchTransactions(fromDate, toDate)}
            disabled={loading}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">Failed to load transactions</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Transaction table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-700">Transaction Ledger</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {loading
                ? 'Loading...'
                : `${transactions.length} entries | ${fromDate} to ${toDate}`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
            <span className="text-gray-500 text-sm">Fetching from Tally...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-base font-medium">No transactions found</p>
            <p className="text-sm mt-1">Try a wider date range (e.g. Last FY or All Time)</p>
          </div>
        ) : (
          <>
            {/* Mobile: Card list */}
            <div className="sm:hidden divide-y divide-gray-100">
              {/* Opening balance */}
              <div className="px-4 py-2.5 bg-yellow-50">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-yellow-700 font-medium">Opening Balance</span>
                  <span className="text-xs font-bold text-yellow-700">{fmt(party.openingBalance)}</span>
                </div>
              </div>
              {txnsWithBalance.map((txn, i) => (
                <button
                  key={i}
                  onClick={() => openVoucher(txn)}
                  className="w-full px-4 py-3.5 text-left active:bg-blue-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          txn.drAmount > 0 ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                        }`}>
                          {txn.voucherType}
                        </span>
                        <span className="text-xs text-gray-400">{formatTallyDate(txn.date)}</span>
                        {txn.voucherNumber && (
                          <span className="text-xs text-blue-600 font-medium">{txn.voucherNumber}</span>
                        )}
                      </div>
                      {txn.narration && (
                        <p className="text-xs text-gray-400 mt-1 truncate">{txn.narration}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      {txn.drAmount > 0
                        ? <p className="text-sm font-semibold text-blue-700">{fmt(txn.drAmount)} <span className="text-xs font-normal">Dr</span></p>
                        : <p className="text-sm font-semibold text-green-700">{fmt(txn.crAmount)} <span className="text-xs font-normal">Cr</span></p>
                      }
                      <p className="text-xs text-gray-500 mt-0.5">Bal: {fmt(txn.balance)}</p>
                    </div>
                  </div>
                </button>
              ))}
              {/* Closing balance */}
              <div className={`px-4 py-3 ${type === 'receivable' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-semibold ${accentText}`}>Net Outstanding</span>
                  <span className={`text-sm font-bold ${accentText}`}>{fmt(outstanding)}</span>
                </div>
              </div>
            </div>

            {/* Desktop: Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Date</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Voucher Type</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Voucher No</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Narration</th>
                    <th className="px-4 py-3 text-right text-blue-600 font-medium">{debitLabel}</th>
                    <th className="px-4 py-3 text-right text-green-600 font-medium">{creditLabel}</th>
                    <th className="px-4 py-3 text-right text-gray-500 font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {/* Opening balance row */}
                  <tr className="bg-yellow-50">
                    <td colSpan={6} className="px-4 py-2 text-xs text-yellow-700 font-medium">
                      Opening Balance
                    </td>
                    <td className="px-4 py-2 text-right text-xs font-bold text-yellow-700">
                      {fmt(party.openingBalance)}
                    </td>
                  </tr>

                  {txnsWithBalance.map((txn, i) => (
                    <tr
                      key={i}
                      onClick={() => openVoucher(txn)}
                      className="hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Click to view voucher details"
                    >
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {formatTallyDate(txn.date)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          txn.drAmount > 0 ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                        }`}>
                          {txn.voucherType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="text-blue-600 underline underline-offset-2 font-medium">
                          {txn.voucherNumber || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-[200px] truncate">
                        {txn.narration || '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-blue-700">
                        {txn.drAmount > 0 ? fmt(txn.drAmount) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-green-700">
                        {txn.crAmount > 0 ? fmt(txn.crAmount) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700">
                        {fmt(txn.balance)}
                      </td>
                    </tr>
                  ))}

                  {/* Closing balance row */}
                  <tr className={type === 'receivable' ? 'bg-emerald-50' : 'bg-red-50'}>
                    <td colSpan={6} className={`px-4 py-2 text-xs font-medium ${accentText}`}>
                      Closing Balance (Net Outstanding)
                    </td>
                    <td className={`px-4 py-2 text-right text-sm font-bold ${accentText}`}>
                      {fmt(outstanding)}
                    </td>
                  </tr>
                </tbody>

                <tfoot className="bg-gray-100 border-t-2 border-gray-300 text-xs font-semibold">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-gray-600">
                      Period Total - {transactions.length} entries
                    </td>
                    <td className="px-4 py-3 text-right text-blue-700 font-bold">{fmt(totalDr)}</td>
                    <td className="px-4 py-3 text-right text-green-700 font-bold">{fmt(totalCr)}</td>
                    <td className={`px-4 py-3 text-right font-bold text-base ${accentText}`}>
                      {fmt(outstanding)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Voucher detail modal */}
      {modalOpen && (
        <VoucherModal
          loading={modalLoading}
          voucher={modalVoucher}
          error={modalError}
          onClose={() => { setModalOpen(false); setModalVoucher(null); setModalError(null); }}
        />
      )}
    </div>
  );
};

export default PartyDetail;
