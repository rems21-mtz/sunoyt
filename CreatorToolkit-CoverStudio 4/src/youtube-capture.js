(() => {
  "use strict";

  // Versioned guard: a stale V3.4/V3.5 capture script can still be alive in a
  // YouTube tab opened before the extension update. A new guard lets this
  // version register its own listener without touching the old one.
  if (window.__ctYtCaptureV352) return;
  window.__ctYtCaptureV352 = true;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function videoElement() {
    return (
      document.querySelector("video.html5-main-video") ||
      document.querySelector("#movie_player video") ||
      document.querySelector("video")
    );
  }

  function playerElement() {
    return document.querySelector("#movie_player") || document.querySelector(".html5-video-player");
  }

  function hasAd() {
    const player = playerElement();
    return !!(
      player?.classList?.contains("ad-showing") ||
      player?.classList?.contains("ad-interrupting") ||
      document.querySelector(".ytp-ad-player-overlay")
    );
  }

  function metadata() {
    const video = videoElement();
    if (!video) return null;
    const title =
      document.querySelector("h1.ytd-watch-metadata yt-formatted-string")?.textContent?.trim() ||
      document.querySelector("h1.title yt-formatted-string")?.textContent?.trim() ||
      document.title.replace(/\s*-\s*YouTube\s*$/i, "").trim();
    const channel =
      document.querySelector("#owner #channel-name a")?.textContent?.trim() ||
      document.querySelector("ytd-channel-name a")?.textContent?.trim() ||
      "";
    const url = new URL(location.href);
    return {
      videoId: url.searchParams.get("v") || "",
      title,
      channel: channel.replace(/\s*-\s*Topic$/i, "").trim(),
      duration: Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null,
      readyState: video.readyState,
    };
  }

  async function skipAd() {
    for (let i = 0; i < 80 && hasAd(); i += 1) {
      const skip = document.querySelector(
        ".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button"
      );
      if (skip) {
        try {
          skip.click();
        } catch (_) {}
      }
      await sleep(500);
    }
  }

  function chooseMime() {
    const options = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
    ];
    for (const mime of options) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) return mime;
    }
    return "";
  }

  function toBase64(bytes) {
    let out = "";
    const chunk = 32768;
    for (let i = 0; i < bytes.length; i += chunk) {
      out += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(out);
  }

  function progress(message, fraction) {
    try {
      chrome.runtime.sendMessage({ type: "ct-yt-progress", message, fraction });
    } catch (_) {}
  }

  async function capture(start, duration, preRoll) {
    await skipAd();
    const video = videoElement();
    if (!video) return { ok: false, error: "Lecteur YouTube introuvable. Ouvre la vidéo puis réessaie." };
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      return { ok: false, error: "La vidéo n'est pas encore prête. Clique sur Play puis réessaie." };
    }
    if (typeof MediaRecorder === "undefined") {
      return { ok: false, error: "Ce navigateur ne permet pas la capture audio." };
    }
    const saved = {
      time: video.currentTime,
      paused: video.paused,
      muted: video.muted,
    };
    const target = Math.max(0, Math.min(Number(start) || 0, Math.max(0, video.duration - 1)));
    const captureStart = Math.max(0, target - Math.max(0, Number(preRoll) || 0));
    const total = Math.min(Number(duration) || 30, Math.max(1, video.duration - captureStart));
    let stream = null;
    let recorder = null;
    let chunks = [];
    try {
      video.muted = true;
      video.currentTime = captureStart;
      await new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          video.removeEventListener("seeked", finish);
          resolve();
        };
        video.addEventListener("seeked", finish);
        setTimeout(finish, 2500);
      });
      if (hasAd()) await skipAd();
      await video.play().catch(() => {});
      stream = video.captureStream();
      const audioTracks = stream.getAudioTracks();
      if (!audioTracks.length) {
        return { ok: false, error: "YouTube ne fournit pas de piste audio sur cette vidéo." };
      }
      // captureStream() also carries a video track. MediaRecorder with an
      // audio/webm MIME type refuses to start on a mixed stream, which caused
      // "Failed to execute 'start' on 'MediaRecorder'". Record audio only.
      const audioStream = new MediaStream(audioTracks);
      const mime = chooseMime();
      recorder = new MediaRecorder(audioStream, mime ? { mimeType: mime, audioBitsPerSecond: 192000 } : {});
      chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size) chunks.push(event.data);
      };
      const stopped = new Promise((resolve) => {
        recorder.onstop = resolve;
      });
      recorder.start(250);
      progress("Capture de l'échantillon YouTube…", 0.1);
      const startedAt = Date.now();
      const durationMs = (total + 0.2) * 1000;
      while (Date.now() - startedAt < durationMs) {
        await sleep(250);
        progress(
          "Capture de l'échantillon YouTube…",
          Math.min(0.9, (Date.now() - startedAt) / durationMs)
        );
      }
      recorder.stop();
      await stopped;
      const blob = new Blob(chunks, { type: recorder.mimeType || mime || "audio/webm" });
      if (!blob.size) throw new Error("La capture audio est vide.");
      const bytes = new Uint8Array(await blob.arrayBuffer());
      progress("Échantillon capturé.", 1);
      return {
        ok: true,
        bytesBase64: toBase64(bytes),
        mime: blob.type || "audio/webm",
        start: target,
        trim: Math.max(0, target - captureStart),
      };
    } catch (error) {
      return { ok: false, error: error?.message || String(error) };
    } finally {
      try {
        if (recorder && recorder.state !== "inactive") recorder.stop();
      } catch (_) {}
      try {
        stream?.getTracks().forEach((track) => track.stop());
      } catch (_) {}
      try {
        video.pause();
        video.currentTime = saved.time;
        video.muted = saved.muted;
        if (!saved.paused) video.play().catch(() => {});
      } catch (_) {}
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== "object") return;
    if (message.type === "ct-yt-ping") {
      const info = metadata();
      sendResponse({
        ok: true,
        ready: !!info,
        video: info,
        title: info?.title || document.title,
      });
      return;
    }
    if (message.type === "ct-yt-capture" || message.type === "ct-yt-capture-v2") {
      capture(message.start, message.duration, message.preRoll)
        .then(sendResponse)
        .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
      return true;
    }
  });
})();
