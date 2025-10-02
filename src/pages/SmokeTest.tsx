import { useState, useEffect } from 'react';
import { runLiveShowSmokeTest, printSmokeTestResults, SmokeTestResult } from '@/utils/liveShowSmokeTest';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SmokeTest() {
  const [results, setResults] = useState<SmokeTestResult[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setResults(null);
    
    try {
      const testResults = await runLiveShowSmokeTest();
      printSmokeTestResults(testResults);
      setResults(testResults);
    } catch (error) {
      console.error('Failed to run smoke tests:', error);
      setResults([{
        test: 'Test Execution',
        passed: false,
        details: `Failed to run tests: ${error}`
      }]);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  const passedCount = results?.filter(r => r.passed).length || 0;
  const totalCount = results?.length || 0;
  const allPassed = results && passedCount === totalCount;

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="text-2xl">🔍</span>
            Live Show Smoke Test
          </CardTitle>
          <p className="text-muted-foreground">
            Critical checks for real-time rundown editing and collaboration
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              {results && (
                <div className="text-lg font-semibold">
                  {allPassed ? (
                    <span className="text-green-600">🎉 All systems ready!</span>
                  ) : (
                    <span className="text-amber-600">⚠️ Issues detected</span>
                  )}
                  <span className="ml-2 text-muted-foreground">
                    ({passedCount}/{totalCount} passed)
                  </span>
                </div>
              )}
            </div>
            
            <Button onClick={runTests} disabled={isRunning}>
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                'Run Tests Again'
              )}
            </Button>
          </div>

          {isRunning && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Running smoke tests...</p>
            </div>
          )}

          {results && !isRunning && (
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.passed
                      ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900'
                      : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.passed ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold">{result.test}</div>
                      {result.details && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {result.details}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2">
            <p className="font-semibold">What these tests verify:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Boolean normalization utility (data consistency)</li>
              <li>Cell broadcast system (real-time updates)</li>
              <li>Structural operation broadcasting (drag/drop, add/delete)</li>
              <li>Multi-user cross-communication (collaboration)</li>
              <li>Cell update coordination (operation ordering)</li>
              <li>Structural save system (database persistence)</li>
              <li>Realtime infrastructure (all connection types)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
