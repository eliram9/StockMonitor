import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { getCachedSummary, setCachedSummary } from '@/lib/utils/aiSummaryCache';

interface SummarizeModalProps {
    isOpen: boolean;
    onClose: () => void;
    headline: string;
    ticker: string;
    url: string;
    icon?: string;
}

// Helper function to parse and structure the summary content
function parseSummaryContent(summary: string): {
    sections: Array<{
        type: 'header' | 'paragraph' | 'list' | 'quote' | 'emphasis';
        content: string;
        level?: number;
    }>;
} {
    const sections: Array<{
        type: 'header' | 'paragraph' | 'list' | 'quote' | 'emphasis';
        content: string;
        level?: number;
    }> = [];

    const lines = summary.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let currentSection = '';
    
    lines.forEach(line => {
        // Headers
        if (line.startsWith('#')) {
            const level = line.match(/^#+/)?.[0].length || 1;
            const content = line.replace(/^#+\s*/, '');
            sections.push({ type: 'header', content, level });
            
            // Track current section for context-aware parsing
            const lowerContent = content.toLowerCase();
            if (lowerContent.includes('key points')) {
                currentSection = 'key-points';
            } else if (lowerContent.includes('what happened')) {
                currentSection = 'what-happened';
            } else if (lowerContent.includes('why it matters')) {
                currentSection = 'why-matters';
            } else if (lowerContent.includes("what's next")) {
                currentSection = 'whats-next';
            } else {
                currentSection = '';
            }
        }
        // List items - only treat as list if we're in Key Points section
        else if ((line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) && currentSection === 'key-points') {
            const content = line.replace(/^[•\-*]\s*/, '');
            sections.push({ type: 'list', content });
        }
        // Blockquotes
        else if (line.startsWith('>')) {
            const content = line.replace(/^>\s*/, '');
            sections.push({ type: 'quote', content });
        }
        // Emphasis (bold text)
        else if (line.includes('**')) {
            sections.push({ type: 'emphasis', content: line });
        }
        // Regular paragraphs - including content that starts with bullets in non-list sections
        else {
            // Clean up any bullet points at the start for non-list sections
            const cleanContent = currentSection !== 'key-points' ? line.replace(/^[•\-*] /, '') : line;
            sections.push({ type: 'paragraph', content: cleanContent });
        }
    });

    return { sections };
}

export function SummarizeModal({ isOpen, onClose, headline, ticker, url, icon }: SummarizeModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [, setSummary] = useState<string>('');
    const [parsedContent, setParsedContent] = useState<{
        sections: Array<{
            type: 'header' | 'paragraph' | 'list' | 'quote' | 'emphasis';
            content: string;
            level?: number;
        }>;
    }>({ sections: [] });

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            setError(null);

            // 1. Try cache first
            const cached = getCachedSummary(url);
            if (cached) {
                setSummary(cached);
                setParsedContent(parseSummaryContent(cached));
                setLoading(false);
                return;
            }

            // 2. If not cached, fetch from API
            fetch('/api/summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url }),
            })
                .then(async response => {
                    const responseText = await response.text();
                    let data;
                    try {
                        data = JSON.parse(responseText);
                    } catch {
                        throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
                    }
                    if (!response.ok) {
                        throw new Error(data.error || `HTTP error! status: ${response.status}`);
                    }
                    return data;
                })
                .then(data => {
                    if (data.summary) {
                        setSummary(data.summary);
                        setParsedContent(parseSummaryContent(data.summary));
                        setCachedSummary(url, data.summary);
                    } else {
                        throw new Error('No summary returned from API');
                    }
                })
                .catch(err => {
                    setError(err.message || 'Failed to fetch summary');
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [isOpen, url]);

    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Render content section based on type
    const renderContentSection = (section: {
        type: 'header' | 'paragraph' | 'list' | 'quote' | 'emphasis';
        content: string;
        level?: number;
    }, index: number) => {
        switch (section.type) {
            case 'header':
                const headerClasses: { [key: number]: string } = {
                    1: 'text-xl font-bold text-gray-900 dark:text-white mb-3',
                    2: 'text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2',
                    3: 'text-base font-medium text-gray-700 dark:text-gray-200 mb-2',
                    4: 'text-sm font-medium text-gray-600 dark:text-gray-300 mb-1',
                    5: 'text-xs font-medium text-gray-500 dark:text-gray-400 mb-1',
                    6: 'text-xs font-medium text-gray-400 dark:text-gray-500 mb-1'
                };
                
                // Special styling for Key Points section
                if (section.content.toLowerCase().includes('key points')) {
                    return (
                        <div key={index} className="bg-gray-200 p-2 rounded mb-3">
                            <h3 className="text-lg font-semibold text-gray-800">
                                {section.content}
                            </h3>
                        </div>
                    );
                }
                
                return (
                    <div key={index} className="pt-6">
                        <h3 className={headerClasses[section.level || 1]}>
                            {section.content}
                        </h3>
                    </div>
                );
            
            case 'paragraph':
                return (
                    <p key={index} className="text-sm leading-relaxed modal-text mb-3">
                        {section.content}
                    </p>
                );
            
            case 'list':
                return (
                    <div key={index} className="flex items-baseline mb-2">
                        <span className="text-blue-500 mr-2">•</span>
                        <span className="text-sm modal-text">
                            {section.content}
                        </span>
                    </div>
                );
            
            case 'quote':
                return (
                    <blockquote key={index} className="border-l-4 border-blue-200 pl-4 py-2 mb-3 bg-blue-50 dark:bg-blue-900/20 rounded-r">
                        <p className="text-sm italic text-gray-600 dark:text-gray-400">
                            &quot;{section.content}&quot;
                        </p>
                    </blockquote>
                );
            
            case 'emphasis':
                // Convert markdown-style bold to styled text
                const emphasizedContent = section.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                return (
                    <p key={index} 
                       className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3"
                       dangerouslySetInnerHTML={{ __html: emphasizedContent }}
                    />
                );
            
            default:
                return (
                    <p key={index} className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                        {section.content}
                    </p>
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-500/60 bg-opacity-30 flex items-center justify-center z-50 p-4"
             onClick={handleBackdropClick}
        >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
                {/* Header */}
                
                <div className="flex items-center justify-between p-6">
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                            <span className="text-lg font-semibold text-gray-900 dark:text-white">AI Summary</span>
                            <span className="text-xl">🤖</span>
                        </div>
                    </div>
                    <button onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                            aria-label="Close modal"
                    >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="mx-6 border-b border-gray-400"></div>
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {/* Article Headline */}
                    <div className="mb-6">
                        <div className="flex items-center space-x-3">
                            {icon && (
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-gray-200 flex-shrink-0">
                                    <Image src={icon}
                                           alt={`${ticker} logo`}
                                           width={32}
                                           height={32}
                                           className="object-contain"
                                           onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                </div>
                            )}
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
                                {headline}
                            </h2>
                        </div>
                    </div>
                    
                    {/* Loading State */}
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <div className="flex flex-col items-center space-y-3">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Analyzing article...
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Extracting key insights with AI
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="py-6">
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                <div className="flex">
                                    <div className="text-red-400 mr-3">
                                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h4>
                                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                                        <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                                            URL: {url}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Summary Content */}
                    {!loading && !error && parsedContent.sections.length > 0 && (
                        <div className="space-y-4">
                            {/* Structured Content */}
                            <div className="space-y-3">
                                {(() => {
                                    const elements: React.ReactNode[] = [];
                                    let inKeyPointsSection = false;
                                    let keyPointsItems: React.ReactNode[] = [];
                                    
                                    parsedContent.sections.forEach((section, index) => {
                                        // Check if this is the Key Points header
                                        if (section.type === 'header' && section.content.toLowerCase().includes('key points')) {
                                            inKeyPointsSection = true;
                                            keyPointsItems = [];
                                        }
                                        // Check if this is a list item and we're in Key Points section
                                        else if (section.type === 'list' && inKeyPointsSection) {
                                            keyPointsItems.push(
                                                <div key={`keypoints-item-${index}`} className="flex items-baseline">
                                                    <span className="text-blue-500 mr-2">•</span>
                                                    <span className="text-sm modal-text">
                                                        {section.content}
                                                    </span>
                                                </div>
                                            );
                                        }
                                        // Check if we're moving to a new section (next header)
                                        else if (section.type === 'header' && inKeyPointsSection) {
                                            // Render the Key Points section with all its items
                                            elements.push(
                                                <div key="keypoints-section" className="bg-gray-100 px-2 py-4 rounded-lg mb-3 modal-text">
                                                    <h3 className="text-lg font-semibold mb-2 pb-2">
                                                        Key Points
                                                    </h3>
                                                    <div className="space-y-1">
                                                        {keyPointsItems}
                                                    </div>
                                                </div>
                                            );
                                            inKeyPointsSection = false;
                                            keyPointsItems = [];
                                            elements.push(renderContentSection(section, index));
                                        }
                                        // Regular content (not in Key Points section)
                                        else if (!inKeyPointsSection) {
                                            elements.push(renderContentSection(section, index));
                                        }
                                    });
                                    return elements;
                                })()}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6">
                    <div className="px-6 border-t border-gray-400 mb-6"></div>
                    <div className="flex justify-end">
                        <button onClick={onClose}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}