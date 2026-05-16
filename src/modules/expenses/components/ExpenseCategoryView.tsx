import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, RefreshCw, Search } from 'lucide-react';
import { ExpenseLedger } from '../../../services/api/expenses/expensesApiService';

interface ExpenseCategoryViewProps {
  ledgers: ExpenseLedger[];
  loading: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.abs(n));

const ExpenseCategoryView: React.FC<ExpenseCategoryViewProps> = ({
  ledgers,
  loading,
}) => {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Group ledgers by parent
  const groups = useMemo(() => {
    const filtered = ledgers.filter(
      (l) =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.parent.toLowerCase().includes(search.toLowerCase())
    );

    const map: Record<
      string,
      { parent: string; total: number; ledgers: ExpenseLedger[] }
    > = {};

    filtered.forEach((l) => {
      const key = l.parent || 'Uncategorised';
      if (!map[key]) {
        map[key] = { parent: key, total: 0, ledgers: [] };
      }
      map[key].total += Math.abs(l.closingBalance);
      map[key].ledgers.push(l);
    });

    // Sort groups by total descending
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [ledgers, search]);

  const grandTotal = useMemo(
    () => groups.reduce((s, g) => s + g.total, 0),
    [groups]
  );

  const toggleGroup = (parent: string) => {
    setExpanded((prev) => ({ ...prev, [parent]: !prev[parent] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <RefreshCw className="h-5 w-5 animate-spin text-orange-500" />
        <span className="text-gray-500 text-sm">Loading expense categories...</span>
      </div>
    );
  }

  if (ledgers.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-base font-medium">No expense ledgers found</p>
        <p className="text-sm mt-1">
          Make sure Tally has ledgers under "Direct Expenses" or "Indirect
          Expenses" groups
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search expense heads or categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      {/* Grand total bar */}
      <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-5 py-3">
        <span className="text-sm font-semibold text-gray-700">
          Grand Total — {groups.length} categories, {ledgers.length} expense heads
        </span>
        <span className="text-lg font-bold text-orange-700">{fmt(grandTotal)}</span>
      </div>

      {/* Category accordion */}
      <div className="space-y-2">
        {groups.map((group) => {
          const isOpen = expanded[group.parent] ?? true; // default open
          const pct = grandTotal > 0 ? (group.total / grandTotal) * 100 : 0;

          return (
            <div
              key={group.parent}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.parent)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                  )}
                  <span className="font-semibold text-gray-700 text-sm">
                    {group.parent}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {group.ledgers.length} head{group.ledgers.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {/* Mini bar */}
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-1.5 bg-orange-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{pct.toFixed(1)}%</span>
                  </div>
                  <span className="font-bold text-orange-700 text-sm">
                    {fmt(group.total)}
                  </span>
                </div>
              </button>

              {/* Ledger rows */}
              {isOpen && (
                <div className="divide-y divide-gray-50">
                  {group.ledgers
                    .sort(
                      (a, b) =>
                        Math.abs(b.closingBalance) - Math.abs(a.closingBalance)
                    )
                    .map((l) => {
                      const ledgerPct =
                        group.total > 0
                          ? (Math.abs(l.closingBalance) / group.total) * 100
                          : 0;
                      return (
                        <div
                          key={l.name}
                          className="flex items-center justify-between px-5 py-2.5 hover:bg-orange-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-1.5 h-1.5 bg-orange-300 rounded-full shrink-0" />
                            <span
                              className="text-sm text-gray-700 truncate"
                              title={l.name}
                            >
                              {l.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="hidden sm:flex items-center gap-2">
                              <div className="w-20 h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-1 bg-orange-300 rounded-full"
                                  style={{ width: `${ledgerPct}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-400 w-10 text-right">
                                {ledgerPct.toFixed(0)}%
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-800">
                                {fmt(l.closingBalance)}
                              </p>
                              {l.openingBalance !== 0 && (
                                <p className="text-xs text-gray-400">
                                  Opening: {fmt(l.openingBalance)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  {/* Group subtotal */}
                  <div className="flex justify-between px-5 py-2 bg-gray-50 border-t border-gray-200">
                    <span className="text-xs font-medium text-gray-500">
                      {group.parent} — Subtotal
                    </span>
                    <span className="text-xs font-bold text-orange-700">
                      {fmt(group.total)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExpenseCategoryView;
