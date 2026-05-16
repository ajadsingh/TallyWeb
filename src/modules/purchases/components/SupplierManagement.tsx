import React, { useState, useMemo } from 'react';
import { Search, Users, TrendingDown, Package, Calendar } from 'lucide-react';
import { PurchaseVoucher } from '../../../services/api/purchases/purchasesApiService';
import { formatCurrency } from '../../../shared/utils/formatters';

interface SupplierManagementProps {
  purchaseVouchers: PurchaseVoucher[];
  loading: boolean;
}

const SupplierManagement: React.FC<SupplierManagementProps> = ({ purchaseVouchers, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate supplier data from purchase vouchers
  const suppliers = useMemo(() => {
    const supplierMap = new Map<string, {
      name: string;
      totalAmount: number;
      totalOrders: number;
      lastOrderDate: string | null;
    }>();

    purchaseVouchers.forEach(voucher => {
      const existing = supplierMap.get(voucher.partyName);
      if (existing) {
        existing.totalAmount += voucher.amount;
        existing.totalOrders += 1;
        if (voucher.date && (!existing.lastOrderDate || new Date(voucher.date) > new Date(existing.lastOrderDate))) {
          existing.lastOrderDate = voucher.date;
        }
      } else {
        supplierMap.set(voucher.partyName, {
          name: voucher.partyName,
          totalAmount: voucher.amount,
          totalOrders: 1,
          lastOrderDate: voucher.date
        });
      }
    });

    return Array.from(supplierMap.values())
      .map((supplier, index) => ({
        ...supplier,
        id: index + 1,
        avgOrderValue: supplier.totalOrders > 0 ? supplier.totalAmount / supplier.totalOrders : 0,
        lastOrderDisplay: supplier.lastOrderDate
          ? (() => {
              const [y, m, d] = supplier.lastOrderDate!.split('-');
              return `${d}/${m}/${y}`;
            })()
          : 'N/A',
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [purchaseVouchers]);

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
        <span className="ml-3 text-gray-600">Loading supplier data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Suppliers</h2>
          <p className="text-sm text-gray-500">{filteredSuppliers.length} of {suppliers.length} suppliers from Tally</p>
        </div>
        <div className="relative sm:ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search suppliers…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {filteredSuppliers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">{suppliers.length === 0 ? 'No supplier data available.' : 'No suppliers match your search.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => (
            <div key={supplier.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md hover:border-purple-300 transition-all duration-200">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-800 truncate" title={supplier.name}>{supplier.name}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <TrendingDown className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Total Purchases</p>
                    <p className="font-bold text-purple-700">{formatCurrency(supplier.totalAmount)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Package className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Total Orders</p>
                    <p className="font-bold text-gray-800">{supplier.totalOrders}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <TrendingDown className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Avg Order Value</p>
                    <p className="font-semibold text-gray-800">{formatCurrency(supplier.avgOrderValue)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Last Order</p>
                    <p className="font-medium text-gray-800">{supplier.lastOrderDisplay}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SupplierManagement;