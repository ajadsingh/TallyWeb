import React, { useState, useMemo } from 'react';
import { RefreshCw, Search, ChevronUp, ChevronDown, BookOpen } from 'lucide-react';
import { TallyLedger } from '../../../services/api/ledger/ledgerApiService';

interface LedgerListProps {
  ledgers: TallyLedger[];
  loading: boolean;
  onSelect: (ledger: TallyLedger) => void;
  onRefresh: () => void;
}

type SortKey = 'name' | 'parent' | 'opening' | 'closing';
type SortDir = 'asc' | 'desc';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.abs(n));

const BalanceCell: React.FC<{ amount: number }> = ({ amount }) => {
  if (amount === 0) {
    return <span className="text-gray-400">{'-'}</span>;
  }
  const isDr = amount < 0;
  return (
    <span className={isDr ? 'text-blue-700 font-semibold' : 'text-emerald-700 font-semibold'}>
      {fmt(amount)}{' '}
      <span className={`text-xs font-normal rounded px-1 py-0.5 ${
        isDr ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-600'
      }`}>
        {isDr ? 'Dr' : 'Cr'}
      </span>
    </span>
  );
};

const SortIcon: React.FC<{ col: SortKey; active: SortKey; dir: SortDir }> = ({ col, active, dir }) => {
  if (col !== active) return <ChevronUp className="w-3 h-3 text-gray-300" />;
  return dir === 'asc'
    ? <ChevronUp   className="w-3 h-3 text-blue-500" />
    : <ChevronDown className="w-3 h-3 text-blue-500" />;
};

const LedgerList: React.FC<LedgerListProps> = ({ ledgers, loading, onSelect, onRefresh }) => {
  const [search,  setSearch]  = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [parentFilter, setParentFilter] = useState('');

  const parents = useMemo(
    () => ['', ...new Set(ledgers.map(l => l.parent).filter(Boolean))].sort(),
    [ledgers]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ledgers
      .filter(l => {
        const matchSearch = !q || l.name.toLowerCase().includes(q) || l.parent.toLowerCase().includes(q);
        const matchParent = !parentFilter || l.parent === parentFilter;
        return matchSearch && matchParent;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'name')    cmp = a.name.localeCompare(b.name);
        if (sortKey === 'parent')  cmp = a.parent.localeCompare(b.parent);
        if (sortKey === 'opening') cmp = Math.abs(a.openingBalance) - Math.abs(b.openingBalance);
        if (sortKey === 'closing') cmp = Math.abs(a.closingBalance) - Math.abs(b.closingBalance);
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [ledgers, search, parentFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const thClass = (key: SortKey) =>
    `px-4 py-3 text-left text-xs uppercase tracking-wide font-medium select-none cursor-pointer whitespace-nowrap transition-colors ${
      sortKey === key ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
    }`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search ledger or group..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Group filter */}
        <select
          value={parentFilter}
          onChange={e => setParentFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Groups</option>
          {parents.filter(Boolean).map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <p className="text-xs text-gray-400 ml-auto">
          {filtered.length} / {ledgers.length} ledgers
        </p>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
          <span className="text-gray-500 text-sm">Loading ledgers from Tally...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-base font-medium">No ledgers found</p>
          <p className="text-sm mt-1">Try adjusting your search or group filter</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={thClass('name')}   onClick={() => handleSort('name')}>
                  <span className="flex items-center gap-1">Ledger Name <SortIcon col="name" active={sortKey} dir={sortDir} /></span>
                </th>
                <th className={thClass('parent')} onClick={() => handleSort('parent')}>
                  <span className="flex items-center gap-1">Group <SortIcon col="parent" active={sortKey} dir={sortDir} /></span>
                </th>
                <th className={thClass('opening')} onClick={() => handleSort('opening')}>
                  <span className="flex items-center gap-1 justify-end w-full">Opening Bal <SortIcon col="opening" active={sortKey} dir={sortDir} /></span>
                </th>
                <th className={thClass('closing')} onClick={() => handleSort('closing')}>
                  <span className="flex items-center gap-1 justify-end w-full">Closing Bal <SortIcon col="closing" active={sortKey} dir={sortDir} /></span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((ledger, i) => (
                <tr
                  key={i}
                  onClick={() => onSelect(ledger)}
                  className="hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-800">{ledger.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    {ledger.parent ? (
                      <span className="inline-block bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                        {ledger.parent}
                      </span>
                    ) : (
                      <span className="text-gray-300">{'-'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <BalanceCell amount={ledger.openingBalance} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <BalanceCell amount={ledger.closingBalance} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LedgerList;
