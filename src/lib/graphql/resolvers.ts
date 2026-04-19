// GraphQL resolvers - Finnhub prices + Finnhub news

import { fetchStockPrice, fetchMultipleStockPrices, fetchStockNews, fetchStock as fetchFinnhubStock } from '../api/stockApi';
import type { Stock } from './types';

export const resolvers = {
  Query: {
    /**
     * Get a single stock - Prices + News from Finnhub
     */
    stock: async (_: unknown, { ticker }: { ticker: string }): Promise<Stock> => {
      try {
        const priceData = await fetchStockPrice(ticker);
        const summaries = await fetchStockNews(ticker, priceData.price, false);

        return { ...priceData, summaries };

      } catch (error) {
        console.error(`❌ GraphQL: Error resolving stock ${ticker}:`, error);
        throw new Error(`Failed to fetch stock data for ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    /**
     * Get multiple stocks - Prices + News from Finnhub
     */
    stocks: async (_: unknown, { tickers }: { tickers: string[] }): Promise<Stock[]> => {
      try {
        const priceDataArray = await fetchMultipleStockPrices(tickers);

        const results: Stock[] = await Promise.all(
          priceDataArray.map(async (priceData) => {
            const summaries = await fetchStockNews(priceData.ticker, priceData.price, false);
            return { ...priceData, summaries };
          })
        );

        const totalNews = results.reduce((sum, stock) => sum + stock.summaries.length, 0);
        console.log(`🔍 DEBUG - GraphQL: Final result - Total news across all stocks: ${totalNews}`);

        return results;

      } catch (error) {
        console.error(`❌ GraphQL: Error resolving stocks:`, error);
        throw new Error(`Failed to fetch stocks data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    /**
     * Compare Finnhub news (legacy endpoint kept for compatibility)
     */
    compareNews: async (_: unknown, { ticker }: { ticker: string }) => {
      try {
        const finnhubData = await fetchFinnhubStock(ticker, true, false);

        return {
          ticker,
          price: finnhubData.price,
          change: finnhubData.change,
          changePercent: finnhubData.changePercent,
          finnhubNews: finnhubData.summaries,
          benzingaNews: [],
          comparison: {
            finnhubCount: finnhubData.summaries.length,
            benzingaCount: 0,
            timestamp: new Date().toISOString()
          }
        };

      } catch (error) {
        console.error(`❌ GraphQL: Error comparing news for ${ticker}:`, error);
        throw new Error(`Failed to compare news for ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  },

  Mutation: {
    /**
     * Force refresh stock data - Prices + News from Finnhub
     */
    refreshStock: async (_: unknown, { ticker }: { ticker: string }): Promise<Stock> => {
      try {
        const priceData = await fetchStockPrice(ticker);
        const summaries = await fetchStockNews(ticker, priceData.price, true);

        return { ...priceData, summaries };

      } catch (error) {
        console.error(`❌ GraphQL: Error refreshing ${ticker}:`, error);
        throw new Error(`Failed to refresh stock ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
};
