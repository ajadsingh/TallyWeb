import React, { useState, useEffect } from 'react'; 
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './shared/components/Sidebar';
import DateRangeFilter from './shared/components/DateRangeFilter';
import { GlobalDateRangeProvider, useGlobalDateRange } from './context/GlobalDateRangeContext';
import Dashboard from './modules/dashboard/Dashboard';
import SalesModule from './modules/sales/SalesModule';
import PurchasesModule from './modules/purchases/PurchasesModule';
import InventoryModule from './modules/inventory/InventoryModule';
import LedgerModule from './modules/ledger/LedgerModule';
import CompanyModule from './modules/company/CompanyModule';
import SettingsModule from './modules/settings/SettingsModule';
import OutstandingModule from './modules/outstanding/OutstandingModule';
import ExpensesModule from './modules/expenses/ExpensesModule';
import ReportsModule from './modules/reports/ReportsModule';
import PaymentsModule from './modules/payments/PaymentsModule';
import GSTModule from './modules/gst/GSTModule';
import { DashboardProvider } from './context/DashboardContext';
import { CompanyProvider } from './context/CompanyContext';
import CompanySelection from './components/CompanySelection';
import LoginPage from './components/Login';
import Unauthorized from './components/Unauthorized';
import AppConfigService from './services/config/appConfig';
import { useAuth } from './context/AuthContext';

const GlobalDateRangeBar: React.FC = () => {
  const { setDateRange } = useGlobalDateRange();
  return (
    <DateRangeFilter
      defaultKey="currentFY"
      onChange={setDateRange}
      accentColor="blue"
      showAllTime
    />
  );
};

function App() {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, logout, can } = useAuth();

  useEffect(() => {
    // Check if user has already configured server and company
    const appConfig = AppConfigService.getInstance();
    const config = appConfig.getConfig();
    const company = appConfig.getCurrentCompany();
    
    if (config?.serverAddress && config?.serverPort && company) {
      setSelectedCompany(company);
      setServerUrl(`${config.serverAddress}:${config.serverPort}`);
      
      // Redirect to dashboard if user is on onboarding but already configured
      if (location.pathname === '/onboarding' || location.pathname === '/') {
        navigate('/dashboard', { replace: true });
      }
    } else {
      // Redirect to onboarding if not configured and not already there
      if (location.pathname !== '/onboarding' && location.pathname !== '/') {
        navigate('/onboarding', { replace: true });
      }
    }
    setIsLoading(false);
  }, [navigate, location.pathname]);

  const handleViewChange = (view: string) => {
    navigate(`/${view}`);
  };

  const handleLogout = () => {
    // Clear all configuration
    const appConfig = AppConfigService.getInstance();
    appConfig.resetConfig();
    logout();
    
    // Reset component state
    setSelectedCompany(null);
    setServerUrl(null);
    navigate('/onboarding');
  };

  const handleCompanySelect = (company: string, server: string) => {
    // Parse server URL to get address and port
    const [address, port] = server.includes(':') ? server.split(':') : [server, '9000'];
    
    // Save to AppConfigService
    const appConfig = AppConfigService.getInstance();
    appConfig.updateConfig({
      serverAddress: address,
      serverPort: parseInt(port, 10),
    });
    appConfig.setCurrentCompany(company);
    
    setSelectedCompany(company);
    setServerUrl(server);
    
    // Navigate to dashboard after successful selection
    navigate('/dashboard');
  };

  // Get current view from URL path
  const getCurrentView = () => {
    const path = location.pathname;
    if (path.startsWith('/settings')) return 'settings';
    return path.slice(1) || 'dashboard';
  };

  // Show loading state while checking configuration
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/onboarding" element={<CompanySelection onCompanySelect={handleCompanySelect} />} />
      <Route path="/login" element={selectedCompany ? <LoginPage /> : <Navigate to="/onboarding" replace />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/*" element={
        selectedCompany ? (
          user ? (
            <CompanyProvider selectedCompany={selectedCompany} serverUrl={serverUrl || ''}>
              <DashboardProvider selectedCompany={selectedCompany} serverUrl={serverUrl}>
                <GlobalDateRangeProvider>
                  <div className="min-h-screen bg-gray-50 flex overflow-x-hidden">
                    <Sidebar currentView={getCurrentView()} onViewChange={handleViewChange} onLogout={handleLogout} />
                    <main className="flex-1 min-w-0 overflow-x-hidden transition-all duration-300 ml-0 lg:ml-72 pb-16 lg:pb-0 pt-14 lg:pt-0">
                      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm px-3 sm:px-4 py-1.5 sm:py-2 overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
                        <GlobalDateRangeBar />
                      </div>
                      <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={can('dashboard.view') ? <Dashboard /> : <Navigate to="/unauthorized" replace />} />
                        <Route path="/sales" element={can('sales.view') ? <SalesModule /> : <Navigate to="/unauthorized" replace />} />
                        <Route path="/purchases" element={can('purchases.view') ? <PurchasesModule /> : <Navigate to="/unauthorized" replace />} />
                        <Route path="/payments" element={can('payments.view') ? <PaymentsModule /> : <Navigate to="/unauthorized" replace />} />
                        <Route path="/inventory" element={can('inventory.view') ? <InventoryModule /> : <Navigate to="/unauthorized" replace />} />
                        <Route path="/expenses" element={can('expenses.view') ? <ExpensesModule /> : <Navigate to="/unauthorized" replace />} />
                        <Route path="/reports" element={can('reports.view') ? <ReportsModule /> : <Navigate to="/unauthorized" replace />} />
                        <Route path="/gst" element={can('gst.view') ? <GSTModule /> : <Navigate to="/unauthorized" replace />} />
                        <Route path="/ledger" element={can('ledger.view') ? <LedgerModule /> : <Navigate to="/unauthorized" replace />} />
                        <Route path="/outstanding" element={can('outstanding.view') ? <OutstandingModule /> : <Navigate to="/unauthorized" replace />} />
                        <Route path="/company" element={can('company.view') ? <CompanyModule /> : <Navigate to="/unauthorized" replace />} />
                        <Route path="/settings/*" element={can('settings.manage') || can('users.manage') || can('roles.manage') ? <SettingsModule /> : <Navigate to="/unauthorized" replace />} />
                      </Routes>
                    </main>
                  </div>
                </GlobalDateRangeProvider>
              </DashboardProvider>
            </CompanyProvider>
          ) : (
            <Navigate to="/login" replace />
          )
        ) : (
          <Navigate to="/onboarding" replace />
        )
      } />
    </Routes>
  );
}

export default App;