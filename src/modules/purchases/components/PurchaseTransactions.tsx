import React, { useState, useMemo } from 'react';
import { Search, Filter, Download, Eye, Loader } from 'lucide-react';
import { PurchaseVoucher } from '../../../services/api/purchases/purchasesApiService';
import { formatCurrency } from '../../../shared/utils/formatters';

interface PurchaseTransactionsProps {
  currentPeriodVouchers: PurchaseVoucher[];
  previousPeriodVouchers: PurchaseVoucher[];
  currentPeriodLabel: string;
  previousPeriodLabel: string;
  loading: boolean;
}

const PurchaseTransactions: React.FC<PurchaseTransactionsProps> = ({
  currentPeriodVouchers,
  previousPeriodVouchers,
  currentPeriodLabel,
  previousPeriodLabel,
  loading
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState<'current' | 'previous' | 'all'>('current');

  // Combine vouchers with period labels
  const allTransactions = useMemo(() => {
    const current = currentPeriodVouchers.map(v => ({ ...v, period: 'current' as const }));
    const previous = previousPeriodVouchers.map(v => ({ ...v, period: 'previous' as const }));
    
    if (periodFilter === 'current') return current;
    if (periodFilter === 'previous') return previous;
    return [...current, ...previous].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [currentPeriodVouchers, previousPeriodVouchers, periodFilter]);

  const filteredTransactions = allTransactions.filter(transaction =>
    transaction.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate comparison metrics
  const currentTotal = currentPeriodVouchers.reduce((sum, v) => sum + v.amount, 0);
  const previousTotal = previousPeriodVouchers.reduce((sum, v) => sum + v.amount, 0);
  const growth = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-purple-500" />
        <span className="ml-3 text-gray-600">Loading transaction data...</span>
      </div>
    );
  }



  return (
    <div className="space-y-6 w-full overflow-x-hidden">
      {/* Comparison Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-sm text-gray-600 mb-2">{currentPeriodLabel}</h3>
          <p className="text-3xl font-bold text-purple-600">{formatCurrency(currentTotal)}</p>
          <p className="text-sm text-gray-500 mt-1">{currentPeriodVouchers.length} transactions</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-sm text-gray-600 mb-2">{previousPeriodLabel}</h3>
          <p className="text-3xl font-bold text-blue-600">{formatCurrency(previousTotal)}</p>
          <p className="text-sm text-gray-500 mt-1">{previousPeriodVouchers.length} transactions</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-sm text-gray-600 mb-2">Growth</h3>
          <div className="flex items-center">
            <p className={`text-3xl font-bold ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
            </p>
          </div>
          <p className="text-sm text-gray-500 mt-1">Period over period</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as 'current' | 'previous' | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Periods</option>
            <option value="current">{currentPeriodLabel}</option>
            <option value="previous">{previousPeriodLabel}</option>
          </select>
        </div>
        
        <div className="flex gap-2">
          <button className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            <Filter size={20} className="mr-2" />
            More Filters
          </button>
          <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download size={20} className="mr-2" />
            Export
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Mobile: Card list */}
        <div className="sm:hidden divide-y divide-gray-100">
          {filteredTransactions.map((transaction) => (
            <div key={transaction.id} className="px-4 py-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate text-sm">{transaction.partyName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(transaction.date).toLocaleDateString()}
                    <span className="mx-1 text-gray-300">·</span>
                    <span className="text-purple-600 font-medium">{transaction.voucherNumber}</span>
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(transaction.amount)}</p>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                    transaction.period === 'current' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {transaction.period === 'current' ? currentPeriodLabel : previousPeriodLabel}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchase Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {transaction.voucherNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                    {transaction.partyName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      transaction.period === 'current' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {transaction.period === 'current' ? currentPeriodLabel : previousPeriodLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button className="text-blue-600 hover:text-blue-800 transition-colors">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>Showing {filteredTransactions.length} of {allTransactions.length} transactions</p>
            <div className="flex space-x-2">
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 transition-colors">
                Previous
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 transition-colors">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseTransactions;