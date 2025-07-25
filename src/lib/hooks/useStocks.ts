// Optimized useStocks hook with SMART SCHEDULER! 🚀

'use client';

import { useQuery, gql, ApolloError } from '@apollo/client';
import { useEffect, useCallback, useMemo, useRef, useReducer } from 'react';
import type { Stock } from '../graphql/types';
import { 
  getMarketState,
  getMillisecondsUntilMarketOpen,
  getNextMarketStateChange
} from '../utils/marketHours';
import { 
  MARKET_CONFIG, 
  logger,
  type MarketState,
  type DataStatus,
  type PollingConfig
} from '../utils/marketConfig';

// GraphQL query to fetch stocks
const GET_STOCKS = gql`
  query GetStocks($tickers: [String!]!) {
    stocks(tickers: $tickers) {
      ticker
      price
      change
      changePercent
      logo
      name
      summaries {
        id
        timestamp
        text
        headlines
        image
        source
        url
        sourceLogoUrl
      }
    }
  }
`;

// TypeScript interfaces
interface StocksData {
  stocks: Stock[];
}

interface StocksVariables {
  tickers: string[];
}

// State management with useReducer for better performance
interface StocksState {
  marketState: MarketState;
  smartTimeoutId: NodeJS.Timeout | null;
  lastUpdateTime: Date | null;
  error: ApolloError | null;
}

type StocksAction = 
  | { type: 'UPDATE_MARKET_STATE'; payload: MarketState }
  | { type: 'SET_SMART_TIMEOUT'; payload: NodeJS.Timeout | null }
  | { type: 'SET_LAST_UPDATE'; payload: Date }
  | { type: 'SET_ERROR'; payload: ApolloError | null }
  | { type: 'CLEAR_SMART_TIMEOUT' };

function stocksReducer(state: StocksState, action: StocksAction): StocksState {
  switch (action.type) {
    case 'UPDATE_MARKET_STATE':
      return { ...state, marketState: action.payload };
    case 'SET_SMART_TIMEOUT':
      return { ...state, smartTimeoutId: action.payload };
    case 'SET_LAST_UPDATE':
      return { ...state, lastUpdateTime: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_SMART_TIMEOUT':
      return { ...state, smartTimeoutId: null };
    default:
      return state;
  }
}

// Initial state
const initialState: StocksState = {
  marketState: getMarketState(),
  smartTimeoutId: null,
  lastUpdateTime: null,
  error: null,
};

// Return type interface
interface UseStocksReturn {
  stocks: Stock[];
  loading: boolean;
  error: ApolloError | null;
  refetch: () => Promise<{ data?: StocksData; error?: ApolloError }>;
  marketStatus: string;
  dataStatus: DataStatus;
  isMarketOpen: boolean;
  pollingConfig: PollingConfig;
  lastUpdateTime: Date | null;
  debug?: {
    pricePolling: string;
    newsPolling: string;
    smartScheduled: boolean;
    nextChangeIn?: string;
  };
}

/**
 * Smart scheduler hook for market state changes
 */
function useSmartScheduler(
  onMarketStateChange: () => void,
  dispatch: React.Dispatch<StocksAction>
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleNextCheck = useCallback(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Get EXACT timing for next market state change
    const nextChange = getNextMarketStateChange();
    
    if (nextChange.milliseconds > 0) {
      logger.scheduler();
      
      const timeoutId = setTimeout(() => {
        logger.scheduler();
        onMarketStateChange();
        
        // Schedule the NEXT change after this one
        scheduleNextCheck();
        
        dispatch({ type: 'CLEAR_SMART_TIMEOUT' });
      }, nextChange.milliseconds);
      
      timeoutRef.current = timeoutId;
      dispatch({ type: 'SET_SMART_TIMEOUT', payload: timeoutId });
    }
  }, [onMarketStateChange, dispatch]);

  const clearSchedule = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      dispatch({ type: 'CLEAR_SMART_TIMEOUT' });
    }
  }, [dispatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { scheduleNextCheck, clearSchedule };
}

/**
 * Optimized useStocks hook with SMART SCHEDULER! 🚀
 */
export function useStocks(tickers: string[] = [...MARKET_CONFIG.DEFAULT_TICKERS]): UseStocksReturn {
  const [state, dispatch] = useReducer(stocksReducer, initialState);
  
  // Update market status with smart scheduling
  const updateMarketStatus = useCallback(() => {
    const newMarketState = getMarketState();
    dispatch({ type: 'UPDATE_MARKET_STATE', payload: newMarketState });
    dispatch({ type: 'SET_LAST_UPDATE', payload: new Date() });
    
    logger.info();
    logger.polling();
  }, []);

  // Smart scheduler for market state changes
  const { scheduleNextCheck, clearSchedule } = useSmartScheduler(updateMarketStatus, dispatch);

  // Apollo Query with optimized polling
  const { loading, error, data, refetch, startPolling, stopPolling } = useQuery<StocksData, StocksVariables>(
    GET_STOCKS,
    {
      variables: { tickers },
      pollInterval: state.marketState.pollingConfig.priceInterval || undefined,
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true,
      fetchPolicy: 'cache-first',
    }
  );

  // Update error state when Apollo error changes
  useEffect(() => {
    dispatch({ type: 'SET_ERROR', payload: error || null });
  }, [error]);

  // Smart polling control based on market hours
  useEffect(() => {
    if (state.marketState.pollingConfig.priceInterval && state.marketState.pollingConfig.priceInterval > 0) {
      logger.info();
      startPolling(state.marketState.pollingConfig.priceInterval);
    } else {
      logger.info();
      stopPolling();
    }

    // Schedule next market state change
    scheduleNextCheck();
    
    return () => {
      clearSchedule();
      stopPolling();
    };
  }, [state.marketState.pollingConfig.priceInterval, startPolling, stopPolling, scheduleNextCheck, clearSchedule]);

  // Enhanced refetch with smart context awareness
  const smartRefetch = useCallback(() => {
    if (state.marketState.isOpen) {
      logger.info();
    } else {
      logger.info();
    }
    return refetch();
  }, [refetch, state.marketState.isOpen]);

  // Memoize debug info to prevent unnecessary re-renders
  const debug = useMemo(() => ({
    pricePolling: state.marketState.pollingConfig.priceInterval ? 
      `${state.marketState.pollingConfig.priceInterval/1000}s` : 
      'STOPPED',
    newsPolling: `${state.marketState.pollingConfig.newsInterval/1000}s`,
    smartScheduled: !!state.smartTimeoutId,
    nextChangeIn: state.smartTimeoutId ? 
      `${Math.round(getMillisecondsUntilMarketOpen()/1000/60)} minutes` : 
      undefined
  }), [state.marketState.pollingConfig, state.smartTimeoutId]);

  return {
    stocks: data?.stocks || [],
    loading,
    error: state.error,
    refetch: smartRefetch,
    marketStatus: state.marketState.status,
    dataStatus: state.marketState.dataStatus,
    isMarketOpen: state.marketState.isOpen,
    pollingConfig: state.marketState.pollingConfig,
    lastUpdateTime: state.lastUpdateTime,
    debug
  };
}