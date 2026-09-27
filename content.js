console.log("[Video Skip] Content script načten!");

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
  // Hledej časy jen v seeker divu (timeline s časy)
  const seekerDiv = document.querySelector('[data-testid="seeker"]');
  if (!seekerDiv) {
    console.log("[Video Skip] Seeker div nenalezen, zkouším najít timeline přímo");
    return [];
  }

  console.log("[Video Skip] Seeker div nalezen, obsah:", seekerDiv.textContent);

  const timeRegex = /^\d{1,2}:\d{2}(:\d{2})?$/;
  const timeTexts = [];

  // Hledej přímé children divy (ne všechny vnořené)
  for (const child of seekerDiv.children) {
    if (child.tagName === "DIV") {
      const text = child.textContent.trim();
      if (timeRegex.test(text) && !child.querySelector("div")) {
        // Pokud je to div s čistým časem (bez vnořených divů)
        timeTexts.push(text);
        console.log("[Video Skip] Nalezen čas:", text);
      }
    }
  }

  return timeTexts;
}

function skipToNextMidroll() {
  const playerVideo = document.querySelector("video.player");
  if (!playerVideo || playerVideo.duration === 0) return null;

  // VŽDY používej playerVideo.duration pro výpočet (je to skutečná délka videa!)
  let currentTimeSeconds = playerVideo.currentTime;
  let totalSeconds = playerVideo.duration;

  console.log("[Video Skip] Video délka z HTML5:", totalSeconds+"s | aktuální čas:", currentTimeSeconds+"s");

  // Ze seeker divu si vezmi jen informaci (pro debug)
  let timeTexts = findTimeElements();
  if (timeTexts.length >= 2) {
    console.log("[Video Skip] Časy viditelné v seeker divu:", timeTexts);
  } else {
    console.log("[Video Skip] Seeker div není viditelný");
  }

  // Najdi všechny midrolly
  let midrolls = document.querySelectorAll('[data-test="Midroll"]');
  if (midrolls.length === 0) {
    midrolls = document.querySelectorAll(".Timeline-Midrolls.Midroll");
  }
  if (midrolls.length === 0) {
    console.log("[Video Skip] Midrolly nenalezeny, posun o 60s");
    return null;
  }
  console.log("[Video Skip] Nalezeno midrollů:", midrolls.length);

  // Převeď midrolly na časy (v sekundách)
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

  // Najdi nejbližší midroll (používej currentTimeSeconds, ne playerVideo.currentTime!)
  console.log("[Video Skip] Hledám midroll s aktuálním časem:", currentTimeSeconds+"s");
  let targetMidroll = null;

  // Nejdřív se podívej, jestli se právě v nějakém midrollu nacházíš
  for (const midroll of midrollRanges) {
    if (currentTimeSeconds >= midroll.from && currentTimeSeconds < midroll.to) {
      targetMidroll = midroll;
      console.log("[Video Skip] Nacházíš se v midrollu, skočím za něj");
      break;
    }
  }

  // Pokud nejsi v žádném midrollu, najdi nejbližší budoucí
  if (!targetMidroll) {
    for (const midroll of midrollRanges) {
      if (currentTimeSeconds < midroll.from) {
        targetMidroll = midroll;
        console.log("[Video Skip] Nacházím se před midrollem, skočím za něj:", midroll.from+"s");
        break;
      }
    }
  }

  if (!targetMidroll) {
    console.log("[Video Skip] Žádný midroll nenalezen");
    return null;
  }

  // Posun na konec midrollu + 30 sekund
  const newTime = Math.min(targetMidroll.to + 30, playerVideo.duration);
  playerVideo.currentTime = newTime;

  console.log(`[Video Skip] Skočeno na: ${newTime.toFixed(1)}s (za midrollem)`);
  return { success: true, type: "midroll-skip", time: newTime };
}

function skipVideo() {
  // 1. Prioritně zkus <video class="player"> (tvgo.t-mobile.cz)
  const playerVideo = document.querySelector("video.player");
  if (!playerVideo || playerVideo.duration === 0) {
    return null;
  }

  // Zkus skočit přes midroll
  const midrollResult = skipToNextMidroll();
  if (midrollResult) {
    return midrollResult;
  }

  // Fallback: posun o 60 sekund
  if (playerVideo && playerVideo.duration > 0) {
    playerVideo.currentTime = Math.min(playerVideo.currentTime + 60, playerVideo.duration);
    console.log("[Video Skip] Player video posunuto o 60s na:", playerVideo.currentTime, "s");
    return { success: true, type: "player", time: playerVideo.currentTime };
  }

  // 2. Zkus všechny HTML5 <video> elementy
  const videos = document.querySelectorAll("video");

  for (const video of videos) {
    if (video.currentTime > 0 || video.duration > 0) {
      video.currentTime = Math.min(video.currentTime + 60, video.duration);
      console.log("[Video Skip] HTML5 video posunuto na:", video.currentTime, "s");
      return { success: true, type: "html5", time: video.currentTime };
    }
  }

  // 3. Zkus youtube iframe (YouTube)
  const youtubeIframe = document.querySelector("iframe[src*='youtube']");
  if (youtubeIframe) {
    console.log("[Video Skip] YouTube iframe nalezen, ale vyžaduje API klíč");
    return { success: false, error: "YouTube - vyžaduje speciální API" };
  }

  // 4. Zkus video.js player
  const videoJsPlayer = document.querySelector(".video-js");
  if (videoJsPlayer && window.videojs) {
    const player = window.videojs(videoJsPlayer);
    player.currentTime(Math.min(player.currentTime() + 60, player.duration()));
    console.log("[Video Skip] Video.js player posunuto na:", player.currentTime(), "s");
    return { success: true, type: "videojs", time: player.currentTime() };
  }

  // 5. Fallback - vezmi první video
  if (videos.length > 0) {
    videos[0].currentTime = Math.min(videos[0].currentTime + 60, videos[0].duration);
    console.log("[Video Skip] (Fallback) Video posunuto na:", videos[0].currentTime, "s");
    return { success: true, type: "html5-fallback", time: videos[0].currentTime };
  }

  console.log("[Video Skip] Žádný video přehrávač nenalezen");
  return { success: false, error: "Video přehrávač nenalezen" };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[Video Skip] Zpráva přijata:", request);
  if (request.action === "skipVideo") {
    const result = skipVideo();
    sendResponse(result);
  }
  return true;
});
