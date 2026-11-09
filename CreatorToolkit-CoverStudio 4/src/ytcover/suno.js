/*
 * Suno hand-off: open Create, fill the lyrics editor, push the captured audio
 * to the Creator Toolkit upload queue, or download it.
 */

const CREATE_URL = "https://suno.com/create";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function withTimeout(promise, ms, message) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function bytesToBase64(bytes) {
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(out);
}

async function findCreateTab() {
  const tabs = await chrome.tabs.query({ url: ["https://suno.com/create*"] });
  return tabs[0] ?? null;
}

export async function openCreateTab() {
  let tab = await findCreateTab();
  if (tab?.id) {
    await chrome.tabs.update(tab.id, { active: true });
    if (tab.windowId) await chrome.windows.update(tab.windowId, { focused: true });
    return tab;
  }
  tab = await chrome.tabs.create({ url: CREATE_URL, active: true });
  return tab;
}

async function ping(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: "ct-suno-ping" });
  } catch (_) {
    return null;
  }
}

async function waitForBridge(tabId, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await ping(tabId);
    if (response?.ok) return true;
    await sleep(400);
  }
  return false;
}

async function ensureContentScript(tabId) {
  // Always (re)inject the current bridge. The bridge has a V2 guard, so it is a
  // no-op when present, and it replaces the behaviour of a stale content script
  // left over from before an extension reload.
  try {
    await withTimeout(
      chrome.scripting.executeScript({ target: { tabId }, files: ["src/suno-lyrics-fill.js"] }),
      4000,
      "injection timeout"
    );
  } catch (_) {}
  return waitForBridge(tabId, 6000);
}

export async function fillLyricsInSuno(text) {
  const tab = await openCreateTab();
  if (!tab?.id) return { ok: false, error: "Impossible d'ouvrir Suno Create." };
  if (!(await ensureContentScript(tab.id))) {
    return {
      ok: false,
      error:
        "Le pont Suno ne répond pas. Recharge l'onglet Suno, connecte-toi, puis réessaie.",
    };
  }
  // React needs a moment after navigation before the editor exists.
  await sleep(1800);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await withTimeout(
        chrome.tabs.sendMessage(tab.id, { type: "ct-fill-lyrics-v2", text }),
        18000,
        "L'éditeur Suno n'a pas répondu à temps."
      );
      if (result?.ok) return result;
      if (attempt === 1) return result ?? { ok: false, error: "Remplissage impossible." };
    } catch (error) {
      if (attempt === 1) return { ok: false, error: error?.message || String(error) };
    }
    await sleep(900);
  }
  return { ok: false, error: "Remplissage impossible." };
}

export async function sendAudioToQueue({ bytes, name, mime }) {
  // The embedded engine lives inside the Cover Studio page.
  const payload = {
    type: "ct-add-upload",
    bytesBase64: bytesToBase64(bytes),
    name,
    mime,
  };
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      const response = await chrome.runtime.sendMessage(payload);
      if (response?.ok) return response;
    } catch (_) {
      // No receiver yet: the embedded engine is probably still starting.
    }
    await sleep(600);
  }
  return {
    ok: false,
    error:
      "Le moteur d'upload intégré ne répond pas. Recharge Cover Studio, puis réessaie.",
  };
}

async function sendToCreate(type, payload, timeoutMs = 20000) {
  const tab = await openCreateTab();
  if (!tab?.id) return { ok: false, error: "Impossible d'ouvrir Suno Create." };
  if (!(await ensureContentScript(tab.id))) {
    return { ok: false, error: "Le pont Suno ne répond pas. Recharge l'onglet Suno, puis réessaie." };
  }
  try {
    const result = await withTimeout(
      chrome.tabs.sendMessage(tab.id, { type, ...payload }),
      timeoutMs,
      "Suno n'a pas répondu à temps."
    );
    return result ?? { ok: false, error: "Réponse Suno vide." };
  } catch (error) {
    return { ok: false, error: error?.message || String(error) };
  }
}

export function fillStyleInSuno(text) {
  return sendToCreate("ct-fill-style-v2", { text }, 20000);
}

export function configureSuno() {
  return sendToCreate("ct-suno-settings-v2", {}, 25000);
}

export function importAudioIntoSuno({ bytesBase64, name, mime }) {
  return sendToCreate("ct-import-audio-v2", { bytesBase64, name, mime }, 30000);
}

export function goRemixCover() {
  return sendToCreate("ct-remix-cover-v2", {}, 45000);
}

export async function startAutoUpload({ bytes, name, mime, profiles, requestId }) {
  const payload = {
    type: "ct-auto-upload",
    requestId,
    bytesBase64: bytesToBase64(bytes),
    name,
    mime,
    profiles,
  };
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const response = await Promise.race([
        chrome.runtime.sendMessage(payload),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 14000)),
      ]);
      if (response && typeof response === "object") {
        return response.ok ? response : { ok: false, error: response.error || "Upload refusé." };
      }
    } catch (_) {
      // No receiver yet, or the panel is still booting.
    }
    await sleep(600);
  }
  return {
    ok: false,
    error:
      "Le moteur d'upload intégré ne répond pas. Recharge Cover Studio, vérifie que Suno est connecté, puis réessaie.",
  };
}

export function downloadAudio(bytes, name, mime = "audio/mpeg") {
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
