import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, RefreshCw, Calendar, PieChart, BarChart3, AlertCircle} from 'lucide-react';
import CompanyApiService, { type TallyCompanyDetails } from '../../services/api/company/companyApiService';
import { balanceSheetApiService, type BalanceSheetData } from '../../services/api/balanceSheetApiService';
import { cacheService } from '../../services/cacheService';
import { useCompany } from '../../context/CompanyContext';
import { useGlobalDateRange } from '../../context/GlobalDateRangeContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/Tabs';
import CompanyDetailsView from './components/CompanyDetailsView';
import BalanceSheetView from './components/BalanceSheetView';

const CompanyModule: React.FC = () => {
  const { selectedCompany, serverUrl } = useCompany();
  const { dateRange } = useGlobalDateRange();
  const [companyDetails, setCompanyDetails] = useState<TallyCompanyDetails | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companyApiService = new CompanyApiService();

  // Configure API service with server URL
  useEffect(() => {
    if (serverUrl) {
      console.log('Setting server URL:', serverUrl);
      companyApiService.setBaseURL(`http://${serverUrl}`);
      balanceSheetApiService.setBaseURL(`http://${serverUrl}`);
    }
  }, [serverUrl]);

  useEffect(() => {
    if (selectedCompany) {
      console.log('Loading company details for:', selectedCompany);
      loadCompanyDetails();
      loadBalanceSheet(); // Load balance sheet data initially
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedCompany) loadBalanceSheet();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const loadCompanyDetails = async () => {
    if (!selectedCompany) {
      setError('No company selected');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching company details...');
      const details = await companyApiService.getCompanyDetails(selectedCompany);
      console.log('Company details received:', details);
      setCompanyDetails(details);
    } catch (error) {
      console.error('Error loading company details:', error);
      setError(error instanceof Error ? error.message : 'Failed to load company details');
    } finally {
      setLoading(false);
    }
  };

  const loadBalanceSheet = async () => {
    setLoading(true);
    setError(null);
    try {
      const formattedFromDate = dateRange.from ? dateRange.from.replace(/-/g, '') : '';
      const formattedToDate = dateRange.to ? dateRange.to.replace(/-/g, '') : '';
      
      // Clear any cached balance sheet data for different date ranges
      cacheService.delete('balanceSheet');
      cacheService.delete(`balanceSheet_${formattedFromDate}_${formattedToDate}`);
      
      const data = await balanceSheetApiService.getBalanceSheet(
        formattedFromDate, 
        formattedToDate,
        selectedCompany
      );
      
      setBalanceSheet(data);
    } catch (error) {
      console.error('Error loading balance sheet:', error);
      setError(error instanceof Error ? error.message : 'Failed to load balance sheet');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadCompanyDetails();
    loadBalanceSheet();
    // Clear relevant cache
    cacheService.delete('companyDetails');
    cacheService.delete('balanceSheet');
  };

  const formatCurrency = (amount: number): string => {
    const absAmount = Math.abs(amount);
    if (absAmount >= 10000000) {
      return `₹${(absAmount / 10000000).toFixed(2)}Cr`;
    } else if (absAmount >= 100000) {
      return `₹${(absAmount / 100000).toFixed(2)}L`;
    } else if (absAmount >= 1000) {
      return `₹${(absAmount / 1000).toFixed(2)}K`;
    } else {
      return `₹${absAmount.toFixed(2)}`;
    }
  };
 
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="p-6 space-y-8">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Company Management
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Comprehensive financial analysis and business insights
                  </p>
                </div>
              </div>
              {selectedCompany && (
                <div className="flex items-center gap-2 mt-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-700">
                    Active Company: <span className="text-blue-600">{selectedCompany}</span>
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
              </button>
            </div>
          </div>
        </motion.div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="bg-red-50/80 backdrop-blur-sm border border-red-200/50 text-red-700 px-6 py-4 rounded-xl shadow-lg"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <div>
                  <span className="font-semibold">Error occurred:</span>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Tabs defaultValue="overview" className="w-full">
          <div className="mb-8">
            <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg rounded-xl p-2">
              <TabsTrigger value="overview" icon={Building2}>Company Details</TabsTrigger>
              <TabsTrigger value="balance-sheet" icon={PieChart}>Balance Sheet</TabsTrigger>
              <TabsTrigger value="analytics" icon={BarChart3}>Analytics</TabsTrigger>
            </TabsList>
          </div>
        
          <TabsContent value="overview" className="space-y-8">
            <CompanyDetailsView 
              companyDetails={companyDetails} 
              loading={loading} 
            />
          </TabsContent>
          
          <TabsContent value="balance-sheet" className="space-y-8">
            {/* Period set globally from top bar */}
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200/50 rounded-xl px-5 py-3">
              <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
              <div>
                <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide">Reporting Period</p>
                <p className="text-sm font-bold text-blue-800">{dateRange.label || 'All Time'}</p>
              </div>
            </div>
            <BalanceSheetView 
              balanceSheet={balanceSheet} 
              loading={loading}
              formatCurrency={formatCurrency}
            />
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-8">
            {/* Period set globally from top bar */}
            <div className="flex items-center gap-3 bg-purple-50 border border-purple-200/50 rounded-xl px-5 py-3">
              <BarChart3 className="w-4 h-4 text-purple-500 shrink-0" />
              <div>
                <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wide">Analytics Period</p>
                <p className="text-sm font-bold text-purple-800">{dateRange.label || 'All Time'}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CompanyModule;
