
import React, { useEffect, useState } from 'react';
import { Clock, Users, FileText, Keyboard, MousePointer, Monitor, Upload, Share2, Bot, Image, Eye, Radio, Wifi, WifiOff, LoaderCircle, Search } from 'lucide-react';
import AnimatedWifiIcon from '@/components/AnimatedWifiIcon';
import DashboardHeader from '@/components/DashboardHeader';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const helpSections = [
  { id: 'getting-started', title: 'Getting Started', icon: FileText },
  { id: 'basic-operations', title: 'Basic Operations', icon: MousePointer },
  { id: 'column-manager', title: 'Column Manager', icon: FileText },
  { id: 'find-replace', title: 'Find & Replace', icon: Search },
  { id: 'team-collaboration', title: 'Team Collaboration', icon: Users },
  { id: 'connection-status', title: 'Connection Status', icon: Wifi },
  { id: 'showcaller', title: 'Showcaller', icon: Radio },
  { id: 'ai-helper', title: 'AI Helper', icon: Bot },
  { id: 'blueprints', title: 'Blueprints', icon: FileText },
  { id: 'shared-rundowns', title: 'Shared Rundowns', icon: Share2 },
  { id: 'ad-view', title: 'AD View', icon: Eye },
  { id: 'csv-import', title: 'CSV Import', icon: Upload },
  { id: 'teleprompter', title: 'Teleprompter', icon: Monitor },
  { id: 'keyboard-shortcuts', title: 'Keyboard Shortcuts', icon: Keyboard },
  { id: 'support', title: 'Support', icon: Clock }
];

const Help = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState('getting-started');

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  // Handle smooth scrolling to sections
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      // Get the main content container to scroll within it
      const mainContent = document.querySelector('main[class*="overflow-y-auto"]');
      if (mainContent) {
        const elementTop = element.offsetTop;
        mainContent.scrollTo({ top: elementTop - 100, behavior: 'smooth' });
      } else {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setActiveSection(sectionId);
    }
  };

  // Track which section is currently in view
  useEffect(() => {
    const mainContent = document.querySelector('main[class*="overflow-y-auto"]');
    
    const observerOptions = {
      root: mainContent,
      rootMargin: '-10% 0px -60% 0px',
      threshold: 0.1
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all sections
    helpSections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-shrink-0">
        <DashboardHeader 
          userEmail={user?.email}
          onSignOut={handleSignOut}
          showBackButton={true}
          onBack={handleBack}
        />
      </div>
      
      {/* Content area with fixed sidebar and scrollable main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Fixed Sidebar */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 flex-shrink-0 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div className="p-4">
              <h2 className="text-gray-300 text-sm font-medium mb-4">Help Topics</h2>
              <nav className="space-y-1">
                {helpSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                      activeSection === section.id
                        ? 'bg-gray-700 text-white font-medium'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <section.icon className="h-4 w-4 mr-3" />
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
        
        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">User Guide</h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">Learn how to use Cuer effectively for your broadcast productions</p>
            </div>

              <div className="space-y-8">
                {/* Getting Started */}
                <section id="getting-started" className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
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
                  <li><strong>Images Column:</strong> Click on any cell in the images column and paste an image URL. The image will display automatically if it's a valid public image link.</li>
                  <li><strong>Script & Notes Columns:</strong> These columns are expandable - click on them to see the full content in a larger, easier-to-read format.</li>
                </ul>
              </div>
            </div>
          </section>

                {/* Basic Operations */}
                <section id="basic-operations" className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
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
                  <li>Use Cmd+Enter (Mac) or Ctrl+Enter (Windows) to insert line breaks in cells</li>
                  <li>Right-click rows to color them or float/unfloat items</li>
                </ul>
              </div>
            </div>
          </section>

                {/* Column Manager */}
                <section id="column-manager" className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <FileText className="h-6 w-6 mr-2 text-orange-600" />
              Column Manager
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>Customize your rundown view with powerful column management features:</p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Column Layout Management</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Save custom column layouts for different production needs</li>
                    <li>Switch between saved layouts instantly</li>
                    <li>Create team-wide layouts that all members can use</li>
                    <li>Each team member can have their own personal layout preferences</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Column Organization</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Drag and drop column headers to reorder columns</li>
                    <li>Show or hide columns based on your workflow</li>
                    <li>Resize columns by dragging the column borders</li>
                    <li>Double-click column resizers to auto-fit text content</li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4 mt-4">
                <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Pro Tip:</strong> Auto-sizing works for most columns, but script and notes columns are excluded since they have expandable cells. Use the expand/collapse arrows on those columns instead.</p>
              </div>
            </div>
          </section>

                {/* Find & Replace */}
                <section id="find-replace" className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Search className="h-6 w-6 mr-2 text-blue-600" />
              Find & Replace
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>Quickly locate and modify content across your entire rundown with the powerful find and replace tool:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Global Search:</strong> Search across all text fields including names, scripts, talent, notes, and custom fields</li>
                <li><strong>Smart Navigation:</strong> Navigate between matches with up/down arrows or Enter/Shift+Enter keyboard shortcuts</li>
                <li><strong>Replace Options:</strong> Replace individual matches or all matches at once with dedicated "Replace" and "Replace All" buttons</li>
                <li><strong>Case Preservation:</strong> Optional "Preserve case pattern" setting maintains original capitalization when replacing text</li>
              </ul>
            </div>
          </section>

                {/* Team Collaboration */}
                <section id="team-collaboration" className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
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

                {/* Connection Status */}
                <section id="connection-status" className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Wifi className="h-6 w-6 mr-2 text-green-600" />
              Connection Status Icons
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>The wifi icon in your rundown header shows the current connection and sync status, helping you understand when your changes are being saved and when you're receiving updates from teammates for smooth collaboration:</p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <Wifi className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Connected (Green Wifi)</h3>
                    <p className="text-sm">You're connected to the server and can collaborate with your team in real-time.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <LoaderCircle className="h-5 w-5 text-green-500 animate-spin flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Saving Changes (Green Spinning Circle)</h3>
                    <p className="text-sm">Your changes are being saved to the server. This appears when you make edits.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <AnimatedWifiIcon className="text-blue-500 flex-shrink-0" isAnimating={true} />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Teammate Autosave (Blue Animated Wifi)</h3>
                    <p className="text-sm">A teammate made a change that resulted in an autosave. This ensures everyone stays in sync.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <WifiOff className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Disconnected (Gray Wifi Off)</h3>
                    <p className="text-sm">Connection to the server has been lost. Your changes will be saved when reconnected.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

                {/* Showcaller */}
                <section id="showcaller" className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Radio className="h-6 w-6 mr-2 text-red-600" />
              Showcaller
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>The showcaller is Cuer's live show control system that helps you track timing and progress during broadcast:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Play/Pause Controls:</strong> Use the playback controls in the rundown toolbar to start and stop the show timer</li>
                <li><strong>Live Timing:</strong> Shows countdown for current segment and tracks overall show progress</li>
                <li><strong>Visual Indicators:</strong> Current segment is highlighted in blue and marked with an arrow next to the row number.</li>
                <li><strong>Easy Autoscroll:</strong> Toggle the autoscroll feature with one click to automatically follow the current segment whether the showcaller function is running or not.</li>
              </ul>
              
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Integration with Other Views</h3>
                <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
                  <li><strong>AD View:</strong> When you control the showcaller, the AD View automatically updates with live timing and progress</li>
                  <li><strong>Shared Rundowns:</strong> External viewers see real-time updates of the current segment and timing status</li>
                  <li><strong>Team Sync:</strong> All team members see the same showcaller state, ensuring everyone stays coordinated</li>
                </ul>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4 mt-4">
                <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Pro Tip:</strong> Only one person needs to control the showcaller - everyone else will see the updates automatically. Use the autoscroll toggle to keep your view focused on the current segment.</p>
              </div>
            </div>
          </section>

                {/* AI Helper */}
                <section id="ai-helper" className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
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
                <section id="blueprints" className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <FileText className="h-6 w-6 mr-2 text-indigo-600" />
              Blueprints
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>Blueprint mode transforms your rundown into a comprehensive pre-production planning tool:</p>
              
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Dynamic Lists</h3>
                  <p className="text-sm">Auto-generate checklists from rundown columns with real-time updates and progress tracking.</p>
                </div>

                {/* Camera Plot Editor temporarily disabled */}
                {/*
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Camera Plot Editor</h3>
                  <p className="text-sm">Visual set design with drag-and-drop elements, camera positioning, and scene management.</p>
                </div>
                */}

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Collaboration Tools</h3>
                  <p className="text-sm">Rich text scratchpad for team notes and centralized show date tracking.</p>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4 mt-4">
                <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Pro Tip:</strong> Blueprint data is saved separately from your rundown, allowing detailed production planning without cluttering your on-air view.</p>
              </div>
            </div>
          </section>

                {/* Shared Read-Only Rundowns */}
                <section id="shared-rundowns" className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
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

                {/* AD View */}
                <section id="ad-view" className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Eye className="h-6 w-6 mr-2 text-green-600" />
              AD View (Assistant Director)
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>AD View provides essential timing information for Assistant Directors and control room operations:</p>
              
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Live Timing:</strong> Prominent show clock with real-time segment countdown</li>
                <li><strong>Progress Tracking:</strong> Visual show progress and next segment preview</li>
                <li><strong>Control Room Ready:</strong> Optimized for multiviewer displays</li>
                <li><strong>Easy Access:</strong> No login required - dedicated URL per rundown</li>
                <li><strong>Auto-Sync:</strong> Automatically synchronizes with the rundown's showcaller function for real-time updates</li>
              </ul>
            </div>
          </section>

                {/* CSV Import */}
                <section id="csv-import" className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Upload className="h-6 w-6 mr-2 text-blue-600" />
              Importing CSV Files
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>You can import rundown data from CSV files to quickly populate your rundowns:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Import process:</strong> Use the Import button in the rundown toolbar to upload your CSV file</li>
                <li><strong>Column mapping:</strong> Map your CSV columns to the appropriate rundown fields during import</li>
                <li><strong>Custom layouts:</strong> For best results, create and save a custom column layout that matches your CSV structure before importing</li>
              </ul>
            </div>
          </section>

                {/* Teleprompter Operation */}
                <section id="teleprompter" className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
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
                    <li><strong>All Script View:</strong> By default, the teleprompter shows only rows with script content. Select "All Script" to display all rows.</li>
                    <li><strong>Inline Editing:</strong> Any new or updates to text is automatically saved to the script column of the corresponding segment. Combine with "All Script" view for fast and easy writing sessions.</li>
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

                {/* Keyboard Shortcuts */}
                <section id="keyboard-shortcuts" className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
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

                {/* Support */}
                <section id="support" className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
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
        </main>
      </div>
    </div>
  );
};

export default Help;
