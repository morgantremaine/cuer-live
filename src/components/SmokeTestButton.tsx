import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { TestTube, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { runLiveShowSmokeTest, printSmokeTestResults, type SmokeTestResult } from '@/utils/liveShowSmokeTest';

interface SmokeTestButtonProps {
  userEmail?: string;
}

export const SmokeTestButton = ({ userEmail }: SmokeTestButtonProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<SmokeTestResult[] | null>(null);

  // Only show for morgan@cuer.live
  if (userEmail !== 'morgan@cuer.live') {
    return null;
  }

  const handleRunTests = async () => {
    setIsRunning(true);
    setResults(null);
    
    try {
      const testResults = await runLiveShowSmokeTest();
      setResults(testResults);
      
      // Also print to console for debugging
      printSmokeTestResults(testResults);
    } catch (error) {
      console.error('❌ Smoke test failed:', error);
      setResults([{
        test: 'Smoke Test Runner',
        passed: false,
        details: `Failed to run tests: ${error}`
      }]);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getStatusBadge = (passed: boolean) => {
    return (
      <Badge variant={passed ? "default" : "destructive"} className="ml-2">
        {passed ? "PASS" : "FAIL"}
      </Badge>
    );
  };

  const passedCount = results?.filter(r => r.passed).length || 0;
  const totalCount = results?.length || 0;
  const allPassed = results && passedCount === totalCount;

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <TestTube className="h-4 w-4" />
          Run Live Show Smoke Test
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Live Show Smoke Test
            {results && (
              <Badge 
                variant={allPassed ? "default" : "destructive"}
                className="ml-2"
              >
                {passedCount}/{totalCount} passed
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Run these critical checks before your live show to ensure collaborative editing works smoothly.
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleRunTests} 
              disabled={isRunning}
              className="gap-2"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4" />
                  Run Tests
                </>
              )}
            </Button>
          </div>

          {results && (
            <div className="space-y-3">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  Test Results
                  {allPassed ? (
                    <Badge variant="default" className="bg-green-600">
                      🎉 All systems ready for your live show!
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      ⚠️ Some issues detected - please review
                    </Badge>
                  )}
                </h3>
                
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <div 
                      key={index} 
                      className="flex items-start gap-3 p-3 rounded border"
                    >
                      {getStatusIcon(result.passed)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{result.test}</span>
                          {getStatusBadge(result.passed)}
                        </div>
                        {result.details && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {result.details}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground">
                💡 Tip: If tests fail, check the browser console for detailed error messages.
              </div>
            </div>
          )}
          
          {!results && !isRunning && (
            <div className="text-sm text-muted-foreground border rounded-lg p-4">
              <div className="font-medium mb-2">What this tests:</div>
              <ul className="space-y-1 text-xs">
                <li>• Boolean normalization utilities</li>
                <li>• Float field synchronization</li>
                <li>• Cell broadcast system availability</li>
                <li>• Structural change handling</li>
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};