(() => {
  const button = document.getElementById("open-ytcover");
  if (!button) return;
  button.addEventListener("click", async () => {
    const url = chrome.runtime.getURL("ytcover.html");
    try {
      const tabs = await chrome.tabs.query({ url });
      if (tabs[0]?.id) {
        await chrome.tabs.update(tabs[0].id, { active: true });
        if (tabs[0].windowId != null) await chrome.windows.update(tabs[0].windowId, { focused: true });
      } else {
        await chrome.tabs.create({ url, active: true });
      }
    } catch (_) {
      await chrome.tabs.create({ url, active: true });
    }
  });
})();
