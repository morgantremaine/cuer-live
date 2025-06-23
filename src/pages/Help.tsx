
import React from 'react';
import { Clock, Users, FileText, Keyboard, MousePointer, Monitor, Upload, Share2, Bot, Image } from 'lucide-react';
import DashboardHeader from '@/components/DashboardHeader';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const Help = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader 
        userEmail={user?.email}
        onSignOut={handleSignOut}
        showBackButton={true}
        onBack={handleBack}
      />
      
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Help & User Guide</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">Learn how to use Cuer effectively for your broadcast productions</p>
        </div>

        <div className="space-y-8">
          {/* Getting Started */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <FileText className="h-6 w-6 mr-2 text-blue-600" />
              Getting Started
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>Cuer is a collaborative rundown management system designed for broadcast professionals. Here's how to get started:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Create a new rundown from the dashboard</li>
                <li>Add items to your rundown using the "+" button</li>
                <li>Edit content by clicking on any cell</li>
                <li>Save your work automatically as you type</li>
              </ul>
              
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Special Column Features</h3>
                <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
                  <li><strong>Images Column:</strong> Click on any cell in the images column and paste an image URL. The image will display automatically if it's a valid image link.</li>
                  <li><strong>Script & Notes Columns:</strong> These columns are expandable - click on them to see the full content in a larger, easier-to-read format.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* AI Helper */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Bot className="h-6 w-6 mr-2 text-purple-600" />
              AI Helper (Cuer)
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>Cuer includes an intelligent AI assistant to help streamline your rundown creation and management:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Chat Interface:</strong> Click the chat icon in the rundown toolbar to open the AI assistant</li>
                <li><strong>Rundown Analysis:</strong> Ask the AI to review your rundown for spelling, grammar, timing, or structural improvements</li>
                <li><strong>Content Suggestions:</strong> Get help writing scripts, segment descriptions, or other rundown content</li>
                <li><strong>Timing Assistance:</strong> Ask questions about duration calculations and scheduling</li>
              </ul>
            </div>
          </section>

          {/* Basic Operations */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <MousePointer className="h-6 w-6 mr-2 text-green-600" />
              Basic Operations
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Adding Content</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 text-sm">
                  <li>Click "Add Item" to create new rundown entries</li>
                  <li>Use "Add Header" for section dividers</li>
                  <li>Drag and drop to reorder items</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Editing</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 text-sm">
                  <li>Click any cell to edit content</li>
                  <li>Press Tab to move to next cell</li>
                  <li>Use Enter to save and move down</li>
                  <li>Right-click rows to color them or float/unfloat items</li>
                </ul>
              </div>
            </div>
          </section>

          {/* CSV Import */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Upload className="h-6 w-6 mr-2 text-blue-600" />
              Importing CSV Files
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>You can import rundown data from CSV files to quickly populate your rundowns:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Prepare your CSV:</strong> Ensure your CSV has headers that match rundown fields (Name, Duration, Script, etc.)</li>
                <li><strong>Import process:</strong> Use the Import button in the rundown toolbar to upload your CSV file</li>
                <li><strong>Column mapping:</strong> Map your CSV columns to the appropriate rundown fields during import</li>
                <li><strong>Custom layouts:</strong> For best results, create and save a custom column layout that matches your CSV structure before importing</li>
              </ul>
            </div>
          </section>

          {/* Shared Read-Only Rundowns */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Share2 className="h-6 w-6 mr-2 text-indigo-600" />
              Shared Read-Only Rundowns
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>Share your rundowns with external stakeholders or display them publicly:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Create share link:</strong> Use the Share button to generate a public, read-only link</li>
                <li><strong>Custom layouts:</strong> Choose which saved column layout to use for the shared view</li>
                <li><strong>Layout control:</strong> The shared rundown will display exactly as configured in your chosen layout</li>
                <li><strong>Real-time updates:</strong> Shared rundowns reflect changes made to the original rundown in real-time</li>
                <li><strong>No login required:</strong> Recipients can view the rundown without needing a Cuer account</li>
              </ul>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4 mt-4">
                <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Note:</strong> You can update which layout is used for sharing at any time. This allows you to customize what information external viewers see without affecting your team's working view.</p>
              </div>
            </div>
          </section>

          {/* Time Management */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Clock className="h-6 w-6 mr-2 text-orange-600" />
              Time Management
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>Cuer provides powerful timing features for broadcast planning:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Duration:</strong> Set how long each item should take</li>
                <li><strong>Start Time:</strong> Automatically calculated based on durations</li>
                <li><strong>Playback Controls:</strong> Use play/pause to track progress during broadcast</li>
                <li><strong>Time Display:</strong> Current time shown in header with timezone support</li>
              </ul>
            </div>
          </section>

          {/* Teleprompter Operation */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Monitor className="h-6 w-6 mr-2 text-purple-600" />
              Teleprompter Operation
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>The teleprompter provides a fullscreen scrolling display for on-air talent:</p>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Talent Labels</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Use <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">[Talent Name]</code> to label who should read each section</li>
                    <li>Add colors by including the color name: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">[Talent Name {"{red}"}]</code></li>
                    <li>Available colors: red, blue, green, yellow, purple, orange, pink, cyan</li>
                    <li>Example: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">[John {"{blue}"}]</code> will display "John" in blue text</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Scroll Controls</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><kbd className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">← → ↓ ↑ Arrow Keys</kbd> - Adjust scroll speed</li>
                    <li><kbd className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Space Bar</kbd> - Pause/Resume scrolling</li>
                    <li><kbd className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Esc</kbd> - Exit fullscreen mode</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Collaboration */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Users className="h-6 w-6 mr-2 text-purple-600" />
              Team Collaboration
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>Work together seamlessly with your team:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Real-time Updates:</strong> See changes from teammates instantly</li>
                <li><strong>Team Management:</strong> Invite team members from account settings</li>
                <li><strong>Shared Access:</strong> All team members can edit the same rundown</li>
                <li><strong>Auto-save:</strong> Changes are saved automatically to prevent data loss</li>
                <li><strong>Layout Independence:</strong> Team members can customize their own view with different column arrangements, widths, and visibility settings without affecting other users' experience of the same rundown</li>
              </ul>
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Keyboard className="h-6 w-6 mr-2 text-indigo-600" />
              Keyboard Shortcuts
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Navigation</h3>
                <ul className="space-y-1 text-gray-700 dark:text-gray-300 text-sm">
                  <li><kbd className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Tab</kbd> - Next cell</li>
                  <li><kbd className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Shift + Tab</kbd> - Previous cell</li>
                  <li><kbd className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Enter</kbd> - Save and move down</li>
                  <li><kbd className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Escape</kbd> - Cancel edit</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Teleprompter</h3>
                <ul className="space-y-1 text-gray-700 dark:text-gray-300 text-sm">
                  <li><kbd className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Arrow Keys</kbd> - Adjust scroll speed</li>
                  <li><kbd className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Space</kbd> - Pause/Resume scroll</li>
                  <li><kbd className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Esc</kbd> - Exit fullscreen</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Advanced Features */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Advanced Features</h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Teleprompter</h3>
                <p className="text-sm">Access the teleprompter view for on-air talent. Click the teleprompter button in the toolbar to launch fullscreen scrolling text.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Blueprint Mode</h3>
                <p className="text-sm">Use blueprint mode for pre-production planning with lists, crew management, and camera plots.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Column Customization</h3>
                <p className="text-sm">Customize which columns are visible and their order through the column manager in the header.</p>
              </div>
            </div>
          </section>

          {/* Support */}
          <section className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Need More Help?</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              If you need additional assistance or have questions about specific features, you can reach out to our support team at <a href="mailto:help@cuer.live" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">help@cuer.live</a> or contact your system administrator.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This guide covers the core functionality of Cuer. Features may vary based on your access level and configuration.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Help;
