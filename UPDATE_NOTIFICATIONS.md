# App Update Notification System

This system allows you to notify active users when you publish app updates.

## How It Works

1. **Realtime Notifications**: The app listens for update notifications using Supabase realtime
2. **User-Triggered**: You manually trigger notifications after publishing updates
3. **Active Users Only**: Only users currently using the app receive notifications
4. **Clean UI**: Non-intrusive notification with refresh and dismiss options

## How to Use

### After Publishing an Update:

1. **Go to your Dashboard** (while signed in to your deployed app)
2. **Click "Notify Update"** button (next to Create New and Import CSV buttons)
3. **Optionally add a custom message** describing the update
4. **Click "Send Notification"**

### What Users See:

- A notification appears in the top-right corner saying "Cuer has an update!"
- Two buttons: "Refresh" (reloads the page) and "Later" (dismisses the notification)
- The notification automatically shows only to users who were active before the update

## Technical Details

- **Database**: Uses `app_notifications` table in Supabase
- **Realtime**: Listens for INSERT events on the notifications table
- **Security**: Requires authentication to create notifications
- **Cleanup**: Old notifications (24+ hours) are automatically deactivated

## Files Created/Modified:

- `src/hooks/useAppUpdateNotifications.ts` - Realtime notification listener
- `src/components/AppUpdateNotification.tsx` - Notification UI component  
- `src/components/UpdateNotificationTrigger.tsx` - Admin trigger button
- `src/utils/appNotifications.ts` - Notification utilities
- `src/App.tsx` - Added notification component to app root
- `src/pages/Dashboard.tsx` - Added trigger button to dashboard

## Workflow:

1. Make changes to your app in Lovable
2. Click **Publish** in Lovable to deploy
3. Go to your live app dashboard
4. Click **"Notify Update"** to alert active users
5. Users get notification and can refresh to see updates

This ensures users don't continue editing on old versions of your app!