
import React, { useState, useMemo } from 'react';
import { Asset, AssetType } from '../types';
import AssetCard from './AssetCard';
import { USD_TO_INR } from '../constants';

interface AssetListProps {
  assets: Asset[];
  type: AssetType;
  title: string;
  onEdit: (asset: Asset) => void;
  onDelete: (id: string) => void;
}

const AssetList: React.FC<AssetListProps> = ({ assets, type, title, onEdit, onDelete }) => {
  const [isSortedByValue, setIsSortedByValue] = useState(false);

  const filteredAssets = useMemo(() => {
    let items = assets.filter(a => a.type === type);
    
    if (isSortedByValue) {
      items = [...items].sort((a, b) => {
        const valA = (a.quantity * a.currentPrice) * (a.currency === 'USD' ? USD_TO_INR : 1);
        const valB = (b.quantity * b.currentPrice) * (b.currency === 'USD' ? USD_TO_INR : 1);
        return valB - valA; // Descending order
      });
    }
    
    return items;
  }, [assets, type, isSortedByValue]);

  if (filteredAssets.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          {title}
          <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">
            {filteredAssets.length}
          </span>
        </h2>
        
        <button 
          onClick={() => setIsSortedByValue(!isSortedByValue)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all border ${
            isSortedByValue 
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
          {isSortedByValue ? 'Sorted by Value' : 'Sort by Value'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssets.map(asset => (
          <AssetCard key={asset.id} asset={asset} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
};

export default AssetList;
