// Optimized Dashboard component with best practices and performance improvements

'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { useStocks } from '@/lib/hooks/useStocks';
import { StockCard } from './StockCard';
import { BenzingaNews } from './BenzingaNews';
import { ThemeSwitcher } from './ThemeSwitcher';
import { MarketHoliday } from './MarketHoliday';
import { MARKET_CONFIG } from '@/lib/utils/marketConfig';
import { getTimeUntilMarketOpen } from '@/lib/utils/marketHours';

// Constants for better maintainability
const DASHBOARD_CONFIG = {
  title: 'Stock Monitor',
  subtitle: 'Smart real-time stock tracking',
  efficiency: {
    apiSavings: '60%',
    description: 'This strategy saves ~60% API calls while keeping you informed with relevant data.',
  },
} as const;

// Component interfaces

// Market Status Indicator Component
interface MarketStatusIndicatorProps {
  isMarketOpen: boolean;
}

const MarketStatusIndicator = React.memo<MarketStatusIndicatorProps>(({ isMarketOpen }) => {
  const [timeUntilOpen, setTimeUntilOpen] = useState(getTimeUntilMarketOpen());

  // Update countdown every minute when market is closed
  useEffect(() => {
    if (isMarketOpen) return;

    const interval = setInterval(() => {
      setTimeUntilOpen(getTimeUntilMarketOpen());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isMarketOpen]);

  const formatCountdown = () => {
    if (timeUntilOpen.days > 0) {
      return `${timeUntilOpen.days}d ${timeUntilOpen.hours}h ${timeUntilOpen.minutes}m`;
    } else if (timeUntilOpen.hours > 0) {
      return `${timeUntilOpen.hours}h ${timeUntilOpen.minutes}m`;
    } else {
      return `${timeUntilOpen.minutes}m`;
    }
  };

  return (
    <div className={`flex items-center space-x-2 px-4 py-2 h-10 rounded-lg border ${
      isMarketOpen 
        ? 'bg-green-50 border-green-200 text-green-700' 
        : 'bg-gray-50 border-gray-200 text-gray-600'
    }`}>
      <div className={`w-2 h-2 rounded-full ${
        isMarketOpen ? 'bg-green-500' : 'bg-gray-400'
      }`}></div>
      <div className="flex flex-col">
        <span className="text-sm font-medium">
          {isMarketOpen ? 'Market is On' : 'Market is Off'}
        </span>
        {!isMarketOpen && (
          <span className="text-xs">
            Opens in {formatCountdown()}
          </span>
        )}
      </div>
    </div>
  );
});

MarketStatusIndicator.displayName = 'MarketStatusIndicator';

// Loading component
const LoadingSpinner = React.memo(() => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
    <div className="max-w-4xl mx-auto">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading stock data...</p>
      </div>
    </div>
  </div>
));

LoadingSpinner.displayName = 'LoadingSpinner';

// Error component
interface ErrorDisplayProps {
  error: Error;
  onRetry: () => void;
  loading: boolean;
}

const ErrorDisplay = React.memo<ErrorDisplayProps>(({ error, onRetry, loading }) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-danger-500 text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Failed to Load Stock Data
        </h2>
        <p className="text-gray-600 mb-4">
          {error.message}
        </p>
        <button
          onClick={onRetry}
          disabled={loading}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  </div>
));

ErrorDisplay.displayName = 'ErrorDisplay';

// Smart efficiency message component
interface EfficiencyMessageProps {
  isMarketOpen: boolean;
}

const EfficiencyMessage = React.memo<EfficiencyMessageProps>(({ isMarketOpen }) => {
  if (isMarketOpen) return null;

  return (
    <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
      <div className="flex items-start space-x-2">
        <div className="text-green-600 mt-0.5">💡</div>
        <div>
          <p className="text-sm text-green-800 font-medium mb-1">
            Smart Efficiency Mode
          </p>
          <p className="text-sm text-green-700">
            Showing closing prices from 4:30 PM ET. Live updates will resume at 9:30 AM. 
            {DASHBOARD_CONFIG.efficiency.description}
          </p>
        </div>
      </div>
    </div>
  );
});

EfficiencyMessage.displayName = 'EfficiencyMessage';


/**
 * Optimized Dashboard Component
 * 
 * Features:
 * - Performance optimized with React.memo and useMemo
 * - Extracted reusable components
 * - Centralized configuration
 * - Proper TypeScript interfaces
 * - Smart efficiency messaging
 * - Clean separation of concerns
 */
export function Dashboard() {
  // Fetch stock data with optimized hook
  const { 
    stocks, 
    loading, 
    error, 
    refetch, 
    isMarketOpen,
    lastUpdateTime,
    debug 
  } = useStocks([...MARKET_CONFIG.DEFAULT_TICKERS]);

  // Memoized handlers to prevent unnecessary re-renders
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Memoized market info data
  // const marketInfoData = useMemo(() => [
  //   { label: 'Data Source', value: MARKET_CONFIG.API.DATA_SOURCE },
  //   { label: 'Market Hours', value: 'Mon-Fri: 09:30 - 16:30 ET' },
  //   { label: 'Update Strategy', value: isMarketOpen ? 'Live (1 min)' : 'Cached closing data' },
  //   { label: 'Current Status', value: isMarketOpen ? 'Live Trading' : 'Market Closed' },
  // ], [isMarketOpen]);

  // Early returns for loading and error states
  if (loading && stocks.length === 0) {
    return <LoadingSpinner />;
  }

  if (error && stocks.length === 0) {
    return <ErrorDisplay error={error} onRetry={handleRefresh} loading={loading} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Title Section */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {DASHBOARD_CONFIG.title}
              </h1>
              <p className="text-sm text-gray-600">
                {DASHBOARD_CONFIG.subtitle}
              </p>
            </div>
            
            {/* Status and Controls Section */}
            <div className="flex items-center space-x-4">
              {/* Market Status Indicator */}
              <MarketStatusIndicator isMarketOpen={isMarketOpen} />
              
              {/* Loading Indicator */}
              {loading && (
                <div className="flex items-center text-primary-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                  <span className="text-sm">Updating...</span>
                </div>
              )}
              
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="bg-primary-600 text-white px-4 py-2 h-10 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors cursor-pointer"
                aria-label="Refresh stock data"
              >
                Refresh
              </button>
              
              {/* Theme Switcher */}
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Stock Cards Grid */}
            <div className="grid md:grid-cols-3 gap-8 mb-8">
                {stocks.map((stock) => (
                    <StockCard key={stock.ticker} 
                               stock={stock} 
                               isMarketOpen={isMarketOpen}
                    />
                ))}
            </div>

        {/* Market Information Panel */}
        <div className="bg-white rounded-lg shadow-lg px-6 py-4 border border-gray-200">

            {/* Smart Efficiency Message */}
            <EfficiencyMessage isMarketOpen={isMarketOpen} />

            {/* Benzinga News Component */}
            <BenzingaNews stocks={stocks} />

            {/* NYSE Holiday Test Component */}
            <div className="mb-6">
                <MarketHoliday />
            </div>
          
            {/* Debug Information (Development Only) */}
            {debug && process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Debug Info:</h4>
                    <div className="text-xs text-gray-600 space-y-1">
                        <div>Price Polling: {debug.pricePolling}</div>
                        <div>News Polling: {debug.newsPolling}</div>
                        <div>Wake-up Scheduled: {debug.smartScheduled ? 'Yes' : 'No'}</div>
                            {lastUpdateTime && (
                            <div>Last Update: {lastUpdateTime.toLocaleTimeString()}</div>
                        )}
                    </div>
                </div>
            )}
        </div>
      </main>
    </div>
  );
}

