
import React from 'react';
import ProfilePicture from './ProfilePicture';
import { useRundownPresence } from '@/hooks/useRundownPresence';
import { Users } from 'lucide-react';

interface RundownActiveUsersProps {
  rundownId: string | null;
}

const RundownActiveUsers = ({ rundownId }: RundownActiveUsersProps) => {
  const { activeUsers } = useRundownPresence(rundownId);

  if (!rundownId || activeUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
      <Users className="h-4 w-4 text-gray-400" />
      <span className="text-sm text-gray-400">Active teammates:</span>
      <div className="flex -space-x-2">
        {activeUsers.map((activeUser) => (
          <div
            key={activeUser.user_id}
            className="relative"
            title={activeUser.profiles?.full_name || activeUser.profiles?.email || 'Unknown User'}
          >
            <ProfilePicture
              url={activeUser.profiles?.profile_picture_url}
              name={activeUser.profiles?.full_name}
              email={activeUser.profiles?.email}
              size="sm"
              className="border-2 border-gray-800 ring-2 ring-green-500"
            />
            {/* Online indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full border border-gray-800"></div>
          </div>
        ))}
      </div>
      {activeUsers.length > 0 && (
        <span className="text-xs text-gray-500">
          ({activeUsers.length} online)
        </span>
      )}
    </div>
  );
};

export default RundownActiveUsers;
