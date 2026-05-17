import React from 'react';
import { Wallet, Building, Users, UserCheck } from 'lucide-react';
import { useDashboardContext } from '../../../context/DashboardContext';
import { formatCurrency } from '../../../shared/utils/formatters';

const CashBankOverview: React.FC = () => {
  const { summary, loading } = useDashboardContext();

  if (loading || !summary) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse">
        <div className="w-48 h-6 bg-gray-200 rounded mb-6"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="p-4 rounded-lg border border-gray-100">
              <div className="w-10 h-10 bg-gray-200 rounded-lg mb-3"></div>
              <div className="w-20 h-3 bg-gray-200 rounded mb-2"></div>
              <div className="w-24 h-5 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const items = [
    { label: 'Cash in Hand', value: summary.cashInHand,        icon: Wallet,     colorClass: 'bg-green-50 border-green-200 text-green-700' },
    { label: 'Bank Balance', value: summary.bankBalance,       icon: Building,   colorClass: 'bg-blue-50 border-blue-200 text-blue-700' },
    { label: 'Receivables',  value: summary.totalReceivables,  icon: Users,      colorClass: 'bg-amber-50 border-amber-200 text-amber-700' },
    { label: 'Payables',     value: summary.totalPayables,     icon: UserCheck,  colorClass: 'bg-red-50 border-red-200 text-red-700' },
  ];

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Cash & Bank Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className={`p-4 rounded-lg border ${item.colorClass}`}>
              <div className="flex items-center mb-3">
                <div className={`p-2 rounded-lg border ${item.colorClass}`}>
                  <Icon size={20} />
                </div>
              </div>
              <p className="text-sm font-medium mb-1">{item.label}</p>
              <p className="text-xl font-bold text-gray-800">{formatCurrency(item.value)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CashBankOverview;