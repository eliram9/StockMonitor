// Benzinga News API - NEWS ONLY (for your stock monitoring app)

import type { Summary } from '../graphql/types';

/**
 * Interface for Benzinga News Response (when using REST API)
 */
interface BenzingaNewsItem {
    id: number;
    author?: string;
    created: string;          // ISO date string
    updated: string;          // ISO date string
    title: string;            // Headline
    teaser?: string;          // Summary/snippet
    body?: string;            // Full article content
    url: string;              // Article URL
    image?: {
        size: string;
        url: string;
    }[];
    channels?: string[];      // Categories like ["News", "Movers"]
    stocks?: string[];        // Related tickers
    tags?: string[];          // Topic tags
}

/**
 * Processed News Summary Interface (matches your existing GraphQL types)
 */
interface ProcessedNewsSummary {
    id: string;
    timestamp: string;
    text: string;
    headlines: string[];
    image?: string;
    source?: string;
    url?: string;
    sourceLogoUrl?: string;
}

// SOURCE LOGOS MAPPING
const SOURCE_LOGOS: Record<string, string> = {
    "Benzinga": "https://logo.clearbit.com/benzinga.com",
    "Yahoo Finance": "https://logo.clearbit.com/finance.yahoo.com",
    "Reuters": "https://logo.clearbit.com/reuters.com", 
    "MarketWatch": "https://logo.clearbit.com/marketwatch.com",
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
};

// News cache to avoid unnecessary API calls
const newsCache = new Map<string, { 
    data: ProcessedNewsSummary[],
    timestamp: number, 
    lastPrice: number 
}>();

// Cache duration constants
const NEWS_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const SIGNIFICANT_CHANGE_THRESHOLD = 2.0;   // 2% price change triggers news refresh

/**
 * Get source logo URL with fallback
 */
function getSourceLogoUrl(source: string = "Benzinga"): string {
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
    
    // Default to Benzinga logo
    return SOURCE_LOGOS["Benzinga"];
}

/**
 * Check if news should be refreshed based on cache age and price changes
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
 * Fetch news data from Benzinga API
 * 
 * @param ticker - Stock symbol
 * @param currentPrice - Current stock price (for change detection)
 * @param forceRefresh - Force refresh regardless of cache/price
 * @returns Promise with news summaries
 */
export async function fetchBenzingaNews(
    ticker: string, 
    currentPrice: number = 0, 
    forceRefresh: boolean = false
): Promise<ProcessedNewsSummary[]> {
    
    // Check if we should use cached news (unless forced)
    if (!forceRefresh && !shouldRefreshNews(ticker, currentPrice)) {
        const cached = newsCache.get(ticker);
        if (cached) {
            return cached.data;
        }
    }
    
    
    try {
        // Check if we have a Benzinga API key
        const apiKey = process.env.BENZINGA_API_KEY;
        
        if (apiKey) {
            // Use the REST API if we have a key
            return await fetchBenzingaRestAPI(ticker, currentPrice, apiKey);
        } else {
            // Use simulation for now (you can implement RSS parsing here)
            return await simulateBenzingaNews(ticker);
        }
        
    } catch (error) {
        console.warn(`⚠️ Failed to fetch Benzinga news for ${ticker}:`, error);
        // Return cached news if available, empty array otherwise
        const cached = newsCache.get(ticker);
        return cached?.data || [];
    }
}

/**
 * Fetch news using Benzinga REST API (when you have an API key) - ENHANCED VERSION
 */
async function fetchBenzingaRestAPI(
    ticker: string, 
    currentPrice: number, 
    apiKey: string
): Promise<ProcessedNewsSummary[]> {
    
    // Try different URL formats - the free tier might have different requirements
    const urlVariations = [
        // Format 1: Basic with JSON format explicitly requested
        `https://api.benzinga.com/api/v2/news?tickers=${ticker}&token=${apiKey}&pageSize=10&format=json`,
        
        // Format 2: Basic with abstract
        `https://api.benzinga.com/api/v2/news?tickers=${ticker}&token=${apiKey}&pageSize=10&displayOutput=abstract`,
        
        // Format 3: Without displayOutput parameter
        `https://api.benzinga.com/api/v2/news?tickers=${ticker}&token=${apiKey}&pageSize=10`,
        
        // Format 4: With date range (last 30 days)
        (() => {
            const today = new Date().toISOString().split('T')[0];
            const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            return `https://api.benzinga.com/api/v2/news?tickers=${ticker}&token=${apiKey}&pageSize=10&date_from=${monthAgo}&date_to=${today}&format=json`;
        })(),
        
        // Format 5: General news (no ticker filter) to test if API works at all
        `https://api.benzinga.com/api/v2/news?token=${apiKey}&pageSize=5&format=json`,
        
        // Format 6: Different parameter name (some APIs use 'symbols' instead of 'tickers')
        `https://api.benzinga.com/api/v2/news?symbols=${ticker}&token=${apiKey}&pageSize=10&format=json`,
    ];
    
    
    for (let i = 0; i < urlVariations.length; i++) {
        const url = urlVariations[i];
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.warn(`⚠️ URL ${i + 1} failed: ${response.status} - ${errorText}`);
                continue; // Try next URL
            }
            
            // Check if response is actually JSON
            const contentType = response.headers.get('content-type');
            
            if (!contentType || !contentType.includes('application/json')) {
                const responseText = await response.text();
                console.warn(`⚠️ URL ${i + 1} returned non-JSON content: ${responseText.substring(0, 100)}...`);
                continue; // Try next URL
            }
            
            const data: BenzingaNewsItem[] = await response.json();
            
            if (data.length === 0) {
                continue; // Try next URL
            }
            
            // Success! We got articles
            
            // Log sample article for debugging
            
            // Process the articles - for format 5 (general news), filter by ticker if possible
            let relevantData = data;
            if (i === 4) { // Format 5 (general news)
                // Try to filter for ticker-relevant articles
                relevantData = data.filter(item => 
                    item.stocks?.some(stock => stock.toUpperCase() === ticker.toUpperCase()) ||
                    item.title?.toUpperCase().includes(ticker.toUpperCase()) ||
                    item.teaser?.toUpperCase().includes(ticker.toUpperCase())
                );
            }
            
            const summaries: ProcessedNewsSummary[] = relevantData
                .slice(0, 3) // Take top 3 articles
                .map((item, index) => ({
                    id: `benzinga_${item.id || index}`,
                    timestamp: item.created || new Date().toISOString(),
                    text: item.teaser || item.title || '',
                    headlines: [item.title],
                    image: item.image?.[0]?.url,
                    source: "Benzinga",
                    url: item.url,
                    sourceLogoUrl: getSourceLogoUrl("Benzinga"),
                }));
            
            // Cache the fresh news
            newsCache.set(ticker, {
                data: summaries,
                timestamp: Date.now(),
                lastPrice: currentPrice
            });
            
            return summaries;
            
        } catch (error) {
            console.error(`❌ URL ${i + 1} error:`, error);
            continue; // Try next URL
        }
    }
    
    // If we get here, all URLs failed
    console.error(`❌ All ${urlVariations.length} URL formats failed for ${ticker}`);
    throw new Error(`All Benzinga API URL formats failed for ${ticker}`);
}

/**
 * Simulate Benzinga news (placeholder - replace with actual API calls when ready)
 * 
 * NOTE: This is temporary. To use real Benzinga data:
 * 1. Sign up at: https://www.benzinga.com/apis/cloud-product/free-stock-news-api/
 * 2. Add BENZINGA_API_KEY to your .env.local file
 * 3. The fetchBenzingaRestAPI function above will handle real data
 */
async function simulateBenzingaNews(ticker: string): Promise<ProcessedNewsSummary[]> {
    const simulatedArticles: ProcessedNewsSummary[] = [
        {
            id: `benzinga_${ticker}_1`,
            timestamp: new Date().toISOString(),
            text: `Latest analysis on ${ticker} shows continued market interest with strong fundamentals driving investor sentiment. Market watchers note increased trading volume and institutional interest.`,
            headlines: [`${ticker} Shows Strong Performance Amid Market Volatility`],
            image: "https://cdn.benzinga.com/files/images/story/2024/stock-chart.jpg",
            source: "Benzinga",
            url: `https://www.benzinga.com/news/${ticker.toLowerCase()}-latest-updates`,
            sourceLogoUrl: getSourceLogoUrl("Benzinga"),
        },
        {
            id: `benzinga_${ticker}_2`,
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            text: `Analysts provide updated outlook on ${ticker} following recent market developments. Wall Street consensus shows mixed but generally positive sentiment toward the stock's near-term prospects.`,
            headlines: [`Analyst Update: ${ticker} Price Target Revised Following Recent Developments`],
            source: "Benzinga",
            url: `https://www.benzinga.com/analyst-ratings/${ticker.toLowerCase()}-updates`,
            sourceLogoUrl: getSourceLogoUrl("Benzinga"),
        },
        {
            id: `benzinga_${ticker}_3`,
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
            text: `${ticker} trading activity highlights: Options flow indicates increased interest from institutional investors. Technical indicators suggest potential support levels being tested.`,
            headlines: [`${ticker} Options Activity Surges as Institutional Interest Grows`],
            source: "Benzinga",
            url: `https://www.benzinga.com/options-activity/${ticker.toLowerCase()}`,
            sourceLogoUrl: getSourceLogoUrl("Benzinga"),
        }
    ];
    
    // Cache the simulated news
    newsCache.set(ticker, {
        data: simulatedArticles,
        timestamp: Date.now(),
        lastPrice: 0
    });
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return simulatedArticles;
}

/**
 * Fetch news for multiple tickers
 */
export async function fetchMultipleBenzingaNews(
    tickers: string[], 
    currentPrices: Record<string, number> = {},
    forceRefresh: boolean = false
): Promise<Record<string, ProcessedNewsSummary[]>> {
    
    try {
        // Fetch all news in parallel
        const newsPromises = tickers.map(async ticker => {
            const currentPrice = currentPrices[ticker] || 0;
            const news = await fetchBenzingaNews(ticker, currentPrice, forceRefresh);
            return { ticker, news };
        });
        
        const results = await Promise.all(newsPromises);
        
        // Convert to object format
        const newsMap: Record<string, ProcessedNewsSummary[]> = {};
        results.forEach(({ ticker, news }) => {
            newsMap[ticker] = news;
        });
        
        const totalNews = Object.values(newsMap).reduce((sum, news) => sum + news.length, 0);
        
        return newsMap;
        
    } catch (error) {
        console.error('❌ Error in multiple Benzinga news fetch:', error);
        throw error;
    }
}

/**
 * Convert to Summary[] format (matching your GraphQL types)
 */
export function convertToSummaries(newsData: ProcessedNewsSummary[]): Summary[] {
    return newsData.map(item => ({
        id: item.id,
        timestamp: item.timestamp,
        text: item.text,
        headlines: item.headlines,
        image: item.image,
        source: item.source,
        url: item.url,
        sourceLogoUrl: item.sourceLogoUrl,
    }));
}

/**
 * Force refresh news for specific tickers
 */
export async function forceRefreshBenzingaNews(
    tickers: string[], 
    currentPrices: Record<string, number> = {}
): Promise<void> {
    
    for (const ticker of tickers) {
        const currentPrice = currentPrices[ticker] || 0;
        await fetchBenzingaNews(ticker, currentPrice, true);
    }
}

/**
 * Get cache statistics
 */
export function getBenzingaCacheStats() {
    const now = Date.now();
    const newsStats = Array.from(newsCache.entries()).map(([ticker, cache]) => ({
        ticker,
        articlesCount: cache.data.length,
        ageMinutes: Math.round((now - cache.timestamp) / 60000),
        lastPrice: cache.lastPrice
    }));
    
    return {
        newsCached: newsCache.size,
        newsDetails: newsStats
    };
}