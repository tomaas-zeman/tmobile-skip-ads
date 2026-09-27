# T-Mobile Skip Ads Extension

A Chrome extension that automatically skips midroll advertisements in T-Mobile's online TV (tvgo.t-mobile.cz).

## Files

- `manifest.json` - Extension configuration
- `background.js` - Service worker that listens for extension icon clicks
- `content.js` - Content script running in page context, detects and skips midroll ads
- `images/` - Extension icons (16x16, 48x48, 128x128 px)

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right corner)
3. Click "Load unpacked"
4. Select the project folder

## Usage

- Click the extension icon in the toolbar while watching a video on tvgo.t-mobile.cz
- The extension detects midroll advertisements and skips to the end of the ad + 30 seconds
- If no midroll is detected, it falls back to skipping 60 seconds forward
- Click multiple times to skip through multiple ads

## How It Works

1. **background.js** - Listens for extension icon clicks
2. **content.js** - Runs in page context and:
   - Finds the HTML5 video element (`video.player`)
   - Detects midroll ads using DOM attributes (`fromleft`, `length`)
   - Calculates ad positions based on video duration
   - Intelligently skips to the next midroll or falls back to 60-second skip
3. Communication between scripts via `chrome.tabs.sendMessage()`

## Features

- **Smart midroll detection** - Automatically identifies ad breaks in the middle of videos
- **Position-aware skipping** - Skips to the end of the current or next midroll + 30 seconds
- **Fallback mechanism** - Defaults to 60-second skip if no ads are detected
- **Multiple player support** - Works with HTML5 video, Video.js, and YouTube iframes
- **Debug logging** - Console logs show what the extension is doing

## Notes

- Optimized for T-Mobile online TV (tvgo.t-mobile.cz)
- Works with any HTML5 `<video>` element
- Falls back to generic video skipping for other sites
- Some embedded players (YouTube, Vimeo) may require different approaches
