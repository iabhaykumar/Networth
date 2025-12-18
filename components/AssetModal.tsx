
import React, { useState, useEffect, useRef } from 'react';
import { Asset, AssetType } from '../types';
import { searchAssets, getCurrentPrice } from '../services/geminiService';

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: Asset) => void;
  editingAsset?: Asset | null;
}

const AssetModal: React.FC<AssetModalProps> = ({ isOpen, onClose, onSave, editingAsset }) => {
  const [formData, setFormData] = useState<Partial<Asset>>({
    type: AssetType.CRYPTO,
    name: '',
    symbol: '',
    quantity: 0,
    averagePrice: 0,
    currentPrice: 0,
    currency: 'INR',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [sources, setSources] = useState<any[]>([]);
  const searchTimeout = useRef<any>(null);

  useEffect(() => {
    if (editingAsset) {
      setFormData(editingAsset);
      setSearchQuery(editingAsset.name);
    } else {
      setFormData({
        type: AssetType.CRYPTO,
        name: '',
        symbol: '',
        quantity: 0,
        averagePrice: 0,
        currentPrice: 0,
        currency: 'INR',
      });
      setSearchQuery('');
      setSearchResults([]);
      setSources([]);
    }
  }, [editingAsset, isOpen]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (formData.type === AssetType.BANK_ACCOUNT) return;

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      const results = await searchAssets(query, formData.type!);
      setSearchResults(results);
      setIsSearching(false);
    }, 600);
  };

  const selectAsset = async (item: any) => {
    setSearchResults([]);
    setSearchQuery(item.name);
    setIsFetchingPrice(true);
    
    // Auto-detect currency based on asset type if not already set
    const defaultCurrency = formData.type === AssetType.US_STOCK ? 'USD' : 'INR';
    
    const { price, sources } = await getCurrentPrice(item.symbol, item.name, formData.currency || defaultCurrency);
    
    setFormData({
      ...formData,
      name: item.name,
      symbol: item.symbol,
      currentPrice: price,
      currency: formData.currency || defaultCurrency as any
    });
    setSources(sources);
    setIsFetchingPrice(false);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const asset: Asset = {
      ...formData as Asset,
      id: editingAsset?.id || Math.random().toString(36).substr(2, 9),
      currentPrice: formData.currentPrice || formData.averagePrice || 0,
    };
    onSave(asset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900">{editingAsset ? 'Edit Asset' : 'Add New Asset'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Asset Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Category</label>
            <div className="grid grid-cols-2 gap-2">
              {[AssetType.CRYPTO, AssetType.INDIAN_STOCK, AssetType.US_STOCK, AssetType.BANK_ACCOUNT].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setFormData({...formData, type: t, currency: t === AssetType.US_STOCK ? 'USD' : 'INR'});
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    formData.type === t 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100' 
                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                  }`}
                >
                  {t.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar / Name Field */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              {formData.type === AssetType.BANK_ACCOUNT ? 'Account Name' : 'Search Asset (Name or Symbol)'}
            </label>
            <div className="relative">
              <input 
                type="text" required
                value={searchQuery}
                onChange={(e) => formData.type === AssetType.BANK_ACCOUNT ? setFormData({...formData, name: e.target.value}) : handleSearch(e.target.value)}
                placeholder={formData.type === AssetType.BANK_ACCOUNT ? "e.g. HDFC Savings" : "Search e.g. Reliance, BTC..."}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all pr-10"
              />
              {isSearching && (
                <div className="absolute right-3 top-3.5">
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectAsset(item)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 flex justify-between items-center border-b border-slate-50 last:border-0"
                  >
                    <div>
                      <span className="block font-bold text-slate-900">{item.name}</span>
                      <span className="text-xs text-slate-500 uppercase">{item.symbol} {item.exchange ? `• ${item.exchange}` : ''}</span>
                    </div>
                    <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Quantity</label>
              <input 
                type="number" step="any" required
                value={formData.quantity || ''}
                onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value)})}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Currency</label>
              <select 
                value={formData.currency}
                onChange={(e) => setFormData({...formData, currency: e.target.value as 'INR' | 'USD'})}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                {formData.type === AssetType.BANK_ACCOUNT ? 'Balance' : 'Avg Buy Price'}
              </label>
              <input 
                type="number" step="any" required
                value={formData.averagePrice || ''}
                onChange={(e) => setFormData({...formData, averagePrice: parseFloat(e.target.value), currentPrice: formData.type === AssetType.BANK_ACCOUNT ? parseFloat(e.target.value) : formData.currentPrice})}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Current Price</label>
              <div className="relative">
                <input 
                  type="number" step="any"
                  disabled={isFetchingPrice}
                  value={formData.currentPrice || ''}
                  onChange={(e) => setFormData({...formData, currentPrice: parseFloat(e.target.value)})}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${isFetchingPrice ? 'opacity-50' : ''}`}
                />
                {isFetchingPrice && (
                  <div className="absolute right-3 top-3.5">
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Verification Sources */}
          {sources.length > 0 && (
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter block mb-1">Price Sources (via Gemini)</span>
              <div className="flex flex-wrap gap-2">
                {sources.map((s, i) => (
                  <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-600 hover:underline truncate max-w-[120px]">
                    {s.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2">
            <button 
              type="submit"
              disabled={isFetchingPrice}
              className={`w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] ${isFetchingPrice ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'}`}
            >
              {editingAsset ? 'Update Asset' : 'Add to Portfolio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssetModal;
