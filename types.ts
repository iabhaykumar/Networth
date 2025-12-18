
export enum AssetType {
  CRYPTO = 'CRYPTO',
  INDIAN_STOCK = 'INDIAN_STOCK',
  US_STOCK = 'US_STOCK',
  BANK_ACCOUNT = 'BANK_ACCOUNT'
}

export interface Asset {
  id: string;
  type: AssetType;
  name: string;
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  currency: 'INR' | 'USD';
  bankName?: string; // Only for Bank Accounts
}

export interface PortfolioSummary {
  totalValueINR: number;
  totalValueUSD: number;
  allocation: {
    name: string;
    value: number;
    color: string;
  }[];
}

export interface AIInsight {
  title: string;
  content: string;
  type: 'positive' | 'warning' | 'neutral';
}
