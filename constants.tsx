
import { AssetType, Asset } from './types';

export const INITIAL_ASSETS: Asset[] = [
  {
    id: '1',
    type: AssetType.CRYPTO,
    name: 'Bitcoin',
    symbol: 'BTC',
    quantity: 0.25,
    averagePrice: 45000,
    currentPrice: 64000,
    currency: 'USD'
  },
  {
    id: '2',
    type: AssetType.INDIAN_STOCK,
    name: 'Reliance Industries',
    symbol: 'RELIANCE',
    quantity: 50,
    averagePrice: 2400,
    currentPrice: 2950,
    currency: 'INR'
  },
  {
    id: '3',
    type: AssetType.US_STOCK,
    name: 'Nvidia Corp',
    symbol: 'NVDA',
    quantity: 10,
    averagePrice: 450,
    currentPrice: 820,
    currency: 'USD'
  },
  {
    id: '4',
    type: AssetType.BANK_ACCOUNT,
    name: 'Savings Account',
    symbol: 'HDFC',
    quantity: 1,
    averagePrice: 450000,
    currentPrice: 450000,
    currency: 'INR',
    bankName: 'HDFC Bank'
  }
];

export const USD_TO_INR = 83.5;
