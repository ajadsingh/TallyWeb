import React, { useMemo } from 'react';
import { TrendingDown, Receipt, Tag } from 'lucide-react';
import { ExpenseLedger, ExpenseVoucher } from '../../../services/api/expenses/expensesApiService';

interface ExpenseOverviewProps {
  ledgers: ExpenseLedger[];
  vouchers: ExpenseVoucher[];
  ledgersLoading: boolean;
  vouchersLoading: boolean;
  currentRangeLabel: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.abs(n));

const ExpenseOverview: React.FC<ExpenseOverviewProps> = ({
  ledgers,
  vouchers,
  ledgersLoading,
  vouchersLoading,
  currentRangeLabel,
}) => {

  // Analytics
  const totalYtd = useMemo(
    () => ledgers.reduce((s, l) => s + Math.abs(l.closingBalance), 0),
    [ledgers]
  );
  const totalPeriod = useMemo(
    () => vouchers.reduce((s, v) => s + v.amount, 0),
    [vouchers]
  );
  const uniqueCategories = useMemo(
    () => new Set(ledgers.map((l) => l.parent)).size,
    [ledgers]
  );
  const totalVouchers = vouchers.length;

  // Top 5 expense heads by YTD closing balance
  const topLedgers = useMemo(
    () => [...ledgers].slice(0, 8),
    [ledgers]
  );

  // Month-wise split from vouchers
  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    vouchers.forEach((v) => {
      const [, m, y] = v.date.split('/');
      const key = `${m}/${y}`;
      map[key] = (map[key] || 0) + v.amount;
    });
    return Object.entries(map)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => {
        const [am, ay] = a.month.split('/');
        const [bm, by] = b.month.split('/');
        return new Date(+ay, +am - 1).getTime() - new Date(+by, +bm - 1).getTime();
      });
  }, [vouchers]);

  const maxMonthly = Math.max(...monthlyData.map((m) => m.amount), 1);

  const loading = ledgersLoading || vouchersLoading;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'YTD Total Expenses',
            value: fmt(totalYtd),
            sub: `${ledgers.length} expense heads`,
            icon: <TrendingDown className="h-5 w-5 text-orange-500" />,
            bg: 'bg-orange-50 border-orange-200',
            val: 'text-orange-700',
          },
          {
            label: 'Period Expenses',
            value: fmt(totalPeriod),
            sub: currentRangeLabel,
            icon: <Receipt className="h-5 w-5 text-blue-500" />,
            bg: 'bg-blue-50 border-blue-200',
            val: 'text-blue-700',
          },
          {
            label: 'Transactions',
            value: totalVouchers.toString(),
            sub: 'Journal + Payment entries',
            icon: <Receipt className="h-5 w-5 text-purple-500" />,
            bg: 'bg-purple-50 border-purple-200',
            val: 'text-purple-700',
          },
          {
            label: 'Expense Categories',
            value: uniqueCategories.toString(),
            sub: `${ledgers.length} ledger accounts`,
            icon: <Tag className="h-5 w-5 text-emerald-500" />,
            bg: 'bg-emerald-50 border-emerald-200',
            val: 'text-emerald-700',
          },
        ].map((c) => (
          <div key={c.label} className={`border rounded-xl p-4 ${c.bg}`}>
            <div className="flex items-center gap-2 mb-2">
              {c.icon}
              <span className="text-xs font-medium text-gray-500">{c.label}</span>
            </div>
            <p className={`text-xl font-bold ${c.val}`}>{c.value}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{c.sub}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <RefreshCw className="h-5 w-5 animate-spin text-orange-500" />
          <span className="text-gray-500 text-sm">Loading expense data from Tally...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Expense Heads */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-700 mb-4">
              Top Expense Heads (YTD)
            </h3>
            {topLedgers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No expense ledgers found
              </p>
            ) : (
              <div className="space-y-3">
                {topLedgers.map((l, i) => {
                  const maxVal = Math.abs(topLedgers[0].closingBalance) || 1;
                  const pct = (Math.abs(l.closingBalance) / maxVal) * 100;
                  return (
                    <div key={l.name}>
                      <div className="flex justify-between text-sm mb-1 gap-2">
                        <span
                          className="text-gray-700 font-medium truncate"
                          title={l.name}
                        >
                          {i + 1}. {l.name}
                        </span>
                        <span className="text-orange-600 font-semibold shrink-0">
                          {fmt(l.closingBalance)}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-2 bg-orange-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{l.parent}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Monthly Trend */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-700 mb-4">
              Monthly Trend (Period)
            </h3>
            {monthlyData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No data for selected period
              </p>
            ) : (
              <div className="space-y-3">
                {monthlyData.map((m) => {
                  const pct = (m.amount / maxMonthly) * 100;
                  const [mon, yr] = m.month.split('/');
                  const label = new Date(+yr, +mon - 1).toLocaleDateString('en-IN', {
                    month: 'short',
                    year: '2-digit',
                  });
                  return (
                    <div key={m.month}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{label}</span>
                        <span className="text-blue-600 font-semibold">
                          {fmt(m.amount)}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-2 bg-blue-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseOverview;
