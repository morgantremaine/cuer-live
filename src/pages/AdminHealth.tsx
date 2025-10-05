import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle2,
  XCircle,
  Loader2,
  PlayCircle,
  Clock
} from 'lucide-react';
import {
  TestResult,
  runAuthenticationTests,
  runInvitationTests,
  runRundownOperationTests,
  runDatabaseTests,
  runRealtimeTests,
  runTeamOperationTests,
  runPerCellSaveTests,
  runDataIntegrityTests
} from '@/utils/systemTests';

interface TestProgress {
  current: number;
  total: number;
  currentTest: string;
}

const AdminHealth = () => {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testProgress, setTestProgress] = useState<TestProgress | null>(null);
  const { toast } = useToast();

  // Only allow access for morgan@cuer.live
  if (!user || user.email !== 'morgan@cuer.live') {
    return <Navigate to="/dashboard" replace />;
  }

  const runSystemTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);
    const results: TestResult[] = [];
    
    try {
      setTestProgress({ current: 1, total: 8, currentTest: 'Authentication' });
      const authTests = await runAuthenticationTests();
      results.push(...authTests);
      
      setTestProgress({ current: 2, total: 8, currentTest: 'Team Invitations' });
      const invitationTests = await runInvitationTests();
      results.push(...invitationTests);
      
      setTestProgress({ current: 3, total: 8, currentTest: 'Rundown Operations' });
      const rundownTests = await runRundownOperationTests();
      results.push(...rundownTests);
      
      setTestProgress({ current: 4, total: 8, currentTest: 'Database Connection' });
      const databaseTests = await runDatabaseTests();
      results.push(...databaseTests);
      
      setTestProgress({ current: 5, total: 8, currentTest: 'Realtime Infrastructure' });
      const realtimeTests = await runRealtimeTests();
      results.push(...realtimeTests);
      
      setTestProgress({ current: 6, total: 8, currentTest: 'Team Operations' });
      const teamTests = await runTeamOperationTests();
      results.push(...teamTests);
      
      setTestProgress({ current: 7, total: 8, currentTest: 'Per-Cell Save System' });
      const perCellTests = await runPerCellSaveTests();
      results.push(...perCellTests);
      
      setTestProgress({ current: 8, total: 8, currentTest: 'Data Integrity' });
      const integrityTests = await runDataIntegrityTests();
      results.push(...integrityTests);
      
      setTestResults(results);
      
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Health Check</h1>
            <p className="text-muted-foreground">
              Run comprehensive tests to verify all critical systems are operational
            </p>
          </div>
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
        </div>

        {/* Test Progress */}
        {isRunningTests && testProgress && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Testing {testProgress.currentTest}...</span>
                  <span className="text-muted-foreground">
                    {testProgress.current}/{testProgress.total}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(testProgress.current / testProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overall Status Summary */}
        {!isRunningTests && testResults.length > 0 && (
          <Alert variant={failedCount === 0 ? "default" : "destructive"}>
            {failedCount === 0 ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription className="font-semibold">
                  🟢 ALL SYSTEMS OPERATIONAL ({passedCount}/{testResults.length} tests passed)
                </AlertDescription>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">
                    🔴 CRITICAL ISSUES FOUND ({passedCount}/{testResults.length} tests passed)
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {testResults
                      .filter(r => !r.passed)
                      .map((result, idx) => (
                        <li key={idx}>
                          {result.category}: {result.test}
                        </li>
                      ))}
                  </ul>
                </AlertDescription>
              </>
            )}
          </Alert>
        )}

        {/* Detailed Test Results */}
        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Detailed Test Results</CardTitle>
              <CardDescription>
                Expand categories to see individual test details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {groupedResults.map((category, idx) => (
                  <AccordionItem key={idx} value={category.name}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        {category.allPassed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium">{category.name}</span>
                        <span className="text-sm text-muted-foreground">
                          ({category.passedCount}/{category.totalCount})
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {category.tests.map((test, testIdx) => (
                          <div key={testIdx} className="border-l-2 pl-4 py-2 border-border">
                            <div className="flex items-start gap-2">
                              {test.passed ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <div className="font-medium">{test.test}</div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{test.duration}ms</span>
                                </div>
                                {test.error && (
                                  <div className="mt-2 text-sm text-red-600 bg-red-50 dark:bg-red-950 p-2 rounded">
                                    {test.error}
                                  </div>
                                )}
                                {test.details && !test.error && (
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {test.details}
                                  </div>
                                )}
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
        )}
      </div>
    </div>
  );
};

export default AdminHealth;
