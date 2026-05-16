import React, { useMemo, useState } from 'react';
import { Search, RefreshCw, ArrowUpDown } from 'lucide-react';
import {
  ExpenseVoucher,
} from '../../../services/api/expenses/expensesApiService';

interface ExpenseTransactionsProps {
  vouchers: ExpenseVoucher[];
  loading: boolean;
  currentRangeLabel: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

type SortKey = 'date' | 'amount' | 'voucherType' | 'partyName';
type SortDir = 'asc' | 'desc';

const ExpenseTransactions: React.FC<ExpenseTransactionsProps> = ({
  vouchers,
  loading,
  currentRangeLabel,
}) => {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterType, setFilterType] = useState('all');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  // Unique voucher types for filter dropdown
  const voucherTypes = useMemo(() => {
    const types = new Set(vouchers.map((v) => v.voucherType));
    return ['all', ...Array.from(types).sort()];
  }, [vouchers]);

  const filtered = useMemo(() => {
    let result = vouchers.filter((v) => {
      const matchSearch =
        v.partyName.toLowerCase().includes(search.toLowerCase()) ||
        v.voucherNumber.toLowerCase().includes(search.toLowerCase()) ||
        v.narration.toLowerCase().includes(search.toLowerCase()) ||
        v.voucherType.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === 'all' || v.voucherType === filterType;
      return matchSearch && matchType;
    });

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') {
        const parse = (s: string) => {
          const [d, m, y] = s.split('/');
          return new Date(+y, +m - 1, +d).getTime();
        };
        cmp = parse(a.date) - parse(b.date);
      } else if (sortKey === 'amount') {
        cmp = a.amount - b.amount;
      } else if (sortKey === 'voucherType') {
        cmp = a.voucherType.localeCompare(b.voucherType);
      } else if (sortKey === 'partyName') {
        cmp = a.partyName.localeCompare(b.partyName);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [vouchers, search, filterType, sortKey, sortDir]);

  const totalAmount = useMemo(
    () => filtered.reduce((s, v) => s + v.amount, 0),
    [filtered]
  );

  const SortBtn: React.FC<{ k: SortKey; label: string }> = ({ k, label }) => (
    <button
      onClick={() => handleSort(k)}
      className="flex items-center gap-1 group"
    >
      {label}
      <ArrowUpDown
        className={`h-3.5 w-3.5 ${
          sortKey === k
            ? 'text-orange-500'
            : 'text-gray-300 group-hover:text-gray-400'
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search party, voucher no, narration..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
        >
          {voucherTypes.map((t) => (
            <option key={t} value={t}>
              {t === 'all' ? 'All Voucher Types' : t}
            </option>
          ))}
        </select>
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-5 py-3">
        <span className="text-sm text-gray-600">
          {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
        </span>
        <span className="text-base font-bold text-orange-700">{fmt(totalAmount)}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <RefreshCw className="h-5 w-5 animate-spin text-orange-500" />
          <span className="text-gray-500 text-sm">Loading transactions...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <p className="text-base font-medium">No transactions found</p>
          <p className="text-sm mt-1">Try changing the date range or filter</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  <SortBtn k="date" label="Date" />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  <SortBtn k="voucherType" label="Type" />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Voucher No
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  <SortBtn k="partyName" label="Party / Ledger" />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Narration
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">
                  <SortBtn k="amount" label="Amount" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((v, i) => (
                <tr key={`${v.guid || i}`} className="hover:bg-orange-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {v.date}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        v.voucherType.toLowerCase().includes('payment')
                          ? 'bg-red-50 text-red-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {v.voucherType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {v.voucherNumber || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">
                    {v.partyName || '—'}
                  </td>
                  <td
                    className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate"
                    title={v.narration}
                  >
                    {v.narration || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-orange-700">
                    {fmt(v.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-gray-700">
                  Total — {filtered.length} entries
                </td>
                <td className="px-4 py-3 text-right font-bold text-base text-orange-700">
                  {fmt(totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default ExpenseTransactions;
