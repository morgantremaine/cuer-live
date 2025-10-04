import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { 
  Activity, 
  Users, 
  Database, 
  Wifi, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  PlayCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { runLiveShowSmokeTest, SmokeTestResult } from '@/utils/liveShowSmokeTest';
import {
  TestResult,
  runAuthenticationTests,
  runInvitationTests,
  runRundownOperationTests,
  runDatabaseTests,
  runRealtimeTests,
  runTeamOperationTests
} from '@/utils/systemTests';

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

interface TestProgress {
  current: number;
  total: number;
  currentTest: string;
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
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testProgress, setTestProgress] = useState<TestProgress | null>(null);
  const [lastTestRun, setLastTestRun] = useState<Date | null>(null);
  const { toast } = useToast();

  // Only allow access for morgan@cuer.live
  if (!user || user.email !== 'morgan@cuer.live') {
    return <Navigate to="/dashboard" replace />;
  }

  const fetchSystemMetrics = async () => {
    try {
      setRefreshing(true);
      
      // Get active users (users with presence in last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: activeSessions, error: sessionError } = await supabase
        .from('rundown_presence')
        .select('user_id')
        .gte('last_seen', fiveMinutesAgo);

      if (sessionError) {
        console.error('Error fetching active sessions:', sessionError);
      }

      // Get unique user count
      const uniqueUsers = activeSessions ? new Set(activeSessions.map(s => s.user_id)).size : 0;

      // Check database health with a simple query
      const { error: dbError } = await supabase
        .from('rundowns')
        .select('id')
        .limit(1);

      // Get realtime connection status
      const channel = supabase.channel('health_check');
      const isConnected = channel.state === 'joined';
      
      // Measure actual network latency
      const latencyStart = Date.now();
      await supabase.from('rundowns').select('id').limit(1);
      const networkLatency = Date.now() - latencyStart;

      setMetrics({
        activeUsers: uniqueUsers,
        realtimeConnections: isConnected ? 1 : 0,
        databaseHealth: dbError ? 'error' : 'healthy',
        lastUpdate: new Date(),
        errorRate: dbError ? 25 : 0,
        memoryUsage: undefined,
        networkLatency
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

  const runSystemTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);
    const results: TestResult[] = [];
    
    try {
      // Category 1: Authentication Tests
      setTestProgress({ current: 1, total: 6, currentTest: 'Authentication' });
      const authTests = await runAuthenticationTests();
      results.push(...authTests);
      
      // Category 2: Team Invitation Tests
      setTestProgress({ current: 2, total: 6, currentTest: 'Team Invitations' });
      const invitationTests = await runInvitationTests();
      results.push(...invitationTests);
      
      // Category 3: Rundown Operations Tests
      setTestProgress({ current: 3, total: 6, currentTest: 'Rundown Operations' });
      const rundownTests = await runRundownOperationTests();
      results.push(...rundownTests);
      
      // Category 4: Database Connection Tests
      setTestProgress({ current: 4, total: 6, currentTest: 'Database Connection' });
      const databaseTests = await runDatabaseTests();
      results.push(...databaseTests);
      
      // Category 5: Realtime Connection Tests
      setTestProgress({ current: 5, total: 6, currentTest: 'Realtime Infrastructure' });
      const realtimeTests = await runRealtimeTests();
      results.push(...realtimeTests);
      
      // Category 6: Team Operations Tests
      setTestProgress({ current: 6, total: 6, currentTest: 'Team Operations' });
      const teamTests = await runTeamOperationTests();
      results.push(...teamTests);
      
      setTestResults(results);
      setLastTestRun(new Date());
      
      const passedCount = results.filter(r => r.passed).length;
      toast({
        title: "Tests Complete",
        description: `${passedCount}/${results.length} tests passed`,
        variant: passedCount === results.length ? "default" : "destructive"
      });
      
    } catch (error) {
      console.error('Test runner error:', error);
      toast({
        title: "Test Execution Failed",
        description: "An error occurred while running tests",
        variant: "destructive"
      });
    } finally {
      setIsRunningTests(false);
      setTestProgress(null);
    }
  };

  // Group test results by category
  const groupedResults = testResults.reduce((acc, result) => {
    const existing = acc.find(g => g.name === result.category);
    if (existing) {
      existing.tests.push(result);
      existing.passedCount += result.passed ? 1 : 0;
      existing.totalCount += 1;
      existing.allPassed = existing.allPassed && result.passed;
    } else {
      acc.push({
        name: result.category,
        tests: [result],
        passedCount: result.passed ? 1 : 0,
        totalCount: 1,
        allPassed: result.passed
      });
    }
    return acc;
  }, [] as Array<{ name: string; tests: TestResult[]; passedCount: number; totalCount: number; allPassed: boolean }>);

  const passedCount = testResults.filter(r => r.passed).length;
  const failedCount = testResults.length - passedCount;

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
          <div className="flex gap-2">
            <Button 
              onClick={runSystemTests} 
              disabled={isRunningTests}
              variant="default"
              size="lg"
            >
              {isRunningTests ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Run System Tests
                </>
              )}
            </Button>
            <Button 
              onClick={fetchSystemMetrics} 
              disabled={refreshing}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
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

        {/* Test Progress */}
        {isRunningTests && testProgress && (
          <Card>
            <CardHeader>
              <CardTitle>Running System Tests</CardTitle>
              <CardDescription>
                Testing {testProgress.currentTest}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={(testProgress.current / testProgress.total) * 100} />
              <p className="text-sm text-muted-foreground mt-2">
                {testProgress.current} of {testProgress.total} categories completed
              </p>
            </CardContent>
          </Card>
        )}

        {/* Test Results */}
        {testResults.length > 0 && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Tests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{testResults.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Passed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {passedCount}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Failed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {failedCount}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {((passedCount / testResults.length) * 100).toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>System Test Results</span>
                  {lastTestRun && (
                    <Badge variant="outline">
                      Last run: {lastTestRun.toLocaleTimeString()}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {groupedResults.map((category, idx) => (
                    <AccordionItem key={idx} value={category.name}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          {category.allPassed ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span>{category.name}</span>
                          <Badge variant={category.allPassed ? "default" : "destructive"}>
                            {category.passedCount}/{category.totalCount}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          {category.tests.map((test, testIdx) => (
                            <div key={testIdx} className="border-l-2 pl-4 py-2">
                              <div className="flex items-start gap-2">
                                {test.passed ? (
                                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                                )}
                                <div className="flex-1">
                                  <p className="font-medium">{test.test}</p>
                                  {test.details && (
                                    <p className="text-sm text-muted-foreground">
                                      {test.details}
                                    </p>
                                  )}
                                  {test.error && (
                                    <Alert variant="destructive" className="mt-2">
                                      <AlertDescription>{test.error}</AlertDescription>
                                    </Alert>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Duration: {test.duration}ms
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </>
        )}

        {/* System Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Network Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Network Performance</CardTitle>
              <CardDescription>Database query latency</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.networkLatency?.toFixed(0)}ms</div>
              <p className="text-xs text-muted-foreground mt-1">
                Average query response time
              </p>
              {metrics.networkLatency && metrics.networkLatency > 200 && (
                <div className="flex items-center text-yellow-600 mt-2">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  High latency detected
                </div>
              )}
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