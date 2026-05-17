import React, { useEffect, useRef } from 'react';
import {
  X, FileText, CreditCard, TrendingUp, TrendingDown,
  ArrowLeftRight, Loader2, CheckCircle, AlertCircle, Package,
} from 'lucide-react';
import {
  VoucherDetail, VoucherLedgerEntry,
} from '../../../services/api/outstanding/outstandingApiService';

interface VoucherModalProps {
  loading: boolean;
  voucher: VoucherDetail | null;
  error: string | null;
  onClose: () => void;
}

type VoucherCategory =
  | 'sales' | 'purchase' | 'receipt' | 'payment'
  | 'journal' | 'contra' | 'debitnote' | 'creditnote';

function getCategory(type: string): VoucherCategory {
  const t = type.toLowerCase();
  if (t.includes('debit note'))  return 'debitnote';
  if (t.includes('credit note')) return 'creditnote';
  if (t.includes('sales'))       return 'sales';
  if (t.includes('purchase'))    return 'purchase';
  if (t.includes('receipt'))     return 'receipt';
  if (t.includes('payment'))     return 'payment';
  if (t.includes('contra'))      return 'contra';
  return 'journal';
}

const CATEGORY_META: Record<VoucherCategory, {
  title: string;
  gradientFrom: string;
  gradientTo: string;
  accent: string;
  Icon: React.FC<{ className?: string }>;
}> = {
  sales:      { title: 'TAX INVOICE',       gradientFrom: '#047857', gradientTo: '#065f46', accent: '#d1fae5', Icon: TrendingUp },
  purchase:   { title: 'PURCHASE BILL',      gradientFrom: '#c2410c', gradientTo: '#9a3412', accent: '#fed7aa', Icon: TrendingDown },
  receipt:    { title: 'RECEIPT VOUCHER',    gradientFrom: '#1d4ed8', gradientTo: '#1e3a8a', accent: '#dbeafe', Icon: CreditCard },
  payment:    { title: 'PAYMENT VOUCHER',    gradientFrom: '#be123c', gradientTo: '#9f1239', accent: '#ffe4e6', Icon: CreditCard },
  journal:    { title: 'JOURNAL ENTRY',      gradientFrom: '#7c3aed', gradientTo: '#5b21b6', accent: '#ede9fe', Icon: FileText },
  contra:     { title: 'CONTRA ENTRY',       gradientFrom: '#4338ca', gradientTo: '#3730a3', accent: '#e0e7ff', Icon: ArrowLeftRight },
  debitnote:  { title: 'DEBIT NOTE',         gradientFrom: '#b45309', gradientTo: '#92400e', accent: '#fef3c7', Icon: TrendingDown },
  creditnote: { title: 'CREDIT NOTE',        gradientFrom: '#0f766e', gradientTo: '#115e59', accent: '#ccfbf1', Icon: TrendingUp },
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 2,
  }).format(n);

const fmtDate = (d: string): string => {
  if (d.length === 8) {
    return new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`)
      .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return d;
};

// ----------------------------------------------------------------------------
// Shared: Dr/Cr ledger table with balance check
// ----------------------------------------------------------------------------
function LedgerTable({ entries }: { entries: VoucherLedgerEntry[] }) {
  const totalDr = entries.reduce((s, e) => s + (e.isDr  ? e.amount : 0), 0);
  const totalCr = entries.reduce((s, e) => s + (!e.isDr ? e.amount : 0), 0);
  const balanced = Math.abs(totalDr - totalCr) < 1;

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Account
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-blue-600 uppercase tracking-wide w-36">
              Debit
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-green-600 uppercase tracking-wide w-36">
              Credit
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {entries.map((e, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-2.5 text-gray-700 font-medium">{e.ledgerName}</td>
              <td className="px-4 py-2.5 text-right font-semibold text-blue-700">
                {e.isDr ? fmt(e.amount) : <span className="text-gray-300">-</span>}
              </td>
              <td className="px-4 py-2.5 text-right font-semibold text-green-700">
                {!e.isDr ? fmt(e.amount) : <span className="text-gray-300">-</span>}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-gray-300 bg-gray-100">
          <tr>
            <td className="px-4 py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wide">Total</td>
            <td className="px-4 py-2.5 text-right font-bold text-blue-700">{fmt(totalDr)}</td>
            <td className="px-4 py-2.5 text-right font-bold text-green-700">{fmt(totalCr)}</td>
          </tr>
        </tfoot>
      </table>
      <div
        className={`px-4 py-2 text-xs font-medium flex items-center gap-1.5 ${
          balanced ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'
        }`}
      >
        {balanced
          ? <><CheckCircle className="w-3.5 h-3.5" /> Voucher is balanced</>
          : <><AlertCircle className="w-3.5 h-3.5" /> Difference: {fmt(Math.abs(totalDr - totalCr))}</>}
      </div>
    </div>
  );
}

// Narration box
function NarrationBox({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
      <p className="text-xs text-yellow-700 font-semibold uppercase tracking-wide mb-1">Narration</p>
      <p className="text-sm text-gray-700">{text}</p>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Document: Sales / Purchase / Debit Note / Credit Note  (invoice-style)
// ----------------------------------------------------------------------------
function InvoiceDocument({ v, cat }: { v: VoucherDetail; cat: VoucherCategory }) {
  const meta      = CATEGORY_META[cat];
  const hasItems  = v.inventoryEntries.length > 0;

  // Calc total (max of Dr-side or Cr-side — whichever represents the invoice value)
  const totalDr = v.entries.reduce((s, e) => s + (e.isDr  ? e.amount : 0), 0);
  const totalCr = v.entries.reduce((s, e) => s + (!e.isDr ? e.amount : 0), 0);
  const invoiceTotal = Math.max(totalDr, totalCr);

  const billLabel = cat === 'purchase' || cat === 'debitnote' ? 'Bill From' : 'Bill To';

  return (
    <div>
      {/* Colored document header */}
      <div
        className="px-6 py-5 text-white"
        style={{ background: `linear-gradient(135deg, ${meta.gradientFrom}, ${meta.gradientTo})` }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20">
              <meta.Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-widest">{meta.title}</h1>
              <p className="text-white/70 text-xs mt-0.5">{v.voucherType}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-xs uppercase tracking-widest">No.</p>
            <p className="text-xl font-black">{v.voucherNumber}</p>
            <p className="text-white/80 text-sm mt-0.5">{fmtDate(v.date)}</p>
          </div>
        </div>
      </div>

      {/* Bill To band */}
      {v.partyName && (
        <div
          className="flex items-center justify-between px-6 py-3 border-b border-gray-200"
          style={{ backgroundColor: meta.accent }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-0.5">{billLabel}</p>
            <p className="text-base font-bold text-gray-900">{v.partyName}</p>
          </div>
        </div>
      )}

      <div className="px-6 py-5 space-y-5">

        {/* Items table */}
        {hasItems && (
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> Items
            </p>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 w-8">#</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Item Name</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Rate</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {v.inventoryEntries.map((item, i) => (
                    <tr key={i} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-3 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-3 py-2.5 text-gray-800 font-semibold">{item.itemName}</td>
                      <td className="px-3 py-2.5 text-right text-gray-600">{item.qty || '-'}</td>
                      <td className="px-3 py-2.5 text-right text-gray-600">{item.rate || '-'}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-gray-800">{fmt(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Charges / Taxes section */}
        <div>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-2">
            {hasItems ? 'Charges & Taxes' : 'Account Details'}
          </p>

          {hasItems ? (
            /* Condensed right-aligned list: exclude the party ledger entry */
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {v.entries
                    .filter(e => e.ledgerName.toLowerCase() !== v.partyName.toLowerCase())
                    .map((e, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-600">{e.ledgerName}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{fmt(e.amount)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <LedgerTable entries={v.entries} />
          )}
        </div>

        {/* Grand Total bar */}
        {hasItems && (
          <div className="flex justify-end">
            <div
              className="rounded-xl px-6 py-3 flex items-center gap-10 text-white"
              style={{ background: `linear-gradient(135deg, ${meta.gradientFrom}, ${meta.gradientTo})` }}
            >
              <span className="text-xs font-bold uppercase tracking-widest opacity-80">Total Amount</span>
              <span className="text-2xl font-black">{fmt(invoiceTotal)}</span>
            </div>
          </div>
        )}

        <NarrationBox text={v.narration} />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Document: Payment / Receipt
// ----------------------------------------------------------------------------
function PaymentReceiptDocument({ v, cat }: { v: VoucherDetail; cat: VoucherCategory }) {
  const meta = CATEGORY_META[cat];

  const totalDr = v.entries.reduce((s, e) => s + (e.isDr  ? e.amount : 0), 0);
  const totalCr = v.entries.reduce((s, e) => s + (!e.isDr ? e.amount : 0), 0);
  const amount  = Math.max(totalDr, totalCr);
  const directionLabel = cat === 'payment' ? 'Paid To' : 'Received From';

  return (
    <div>
      {/* Header */}
      <div
        className="px-6 py-5 text-white"
        style={{ background: `linear-gradient(135deg, ${meta.gradientFrom}, ${meta.gradientTo})` }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20">
              <meta.Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-widest">{meta.title}</h1>
              {v.partyName && (
                <p className="text-white/80 text-sm mt-0.5">
                  {directionLabel}: <span className="font-bold">{v.partyName}</span>
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-xs uppercase tracking-widest">No.</p>
            <p className="text-xl font-black">{v.voucherNumber}</p>
            <p className="text-white/80 text-sm mt-0.5">{fmtDate(v.date)}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">

        {/* Big amount highlight */}
        <div
          className="rounded-xl px-5 py-4 flex items-center justify-between text-white"
          style={{ background: `linear-gradient(135deg, ${meta.gradientFrom}cc, ${meta.gradientTo}cc)` }}
        >
          <span className="text-sm font-bold uppercase tracking-widest opacity-80">Amount</span>
          <span className="text-3xl font-black">{fmt(amount)}</span>
        </div>

        {/* Account details */}
        <div>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-2">
            Account Details
          </p>
          <LedgerTable entries={v.entries} />
        </div>

        <NarrationBox text={v.narration} />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Document: Journal / Contra
// ----------------------------------------------------------------------------
function JournalDocument({ v, cat }: { v: VoucherDetail; cat: VoucherCategory }) {
  const meta = CATEGORY_META[cat];

  return (
    <div>
      <div
        className="px-6 py-5 text-white"
        style={{ background: `linear-gradient(135deg, ${meta.gradientFrom}, ${meta.gradientTo})` }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20">
              <meta.Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-widest">{meta.title}</h1>
              <p className="text-white/70 text-xs mt-0.5">{v.voucherType}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-xs uppercase tracking-widest">No.</p>
            <p className="text-xl font-black">{v.voucherNumber}</p>
            <p className="text-white/80 text-sm mt-0.5">{fmtDate(v.date)}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        <LedgerTable entries={v.entries} />
        <NarrationBox text={v.narration} />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Main Modal
// ----------------------------------------------------------------------------
const VoucherModal: React.FC<VoucherModalProps> = ({ loading, voucher, error, onClose }) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const renderDocument = (v: VoucherDetail) => {
    const cat = getCategory(v.voucherType);
    if (cat === 'sales' || cat === 'purchase' || cat === 'debitnote' || cat === 'creditnote') {
      return <InvoiceDocument v={v} cat={cat} />;
    }
    if (cat === 'payment' || cat === 'receipt') {
      return <PaymentReceiptDocument v={v} cat={cat} />;
    }
    return <JournalDocument v={v} cat={cat} />;
  };

  const catColor = voucher
    ? CATEGORY_META[getCategory(voucher.voucherType)].gradientFrom
    : '#2563eb';

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Plain header only for loading / error states */}
        {(loading || error || !voucher) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-gray-800">Voucher Details</span>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm text-gray-500">Fetching voucher from Tally...</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {error}
              </div>
            </div>
          )}

          {/* Document */}
          {!loading && !error && voucher && (
            <div className="relative">
              {renderDocument(voucher)}
              {/* X button floating over the colored header */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/20 hover:bg-white/40 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 border-t border-gray-100 flex justify-end flex-shrink-0"
        >
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold rounded-xl border transition-colors text-white"
            style={{ backgroundColor: catColor, borderColor: catColor }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoucherModal;
