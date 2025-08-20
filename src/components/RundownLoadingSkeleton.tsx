import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const columnWidths = [64, 220, 140, 260, 120, 180, 220]; // row number + 6 cols

const RundownLoadingSkeleton = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-72 bg-muted" />
            <Skeleton className="h-6 w-28 bg-muted" />
            <Skeleton className="h-6 w-36 bg-muted" />
            <Skeleton className="h-6 w-28 bg-muted" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 bg-muted" />
            <Skeleton className="h-9 w-9 bg-muted" />
            <Skeleton className="h-9 w-9 bg-muted" />
            <Skeleton className="h-9 w-24 bg-muted" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Skeleton className="h-9 w-28 bg-muted" />
          <Skeleton className="h-9 w-28 bg-muted" />
          <Skeleton className="h-9 w-40 bg-muted" />
          <Skeleton className="h-9 w-32 bg-muted" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-9 w-28 bg-muted" />
            <Skeleton className="h-9 w-24 bg-muted" />
          </div>
        </div>
      </div>

      {/* Table skeleton */}
      <div className="flex-1 overflow-hidden bg-background">
        <div className="w-full h-full overflow-auto">
          <div className="min-w-[1100px]">
            {/* Header row */}
            <div className="sticky top-0 z-10 bg-background border-b border-border">
              <div className="flex">
                {columnWidths.map((w, i) => (
                  <div key={i} style={{ width: w }} className="px-2 py-2">
                    <Skeleton className="h-6 w-full bg-muted" />
                  </div>
                ))}
              </div>
            </div>
            {/* Body rows */}
            {Array.from({ length: 10 }).map((_, r) => (
              <div key={r} className="flex border-b border-border">
                {columnWidths.map((w, i) => (
                  <div key={i} style={{ width: w }} className="px-2 py-3">
                    <Skeleton className="h-5 w-full bg-muted" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RundownLoadingSkeleton;