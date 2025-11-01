/**
 * Playlist filtering utilities
 */

import type { LocalPlaylist } from '@shared/types';
import { REGEX_PATTERNS } from '@shared/constants';

export interface FilterResult {
  playlists: LocalPlaylist[];
  isValid: boolean;
  error: string | null;
}

/**
 * Check if a string looks like a regex pattern
 */
function isRegexPattern(pattern: string): boolean {
  return REGEX_PATTERNS.IS_REGEX.test(pattern);
}

/**
 * Filter playlists by search query
 * Supports both plain text and regex patterns
 */
export function filterPlaylists(
  playlists: LocalPlaylist[],
  query: string
): FilterResult {
  // Empty query returns all playlists
  if (!query.trim()) {
    return {
      playlists,
      isValid: true,
      error: null,
    };
  }

  const trimmedQuery = query.trim();
  const isRegex = isRegexPattern(trimmedQuery);

  // Try regex search if pattern detected
  if (isRegex) {
    try {
      const regex = new RegExp(trimmedQuery, 'i'); // Case-insensitive

      const filtered = playlists.filter((playlist) => {
        // Search in name and tags
        return (
          regex.test(playlist.name) ||
          regex.test(playlist.tags)
        );
      });

      return {
        playlists: filtered,
        isValid: true,
        error: null,
      };
    } catch (err) {
      // Invalid regex pattern
      return {
        playlists: [],
        isValid: false,
        error: 'Invalid regex pattern',
      };
    }
  }

  // Plain text substring search (case-insensitive)
  const lowerQuery = trimmedQuery.toLowerCase();
  const filtered = playlists.filter((playlist) => {
    return (
      playlist.name.toLowerCase().includes(lowerQuery) ||
      playlist.tags.toLowerCase().includes(lowerQuery)
    );
  });

  return {
    playlists: filtered,
    isValid: true,
    error: null,
  };
}
