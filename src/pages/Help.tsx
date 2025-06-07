
import React from 'react';
import { Clock, Users, FileText, Search, Keyboard, MousePointer, Monitor } from 'lucide-react';
import DashboardHeader from '@/components/DashboardHeader';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import RundownLayoutWrapper from '@/components/RundownLayoutWrapper';

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
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader 
        userEmail={user?.email}
        onSignOut={handleSignOut}
        showBackButton={true}
        onBack={handleBack}
      />
      
      <RundownLayoutWrapper>
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Help & User Guide</h1>
            <p className="text-lg text-gray-600">Learn how to use Cuer effectively for your broadcast productions</p>
          </div>

          <div className="space-y-8">
            {/* Getting Started */}
            <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-6 w-6 mr-2 text-blue-600" />
                Getting Started
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>Cuer is a collaborative rundown management system designed for broadcast professionals. Here's how to get started:</p>
                <ul className="list-disc list-inside space-y-2 ml-5">
                  <li>Create a new rundown from the dashboard</li>
                  <li>Add items and headers to your rundown using the "+" buttons</li>
                  <li>Edit content by clicking on any cell</li>
                  <li>Right click to change row color and float/unfloat rows</li>
                  <li>Save your work automatically as you type</li>
                </ul>
              </div>
            </section>

            {/* Basic Operations */}
            <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <MousePointer className="h-6 w-6 mr-2 text-green-600" />
                Basic Operations
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Adding Content</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                    <li>Click "Add Item" to create new rundown entries</li>
                    <li>Use "Add Header" for section dividers</li>
                    <li>Drag and drop to reorder items</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Editing</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                    <li>Click any cell to edit content</li>
                    <li>Press Tab to move to next cell</li>
                    <li>Use Enter to save and move down</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Time Management */}
            <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="h-6 w-6 mr-2 text-orange-600" />
                Time Management
              </h2>
              <div className="space-y-4 text-gray-700">
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
            <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Monitor className="h-6 w-6 mr-2 text-purple-600" />
                Teleprompter Operation
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>The teleprompter provides a fullscreen scrolling display for on-air talent:</p>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Talent Labels</h3>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Use <code className="bg-gray-100 px-2 py-1 rounded text-sm">[Talent Name]</code> to label who should read each section</li>
                      <li>Add colors by including the color name: <code className="bg-gray-100 px-2 py-1 rounded text-sm">[Talent Name {"{red}"}]</code></li>
                      <li>Available colors: red, blue, green, yellow, purple, orange, pink, cyan</li>
                      <li>Example: <code className="bg-gray-100 px-2 py-1 rounded text-sm">[John {"{blue}"}]</code> will display "John" in blue text</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Scroll Controls</h3>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li><kbd className="bg-gray-100 px-2 py-1 rounded">← → ↓ ↑ Arrow Keys</kbd> - Adjust scroll speed</li>
                      <li><kbd className="bg-gray-100 px-2 py-1 rounded">Space Bar</kbd> - Pause/Resume scrolling</li>
                      <li><kbd className="bg-gray-100 px-2 py-1 rounded">Esc</kbd> - Exit fullscreen mode</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Collaboration */}
            <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-6 w-6 mr-2 text-purple-600" />
                Team Collaboration
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>Work together seamlessly with your team:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Real-time Updates:</strong> See changes from teammates instantly</li>
                  <li><strong>Team Management:</strong> Invite team members from account settings</li>
                  <li><strong>Shared Access:</strong> All team members can edit the same rundown</li>
                  <li><strong>Auto-save:</strong> Changes are saved automatically to prevent data loss</li>
                </ul>
              </div>
            </section>

            {/* Search & Navigation */}
            <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Search className="h-6 w-6 mr-2 text-red-600" />
                Search & Find/Replace
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>Quickly find and update content across your rundown:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Search Bar:</strong> Use the search box in the header to find text</li>
                  <li><strong>Find & Replace:</strong> Use the replace feature to update multiple instances</li>
                  <li><strong>Navigation:</strong> Use arrow buttons to jump between search results</li>
                  <li><strong>Highlighting:</strong> Matching text is highlighted in yellow</li>
                </ul>
              </div>
            </section>

            {/* Keyboard Shortcuts */}
            <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Keyboard className="h-6 w-6 mr-2 text-indigo-600" />
                Keyboard Shortcuts
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Navigation</h3>
                  <ul className="space-y-1 text-gray-700 text-sm">
                    <li><kbd className="bg-gray-100 px-2 py-1 rounded">Tab</kbd> - Next cell</li>
                    <li><kbd className="bg-gray-100 px-2 py-1 rounded">Shift + Tab</kbd> - Previous cell</li>
                    <li><kbd className="bg-gray-100 px-2 py-1 rounded">Enter</kbd> - Save and move down</li>
                    <li><kbd className="bg-gray-100 px-2 py-1 rounded">Escape</kbd> - Cancel edit</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Actions</h3>
                  <ul className="space-y-1 text-gray-700 text-sm">
                    <li><kbd className="bg-gray-100 px-2 py-1 rounded">Ctrl + Z</kbd> - Undo</li>
                    <li><kbd className="bg-gray-100 px-2 py-1 rounded">Ctrl + C</kbd> - Copy</li>
                    <li><kbd className="bg-gray-100 px-2 py-1 rounded">Ctrl + V</kbd> - Paste</li>
                    <li><kbd className="bg-gray-100 px-2 py-1 rounded">Delete</kbd> - Delete row</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Advanced Features */}
            <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Advanced Features</h2>
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Teleprompter</h3>
                  <p className="text-sm">Access the teleprompter view for on-air talent. Click the teleprompter button in the toolbar to launch fullscreen scrolling text.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Blueprint Mode</h3>
                  <p className="text-sm">Use blueprint mode for pre-production planning with lists, crew management, and camera plots.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Column Customization</h3>
                  <p className="text-sm">Customize which columns are visible and their order through the column manager in the header.</p>
                </div>
              </div>
            </section>

            {/* Support */}
            <section className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Need More Help?</h2>
              <p className="text-gray-700 mb-4">
                If you need additional assistance or have questions about specific features, don't hesitate to reach out to your system administrator or check for updates in your account settings.
              </p>
              <p className="text-sm text-gray-600">
                This guide covers the core functionality of Cuer. Features may vary based on your access level and configuration.
              </p>
            </section>
          </div>
        </div>
      </RundownLayoutWrapper>
    </div>
  );
};

export default Help;
