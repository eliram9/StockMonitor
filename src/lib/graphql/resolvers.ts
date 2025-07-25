// Fixed GraphQL resolvers - Finnhub prices + Benzinga news

import { fetchStockPrice, fetchMultipleStockPrices, fetchStock as fetchFinnhubStock } from '../api/stockApi';
import { fetchBenzingaNews, fetchMultipleBenzingaNews, convertToSummaries } from '../api/benzingaNewsApi';
import type { Stock } from './types';

export const resolvers = {
  Query: {
    /**
     * Get a single stock - Prices from Finnhub + News from Benzinga
     */
    stock: async (_: any, { ticker }: { ticker: string }): Promise<Stock> => {
      try {
        
        // Get price data from Finnhub
        const priceData = await fetchStockPrice(ticker);
        
        // Get news data from Benzinga
        const benzingaNews = await fetchBenzingaNews(ticker, priceData.price, false);
        const benzingaSummaries = convertToSummaries(benzingaNews);
        
        const result: Stock = {
          ...priceData,
          summaries: benzingaSummaries
        };
        
        return result;
        
      } catch (error) {
        console.error(`❌ GraphQL: Error resolving stock ${ticker}:`, error);
        throw new Error(`Failed to fetch stock data for ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    /**
     * Get multiple stocks - Prices from Finnhub + News from Benzinga
     */
    stocks: async (_: any, { tickers }: { tickers: string[] }): Promise<Stock[]> => {
      try {
        
        // FIXED: Get price data from Finnhub (returns array, not object)
        const priceDataArray = await fetchMultipleStockPrices(tickers);
        
        // Create price map for Benzinga news API
        const currentPrices: Record<string, number> = {};
        priceDataArray.forEach(stock => {
          currentPrices[stock.ticker] = stock.price;
        });
        
        // Get Benzinga news for all tickers
        const benzingaNewsMap = await fetchMultipleBenzingaNews(tickers, currentPrices, false);
        
        // Combine prices and news
        const combinedResult: Stock[] = priceDataArray.map(priceData => {
          const benzingaNews = benzingaNewsMap[priceData.ticker] || [];
          const benzingaSummaries = convertToSummaries(benzingaNews);
          
          
          return {
            ...priceData,
            summaries: benzingaSummaries
          };
        });
        
        const totalNews = combinedResult.reduce((sum, stock) => sum + stock.summaries.length, 0);
        
        return combinedResult;
        
      } catch (error) {
        console.error(`❌ GraphQL: Error resolving stocks:`, error);
        throw new Error(`Failed to fetch stocks data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    /**
     * NEW: Test Benzinga news for a single stock
     */
    stockWithBenzingaNews: async (_: any, { ticker }: { ticker: string }): Promise<Stock> => {
      try {
        
        // Get price data from Finnhub
        const priceData = await fetchStockPrice(ticker);
        
        // Get news data from Benzinga
        const newsData = await fetchBenzingaNews(ticker, priceData.price);
        const summaries = convertToSummaries(newsData);
        
        const result: Stock = {
          ...priceData,
          summaries
        };
        
        return result;
        
      } catch (error) {
        console.error(`❌ GraphQL: Error with Benzinga news for ${ticker}:`, error);
        throw new Error(`Failed to fetch Benzinga news for ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    /**
     * NEW: Compare Finnhub vs Benzinga news
     */
    compareNews: async (_: any, { ticker }: { ticker: string }) => {
      try {
        
        // Get Finnhub data (complete with news)
        const finnhubData = await fetchFinnhubStock(ticker, true, false);
        
        // Get Benzinga news only
        const benzingaNews = await fetchBenzingaNews(ticker, finnhubData.price);
        const benzingaSummaries = convertToSummaries(benzingaNews);
        
        const comparison = {
          ticker,
          price: finnhubData.price,
          change: finnhubData.change,
          changePercent: finnhubData.changePercent,
          finnhubNews: finnhubData.summaries,
          benzingaNews: benzingaSummaries,
          comparison: {
            finnhubCount: finnhubData.summaries.length,
            benzingaCount: benzingaSummaries.length,
            timestamp: new Date().toISOString()
          }
        };
        
        return comparison;
        
      } catch (error) {
        console.error(`❌ GraphQL: Error comparing news for ${ticker}:`, error);
        throw new Error(`Failed to compare news for ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    /**
     * NEW: Test Benzinga API health
     */
    benzingaHealth: async () => {
      try {
        
        // Test with AAPL
        const testNews = await fetchBenzingaNews('AAPL', 150, false);
        
        const health = {
          status: 'healthy',
          articlesReturned: testNews.length,
          hasApiKey: !!process.env.BENZINGA_API_KEY,
          timestamp: new Date().toISOString(),
          sampleHeadline: testNews[0]?.headlines[0] || 'No news available'
        };
        
        return health;
        
      } catch (error) {
        console.error(`❌ GraphQL: Benzinga API unhealthy:`, error);
        return {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          hasApiKey: !!process.env.BENZINGA_API_KEY,
          timestamp: new Date().toISOString()
        };
      }
    }
  },

  Mutation: {
    /**
     * Force refresh stock data - Prices from Finnhub + News from Benzinga
     */
    refreshStock: async (_: any, { ticker }: { ticker: string }): Promise<Stock> => {
      try {
        
        // Get fresh price data from Finnhub
        const priceData = await fetchStockPrice(ticker);
        
        // Force refresh Benzinga news
        const benzingaNews = await fetchBenzingaNews(ticker, priceData.price, true);
        const benzingaSummaries = convertToSummaries(benzingaNews);
        
        const result: Stock = {
          ...priceData,
          summaries: benzingaSummaries
        };
        
        return result;
        
      } catch (error) {
        console.error(`❌ GraphQL: Error refreshing ${ticker}:`, error);
        throw new Error(`Failed to refresh stock ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
};