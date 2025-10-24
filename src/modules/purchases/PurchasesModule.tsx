import React, { useState, useEffect } from 'react';
import { useCompany } from '../../context/CompanyContext';
import PurchasesApiService, { PurchaseVoucher, DateRangeOption } from '../../services/api/purchases/purchasesApiService';
import PurchaseOverview from './components/PurchaseOverview';
import PurchaseAnalytics from './components/PurchaseAnalytics';
import SupplierManagement from './components/SupplierManagement';
import PurchaseTransactions from './components/PurchaseTransactions';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../sales/components/Tabs';
import { RefreshCw, AlertCircle, BarChart3, FileText, Users, TrendingUp } from 'lucide-react';

const PurchasesModule: React.FC = () => {
  const { selectedCompany } = useCompany();
  
  // Current period data (for overview tab)
  const [currentPurchaseVouchers, setCurrentPurchaseVouchers] = useState<PurchaseVoucher[]>([]);
  const [currentLoading, setCurrentLoading] = useState(false);
  const [currentRangeLabel, setCurrentRangeLabel] = useState<string>('');
  
  // Analytics data (auto-fetched)
  const [analyticsVouchers, setAnalyticsVouchers] = useState<PurchaseVoucher[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  
  // Comparison data (auto-fetched)
  const [comparisonCurrentVouchers, setComparisonCurrentVouchers] = useState<PurchaseVoucher[]>([]);
  const [comparisonPreviousVouchers, setComparisonPreviousVouchers] = useState<PurchaseVoucher[]>([]);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  
  const purchaseApi = new PurchasesApiService();

  // Fetch current month data for overview
  const fetchCurrentMonthData = async () => {
    if (!selectedCompany) {
      setError('No company selected. Please select a company first.');
      return;
    }

    try {
      setCurrentLoading(true);
      setError(null);
      
      const vouchers = await purchaseApi.getPurchaseVouchers(selectedCompany, 'currentMonth');
      setCurrentPurchaseVouchers(vouchers);
      
      const range = purchaseApi.getDateRange('currentMonth');
      setCurrentRangeLabel(range.label);
      
    } catch (err) {
      console.error('Purchase fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch current month purchase data');
    } finally {
      setCurrentLoading(false);
    }
  };

  // Fetch analytics data (current financial year for detailed analysis)
  const fetchAnalyticsData = async () => {
    if (!selectedCompany) return;

    try {
      setAnalyticsLoading(true);
      setError(null);
      
      const vouchers = await purchaseApi.getPurchaseVouchers(selectedCompany, 'currentYear');
      setAnalyticsVouchers(vouchers);
      
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Fetch comparison data (current month vs previous month)
  const fetchComparisonData = async () => {
    if (!selectedCompany) return;

    try {
      setComparisonLoading(true);
      setError(null);
      
      const currentVouchers = await purchaseApi.getPurchaseVouchers(selectedCompany, 'currentMonth');
      setComparisonCurrentVouchers(currentVouchers);
      
      const previousVouchers = await purchaseApi.getPurchaseVouchers(selectedCompany, 'lastMonth');
      setComparisonPreviousVouchers(previousVouchers);
      
    } catch (err) {
      console.error('Comparison fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch comparison data');
    } finally {
      setComparisonLoading(false);
    }
  };

  // Handle date range change from overview tab
  const handleDateRangeChange = async (dateRange: DateRangeOption, customFrom?: Date, customTo?: Date) => {
    if (!selectedCompany) return;

    try {
      setCurrentLoading(true);
      setError(null);
      
      const vouchers = await purchaseApi.getPurchaseVouchers(selectedCompany, dateRange, customFrom, customTo);
      setCurrentPurchaseVouchers(vouchers);
      
      const range = purchaseApi.getDateRange(dateRange, customFrom, customTo);
      setCurrentRangeLabel(range.label);
      
    } catch (err) {
      console.error('Purchase fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch purchase data');
    } finally {
      setCurrentLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (selectedCompany) {
      fetchCurrentMonthData();
    }
  }, [selectedCompany]);

  // Auto-fetch analytics and comparison data when component mounts
  useEffect(() => {
    if (selectedCompany) {
      fetchAnalyticsData();
      fetchComparisonData();
    }
  }, [selectedCompany]);

  if (error && !currentPurchaseVouchers.length && !analyticsVouchers.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Purchase Management
            </h1>
            <p className="text-gray-600 mt-2">Error loading purchase data</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl border border-red-200 p-8">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-red-800">Error Loading Purchase Data</h3>
                <p className="text-red-700 mt-1">{error}</p>
                <button
                  onClick={() => fetchCurrentMonthData()}
                  className="mt-4 px-6 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors font-medium"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Purchase Management
            </h1>
            <p className="text-gray-600 mt-2">Comprehensive purchase analytics and supplier insights</p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <div className="mb-8">
              <TabsList className="grid w-full grid-cols-4 bg-white rounded-2xl shadow-lg border border-gray-200 p-2">
                <TabsTrigger value="overview" icon={FileText}>
                  <span className="font-semibold">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" icon={BarChart3}>
                  <span className="font-semibold">Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="suppliers" icon={Users}>
                  <span className="font-semibold">Suppliers</span>
                </TabsTrigger>
                <TabsTrigger value="transactions" icon={TrendingUp}>
                  <span className="font-semibold">Transactions</span>
                </TabsTrigger>
              </TabsList>
            </div>
            
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <PurchaseOverview
                purchaseVouchers={currentPurchaseVouchers}
                currentRangeLabel={currentRangeLabel}
                loading={currentLoading}
                onDateRangeChange={handleDateRangeChange}
                purchaseApi={purchaseApi}
              />
            </TabsContent>
            
            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Purchase Analytics</h2>
                    <p className="text-gray-600">Current financial year detailed analysis</p>
                  </div>
                  {analyticsLoading && (
                    <RefreshCw className="w-5 h-5 animate-spin text-purple-500 ml-auto" />
                  )}
                </div>
              </div>
              
              <PurchaseAnalytics
                purchaseVouchers={analyticsVouchers}
                currentRangeLabel="Current Financial Year"
                loading={analyticsLoading}
              />
            </TabsContent>
            
            {/* Suppliers Tab */}
            <TabsContent value="suppliers" className="space-y-6">
              <SupplierManagement
                purchaseVouchers={currentPurchaseVouchers}
                loading={currentLoading}
              />
            </TabsContent>
            
            {/* Transactions Tab */}
            <TabsContent value="transactions" className="space-y-6">
              <PurchaseTransactions
                currentPeriodVouchers={comparisonCurrentVouchers}
                previousPeriodVouchers={comparisonPreviousVouchers}
                currentPeriodLabel="This Month"
                previousPeriodLabel="Previous Month"
                loading={comparisonLoading}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default PurchasesModule;