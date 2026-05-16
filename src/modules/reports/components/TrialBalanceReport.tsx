import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { TrialBalanceData } from '../../../services/api/reports/reportsApiService';

interface Props {
  data: TrialBalanceData;
  formatCurrency: (n: number) => string;
}

const TrialBalanceReport: React.FC<Props> = ({ data, formatCurrency }) => {
  const [search, setSearch] = useState('');
  const { entries, totalDebit, totalCredit } = data;

  const filtered = search.trim()
    ? entries.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) ||
                          e.parent.toLowerCase().includes(search.toLowerCase()))
    : entries;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">Total Debit</p>
          <p className="text-xl font-bold text-gray-800 mt-1">{formatCurrency(totalDebit)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">Total Credit</p>
          <p className="text-xl font-bold text-gray-800 mt-1">{formatCurrency(totalCredit)}</p>
        </div>
      </div>

      {/* Diff indicator */}
      {Math.abs(totalDebit - totalCredit) > 0.5 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-800">
          Difference: <strong>{formatCurrency(Math.abs(totalDebit - totalCredit))}</strong> — may indicate pending entries in Tally.
        </div>
      )}

      {/* Search + table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search ledger or group…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder-gray-400"
          />
          <span className="text-xs text-gray-400">{filtered.length} ledgers</span>
        </div>

        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left w-1/2">Ledger</th>
                <th className="px-4 py-3 text-left text-gray-400">Group</th>
                <th className="px-4 py-3 text-right">Debit (Dr)</th>
                <th className="px-4 py-3 text-right">Credit (Cr)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                    {entries.length === 0 ? 'No ledger data returned from Tally' : 'No results for your search'}
                  </td>
                </tr>
              )}
              {filtered.map((entry, i) => (
                <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{entry.name}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{entry.parent}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm text-gray-700">
                    {entry.debit > 0 ? formatCurrency(entry.debit) : '–'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm text-gray-700">
                    {entry.credit > 0 ? formatCurrency(entry.credit) : '–'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 bg-gray-100 font-semibold text-gray-800 border-t-2 border-gray-300">
              <tr>
                <td className="px-4 py-3" colSpan={2}>Grand Total</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(totalDebit)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(totalCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TrialBalanceReport;
