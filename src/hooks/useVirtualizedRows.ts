import { useState, useEffect, useCallback, useRef } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';

interface UseVirtualizedRowsProps {
  items: RundownItem[];
  containerRef: React.RefObject<HTMLElement>;
  rowHeight?: number;
  overscan?: number;
}

interface VirtualizedResult {
  virtualItems: RundownItem[];
  startIndex: number;
  endIndex: number;
  totalHeight: number;
  offsetY: number;
}

/**
 * Phase 2: Custom windowing hook for virtualizing large rundown tables
 * Only renders visible rows + overscan buffer for maximum performance
 */
export const useVirtualizedRows = ({
  items,
  containerRef,
  rowHeight = 40,
  overscan = 10
}: UseVirtualizedRowsProps): VirtualizedResult => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const rafRef = useRef<number>();

  // Update scroll position with requestAnimationFrame throttling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        setScrollTop(container.scrollTop);
      });
    };

    const handleResize = () => {
      setContainerHeight(container.clientHeight);
    };

    // Initial size
    handleResize();

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [containerRef]);

  // Calculate visible range
  const calculateVisibleRange = useCallback(() => {
    if (items.length === 0 || containerHeight === 0) {
      return {
        virtualItems: items,
        startIndex: 0,
        endIndex: items.length,
        totalHeight: items.length * rowHeight,
        offsetY: 0
      };
    }

    // Calculate which items are visible
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / rowHeight);
    const endIndex = Math.min(
      items.length,
      startIndex + visibleCount + overscan * 2
    );

    const virtualItems = items.slice(startIndex, endIndex);
    const totalHeight = items.length * rowHeight;
    const offsetY = startIndex * rowHeight;

    return {
      virtualItems,
      startIndex,
      endIndex,
      totalHeight,
      offsetY
    };
  }, [items, scrollTop, containerHeight, rowHeight, overscan]);

  return calculateVisibleRange();
};
