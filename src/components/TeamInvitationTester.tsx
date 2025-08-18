import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useTeam } from '@/hooks/useTeam';
import { useToast } from '@/hooks/use-toast';
import { TestTube, Download, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { 
  testTeamInvitationWorkflow, 
  testInvitationTokenValidation, 
  generateTestReport,
  type InvitationTestResult 
} from '@/utils/teamInvitationTester';

const TeamInvitationTester = () => {
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testToken, setTestToken] = useState('');
  const [isTestingWorkflow, setIsTestingWorkflow] = useState(false);
  const [isTestingToken, setIsTestingToken] = useState(false);
  const [workflowResults, setWorkflowResults] = useState<InvitationTestResult[]>([]);
  const [tokenResults, setTokenResults] = useState<InvitationTestResult[]>([]);
  
  const { team, userRole } = useTeam();
  const { toast } = useToast();

  // Only show for admins
  if (userRole !== 'admin') {
    return null;
  }

  const handleTestWorkflow = async () => {
    if (!team?.id || !testEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a test email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsTestingWorkflow(true);
    try {
      const results = await testTeamInvitationWorkflow(testEmail.trim(), team.id);
      setWorkflowResults(results);
      
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      toast({
        title: 'Test Completed',
        description: `${successCount}/${totalCount} tests passed`,
        variant: successCount === totalCount ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: `Error running tests: ${error}`,
        variant: 'destructive',
      });
    }
    setIsTestingWorkflow(false);
  };

  const handleTestToken = async () => {
    if (!testToken.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a test token.',
        variant: 'destructive',
      });
      return;
    }

    setIsTestingToken(true);
    try {
      const results = await testInvitationTokenValidation(testToken.trim());
      setTokenResults(results);
      
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      toast({
        title: 'Token Test Completed',
        description: `${successCount}/${totalCount} tests passed`,
        variant: successCount === totalCount ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Token Test Failed',
        description: `Error testing token: ${error}`,
        variant: 'destructive',
      });
    }
    setIsTestingToken(false);
  };

  const downloadReport = (results: InvitationTestResult[], type: string) => {
    const report = generateTestReport(results);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-invitation-${type}-test-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderResults = (results: InvitationTestResult[]) => {
    if (results.length === 0) return null;

    return (
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {results.map((result, index) => (
          <div key={index} className="flex items-start gap-2 p-2 rounded border text-sm">
            {result.success ? (
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium">{result.step}</div>
              {result.error && (
                <div className="text-red-600 text-xs mt-1">{result.error}</div>
              )}
              {result.data && (
                <div className="text-gray-600 text-xs mt-1 font-mono">
                  {JSON.stringify(result.data, null, 2)}
                </div>
              )}
            </div>
            <Badge variant={result.success ? 'default' : 'destructive'} className="text-xs">
              {result.success ? 'PASS' : 'FAIL'}
            </Badge>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Team Invitation Tester
        </CardTitle>
        <CardDescription>
          Test the team invitation workflow to identify and debug issues. For admins only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Workflow Test */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="test-email">Test Email for Workflow</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="flex-1"
              />
              <Button 
                onClick={handleTestWorkflow} 
                disabled={isTestingWorkflow}
                className="flex-shrink-0"
              >
                {isTestingWorkflow ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Testing...
                  </>
                ) : (
                  'Test Workflow'
                )}
              </Button>
            </div>
          </div>

          {workflowResults.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Workflow Test Results</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadReport(workflowResults, 'workflow')}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download Report
                </Button>
              </div>
              {renderResults(workflowResults)}
            </div>
          )}
        </div>

        {/* Token Test */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="test-token">Test Invitation Token</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="test-token"
                type="text"
                value={testToken}
                onChange={(e) => setTestToken(e.target.value)}
                placeholder="Enter invitation token to test"
                className="flex-1"
              />
              <Button 
                onClick={handleTestToken} 
                disabled={isTestingToken}
                className="flex-shrink-0"
              >
                {isTestingToken ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Testing...
                  </>
                ) : (
                  'Test Token'
                )}
              </Button>
            </div>
          </div>

          {tokenResults.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Token Test Results</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadReport(tokenResults, 'token')}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download Report
                </Button>
              </div>
              {renderResults(tokenResults)}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">How to Use This Tester</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li><strong>Workflow Test:</strong> Tests the complete invitation process for a given email</li>
            <li><strong>Token Test:</strong> Validates and tests an existing invitation token</li>
            <li>Use real email addresses that don't exist in your team for workflow testing</li>
            <li>Download detailed reports for debugging and documentation</li>
            <li>All tests are read-only and won't send actual emails</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamInvitationTester;