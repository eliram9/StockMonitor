// NewsCard component - displays individual news articles with images and metadata

import Image from 'next/image';
import { useState } from 'react';
import type { Summary } from '@/lib/graphql/types';
import { SummarizeModal } from './SummarizeModal';

interface NewsCardProps {
    news: Summary;    
    ticker: string;
    logo?: string;     
}

/**
 * NewsCard Component
 * 
 * Displays a single news article with image, source, date, and content
 */
export function NewsCard({ news, ticker, logo }: NewsCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Format the timestamp to show both relative time and actual date
    const formatTimeAgo = (timestamp: string) => {
        const now = new Date();
        const newsTime = new Date(timestamp);
        const diffMs = now.getTime() - newsTime.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffDays > 0) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else if (diffHours > 0) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffMinutes > 30) {  
            return `${diffMinutes} minutes ago`;
        } else if (diffMinutes > 0) {   
            return `${diffMinutes} minute${diffMinutes > 5 ? 's' : ''} ago`;
        } else {
            return 'Just now';  
        }
    };

    const formatDate = (timestamp: string) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get the headline from the news data
    const headline = news.headlines?.[0] || 'No headline available';
    
    // Truncate summary if it's too long
    const summary = news.text.length > 120 
        ? news.text.substring(0, 120) + '...' 
        : news.text;

    const displayText = isExpanded ? news.text : summary;
    const shouldShowButton = news.text.length > 120;

    const handleReadMore = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click when clicking the button
        if (news.url) {
            window.open(news.url, '_blank');
        }
    };

    const handleSummarize = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click when clicking the button
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    return (
        <div role="article"
             aria-label={`News article about ${ticker}: ${headline}`}
             className="bg-gray-400/10 rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col min-h-[200px]"
             data-news-id={news.id}
        >
            <div className="p-4 flex flex-col flex-grow">
                {/* Header with company logo, source, and timestamp */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                        {logo ? (
                            <div className="w-6 h-6 rounded-full overflow-hidden bg-white border border-gray-200">
                                <Image src={logo}
                                        alt={`${ticker} logo`}
                                        width={24}
                                        height={24}
                                        className="object-contain"
                                        onError={(evt) => {
                                        // Hide image on error and show ticker instead
                                            evt.currentTarget.style.display = 'none';
                                            const container = evt.currentTarget.parentElement;
                                            if (container) {
                                                container.innerHTML = `
                                                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                                                        ${ticker}
                                                    </span>
                                                `;
                                            }
                                    }}
                                />
                            </div>
                            ) : (
                                <span 
                                    className="inline-flex items-center px-2 pt-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                                    aria-label={`Stock ticker: ${ticker}`}
                                >
                                    {ticker}
                                </span>
                                )
                        }

          
                    </div>
                    <span className="text-xs text-gray-500">
                        {formatTimeAgo(news.timestamp)}
                    </span>
                </div>

                {/* Headline */}
                <h4 className="text-sm font-semibold text-gray-900 mb-3 leading-tight line-clamp-2"
                    aria-label={`Article headline: ${headline}`}
                >
                    {headline}
                </h4>

                {/* Hidden description for screen readers */}
                <div id={`article-${news.id}`} className="sr-only">{summary}</div>

                {/* Summary */}
                <p className="text-xs text-gray-600 leading-relaxed mb-3 line-clamp-3">{displayText}</p>

                {shouldShowButton && (
                    <button onClick={() => setIsExpanded(!isExpanded)}
                            className="text-xs text-primary-600 hover:text-primary-800 mb-3 flex items-center space-x-1"
                    >
                        <span>{isExpanded ? 'Show less' : 'Show more'}</span>
                            <svg className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                    </button>
                )}

                {/* Footer with source logo/date and read more button */}
                <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                        {news.sourceLogoUrl ? (
                            <div className="flex items-center space-x-1.5">
                                <div className="w-4 h-4 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                                    <Image src={news.sourceLogoUrl}
                                            alt={`${news.source} logo`}
                                            width={16}
                                            height={16}
                                            className="object-contain w-full h-full"
                                            onError={(e) => {
                                                // Fallback to 📅 emoji if source logo fails
                                                const container = e.currentTarget.parentElement;
                                                if (container) {
                                                    container.innerHTML = '<span class="text-xs">📅</span>';
                                                }
                                            }}
                                    />
                                </div>
                                <span>{formatDate(news.timestamp)}</span>
                            </div>
                        ) : (
                        <span>📅 {formatDate(news.timestamp)}</span>
                        )}
                    </div>
          
                    {news.url && (
                        <button onClick={handleReadMore}
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-full hover:bg-primary-100 transition-colors"
                                aria-label={`Read full article about ${ticker}`}
                                aria-describedby={`article-${news.id}`}
                        >
                            <span>Full Article</span>
                            <svg className="h-4 w-4" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24" 
                                aria-hidden="true"
                            >
                                <path strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
                                />
                            </svg>
                        </button>
                    )}
                </div>

                {/* AI Summarize Button */}
                <button onClick={handleSummarize}
                        className="w-full mt-3 px-4 py-2 bg-ai-button text-white text-sm font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-2"
                        aria-label={`Summarize article about ${ticker} with AI`}
                >
                    <svg className="h-4 w-4" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" 
                        />
                    </svg>
                    <span>Summarize with AI Agent</span>
                </button>
            </div>

            {/* Summarize Modal */}
            <SummarizeModal isOpen={isModalOpen}
                            onClose={handleCloseModal}
                            headline={headline}
                            ticker={ticker}
                            url={news.url || ''}
                            icon={logo}
            />
        </div>
    );
}