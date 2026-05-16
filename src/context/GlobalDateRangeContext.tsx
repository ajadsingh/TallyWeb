import React, { createContext, useContext, useState, ReactNode } from 'react';
import { DateRange, computeRange } from '../shared/components/DateRangeFilter';

interface GlobalDateRangeContextType {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
}

const GlobalDateRangeContext = createContext<GlobalDateRangeContextType | undefined>(undefined);

export const GlobalDateRangeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dateRange, setDateRange] = useState<DateRange>(() => computeRange('currentFY'));
  return (
    <GlobalDateRangeContext.Provider value={{ dateRange, setDateRange }}>
      {children}
    </GlobalDateRangeContext.Provider>
  );
};

export const useGlobalDateRange = (): GlobalDateRangeContextType => {
  const ctx = useContext(GlobalDateRangeContext);
  if (!ctx) throw new Error('useGlobalDateRange must be used within GlobalDateRangeProvider');
  return ctx;
};
