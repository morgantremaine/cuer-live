import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import aiRundownSummaryImage from '@/assets/changelog/ai-rundown-summary-v122.png';

const Changelog: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mr-4 text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-4xl font-bold text-white">Changelog</h1>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Version 1.2.2 */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="flex items-center mb-4">
              <h2 className="text-2xl font-semibold text-white">Version 1.2.2</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-blue-400 mb-2">🤖 AI Rundown Summary</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-300 mb-3">
                      <strong>Intelligent Rundown Analysis:</strong> Introducing AI-powered rundown summaries that provide comprehensive analysis and insights for your broadcast content:
                    </p>
                    <ul className="text-gray-300 list-disc list-inside space-y-2 mb-3">
                      <li><strong>Automated Content Analysis:</strong> AI analyzes your entire rundown and generates detailed summaries for each segment</li>
                      <li><strong>Segment Breakdown:</strong> Get comprehensive descriptions of content flow, timing, and key elements for each show segment</li>
                      <li><strong>Production Insights:</strong> Intelligent analysis of show structure, pacing, and content organization to help optimize your broadcast</li>
                      <li><strong>Time-Aware Summaries:</strong> Summaries include timing information and segment duration analysis for better show planning</li>
                    </ul>
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                      <img 
                        src={aiRundownSummaryImage}
                        alt="AI Rundown Summary showing detailed segment analysis for a gaming broadcast"
                        className="w-full max-w-2xl mx-auto rounded"
                      />
                      <p className="text-xs text-gray-500 text-center mt-2">
                        AI-generated rundown summary with detailed segment analysis and timing information
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Version 1.2.1 */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="flex items-center mb-4">
              <h2 className="text-2xl font-semibold text-white">Version 1.2.1</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-blue-400 mb-2">🔍 Zoom Controls & 👥 Live User Presence</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-300 mb-3">
                      <strong>Enhanced Rundown Navigation:</strong> New zoom functionality and real-time collaboration features to improve your workflow:
                    </p>
                    <ul className="text-gray-300 list-disc list-inside space-y-2 mb-3">
                      <li><strong>Zoom In/Out Controls:</strong> New zoom controls allow you to adjust your rundown view for better readability and navigation</li>
                      <li><strong>Live User Presence:</strong> See who is currently editing the rundown in real-time with user names displayed during active editing sessions</li>
                    </ul>
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                      <img 
                        src="/uploads/changelog-collaboration-features.png"
                        alt="Collaboration features including zoom controls and live user presence"
                        className="w-full max-w-2xl mx-auto rounded"
                      />
                      <p className="text-xs text-gray-500 text-center mt-2">
                        Enhanced collaboration features: zoom controls and real-time user presence
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Version 1.1.9 */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="flex items-center mb-4">
              <h2 className="text-2xl font-semibold text-white">Version 1.1.9</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-blue-400 mb-2">⏱️ Auto Time to Script</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-300 mb-3">
                      <strong>Automatic Script Duration Calculation:</strong> Instantly calculate reading times for your script content with intelligent timing features:
                    </p>
                    <ul className="text-gray-300 list-disc list-inside space-y-2 mb-3">
                      <li><strong>Single Row Timing:</strong> Right-click any row and select "Auto Time to Script" to automatically calculate duration based on script content</li>
                      <li><strong>Bulk Processing:</strong> Select multiple rows and apply timing calculations to all selected items at once</li>
                      <li><strong>Smart Calculations:</strong> Uses industry-standard reading speeds (150 words per minute) with automatic rounding to nearest 5-second intervals</li>
                    </ul>
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                      <img 
                        src="/uploads/auto-time-to-script-feature.png"
                        alt="Auto Time to Script context menu option"
                        className="w-full max-w-md mx-auto rounded border border-slate-600"
                      />
                      <p className="text-xs text-gray-500 text-center mt-2">
                        Right-click context menu showing Auto Time to Script option
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Version 1.1.8 */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="flex items-center mb-4">
              <h2 className="text-2xl font-semibold text-white">Version 1.1.8</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-blue-400 mb-2">🔍 Find & Replace</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-300 mb-3">
                      <strong>Advanced Text Search and Replace:</strong> Powerful find and replace functionality to quickly locate and modify content across your rundown:
                    </p>
                    <ul className="text-gray-300 list-disc list-inside space-y-2 mb-3">
                      <li><strong>Global Search:</strong> Search across all text fields including names, scripts, talent, notes, and custom fields</li>
                      <li><strong>Smart Navigation:</strong> Navigate between matches with up/down arrows or Enter/Shift+Enter keyboard shortcuts</li>
                      <li><strong>Replace Options:</strong> Replace individual matches or all matches at once with dedicated "Replace" and "Replace All" buttons</li>
                      <li><strong>Case Preservation:</strong> Optional "Preserve case pattern" setting maintains original capitalization when replacing text</li>
                    </ul>
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                      <img 
                        src="/uploads/find-replace-dialog.png" 
                        alt="Find & Replace dialog showing search and replace functionality"
                        className="w-full max-w-md mx-auto rounded border border-slate-600"
                      />
                      <p className="text-xs text-gray-500 text-center mt-2">
                        Find & Replace dialog with smart case preservation and batch operations
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Version 1.1.7 */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="flex items-center mb-4">
              <h2 className="text-2xl font-semibold text-white">Version 1.1.7</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-blue-400 mb-2">🖼️ Enhanced Image Column Support</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-300 mb-3">
                      <strong>Expanded File Support:</strong> The images column now supports additional file types and services:
                    </p>
                    <ul className="text-gray-300 list-disc list-inside space-y-2 mb-3">
                      <li><strong>Dropbox Integration:</strong> Direct support for Dropbox shared links - automatically converts sharing links to display images directly in the rundown</li>
                      <li><strong>Figma File Support:</strong> Smart detection and preview of Figma design files with clickable external link to open in Figma</li>
                      <li><strong>Auto Project Names:</strong> Figma files automatically extract and display the project name from the URL</li>
                    </ul>
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                      <img 
                        src="/uploads/f74a55ba-a0ab-4dfb-923d-6899ae03bf2b.png" 
                        alt="Figma file integration showing project name and external link"
                        className="w-full max-w-md mx-auto rounded border border-slate-600"
                      />
                      <p className="text-xs text-gray-500 text-center mt-2">
                        Example of Figma file integration with project name display
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Version 1.1.6 */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="flex items-center mb-4">
              <h2 className="text-2xl font-semibold text-white">Version 1.1.6</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-blue-400 mb-2">📂 Collapsible Headers</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-300 mb-3">
                      <strong>Collapsible Headers:</strong> Added collapsible headers for easy viewing and quick resorting of rundown sections. 
                      Headers can now be collapsed to provide a cleaner overview of your rundown structure and make it easier to navigate between different sections.
                    </p>
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                      <img 
                        src="/uploads/fe736151-04ad-4619-9982-e9b08817fbcf.png" 
                        alt="Collapsible headers feature showing rundown sections"
                        className="w-full max-w-md mx-auto rounded border border-slate-600"
                      />
                      <p className="text-xs text-gray-500 text-center mt-2">
                        Example of collapsible rundown headers in action
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Coming Soon placeholder */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-8">
            <div className="text-center text-gray-400">
              <h2 className="text-2xl font-semibold mb-4">More Updates Coming Soon</h2>
              <p className="text-lg mb-4">
                We're continuously working on new features and improvements.
              </p>
              <p className="text-sm opacity-75">
                Check back regularly for the latest updates and enhancements.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Changelog;