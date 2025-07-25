// Centralized market configuration and constants

/**
 * Market Configuration
 * Centralized place for all market-related constants and settings
 */

export const MARKET_CONFIG = {
    // Market Hours (in minutes from midnight ET)
    MARKET_OPEN: 9 * 60 + 30,    // 9:30 AM = 570 minutes
    MARKET_CLOSE: 16 * 60 + 30,  // 4:30 PM = 990 minutes
    FINAL_CLOSE: 16 * 60 + 31,   // 4:31 PM = 991 minutes (for final capture)

    // Days of week (0 = Sunday, 6 = Saturday)
    TRADING_DAYS: {
        MIN: 1, // Monday
        MAX: 5, // Friday
    },

    // Polling Intervals (in milliseconds)
    POLLING: {
        MARKET_OPEN: 60000,        // 1 minute during market hours
        FINAL_CAPTURE: 60000,      // 1 minute for final capture after 4:30 PM
        NEWS_MARKET_OPEN: 15 * 60 * 1000,  // 15 minutes for news during market
        NEWS_MARKET_CLOSED: 2 * 60 * 60 * 1000,  // 2 hours for news when closed
    },

    // Timezone
    TIMEZONE: 'America/New_York',
    
    // Default Tickers
    DEFAULT_TICKERS: ['TSLA', 'OKLO'],
    
    // API Settings
    API: {
        DATA_SOURCE: 'Finnhub API',
        RETRY_ATTEMPTS: 3,
        TIMEOUT: 10000,
    },
} as const;

/**
* Market Status Types
*/
export type MarketStatus = 
| 'MARKET_OPEN'
| 'MARKET_CLOSED' 
| 'FINAL_CAPTURE'
| 'WEEKEND';

/**
* Data Status Types
*/
export interface DataStatus {
    status: '🟢 LIVE' | '🔔 UPDATING' | '🔴 CLOSED';
    isLive: boolean;
    lastUpdate: string;
}

/**
* Polling Configuration
*/
export interface PollingConfig {
    priceInterval: number | null;
    newsInterval: number;
    shouldPoll: boolean;
}

/**
* Market State Interface
*/
export interface MarketState {
    status: MarketStatus;
    isOpen: boolean;
    pollingConfig: PollingConfig;
    dataStatus: DataStatus;
    timeUntilOpen: {
        days: number;
        hours: number;
        minutes: number;
        totalMinutes: number;
    };
}

/**
* Smart Scheduler Result - Simple and Clean! 🚀
*/
export interface NextMarketChange {
    milliseconds: number;
    nextStatus: MarketStatus;
    description: string;
}

/**
* Environment-based logging utility
*/
export const logger = {
    info: (message: string, ...args: unknown[]) => {
        // Empty - removed console.log statements
    },
    warn: (message: string, ...args: unknown[]) => {
        if (process.env.NODE_ENV === 'development') {
            console.warn(`⚠️ ${message}`, ...args);
        }
    },
    error: (message: string, ...args: unknown[]) => {
        console.error(`❌ ${message}`, ...args);
    },
    market: (message: string, ...args: unknown[]) => {
        // Empty - removed console.log statements
    },
    polling: (message: string, ...args: unknown[]) => {
        // Empty - removed console.log statements
    },
    scheduler: (message: string, ...args: unknown[]) => {
        // Empty - removed console.log statements
    },
};