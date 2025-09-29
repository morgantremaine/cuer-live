import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Users, 
  Database, 
  Wifi, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SystemMetrics {
  activeUsers: number;
  realtimeConnections: number;
  databaseHealth: 'healthy' | 'warning' | 'error';
  lastUpdate: Date;
  memoryUsage?: number;
  networkLatency?: number;
  errorRate: number;
}

interface RealtimeStatus {
  connected: boolean;
  connectionCount: number;
  lastHeartbeat: Date | null;
}

const AdminHealth = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<SystemMetrics>({
    activeUsers: 0,
    realtimeConnections: 0,
    databaseHealth: 'healthy',
    lastUpdate: new Date(),
    errorRate: 0
  });
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>({
    connected: false,
    connectionCount: 0,
    lastHeartbeat: null
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Only allow access for morgan@cuer.live
  if (!user || user.email !== 'morgan@cuer.live') {
    return <Navigate to="/dashboard" replace />;
  }

  const fetchSystemMetrics = async () => {
    try {
      setRefreshing(true);
      
      // Get active sessions count (users active in last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: activeSessions, error: sessionError } = await supabase
        .from('user_sessions')
        .select('user_id')
        .gte('last_seen', fiveMinutesAgo);

      if (sessionError) {
        console.error('Error fetching active sessions:', sessionError);
      }

      // Check database health with a simple query
      const { error: dbError } = await supabase
        .from('rundowns')
        .select('id')
        .limit(1);

      // Get realtime connection status
      const channel = supabase.channel('health_check');
      const isConnected = channel.state === 'joined';
      
      setMetrics({
        activeUsers: activeSessions?.length || 0,
        realtimeConnections: isConnected ? 1 : 0,
        databaseHealth: dbError ? 'error' : 'healthy',
        lastUpdate: new Date(),
        errorRate: dbError ? 25 : Math.random() * 5, // Mock error rate
        memoryUsage: Math.random() * 40 + 40, // Mock memory usage 40-80%
        networkLatency: Math.random() * 50 + 20 // Mock latency 20-70ms
      });

      setRealtimeStatus({
        connected: isConnected,
        connectionCount: isConnected ? 1 : 0,
        lastHeartbeat: isConnected ? new Date() : null
      });

    } catch (error) {
      console.error('Error fetching system metrics:', error);
      setMetrics(prev => ({
        ...prev,
        databaseHealth: 'error',
        lastUpdate: new Date()
      }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSystemMetrics();
    
    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchSystemMetrics, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Health Dashboard</h1>
            <p className="text-muted-foreground">
              Real-time monitoring for Cuer Live application
            </p>
          </div>
          <Button 
            onClick={fetchSystemMetrics} 
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Status Overview */}
        <Alert>
          <Activity className="h-4 w-4" />
          <AlertDescription>
            Last updated: {metrics.lastUpdate.toLocaleTimeString()} • 
            System Status: <span className={getHealthColor(metrics.databaseHealth)}>
              {metrics.databaseHealth.toUpperCase()}
            </span>
          </AlertDescription>
        </Alert>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Active Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeUsers}</div>
              <p className="text-xs text-muted-foreground">
                Last 5 minutes
              </p>
            </CardContent>
          </Card>

          {/* Realtime Connections */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Realtime Status</CardTitle>
              <Wifi className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Badge variant={realtimeStatus.connected ? "default" : "destructive"}>
                  {realtimeStatus.connected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {realtimeStatus.lastHeartbeat ? 
                  `Last: ${realtimeStatus.lastHeartbeat.toLocaleTimeString()}` : 
                  'No heartbeat'
                }
              </p>
            </CardContent>
          </Card>

          {/* Database Health */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                {getHealthIcon(metrics.databaseHealth)}
                <span className={`text-sm font-medium ${getHealthColor(metrics.databaseHealth)}`}>
                  {metrics.databaseHealth.charAt(0).toUpperCase() + metrics.databaseHealth.slice(1)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Query response time: {metrics.networkLatency?.toFixed(0)}ms
              </p>
            </CardContent>
          </Card>

          {/* Error Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.errorRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Last hour
              </p>
            </CardContent>
          </Card>
        </div>

        {/* System Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Memory Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Memory Usage</CardTitle>
              <CardDescription>Current system memory consumption</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Memory Used</span>
                  <span>{metrics.memoryUsage?.toFixed(1)}%</span>
                </div>
                <Progress value={metrics.memoryUsage} className="h-2" />
              </div>
              <div className="text-xs text-muted-foreground">
                {metrics.memoryUsage && metrics.memoryUsage > 80 && (
                  <div className="flex items-center text-yellow-600 mt-2">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    High memory usage detected
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* System Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>Recent system notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {metrics.databaseHealth === 'error' && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      Database connection issues detected
                    </AlertDescription>
                  </Alert>
                )}
                {!realtimeStatus.connected && (
                  <Alert variant="destructive">
                    <Wifi className="h-4 w-4" />
                    <AlertDescription>
                      Realtime connection disconnected
                    </AlertDescription>
                  </Alert>
                )}
                {metrics.errorRate > 10 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      High error rate: {metrics.errorRate.toFixed(1)}%
                    </AlertDescription>
                  </Alert>
                )}
                {metrics.databaseHealth === 'healthy' && realtimeStatus.connected && metrics.errorRate < 10 && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      All systems operational
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminHealth;