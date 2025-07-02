
import React from 'react';
import { useNavigate } from 'react-router-dom';
import RundownCard from './RundownCard';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import type { Tables } from '@/integrations/supabase/types';

type Rundown = Tables<'rundowns'>;

interface DashboardRundownGridProps {
  rundowns: Rundown[];
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onDuplicate: (rundown: Rundown) => void;
  isLoading?: boolean;
}

export const DashboardRundownGrid: React.FC<DashboardRundownGridProps> = ({
  rundowns,
  onDelete,
  onArchive,
  onDuplicate,
  isLoading = false
}) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (rundowns.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardHeader>
          <CardTitle>No rundowns found</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">
            Create your first rundown to get started
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {rundowns.map((rundown) => (
        <RundownCard
          key={rundown.id}
          rundown={rundown}
          onClick={() => navigate(`/rundown/${rundown.id}`)}
          onDelete={() => onDelete(rundown.id)}
          onArchive={() => onArchive(rundown.id)}
          onDuplicate={() => onDuplicate(rundown)}
        />
      ))}
    </div>
  );
};
