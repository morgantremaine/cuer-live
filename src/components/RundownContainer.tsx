import React from 'react';
import { useRundown } from '@/hooks/useRundown';
import { useShowcallerVisualState } from '@/hooks/useShowcallerVisualState';
import { useTheme } from '@/hooks/useTheme';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info } from 'lucide-react';
import {
  RundownLayoutWrapper
} from '@/components/RundownLayoutWrapper';
import RundownContent from './RundownContent';

interface RundownContainerProps {
  rundownId: string;
  autoScroll?: boolean;
  onToggleAutoScroll?: (enabled: boolean) => void;
}

const RundownContainer = ({ rundownId, autoScroll, onToggleAutoScroll }: RundownContainerProps) => {
  const { isDark } = useTheme();
  const {
    rundown,
    isLoading: isRundownLoading,
    error: rundownError
  } = useRundown(rundownId);
  const { isLoading: isShowcallerLoading, error: showcallerError } = useShowcallerVisualState(rundownId);

  if (isRundownLoading || isShowcallerLoading) {
    return (
      <RundownLayoutWrapper>
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="w-[200px] h-[20px]" />
          <Skeleton className="w-full h-[40px]" />
          <Skeleton className="w-full h-[40px]" />
          <Skeleton className="w-full h-[40px]" />
          <Skeleton className="w-full h-[40px]" />
        </div>
      </RundownLayoutWrapper>
    );
  }

  if (rundownError || showcallerError) {
    return (
      <RundownLayoutWrapper>
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            There was an error loading the rundown. Please try again.
            {rundownError && <div>Rundown Error: {rundownError}</div>}
            {showcallerError && <div>Showcaller Error: {showcallerError}</div>}
          </AlertDescription>
        </Alert>
      </RundownLayoutWrapper>
    );
  }

  if (!rundown) {
    return (
      <RundownLayoutWrapper>
        <Alert className={isDark ? "bg-gray-800 text-gray-200" : "bg-gray-100 text-gray-700"}>
          <Info className="h-4 w-4" />
          <AlertTitle>Info</AlertTitle>
          <AlertDescription>
            This rundown does not exist.
          </AlertDescription>
        </Alert>
      </RundownLayoutWrapper>
    );
  }

  return (
    <RundownLayoutWrapper>
      <RundownContent 
        rundownId={rundownId}
        autoScroll={autoScroll}
        onToggleAutoScroll={onToggleAutoScroll}
      />
    </RundownLayoutWrapper>
  );
};

export default RundownContainer;
