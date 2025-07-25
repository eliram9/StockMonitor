// AI Summary Cache Utility
// Handles storing, retrieving, and cleaning up AI summaries in localStorage

const CACHE_PREFIX = 'aiSummary:';
const CACHE_DURATION = 3 * 24 * 60 * 60 * 1000; // 3 days

export function normalizeUrl(url: string): string {
  return url.split('?')[0]; // Remove query params for deduplication
}

export function getCacheKey(url: string): string {
  return CACHE_PREFIX + encodeURIComponent(normalizeUrl(url));
}

export function getCachedSummary(url: string): string | null {
  const key = getCacheKey(url);
  const cached = localStorage.getItem(key);
  if (!cached) return null;
  try {
    const { summary, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return summary;
    } else {
      localStorage.removeItem(key); // Clean up expired
      return null;
    }
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function setCachedSummary(url: string, summary: string) {
  const key = getCacheKey(url);
  const value = JSON.stringify({ summary, timestamp: Date.now() });
  localStorage.setItem(key, value);
}

// Optional: Cleanup old cache entries (call on app load)
export function cleanupOldCache() {
  const now = Date.now();
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(CACHE_PREFIX)) {
      try {
        const { timestamp } = JSON.parse(localStorage.getItem(key) || '{}');
        if (!timestamp || now - timestamp >= CACHE_DURATION) {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key);
      }
    }
  });
} 