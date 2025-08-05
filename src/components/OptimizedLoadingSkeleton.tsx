import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedLoadingSkeletonProps {
  showSidebar?: boolean;
  showMainContent?: boolean;
}

export const OptimizedLoadingSkeleton = ({ 
  showSidebar = true, 
  showMainContent = true 
}: OptimizedLoadingSkeletonProps) => {
  return (
    <>
      {/* Sidebar skeleton */}
      {showSidebar && (
        <div className="w-80 bg-gray-800 border-r border-gray-700 p-4 animate-pulse">
          <div className="space-y-4">
            <Skeleton className="h-8 w-full bg-gray-700" />
            <Skeleton className="h-6 w-3/4 bg-gray-700" />
            <Skeleton className="h-6 w-1/2 bg-gray-700" />
            <Skeleton className="h-6 w-2/3 bg-gray-700" />
          </div>
        </div>
      )}
      
      {/* Main content skeleton */}
      {showMainContent && (
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0 space-y-6">
              <div className="flex items-center space-x-4 animate-pulse">
                <Skeleton className="h-12 w-40 bg-gray-700" />
                <Skeleton className="h-12 w-32 bg-gray-700" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse">
                    <Skeleton className="h-32 w-full bg-gray-700" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      )}
    </>
  );
};