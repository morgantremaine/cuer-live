import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  RefreshCw, 
  Users, 
  FileText, 
  Activity, 
  UserPlus, 
  Clock,
  ArrowLeft,
  Database,
  Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Stats {
  totalUsers: number;
  totalTeams: number;
  totalRundowns: number;
  activeUsers24h: number;
  rundownsEdited24h: number;
  newUsers7d: number;
}

interface RecentActivity {
  id: string;
  title: string;
  team_name: string;
  updated_at: string;
  last_updated_by_name: string;
  last_updated_by_email: string;
}

interface ActiveUser {
  user_id: string;
  user_name: string;
  user_email: string;
  rundown_title: string;
  rundown_id: string;
  last_edit: string;
}

interface NewUser {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  teams: string[];
}

interface TeamStat {
  id: string;
  name: string;
  member_count: number;
  created_at: string;
}

interface SubscriptionStat {
  tier: string;
  count: number;
  grandfathered: number;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [newUsers, setNewUsers] = useState<NewUser[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStat[]>([]);
  const [subscriptionStats, setSubscriptionStats] = useState<SubscriptionStat[]>([]);

  // Access control - only morgan@cuer.live
  useEffect(() => {
    if (user && user.email !== 'morgan@cuer.live') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const fetchData = async () => {
    if (!user || user.email !== 'morgan@cuer.live') return;

    try {
      // Fetch all data in parallel
      const [
        usersResult,
        teamsResult,
        rundownsResult,
        activeUsersResult,
        recentRundownsResult,
        newUsersResult,
        teamMembersResult,
        subscribersResult
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('teams').select('id', { count: 'exact', head: true }),
        supabase.from('rundowns').select('id', { count: 'exact', head: true }),
        // Active users in last 24h (users who edited rundowns)
        supabase.from('rundowns')
          .select('last_updated_by')
          .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .not('last_updated_by', 'is', null),
        // Recent activity - rundowns with profile join
        supabase.from('rundowns')
          .select(`
            id,
            title,
            updated_at,
            last_updated_by,
            team_id,
            teams!rundowns_team_id_fkey(name)
          `)
          .order('updated_at', { ascending: false })
          .limit(30),
        // New users in last 14 days
        supabase.from('profiles')
          .select('id, email, full_name, created_at')
          .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false }),
        // Team members for counting
        supabase.from('team_members')
          .select('team_id, user_id'),
        // Subscribers
        supabase.from('subscribers')
          .select('subscription_tier, grandfathered')
      ]);

      // Calculate stats
      const uniqueActiveUserIds = new Set(activeUsersResult.data?.map(r => r.last_updated_by) || []);
      const rundownsEdited24h = activeUsersResult.data?.length || 0;

      // Count new users in last 7 days
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const newUsers7d = newUsersResult.data?.filter(
        u => new Date(u.created_at).getTime() > sevenDaysAgo
      ).length || 0;

      setStats({
        totalUsers: usersResult.count || 0,
        totalTeams: teamsResult.count || 0,
        totalRundowns: rundownsResult.count || 0,
        activeUsers24h: uniqueActiveUserIds.size,
        rundownsEdited24h,
        newUsers7d
      });

      // Process recent activity - fetch profile names
      const profileIds = [...new Set(recentRundownsResult.data?.map(r => r.last_updated_by).filter(Boolean) || [])];
      const profilesResult = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', profileIds);
      
      const profileMap = new Map(profilesResult.data?.map(p => [p.id, p]) || []);

      const recentActivityData: RecentActivity[] = (recentRundownsResult.data || []).map(r => ({
        id: r.id,
        title: r.title,
        team_name: (r.teams as any)?.name || 'Unknown Team',
        updated_at: r.updated_at,
        last_updated_by_name: profileMap.get(r.last_updated_by)?.full_name || 'Unknown',
        last_updated_by_email: profileMap.get(r.last_updated_by)?.email || ''
      }));
      setRecentActivity(recentActivityData);

      // Process active users (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const activeRundownsResult = await supabase
        .from('rundowns')
        .select(`
          id,
          title,
          updated_at,
          last_updated_by
        `)
        .gte('updated_at', fiveMinutesAgo)
        .not('last_updated_by', 'is', null)
        .order('updated_at', { ascending: false });

      const activeUserMap = new Map<string, ActiveUser>();
      for (const r of activeRundownsResult.data || []) {
        if (r.last_updated_by && !activeUserMap.has(r.last_updated_by)) {
          const profile = profileMap.get(r.last_updated_by);
          activeUserMap.set(r.last_updated_by, {
            user_id: r.last_updated_by,
            user_name: profile?.full_name || 'Unknown',
            user_email: profile?.email || '',
            rundown_title: r.title,
            rundown_id: r.id,
            last_edit: r.updated_at
          });
        }
      }
      setActiveUsers(Array.from(activeUserMap.values()));

      // Process new users with their teams
      const newUserIds = newUsersResult.data?.map(u => u.id) || [];
      const userTeamsResult = await supabase
        .from('team_members')
        .select('user_id, teams!team_members_team_id_fkey(name)')
        .in('user_id', newUserIds);

      const userTeamsMap = new Map<string, string[]>();
      for (const tm of userTeamsResult.data || []) {
        const teamName = (tm.teams as any)?.name;
        if (teamName) {
          const existing = userTeamsMap.get(tm.user_id) || [];
          existing.push(teamName);
          userTeamsMap.set(tm.user_id, existing);
        }
      }

      const newUsersData: NewUser[] = (newUsersResult.data || []).map(u => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name || '',
        created_at: u.created_at,
        teams: userTeamsMap.get(u.id) || []
      }));
      setNewUsers(newUsersData);

      // Process team stats
      const teamMemberCounts = new Map<string, number>();
      for (const tm of teamMembersResult.data || []) {
        teamMemberCounts.set(tm.team_id, (teamMemberCounts.get(tm.team_id) || 0) + 1);
      }

      const teamsDetailResult = await supabase
        .from('teams')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      const teamStatsData: TeamStat[] = (teamsDetailResult.data || [])
        .map(t => ({
          id: t.id,
          name: t.name,
          member_count: teamMemberCounts.get(t.id) || 0,
          created_at: t.created_at
        }))
        .sort((a, b) => b.member_count - a.member_count);
      setTeamStats(teamStatsData);

      // Process subscription stats
      const tierCounts = new Map<string, { count: number; grandfathered: number }>();
      for (const sub of subscribersResult.data || []) {
        const tier = sub.subscription_tier || 'Free';
        const existing = tierCounts.get(tier) || { count: 0, grandfathered: 0 };
        existing.count++;
        if (sub.grandfathered) existing.grandfathered++;
        tierCounts.set(tier, existing);
      }

      const subscriptionStatsData: SubscriptionStat[] = Array.from(tierCounts.entries())
        .map(([tier, data]) => ({
          tier,
          count: data.count,
          grandfathered: data.grandfathered
        }))
        .sort((a, b) => b.count - a.count);
      setSubscriptionStats(subscriptionStatsData);

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (!user || user.email !== 'morgan@cuer.live') {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">System Admin Dashboard</h1>
              <p className="text-muted-foreground text-sm">Real-time monitoring for cuer.live</p>
            </div>
          </div>
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-xs">Total Users</span>
              </div>
              <p className="text-2xl font-bold">{stats?.totalUsers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Database className="h-4 w-4" />
                <span className="text-xs">Total Teams</span>
              </div>
              <p className="text-2xl font-bold">{stats?.totalTeams}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <FileText className="h-4 w-4" />
                <span className="text-xs">Total Rundowns</span>
              </div>
              <p className="text-2xl font-bold">{stats?.totalRundowns}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-500 mb-1">
                <Activity className="h-4 w-4" />
                <span className="text-xs">Active (24h)</span>
              </div>
              <p className="text-2xl font-bold text-green-500">{stats?.activeUsers24h}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-500 mb-1">
                <Zap className="h-4 w-4" />
                <span className="text-xs">Edits (24h)</span>
              </div>
              <p className="text-2xl font-bold text-blue-500">{stats?.rundownsEdited24h}</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/10 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-purple-500 mb-1">
                <UserPlus className="h-4 w-4" />
                <span className="text-xs">New (7d)</span>
              </div>
              <p className="text-2xl font-bold text-purple-500">{stats?.newUsers7d}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Currently Active Users */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                Currently Active Users
              </CardTitle>
              <CardDescription>Users who edited in the last 5 minutes</CardDescription>
            </CardHeader>
            <CardContent>
              {activeUsers.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">No active users right now</p>
              ) : (
                <div className="space-y-3">
                  {activeUsers.map((user) => (
                    <div key={user.user_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{user.user_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{user.user_email}</p>
                      </div>
                      <div className="text-right">
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="h-auto p-0 text-xs"
                          onClick={() => window.open(`/rundown/${user.rundown_id}`, '_blank')}
                        >
                          {user.rundown_title.slice(0, 25)}{user.rundown_title.length > 25 ? '...' : ''}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(user.last_edit), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* New Users */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                New Users (14 days)
              </CardTitle>
              <CardDescription>Recent signups and their team memberships</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[280px]">
                {newUsers.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">No new users</p>
                ) : (
                  <div className="space-y-3">
                    {newUsers.map((user) => (
                      <div key={user.id} className="p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{user.full_name || 'No name'}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {user.teams.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {user.teams.map((team, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {team}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest rundown edits across all users</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {recentActivity.map((activity) => (
                  <div 
                    key={activity.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => window.open(`/rundown/${activity.id}`, '_blank')}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{activity.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{activity.team_name}</span>
                        <span>•</span>
                        <span>{activity.last_updated_by_name}</span>
                        {activity.last_updated_by_email && (
                          <>
                            <span>•</span>
                            <span className="truncate">{activity.last_updated_by_email}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                      {formatDistanceToNow(new Date(activity.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Bottom Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Team Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Teams by Size</CardTitle>
              <CardDescription>Teams sorted by member count</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {teamStats.filter(t => t.member_count > 1).map((team) => (
                    <div key={team.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{team.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Created {formatDistanceToNow(new Date(team.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant={team.member_count > 3 ? 'default' : 'secondary'}>
                        {team.member_count} members
                      </Badge>
                    </div>
                  ))}
                  {teamStats.filter(t => t.member_count > 1).length === 0 && (
                    <p className="text-muted-foreground text-sm py-4 text-center">No multi-member teams</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Subscription Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Subscriptions</CardTitle>
              <CardDescription>User subscription tiers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {subscriptionStats.map((stat) => (
                  <div key={stat.tier} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Badge variant={stat.tier === 'Network' || stat.tier === 'Enterprise' ? 'default' : 'secondary'}>
                        {stat.tier}
                      </Badge>
                      {stat.grandfathered > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({stat.grandfathered} grandfathered)
                        </span>
                      )}
                    </div>
                    <p className="text-xl font-bold">{stat.count}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
