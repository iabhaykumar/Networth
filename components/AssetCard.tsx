
import React from 'react';
import { Asset, AssetType } from '../types';
import { USD_TO_INR } from '../constants';

interface AssetCardProps {
  asset: Asset;
  onEdit?: (asset: Asset) => void;
  onDelete?: (id: string) => void;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset, onEdit, onDelete }) => {
  const isINR = asset.currency === 'INR';
  const currentValue = asset.quantity * asset.currentPrice;
  const costBasis = asset.quantity * (asset.averagePrice || 0);
  const profitLoss = currentValue - costBasis;
  const profitLossPercentage = costBasis !== 0 ? (profitLoss / costBasis) * 100 : 0;

  const valueInINR = isINR ? currentValue : currentValue * USD_TO_INR;

  const typeColor: Record<AssetType, string> = {
    [AssetType.CRYPTO]: 'bg-orange-100 text-orange-700',
    [AssetType.INDIAN_STOCK]: 'bg-blue-100 text-blue-700',
    [AssetType.US_STOCK]: 'bg-indigo-100 text-indigo-700',
    [AssetType.BANK_ACCOUNT]: 'bg-green-100 text-green-700',
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 transition-all hover:shadow-md flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${typeColor[asset.type]}`}>
            {asset.type.replace('_', ' ')}
          </span>
          <h3 className="text-lg font-bold mt-2 truncate">{asset.name}</h3>
          <p className="text-sm text-slate-500 uppercase font-mono">{asset.symbol}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold">
            {isINR ? '₹' : '$'}{currentValue.toLocaleString()}
          </p>
          {asset.type !== AssetType.BANK_ACCOUNT && (
            <p className={`text-sm font-semibold ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profitLoss >= 0 ? '↑' : '↓'} {Math.abs(profitLossPercentage).toFixed(2)}%
            </p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-sm border-t border-slate-50 pt-3 mb-4">
        <div>
          <span className="block text-[10px] uppercase text-slate-400 font-bold">Qty</span>
          <span className="font-semibold text-slate-700">{asset.quantity}</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase text-slate-400 font-bold">{asset.type === AssetType.BANK_ACCOUNT ? 'Balance' : 'Avg Cost'}</span>
          <span className="font-semibold text-slate-700">{isINR ? '₹' : '$'}{asset.averagePrice?.toLocaleString()}</span>
        </div>
        <div className="text-right">
          <span className="block text-[10px] uppercase text-slate-400 font-bold">INR Value</span>
          <span className="font-semibold text-slate-700">₹{valueInINR.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
      </div>

      {/* Persistent Action Buttons */}
      <div className="mt-auto flex items-center gap-2 pt-3 border-t border-slate-50">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.(asset);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl text-xs font-bold transition-colors border border-slate-100"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Update
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(asset.id);
          }}
          className="flex-none p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-colors border border-slate-100"
          title="Delete Asset"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default AssetCard;
