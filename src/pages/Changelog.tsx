import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
          {/* Version 1.1.8 */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-white">Version 1.1.8</h2>
              <span className="text-sm text-gray-400">{new Date().toLocaleDateString()}</span>
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
                      <li><strong>Real-time Highlighting:</strong> Automatically scrolls to and highlights matched text in the rundown for precise editing</li>
                    </ul>
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                      <img 
                        src="/lovable-uploads/f388475d-536b-443c-9853-b1b7c6042b73.png" 
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-white">Version 1.1.7</h2>
              <span className="text-sm text-gray-400">{new Date().toLocaleDateString()}</span>
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

          {/* Version 1.1.3 */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-white">Version 1.1.3</h2>
              <span className="text-sm text-gray-400">{new Date().toLocaleDateString()}</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-blue-400 mb-2">🔧 New Features</h3>
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