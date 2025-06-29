import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface SummarizeModalProps {
    isOpen: boolean;
    onClose: () => void;
    headline: string;
    ticker: string;
    url: string;
    icon?: string;
}

export function SummarizeModal({ isOpen, onClose, headline, ticker, url, icon }: SummarizeModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<string[]>([]);


    useEffect(() => {
        if (isOpen) {
            console.log('Modal opened with URL:', url);
            setLoading(true);
            setError(null);
        
            fetch('/api/summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url }),
            })
                .then(async response => {
                    console.log('API response status:', response.status);
                    console.log('API response headers:', response.headers);
                
                // Get the response text first
                const responseText = await response.text();
                    console.log('API response text:', responseText);
                
                // Try to parse as JSON
                let data;
                try {
                    data = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('Failed to parse response as JSON:', parseError);
                    throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
                }
                
                if (!response.ok) {
                    console.error('API error response:', data);
                    throw new Error(data.error || `HTTP error! status: ${response.status}`);
                }
                
                return data;
            })
            .then(data => {
            
                if (data.summary) {
                    // Split summary into paragraphs if it contains line breaks
                    const summaryArray = data.summary.split('\n\n').filter((p: string) => p.trim().length > 0);
                    setSummary(summaryArray);
                } else {
                    throw new Error('No summary returned from API');
                }
                })
                .catch(err => {
                    console.error('API error:', err);
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

    return (
        <div  className="fixed inset-0 bg-gray-500/60 bg-opacity-30 flex items-center justify-center z-50 p-4"
              onClick={handleBackdropClick}
        >
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                        <span>TL;DR by</span>
                        <span className="text-xl">🤖</span>
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                        aria-label="Close modal"
                    >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4 flex items-center">
            {icon && (
              <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-gray-200 flex-shrink-0">
                <Image
                  src={icon}
                  alt={`${ticker} logo`}
                  width={32}
                  height={32}
                  className="object-contain"
                  onError={(e) => {
                    // Hide image on error
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
          <h3 className="text-base font-medium text-gray-900 mb-4">
            {headline}
          </h3>
          
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-sm text-gray-600">Generating AI summary...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="text-red-400 mr-3">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-red-800">Error</h4>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                    <p className="text-xs text-red-600 mt-2">
                      URL: {url}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Summary Content */}
          {!loading && !error && summary.length > 0 && (
            <div className="space-y-3">
              {summary.map((paragraph, index) => (
                <p key={index} className="text-sm modal-text leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}