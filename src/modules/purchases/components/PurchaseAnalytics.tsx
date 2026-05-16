import React, { useMemo } from 'react';
import { PurchaseVoucher } from '../../../services/api/purchases/purchasesApiService';
import { formatCurrency } from '../../../shared/utils/formatters';
import { BarChart3, DollarSign, Users, Target } from 'lucide-react';

interface PurchaseAnalyticsProps {
  purchaseVouchers: PurchaseVoucher[];
  currentRangeLabel: string;
  loading: boolean;
}

interface MonthlyPurchases {
  month: string;
  amount: number;
  vouchers: number;
}

const PurchaseAnalytics: React.FC<PurchaseAnalyticsProps> = ({
  purchaseVouchers,
  currentRangeLabel,
  loading
}) => {
  const analytics = useMemo(() => {
    if (!purchaseVouchers.length) return null;

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    let fyStartYear, fyEndYear;
    if (currentMonth >= 3) {
      fyStartYear = currentYear;
      fyEndYear = currentYear + 1;
    } else {
      fyStartYear = currentYear - 1;
      fyEndYear = currentYear;
    }
    
    const allMonthsData: MonthlyPurchases[] = [];
    
    for (let i = 0; i < 12; i++) {
      const monthIndex = (3 + i) % 12;
      const year = monthIndex < 3 ? fyEndYear : fyStartYear;
      const monthDate = new Date(year, monthIndex);
      
      if (monthDate <= currentDate) {
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'long' });
        const shortYear = year.toString().slice(-2);
        allMonthsData.push({
          month: `${monthName} '${shortYear}`,
          amount: 0,
          vouchers: 0
        });
      }
    }

    purchaseVouchers.forEach(voucher => {
      const [year, month] = voucher.date.split('-');
      const voucherYear = parseInt(year);
      const voucherMonth = parseInt(month) - 1;
      
      const voucherDate = new Date(voucherYear, voucherMonth);
      const fyStart = new Date(fyStartYear, 3);
      const fyEnd = new Date(fyEndYear, 2, 31);
      
      if (voucherDate >= fyStart && voucherDate <= fyEnd && voucherDate <= currentDate) {
        const monthName = voucherDate.toLocaleDateString('en-US', { month: 'long' });
        const shortYear = voucherYear.toString().slice(-2);
        const monthLabel = `${monthName} '${shortYear}`;
        
        const existingMonth = allMonthsData.find(m => m.month === monthLabel);
        if (existingMonth) {
          existingMonth.amount += voucher.amount;
          existingMonth.vouchers += 1;
        }
      }
    });

    // Supplier analysis
    const supplierPurchases = purchaseVouchers.reduce((acc, voucher) => {
      acc[voucher.partyName] = (acc[voucher.partyName] || 0) + voucher.amount;
      return acc;
    }, {} as Record<string, number>);

    const topSuppliers = Object.entries(supplierPurchases)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    const totalPurchases = purchaseVouchers.reduce((sum, v) => sum + v.amount, 0);
    const totalVouchers = purchaseVouchers.length;
    const uniqueSuppliers = new Set(purchaseVouchers.map(v => v.partyName)).size;

    return {
      monthlyPurchases: allMonthsData,
      topSuppliers,
      totalPurchases,
      totalVouchers,
      uniqueSuppliers,
      financialYear: `FY ${fyStartYear}-${fyEndYear.toString().slice(-2)}`
    };
  }, [purchaseVouchers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500" />
          <span className="text-lg text-gray-600">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
        <p className="text-gray-600">No purchase data available for analysis.</p>
      </div>
    );
  }

  const maxMonthlyPurchases = Math.max(...analytics.monthlyPurchases.map(m => m.amount));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-6 shadow-lg hover:shadow-2xl hover:from-purple-600 hover:to-purple-700 hover:scale-105 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Total Purchases</p>
              <p className="text-2xl font-bold">{formatCurrency(analytics.totalPurchases)}</p>
              <p className="text-purple-200 text-xs mt-1">{analytics.financialYear}</p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg hover:shadow-2xl hover:from-blue-600 hover:to-blue-700 hover:scale-105 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Orders</p>
              <p className="text-2xl font-bold">{analytics.totalVouchers}</p>
              <p className="text-blue-200 text-xs mt-1">Purchase Transactions</p>
            </div>
            <Target className="h-8 w-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl p-6 shadow-lg hover:shadow-2xl hover:from-emerald-600 hover:to-emerald-700 hover:scale-105 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Unique Suppliers</p>
              <p className="text-2xl font-bold">{analytics.uniqueSuppliers}</p>
              <p className="text-emerald-200 text-xs mt-1">Active Vendors</p>
            </div>
            <Users className="h-8 w-8 text-emerald-200" />
          </div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-2xl hover:border-purple-300 transition-all duration-300">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{currentRangeLabel} — Monthly Breakdown</h3>
        <div className="space-y-3">
          {analytics.monthlyPurchases.map((month) => (
            <div key={month.month} className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <span className="text-sm text-gray-600 w-24 font-medium">{month.month}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-purple-400 to-purple-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${maxMonthlyPurchases > 0 ? (month.amount / maxMonthlyPurchases) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="text-right ml-4">
                <div className="text-sm font-medium text-gray-900">{formatCurrency(month.amount)}</div>
                <div className="text-xs text-gray-500">{month.vouchers} orders</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Suppliers */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-xl hover:border-purple-300 transition-all duration-300">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Suppliers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-3">Top 5 by Volume</h4>
            <div className="space-y-3">
              {analytics.topSuppliers.slice(0, 5).map(([supplier, amount], index) => (
                <div key={supplier} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-purple-100 text-purple-600 text-xs font-bold rounded-full">
                      {index + 1}
                    </div>
                    <span className="text-sm text-gray-900 truncate max-w-[150px]" title={supplier}>
                      {supplier}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(amount)}</div>
                    <div className="text-xs text-gray-500">
                      {((amount / analytics.totalPurchases) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-3">Distribution</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Suppliers</span>
                <span className="text-sm font-medium">{analytics.uniqueSuppliers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Avg per Supplier</span>
                <span className="text-sm font-medium">
                  {formatCurrency(analytics.totalPurchases / analytics.uniqueSuppliers)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Avg Orders</span>
                <span className="text-sm font-medium">
                  {(analytics.totalVouchers / analytics.uniqueSuppliers).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseAnalytics;