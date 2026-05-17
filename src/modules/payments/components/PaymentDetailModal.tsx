import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { PaymentVoucher } from '../../../services/api/payments/paymentsApiService';
import OutstandingApiService, { VoucherDetail } from '../../../services/api/outstanding/outstandingApiService';

interface PaymentDetailModalProps {
  isOpen: boolean;
  voucher: PaymentVoucher | null;
  companyName: string;
  onClose: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);

const fmtDate = (d: string): string => {
  if (d.length === 8) {
    return new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`)
      .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return d;
};

const outstandingApi = new OutstandingApiService();

const PaymentDetailModal: React.FC<PaymentDetailModalProps> = ({
  isOpen, voucher, companyName, onClose,
}) => {
  const [detail,  setDetail]  = useState<VoucherDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !voucher || !companyName) return;
    setDetail(null);
    setError(null);
    setLoading(true);

    // Convert DD/MM/YYYY → YYYYMMDD for API
    const [dd, mm, yyyy] = voucher.date.split('/');
    const dateStr = `${yyyy}${mm}${dd}`;

    outstandingApi
      .getVoucherDetail(companyName, voucher.voucherNumber, dateStr, voucher.voucherType)
      .then(d => {
        setDetail(d);
        if (!d) setError('Voucher details not found in Tally for this date.');
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to fetch voucher'))
      .finally(() => setLoading(false));
  }, [isOpen, voucher, companyName]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  if (!isOpen || !voucher) return null;

  const isIn          = voucher.direction === 'in';
  const gradFrom      = isIn ? '#047857' : '#be123c';
  const gradTo        = isIn ? '#065f46' : '#9f1239';
  const accentBg      = isIn ? '#d1fae5' : '#ffe4e6';
  const totalDr = (detail?.entries ?? []).reduce((s, e) => s + (e.isDr  ? e.amount : 0), 0);
  const totalCr = (detail?.entries ?? []).reduce((s, e) => s + (!e.isDr ? e.amount : 0), 0);
  const balanced = detail ? Math.abs(totalDr - totalCr) < 1 : false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* ── Colored Header ──────────────────────────────────────── */}
        <div
          className="relative px-5 sm:px-6 py-4 sm:py-5 text-white shrink-0"
          style={{ background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})` }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20">
                {isIn
                  ? <ArrowDownCircle className="w-5 h-5 text-white" />
                  : <ArrowUpCircle   className="w-5 h-5 text-white" />}
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black tracking-wide">
                  {isIn ? 'RECEIPT' : 'PAYMENT'} VOUCHER
                </h1>
                <p className="text-white/70 text-xs mt-0.5">{voucher.voucherType}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs uppercase tracking-widest">No.</p>
              <p className="text-base sm:text-xl font-black">{voucher.voucherNumber}</p>
              <p className="text-white/80 text-sm mt-0.5">{voucher.date}</p>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-xl bg-white/20 hover:bg-white/40 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* ── Party band ──────────────────────────────────────────── */}
        {voucher.partyName && voucher.partyName !== 'N/A' && (
          <div
            className="flex items-center justify-between px-5 sm:px-6 py-2.5 border-b border-gray-100 shrink-0"
            style={{ backgroundColor: accentBg }}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-0.5">
                {isIn ? 'Received From' : 'Paid To'}
              </p>
              <p className="text-base font-bold text-gray-900">{voucher.partyName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-0.5">Amount</p>
              <p className={`text-xl font-black ${isIn ? 'text-emerald-700' : 'text-red-700'}`}>
                {isIn ? '+' : '-'}{fmt(voucher.amount)}
              </p>
            </div>
          </div>
        )}

        {/* ── Scrollable body ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm text-gray-500">Fetching from Tally…</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 items-start">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Detail */}
          {!loading && !error && detail && (
            <div className="px-5 sm:px-6 py-5 space-y-5">

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-500 font-medium mb-1">Total Debit</p>
                  <p className="text-sm font-bold text-blue-700">{fmt(totalDr)}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                  <p className="text-xs text-emerald-600 font-medium mb-1">Total Credit</p>
                  <p className="text-sm font-bold text-emerald-700">{fmt(totalCr)}</p>
                </div>
                <div className={`rounded-xl p-3 text-center border ${balanced ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-200'}`}>
                  <p className={`text-xs font-medium mb-1 ${balanced ? 'text-green-600' : 'text-amber-600'}`}>Status</p>
                  <p className={`text-xs font-bold ${balanced ? 'text-green-700' : 'text-amber-700'}`}>
                    {balanced ? '✓ Balanced' : 'Diff: ' + fmt(Math.abs(totalDr - totalCr))}
                  </p>
                </div>
              </div>

              {/* Account table */}
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-2">Account Details</p>
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Account</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-blue-600 uppercase tracking-wide w-32">Debit</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-emerald-600 uppercase tracking-wide w-32">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {detail.entries.map((e, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 text-gray-700 font-medium">{e.ledgerName}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-blue-700">
                            {e.isDr ? fmt(e.amount) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">
                            {!e.isDr ? fmt(e.amount) : <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                      <tr>
                        <td className="px-4 py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wide">Total</td>
                        <td className="px-4 py-2.5 text-right font-bold text-blue-700 text-sm">{fmt(totalDr)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-emerald-700 text-sm">{fmt(totalCr)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Narration */}
              {(detail.narration || voucher.narration || voucher.reference) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-yellow-700 font-semibold uppercase tracking-wide mb-1">Narration / Reference</p>
                  {(detail.narration || voucher.narration) && (
                    <p className="text-sm text-gray-700">{detail.narration || voucher.narration}</p>
                  )}
                  {voucher.reference && (
                    <p className="text-xs text-gray-500 mt-1">Ref: {voucher.reference}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* No detail found but no error — show basic info from list */}
          {!loading && !error && !detail && (
            <div className="px-5 sm:px-6 py-5 space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
                Voucher details could not be fetched from Tally. Showing basic information.
              </div>
              {/* Show ledger entries from the list data if available */}
              {voucher.ledgerEntries.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-2">Known Accounts</p>
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Account</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-blue-600 w-32">Debit</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-emerald-600 w-32">Credit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {voucher.ledgerEntries.map((e, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-gray-700 font-medium">{e.ledgerName}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-blue-700">
                              {e.isDr ? fmt(e.amount) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">
                              {!e.isDr ? fmt(e.amount) : <span className="text-gray-300">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {voucher.narration && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-yellow-700 font-semibold uppercase tracking-wide mb-1">Narration</p>
                  <p className="text-sm text-gray-700">{voucher.narration}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-gray-100 flex justify-end shrink-0 bg-gray-50">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold rounded-xl text-white transition-colors"
            style={{ backgroundColor: gradFrom }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetailModal;
