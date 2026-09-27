console.log("[Video Skip] Content script loaded!");

function parseTime(timeStr) {
  timeStr = timeStr.trim();
  const parts = timeStr.split(":");
  let seconds = 0;

  if (parts.length === 3) {
    // HH:MM:SS
    seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  } else if (parts.length === 2) {
    // MM:SS
    seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return seconds;
}

function findTimeElements() {
  // Look for times only in seeker div (timeline with timestamps)
  const seekerDiv = document.querySelector('[data-testid="seeker"]');
  if (!seekerDiv) {
    console.log("[Video Skip] Seeker div not found, trying to find timeline directly");
    return [];
  }

  console.log("[Video Skip] Seeker div found, content:", seekerDiv.textContent);

  const timeRegex = /^\d{1,2}:\d{2}(:\d{2})?$/;
  const timeTexts = [];

  // Look for direct child divs (not all nested ones)
  for (const child of seekerDiv.children) {
    if (child.tagName === "DIV") {
      const text = child.textContent.trim();
      if (timeRegex.test(text) && !child.querySelector("div")) {
        // If it's a div with clean time (no nested divs)
        timeTexts.push(text);
        console.log("[Video Skip] Found time:", text);
      }
    }
  }

  return timeTexts;
}

function skipToNextMidroll() {
  const playerVideo = document.querySelector("video.player");
  if (!playerVideo || playerVideo.duration === 0) return null;

  // Always use playerVideo.duration for calculation (it's the actual video length!)
  let currentTimeSeconds = playerVideo.currentTime;
  let totalSeconds = playerVideo.duration;

  console.log("[Video Skip] Video duration from HTML5:", totalSeconds+"s | current time:", currentTimeSeconds+"s");

  // Get info from seeker div (for debugging)
  let timeTexts = findTimeElements();
  if (timeTexts.length >= 2) {
    console.log("[Video Skip] Times visible in seeker div:", timeTexts);
  } else {
    console.log("[Video Skip] Seeker div is not visible");
  }

  // Find all midrolls
  let midrolls = document.querySelectorAll('[data-test="Midroll"]');
  if (midrolls.length === 0) {
    midrolls = document.querySelectorAll(".Timeline-Midrolls.Midroll");
  }
  if (midrolls.length === 0) {
    console.log("[Video Skip] No midrolls found, skipping 60s");
    return null;
  }
  console.log("[Video Skip] Found midrolls:", midrolls.length);

  // Convert midrolls to times (in seconds)
  const midrollRanges = [];
  for (const midroll of midrolls) {
    const fromLeftPercent = parseFloat(midroll.getAttribute("fromleft"));
    const lengthPercent = parseFloat(midroll.getAttribute("length"));

    const fromSeconds = (fromLeftPercent / 100) * totalSeconds;
    const lengthSeconds = (lengthPercent / 100) * totalSeconds;
    const toSeconds = fromSeconds + lengthSeconds;

    midrollRanges.push({
      from: fromSeconds,
      to: toSeconds,
      length: lengthSeconds
    });

    console.log(`[Video Skip] Midroll: ${fromSeconds.toFixed(1)}s - ${toSeconds.toFixed(1)}s (${lengthSeconds.toFixed(1)}s)`);
  }

  // Find the nearest midroll (use currentTimeSeconds, not playerVideo.currentTime!)
  console.log("[Video Skip] Looking for midroll at current time:", currentTimeSeconds+"s");
  let targetMidroll = null;

  // First check if you're currently inside a midroll
  for (const midroll of midrollRanges) {
    if (currentTimeSeconds >= midroll.from && currentTimeSeconds < midroll.to) {
      targetMidroll = midroll;
      console.log("[Video Skip] You are inside a midroll, skipping past it");
      break;
    }
  }

  // If not in any midroll, find the nearest upcoming one
  if (!targetMidroll) {
    for (const midroll of midrollRanges) {
      if (currentTimeSeconds < midroll.from) {
        targetMidroll = midroll;
        console.log("[Video Skip] You are before a midroll, skipping past it:", midroll.from+"s");
        break;
      }
    }
  }

  if (!targetMidroll) {
    console.log("[Video Skip] No midroll found");
    return null;
  }

  // Jump to end of midroll + 30 seconds
  const newTime = Math.min(targetMidroll.to + 30, playerVideo.duration);
  playerVideo.currentTime = newTime;

  console.log(`[Video Skip] Jumped to: ${newTime.toFixed(1)}s (past midroll)`);
  return { success: true, type: "midroll-skip", time: newTime };
}

function skipVideo() {
  // 1. First try <video class="player"> (tvgo.t-mobile.cz)
  const playerVideo = document.querySelector("video.player");
  if (!playerVideo || playerVideo.duration === 0) {
    return null;
  }

  // Try to skip past midroll
  const midrollResult = skipToNextMidroll();
  if (midrollResult) {
    return midrollResult;
  }

  // Fallback: skip 60 seconds
  if (playerVideo && playerVideo.duration > 0) {
    playerVideo.currentTime = Math.min(playerVideo.currentTime + 60, playerVideo.duration);
    console.log("[Video Skip] Player video skipped 60s to:", playerVideo.currentTime, "s");
    return { success: true, type: "player", time: playerVideo.currentTime };
  }

  // 2. Try all HTML5 <video> elements
  const videos = document.querySelectorAll("video");

  for (const video of videos) {
    if (video.currentTime > 0 || video.duration > 0) {
      video.currentTime = Math.min(video.currentTime + 60, video.duration);
      console.log("[Video Skip] HTML5 video skipped to:", video.currentTime, "s");
      return { success: true, type: "html5", time: video.currentTime };
    }
  }

  // 3. Try YouTube iframe
  const youtubeIframe = document.querySelector("iframe[src*='youtube']");
  if (youtubeIframe) {
    console.log("[Video Skip] YouTube iframe found, but requires API key");
    return { success: false, error: "YouTube - requires special API" };
  }

  // 4. Try Video.js player
  const videoJsPlayer = document.querySelector(".video-js");
  if (videoJsPlayer && window.videojs) {
    const player = window.videojs(videoJsPlayer);
    player.currentTime(Math.min(player.currentTime() + 60, player.duration()));
    console.log("[Video Skip] Video.js player skipped to:", player.currentTime(), "s");
    return { success: true, type: "videojs", time: player.currentTime() };
  }

  // 5. Fallback - take first video
  if (videos.length > 0) {
    videos[0].currentTime = Math.min(videos[0].currentTime + 60, videos[0].duration);
    console.log("[Video Skip] (Fallback) Video skipped to:", videos[0].currentTime, "s");
    return { success: true, type: "html5-fallback", time: videos[0].currentTime };
  }

  console.log("[Video Skip] No video player found");
  return { success: false, error: "Video player not found" };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[Video Skip] Message received:", request);
  if (request.action === "skipVideo") {
    const result = skipVideo();
    sendResponse(result);
  }
  return true;
});
