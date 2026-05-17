import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, BarChart3, Package2, X } from 'lucide-react';
import { inventoryApiService, type StockItem, type StockItemsResponse } from '../../services/api/inventory/inventoryApiService';
import { stockAnalyticsService, type StockAnalytics } from '../../services/api/inventory/stockAnalyticsService';
import { cacheService } from '../../services/cacheService';
import { useCompany } from '../../context/CompanyContext';
import StockItemsList from './components/StockItemsList';
import StockAnalyticsComponent from './components/StockAnalytics';

type InventoryTab = 'stock-items' | 'analytics';

const InventoryModule: React.FC = () => {
  const { selectedCompany, serverUrl } = useCompany();

  const [activeTab, setActiveTab]       = useState<InventoryTab>('stock-items');
  const [stockItems, setStockItems]     = useState<StockItem[]>([]);
  const [analytics, setAnalytics]       = useState<StockAnalytics | null>(null);
  const [loading, setLoading]           = useState(false);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const [currentPage, setCurrentPage]   = useState(1);
  const [hasMore, setHasMore]           = useState(true);
  const [totalCount, setTotalCount]     = useState(0);
  const pageSize = 50;

  const [searchTerm, setSearchTerm]               = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    if (serverUrl) inventoryApiService.setBaseURL(`http://${serverUrl}`);
  }, [serverUrl]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset + reload on search change
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) return;
    setCurrentPage(1);
    setStockItems([]);
    setHasMore(true);
    loadStockItems(true, 1, debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  useEffect(() => { loadStockItems(); }, []);

  useEffect(() => {
    if (activeTab === 'analytics' && stockItems.length > 0 && !analytics) {
      generateAnalytics();
    }
  }, [activeTab, stockItems, analytics]);

  const loadStockItems = useCallback(async (
    forceRefresh = false,
    page = currentPage,
    search = debouncedSearchTerm
  ) => {
    if (!selectedCompany) {
      setError('No company selected. Please select a company first.');
      return;
    }
    if (page === 1) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const response: StockItemsResponse = await inventoryApiService.getStockItems({
        page, pageSize, searchTerm: search, forceRefresh, companyName: selectedCompany,
      });
      if (page === 1) setStockItems(response.items);
      else setStockItems(prev => [...prev, ...response.items]);
      setCurrentPage(response.currentPage);
      setHasMore(response.hasMore);
      setTotalCount(response.totalCount);
      if (forceRefresh) setAnalytics(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stock items');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentPage, debouncedSearchTerm, pageSize, selectedCompany]);

  const generateAnalytics = () => {
    if (!stockItems.length) return;
    try {
      setAnalytics(stockAnalyticsService.generateAnalytics(stockItems));
    } catch {
      setError('Failed to generate analytics');
    }
  };

  const handleRefresh = () => {
    setCurrentPage(1);
    setStockItems([]);
    setHasMore(true);
    cacheService.delete('stockItems');
    loadStockItems(true, 1, debouncedSearchTerm);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) loadStockItems(false, currentPage + 1, debouncedSearchTerm);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 w-full overflow-x-hidden">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {stockItems.length > 0
              ? `${stockItems.length.toLocaleString()} items loaded${totalCount > stockItems.length ? ` of ${totalCount.toLocaleString()}` : ''}${searchTerm ? ` · "${searchTerm}"` : ''}`
              : 'Stock items from Tally'}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors shadow-sm shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* ── Search bar (always visible) ─────────────────────────────── */}
      {activeTab === 'stock-items' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search stock items…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <div className="flex bg-gray-100 rounded-2xl p-1 gap-0.5">
        {([
          { key: 'stock-items' as InventoryTab, label: 'Stock Items', icon: Package2 },
          { key: 'analytics'   as InventoryTab, label: 'Analytics',   icon: BarChart3 },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              activeTab === key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="whitespace-nowrap">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Error banner ────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 shrink-0" />
          <div>
            <span className="font-semibold">Error: </span>{error}
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Tab content ─────────────────────────────────────────────── */}
      {activeTab === 'stock-items' && (
        <>
          <StockItemsList
            items={stockItems}
            loading={loading}
            searchTerm={debouncedSearchTerm}
          />

          {/* Load More */}
          {hasMore && stockItems.length > 0 && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full py-3 rounded-xl border border-blue-200 text-blue-600 font-semibold text-sm bg-blue-50 active:bg-blue-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loadingMore ? (
                <><RefreshCw className="w-4 h-4 animate-spin" />Loading more…</>
              ) : (
                <>Load more ({(totalCount - stockItems.length).toLocaleString()} remaining)</>
              )}
            </button>
          )}
        </>
      )}

      {activeTab === 'analytics' && (
        <StockAnalyticsComponent
          analytics={analytics || {
            totalItems: 0, totalValue: 0, averageValue: 0,
            topValueItems: [], lowStockItems: [], zeroStockItems: [],
            valueDistribution: [], itemsByUnit: [],
            stockMovement: { increased: 0, decreased: 0, noChange: 0 },
          }}
          loading={loading || (stockItems.length > 0 && !analytics)}
        />
      )}
    </div>
  );
};

export default InventoryModule;
