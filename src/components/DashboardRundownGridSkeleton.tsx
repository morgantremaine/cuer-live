
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

const DashboardRundownGridSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Title skeleton */}
      <Skeleton className="h-8 w-48" />
      
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-4" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DashboardRundownGridSkeleton;
