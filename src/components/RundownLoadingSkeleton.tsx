import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const RundownLoadingSkeleton = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background px-4 py-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-80 bg-muted" />
          <Skeleton className="h-8 w-40 bg-muted" />
        </div>
        <div className="mt-4 flex items-center gap-4">
          <Skeleton className="h-10 w-32 bg-muted" />
          <Skeleton className="h-10 w-48 bg-muted" />
          <div className="ml-auto">
            <Skeleton className="h-10 w-28 bg-muted" />
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4 space-y-4">
        {/* Table header */}
        <Skeleton className="h-12 w-full bg-muted" />
        
        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full bg-muted" />
        ))}
      </div>
    </div>
  );
};

export default RundownLoadingSkeleton;