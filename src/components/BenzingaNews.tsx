// Benzinga News component - displays news articles from Benzinga API only

import { NewsCard } from './NewsCard';
import type { Stock } from '@/lib/graphql/types';

interface BenzingaNewsProps {
    stocks: Stock[];
}

/**
 * Benzinga News Component
 * 
 * Displays news articles specifically from Benzinga API in a dedicated section
 */
export function BenzingaNews({ stocks }: BenzingaNewsProps) {
    // Collect Benzinga news from all stocks
    const allBenzingaNews = stocks
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
    const uniqueNews = allBenzingaNews.filter((news, index, array) => 
        array.findIndex(item => item.id === news.id) === index
    );

    // Take only the 6 most recent unique articles
    const benzingaNews = uniqueNews.slice(0, 6);

    // If no Benzinga news available
    if (benzingaNews.length === 0) {
        return (
        <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">📰</span>
                    Benzinga Market News
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Premium</span>
            </h3>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 text-center border border-blue-200">
                <div className="text-blue-600 text-2xl mb-2">📊</div>
                <p className="text-gray-600 mb-2">No recent Benzinga news available.</p>
                <p className="text-sm text-gray-500">Premium market insights will appear here when available.</p>
            </div>
        </div>
        );
    }

    return (
        <div className="mt-8">
            {/* Header with Benzinga branding */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    Recent News
                    {/* Show deduplication info if duplicates were removed */}
                    {allBenzingaNews.length > uniqueNews.length && (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        -{allBenzingaNews.length - uniqueNews.length} duplicates
                        </span>
                    )}
                </h3>
            </div>

            {/* News grid - 2 columns on medium screens, 3 on large */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {benzingaNews.map((news) => (
                    <NewsCard key={news.id} 
                              news={news} 
                              ticker={news.ticker}
                              logo={news.logo}
                    />
                ))}
            </div>
        
            {/* Footer info */}
            <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                    Showing {benzingaNews.length} unique Benzinga articles
                    {allBenzingaNews.length > uniqueNews.length && (
                        <span className="text-green-600">
                        {' '}• Removed {allBenzingaNews.length - uniqueNews.length} duplicates
                        </span>
                    )}
                {' '}• Premium market insights
                </p>
            </div>
        </div>
    );
}