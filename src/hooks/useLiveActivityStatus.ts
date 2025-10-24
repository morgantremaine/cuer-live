import { useState, useEffect } from 'react';

interface ActivityStatus {
  status: 'active' | 'week' | 'older';
  color: string;
  label: string;
  timeAgo: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member' | 'manager';
  joined_at: string;
  profiles?: {
    email: string;
    full_name: string | null;
  };
}

interface SavedRundown {
  id: string;
  updated_at: string;
  last_updated_by?: string;
  user_id: string;
  creator_profile?: {
    full_name?: string;
    email?: string;
  };
}

export const useLiveActivityStatus = (
  rundown: SavedRundown,
  currentUserId?: string,
  teamMembers: TeamMember[] = []
) => {
  const [activityStatus, setActivityStatus] = useState<ActivityStatus>(() => 
    calculateActivityStatus(rundown, currentUserId, teamMembers)
  );

  useEffect(() => {
    // Update immediately when rundown changes
    setActivityStatus(calculateActivityStatus(rundown, currentUserId, teamMembers));

    // Set up interval to update "time ago" every minute for active items
    const interval = setInterval(() => {
      setActivityStatus(calculateActivityStatus(rundown, currentUserId, teamMembers));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [rundown.updated_at, rundown.last_updated_by, currentUserId, teamMembers]);

  return activityStatus;
};

function calculateActivityStatus(
  rundown: SavedRundown,
  currentUserId?: string,
  teamMembers: TeamMember[] = []
): ActivityStatus {
  const updatedDate = new Date(rundown.updated_at);
  const now = new Date();
  const timeDiff = now.getTime() - updatedDate.getTime();
  const minutesDiff = timeDiff / (1000 * 60);
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
  const weeksDiff = daysDiff / 7;
  const monthsDiff = daysDiff / 30;
  const yearsDiff = daysDiff / 365;

  let timeAgo = '';
  let status: 'active' | 'week' | 'older' = 'older';
  let color = 'bg-gray-500';

  if (minutesDiff < 1) {
    timeAgo = 'just now';
    status = 'active';
    color = 'bg-green-500';
  } else if (minutesDiff < 60) {
    const minutes = Math.floor(minutesDiff);
    timeAgo = `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    status = 'active';
    color = 'bg-green-500';
  } else if (hoursDiff < 24) {
    const hours = Math.floor(hoursDiff);
    timeAgo = `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    status = 'active';
    color = 'bg-green-500';
  } else if (daysDiff < 7) {
    const days = Math.floor(daysDiff);
    timeAgo = `${days} day${days !== 1 ? 's' : ''} ago`;
    status = 'week';
    color = 'bg-blue-500';
  } else if (weeksDiff < 4) {
    const weeks = Math.floor(weeksDiff);
    timeAgo = `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
    status = 'week';
    color = 'bg-blue-500';
  } else if (monthsDiff < 12) {
    const months = Math.floor(monthsDiff);
    timeAgo = `${months} month${months !== 1 ? 's' : ''} ago`;
    status = 'older';
    color = 'bg-gray-500';
  } else {
    const years = Math.floor(yearsDiff);
    timeAgo = `${years} year${years !== 1 ? 's' : ''} ago`;
    status = 'older';
    color = 'bg-gray-500';
  }

  // Determine the last editor's display name
  const getLastEditorName = () => {
    const editorId = rundown.last_updated_by || rundown.user_id;
    if (editorId === currentUserId) return 'You';

    const member = teamMembers.find(m => m.user_id === editorId);
    if (member?.profiles?.full_name) return member.profiles.full_name;
    if (member?.profiles?.email) return member.profiles.email;

    // If the editor is the original creator and we have their profile
    if (editorId === rundown.user_id && rundown.creator_profile?.full_name) return rundown.creator_profile.full_name;
    if (editorId === rundown.user_id && rundown.creator_profile?.email) return rundown.creator_profile.email;

    return 'Unknown User';
  };

  const editorName = getLastEditorName();
  const label = `Edited ${timeAgo} by ${editorName}`;

  return { status, color, label, timeAgo };
}