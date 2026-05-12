// GraphQL resolvers - Finnhub prices + Finnhub news

import { fetchStockPrice, fetchStockNews, fetchStock as fetchFinnhubStock } from '../api/stockApi';
import type { Stock } from './types';

export const resolvers = {
  Query: {
    /**
     * Get a single stock - Prices + News from Finnhub
     * Price and news fetches run in parallel.
     */
    stock: async (_: unknown, { ticker }: { ticker: string }): Promise<Stock> => {
      try {
        const [priceData, summaries] = await Promise.all([
          fetchStockPrice(ticker),
          fetchStockNews(ticker, 0, false),
        ]);

        return { ...priceData, summaries };

      } catch (error) {
        console.error(`❌ GraphQL: Error resolving stock ${ticker}:`, error);
        throw new Error(`Failed to fetch stock data for ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    /**
     * Get multiple stocks - Prices + News from Finnhub
     * Price fetch and news fetch run in parallel per ticker; all tickers run concurrently.
     */
    stocks: async (_: unknown, { tickers }: { tickers: string[] }): Promise<Stock[]> => {
      try {
        // For each ticker: fire price (which itself now parallels profile) and news together.
        // fetchStockNews with currentPrice=0 will use cache when available; on a cold start
        // the news fetch overlaps the price fetch instead of waiting on it.
        const results: Stock[] = await Promise.all(
          tickers.map(async (ticker) => {
            const [priceData, summaries] = await Promise.all([
              fetchStockPrice(ticker),
              fetchStockNews(ticker, 0, false),
            ]);
            return { ...priceData, summaries };
          })
        );

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
     * Force refresh stock data - Prices + News from Finnhub, run in parallel.
     */
    refreshStock: async (_: unknown, { ticker }: { ticker: string }): Promise<Stock> => {
      try {
        const [priceData, summaries] = await Promise.all([
          fetchStockPrice(ticker),
          fetchStockNews(ticker, 0, true),
        ]);

        return { ...priceData, summaries };

      } catch (error) {
        console.error(`❌ GraphQL: Error refreshing ${ticker}:`, error);
        throw new Error(`Failed to refresh stock ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
};
