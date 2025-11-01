/**
 * Rate limit error handler for Spotify API
 *
 * Detects 429 errors and extracts retry-after information
 */

export interface RateLimitInfo {
  isRateLimited: boolean;
  retryAfterSeconds?: number;
  retryAfterDate?: Date;
  message?: string;
}

/**
 * Check if an error is a Spotify rate limit error (429)
 * and extract retry-after information
 */
export function checkRateLimit(error: any): RateLimitInfo {
  // Check if it's a rate limit error
  if (error?.statusCode === 429 || error?.status === 429 || error?.body?.error?.status === 429) {
    // Try to extract retry-after header
    let retryAfterSeconds: number | undefined;

    // The spotify-web-api-node library includes headers in error.headers
    if (error.headers && error.headers['retry-after']) {
      retryAfterSeconds = parseInt(error.headers['retry-after'], 10);
    } else if (error.body?.error?.headers?.['retry-after']) {
      retryAfterSeconds = parseInt(error.body.error.headers['retry-after'], 10);
    }

    // Calculate retry date if we have the seconds
    let retryAfterDate: Date | undefined;
    if (retryAfterSeconds) {
      retryAfterDate = new Date(Date.now() + retryAfterSeconds * 1000);
    }

    // Format a user-friendly message
    let message = 'Spotify API rate limit exceeded.';
    if (retryAfterSeconds) {
      const hours = Math.floor(retryAfterSeconds / 3600);
      const minutes = Math.floor((retryAfterSeconds % 3600) / 60);

      if (hours > 0) {
        message += ` Please wait ${hours}h ${minutes}m before trying again.`;
      } else if (minutes > 0) {
        message += ` Please wait ${minutes} minutes before trying again.`;
      } else {
        message += ` Please wait ${retryAfterSeconds} seconds before trying again.`;
      }

      message += `\n\nRetry after: ${retryAfterDate?.toLocaleString()}`;
    } else {
      message += ' Please wait a few minutes before trying again.';
    }

    return {
      isRateLimited: true,
      retryAfterSeconds,
      retryAfterDate,
      message,
    };
  }

  return {
    isRateLimited: false,
  };
}

/**
 * Format rate limit error for logging
 */
export function logRateLimit(rateLimitInfo: RateLimitInfo): void {
  if (!rateLimitInfo.isRateLimited) return;

  console.error('='.repeat(80));
  console.error('⚠️  SPOTIFY API RATE LIMIT EXCEEDED');
  console.error('='.repeat(80));

  if (rateLimitInfo.retryAfterSeconds) {
    const hours = Math.floor(rateLimitInfo.retryAfterSeconds / 3600);
    const minutes = Math.floor((rateLimitInfo.retryAfterSeconds % 3600) / 60);
    const seconds = rateLimitInfo.retryAfterSeconds % 60;

    console.error(`Retry after: ${hours}h ${minutes}m ${seconds}s`);
    console.error(`Retry time: ${rateLimitInfo.retryAfterDate?.toLocaleString()}`);
  }

  console.error('');
  console.error('To avoid rate limits:');
  console.error('  • Reduce sync frequency');
  console.error('  • Use local database for browsing');
  console.error('  • Wait for the retry period to expire');
  console.error('='.repeat(80));
}
