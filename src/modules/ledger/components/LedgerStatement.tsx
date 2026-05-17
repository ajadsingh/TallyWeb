import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import LedgerApiService, {
  TallyLedger,
  LedgerTransaction,
} from '../../../services/api/ledger/ledgerApiService';
import OutstandingApiService, {
  VoucherDetail,
} from '../../../services/api/outstanding/outstandingApiService';
import VoucherModal from '../../outstanding/components/VoucherModal';

interface LedgerStatementProps {
  ledger: TallyLedger;
  companyName: string;
  globalFrom: string;
  globalTo: string;
  onBack: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

  if (key === 'currentFY') return { from: `${fyStart}-04-01`,      to: `${fyStart + 1}-03-31`   };
  if (key === 'prevFY')    return { from: `${prevFyStart}-04-01`,   to: `${fyStart}-03-31`       };
  if (key === 'Q1')        return { from: `${fyStart}-04-01`,       to: `${fyStart}-06-30`       };
  if (key === 'Q2')        return { from: `${fyStart}-07-01`,       to: `${fyStart}-09-30`       };
  if (key === 'Q3')        return { from: `${fyStart}-10-01`,       to: `${fyStart}-12-31`       };
  if (key === 'Q4')        return { from: `${fyStart + 1}-01-01`,   to: `${fyStart + 1}-03-31`   };
  if (key === 'thisMonth') return { from: `${y}-${pad(m + 1)}-01`,  to: fmtD(new Date(y, m + 1, 0)) };
  if (key === 'last3m')    return { from: fmtD(new Date(y, m - 2, 1)), to: fmtD(new Date(y, m + 1, 0)) };
  if (key === 'last6m')    return { from: fmtD(new Date(y, m - 5, 1)), to: fmtD(new Date(y, m + 1, 0)) };
  // allTime / default
  return { from: `${prevFyStart}-04-01`, to: `${fyStart + 1}-03-31` };
};

const PRESETS = [
  { key: 'currentFY',  label: 'This FY'    },
  { key: 'prevFY',     label: 'Last FY'    },
  { key: 'Q1',         label: 'Q1'         },
  { key: 'Q2',         label: 'Q2'         },
  { key: 'Q3',         label: 'Q3'         },
  { key: 'Q4',         label: 'Q4'         },
  { key: 'thisMonth',  label: 'This Month' },
  { key: 'last3m',     label: 'Last 3 Mo'  },
  { key: 'last6m',     label: 'Last 6 Mo'  },
  { key: 'allTime',    label: 'All Time'   },
] as const;

// Module-level singletons — stable refs without useRef overhead
const ledgerApi      = new LedgerApiService();
const outstandingApi = new OutstandingApiService();

// ── Component ─────────────────────────────────────────────────────────────────

const LedgerStatement: React.FC<LedgerStatementProps> = ({
  ledger, companyName, globalFrom, globalTo, onBack,
}) => {
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  // Determine initial preset: if global range matches currentFY, highlight it; else 'custom'
  const [activePreset, setActivePreset] = useState<string>(() => {
    const fy = quickRange('currentFY');
    if (!globalFrom && !globalTo) return 'currentFY';
    if (globalFrom === fy.from && globalTo === fy.to) return 'currentFY';
    return 'custom';
  });

  const [fromDate, setFromDate] = useState(globalFrom || quickRange('currentFY').from);
  const [toDate,   setToDate]   = useState(globalTo   || quickRange('currentFY').to);

  // Voucher detail modal state
  const [modalOpen,    setModalOpen]    = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError,   setModalError]   = useState<string | null>(null);
  const [modalVoucher, setModalVoucher] = useState<VoucherDetail | null>(null);

  const openVoucher = async (txn: LedgerTransaction) => {
    if (!txn.voucherNumber) return;
    setModalOpen(true);
    setModalLoading(true);
    setModalError(null);
    setModalVoucher(null);
    try {
      const detail = await outstandingApi.getVoucherDetail(companyName, txn.voucherNumber, txn.date, txn.voucherType);
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
      const txns = await ledgerApi.getLedgerTransactions(
        companyName,
        ledger.name,
        from.replace(/-/g, ''),
        to.replace(/-/g, ''),
      );
      setTransactions(txns);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [companyName, ledger.name]);

  useEffect(() => {
    fetchTransactions(fromDate, toDate);
  }, [ledger.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyPreset = (key: string) => {
    const r = quickRange(key);
    setActivePreset(key);
    setFromDate(r.from);
    setToDate(r.to);
    fetchTransactions(r.from, r.to);
  };

  // Running balance
  let runningBalance = ledger.openingBalance;
  const txnsWithBalance = transactions.map(t => {
    // Dr increases Dr balance (negative in Tally), Cr increases Cr balance (positive)
    // We just track in natural direction: Dr subtracts, Cr adds
    runningBalance += t.crAmount - t.drAmount;
    return { ...t, balance: runningBalance };
  });

  const totalDr = transactions.reduce((s, t) => s + t.drAmount, 0);
  const totalCr = transactions.reduce((s, t) => s + t.crAmount, 0);
  const closingBal = ledger.closingBalance;

  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to ledger list"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-800">{ledger.name}</h1>
            </div>
            {ledger.parent && (
              <p className="text-xs text-gray-400 mt-0.5">
                <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                  {ledger.parent}
                </span>
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Closing Balance</p>
          <p className={`text-2xl font-bold ${closingBal < 0 ? 'text-blue-700' : closingBal > 0 ? 'text-emerald-700' : 'text-gray-500'}`}>
            {closingBal !== 0 ? `${fmt(closingBal)} ${closingBal < 0 ? 'Dr' : 'Cr'}` : '₹0'}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">Opening Balance</p>
          <p className="text-sm font-bold text-gray-700">
            {ledger.openingBalance !== 0
              ? `${fmt(ledger.openingBalance)} ${ledger.openingBalance < 0 ? 'Dr' : 'Cr'}`
              : '₹0'}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
          <p className="text-xs text-blue-500 mb-1">Total Debit</p>
          <p className="text-sm font-bold text-blue-700">{fmt(totalDr)}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
          <p className="text-xs text-emerald-600 mb-1">Total Credit</p>
          <p className="text-sm font-bold text-emerald-700">{fmt(totalCr)}</p>
        </div>
        <div className={`border rounded-xl p-3 ${
          closingBal < 0
            ? 'bg-blue-50 border-blue-200'
            : closingBal > 0
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <p className={`text-xs mb-1 ${closingBal < 0 ? 'text-blue-600' : closingBal > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
            Closing Balance
          </p>
          <p className={`text-sm font-bold ${closingBal < 0 ? 'text-blue-700' : closingBal > 0 ? 'text-emerald-700' : 'text-gray-500'}`}>
            {closingBal !== 0 ? `${fmt(closingBal)} ${closingBal < 0 ? 'Dr' : 'Cr'}` : '₹0'}
          </p>
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
            <h2 className="font-semibold text-gray-700">Ledger Statement</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {loading
                ? 'Loading...'
                : `${transactions.length} entries · ${fromDate} to ${toDate}`}
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Voucher Type</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Voucher No</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Narration</th>
                  <th className="px-4 py-3 text-right text-blue-600 font-medium">Debit</th>
                  <th className="px-4 py-3 text-right text-emerald-600 font-medium">Credit</th>
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
                    {ledger.openingBalance !== 0
                      ? `${fmt(ledger.openingBalance)} ${ledger.openingBalance < 0 ? 'Dr' : 'Cr'}`
                      : '₹0'}
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
                        txn.drAmount > 0 ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
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
                    <td className="px-4 py-3 text-right font-medium text-emerald-700">
                      {txn.crAmount > 0 ? fmt(txn.crAmount) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-semibold">
                      <span className={txn.balance < 0 ? 'text-blue-700' : txn.balance > 0 ? 'text-emerald-700' : 'text-gray-400'}>
                        {txn.balance !== 0
                          ? `${fmt(txn.balance)} ${txn.balance < 0 ? 'Dr' : 'Cr'}`
                          : '₹0'}
                      </span>
                    </td>
                  </tr>
                ))}

                {/* Closing balance row */}
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={4} className="px-4 py-2 text-xs text-gray-600">
                    Closing Balance
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-blue-700">
                    {totalDr > 0 ? fmt(totalDr) : '-'}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-emerald-700">
                    {totalCr > 0 ? fmt(totalCr) : '-'}
                  </td>
                  <td className="px-4 py-2 text-right text-xs font-bold">
                    <span className={closingBal < 0 ? 'text-blue-700' : closingBal > 0 ? 'text-emerald-700' : 'text-gray-400'}>
                      {closingBal !== 0
                        ? `${fmt(closingBal)} ${closingBal < 0 ? 'Dr' : 'Cr'}`
                        : '₹0'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Voucher Modal */}
      {modalOpen && (
        <VoucherModal
          loading={modalLoading}
          error={modalError}
          voucher={modalVoucher}
          onClose={() => {
            setModalOpen(false);
            setModalVoucher(null);
            setModalError(null);
          }}
        />
      )}
    </div>
  );
};

export default LedgerStatement;
