chrome.action.onClicked.addListener(async (tab) => {
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: "skipVideo" });
    console.log("[Video Skip] Response:", response);
  } catch (error) {
    console.error("[Video Skip] Chyba:", error.message);
  }
});
