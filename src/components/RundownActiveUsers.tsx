
import React from 'react';
import ProfilePicture from './ProfilePicture';
import { useRundownPresence } from '@/hooks/useRundownPresence';
import { Users } from 'lucide-react';

interface RundownActiveUsersProps {
  rundownId: string | null;
}

const RundownActiveUsers = ({ rundownId }: RundownActiveUsersProps) => {
  const { activeUsers } = useRundownPresence(rundownId);

  console.log('👥 RundownActiveUsers render:', { 
    rundownId, 
    activeUsersCount: activeUsers.length, 
    activeUsers: activeUsers.map(u => ({ 
      id: u.user_id, 
      name: u.profiles?.full_name, 
      email: u.profiles?.email 
    }))
  });

  // Don't render if no rundownId
  if (!rundownId) {
    console.log('⚠️ No rundownId provided to RundownActiveUsers');
    return null;
  }

  return (
    <div className="flex items-center space-x-3 px-4 py-2 bg-gray-800 border-b border-gray-700">
      <div className="flex items-center space-x-2">
        <Users className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-400">
          {activeUsers.length > 0 ? `${activeUsers.length} teammate${activeUsers.length === 1 ? '' : 's'} online` : 'No teammates online'}
        </span>
      </div>
      
      {activeUsers.length > 0 && (
        <div className="flex -space-x-2">
          {activeUsers.map((activeUser) => {
            const displayName = activeUser.profiles?.full_name || activeUser.profiles?.email || 'Unknown User';
            
            return (
              <div
                key={activeUser.user_id}
                className="relative group"
                title={displayName}
              >
                <ProfilePicture
                  url={activeUser.profiles?.profile_picture_url}
                  name={activeUser.profiles?.full_name}
                  email={activeUser.profiles?.email}
                  size="sm"
                  className="border-2 border-gray-800 ring-2 ring-green-400 hover:ring-green-300 transition-all"
                />
                {/* Online indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-green-400 rounded-full border border-gray-800 animate-pulse"></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RundownActiveUsers;
