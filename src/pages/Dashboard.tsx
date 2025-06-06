
import { useEffect } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardRundownGrid from '@/components/DashboardRundownGrid';
import { useInvitationHandler } from '@/hooks/useInvitationHandler';

const Dashboard = () => {
  // Handle any pending team invitations after login
  useInvitationHandler();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <DashboardRundownGrid />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
