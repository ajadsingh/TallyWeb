import React, { useState, useEffect, useRef } from 'react';
import { useDashboardContext } from '../../context/DashboardContext';
import LedgerList from './components/LedgerList';
import LedgerDetails from './components/LedgerDetails';
import { TallyLedger } from '../../services/api/ledger/ledgerApiService';
import LedgerApiService from '../../services/api/ledger/ledgerApiService';

interface LedgerModuleProps {
  serverUrl: string;
}

const LedgerModule: React.FC<LedgerModuleProps> = ({ serverUrl }) => {
  const { selectedCompany } = useDashboardContext();
  const [selectedLedger, setSelectedLedger] = useState<TallyLedger | null>(null);
  const [cachedLedgers, setCachedLedgers] = useState<TallyLedger[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

  // Stable API instance that never changes
  const ledgerApi = useRef(new LedgerApiService());

  useEffect(() => {
    if (serverUrl) ledgerApi.current.setBaseURL(`http://${serverUrl}`);
  }, [serverUrl]);

  useEffect(() => {
    if (selectedCompany && serverUrl) fetchLedgers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany, serverUrl]);

  const fetchLedgers = async () => {
    if (!selectedCompany) return;
    try {
      setIsLoading(true);
      setLoadError(null);
      const ledgers = await ledgerApi.current.getLedgerList(selectedCompany);
      setCachedLedgers(ledgers);
      setLastFetchTime(Date.now());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load ledgers');
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedCompany || !serverUrl) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-6">
        <div className="text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="font-semibold text-gray-700">Company not selected</p>
          <p className="text-sm text-gray-500 mt-1">Please select a company to view ledgers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {selectedLedger ? (
        <LedgerDetails
          ledger={selectedLedger}
          companyName={selectedCompany}
          serverUrl={serverUrl}
          onBack={() => setSelectedLedger(null)}
        />
      ) : (
        <LedgerList
          cachedLedgers={cachedLedgers}
          isLoading={isLoading}
          loadError={loadError}
          onLedgerSelect={setSelectedLedger}
          onRefresh={fetchLedgers}
          lastFetchTime={lastFetchTime}
        />
      )}
    </div>
  );
};

export default LedgerModule;

