import React from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { ProfitLossData } from '../../../services/api/reports/reportsApiService';

interface Props {
  data: ProfitLossData;
  formatCurrency: (n: number) => string;
}

const ProfitLossReport: React.FC<Props> = ({ data, formatCurrency }) => {
  const { income, expenses, totalIncome, totalExpenses, netProfit } = data;
  const isProfit = netProfit >= 0;

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Income</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="w-11 h-11 bg-green-100 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Expenses</p>
            <p className="text-2xl font-bold text-red-500 mt-1">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="w-11 h-11 bg-red-100 rounded-xl flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-red-500" />
          </div>
        </div>
        <div className={`rounded-xl border p-5 flex items-center justify-between ${isProfit ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{isProfit ? 'Net Profit' : 'Net Loss'}</p>
            <p className={`text-2xl font-bold mt-1 ${isProfit ? 'text-blue-700' : 'text-orange-600'}`}>{formatCurrency(Math.abs(netProfit))}</p>
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isProfit ? 'bg-blue-100' : 'bg-orange-100'}`}>
            <DollarSign className={`w-5 h-5 ${isProfit ? 'text-blue-600' : 'text-orange-500'}`} />
          </div>
        </div>
      </div>

      {/* Two-column table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Income */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3.5 bg-green-50 border-b border-green-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <h3 className="text-sm font-semibold text-gray-800">Income</h3>
          </div>
          {income.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">No income groups found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Group</th>
                    <th className="px-4 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {income.map((item, i) => (
                    <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-700">{item.name}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-green-700">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-green-200 bg-green-50 font-semibold">
                    <td className="px-4 py-2.5 text-gray-800">Total Income</td>
                    <td className="px-4 py-2.5 text-right text-green-700">{formatCurrency(totalIncome)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3.5 bg-red-50 border-b border-red-100 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-gray-800">Expenses</h3>
          </div>
          {expenses.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">No expense groups found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Group</th>
                    <th className="px-4 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((item, i) => (
                    <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-700">{item.name}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-red-600">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-red-200 bg-red-50 font-semibold">
                    <td className="px-4 py-2.5 text-gray-800">Total Expenses</td>
                    <td className="px-4 py-2.5 text-right text-red-600">{formatCurrency(totalExpenses)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Net Profit/Loss Footer */}
      <div className={`rounded-xl border p-4 flex items-center justify-between ${isProfit ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
        <span className="font-semibold text-gray-800 text-sm">
          {isProfit ? 'Net Profit (Income − Expenses)' : 'Net Loss (Expenses − Income)'}
        </span>
        <span className={`text-xl font-bold ${isProfit ? 'text-blue-700' : 'text-orange-600'}`}>
          {formatCurrency(Math.abs(netProfit))}
        </span>
      </div>
    </div>
  );
};

export default ProfitLossReport;
