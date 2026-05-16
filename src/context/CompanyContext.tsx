import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import CompanyApiService from '../services/api/company/companyApiService';

export interface FYOption {
  key: string;
  label: string;
}

/** Returns the start calendar year of the current Indian FY (April → March). */
const getCurrentFYStartYear = (): number => {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
};

/**
 * Given a Tally BOOKSFROM date (YYYYMMDD), returns the list of all financial
 * years recorded in Tally, from the current FY down to booksFrom FY.
 * Sorted newest first. Includes current FY and previous FY.
 */
export const computeAllAvailableFYs = (booksFromYYYYMMDD: string): FYOption[] => {
  if (!booksFromYYYYMMDD || booksFromYYYYMMDD.length < 6) return [];
  const yr = parseInt(booksFromYYYYMMDD.substring(0, 4));
  const mo = parseInt(booksFromYYYYMMDD.substring(4, 6));
  const booksFromFYStart = mo >= 4 ? yr : yr - 1;
  const fyStart = getCurrentFYStartYear();
  const fys: FYOption[] = [];
  for (let y = fyStart; y >= booksFromFYStart; y--) {
    fys.push({
      key: `fy:${y}`,
      label: `FY ${y}\u2013${String(y + 1).slice(2)}`,
    });
  }
  return fys;
};

/** @deprecated Use computeAllAvailableFYs */
export const computeOlderFYs = computeAllAvailableFYs;

interface CompanyContextType {
  selectedCompany: string;
  serverUrl: string;
  /** All FYs available in this Tally company, newest first (based on booksFrom). */
  availableFYs: FYOption[];
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{
  children: ReactNode;
  selectedCompany: string;
  serverUrl: string;
}> = ({ children, selectedCompany, serverUrl }) => {
  const [availableFYs, setAvailableFYs] = useState<FYOption[]>([]);

  useEffect(() => {
    if (!selectedCompany) {
      setAvailableFYs([]);
      return;
    }
    const api = new CompanyApiService();
    api
      .getCompanyTaxDetails(selectedCompany)
      .then((details) => {
        if (details?.booksfrom) {
          setAvailableFYs(computeAllAvailableFYs(details.booksfrom));
        }
      })
      .catch(() => setAvailableFYs([]));
  }, [selectedCompany]);

  return (
    <CompanyContext.Provider value={{ selectedCompany, serverUrl, availableFYs }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = (): CompanyContextType => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};
