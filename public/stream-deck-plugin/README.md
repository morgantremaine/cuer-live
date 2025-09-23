# Cuer Stream Deck Plugin

Control your Cuer rundown showcaller directly from your Elgato Stream Deck!

## Features

- **Play/Pause**: Start or pause the current rundown
- **Forward/Backward**: Navigate between segments
- **Reset**: Jump back to the beginning
- **Status Display**: Show current segment and playback status

## Installation

1. **Download the Plugin**
   - Download `com.cuer.showcaller.sdPlugin.zip` from [cuer.live/stream-deck-plugin](https://cuer.live/stream-deck-plugin.zip)

2. **Install the Plugin**
   - Double-click the downloaded `.streamDeckPlugin` file
   - Stream Deck software will automatically install it

3. **Configure the Plugin**
   - Drag any Cuer action to your Stream Deck
   - In the property inspector, click "Login to Cuer"
   - A popup window will open for you to sign in
   - Once logged in, select the rundown you want to control
   - Repeat for additional buttons

## Button Actions

### Play/Pause
- **Single Press**: Toggle between play and pause
- **Visual State**: Shows play icon when stopped, pause icon when playing

### Forward
- **Single Press**: Jump to the next segment in the rundown
- Works with regular (non-floating) items only

### Backward  
- **Single Press**: Jump to the previous segment in the rundown
- Works with regular (non-floating) items only

### Reset
- **Single Press**: Reset to the beginning of the rundown
- Sets status to paused and jumps to first segment

### Status Display
- **Display Only**: Shows current segment name and play status
- Updates automatically when rundown state changes
- Truncates long segment names to fit button

## Configuration

Each button needs to be configured with:

1. **Login**: Click "Login to Cuer" and sign in with your account
2. **Rundown**: Select which rundown to control

## Requirements

- Elgato Stream Deck software v6.0 or later
- Active Cuer account with rundowns
- Internet connection for API communication

## Troubleshooting

### "Access Denied" Error
- Make sure you're logged in to your Cuer account
- Verify you have access to the selected rundown
- Try logging out and back in

### "Connection Failed" Error  
- Check your internet connection
- Try logging out and back in
- Restart the Stream Deck software

### Plugin Not Loading
- Restart Stream Deck software
- Reinstall the plugin
- Check if you have the latest version

### Buttons Not Responding
- Verify you're logged in to your Cuer account
- Check rundown selection in property inspector
- Look for error indicators on the buttons

## Support

For support or bug reports:
- Email: support@cuer.live
- Website: [cuer.live](https://cuer.live)

## Version History

**v1.0.0**
- Initial release
- Basic playback controls (play, pause, forward, backward, reset)
- Status display
- Rundown selection
- API token authentication