import React from 'react';
import { Clock, ShoppingCart, Package, Banknote, FileText, CreditCard } from 'lucide-react';
import { useDashboardContext } from '../../../context/DashboardContext';
import { formatCurrency } from '../../../shared/utils/formatters';

function formatTallyDate(d: string): string {
  if (!d || d.length !== 8) return d;
  return `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`;
}

const voucherTypeIcon = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('sales') || t.includes('sale')) return ShoppingCart;
  if (t.includes('purchase')) return Package;
  if (t.includes('payment') || t.includes('receipt')) return Banknote;
  if (t.includes('journal') || t.includes('contra')) return FileText;
  return CreditCard;
};

const voucherTypeColor = (type: string): string => {
  const t = type.toLowerCase();
  if (t.includes('sales') || t.includes('sale')) return 'bg-green-50 border-green-200 text-green-700';
  if (t.includes('purchase')) return 'bg-blue-50 border-blue-200 text-blue-700';
  if (t.includes('payment')) return 'bg-red-50 border-red-200 text-red-700';
  if (t.includes('receipt')) return 'bg-emerald-50 border-emerald-200 text-emerald-700';
  return 'bg-gray-50 border-gray-200 text-gray-700';
};

const RecentActivity: React.FC = () => {
  const { recentVouchers, loading } = useDashboardContext();

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse">
        <div className="w-48 h-6 bg-gray-200 rounded mb-6"></div>
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                <div>
                  <div className="w-32 h-4 bg-gray-200 rounded mb-1"></div>
                  <div className="w-20 h-3 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const items = recentVouchers.slice(0, 10);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center mb-6">
        <Clock className="text-blue-600 mr-2" size={24} />
        <h2 className="text-xl font-bold text-gray-800">Recent Activity</h2>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No recent transactions found.</p>
      ) : (
        <div className="space-y-3">
          {items.map((v, index) => {
            const Icon = voucherTypeIcon(v.voucherType);
            const colorClass = voucherTypeColor(v.voucherType);
            return (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg border ${colorClass}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">
                      {v.partyName || v.voucherType}
                    </p>
                    <p className="text-xs text-gray-500">
                      {v.voucherType}{v.voucherNumber ? ` #${v.voucherNumber}` : ''} Â· {formatTallyDate(v.date)}
                    </p>
                  </div>
                </div>
                <p className="font-bold text-gray-800 text-sm">{formatCurrency(v.amount)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
