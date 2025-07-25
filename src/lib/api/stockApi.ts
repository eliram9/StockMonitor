// // Enhanced stock API with separate price and news fetching strategies + company profiles

import type { Stock } from '../graphql/types';

/**
 * Interface for Finnhub Stock Quote Response
 */
interface FinnhubQuote {
    c: number;  // Current price
    d: number;  // Change
    dp: number; // Percent change
    h: number;  // High price of the day
    l: number;  // Low price of the day
    o: number;  // Open price of the day
    pc: number; // Previous close price
    t: number;  // Timestamp
}

/**
 * Interface for Finnhub News Response
 */
interface FinnhubNewsItem {
    category: string;       
    datetime: number;       // Unix timestamp
    headline: string;       
    id: number;            
    image: string;         
    related: string;       
    source: string;        
    summary: string;       
    url: string;          
}

/**
 * Interface for Finnhub Company Profile Response
 */
interface FinnhubCompanyProfile {
    country: string;
    currency: string;
    exchange: string;
    name: string;           // Company name
    logo: string;           // Company logo URL
    ticker: string;
    weburl: string;
    finnhubIndustry: string;
}

/**
 * Processed News Summary Interface - UPDATED! 🎯
 */
interface ProcessedNewsSummary {
    id: string;
    timestamp: string;
    text: string;
    headlines: string[];
    image?: string;
    source?: string;
    url?: string;
    sourceLogoUrl?: string;  // ← ADDED! Source logo URL
}

// SOURCE LOGOS MAPPING - NEW! 🎯
const SOURCE_LOGOS: Record<string, string> = {
    "Yahoo Finance": "https://logo.clearbit.com/finance.yahoo.com",
    "Reuters": "https://logo.clearbit.com/reuters.com", 
    "MarketWatch": "https://logo.clearbit.com/marketwatch.com",
    "Benzinga": "https://logo.clearbit.com/benzinga.com",
    "Seeking Alpha": "https://logo.clearbit.com/seekingalpha.com",
    "The Motley Fool": "https://logo.clearbit.com/fool.com",
    "Bloomberg": "https://logo.clearbit.com/bloomberg.com",
    "CNBC": "https://logo.clearbit.com/cnbc.com",
    "CNN Business": "https://logo.clearbit.com/cnn.com",
    "Business Wire": "https://logo.clearbit.com/businesswire.com",
    "PR Newswire": "https://logo.clearbit.com/prnewswire.com",
    "Zacks": "https://logo.clearbit.com/zacks.com",
    "TheStreet": "https://logo.clearbit.com/thestreet.com",
    "Barron's": "https://logo.clearbit.com/barrons.com",
    "Wall Street Journal": "https://logo.clearbit.com/wsj.com",
    "Financial Times": "https://logo.clearbit.com/ft.com",
    "Forbes": "https://logo.clearbit.com/forbes.com",
    "TechCrunch": "https://logo.clearbit.com/techcrunch.com",
    "Yahoo": "https://logo.clearbit.com/yahoo.com",
};

// News cache to avoid unnecessary API calls - FIXED TYPES! 🎯
const newsCache = new Map<string, { 
    data: ProcessedNewsSummary[],  // ✅ Fixed: specific type instead of any[]
    timestamp: number, 
    lastPrice: number 
}>();

// Company profile cache (logos/names don't change often)
const companyCache = new Map<string, { 
    profile: { name: string; logo: string }, 
    timestamp: number 
}>();

// Price history for detecting significant changes
const priceHistory = new Map<string, number>();

// Cache duration constants
const NEWS_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const COMPANY_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const SIGNIFICANT_CHANGE_THRESHOLD = 2.0;   // 2% price change triggers news refresh

/**
 * Get source logo URL with fallback - NEW! 🎯
 */
function getSourceLogoUrl(source: string): string {
    // Try exact match first
    if (SOURCE_LOGOS[source]) {
        return SOURCE_LOGOS[source];
    }
    
    // Try partial matches for common variations
    const lowerSource = source.toLowerCase();
    for (const [key, logo] of Object.entries(SOURCE_LOGOS)) {
        if (lowerSource.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerSource)) {
            return logo;
        }
    }
    
    // Fallback to favicon service
    const domain = extractDomainFromSource(source);
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

/**
 * Extract likely domain from source name - NEW! 🎯
 */
function extractDomainFromSource(source: string): string {
    const domainMap: Record<string, string> = {
        'yahoo': 'finance.yahoo.com',
        'reuters': 'reuters.com',
        'marketwatch': 'marketwatch.com',
        'benzinga': 'benzinga.com',
        'seeking alpha': 'seekingalpha.com',
        'motley fool': 'fool.com',
        'bloomberg': 'bloomberg.com',
        'cnbc': 'cnbc.com',
        'cnn': 'cnn.com',
        'business wire': 'businesswire.com',
        'pr newswire': 'prnewswire.com',
        'zacks': 'zacks.com',
        'thestreet': 'thestreet.com',
        'barron': 'barrons.com',
        'wall street journal': 'wsj.com',
        'wsj': 'wsj.com',
        'financial times': 'ft.com',
        'forbes': 'forbes.com',
        'techcrunch': 'techcrunch.com',
    };
    
    const lowerSource = source.toLowerCase();
    for (const [key, domain] of Object.entries(domainMap)) {
        if (lowerSource.includes(key)) {
            return domain;
        }
    }
    
    // Ultimate fallback
    return 'news.com';
}

/**
 * Fetch company profile data (logo, name) with 24-hour caching
 */
async function fetchCompanyProfile(ticker: string, apiKey: string): Promise<{ name: string; logo: string }> {
    // Check cache first (24-hour cache since company data rarely changes)
    const cached = companyCache.get(ticker);
    if (cached && (Date.now() - cached.timestamp) < COMPANY_CACHE_DURATION) {
        return cached.profile;
    }
    
    // Handle special tickers with custom branding
    if (ticker === 'QQQ') {
        const qqqProfile = {
            name: 'Invesco QQQ Trust',
            logo: 'https://logo.clearbit.com/invesco.com'
        };
        
        // Cache QQQ profile
        companyCache.set(ticker, {
            profile: qqqProfile,
            timestamp: Date.now()
        });
        
        return qqqProfile;
    }
    
    // Handle Bitcoin/Crypto tickers with custom branding
    if (ticker.includes('BTC') || ticker.includes('BITCOIN') || ticker.includes('BTCUSDT')) {
        const bitcoinProfile = {
            name: 'Bitcoin',
            logo: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png'
        };
        
        // Cache Bitcoin profile
        companyCache.set(ticker, {
            profile: bitcoinProfile,
            timestamp: Date.now()
        });
        
        return bitcoinProfile;
    }
    
    const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${apiKey}`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            console.warn(`⚠️ Company profile API returned ${response.status} for ${ticker}`);
            return {
                name: `${ticker} Inc.`,
                logo: ''
            };
        }
        
        const data: FinnhubCompanyProfile = await response.json();
        
        const profile = {
            name: data.name || `${ticker} Inc.`,
            logo: data.logo || ''
        };
        
        // Cache for 24 hours
        companyCache.set(ticker, {
            profile,
            timestamp: Date.now()
        });
        
        return profile;
        
    } catch (error) {
        console.warn(`⚠️ Failed to fetch company profile for ${ticker}:`, error);
        return {
            name: `${ticker} Inc.`,
            logo: ''
        };
    }
}

/**
 * Fetch ONLY stock price data (optimized for frequent calls)
 * 
 * @param ticker - Stock symbol like "TSLA" or "OKLO"
 * @returns Promise with price data + company info
 */
export async function fetchStockPrice(ticker: string): Promise<Omit<Stock, 'summaries'>> {
  
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
        throw new Error('FINNHUB_API_KEY is not set in environment variables');
    }
  
    const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: FinnhubQuote = await response.json();
        
        if (data.c === undefined || data.c === 0) {
            throw new Error(`No price data available for ticker ${ticker}`);
        }
        
        const price = data.c;
        const change = data.d;
        const changePercent = data.dp;
        
        if (isNaN(price) || isNaN(change) || isNaN(changePercent)) {
            throw new Error(`Invalid numeric data received for ${ticker}`);
        }
        
        // Fetch company profile (with 24-hour caching)
        const companyProfile = await fetchCompanyProfile(ticker, apiKey);
        
        // Store price for change detection
        priceHistory.set(ticker, price);
        
        
        return {
            ticker,
            price,
            change,
            changePercent,
            name: companyProfile.name,      // Add company name
            logo: companyProfile.logo,      // Add company logo
        };
        
    } catch (error) {
        console.error(`❌ Error fetching price for ${ticker}:`, error);
        throw error;
    }
}

/**
 * Check if news should be refreshed based on cache age and price changes
 * 
 * @param ticker - Stock symbol
 * @param currentPrice - Current stock price
 * @returns boolean - true if news should be refreshed
 */
function shouldRefreshNews(ticker: string, currentPrice: number): boolean {
    const cached = newsCache.get(ticker);
    const now = Date.now();
    
    // No cache exists - fetch news
    if (!cached) {
        return true;
    }
    
    // Cache expired (15 minutes)
    if (now - cached.timestamp > NEWS_CACHE_DURATION) {
        return true;
    }
    
    // Significant price change (>2%)
    const lastPrice = cached.lastPrice;
    if (lastPrice > 0) {
        const changePercent = Math.abs((currentPrice - lastPrice) / lastPrice) * 100;
        if (changePercent >= SIGNIFICANT_CHANGE_THRESHOLD) {
            return true;
        }
    }
    
    return false;
}

/**
 * Fetch news data (called strategically based on cache and price changes)
 * 
 * @param ticker - Stock symbol
 * @param currentPrice - Current stock price (for change detection)
 * @param forceRefresh - Force refresh regardless of cache/price
 * @returns Promise with news summaries
 */
export async function fetchStockNews(
    ticker: string, 
    currentPrice: number = 0, 
    forceRefresh: boolean = false
): Promise<ProcessedNewsSummary[]> {  // ✅ Fixed: specific return type instead of any[]
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
        console.warn('FINNHUB_API_KEY not set, returning empty news');
        return [];
    }
    
    // Check if we should use cached news (unless forced)
    if (!forceRefresh && !shouldRefreshNews(ticker, currentPrice)) {
        const cached = newsCache.get(ticker);
        if (cached) {
            return cached.data;
        }
    }
    
    // Fetch fresh news
    
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);
    
    const from = fromDate.toISOString().split('T')[0];
    const to = toDate.toISOString().split('T')[0];
    
    const url = `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${apiKey}`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            console.warn(`⚠️ News API returned ${response.status} for ${ticker}, using cache if available`);
            const cached = newsCache.get(ticker);
            return cached?.data || [];
        }
        
        const newsItems: FinnhubNewsItem[] = await response.json();
        
        // Process news items - UPDATED WITH SOURCE LOGOS! 🎯
        const summaries: ProcessedNewsSummary[] = newsItems
            .sort((a, b) => b.datetime - a.datetime)
            .slice(0, 3)
            .map((item, index) => ({
                id: `news_${item.id || index}`,
                timestamp: new Date(item.datetime * 1000).toISOString(),
                text: item.summary || item.headline,
                headlines: [item.headline],
                image: item.image,
                source: item.source,
                url: item.url,
                sourceLogoUrl: getSourceLogoUrl(item.source),  // ← NEW! Generate source logo URL
            }));
        
        // Cache the fresh news
        newsCache.set(ticker, {
            data: summaries,
            timestamp: Date.now(),
            lastPrice: currentPrice
        });
        
        return summaries;
        
    } catch (error) {
        console.warn(`⚠️ Failed to fetch news for ${ticker}:`, error);
        // Return cached news if available, empty array otherwise
        const cached = newsCache.get(ticker);
        return cached?.data || [];
    }
}

/**
 * Fetch complete stock data (price + smart news)
 * 
 * @param ticker - Stock symbol
 * @param includeNews - Whether to include news (default: true)
 * @param forceNewsRefresh - Force fresh news regardless of cache
 * @returns Promise<Stock> - Complete stock data
 */
export async function fetchStock(
    ticker: string, 
    includeNews: boolean = true, 
    forceNewsRefresh: boolean = false
): Promise<Stock> {
    try {
        // Always fetch fresh price data (now includes company profile)
        const priceData = await fetchStockPrice(ticker);
        
        // Conditionally fetch news with smart caching
        const newsData = includeNews 
            ? await fetchStockNews(ticker, priceData.price, forceNewsRefresh)
            : [];
        
        return {
            ...priceData,
            summaries: newsData,
        };
        
    } catch (error) {
        console.error(`❌ Error fetching complete stock data for ${ticker}:`, error);
        throw error;
    }
}

/**
 * Fetch multiple stocks with optimized strategy
 * 
 * @param tickers - Array of stock symbols
 * @param includeNews - Whether to include news
 * @param forceNewsRefresh - Force refresh news for all stocks
 * @returns Promise<Stock[]> - Array of stock data
 */
export async function fetchMultipleStocks(
    tickers: string[], 
    includeNews: boolean = true,
    forceNewsRefresh: boolean = false
): Promise<Stock[]> {
    
    try {
        // Fetch all stocks in parallel
        const stockPromises = tickers.map(ticker => 
            fetchStock(ticker, includeNews, forceNewsRefresh)
        );
        const stocks = await Promise.all(stockPromises);
        
        // const totalNews = stocks.reduce((sum, stock) => sum + stock.summaries.length, 0);
        // const cacheHits = Array.from(newsCache.keys()).filter(key => tickers.includes(key)).length;
        
        
        return stocks;
        
    } catch (error) {
        console.error('❌ Error in optimized stock fetch:', error);
        throw error;
    }
}

/**
 * Force refresh news for specific tickers (useful for manual refresh)
 * 
 * @param tickers - Array of stock symbols
 */
export async function forceRefreshNews(tickers: string[]): Promise<void> {
    
    for (const ticker of tickers) {
        const currentPrice = priceHistory.get(ticker) || 0;
        await fetchStockNews(ticker, currentPrice, true);
    }
}

/**
 * Get cache statistics (useful for debugging)
 */
export function getCacheStats() {
    const now = Date.now();
    const newsStats = Array.from(newsCache.entries()).map(([ticker, cache]) => ({
        ticker,
        articlesCount: cache.data.length,
        ageMinutes: Math.round((now - cache.timestamp) / 60000),
        lastPrice: cache.lastPrice
    }));
    
    const companyStats = Array.from(companyCache.entries()).map(([ticker, cache]) => ({
        ticker,
        name: cache.profile.name,
        ageHours: Math.round((now - cache.timestamp) / (60 * 60 * 1000)),
    }));
    
    return {
        newsCached: newsCache.size,
        companyCached: companyCache.size,
        newsDetails: newsStats,
        companyDetails: companyStats
    };
}

/**
 * Helper function to validate ticker symbols
 */
export function isValidTicker(ticker: string): boolean {
    return /^[A-Z]{1,5}$/.test(ticker);
}

/**
 * Fetch multiple stock prices with optimized strategy
 * 
 * @param tickers - Array of stock symbols
 * @returns Promise<Omit<Stock, 'summaries'>[]> - Array of stock price data (no news)
 */
export async function fetchMultipleStockPrices(tickers: string[]): Promise<Omit<Stock, 'summaries'>[]> {
    
    try {
        // Fetch all stock prices in parallel
        const stockPromises = tickers.map(ticker => fetchStockPrice(ticker));
        const stocks = await Promise.all(stockPromises);
        
        
        return stocks;
        
    } catch (error) {
        console.error('❌ Error in stock price fetch:', error);
        throw error;
    }
}

// === --- OPTION A --- === //
// Modified stock API - PRICES ONLY (News moved to Benzinga)

// Legacy functions removed:
// - fetchStockNews() -> moved to benzingaNewsApi.ts
// - fetchStock() -> will be handled in GraphQL resolvers
// - fetchMultipleStocks() -> will be handled in GraphQL resolvers
// - forceRefreshNews() -> moved to benzingaNewsApi.ts