import React from 'react';
import { ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react';
import { CashFlowData } from '../../../services/api/reports/reportsApiService';

interface Props {
  data: CashFlowData;
  formatCurrency: (n: number) => string;
}

const CashFlowReport: React.FC<Props> = ({ data, formatCurrency }) => {
  const { entries, totalInflow, totalOutflow, openingBalance, closingBalance, netCashFlow } = data;
  const isPositive = netCashFlow >= 0;

  const inflows  = entries.filter(e => e.direction === 'inflow');
  const outflows = entries.filter(e => e.direction === 'outflow');

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Opening Balance</p>
          <p className="text-lg font-bold text-gray-700 mt-1">{formatCurrency(openingBalance)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Inflows</p>
          <p className="text-lg font-bold text-green-600 mt-1">{formatCurrency(totalInflow)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Outflows</p>
          <p className="text-lg font-bold text-red-500 mt-1">{formatCurrency(totalOutflow)}</p>
        </div>
        <div className={`rounded-xl border p-4 ${isPositive ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Net Cash Flow</p>
          <p className={`text-lg font-bold mt-1 ${isPositive ? 'text-blue-700' : 'text-orange-600'}`}>
            {isPositive ? '+' : '–'}{formatCurrency(Math.abs(netCashFlow))}
          </p>
        </div>
      </div>

      {/* Closing balance */}
      {closingBalance > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
          <Wallet className="w-5 h-5 text-blue-500 shrink-0" />
          <span className="text-sm text-gray-600">Closing Balance:</span>
          <span className="font-bold text-gray-900">{formatCurrency(closingBalance)}</span>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400 text-sm">
          <Wallet className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          Cash Flow report data not available — ensure "Cash Flow" report is enabled in Tally Prime.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Inflows */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-green-50 border-b border-green-100 flex items-center gap-2">
              <ArrowDownCircle className="w-4 h-4 text-green-600" />
              <h3 className="text-sm font-semibold text-gray-800">Cash Inflows</h3>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {inflows.length === 0 && (
                  <tr><td className="px-4 py-6 text-center text-gray-400">No inflows</td></tr>
                )}
                {inflows.map((e, i) => (
                  <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-700">{e.name}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-green-700">{formatCurrency(e.amount)}</td>
                  </tr>
                ))}
                {inflows.length > 0 && (
                  <tr className="border-t-2 border-green-200 bg-green-50 font-semibold">
                    <td className="px-4 py-2.5 text-gray-800">Total Inflows</td>
                    <td className="px-4 py-2.5 text-right text-green-700">{formatCurrency(totalInflow)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Outflows */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-red-50 border-b border-red-100 flex items-center gap-2">
              <ArrowUpCircle className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-semibold text-gray-800">Cash Outflows</h3>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {outflows.length === 0 && (
                  <tr><td className="px-4 py-6 text-center text-gray-400">No outflows</td></tr>
                )}
                {outflows.map((e, i) => (
                  <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-700">{e.name}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-red-600">{formatCurrency(e.amount)}</td>
                  </tr>
                ))}
                {outflows.length > 0 && (
                  <tr className="border-t-2 border-red-200 bg-red-50 font-semibold">
                    <td className="px-4 py-2.5 text-gray-800">Total Outflows</td>
                    <td className="px-4 py-2.5 text-right text-red-600">{formatCurrency(totalOutflow)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashFlowReport;
