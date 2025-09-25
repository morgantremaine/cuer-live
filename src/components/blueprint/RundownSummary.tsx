import React, { useState, useEffect, useMemo } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, ChevronDown, ChevronUp, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface RundownSection {
  header: RundownItem;
  items: RundownItem[];
  duration: string;
}

interface SectionSummary {
  header: string;
  summary: string;
  isLoading: boolean;
  error?: string;
}

interface RundownSummaryProps {
  rundownItems: RundownItem[];
  rundownTitle: string;
}

// Calculate total duration for a section
const calculateSectionDuration = (header: RundownItem, items: RundownItem[]): string => {
  const allItems = [header, ...items];
  let totalMinutes = 0;

  allItems.forEach(item => {
    if (item.duration) {
      const duration = item.duration.trim();
      const parts = duration.split(':');
      if (parts.length === 2) {
        const minutes = parseInt(parts[0], 10);
        const seconds = parseInt(parts[1], 10);
        if (!isNaN(minutes) && !isNaN(seconds)) {
          totalMinutes += minutes + (seconds / 60);
        }
      }
    }
  });

  const totalMins = Math.floor(totalMinutes);
  const totalSecs = Math.round((totalMinutes - totalMins) * 60);
  return `${totalMins.toString().padStart(2, '0')}:${totalSecs.toString().padStart(2, '0')}`;
};

const RundownSummary: React.FC<RundownSummaryProps> = ({ rundownItems, rundownTitle }) => {
  const [summaries, setSummaries] = useState<Record<string, SectionSummary>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Check if summaries have been generated before for this rundown
  const storageKey = `rundown-summary-generated-${rundownTitle}`;
  const hasGeneratedBefore = localStorage.getItem(storageKey) === 'true';
  
  const [isCollapsed, setIsCollapsed] = useState(hasGeneratedBefore);

  // Group rundown items by sections
  const sections = useMemo(() => {
    const grouped: RundownSection[] = [];
    let currentSection: RundownSection | null = null;

    rundownItems.forEach(item => {
      if (isHeaderItem(item)) {
        // Save previous section if it exists
        if (currentSection) {
          grouped.push(currentSection);
        }
        // Start new section
        currentSection = {
          header: item,
          items: [],
          duration: '00:00'
        };
      } else if (currentSection) {
        currentSection.items.push(item);
      }
      // Note: Items before first header are ignored for now
    });

    // Don't forget the last section
    if (currentSection) {
      grouped.push(currentSection);
    }

    // Calculate durations for each section
    return grouped.map(section => ({
      ...section,
      duration: calculateSectionDuration(section.header, section.items)
    }));
  }, [rundownItems]);

  // Generate summary for a specific section
  const generateSectionSummary = async (section: RundownSection) => {
    const sectionKey = `${section.header.id}_${section.items.length}`;
    
    // Check if we already have a summary for this exact section
    if (summaries[sectionKey] && !summaries[sectionKey].error) {
      return;
    }

    const headerName = section.header.notes || section.header.name || section.header.segmentName || 'Unnamed Section';
    
    setSummaries(prev => ({
      ...prev,
      [sectionKey]: {
        header: headerName,
        summary: '',
        isLoading: true
      }
    }));

    try {
      // Prepare section data for AI
      const sectionData = {
        header: headerName,
        items: section.items.map(item => ({
          name: item.name,
          startTime: item.startTime,
          duration: item.duration,
          talent: item.talent,
          script: item.script,
          gfx: item.gfx,
          video: item.video,
          notes: item.notes
        }))
      };

      logger.blueprint('Generating summary for section:', headerName);

      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          message: `Please provide a concise 2-3 sentence summary of what happens in this rundown section. Focus on the key content, talent, and production elements. Be specific but brief.`,
          rundownData: {
            section: sectionData,
            type: 'section_summary'
          }
        }
      });

      if (error) {
        throw error;
      }

      setSummaries(prev => ({
        ...prev,
        [sectionKey]: {
          header: headerName,
          summary: data.message || 'Unable to generate summary',
          isLoading: false
        }
      }));

    } catch (error) {
      logger.error('Failed to generate section summary:', error);
      setSummaries(prev => ({
        ...prev,
        [sectionKey]: {
          header: headerName,
          summary: '',
          isLoading: false,
          error: 'Failed to generate summary'
        }
      }));
    }
  };

  // Generate summaries for all sections
  const generateAllSummaries = async () => {
    if (sections.length === 0) return;
    
    setIsRefreshing(true);
    
    // Generate summaries for all sections
    const promises = sections.map(section => generateSectionSummary(section));
    await Promise.all(promises);
    
    // Mark that summaries have been generated for this rundown
    localStorage.setItem(storageKey, 'true');
    
    setIsRefreshing(false);
  };

  // Print function to create a print-friendly version
  const handlePrint = () => {
    const printContent = generatePrintContent();
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${rundownTitle} - AI Summary</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 40px;
                line-height: 1.6;
                color: #333;
              }
              h1 {
                font-size: 24px;
                margin-bottom: 30px;
                border-bottom: 2px solid #ddd;
                padding-bottom: 10px;
              }
              .section {
                margin-bottom: 30px;
                page-break-inside: avoid;
              }
              .section-header {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 10px;
                color: #2563eb;
              }
              .section-duration {
                font-size: 14px;
                color: #666;
                margin-left: 10px;
              }
              .section-summary {
                font-size: 14px;
                margin-left: 20px;
                font-style: italic;
                color: #555;
                line-height: 1.5;
              }
              .no-summary {
                color: #999;
              }
              @media print {
                body { margin: 20px; }
                .section { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  // Generate print content
  const generatePrintContent = () => {
    let content = `<h1>${rundownTitle} - AI Rundown Summary</h1>`;
    
    sections.forEach(section => {
      const sectionKey = `${section.header.id}_${section.items.length}`;
      const summary = summaries[sectionKey];
      const headerName = section.header.notes || section.header.name || section.header.segmentName || 'Unnamed Section';
      
      content += `
        <div class="section">
          <div class="section-header">
            ${headerName}
            <span class="section-duration">(${section.duration})</span>
          </div>
          <div class="section-summary ${!summary?.summary ? 'no-summary' : ''}">
            ${summary?.summary || 'No summary available'}
          </div>
        </div>
      `;
    });
    
    return content;
  };

  // Auto-generate summaries only on first visit when sections change
  useEffect(() => {
    if (
      sections.length > 0 && 
      Object.keys(summaries).length === 0 && 
      !hasGeneratedBefore &&
      !isRefreshing
    ) {
      generateAllSummaries();
    }
  }, [sections]);

  // Handle expand/collapse - generate summaries when expanding for the first time
  const handleToggleCollapse = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    
    // If expanding and no summaries exist yet, generate them
    if (!newCollapsedState && Object.keys(summaries).length === 0) {
      generateAllSummaries();
    }
  };

  if (sections.length === 0) {
    return null;
  }

  return (
    <Card className="mb-8 bg-gradient-to-br from-card via-card to-card/80 border-border/50 shadow-xl backdrop-blur-sm">
      <CardHeader className="py-6 bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-foreground">
                AI Rundown Summary
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Intelligent insights for each segment
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrint}
              className="text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200"
              title="Print Summary"
            >
              <Printer className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={generateAllSummaries}
              disabled={isRefreshing}
              className="text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200"
              title="Refresh All Summaries"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleCollapse}
              className="text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200"
              title={isCollapsed ? "Expand Summary" : "Collapse Summary"}
            >
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="pt-6">
          <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50 backdrop-blur-sm">
            {sections.map((section, index) => {
              const sectionKey = `${section.header.id}_${section.items.length}`;
              const summary = summaries[sectionKey];
              const headerName = section.header.notes || section.header.name || section.header.segmentName || 'Unnamed Section';

              return (
                <div key={sectionKey} className={`${index !== 0 ? 'border-t border-border/30' : ''}`}>
                  {/* Header Section */}
                  <div className="px-6 py-4 bg-gradient-to-r from-accent/10 to-accent/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-8 bg-gradient-to-b from-primary to-secondary rounded-full"></div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {headerName}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="px-2 py-1 bg-muted/50 rounded-md">
                              <span className="text-sm font-medium text-muted-foreground">
                                {section.duration}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Summary Section */}
                  <div className="px-6 py-5 bg-card/30">
                    {summary?.isLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-full bg-muted/30" />
                        <Skeleton className="h-4 w-4/5 bg-muted/30" />
                        <Skeleton className="h-4 w-3/4 bg-muted/30" />
                      </div>
                    ) : summary?.error ? (
                      <div className="flex items-center gap-2 text-destructive">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="text-sm font-medium">{summary.error}</span>
                      </div>
                    ) : summary?.summary ? (
                      <div className="bg-gradient-to-r from-muted/10 to-accent/5 rounded-lg p-4 border border-border/20">
                        <p className="text-foreground leading-relaxed text-sm">
                          {summary.summary}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm">No summary available</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default RundownSummary;