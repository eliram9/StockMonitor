// Individual stock card component to display stock data with logo and company name

import Image from 'next/image';
import type { Stock } from '@/lib/graphql/types';

interface StockCardProps {
    stock: Stock;
    isMarketOpen: boolean;
}

/**
 * StockCard Component
 * 
 * Displays a single stock's data in a card format with:
 * - Company logo and name
 * - Stock ticker symbol
 * - Current price
 * - Dollar change
 * - Percentage change (with color coding)
 */
export function StockCard({ stock, isMarketOpen }: StockCardProps) {
    // Determine if the stock is up or down
    const isPositive = stock.change >= 0;
    
    // Choose colors based on stock performance
    const changeColor = isPositive ? 'text-success-600' : 'text-danger-600';
    const borderColor = isPositive ? 'border-success-500' : 'border-danger-500';
    const bgColor = isPositive ? 'bg-success-50' : 'bg-danger-50';

    // Get status badge styles based on market status
    const getStatusBadgeStyles = () => {
        if (!isMarketOpen) {
            return 'bg-gray-100 text-gray-600';
        }
        return `${bgColor} ${changeColor}`;
    };

    return (
        <div className={`bg-white rounded-lg shadow-lg p-6 border-l-8 ${borderColor} hover:shadow-xl transition-shadow`}>
            {/* Company Header with Logo and Info */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    {/* Company Logo */}
                    {stock.logo && (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                            <Image
                                src={stock.logo}
                                alt={`${stock.name} logo`}
                                width={48}
                                height={48}
                                className="object-contain"
                                onError={(e) => {
                                    // Hide image on error and show ticker instead
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                            {/* Fallback: Show ticker if logo fails */}
                            <div className="text-xs font-bold text-gray-600 absolute">
                                {!stock.logo && stock.ticker}
                            </div>
                        </div>
                    )}
                    
                    {/* Company Name and Ticker */}
                    <div className="flex flex-col">
                        <h2 className="text-xl font-bold text-gray-900">{stock.ticker}</h2>
                        {stock.name && (
                            <p className="text-sm text-gray-600 truncate max-w-[200px]">
                                {stock.name}
                            </p>
                        )}
                    </div>
                </div>
                
                {/* Live Status Badge */}
                <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeStyles()}`}>
                    {isPositive ? '↗' : '↘'} {isMarketOpen ? 'LIVE' : 'OFF'}
                </div>
            </div>

            {/* Current Price */}
            <div className="mb-2">
                <p className="text-3xl font-bold text-gray-900">
                    ${stock.price.toFixed(2)}
                </p>
            </div>

            {/* Change Information */}
            <div className="flex items-center space-x-4">
                {/* Dollar Change */}
                <div className={`${changeColor} font-semibold`}>
                    {isPositive ? '+' : ''}${stock.change.toFixed(2)}
                </div>
                
                {/* Percentage Change */}
                <div className={`${changeColor} font-semibold`}>
                    {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                </div>
            </div>
        </div>
    );
}