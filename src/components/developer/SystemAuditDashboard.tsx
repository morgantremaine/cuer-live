/**
 * System Audit Dashboard - Development Tool
 * 
 * Provides real-time monitoring of signature systems, state transitions,
 * conflict resolutions, and performance anomalies across the application.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAuditReport, clearAuditData } from '@/utils/systemAudit';

interface SystemAuditDashboardProps {
  isVisible: boolean;
  onToggle: () => void;
}

export const SystemAuditDashboard: React.FC<SystemAuditDashboardProps> = ({
  isVisible,
  onToggle
}) => {
  const [auditData, setAuditData] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(2000);

  const refreshAuditData = useCallback(() => {
    const report = getAuditReport();
    setAuditData(report);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    refreshAuditData();

    if (autoRefresh) {
      const interval = setInterval(refreshAuditData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [isVisible, autoRefresh, refreshInterval, refreshAuditData]);

  const handleClearData = useCallback(() => {
    clearAuditData();
    refreshAuditData();
  }, [refreshAuditData]);

  if (!isVisible || process.env.NODE_ENV !== 'development') {
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getInconsistencyColor = (count: number) => {
    if (count === 0) return 'bg-green-500';
    if (count < 5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl h-[90vh] bg-gray-900 text-white border-gray-700">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-white">System Audit Dashboard</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="text-xs"
            >
              {autoRefresh ? 'Pause' : 'Resume'} Auto-refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearData}
              className="text-xs"
            >
              Clear Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onToggle}
              className="text-xs"
            >
              Close
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden">
          {auditData && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <Card className="bg-gray-800 border-gray-600">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-white">
                      {auditData.summary.totalInconsistencies}
                    </div>
                    <div className="text-sm text-gray-400">Signature Inconsistencies</div>
                    <Badge className={getInconsistencyColor(auditData.summary.totalInconsistencies)}>
                      {auditData.summary.totalInconsistencies === 0 ? 'All Good' : 'Issues Found'}
                    </Badge>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-800 border-gray-600">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-white">
                      {auditData.summary.criticalAnomalies}
                    </div>
                    <div className="text-sm text-gray-400">Critical Anomalies</div>
                    <Badge className={auditData.summary.criticalAnomalies > 0 ? 'bg-red-500' : 'bg-green-500'}>
                      {auditData.summary.criticalAnomalies === 0 ? 'Stable' : 'Critical Issues'}
                    </Badge>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-800 border-gray-600">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-white">
                      {auditData.summary.dataLossEvents}
                    </div>
                    <div className="text-sm text-gray-400">Data Loss Events</div>
                    <Badge className={auditData.summary.dataLossEvents > 0 ? 'bg-red-500' : 'bg-green-500'}>
                      {auditData.summary.dataLossEvents === 0 ? 'No Data Loss' : 'Data Lost'}
                    </Badge>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-800 border-gray-600">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-white">
                      {auditData.summary.recentSaveRate.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-400">Saves/min (last 5min)</div>
                    <Badge className={auditData.summary.recentSaveRate > 10 ? 'bg-orange-500' : 'bg-green-500'}>
                      {auditData.summary.recentSaveRate > 10 ? 'High Activity' : 'Normal'}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Tabs */}
              <Tabs defaultValue="signatures" className="flex-1 flex flex-col">
                <TabsList className="grid grid-cols-4 bg-gray-800">
                  <TabsTrigger value="signatures" className="text-white">
                    Signatures ({auditData.signatureHistory.length})
                  </TabsTrigger>
                  <TabsTrigger value="transitions" className="text-white">
                    State Transitions ({auditData.stateTransitions.length})
                  </TabsTrigger>
                  <TabsTrigger value="conflicts" className="text-white">
                    Conflicts ({auditData.conflictResolutions.length})
                  </TabsTrigger>
                  <TabsTrigger value="performance" className="text-white">
                    Performance ({auditData.performanceAnomalies.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signatures" className="flex-1">
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {auditData.signatureHistory.slice(-20).reverse().map((audit: any, index: number) => (
                        <Card key={index} className="bg-gray-800 border-gray-600">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div className="text-sm font-medium text-white">{audit.context}</div>
                              <div className="text-xs text-gray-400">
                                {new Date(audit.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                              <div>
                                <div className="text-gray-400">Content:</div>
                                <div className="text-white">{audit.content.length} chars</div>
                              </div>
                              <div>
                                <div className="text-gray-400">Undo:</div>
                                <div className="text-white">{audit.undo.length} chars</div>
                              </div>
                              <div>
                                <div className="text-gray-400">Header:</div>
                                <div className="text-white">{audit.header.length} chars</div>
                              </div>
                              <div>
                                <div className="text-gray-400">Lightweight:</div>
                                <div className="text-white">{audit.lightweight.length} chars</div>
                              </div>
                            </div>
                            
                            {audit.inconsistencies.length > 0 && (
                              <div className="mt-2">
                                <div className="text-xs text-red-400 font-medium">Inconsistencies:</div>
                                {audit.inconsistencies.map((issue: string, i: number) => (
                                  <div key={i} className="text-xs text-red-300 ml-2">• {issue}</div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="transitions" className="flex-1">
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {auditData.stateTransitions.slice(-30).reverse().map((transition: any, index: number) => (
                        <Card key={index} className="bg-gray-800 border-gray-600">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div className="text-sm font-medium text-white">
                                {transition.from} → {transition.to}
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(transition.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                            <div className="text-xs text-gray-300">{transition.reason}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              Context: {transition.context} | Source: {transition.triggerSource}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="conflicts" className="flex-1">
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {auditData.conflictResolutions.slice(-20).reverse().map((conflict: any, index: number) => (
                        <Card key={index} className={`border-gray-600 ${conflict.dataLost ? 'bg-red-900' : 'bg-gray-800'}`}>
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div className="text-sm font-medium text-white">
                                {conflict.conflictType}
                              </div>
                              <div className="flex items-center gap-2">
                                {conflict.dataLost && (
                                  <Badge className="bg-red-500 text-xs">Data Lost</Badge>
                                )}
                                <div className="text-xs text-gray-400">
                                  {new Date(conflict.timestamp).toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-300 mb-1">
                              Resolution: {conflict.resolution}
                            </div>
                            <div className="text-xs text-gray-400">{conflict.reason}</div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="performance" className="flex-1">
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {auditData.performanceAnomalies.slice(-20).reverse().map((anomaly: any, index: number) => (
                        <Card key={index} className="bg-gray-800 border-gray-600">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium text-white">{anomaly.type}</div>
                                <Badge className={getSeverityColor(anomaly.severity)}>
                                  {anomaly.severity}
                                </Badge>
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(anomaly.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                            <div className="text-xs text-gray-300">
                              Context: {anomaly.context}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {JSON.stringify(anomaly.details, null, 2)}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemAuditDashboard;