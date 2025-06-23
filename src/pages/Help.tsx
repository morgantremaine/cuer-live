
import React from 'react';
import { Clock, Users, FileText, Keyboard, MousePointer, Monitor, Upload, Share2, Bot, Image, Blueprint, Eye } from 'lucide-react';
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

          {/* Blueprints */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Blueprint className="h-6 w-6 mr-2 text-indigo-600" />
              Blueprints
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>Blueprint mode transforms your rundown into a comprehensive pre-production planning tool with specialized components for crew management, camera plots, and collaborative notes:</p>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Dynamic Lists</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Auto-Generated Lists:</strong> Create checklists from any rundown column (talent, graphics, video assets, etc.)</li>
                    <li><strong>Checkable Items:</strong> Mark items as complete with checkboxes to track progress</li>
                    <li><strong>Unique Items View:</strong> Toggle to show only unique items, removing duplicates for cleaner lists</li>
                    <li><strong>Real-time Updates:</strong> Lists automatically refresh when the rundown changes</li>
                    <li><strong>Drag & Drop Organization:</strong> Reorder lists by dragging them to different positions</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Crew Management</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Crew Database:</strong> Maintain a comprehensive list of all crew members with roles and contact information</li>
                    <li><strong>Assignment Tracking:</strong> Assign crew members to specific segments or roles within your rundown</li>
                    <li><strong>Contact Information:</strong> Store phone numbers, emails, and other contact details for quick reference</li>
                    <li><strong>Role Categories:</strong> Organize crew by departments (camera, audio, graphics, etc.)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Camera Plot Editor</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Visual Set Design:</strong> Create detailed camera plots with drag-and-drop elements</li>
                    <li><strong>Camera Positioning:</strong> Place and position cameras with precise angles and coverage areas</li>
                    <li><strong>Set Elements:</strong> Add tables, chairs, desks, monitors, and other set pieces</li>
                    <li><strong>Multiple Scenes:</strong> Create different camera plots for various segments or set changes</li>
                    <li><strong>Export & Share:</strong> Save camera plots for distribution to camera operators and directors</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Collaborative Scratchpad</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Rich Text Editor:</strong> Full-featured text editor with formatting, lists, and styling options</li>
                    <li><strong>Team Collaboration:</strong> Multiple users can edit notes simultaneously</li>
                    <li><strong>Production Notes:</strong> Capture meeting notes, last-minute changes, and production details</li>
                    <li><strong>Auto-save:</strong> All changes are automatically saved and synchronized across team members</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Show Date Management</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Date Tracking:</strong> Set and display the show date prominently in the blueprint</li>
                    <li><strong>Timeline Coordination:</strong> All blueprint components reference the same show date for consistency</li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4 mt-6">
                <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Pro Tip:</strong> Blueprint data is saved separately from your rundown, allowing you to maintain detailed production information that doesn't clutter your on-air rundown view. Switch between Blueprint and normal view as needed during different phases of production.</p>
              </div>
            </div>
          </section>

          {/* AD View */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Eye className="h-6 w-6 mr-2 text-green-600" />
              AD View (Associate Director)
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>AD View is a specialized display designed for Associate Directors and broadcast control room operations, providing essential show timing and status information at a glance:</p>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Live Timing Display</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Show Clock:</strong> Prominent display of current time with timezone support</li>
                    <li><strong>Segment Timing:</strong> Real-time countdown/countup for current segment</li>
                    <li><strong>Total Show Progress:</strong> Visual progress bar showing how much of the show has elapsed</li>
                    <li><strong>Next Segment Preview:</strong> Shows upcoming segment name and duration for preparation</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Playback Integration</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Show Control:</strong> Synchronized with the main rundown's play/pause controls</li>
                    <li><strong>Status Indicators:</strong> Clear visual indication of whether the show is running or paused</li>
                    <li><strong>Timing Synchronization:</strong> All timing calculations stay in sync with the master rundown</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Multiviewer Integration</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Broadcast Layout:</strong> Optimized design that fits well in broadcast multiviewer displays</li>
                    <li><strong>High Contrast:</strong> Easy-to-read display even when viewed as a small window in a multiviewer</li>
                    <li><strong>Essential Information Only:</strong> Streamlined interface showing only the most critical timing data</li>
                    <li><strong>Always Visible:</strong> Designed to be displayed continuously throughout the broadcast</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Control Room Benefits</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Timing Awareness:</strong> Helps ADs keep track of show pacing and segment timing</li>
                    <li><strong>Preparation Tool:</strong> Shows upcoming segments to help prepare graphics, cameras, and other elements</li>
                    <li><strong>Show Flow Management:</strong> Visual cues help maintain proper show timing and transitions</li>
                    <li><strong>Redundant Display:</strong> Provides backup timing information independent of the main production system</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Access & Usage</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Dedicated URL:</strong> Each rundown has its own AD View link that can be bookmarked</li>
                    <li><strong>No Login Required:</strong> Can be accessed without authentication for easy display setup</li>
                    <li><strong>Real-time Updates:</strong> Automatically reflects changes made to the source rundown</li>
                    <li><strong>Browser-based:</strong> Works on any device with a web browser, including multiviewer systems</li>
                  </ul>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-4 mt-6">
                <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Production Tip:</strong> Display AD View on a dedicated monitor in your control room or as a window in your multiviewer system. This provides your AD and director with constant visibility of show timing without needing to access the full rundown interface during live production.</p>
              </div>
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
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Script Management</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>All Script View:</strong> Use the "All Script" button to display all segments with script content in the teleprompter</li>
                    <li><strong>Inline Editing:</strong> When editing is enabled, you can click on any script text in the teleprompter to edit it directly - changes automatically update the script cells in the main rundown</li>
                    <li><strong>Null Scripts:</strong> Put <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">[null]</code> in a script cell to show the segment name in the teleprompter without any script content</li>
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
