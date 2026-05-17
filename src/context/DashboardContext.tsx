import React, { createContext, useContext, ReactNode, useState, useEffect, useRef } from 'react';
import DashboardApiService, { DashboardSummary, RecentVoucher } from '../services/api/dashboardApiService';

interface DashboardContextType {
  summary: DashboardSummary | null;
  recentVouchers: RecentVoucher[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  selectedCompany: string | null;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export const DashboardProvider: React.FC<{
  children: ReactNode;
  selectedCompany: string;
  serverUrl: string | null;
}> = ({ children, selectedCompany, serverUrl }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentVouchers, setRecentVouchers] = useState<RecentVoucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiRef = useRef(new DashboardApiService());

  useEffect(() => {
    if (serverUrl) {
      apiRef.current.setBaseURL(`http://${serverUrl}`);
    }
  }, [serverUrl]);

  const fetchData = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    setError(null);
    try {
      const dashData = await apiRef.current.getDashboardData(selectedCompany);
      setSummary(dashData);

      // Fetch recent vouchers: last 30 days
      const now = new Date();
      const toDate = formatDate(now);
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      const fromDate = formatDate(from);
      try {
        const vouchers = await apiRef.current.getRecentVouchers(selectedCompany, fromDate, toDate);
        setRecentVouchers(vouchers);
      } catch {
        setRecentVouchers([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data from Tally');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await fetchData();
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany, serverUrl]);

  return (
    <DashboardContext.Provider value={{ summary, recentVouchers, loading, error, refreshData, selectedCompany }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboardContext = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboardContext must be used within a DashboardProvider');
  }
  return context;
};