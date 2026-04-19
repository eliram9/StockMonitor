// News component - displays news articles from Finnhub API

import { NewsCard } from './NewsCard';
import type { Stock } from '@/lib/graphql/types';

interface BenzingaNewsProps {
    stocks: Stock[];
}

export function BenzingaNews({ stocks }: BenzingaNewsProps) {
    // Collect only Benzinga news from TSLA and OKLO (exclude QQQ)
    const filteredStocks = stocks.filter(stock => stock.ticker === 'TSLA' || stock.ticker === 'OKLO');
    
    const allBenzingaNews = filteredStocks
        .flatMap(stock => 
            stock.summaries
                .filter(summary => summary.source === 'Benzinga')
                .map(summary => ({
                    ...summary,
                    ticker: stock.ticker,
                    logo: stock.logo,
                }))
        )
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Remove duplicates based on ID
    const uniqueNews = allNews.filter((news, index, array) =>
        array.findIndex(item => item.id === news.id) === index
    );

    // Take only the 6 most recent unique articles
    const recentNews = uniqueNews.slice(0, 6);

    if (recentNews.length === 0) {
        return (
            <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">📰</span>
                    Market News
                </h3>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 text-center border border-blue-200">
                    <div className="text-blue-600 text-2xl mb-2">📊</div>
                    <p className="text-gray-600 mb-2">No recent news available.</p>
                    <p className="text-sm text-gray-500">Market insights will appear here when available.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    Recent News
                    {allNews.length > uniqueNews.length && (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            -{allNews.length - uniqueNews.length} duplicates
                        </span>
                    )}
                </h3>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentNews.map((news) => (
                    <NewsCard key={news.id}
                              news={news}
                              ticker={news.ticker}
                              logo={news.logo}
                    />
                ))}
            </div>

            <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                    Showing {recentNews.length} recent articles
                    {allNews.length > uniqueNews.length && (
                        <span className="text-green-600">
                            {' '}• Removed {allNews.length - uniqueNews.length} duplicates
                        </span>
                    )}
                </p>
            </div>
        </div>
    );
}
