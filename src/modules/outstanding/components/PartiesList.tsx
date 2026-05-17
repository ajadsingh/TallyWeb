import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { PartyOutstanding } from '../../../services/api/outstanding/outstandingApiService';

interface PartiesListProps {
  parties: PartyOutstanding[];
  type: 'receivable' | 'payable';
  onPartyClick: (party: PartyOutstanding) => void;
}

type SortKey = 'name' | 'outstanding' | 'opening';
type SortDir = 'asc' | 'desc';

const PartiesList: React.FC<PartiesListProps> = ({
  parties,
  type,
  onPartyClick,
}) => {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('outstanding');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Math.abs(n));

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filtered = useMemo(() => {
    let result = parties.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.parent.toLowerCase().includes(search.toLowerCase())
    );
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'outstanding')
        cmp = Math.abs(a.closingBalance) - Math.abs(b.closingBalance);
      else if (sortKey === 'opening')
        cmp = Math.abs(a.openingBalance) - Math.abs(b.openingBalance);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [parties, search, sortKey, sortDir]);

  const totalOutstanding = filtered.reduce(
    (s, p) => s + Math.abs(p.closingBalance),
    0
  );

  const SortBtn: React.FC<{ k: SortKey; label: string }> = ({ k, label }) => (
    <button
      onClick={() => handleSort(k)}
      className="flex items-center gap-1 group"
    >
      <span>{label}</span>
      <ArrowUpDown
        className={`h-3.5 w-3.5 ${
          sortKey === k ? 'text-blue-500' : 'text-gray-300 group-hover:text-gray-400'
        }`}
      />
    </button>
  );

  if (parties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
        <AlertTriangle className="h-10 w-10 text-gray-300" />
        <p className="text-base font-medium">No parties found</p>
        <p className="text-sm">
          No{' '}
          {type === 'receivable'
            ? 'Sundry Debtors (customers)'
            : 'Sundry Creditors (vendors)'}{' '}
          found in Tally
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full overflow-x-hidden">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder={`Search ${
            type === 'receivable' ? 'customers' : 'vendors'
          }...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Mobile: Card list */}
      <div className="sm:hidden divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
        {filtered.map((party) => {
          const outstanding = Math.abs(party.closingBalance);
          return (
            <button
              key={party.name}
              onClick={() => onPartyClick(party)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-blue-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate text-sm leading-tight">{party.name}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{party.parent || '—'}</p>
              </div>
              <div className="shrink-0 text-right">
                {outstanding > 0 ? (
                  <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                    type === 'receivable' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {fmt(outstanding)}
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs">Nil</span>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
            </button>
          );
        })}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <span className="text-xs font-semibold text-gray-600">Total — {filtered.length} parties</span>
          <span className={`text-sm font-bold ${type === 'receivable' ? 'text-emerald-700' : 'text-red-700'}`}>
            {fmt(totalOutstanding)}
          </span>
        </div>
      </div>

      {/* Desktop: Table */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                <SortBtn k="name" label="Party Name" />
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Group
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">
                <SortBtn k="opening" label="Opening" />
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">
                <SortBtn k="outstanding" label="Outstanding" />
              </th>
              <th className="px-4 py-3 w-8"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {filtered.map((party) => {
              const outstanding = Math.abs(party.closingBalance);
              const isHigh = outstanding > 0;
              return (
                <tr
                  key={party.name}
                  onClick={() => onPartyClick(party)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {party.name}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {party.parent || '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {fmt(party.openingBalance)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {outstanding > 0 ? (
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                          type === 'receivable'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {fmt(outstanding)}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Nil</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    <ChevronRight className="h-4 w-4" />
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Totals footer */}
          <tfoot className="bg-gray-100 border-t-2 border-gray-300 text-xs font-semibold">
            <tr>
              <td colSpan={3} className="px-4 py-3 text-gray-700">
                Total — {filtered.length} parties
              </td>
              <td
                className={`px-4 py-3 text-right font-bold text-base ${
                  type === 'receivable' ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {fmt(totalOutstanding)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default PartiesList;
