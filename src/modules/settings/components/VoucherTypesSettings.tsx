import React, { useState, useEffect } from 'react';
import { Plus, X, Info, ShoppingCart, TrendingUp, RefreshCw } from 'lucide-react';
import AppConfigService from '../../../services/config/appConfig';

const cfg = AppConfigService.getInstance();

const COMMON_PURCHASE_TYPES = [
  'Purchase', 'GST Purchase', 'Purchase (Local)', 'Purchase (Interstate)',
  'Tax Invoice (Purchase)', 'Purchase (Exempt)', 'Import Purchase',
  'Purchase (Intrastate)', 'GST Inward Supply',
];
const COMMON_SALES_TYPES = [
  'Sales', 'Tax Invoice', 'GST Sales', 'Sales Invoice',
  'Sales (Local)', 'Sales (Interstate)', 'Sales (Exempt)',
  'Export Invoice', 'Sales (Intrastate)', 'GST Outward Supply',
];

const TypeChips: React.FC<{
  label: string;
  color: 'purple' | 'blue';
  types: string[];
  suggestions: string[];
  onChange: (types: string[]) => void;
}> = ({ label, color, types, suggestions, onChange }) => {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const accent = color === 'purple'
    ? { ring: 'focus:ring-purple-400', chip: 'bg-purple-100 text-purple-800 border-purple-200', add: 'bg-purple-600 hover:bg-purple-700', badge: 'bg-purple-50 border-purple-200 text-purple-600' }
    : { ring: 'focus:ring-blue-400', chip: 'bg-blue-100 text-blue-800 border-blue-200', add: 'bg-blue-600 hover:bg-blue-700', badge: 'bg-blue-50 border-blue-200 text-blue-600' };

  const add = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !types.includes(trimmed)) onChange([...types, trimmed]);
    setInput('');
    setShowSuggestions(false);
  };

  const remove = (name: string) => onChange(types.filter(t => t !== name));

  const filtered = suggestions.filter(
    s => !types.includes(s) && s.toLowerCase().includes(input.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800">{label}</h3>
        {types.length > 0 && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${accent.badge}`}>
            {types.length} custom type{types.length !== 1 ? 's' : ''} active
          </span>
        )}
      </div>

      {/* Existing chips */}
      {types.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {types.map(type => (
            <span
              key={type}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${accent.chip}`}
            >
              {type}
              <button onClick={() => remove(type)} className="hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add input */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={e => { if (e.key === 'Enter') add(input); if (e.key === 'Escape') setShowSuggestions(false); }}
            placeholder={`Type exact name from Tally…`}
            className={`flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 ${accent.ring} bg-gray-50 focus:bg-white`}
          />
          <button
            onClick={() => add(input)}
            disabled={!input.trim()}
            className={`px-3 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-40 ${accent.add}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && filtered.length > 0 && (
          <div className="absolute z-10 left-0 right-10 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {filtered.slice(0, 8).map(s => (
              <button
                key={s}
                onClick={() => add(s)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-0"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Click-outside to close suggestions */}
      {showSuggestions && (
        <div className="fixed inset-0 z-0" onClick={() => setShowSuggestions(false)} />
      )}
    </div>
  );
};

const VoucherTypesSettings: React.FC = () => {
  const [purchaseTypes, setPurchaseTypes] = useState<string[]>([]);
  const [salesTypes, setSalesTypes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPurchaseTypes(cfg.getCustomPurchaseTypes());
    setSalesTypes(cfg.getCustomSalesTypes());
  }, []);

  const save = () => {
    cfg.setCustomPurchaseTypes(purchaseTypes);
    cfg.setCustomSalesTypes(salesTypes);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const reset = () => {
    cfg.setCustomPurchaseTypes([]);
    cfg.setCustomSalesTypes([]);
    setPurchaseTypes([]);
    setSalesTypes([]);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Explanation banner */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5">
        <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 leading-relaxed">
          <p className="font-semibold mb-1">When does this help?</p>
          <p>
            Tally customizations often rename voucher types — e.g. <em>"Purchase"</em> becomes <em>"GST Purchase"</em>
            or <em>"Sales"</em> becomes <em>"Tax Invoice"</em>. The standard filter{' '}
            <code className="bg-amber-100 px-1 rounded text-xs">$$IsPurchase</code> /
            <code className="bg-amber-100 px-1 rounded text-xs">$$IsSales</code> only catches types{' '}
            <strong>derived</strong> from the base type. If your vendor created a fully custom type, add its exact
            name here and the portal will include it in all queries.
          </p>
          <p className="mt-1.5 text-xs text-amber-600">
            Tip: Open Tally → Accounts Info → Voucher Types to see the exact names.
          </p>
        </div>
      </div>

      {/* Purchase types */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-100 rounded-xl">
            <ShoppingCart className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">Purchase Voucher Types</p>
            <p className="text-xs text-gray-400">Custom names used in your Tally for purchase entries</p>
          </div>
        </div>
        <TypeChips
          label="Custom Purchase Types"
          color="purple"
          types={purchaseTypes}
          suggestions={COMMON_PURCHASE_TYPES}
          onChange={setPurchaseTypes}
        />
      </div>

      {/* Sales types */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-100 rounded-xl">
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">Sales Voucher Types</p>
            <p className="text-xs text-gray-400">Custom names used in your Tally for sales entries</p>
          </div>
        </div>
        <TypeChips
          label="Custom Sales Types"
          color="blue"
          types={salesTypes}
          suggestions={COMMON_SALES_TYPES}
          onChange={setSalesTypes}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-colors ${
            saved ? 'bg-green-600' : 'bg-gray-800 hover:bg-gray-900'
          }`}
        >
          {saved ? '✓ Saved — reload page to apply' : 'Save Changes'}
        </button>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>
    </div>
  );
};

export default VoucherTypesSettings;
