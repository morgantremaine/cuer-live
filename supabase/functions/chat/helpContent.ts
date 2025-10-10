/**
 * Help Content for Cuer AI Assistant
 * 
 * IMPORTANT: Update this file whenever the Help page (src/pages/Help.tsx) is updated
 * to ensure Cuer has the most current information about app features.
 */

export const getHelpContent = (): string => {
  return `
# CUER APP HELP DOCUMENTATION

## Getting Started

### What is Cuer?
Cuer is a professional broadcast rundown management tool designed for live production teams. It helps you plan, coordinate, and execute live broadcasts with real-time collaboration features.

### Creating Your First Rundown
1. Click "New Rundown" from the dashboard
2. Give your rundown a title
3. Set the start time and timezone
4. Add rows by clicking the "+" button or pressing Enter
5. Fill in details for each segment (name, duration, talent, script, etc.)

### Understanding Row Types
- **Regular Rows**: Standard rundown items with all fields available
- **Header Rows**: Section dividers that organize your rundown into segments
- **Floating Rows**: Special items that don't affect timing calculations

## Basic Operations

### Adding Rows
- Press **Enter** at the end of a row to create a new one below
- Press **Shift+Enter** to create a new row above
- Click the **+** button in the row actions menu

### Editing Content
- Click any cell to start editing
- Press **Tab** to move to the next field
- Press **Shift+Tab** to move to the previous field
- Changes save automatically

### Deleting Rows
- Click the trash icon in the row actions menu
- Or select a row and press **Delete/Backspace** (when not in edit mode)

### Reordering Rows
- Drag rows by the handle icon to reorder them
- Drop between rows to change position
- Timing calculations update automatically

## Row Number Locking

### What is Row Number Locking?
Row number locking prevents automatic row renumbering when you add or remove items. This is useful when:
- Row numbers are referenced in scripts or graphics
- You need stable identifiers for production coordination
- You want manual control over numbering

### How to Use Row Locking
1. Click the lock icon in the rundown header
2. Locked rows will show a lock indicator
3. New rows get temporary numbers until you assign permanent ones
4. Unlock anytime to resume automatic numbering

### Best Practices
- Lock numbers once your rundown structure is finalized
- Use clear numbering schemes (1, 2, 3 or A1, A2, B1, etc.)
- Communicate with your team when locking/unlocking

## Layout Manager

### Overview
Customize your rundown view with powerful column management features. Show, hide, reorder, and resize columns to match your workflow.

### Column Management
- **Show/Hide Columns**: Toggle visibility of any column
- **Reorder Columns**: Drag columns to rearrange them
- **Resize Columns**: Adjust column widths by dragging borders
- **Custom Columns**: Add team-specific fields for your unique workflow

### Saving Layouts
1. Arrange columns to your preference
2. Click "Save Layout" in the Layout Manager
3. Give your layout a name
4. Switch between saved layouts anytime

### Team Layouts
- Team admins can create shared layouts for the whole team
- Personal layouts are private to your account
- Default layout applies to all new rundowns

## Find & Replace

### Basic Search
- Press **Cmd/Ctrl + F** to open Find & Replace
- Type your search term
- Results highlight in real-time
- Use arrow buttons to navigate between matches

### Replace Functionality
- Enter replacement text in the "Replace with" field
- Click "Replace" to replace current match
- Click "Replace All" to replace all matches at once

### Search Options
- **Case Sensitive**: Match exact capitalization
- **Search in Columns**: Limit search to specific fields (name, script, talent, etc.)

## Team Collaboration

### Real-Time Collaboration
- See who's viewing the rundown (profile pictures in header)
- See who's editing which cell (colored indicators)
- Changes sync instantly across all users
- No need to refresh or save manually

### Team Management
1. Click your profile icon → "Team Settings"
2. Invite members via email
3. Assign roles: Admin, Manager, or Member
4. Manage permissions and access

### Roles & Permissions
- **Admin**: Full control, can manage team members and settings
- **Manager**: Can create/edit rundowns and manage rundowns
- **Member**: Can view and edit rundowns they have access to

## Connection Status Icons

### Status Indicators
- **Green (Connected)**: You're online, changes sync in real-time
- **Yellow (Connecting)**: Attempting to reconnect to server
- **Red (Disconnected)**: No connection, changes saved locally only

### What to Do When Disconnected
- Check your internet connection
- Changes are saved locally and will sync when reconnected
- Avoid major edits until connection is restored
- Refresh the page if connection doesn't restore within a minute

## Showcaller

### What is Showcaller?
Showcaller is a presentation mode for directors and technical directors to follow the rundown during a live broadcast. It provides a clean, focused view of the current segment and upcoming items.

### How to Use Showcaller
1. Click the "Showcaller" button in the rundown header
2. Opens in a new window/tab
3. Shows current item highlighted with timing information
4. Displays upcoming items for preparation
5. Auto-advances as you progress through the show

### Showcaller Features
- **Large, readable text** optimized for distance viewing
- **Current segment highlighted** in bright color
- **Timing information** (elapsed time, remaining time, end time)
- **Upcoming items preview** so you can prepare
- **Auto-scroll** keeps current item centered

### Tips for Using Showcaller
- Use on a dedicated monitor for the director/TD
- Keep the main rundown open for editing on another screen
- Changes made in the main rundown instantly appear in Showcaller
- Can be shared with read-only access for crew members

## AI Helper (Cuer)

### What is Cuer?
Cuer is your AI production assistant built into the rundown editor. It can help you analyze your rundown, make suggestions, and answer questions about your production.

### How to Use Cuer
1. Click the Cuer icon in the rundown header
2. Type your question or request in the chat
3. Cuer analyzes your rundown and provides helpful insights
4. Can make direct modifications to your rundown when requested

### What Cuer Can Do
- Analyze rundown timing and structure
- Suggest improvements for pacing and flow
- Answer questions about your show format
- Help with script writing and segment planning
- Identify potential timing issues
- Recommend content adjustments

### Cuer Modification Format
When Cuer suggests changes, it uses a special format:
\`\`\`
CUER_MODIFICATIONS
[modifications here]
END_CUER_MODIFICATIONS
\`\`\`

You can review and apply these changes with one click.

### Tips for Working with Cuer
- Be specific in your requests ("Make the show 5 minutes shorter" vs "Help me")
- Ask about timing, pacing, content, or structure
- Use Cuer to brainstorm segment ideas
- Let Cuer review your rundown before going live

## Blueprints

### What are Blueprints?
Blueprints are reusable rundown templates. Create a blueprint once, then use it to quickly generate new rundowns with the same structure.

### Creating Blueprints
1. Create a rundown with your desired structure
2. Click "Save as Blueprint" in the rundown menu
3. Give it a descriptive name
4. The blueprint is now available for your team

### Using Blueprints
1. Click "New Rundown" → "From Blueprint"
2. Select a blueprint from the list
3. A new rundown is created with the blueprint's structure
4. Customize the new rundown as needed

### Blueprint Best Practices
- Create blueprints for recurring show formats
- Include standard segments, timing, and fields
- Use descriptive names (e.g., "Monday News Show", "Weekly Sports Recap")
- Update blueprints as your show format evolves
- Share blueprints across your team for consistency

## Shared Read-Only Rundowns

### Sharing Rundowns
Share a read-only view of your rundown with people outside your team:
1. Click "Share" in the rundown header
2. Select the layout/view you want to share
3. Copy the generated link
4. Anyone with the link can view (but not edit) the rundown

### Use Cases
- Share with freelance crew members
- Provide to guests before their appearance
- Share with clients for approval
- Post on call sheets for the production team

### What Recipients See
- Real-time view of the rundown
- Same layout and formatting as your view
- Updates automatically as you make changes
- Cannot edit, add, or delete items
- No access to team settings or other rundowns

## AD View

### What is AD View?
AD View is a simplified presentation mode designed for Assistant Directors and other crew members who need to follow along with the show but don't need all the editing functionality.

### Features
- Clean, distraction-free interface
- Current segment prominently displayed
- Timing information clearly visible
- Upcoming segments preview
- Real-time updates from the main rundown

### Accessing AD View
1. Click "AD View" in the rundown menu
2. Opens in a new window
3. Can be shared with crew members via link
4. Updates automatically as the show progresses

## Importing CSV Files

### CSV Import Format
Import existing rundowns from spreadsheets:
1. Click "Import CSV" from the dashboard
2. Select your CSV file
3. Map columns to rundown fields
4. Preview and confirm the import

### CSV Structure
Your CSV should include these columns:
- Row Number
- Segment Name
- Duration
- Start Time
- Talent
- Script
- Notes
- Any custom fields

### Import Tips
- Use comma-separated values
- Include a header row with column names
- Format times as HH:MM:SS
- Export from Excel, Google Sheets, or any spreadsheet tool
- Preview lets you correct any issues before importing

## Teleprompter Operation

### Teleprompter Mode
Display scripts in a large, scrolling teleprompter view:
1. Click "Teleprompter" in the rundown menu
2. Opens in fullscreen mode
3. Displays script content in large, readable text
4. Auto-scrolls at adjustable speed

### Teleprompter Controls
- **Speed Control**: Adjust scroll speed with +/- buttons
- **Pause/Play**: Space bar to pause/resume scrolling
- **Manual Scroll**: Use arrow keys or mouse wheel
- **Font Size**: Adjust for optimal readability
- **Mirror Mode**: Flip text horizontally for teleprompter hardware

### Best Practices
- Use on a dedicated monitor or teleprompter rig
- Test scroll speed during rehearsal
- Keep an operator to adjust speed during live show
- Format scripts with clear paragraph breaks
- Use ALL CAPS for emphasis (sparingly)

## Keyboard Shortcuts

### Navigation
- **Tab**: Move to next cell
- **Shift + Tab**: Move to previous cell
- **Enter**: Save and move down
- **Escape**: Cancel edit
- **↑/↓ Arrow Keys**: Navigate between rows

### Editing Actions
- **Cmd/Ctrl + C**: Copy selected rows
- **Cmd/Ctrl + V**: Paste rows (pastes below selected row or at end if nothing selected)
- **Cmd/Ctrl + Shift + Enter**: Add new segment row (inserts below selected row or at end if nothing selected)
- **Cmd/Ctrl + Enter**: Insert line break in cell

### Find & Replace
- **Cmd/Ctrl + F**: Open Find & Replace dialog
- **Enter**: Navigate to next match
- **Shift + Enter**: Navigate to previous match

### Teleprompter Controls
- **Arrow Keys**: Adjust scroll speed
- **Space Bar**: Pause/Resume scrolling
- **Esc**: Exit fullscreen mode

## Support

Need more help? We're here for you!

### Contact Us
- **Email**: support@cuer.live
- **Live Chat**: Available 9 AM - 5 PM EST (weekdays)
- **Documentation**: Full guides at docs.cuer.live

### Community
- **Discord**: Join our community for tips and support
- **Feature Requests**: Submit ideas in the app or via email
- **Bug Reports**: Report issues through the in-app feedback tool

We typically respond to support requests within 24 hours (weekdays).
`;
};
