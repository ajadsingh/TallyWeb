import React from 'react';
import { ShoppingCart, Package, CreditCard, TrendingUp, Users, Wallet, RefreshCw, AlertCircle } from 'lucide-react';
import { useDashboardContext } from '../../../context/DashboardContext';
import { formatCurrency } from '../../../shared/utils/formatters';

const OverviewCards: React.FC = () => {
  const { summary, loading, error, refreshData } = useDashboardContext();

  if (loading || !summary) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="w-24 h-4 bg-gray-200 rounded mb-2"></div>
            <div className="w-32 h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm border border-red-200 text-center">
        <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Data</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={refreshData}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw size={16} className="mr-2" />
          Retry
        </button>
      </div>
    );
  }

  const isProfit = summary.netProfit >= 0;
  const liquidCash = summary.cashInHand + summary.bankBalance;

  const cards = [
    { title: 'Total Sales',      value: summary.totalSales,          icon: ShoppingCart, colorClass: 'bg-green-50 border-green-200 text-green-600',   prefix: '' },
    { title: 'Total Purchases',  value: summary.totalPurchases,      icon: Package,      colorClass: 'bg-blue-50 border-blue-200 text-blue-600',    prefix: '' },
    { title: 'Total Expenses',   value: summary.totalExpenses,       icon: CreditCard,   colorClass: 'bg-orange-50 border-orange-200 text-orange-600', prefix: '' },
    { title: 'Net Profit / Loss',value: Math.abs(summary.netProfit), icon: TrendingUp,   colorClass: isProfit ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-red-50 border-red-200 text-red-600', prefix: isProfit ? '' : '-' },
    { title: 'Total Receivables',value: summary.totalReceivables,    icon: Users,        colorClass: 'bg-amber-50 border-amber-200 text-amber-600',   prefix: '' },
    { title: 'Cash & Bank',      value: liquidCash,                  icon: Wallet,       colorClass: 'bg-purple-50 border-purple-200 text-purple-600', prefix: '' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg border ${card.colorClass}`}>
                <Icon size={22} />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1 truncate">{card.title}</p>
            <p className="text-2xl font-bold text-gray-800 truncate">{card.prefix}{formatCurrency(card.value)}</p>
          </div>
        );
      })}
    </div>
  );
};

export default OverviewCards;