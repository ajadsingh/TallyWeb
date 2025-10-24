import React from 'react';
import { TrendingUp, Users, Package, DollarSign, Calendar, RefreshCw, Receipt, User } from 'lucide-react';
import { PurchaseVoucher, DateRangeOption } from '../../../services/api/purchases/purchasesApiService';
import PurchasesApiService from '../../../services/api/purchases/purchasesApiService';
import { formatCurrency } from '../../../shared/utils/formatters';

interface PurchaseOverviewProps {
  purchaseVouchers: PurchaseVoucher[];
  currentRangeLabel: string;
  loading: boolean;
  onDateRangeChange: (dateRange: DateRangeOption, customFrom?: Date, customTo?: Date) => void;
  purchaseApi: PurchasesApiService;
}

const PurchaseOverview: React.FC<PurchaseOverviewProps> = ({
  purchaseVouchers,
  currentRangeLabel,
  loading,
  onDateRangeChange
}) => {
  const [selectedDateRange, setSelectedDateRange] = React.useState<DateRangeOption>('currentMonth');
  const [customFromDate, setCustomFromDate] = React.useState<string>('');
  const [customToDate, setCustomToDate] = React.useState<string>('');

  const handleDateRangeChange = (range: DateRangeOption) => {
    setSelectedDateRange(range);
    onDateRangeChange(range);
  };

  const handleCustomDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customFromDate && customToDate) {
      onDateRangeChange('custom', new Date(customFromDate), new Date(customToDate));
    }
  };

  const totalPurchases = purchaseVouchers.reduce((sum, voucher) => sum + voucher.amount, 0);
  const totalVouchers = purchaseVouchers.length;
  const uniqueSuppliers = new Set(purchaseVouchers.map(v => v.partyName)).size;
  const avgOrderValue = totalVouchers > 0 ? totalPurchases / totalVouchers : 0;

  const dateRangeOptions = [
    { value: 'currentMonth' as DateRangeOption, label: 'This Month' },
    { value: 'lastMonth' as DateRangeOption, label: 'Last Month' },
    { value: 'currentYear' as DateRangeOption, label: 'Current FY' },
    { value: 'lastYear' as DateRangeOption, label: 'Previous FY' },
    { value: 'custom' as DateRangeOption, label: 'Custom Range' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500" />
          <span className="text-lg text-gray-600">Loading purchase data...</span>
        </div>
      </div>
    );
  }

  // Calculate top suppliers
  const supplierTotals = purchaseVouchers.reduce((acc, voucher) => {
    acc[voucher.partyName] = (acc[voucher.partyName] || 0) + voucher.amount;
    return acc;
  }, {} as Record<string, number>);

  const topSuppliers = Object.entries(supplierTotals)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-800">Date Range:</h3>
            
            <div className="flex flex-wrap gap-2">
              {dateRangeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleDateRangeChange(option.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedDateRange === option.value
                      ? 'bg-purple-500 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-purple-100 border border-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={() => onDateRangeChange(selectedDateRange)}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center justify-center space-x-2 shadow-md self-start sm:self-auto"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
        
        {selectedDateRange === 'custom' && (
          <form onSubmit={handleCustomDateSubmit} className="flex items-center gap-4 mt-4 p-4 bg-white rounded-lg border border-purple-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={customFromDate}
                onChange={(e) => setCustomFromDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={customToDate}
                onChange={(e) => setCustomToDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <button
              type="submit"
              className="mt-6 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
            >
              Apply Range
            </button>
          </form>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-6 shadow-lg hover:shadow-2xl hover:from-purple-600 hover:to-purple-700 hover:scale-105 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Total Purchases</p>
              <p className="text-3xl font-bold">{formatCurrency(totalPurchases)}</p>
              <p className="text-purple-200 text-sm mt-1">{currentRangeLabel}</p>
            </div>
            <div className="h-14 w-14 bg-purple-400 rounded-lg flex items-center justify-center">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg hover:shadow-2xl hover:from-blue-600 hover:to-blue-700 hover:scale-105 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Orders</p>
              <p className="text-3xl font-bold">{totalVouchers}</p>
              <p className="text-blue-200 text-sm mt-1">Purchase Transactions</p>
            </div>
            <div className="h-14 w-14 bg-blue-400 rounded-lg flex items-center justify-center">
              <Package className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl p-6 shadow-lg hover:shadow-2xl hover:from-emerald-600 hover:to-emerald-700 hover:scale-105 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Active Suppliers</p>
              <p className="text-3xl font-bold">{uniqueSuppliers}</p>
              <p className="text-emerald-200 text-sm mt-1">Unique Vendors</p>
            </div>
            <div className="h-14 w-14 bg-emerald-400 rounded-lg flex items-center justify-center">
              <Users className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl p-6 shadow-lg hover:shadow-2xl hover:from-amber-600 hover:to-amber-700 hover:scale-105 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm font-medium">Avg Order Value</p>
              <p className="text-3xl font-bold">{formatCurrency(avgOrderValue)}</p>
              <p className="text-amber-200 text-sm mt-1">Per Transaction</p>
            </div>
            <div className="h-14 w-14 bg-amber-400 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-2xl hover:border-purple-300 transition-all duration-300">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">Purchases</h2>
          <p className="text-sm text-gray-600 mt-1">All purchase transactions for {currentRangeLabel.toLowerCase()}</p>
        </div>
        
        {purchaseVouchers.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Purchase Data</h3>
            <p className="text-gray-600">No purchase vouchers found for {currentRangeLabel.toLowerCase()}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher Number</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purchaseVouchers.map((voucher, index) => (
                  <tr key={voucher.id} className={`hover:bg-purple-50 hover:shadow-sm transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        {voucher.date}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Receipt className="h-4 w-4 text-gray-400 mr-2" />
                        {voucher.voucherNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="truncate max-w-[200px]" title={voucher.partyName}>
                          {voucher.partyName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                      {formatCurrency(voucher.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Suppliers */}
      {topSuppliers.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl hover:border-purple-300 transition-all duration-300">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top 5 Suppliers by Volume</h3>
          <div className="space-y-3">
            {topSuppliers.map(([supplier, amount], index) => (
              <div key={supplier} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-purple-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 text-sm font-bold rounded-full">
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900 truncate max-w-[200px]" title={supplier}>
                    {supplier}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">{formatCurrency(amount)}</div>
                  <div className="text-xs text-gray-500">
                    {((amount / totalPurchases) * 100).toFixed(1)}% of total
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOverview;