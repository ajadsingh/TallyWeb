import React, { useState } from 'react';
import {
  Package, ChevronRight, DollarSign, Package2, TrendingUp, Info, X,
} from 'lucide-react';
import { StockItem } from '../../../services/api/inventory/inventoryApiService';

// ── Avatar color helpers ──────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-orange-500',
  'bg-pink-500',  'bg-cyan-500',   'bg-amber-500',  'bg-indigo-500',
];
const getAvatarColor = (name: string) =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

// ── parseVal helper ───────────────────────────────────────────────────────
const parseVal = (s: string) => parseFloat(s?.replace(/[^\d.-]/g, '') || '0') || 0;

/* ─────────────────────────────────────────────────────────────────────────
   StockItemDetailsSheet — bottom-sheet on mobile, centered modal on desktop
   ───────────────────────────────────────────────────────────────────────── */
const StockItemDetailsSheet: React.FC<{
  item: StockItem;
  onClose: () => void;
}> = ({ item, onClose }) => {
  const closingVal = parseVal(item.closingValue);
  const openingVal = parseVal(item.openingValue);
  const hasStock   = parseVal(item.closingBalance) > 0;
  const valueDiff  = closingVal - openingVal;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/45 z-40" onClick={onClose} />

      {/* Sheet / Dialog */}
      <div className="fixed z-50 bg-white flex flex-col overflow-hidden shadow-2xl
                      inset-x-0 bottom-0 rounded-t-3xl max-h-[88vh]
                      sm:inset-0 sm:m-auto sm:rounded-2xl sm:w-full sm:max-w-lg sm:max-h-[85vh]">

        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hasStock ? 'bg-green-100' : 'bg-gray-100'}`}>
            <Package className={`w-5 h-5 ${hasStock ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 leading-tight">{item.name}</h2>
            {item.languageName && item.languageName !== item.name && (
              <p className="text-xs text-gray-400 mt-0.5">{item.languageName}</p>
            )}
            <div className="flex gap-2 mt-1.5">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${hasStock ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {hasStock ? 'In Stock' : 'Out of Stock'}
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {item.baseUnits || 'unit'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors shrink-0">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* KPI row */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-blue-50 rounded-2xl p-3 text-center">
              <Package2 className="w-4 h-4 text-blue-500 mx-auto mb-1" />
              <p className="text-[10px] text-blue-600 font-medium">Current Stock</p>
              <p className="text-sm font-bold text-blue-900 mt-0.5 truncate">{item.closingBalance || '0'}</p>
            </div>
            <div className="bg-green-50 rounded-2xl p-3 text-center">
              <DollarSign className="w-4 h-4 text-green-500 mx-auto mb-1" />
              <p className="text-[10px] text-green-600 font-medium">Current Value</p>
              <p className="text-sm font-bold text-green-900 mt-0.5 truncate">
                ₹{Math.abs(closingVal).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="bg-purple-50 rounded-2xl p-3 text-center">
              <TrendingUp className="w-4 h-4 text-purple-500 mx-auto mb-1" />
              <p className="text-[10px] text-purple-600 font-medium">Std. Cost</p>
              <p className="text-sm font-bold text-purple-900 mt-0.5 truncate">{item.standardCost || 'N/A'}</p>
            </div>
          </div>

          {/* Detail rows */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 mb-1">
              <Info className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Details</span>
            </div>
            {[
              { label: 'Opening Balance', value: item.openingBalance || 'N/A' },
              { label: 'Opening Value',   value: openingVal ? `₹${Math.abs(openingVal).toLocaleString('en-IN')}` : 'N/A' },
              { label: 'Standard Price',  value: item.standardPrice || 'N/A' },
              { label: 'Base Units',      value: item.baseUnits || 'N/A' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{row.label}</span>
                <span className="font-medium text-gray-800">{row.value}</span>
              </div>
            ))}
          </div>

          {/* Value analysis */}
          {(openingVal !== 0 || closingVal !== 0) && (
            <div className={`rounded-2xl p-4 text-sm font-medium flex items-center gap-2 ${
              valueDiff > 0 ? 'bg-green-50 text-green-700' :
              valueDiff < 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'
            }`}>
              <TrendingUp className={`w-4 h-4 shrink-0 ${valueDiff < 0 ? 'rotate-180' : ''}`} />
              {valueDiff > 0
                ? `Value increased by ₹${Math.abs(valueDiff).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                : valueDiff < 0
                  ? `Value decreased by ₹${Math.abs(valueDiff).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                  : 'No change in value'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   StockItemsList
   ───────────────────────────────────────────────────────────────────────── */
interface StockItemsListProps {
  items: StockItem[];
  loading: boolean;
  searchTerm: string;
}

const StockItemsList: React.FC<StockItemsListProps> = ({ items, loading, searchTerm }) => {
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading stock items…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <div className="h-14 w-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Package className="w-7 h-7 text-gray-300" />
        </div>
        <p className="text-gray-600 font-medium text-sm">
          {searchTerm ? `No items match "${searchTerm}"` : 'No stock items available'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Card header */}
        <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm sm:text-base font-semibold text-gray-800">Stock Items</h2>
          </div>
          <span className="text-xs text-gray-400">
            {items.length.toLocaleString()} {items.length === 1 ? 'item' : 'items'}
            {searchTerm && ` · "${searchTerm}"`}
          </span>
        </div>

        {/* List */}
        <div className="divide-y divide-gray-50">
          {items.map((item, index) => {
            const hasStock   = parseVal(item.closingBalance) > 0;
            const closingVal = parseVal(item.closingValue);
            const initial    = item.name?.[0]?.toUpperCase() ?? '?';
            const color      = getAvatarColor(item.name ?? '');

            return (
              <button
                key={`${item.name}-${index}`}
                onClick={() => setSelectedItem(item)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-blue-50 transition-colors"
              >
                {/* Avatar */}
                <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                  <span className="text-white font-bold text-sm">{initial}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate text-[13px] leading-tight">{item.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-gray-400">{item.baseUnits || '—'}</span>
                    {item.closingBalance && (
                      <span className={`text-[11px] font-medium ${hasStock ? 'text-blue-500' : 'text-gray-400'}`}>
                        · {item.closingBalance}
                      </span>
                    )}
                  </div>
                </div>

                {/* Value */}
                <div className="text-right shrink-0">
                  {closingVal !== 0 && (
                    <p className="text-sm font-bold text-gray-900">
                      ₹{Math.abs(closingVal).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                  )}
                  <div className={`mt-0.5 inline-block w-2 h-2 rounded-full ${hasStock ? 'bg-green-400' : 'bg-gray-300'}`} />
                </div>

                <ChevronRight className="h-4 w-4 text-gray-300 shrink-0 ml-0.5" />
              </button>
            );
          })}
        </div>

        {items.length > 1000 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-center text-xs text-gray-400">
            {items.length.toLocaleString()} items displayed · Use search to find specific items quickly
          </div>
        )}
      </div>

      {/* Detail sheet */}
      {selectedItem && (
        <StockItemDetailsSheet
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  );
};

export default StockItemsList;
