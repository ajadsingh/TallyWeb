import React from 'react';
import { Users, UserCheck, Wallet, TrendingUp } from 'lucide-react';
import { useDashboardContext } from '../../../context/DashboardContext';
import { formatCurrency } from '../../../shared/utils/formatters';

const QuickStats: React.FC = () => {
  const { summary, loading } = useDashboardContext();

  if (loading || !summary) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse">
        <div className="w-32 h-6 bg-gray-200 rounded mb-6"></div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="p-4 rounded-lg border border-gray-100">
              <div className="w-8 h-8 bg-gray-200 rounded-lg mb-3"></div>
              <div className="w-16 h-3 bg-gray-200 rounded mb-1"></div>
              <div className="w-24 h-5 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isProfit = summary.netProfit >= 0;
  const liquidCash = summary.cashInHand + summary.bankBalance;

  const stats = [
    { label: 'Total Receivables', value: formatCurrency(summary.totalReceivables), icon: Users,      colorClass: 'bg-amber-50 border-amber-200 text-amber-700' },
    { label: 'Total Payables',    value: formatCurrency(summary.totalPayables),    icon: UserCheck,  colorClass: 'bg-red-50 border-red-200 text-red-700' },
    { label: 'Liquid Cash',       value: formatCurrency(liquidCash),               icon: Wallet,     colorClass: 'bg-green-50 border-green-200 text-green-700' },
    { label: 'Net P&L',           value: (isProfit ? '' : '-') + formatCurrency(Math.abs(summary.netProfit)), icon: TrendingUp, colorClass: isProfit ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-red-50 border-red-200 text-red-700' },
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      green: 'bg-green-50 border-green-200 text-green-700',
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      amber: 'bg-amber-50 border-amber-200 text-amber-700',
      red: 'bg-red-50 border-red-200 text-red-700'
    };
    return colors[color as keyof typeof colors];
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Quick Stats</h2>
      
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          
          return (
            <div key={index} className="p-4 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow">
              <div className={`inline-flex p-2 rounded-lg border ${stat.colorClass} mb-3`}>
                <Icon size={20} />
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">{stat.label}</h3>
              <p className="text-base font-bold text-gray-800">{stat.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuickStats;