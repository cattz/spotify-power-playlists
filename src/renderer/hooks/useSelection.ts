/**
 * Custom hook for managing multi-selection state
 */

import { useState, useCallback } from 'react';

interface UseSelectionReturn {
  selectedIds: Set<string>;
  isSelected: (id: string) => boolean;
  toggleSelection: (id: string) => void;
  selectRange: (startId: string, endId: string, allIds: string[]) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setLastClickedId: (id: string) => void;
}

export function useSelection(): UseSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);

  /**
   * Check if an item is selected
   */
  const isSelected = useCallback(
    (id: string): boolean => {
      return selectedIds.has(id);
    },
    [selectedIds]
  );

  /**
   * Toggle selection for a single item
   */
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setLastClickedId(id);
  }, []);

  /**
   * Select a range of items between two IDs
   */
  const selectRange = useCallback(
    (startId: string, endId: string, allIds: string[]) => {
      const startIdx = allIds.indexOf(startId);
      const endIdx = allIds.indexOf(endId);

      if (startIdx === -1 || endIdx === -1) return;

      const minIdx = Math.min(startIdx, endIdx);
      const maxIdx = Math.max(startIdx, endIdx);

      const rangeIds = allIds.slice(minIdx, maxIdx + 1);

      setSelectedIds((prev) => {
        const next = new Set(prev);
        rangeIds.forEach((id) => next.add(id));
        return next;
      });
    },
    []
  );

  /**
   * Select all items
   */
  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastClickedId(null);
  }, []);

  return {
    selectedIds,
    isSelected,
    toggleSelection,
    selectRange,
    selectAll,
    clearSelection,
    setLastClickedId: (id: string) => setLastClickedId(id),
  };
}
