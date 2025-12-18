
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LabelList } from 'recharts';
import { Asset, AssetType, AIInsight } from './types';
import { INITIAL_ASSETS, USD_TO_INR } from './constants';
import AssetList from './components/AssetList';
import AssetModal from './components/AssetModal';
import { getAIInsights, getBatchPrices } from './services/geminiService';

const App: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('wealthtrack_assets');
    return saved ? JSON.parse(saved) : INITIAL_ASSETS;
  });
  
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assets'>('dashboard');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  useEffect(() => {
    localStorage.setItem('wealthtrack_assets', JSON.stringify(assets));
  }, [assets]);

  const refreshPrices = useCallback(async () => {
    if (isRefreshingPrices || assets.length === 0) return;
    
    setIsRefreshingPrices(true);
    try {
      const priceMap = await getBatchPrices(assets);
      if (Object.keys(priceMap).length > 0) {
        setAssets(prev => prev.map(asset => {
          if (priceMap[asset.symbol]) {
            return { ...asset, currentPrice: priceMap[asset.symbol] };
          }
          return asset;
        }));
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.error("Failed to refresh prices", e);
    } finally {
      setIsRefreshingPrices(false);
    }
  }, [assets, isRefreshingPrices]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshPrices();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshPrices]);

  const totalValueINR = useMemo(() => {
    return assets.reduce((sum, asset) => {
      const val = asset.quantity * asset.currentPrice;
      return sum + (asset.currency === 'INR' ? val : val * USD_TO_INR);
    }, 0);
  }, [assets]);

  const totalInvestedINR = useMemo(() => {
    return assets.reduce((sum, asset) => {
      const val = asset.quantity * (asset.averagePrice || 0);
      return sum + (asset.currency === 'INR' ? val : val * USD_TO_INR);
    }, 0);
  }, [assets]);

  const totalProfitINR = totalValueINR - totalInvestedINR;
  const totalProfitPct = totalInvestedINR > 0 ? (totalProfitINR / totalInvestedINR) * 100 : 0;

  // New Memoized Data for Aggregate Portfolio Comparison
  const summaryPerformanceData = useMemo(() => [
    {
      name: 'Portfolio Growth',
      invested: Math.round(totalInvestedINR),
      value: Math.round(totalValueINR),
      profitPct: totalProfitPct.toFixed(1) + '%'
    }
  ], [totalInvestedINR, totalValueINR, totalProfitPct]);

  // Individual Asset Performance Data for "Market Benchmarks"
  const assetPerformanceData = useMemo(() => {
    return assets
      .map(a => {
        const multiplier = a.currency === 'USD' ? USD_TO_INR : 1;
        const marketValue = a.quantity * a.currentPrice * multiplier;
        const investedValue = a.quantity * (a.averagePrice || 0) * multiplier;
        const profit = marketValue - investedValue;
        const profitPct = investedValue > 0 ? (profit / investedValue) * 100 : 0;

        return {
          symbol: a.symbol,
          name: a.name,
          invested: Math.round(investedValue),
          value: Math.round(marketValue),
          profitPct: profitPct.toFixed(1),
          displayProfit: `${profitPct >= 0 ? '+' : ''}${profitPct.toFixed(1)}%`,
          color: a.type === AssetType.CRYPTO ? '#f59e0b' : 
                 a.type === AssetType.INDIAN_STOCK ? '#3b82f6' : 
                 a.type === AssetType.US_STOCK ? '#6366f1' : '#10b981'
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 assets for clarity
  }, [assets]);

  const allocationData = useMemo(() => {
    const types = [
      { name: 'Crypto', type: AssetType.CRYPTO, color: '#f59e0b' },
      { name: 'Indian Stocks', type: AssetType.INDIAN_STOCK, color: '#3b82f6' },
      { name: 'US Stocks', type: AssetType.US_STOCK, color: '#6366f1' },
      { name: 'Bank Accounts', type: AssetType.BANK_ACCOUNT, color: '#10b981' },
    ];

    return types.map(t => {
      const val = assets
        .filter(a => a.type === t.type)
        .reduce((sum, a) => {
          const amount = a.quantity * a.currentPrice;
          return sum + (a.currency === 'INR' ? amount : amount * USD_TO_INR);
        }, 0);
      return { name: t.name, value: Math.round(val), color: t.color };
    }).filter(d => d.value > 0);
  }, [assets]);

  useEffect(() => {
    const fetchInsights = async () => {
      if (assets.length === 0) {
        setInsights([]);
        return;
      }
      setLoadingInsights(true);
      try {
        const res = await getAIInsights(assets);
        setInsights(res);
      } catch (err) {
        setInsights([]);
      } finally {
        setLoadingInsights(false);
      }
    };
    fetchInsights();
  }, [assets]);

  const handleSaveAsset = (asset: Asset) => {
    setAssets(prev => {
      const exists = prev.find(a => a.id === asset.id);
      if (exists) {
        return prev.map(a => a.id === asset.id ? asset : a);
      } else {
        return [...prev, asset];
      }
    });
    setEditingAsset(null);
  };

  const handleDeleteAsset = (id: string) => {
    if (window.confirm('Are you sure you want to remove this asset?')) {
      setAssets(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset({ ...asset });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingAsset(null);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-50 overflow-x-hidden">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .delay-100 { animation-delay: 100ms; }
        .delay-150 { animation-delay: 150ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .ai-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
        .shine-effect {
          position: relative;
          overflow: hidden;
        }
        .shine-effect::after {
          content: "";
          position: absolute;
          top: -110%;
          left: -210%;
          width: 200%;
          height: 200%;
          opacity: 0;
          transform: rotate(30deg);
          background: rgba(255, 255, 255, 0.13);
          background: linear-gradient(
            to right, 
            rgba(255, 255, 255, 0.13) 0%,
            rgba(255, 255, 255, 0.13) 77%,
            rgba(255, 255, 255, 0.5) 92%,
            rgba(255, 255, 255, 0.0) 100%
          );
          animation: shine 3s infinite;
        }
        @keyframes shine {
          10% { opacity: 1; top: -30%; left: -30%; transition-property: left, top, opacity; transition-duration: 0.7s, 0.7s, 0.15s; transition-timing-function: ease; }
          100% { opacity: 0; top: -30%; left: -30%; transition-property: left, top, opacity; }
        }
      `}</style>
      
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-100">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 hidden sm:block">WealthTrack AI</h1>
          </div>
          <nav className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-white shadow-sm text-indigo-600 scale-105' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('assets')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'assets' ? 'bg-white shadow-sm text-indigo-600 scale-105' : 'text-slate-500 hover:text-slate-700'}`}
            >
              All Assets
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6 opacity-0 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <span className={`flex h-2.5 w-2.5 rounded-full ${isRefreshingPrices ? 'bg-indigo-500 animate-ping' : 'bg-green-500'}`}></span>
            <span className="text-xs font-bold text-slate-500">
              {isRefreshingPrices ? 'UPDATING LIVE PRICES...' : `LAST SYNCED: ${lastUpdated.toLocaleTimeString()}`}
            </span>
          </div>
          <button 
            onClick={refreshPrices}
            disabled={isRefreshingPrices}
            className="flex items-center gap-2 text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest bg-indigo-50 px-5 py-2.5 rounded-xl border border-indigo-100 transition-all active:scale-95 shadow-sm"
          >
            <svg className={`w-3.5 h-3.5 ${isRefreshingPrices ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Live Price Refresh
          </button>
        </div>

        {activeTab === 'dashboard' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
            <div className="lg:col-span-2 space-y-8">
              {/* Main Banner */}
              <section className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden opacity-0 animate-fade-in-up delay-100 shine-effect">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mb-2 opacity-80">CURRENT NET WORTH</p>
                    <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-4 relative z-10">
                      <h2 className="text-5xl md:text-7xl font-black truncate drop-shadow-xl tracking-tighter">₹{totalValueINR.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
                      <p className="text-indigo-200 text-2xl font-bold opacity-70">≈ ${(totalValueINR / USD_TO_INR).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-2xl backdrop-blur-md border border-white/10 ${totalProfitINR >= 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    <p className="text-[10px] font-black uppercase tracking-wider text-center">OVERALL ROI</p>
                    <p className="text-xl font-black">{totalProfitPct >= 0 ? '+' : ''}{totalProfitPct.toFixed(2)}%</p>
                  </div>
                </div>
                
                <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                  {allocationData.map((item) => (
                    <div key={item.name} className={`bg-white/5 backdrop-blur-xl rounded-[2rem] p-5 border border-white/10 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 group`}>
                      <p className="text-[10px] text-indigo-100 uppercase font-black tracking-widest mb-2 opacity-60 group-hover:opacity-100 transition-opacity">{item.name}</p>
                      <p className="text-xl font-black">₹{(item.value / 100000).toFixed(2)}L</p>
                    </div>
                  ))}
                </div>
                <div className="absolute -top-12 -right-12 w-80 h-80 bg-indigo-500/20 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute -bottom-12 -left-12 w-80 h-80 bg-indigo-400/10 rounded-full blur-[100px]"></div>
              </section>

              {/* Growth Benchmarks Section with Enhanced Animations */}
              <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 opacity-0 animate-fade-in-up delay-150 group transition-all duration-500 hover:shadow-xl hover:shadow-indigo-50/50">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    Growth Benchmarks
                  </h3>
                  <div className="flex gap-4">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TOTAL INVESTED</p>
                      <p className="text-sm font-black text-slate-600">₹{totalInvestedINR.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NET PROFIT</p>
                      <p className={`text-sm font-black ${totalProfitINR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{totalProfitINR.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="h-[120px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={summaryPerformanceData}
                      margin={{ top: 0, right: 100, left: 0, bottom: 0 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" hide />
                      <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px 16px' }}
                        formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Value']}
                      />
                      <Bar 
                        dataKey="invested" 
                        name="Invested Cost" 
                        fill="#e2e8f0" 
                        radius={[20, 20, 20, 20]} 
                        barSize={32}
                        animationDuration={1500}
                        animationBegin={300}
                        animationEasing="ease-out"
                      />
                      <Bar 
                        dataKey="value" 
                        name="Current Worth" 
                        fill="#4f46e5" 
                        radius={[20, 20, 20, 20]} 
                        barSize={32}
                        animationDuration={1800}
                        animationBegin={600}
                        animationEasing="ease-in-out"
                      >
                        <LabelList 
                          dataKey="value" 
                          position="right" 
                          formatter={(val: number) => `₹${(val/100000).toFixed(1)}L`} 
                          style={{ fontWeight: 900, fontSize: 13, fill: '#4f46e5', textAnchor: 'start', letterSpacing: '-0.02em' }} 
                          offset={12}
                        />
                        <LabelList 
                          dataKey="profitPct" 
                          position="insideRight" 
                          formatter={(val: string) => `(${val})`} 
                          style={{ fontWeight: 700, fontSize: 10, fill: '#ffffff', textAnchor: 'end' }} 
                          offset={15}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Asset-wise Performance Chart */}
                <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 opacity-0 animate-fade-in-up delay-200 group">
                  <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-2">
                    <div className="p-2 bg-green-50 rounded-xl group-hover:bg-green-100 transition-colors">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    </div>
                    Top Holdings Performance
                  </h3>
                  {assets.length > 0 ? (
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={assetPerformanceData} 
                          margin={{ top: 30, right: 10, left: -10, bottom: 5 }}
                          barGap={6}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="symbol" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 800, fill: '#1e293b' }} 
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} 
                            tickFormatter={(val) => `₹${val/1000}k`} 
                          />
                          <Tooltip 
                            cursor={{ fill: '#f8fafc', radius: 12 }}
                            contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px 16px' }}
                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                            formatter={(value: number, name: string, props: any) => [
                              `₹${value.toLocaleString()}`, 
                              name === 'invested' ? 'Cost Basis' : `Current (${props.payload.name})`
                            ]}
                          />
                          <Bar 
                            dataKey="invested" 
                            name="invested" 
                            fill="#cbd5e1" 
                            radius={[6, 6, 0, 0]} 
                            animationBegin={600} 
                            animationDuration={1500} 
                          />
                          <Bar 
                            dataKey="value" 
                            name="value" 
                            radius={[8, 8, 0, 0]} 
                            animationBegin={800} 
                            animationDuration={1800}
                          >
                            {assetPerformanceData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                            <LabelList 
                              dataKey="displayProfit" 
                              position="top" 
                              style={{ fontSize: '9px', fontWeight: '900', fill: '#1e293b' }} 
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-slate-400 font-medium italic border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                      Add holdings to see comparisons
                    </div>
                  )}
                </section>

                {/* Pie Chart: Allocation */}
                <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 opacity-0 animate-fade-in-up delay-200 group">
                  <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                    </div>
                    Sector Allocation
                  </h3>
                  {assets.length > 0 ? (
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={allocationData}
                            innerRadius={80}
                            outerRadius={115}
                            paddingAngle={8}
                            dataKey="value"
                            stroke="none"
                            animationBegin={400}
                            animationDuration={1500}
                            animationEasing="ease-out"
                          >
                            {allocationData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px 16px' }}
                            formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Market Value']}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            align="center" 
                            iconType="circle" 
                            wrapperStyle={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: '20px' }} 
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-slate-400 font-medium italic border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                      No data to split
                    </div>
                  )}
                </section>
              </div>
            </div>

            <div className="space-y-6">
              {/* AI Strategy Insights Card */}
              <div className="bg-slate-900 rounded-[3rem] p-8 text-white overflow-hidden relative shadow-2xl opacity-0 animate-fade-in-up delay-300">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                      <div className="bg-indigo-500/20 p-2.5 rounded-2xl animate-pulse">
                        <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      </div>
                      <h3 className="text-xl font-black tracking-tight">Gemini Strategy</h3>
                    </div>
                    {loadingInsights && (
                       <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </div>
                  
                  {loadingInsights ? (
                    <div className="space-y-6">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse space-y-3">
                          <div className="h-4 w-32 bg-white/10 rounded-full"></div>
                          <div className="h-20 w-full bg-white/5 rounded-[1.5rem]"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {insights.length > 0 ? (
                        <div className="space-y-5 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar ai-scrollbar">
                          {insights.map((insight, idx) => (
                            <div key={idx} className="bg-white/5 border border-white/10 rounded-[2rem] p-5 transition-all hover:bg-white/10 group cursor-default">
                              <h4 className={`text-[11px] font-black mb-2 flex items-center gap-2 uppercase tracking-widest ${
                                insight.type === 'positive' ? 'text-green-400' : 
                                insight.type === 'warning' ? 'text-amber-400' : 'text-indigo-400'
                              }`}>
                                <span className="w-2 h-2 rounded-full bg-current"></span>
                                {insight.title}
                              </h4>
                              <p className="text-sm text-slate-400 leading-relaxed group-hover:text-slate-200 transition-colors">
                                {insight.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-16 px-4 bg-white/5 rounded-[2.5rem] border border-white/10 border-dashed">
                          <div className="bg-white/5 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                             <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0012 18.75V19a.75.75 0 01-1.5 0v-.25c0-.476-.118-.937-.344-1.345l-.547-.547z" /></svg>
                          </div>
                          <p className="text-slate-400 text-sm font-bold italic px-4">Portfolio Analysis is ready. Refresh for AI-powered strategy.</p>
                        </div>
                      )}
                    </>
                  )}
                  
                  <button 
                    onClick={() => {
                      setInsights([]);
                      setLoadingInsights(true);
                      getAIInsights(assets).then(setInsights).finally(() => setLoadingInsights(false));
                    }}
                    disabled={loadingInsights || assets.length === 0}
                    className="mt-8 w-full py-5 bg-indigo-600 rounded-[2rem] text-[10px] font-black tracking-widest uppercase hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className={`w-4 h-4 ${loadingInsights ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    {loadingInsights ? 'Analyzing...' : 'Generate AI Report'}
                  </button>
                </div>
                <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-indigo-500/20 rounded-full blur-[80px] opacity-40"></div>
              </div>

              {/* Quick Tools */}
              <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-slate-100 opacity-0 animate-fade-in-up delay-300">
                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                   Portfolio Tools
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={openAddModal}
                    className="group flex flex-col items-center gap-4 p-6 bg-indigo-50 text-indigo-700 rounded-[2.5rem] hover:bg-indigo-600 hover:text-white transition-all duration-500 border border-indigo-100 shadow-sm"
                  >
                    <div className="p-3 bg-indigo-600 group-hover:bg-white text-white group-hover:text-indigo-600 rounded-2xl shadow-lg transition-all group-hover:scale-110">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Add Asset</span>
                  </button>
                  <button 
                    onClick={() => window.print()}
                    className="group flex flex-col items-center gap-4 p-6 bg-slate-50 text-slate-700 rounded-[2.5rem] hover:bg-slate-800 hover:text-white transition-all duration-500 border border-slate-100 shadow-sm"
                  >
                    <div className="p-3 bg-white group-hover:bg-white/20 text-slate-600 group-hover:text-white rounded-2xl shadow-md border border-slate-200 group-hover:border-transparent transition-all group-hover:scale-110">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Report PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-12 pb-24 opacity-0 animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
              <div>
                <h2 className="text-5xl font-black text-slate-900 tracking-tighter">My Portfolio</h2>
                <p className="text-slate-500 text-lg font-bold">Comprehensive view of every holding</p>
              </div>
              <button 
                onClick={openAddModal}
                className="px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 hover:-translate-y-1"
              >
                + NEW INVESTMENT
              </button>
            </div>
            
            <div className="space-y-20">
              <AssetList assets={assets} type={AssetType.CRYPTO} title="Cryptocurrencies" onEdit={handleEditAsset} onDelete={handleDeleteAsset} />
              <AssetList assets={assets} type={AssetType.INDIAN_STOCK} title="Indian Stocks" onEdit={handleEditAsset} onDelete={handleDeleteAsset} />
              <AssetList assets={assets} type={AssetType.US_STOCK} title="US Equities" onEdit={handleEditAsset} onDelete={handleDeleteAsset} />
              <AssetList assets={assets} type={AssetType.BANK_ACCOUNT} title="Cash & Bank" onEdit={handleEditAsset} onDelete={handleDeleteAsset} />
            </div>
            
            {assets.length === 0 && (
              <div className="text-center py-24 bg-white rounded-[4rem] border-4 border-dashed border-slate-100 shadow-sm">
                <div className="bg-indigo-50 w-28 h-28 rounded-[3rem] flex items-center justify-center mx-auto mb-8 text-indigo-600 animate-bounce shadow-inner">
                  <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-slate-500 font-black text-3xl mb-8">Empty Portfolio</p>
                <button 
                  onClick={openAddModal}
                  className="px-12 py-6 bg-indigo-600 text-white rounded-[2.5rem] font-black text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-[0_25px_60px_rgba(79,70,229,0.3)] transition-all hover:-translate-y-2 active:scale-95"
                >
                  Create Your First Entry
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <AssetModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingAsset(null); }}
        onSave={handleSaveAsset}
        editingAsset={editingAsset}
      />

      {/* Persistent Bottom Bar (Mobile Navigation) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-3xl border-t border-slate-200 px-8 py-5 flex justify-between items-center md:hidden z-40 shadow-2xl">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${activeTab === 'dashboard' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}>
           <svg className="w-6 h-6" fill={activeTab === 'dashboard' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0 a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
           <span className="text-[10px] font-black uppercase tracking-tighter">Home</span>
        </button>
        <button onClick={() => setActiveTab('assets')} className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${activeTab === 'assets' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}>
           <svg className="w-6 h-6" fill={activeTab === 'assets' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
           <span className="text-[10px] font-black uppercase tracking-tighter">Vault</span>
        </button>
        <button 
          onClick={openAddModal}
          className="bg-indigo-600 p-5 rounded-full text-white -mt-16 shadow-[0_15px_40px_rgba(79,70,229,0.4)] active:scale-90 transition-all border-8 border-slate-50 group"
        >
           <svg className="w-6 h-6 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-slate-400">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
           <span className="text-[10px] font-black uppercase tracking-tighter">Reports</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-slate-400">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
           <span className="text-[10px] font-black uppercase tracking-tighter">Profile</span>
        </button>
      </div>
    </div>
  );
};

export default App;
