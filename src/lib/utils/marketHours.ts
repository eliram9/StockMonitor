// Optimized market hours utility with best practices

import { MARKET_CONFIG, 
         logger, 
         type MarketStatus,
         type MarketState, 
         type PollingConfig, 
         type DataStatus, 
         type NextMarketChange } from './marketConfig';
import { isHoliday } from 'nyse-holidays';

/**
 * Safely get current Eastern Time with error handling
 * @returns Date object in Eastern Time or current time as fallback
 */
function getEasternTime(): Date {
    try {
        const now = new Date();
        return new Date(now.toLocaleString("en-US", { timeZone: MARKET_CONFIG.TIMEZONE }));
    } catch (error) {
        logger.error('Failed to get Eastern Time, using local time as fallback', error);
        return new Date();
    }
}

/**
 * Get formatted Eastern Time string
 * @returns string - formatted Eastern Time (e.g., "9:30 AM ET")
 */
function getFormattedEasternTime(): string {
    try {
        const easternTime = getEasternTime();
        return easternTime.toLocaleTimeString('en-US', {
            timeZone: MARKET_CONFIG.TIMEZONE,
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }) + ' ET';
    } catch (error) {
        logger.error('Failed to format Eastern Time', error);
        return 'Unknown ET';
    }
}

/**
 * Check if current date is a NYSE holiday
 * @returns boolean - true if today is a holiday, false otherwise
 */
function isCurrentDateHoliday(): boolean {
    try {
        const easternTime = getEasternTime();
        return isHoliday(easternTime);
    } catch (error) {
        logger.error('Failed to check holiday status', error);
        return false; // Default to not holiday on error
    }
}

/**
 * Get comprehensive market information including holiday status
 * @returns object with current time, holiday status, and formatted strings
 */
export function getCurrentMarketInfo() {
    const easternTime = getEasternTime();
    const isHolidayToday = isCurrentDateHoliday();
    const formattedTime = getFormattedEasternTime();
    
    return {
        easternTime,
        isHoliday: isHolidayToday,
        formattedTime,
        dayOfWeek: easternTime.getDay(),
        currentTimeInMinutes: easternTime.getHours() * 60 + easternTime.getMinutes(),
        isWeekday: easternTime.getDay() >= MARKET_CONFIG.TRADING_DAYS.MIN && 
                   easternTime.getDay() <= MARKET_CONFIG.TRADING_DAYS.MAX
    };
}

/**
 * Check if the current time is during regular market hours
 * @returns boolean - true if regular market is open, false if closed
 */
export function isMarketOpen(): boolean {
    const marketInfo = getCurrentMarketInfo();
    
    // Check if it's a holiday
    if (marketInfo.isHoliday) {
        logger.market('Market closed: NYSE Holiday');
        return false;
    }
    
    // Check if it's a weekday
    if (!marketInfo.isWeekday) {
        logger.market('Market closed: Weekend');
        return false;
    }
    
    const isWithinHours = marketInfo.currentTimeInMinutes >= MARKET_CONFIG.MARKET_OPEN && 
                         marketInfo.currentTimeInMinutes <= MARKET_CONFIG.MARKET_CLOSE;
    
    if (!isWithinHours) {
        logger.market(`Market closed: Current time ${marketInfo.formattedTime} (Market: 9:30-16:30)`);
    } else {
        logger.market(`Market open: Current time ${marketInfo.formattedTime}`);
    }
    
    return isWithinHours;
}

/**
 * Check if we're in the final capture window (4:31 PM ET)
 * @returns boolean - true if it's 4:31 PM ET on a weekday
 */
export function isFinalCaptureWindow(): boolean {
    const easternTime = getEasternTime();
    const dayOfWeek = easternTime.getDay();
    
    if (dayOfWeek < MARKET_CONFIG.TRADING_DAYS.MIN || dayOfWeek > MARKET_CONFIG.TRADING_DAYS.MAX) {
        return false;
    }
    
    const currentTimeInMinutes = easternTime.getHours() * 60 + easternTime.getMinutes();
    const isFinalWindow = currentTimeInMinutes === MARKET_CONFIG.FINAL_CLOSE;
    
    if (isFinalWindow) {
        logger.market('Final capture window: Capturing closing prices at 4:31 PM ET');
    }
    
    return isFinalWindow;
}

/**
 * Get current market status
 * @returns MarketStatus enum value
 */
export function getMarketStatus(): MarketStatus {
    const marketInfo = getCurrentMarketInfo();
    
    // Holiday check (highest priority)
    if (marketInfo.isHoliday) {
        return 'MARKET_CLOSED'; // Holidays are treated as market closed
    }
    
    // Weekend check
    if (!marketInfo.isWeekday) {
        return 'WEEKEND';
    }
    
    if (isMarketOpen()) {
        return 'MARKET_OPEN';
    }
    
    if (isFinalCaptureWindow()) {
        return 'FINAL_CAPTURE';
    }
    
    return 'MARKET_CLOSED';
}

/**
 * Get smart polling configuration based on market status
 * @returns PollingConfig object with intervals and flags
 */
export function getPollingConfig(): PollingConfig {
  const status = getMarketStatus();
  
  switch (status) {
    case 'MARKET_OPEN':
      logger.polling('Smart polling: Market open - 1 minute intervals');
      return {
        priceInterval: MARKET_CONFIG.POLLING.MARKET_OPEN,
        newsInterval: MARKET_CONFIG.POLLING.NEWS_MARKET_OPEN,
        shouldPoll: true,
      };
      
    case 'FINAL_CAPTURE':
      logger.polling('Smart polling: Final capture window - capturing closing prices');
      return {
        priceInterval: MARKET_CONFIG.POLLING.FINAL_CAPTURE,
        newsInterval: MARKET_CONFIG.POLLING.NEWS_MARKET_OPEN,
        shouldPoll: true,
      };
      
    case 'MARKET_CLOSED':
    case 'WEEKEND':
    default:
      logger.polling('Smart polling: Market closed - no polling (showing cached data)');
      return {
        priceInterval: null,
        newsInterval: MARKET_CONFIG.POLLING.NEWS_MARKET_CLOSED,
        shouldPoll: false,
      };
  }
}

/**
 * Get time until market opens (memoized calculation)
 * @returns object with time breakdown until market opens
 */
export function getTimeUntilMarketOpen(): { days: number; hours: number; minutes: number; totalMinutes: number } {
  const easternTime = getEasternTime();
  
  // If market is currently open, return 0
  if (isMarketOpen()) {
    return { days: 0, hours: 0, minutes: 0, totalMinutes: 0 };
  }
  
  // Calculate next market open time
  const nextOpen = new Date(easternTime);
  nextOpen.setHours(9, 30, 0, 0); // Set to 9:30 AM Eastern
  
  const currentTimeInMinutes = easternTime.getHours() * 60 + easternTime.getMinutes();
  
  // If it's past market hours today, weekend, or holiday, move to next trading day
  if (currentTimeInMinutes > MARKET_CONFIG.MARKET_CLOSE || 
      easternTime.getDay() === 0 || easternTime.getDay() === 6 || 
      getCurrentMarketInfo().isHoliday) {
    do {
      nextOpen.setDate(nextOpen.getDate() + 1);
    } while (nextOpen.getDay() === 0 || nextOpen.getDay() === 6 || isHoliday(nextOpen)); // Skip weekends and holidays
    
    nextOpen.setHours(9, 30, 0, 0);
  }
  
  // Calculate difference
  const diffMs = nextOpen.getTime() - easternTime.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  const days = Math.floor(diffMinutes / (24 * 60));
  const hours = Math.floor((diffMinutes % (24 * 60)) / 60);
  const minutes = diffMinutes % 60;
  
  return { days, hours, minutes, totalMinutes: diffMinutes };
}

/**
 * Get milliseconds until next market open
 * @returns number - milliseconds until market opens
 */
export function getMillisecondsUntilMarketOpen(): number {
  const timeUntil = getTimeUntilMarketOpen();
  return timeUntil.totalMinutes * 60 * 1000;
}

/**
 * SMART SCHEDULER 🚀 - Calculates exactly when market status will change
 * Replaces dumb every-minute checking with precise event-driven timing
 * @returns NextMarketChange with milliseconds until next status change
 */
export function getNextMarketStateChange(): NextMarketChange {
  const easternTime = getEasternTime();
  const currentStatus = getMarketStatus();
  const currentDay = easternTime.getDay();
  const currentTimeInMinutes = easternTime.getHours() * 60 + easternTime.getMinutes();
  
  try {
    // Weekend - next change is Monday 9:30 AM
    if (currentDay === 0 || currentDay === 6) {
      const nextMonday = new Date(easternTime);
      const daysUntilMonday = currentDay === 0 ? 1 : 2;
      nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
      nextMonday.setHours(9, 30, 0, 0);
      
      const milliseconds = nextMonday.getTime() - easternTime.getTime();
      logger.scheduler(`Next change: Monday market open in ${Math.round(milliseconds/1000/60/60)} hours`);
      
      return {
        milliseconds,
        nextStatus: 'MARKET_OPEN',
        description: 'Market opens Monday at 9:30 AM ET'
      };
    }
    
    // Weekday logic - reuse existing functions
    const today = new Date(easternTime);
    
    // Before market open
    if (currentTimeInMinutes < MARKET_CONFIG.MARKET_OPEN) {
      const marketOpen = new Date(today);
      marketOpen.setHours(9, 30, 0, 0);
      const milliseconds = marketOpen.getTime() - easternTime.getTime();
      
      logger.scheduler(`Next change: Market opens in ${Math.round(milliseconds/1000/60)} minutes`);
      return {
        milliseconds,
        nextStatus: 'MARKET_OPEN',
        description: 'Market opens today at 9:30 AM ET'
      };
    }
    
    // During market hours
    if (currentTimeInMinutes >= MARKET_CONFIG.MARKET_OPEN && 
        currentTimeInMinutes < MARKET_CONFIG.MARKET_CLOSE) {
      const marketClose = new Date(today);
      marketClose.setHours(16, 30, 0, 0);
      const milliseconds = marketClose.getTime() - easternTime.getTime();
      
      logger.scheduler(`Next change: Market closes in ${Math.round(milliseconds/1000/60)} minutes`);
      return {
        milliseconds,
        nextStatus: 'FINAL_CAPTURE',
        description: 'Market closes today at 4:30 PM ET'
      };
    }
    
    // At 4:30 PM (market close) - next is final capture at 4:31
    if (currentTimeInMinutes === MARKET_CONFIG.MARKET_CLOSE) {
      const finalCapture = new Date(today);
      finalCapture.setHours(16, 31, 0, 0);
      const milliseconds = finalCapture.getTime() - easternTime.getTime();
      
      logger.scheduler('Next change: Final capture in 1 minute');
      return {
        milliseconds,
        nextStatus: 'FINAL_CAPTURE',
        description: 'Final capture window at 4:31 PM ET'
      };
    }
    
    // After market close - next market open
    const nextMarketDay = new Date(today);
    if (currentDay === 5) {
      // Friday - skip to Monday
      nextMarketDay.setDate(nextMarketDay.getDate() + 3);
    } else {
      // Other weekdays - next day
      nextMarketDay.setDate(nextMarketDay.getDate() + 1);
    }
    
    // Skip holidays as well
    while (nextMarketDay.getDay() === 0 || nextMarketDay.getDay() === 6 || isHoliday(nextMarketDay)) {
      nextMarketDay.setDate(nextMarketDay.getDate() + 1);
    }
    
    nextMarketDay.setHours(9, 30, 0, 0);
    
    const milliseconds = nextMarketDay.getTime() - easternTime.getTime();
    const dayName = currentDay === 5 ? 'Monday' : 'tomorrow';
    
    logger.scheduler(`Next change: Market opens ${dayName} in ${Math.round(milliseconds/1000/60/60)} hours`);
    return {
      milliseconds,
      nextStatus: 'MARKET_OPEN',
      description: `Market opens ${dayName} at 9:30 AM ET`
    };
    
  } catch (error) {
    logger.error('Smart scheduler failed, using fallback', error);
    
    // Fallback: check again in 1 minute
    return {
      milliseconds: 60000,
      nextStatus: currentStatus,
      description: 'Fallback check in 1 minute'
    };
  }
}

/**
 * Get human-readable market status string
 * @returns formatted status string with emoji
 */
export function getMarketStatusString(): string {
  const status = getMarketStatus();
  const timeUntil = getTimeUntilMarketOpen();
  
  switch (status) {
    case 'MARKET_OPEN':
      return "🟢 Market is OPEN";
      
    case 'FINAL_CAPTURE':
      return "🔔 Capturing closing prices...";
      
    case 'WEEKEND':
    case 'MARKET_CLOSED':
      if (timeUntil.days > 0) {
        return `🔴 Market closed - Opens in ${timeUntil.days}d ${timeUntil.hours}h ${timeUntil.minutes}m`;
      } else if (timeUntil.hours > 0) {
        return `🔴 Market closed - Opens in ${timeUntil.hours}h ${timeUntil.minutes}m`;
      } else {
        return `🔴 Market closed - Opens in ${timeUntil.minutes}m`;
      }
      
    default:
      return "🔴 Market status unknown";
  }
}

/**
 * Get data status information
 * @returns DataStatus object with current status
 */
export function getDataStatus(): DataStatus {
  const status = getMarketStatus();
  const now = new Date();
  
  switch (status) {
    case 'MARKET_OPEN':
      return {
        status: '🟢 LIVE',
        isLive: true,
        lastUpdate: now.toLocaleTimeString('en-US', { 
          timeZone: MARKET_CONFIG.TIMEZONE,
          hour12: false 
        })
      };
      
    case 'FINAL_CAPTURE':
      return {
        status: '🔔 UPDATING',
        isLive: true,
        lastUpdate: now.toLocaleTimeString('en-US', { 
          timeZone: MARKET_CONFIG.TIMEZONE,
          hour12: false 
        })
      };
      
    case 'MARKET_CLOSED':
    case 'WEEKEND':
    default:
      return {
        status: '🔴 CLOSED',
        isLive: false,
        lastUpdate: now.toLocaleTimeString('en-US', { 
          timeZone: MARKET_CONFIG.TIMEZONE,
          hour12: false 
        })
      };
  }
}

/**
 * Get complete market state
 * @returns MarketState object with all market information
 */
export function getMarketState(): MarketState {
  const status = getMarketStatus();
  const pollingConfig = getPollingConfig();
  const dataStatus = getDataStatus();
  const timeUntilOpen = getTimeUntilMarketOpen();
  
  return {
    status,
    isOpen: status === 'MARKET_OPEN' || status === 'FINAL_CAPTURE',
    pollingConfig,
    dataStatus,
    timeUntilOpen
  };
}

/**
 * Format polling interval for display
 * @param interval - Polling interval in milliseconds
 * @returns formatted string
 */
export function formatPollingInterval(interval: number | null): string {
  if (interval === null) return 'Disabled';
  
  const minutes = Math.floor(interval / (1000 * 60));
  if (minutes < 1) {
    const seconds = Math.floor(interval / 1000);
    return `${seconds}s`;
  }
  
  return `${minutes}m`;
}

/**
 * Get price polling interval
 * @returns number | null - polling interval in milliseconds
 */
export function getPricePollingInterval(): number | null {
  return getPollingConfig().priceInterval;
}

/**
 * Get news polling interval
 * @returns number - polling interval in milliseconds
 */
export function getNewsPollingInterval(): number {
  return getPollingConfig().newsInterval;
}

/**
 * Get detailed market status information including holiday details
 * @returns object with comprehensive market status information
 */
export function getDetailedMarketStatus() {
    const marketInfo = getCurrentMarketInfo();
    const status = getMarketStatus();
    
    return {
        status,
        isOpen: status === 'MARKET_OPEN',
        isHoliday: marketInfo.isHoliday,
        isWeekend: !marketInfo.isWeekday,
        currentTime: marketInfo.formattedTime,
        easternTime: marketInfo.easternTime,
        dayOfWeek: marketInfo.dayOfWeek,
        currentTimeInMinutes: marketInfo.currentTimeInMinutes,
        isWithinMarketHours: marketInfo.currentTimeInMinutes >= MARKET_CONFIG.MARKET_OPEN && 
                             marketInfo.currentTimeInMinutes <= MARKET_CONFIG.MARKET_CLOSE,
        marketOpenTime: '9:30 AM ET',
        marketCloseTime: '4:30 PM ET',
        reason: marketInfo.isHoliday ? 'NYSE Holiday' : 
                !marketInfo.isWeekday ? 'Weekend' :
                !(marketInfo.currentTimeInMinutes >= MARKET_CONFIG.MARKET_OPEN && 
                  marketInfo.currentTimeInMinutes <= MARKET_CONFIG.MARKET_CLOSE) ? 'Outside Market Hours' :
                'Market Open'
    };
}