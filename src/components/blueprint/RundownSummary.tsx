import React, { useState, useEffect, useMemo } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    
    setIsRefreshing(false);
  };

  // Auto-generate summaries when sections change
  useEffect(() => {
    if (sections.length > 0 && Object.keys(summaries).length === 0) {
      generateAllSummaries();
    }
  }, [sections]);

  if (sections.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6 bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium text-white">
            AI Rundown Summary
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={generateAllSummaries}
              disabled={isRefreshing}
              className="text-gray-300 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-gray-300 hover:text-white"
            >
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="pt-0">
          <div className="rounded-lg border border-gray-600 overflow-hidden">
            <table className="w-full">
              <tbody className="bg-background">
                {sections.map((section, index) => {
                  const sectionKey = `${section.header.id}_${section.items.length}`;
                  const summary = summaries[sectionKey];
                  const headerName = section.header.notes || section.header.name || section.header.segmentName || 'Unnamed Section';

                  return (
                    <>
                      {/* Header Row - matches rundown styling */}
                      <tr key={`header-${sectionKey}`} className="border-b border-gray-600 bg-gray-750">
                        <td className="px-4 py-6 align-middle">
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-white">
                              {headerName}
                            </span>
                            <span className="text-base font-medium text-gray-300 ml-6">
                              ({section.duration})
                            </span>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Summary Row */}
                      <tr key={`summary-${sectionKey}`} className="border-b border-gray-600 bg-gray-800">
                        <td className="px-4 py-4">
                          {summary?.isLoading ? (
                            <div className="space-y-2">
                              <Skeleton className="h-3 w-full bg-gray-600" />
                              <Skeleton className="h-3 w-3/4 bg-gray-600" />
                            </div>
                          ) : summary?.error ? (
                            <div className="text-red-400 text-sm italic">
                              {summary.error}
                            </div>
                          ) : summary?.summary ? (
                            <p className="text-gray-300 text-sm leading-relaxed italic">
                              {summary.summary}
                            </p>
                          ) : (
                            <div className="text-gray-500 text-sm italic">
                              No summary available
                            </div>
                          )}
                        </td>
                      </tr>
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default RundownSummary;