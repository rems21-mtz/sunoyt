import {
  base64ToBytes,
  decodeAudioBytes,
  copyBuffer,
  detectTempo,
  beatPeriod,
  segmentLengthFromBars,
  snapToBeat,
  peaks,
  encodeMp3,
  encodeWav,
  formatTime,
} from "./audio.js";
import { transcribe } from "./phonetics.js";
import { geniusSearch, geniusLyrics, structureLyrics, fetchLyrics } from "./lyrics.js";
import {
  openCreateTab,
  fillLyricsInSuno,
  sendAudioToQueue,
  downloadAudio,
  startAutoUpload,
  fillStyleInSuno,
  configureSuno,
  importAudioIntoSuno,
  goRemixCover,
  bytesToBase64,
} from "./suno.js";

const $ = (id) => document.getElementById(id);

const UI = {
  url: $("yt-url"),
  load: $("yt-load"),
  local: $("yt-local"),
  clearCache: $("yt-clear-cache"),
  file: $("yt-file"),
  videoCard: $("yt-video-card"),
  thumb: $("yt-thumb"),
  videoTitle: $("yt-video-title"),
  videoSub: $("yt-video-sub"),
  play: $("yt-play"),
  analyze: $("yt-analyze"),
  analyzeRow: $("yt-analyze-row"),
  sampleStart: $("yt-sample-start"),
  analyze2: $("yt-analyze-2"),
  editor: $("yt-editor"),
  confidence: $("yt-confidence"),
  bpm: $("yt-bpm"),
  bpmInput: $("yt-bpm-input"),
  beatInfo: $("yt-beat-info"),
  tempoHint: $("yt-tempo-hint"),
  start: $("yt-start"),
  startOut: $("yt-start-out"),
  bars: $("yt-bars"),
  length: $("yt-length"),
  snap: $("yt-snap"),
  segmentRange: $("yt-segment-range"),
  capture: $("yt-capture"),
  download: $("yt-download"),
  segmentStatus: $("yt-segment-status"),
  sampleMeta: $("yt-sample-meta"),
  wave: $("yt-wave"),
  waveTime: $("yt-wave-time"),
  audio: $("yt-audio"),
  preview: $("yt-preview"),
  stop: $("yt-stop"),
  progress: $("yt-progress"),
  progressFill: $("yt-progress-fill"),
  progressLabel: $("yt-progress-label"),
  sourceStatus: $("yt-source-status"),
  sourceState: $("source-state"),
  sourceHeading: $("source-heading"),
  title: $("ly-title"),
  artist: $("ly-artist"),
  search: $("ly-search"),
  results: $("ly-results"),
  resultsList: $("ly-results-list"),
  resultsClose: $("ly-results-close"),
  original: $("ly-original"),
  phonetic: $("ly-phonetic-text"),
  lyricsSource: $("ly-source"),
  lyricStatus: $("ly-status"),
  sectionChips: $("ly-sections"),
  structure: $("ly-structure"),
  phoneticButton: $("ly-phonetic"),
  aiButton: $("ly-ai"),
  copyPhonetic: $("ly-copy-phonetic"),
  sunoFill: $("ly-suno-fill"),
  phonStatus: $("ly-phon-status"),
  lyricsState: $("lyrics-state"),
  sunoState: $("suno-state"),
  sunoOpen: $("suno-open"),
  sunoFill2: $("suno-fill"),
  sunoQueue: $("suno-queue"),
  sunoDownload: $("suno-download"),
  sunoStatus: $("suno-status"),
  auto: $("suno-auto"),
  autoProfiles: $("suno-auto-profiles"),
  autoStatus: $("suno-auto-status"),
  discreet: $("yt-discreet"),
  trackName: $("yt-name"),
  nameRegen: $("yt-name-regen"),
  styleState: $("style-state"),
  styleInput: $("yt-style-input"),
  styleGenerate: $("yt-style-generate"),
  styleCopy: $("yt-style-copy"),
  styleFidelity: $("yt-style-fidelity"),
  stylePrompt: $("yt-style-prompt"),
  styleStatus: $("yt-style-status"),
  key: $("yt-key"),
  chords: $("yt-chords"),
  musicInfo: $("yt-music-info"),
  musicStatus: $("yt-music-status"),
  chordGrid: $("yt-chord-grid"),
  chordStatus: $("yt-chord-status"),
  chordsState: $("chords-state"),
  chorded: $("ly-chorded"),
  chordedStatus: $("ly-chorded-status"),
  chordsBase: $("ly-chords-base"),
  useChords: $("ly-use-chords"),
  buildChords: $("ly-build-chords"),
  copyChords: $("ly-copy-chords"),
  sunoChords: $("ly-suno-chords"),
  phoneticChords: $("ly-phonetic-chords"),
  stemScope: $("yt-stem-scope"),
  stemSource: $("yt-stem-source"),
  stemImport: $("yt-stem-import"),
  stemFile: $("yt-stem-file"),
  stemFileName: $("yt-stem-file-label"),
  sunoList: $("yt-suno-list"),
  sunoClip: $("yt-suno-clip"),
  sunoUse: $("yt-suno-use"),
  sunoStatus: $("yt-suno-status"),
  stemsRun: $("yt-stems-run"),
  stemsDownload: $("yt-stems-download"),
  stemsStatus: $("yt-stems-status"),
  stemsState: $("stems-state"),
  stemList: $("yt-stems-list"),
  voiceToggle: $("yt-voice-toggle"),
  voiceSuggest: $("yt-voice-suggest"),
  voiceVariants: $("yt-voice-variants"),
  voiceSuggestions: $("yt-voice-suggestions"),
  validate: $("yt-validate"),
  scan2: $("yt-scan-2"),
  validateStatus: $("yt-validate-status"),
  cutState: $("cut-state"),
  allowOriginal: $("yt-allow-original"),
  downloadProcessed: $("suno-download-processed"),
  testedSelect: $("suno-tested-select"),
  downloadTested: $("suno-download-tested"),
  modeToggle: $("yt-mode-toggle"),
  modeHint: $("yt-mode-hint"),
  autoTitle: $("yt-auto-title"),
  autoSub: $("yt-auto-sub"),
  limitHint: $("yt-limit-hint"),
  originalLabel: $("yt-original-label"),
  note: $("yt-note"),
};

const state = {
  source: null, // "youtube" | "file"
  tabId: null,
  coverTabId: null,
  video: null,
  sample: null,
  sampleStart: 0,
  sampleSource: "",
  samplePeaks: null,
  bpm: null,
  confidence: 0,
  beatOffset: 0,
  bars: 8,
  segmentStart: 0,
  segmentDuration: 16,
  segmentBytes: null,
  segmentMime: "audio/mpeg",
  segmentName: "cover.mp3",
  segmentUrl: null,
  geniusResults: [],
  busy: false,
  captureProgress: false,
  searchToken: 0,
  autoRunning: false,
  autoRequestId: null,
  autoFailures: [],
  draftSuppressedUntil: 0,
  nameCustom: false,
  stylePrompt: "",
  voice: "",
  variants: new Set(),
  winningFile: null,
  winningPreset: "",
  testedFiles: [],
  lastTestedFile: null,
  lastTestedPreset: "",
  mode: "degrade",
  musicBusy: false,
  musicSections: [],
  enabledProfiles: new Set(["subtle", "instrumental"]),
  stems: [],
  stemWorker: null,
  stemsBusy: false,
  chordRows: [],
  stemRequestId: 0,
  stemGeneratedBuffer: null,
  stemGeneratedName: "",
};

const AUTO_PROFILES = [
  { id: "off", label: "Off" },
  { id: "subtle", label: "Subtle" },
  { id: "aggressive", label: "Aggressive" },
  { id: "instrumental", label: "Instrumental" },
  { id: "slow", label: "Ralenti 50%" },
  { id: "transparent", label: "Transparent" },
];

const AI_PROMPT = `Act as an expert in simplified English phonetic transcription. Transform the lyrics given to you into 100% English simplified phonetics by strictly applying these rules without exception:
1. Syllable breakdown: Break down every word syllable by syllable using hyphens, line by line (for example cho-rus, cof-fee).
2. Silent letters: Remove all silent letters or unpronounced endings.
3. Intuitive English phonetics: Transcribe words using standard English phonetic spelling approximations so that a native English speaker reads it with natural pronunciation, rhythm and accent.
4. Stress emphasis: Use UPPERCASE letters for stressed syllables in multi-syllable words to ensure proper meter and cadence (for example CHO-rus).
5. Strict pronunciation focus: Eliminate all non-English phonetic conventions. Focus strictly on natural English phonetic reading.
6. Output format: Do not output any code, explanations or commentary. Never rewrite the original source text. Display ONLY the final simplified phonetic transcription.
7. Keep the section structure tags exactly as they are: [Intro], [Verse 1], [Chorus], [Bridge], [Outro], etc., on their own lines. Do not phonetically transform the tags.
8. Keep every chord annotation in square brackets exactly as it is: [Am], [F#m7], [Am - F - C - G]. Do not phonetically transform chord names or chord lines. They are musical annotations, not lyrics.`;

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function show(element, visible = true) {
  if (element) element.hidden = !visible;
}

function setStatus(element, message, tone = "") {
  if (!element) return;
  element.textContent = message || "";
  if (tone) element.dataset.tone = tone;
  else delete element.dataset.tone;
}

function setStepState(element, message, tone = "") {
  if (!element) return;
  element.textContent = message;
  if (tone) element.dataset.tone = tone;
  else delete element.dataset.tone;
}

function setAutoStatus(message, tone = "") {
  setStatus(UI.autoStatus, message, tone);
}

function maxSegmentDuration() {
  return state.mode === "slow" ? 29 : 53;
}

function profilesForAuto() {
  if (state.mode === "slow") return ["slow"];
  if (state.mode === "transparent") return ["transparent"];
  return AUTO_PROFILES
    .map((profile) => profile.id)
    .filter((id) => id !== "slow" && id !== "transparent" && state.enabledProfiles.has(id));
}

function toggleAutoProfile(id) {
  if (state.autoRunning || state.mode === "slow" || state.mode === "transparent") return;
  if (state.enabledProfiles.has(id)) state.enabledProfiles.delete(id);
  else state.enabledProfiles.add(id);
  renderAutoProfiles();
  saveDraft();
}

function renderAutoProfiles(states = {}) {
  if (!UI.autoProfiles) return;
  const enabled = profilesForAuto();
  const list = state.mode === "slow"
    ? AUTO_PROFILES.filter((profile) => profile.id === "slow")
    : state.mode === "transparent"
      ? AUTO_PROFILES.filter((profile) => profile.id === "transparent")
      : AUTO_PROFILES.filter((profile) => profile.id !== "slow" && profile.id !== "transparent");
  UI.autoProfiles.replaceChildren();
  for (const profile of list) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "ytauto-profile";
    chip.dataset.profile = profile.id;
    chip.dataset.enabled = String(enabled.includes(profile.id));
    const state = states[profile.id] || (enabled.includes(profile.id) ? "pending" : "skip");
    chip.dataset.state = enabled.includes(profile.id) ? state : "skip";
    chip.textContent = profile.label;
    chip.title = enabled.includes(profile.id)
      ? "Cliquer pour désactiver ce profil"
      : "Cliquer pour activer ce profil";
    chip.addEventListener("click", () => toggleAutoProfile(profile.id));
    UI.autoProfiles.append(chip);
  }
}

function reflectMode() {
  const slow = state.mode === "slow";
  const transparent = state.mode === "transparent";
  if (UI.modeToggle) {
    for (const button of UI.modeToggle.querySelectorAll("[data-mode]")) {
      button.setAttribute("aria-pressed", String(button.dataset.mode === state.mode));
    }
  }
  if (UI.autoTitle) UI.autoTitle.textContent = slow ? "Tester le ralenti 50%" : transparent ? "Tester le mode transparent" : "Tester la dégradation";
  if (UI.autoSub) {
    UI.autoSub.textContent = slow
      ? "Ralentissement 50 % · qualité conservée · Suno après acceptation"
      : transparent
        ? "Pitch et tempo intacts · Suno ne s'ouvre qu'après acceptation"
        : "Aggressive → Instrumental · Suno ne s'ouvre qu'après acceptation";
  }
  if (UI.modeHint) {
    UI.modeHint.textContent = slow
      ? "Ralentit le tempo de 50 % sans dégradation de qualité ; Suno ne s'ouvre qu'après acceptation."
      : transparent
        ? "Pitch et tempo exacts ; round-trip MP3 256 kbps et micro-dither. Suno ne s'ouvre qu'après acceptation."
        : "Teste les profils dégradés ; Suno ne s'ouvre qu'après acceptation.";
  }
  if (UI.originalLabel) UI.originalLabel.hidden = true;
  if (UI.limitHint) {
    UI.limitHint.textContent = slow
      ? "Extrait source limité à 29 s (≈58 s après ralentissement 50 %)."
      : transparent
        ? "Extrait limité à 53 s."
        : "Extrait limité à 53 s (≈59 s avec le profil Aggressive).";
  }
  if (UI.downloadProcessed) {
    const strong = UI.downloadProcessed.querySelector("strong");
    const small = UI.downloadProcessed.querySelector("span");
    if (strong) strong.textContent = slow ? "Télécharger le sample ralenti accepté" : transparent ? "Télécharger le sample transparent accepté" : "Télécharger le sample dégradé accepté";
    if (small) {
      small.textContent = slow
        ? "Le WAV ralenti 50 % exact issu du profil validé."
        : transparent
          ? "Le fichier exact issu du profil transparent validé par Suno."
          : "Le fichier exact issu du profil validé par Suno.";
    }
  }
  if (UI.sunoDownload) {
    const small = UI.sunoDownload.querySelector("span");
    if (small) {
      small.textContent = slow
        ? "WAV source non ralenti (l'extrait original)."
        : "MP3 non dégradé, pour vérification ou usage manuel.";
    }
  }
  if (UI.note) {
    UI.note.textContent = slow
      ? "Le mode ralenti produit un WAV environ 2× plus long, sans ré-encodage MP3 ni dégradation de qualité. Suno Create ne s'ouvre qu'après acceptation, puis le sample est importé et Remix > Cover est sélectionné."
      : transparent
        ? "Le mode transparent conserve le pitch et le tempo exacts ; l'empreinte est brisée par un round-trip MP3 256 kbps, un pad de silence de 0,1 s et un micro-dither. Suno Create ne s'ouvre qu'après acceptation, puis le sample est importé et Remix > Cover est sélectionné."
        : "Clique sur Off/Subtle/Aggressive/Instrumental pour choisir les profils testés. Off envoie l'original ; Suno Create ne s'ouvre qu'après acceptation, puis le sample est importé et Remix > Cover est sélectionné.";
  }
  renderAutoProfiles();
}

function setMode(mode, { persist = true, invalidate = true } = {}) {
  const next = mode === "slow" ? "slow" : mode === "transparent" ? "transparent" : "degrade";
  const changed = next !== state.mode;
  state.mode = next;
  if (changed && invalidate) invalidateSegment();
  reflectMode();
  if (state.sample) updateSegmentUI();
  updateAutoButton();
  if (changed && invalidate && UI.validateStatus) {
    setStatus(UI.validateStatus, "Mode changé : valide à nouveau l'extrait.", "working");
  }
  if (persist) saveDraft();
}

function setAutoProfile(id, state) {
  const chip = UI.autoProfiles?.querySelector(`[data-profile="${id}"]`);
  if (chip) chip.dataset.state = state;
}

function updateAutoButton() {
  if (!UI.auto) return;
  const hasLyrics = !!(UI.phonetic.value.trim() || UI.original.value.trim());
  UI.auto.disabled = state.busy || state.autoRunning || !state.segmentBytes || !hasLyrics;
}

function finishAuto(message, tone) {
  state.autoRunning = false;
  state.autoRequestId = null;
  if (message) setAutoStatus(message, tone);
  setStepState(UI.sunoState, tone === "ok" ? "Uploadé" : "Échec", tone === "ok" ? "ok" : "error");
  updateAutoButton();
}

function testedStatusLabel(status) {
  if (status === "complete") return "accepté";
  if (status === "paused") return "en pause";
  return "refusé";
}

function rememberTestedSample(preset, file, status) {
  if (!file?.bytesBase64) return false;
  const label = AUTO_PROFILES.find((profile) => profile.id === preset)?.label || preset || "profil";
  state.testedFiles = state.testedFiles.filter((entry) => entry.preset !== preset);
  state.testedFiles.push({ preset, label, status, file });
  const order = AUTO_PROFILES.map((profile) => profile.id);
  state.testedFiles.sort((a, b) => order.indexOf(a.preset) - order.indexOf(b.preset));
  state.lastTestedFile = file;
  state.lastTestedPreset = preset;
  if (UI.testedSelect) UI.testedSelect.disabled = false;
  if (UI.downloadTested) UI.downloadTested.disabled = false;
  renderTestedSamples();
  return true;
}

function renderTestedSamples() {
  if (!UI.testedSelect) return;
  const previous = UI.testedSelect.value;
  UI.testedSelect.replaceChildren();
  if (!state.testedFiles.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Aucun sample testé pour l'instant";
    UI.testedSelect.append(option);
    UI.testedSelect.disabled = true;
    UI.downloadTested.disabled = true;
    return;
  }
  state.testedFiles.forEach((entry, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${entry.label} (${testedStatusLabel(entry.status)})`;
    UI.testedSelect.append(option);
  });
  UI.testedSelect.disabled = false;
  UI.downloadTested.disabled = false;
  const keep = Number(previous);
  UI.testedSelect.value = Number.isInteger(keep) && keep >= 0 && keep < state.testedFiles.length
    ? String(keep)
    : String(state.testedFiles.length - 1);
}

function resetTestedSamples() {
  state.testedFiles = [];
  state.lastTestedFile = null;
  state.lastTestedPreset = "";
  renderTestedSamples();
}

function downloadTestedSample(entry = null, auto = false) {
  const selected = entry || state.testedFiles[Number(UI.testedSelect?.value)] || state.testedFiles.at(-1);
  if (!selected?.file?.bytesBase64) {
    setStatus(UI.sunoStatus, "Aucun sample testé à télécharger. Lance un test de dégradation.", "error");
    return false;
  }
  try {
    const bytes = base64ToBytes(selected.file.bytesBase64);
    const mime = selected.file.mime || "audio/wav";
    const ext = /mpeg|mp3/.test(mime) ? "mp3" : /wav/.test(mime) ? "wav" : /ogg/.test(mime) ? "ogg" : "audio";
    const base = cleanTrackName(UI.trackName.value) || "sample";
    const name = `${base} - ${selected.label} - testé.${ext}`;
    downloadAudio(bytes, name, mime);
    setStatus(
      UI.sunoStatus,
      `${auto ? "Dernier sample testé" : "Sample testé"} ${selected.label} (${testedStatusLabel(selected.status)}) téléchargé : ${name}`,
      "ok"
    );
    return true;
  } catch (error) {
    setStatus(UI.sunoStatus, error?.message || String(error), "error");
    return false;
  }
}

async function exportLastTestedSample(auto = false) {
  const response = await chrome.runtime.sendMessage({ type: "ct-export-last" }).catch(() => null);
  if (!response?.ok || !response.file?.bytesBase64) {
    setStatus(
      UI.sunoStatus,
      response?.error || "Le moteur n'a pas conservé de sample testé. Relance un test de dégradation.",
      "error"
    );
    return false;
  }
  const file = response.file;
  const preset = file.preset || "off";
  const status = file.status || "failed";
  rememberTestedSample(preset, { bytesBase64: file.bytesBase64, name: file.name, mime: file.mime }, status);
  const entry = state.testedFiles.find((item) => item.preset === preset) || state.testedFiles.at(-1);
  return downloadTestedSample(entry, auto);
}

function downloadWinningSample() {
  if (!state.winningFile) {
    setStatus(UI.sunoStatus, "Aucun sample dégradé accepté à télécharger pour l'instant.", "error");
    return;
  }
  try {
    const bytes = base64ToBytes(state.winningFile.bytesBase64);
    const mime = state.winningFile.mime || "audio/wav";
    const ext = /mpeg|mp3/.test(mime) ? "mp3" : /wav/.test(mime) ? "wav" : /ogg/.test(mime) ? "ogg" : "audio";
    const base = cleanTrackName(UI.trackName.value) || "sample";
    const presetLabel = AUTO_PROFILES.find((profile) => profile.id === state.winningPreset)?.label || "dégradé";
    const isOriginal = state.winningPreset === "off";
    const isSlow = state.winningPreset === "slow";
    const isTransparent = state.winningPreset === "transparent";
    const suffix = isOriginal ? "Off - original" : isSlow ? "Ralenti 50% - ralenti" : isTransparent ? "Transparent - transparent" : `${presetLabel} - dégradé`;
    downloadAudio(bytes, `${base} - ${suffix}.${ext}`, mime);
    setStatus(
      UI.sunoStatus,
      `Sample ${isOriginal ? "original (Off)" : isSlow ? "ralenti 50 %" : isTransparent ? "transparent" : `dégradé (${presetLabel})`} téléchargé.`,
      "ok"
    );
  } catch (error) {
    setStatus(UI.sunoStatus, error?.message || String(error), "error");
  }
}

async function afterAutoSuccess(message) {
  const style = UI.stylePrompt.value.trim();
  const lyrics = UI.phonetic.value.trim() || UI.original.value.trim();
  const preset = String(message.preset || "");
  let file = message.file || null;
  if (!file && preset === "off" && state.segmentBytes) {
    file = {
      bytesBase64: bytesToBase64(state.segmentBytes),
      name: state.segmentName,
      mime: "audio/mpeg",
    };
  }
  if (!file) {
    setStatus(
      UI.sunoStatus,
      `Sample ${preset || "dégradé"} accepté, mais le fichier traité n'a pas été récupéré. Relance le test : l'import ne doit jamais utiliser l'original.`,
      "error"
    );
    return;
  }
  state.winningFile = file;
  state.winningPreset = preset;
  if (UI.downloadProcessed) UI.downloadProcessed.disabled = false;
  const presetLabel = AUTO_PROFILES.find((profile) => profile.id === preset)?.label || preset || "dégradé";
  setStatus(
    UI.sunoStatus,
    preset === "off"
      ? "Sample original (Off) accepté. Import dans Suno Create en cours…"
      : preset === "slow"
        ? "Sample ralenti 50 % accepté. Import dans Suno Create en cours…"
        : preset === "transparent"
          ? "Sample transparent accepté. Import dans Suno Create en cours…"
          : `Sample dégradé (${presetLabel}) accepté. Import dans Suno Create en cours…`,
    "working"
  );
  const imported = await importAudioIntoSuno(file).catch(() => null);
  if (!imported?.ok) {
    setStatus(
      UI.sunoStatus,
      `Import automatique impossible : ${imported?.error || "champ audio introuvable"}. Le fichier accepté est téléchargé pour import manuel.`,
      "error"
    );
    try {
      downloadAudio(base64ToBytes(file.bytesBase64), file.name || "sample.wav", file.mime || "audio/wav");
    } catch (_) {}
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, 1600));
  const remix = await goRemixCover().catch(() => null);
  const styleFill = style ? await fillStyleInSuno(style).catch(() => null) : null;
  const lyricsFill = lyrics ? await fillLyricsInSuno(lyrics).catch(() => null) : null;
  if (lyrics && !lyricsFill?.ok) await copyLyricsToSunoTab(lyrics).catch(() => false);
  const settings = await configureSuno().catch(() => null);
  const settingsOk = settings?.weirdness?.ok && settings?.styleInfluence?.ok && settings?.variety?.ok;
  const fillsOk = (!style || styleFill?.ok) && (!lyrics || lyricsFill?.ok);
  if (remix?.ok) {
    const details = [
      fillsOk ? "paroles et style injectés" : "paroles/style à vérifier",
      settingsOk ? "Weirdness 0 / Style 100 / Variety Off" : "réglages à vérifier : Weirdness 0 / Style 100 / Variety Off",
    ].join(", ");
    setStatus(
      UI.sunoStatus,
      `Sample importé sur Suno. Remix > Cover ouvert, ${details}.`,
      fillsOk && settingsOk ? "ok" : "error"
    );
  } else {
    setStatus(
      UI.sunoStatus,
      `Sample importé, mais ${remix?.error || "impossible d'ouvrir Remix > Cover automatiquement"}. Ouvre Remix > Cover à la main sur Suno.`,
      "error"
    );
  }
}

function handleAutoProgress(message) {
  const label = message.label || message.preset || "";
  if (message.stage === "profile") {
    setAutoProfile(message.preset, "running");
    setAutoStatus(
      `Tentative ${Number(message.index) + 1}/${message.total} : ${label}… Garde Cover Studio ouvert.`,
      "working"
    );
    return;
  }
  if (message.stage === "failed") {
    rememberTestedSample(message.preset, message.file, "failed");
    setAutoProfile(message.preset, "fail");
    state.autoFailures.push({ preset: message.preset, label, error: message.error || null });
    const detail = message.error?.message ? ` (${message.error.message})` : "";
    setAutoStatus(`Mode ${label} refusé${detail}. Passage au mode suivant…`, "working");
    return;
  }
  if (message.stage === "success") {
    rememberTestedSample(message.preset, message.file, "complete");
    setAutoProfile(message.preset, "ok");
    setAutoStatus(
      `Audio accepté avec le mode ${label}. Import du sample et passage Remix > Cover…`,
      "working"
    );
    void afterAutoSuccess(message)
      .catch(() => {})
      .finally(() => {
        finishAuto(
          `Audio accepté avec le mode ${label}. Meilleure qualité conservée.${message.clipId ? ` Clip : ${message.clipId}` : ""}`,
          "ok"
        );
      });
    return;
  }
  if (message.stage === "paused") {
    setAutoProfile(message.preset, "fail");
    const detail = message.error?.message || "Suno a mis l'upload en pause.";
    finishAuto(`Upload en pause : ${detail}`, "error");
    return;
  }
  if (message.stage === "all_failed") {
    const enabled = profilesForAuto();
    for (const profile of AUTO_PROFILES) {
      setAutoProfile(profile.id, enabled.includes(profile.id) ? "fail" : "skip");
    }
    const names = AUTO_PROFILES.filter((profile) => enabled.includes(profile.id))
      .map((profile) => profile.label)
      .join(", ");
    const lastFailure = state.autoFailures[state.autoFailures.length - 1];
    const lastDetail = lastFailure?.error?.message
      ? ` Dernière erreur : ${lastFailure.error.message}`
      : "";
    finishAuto(
      message.instrumentalFailed
        ? `Aucun profil accepté (${names}). Le mode Instrumental n'est pas passé non plus.${lastDetail} Vérifie la session Suno ou essaie un autre passage.`
        : `Aucun profil accepté (${names}).${lastDetail} Vérifie la session Suno ou essaie un autre passage.`,
      "error"
    );
    if (state.testedFiles.length) {
      downloadTestedSample(state.testedFiles[state.testedFiles.length - 1], true);
    } else {
      void exportLastTestedSample(true);
    }
    return;
  }
  if (message.stage === "error") {
    finishAuto(message.error?.message || "L'automatisation a échoué.", "error");
  }
}

function clearSongData({ clearUrl = true, clearFields = true, message = "" } = {}) {
  state.searchToken += 1;
  state.draftSuppressedUntil = Date.now() + 1500;
  state.sample = null;
  state.samplePeaks = null;
  state.sampleStart = 0;
  state.sampleSource = "";
  state.bpm = null;
  state.confidence = 0;
  state.beatOffset = 0;
  state.segmentStart = 0;
  state.segmentDuration = 16;
  state.segmentBytes = null;
  state.segmentMime = "audio/mpeg";
  state.segmentName = "cover.mp3";
  state.video = null;
  state.source = null;
  state.tabId = null;
  state.geniusResults = [];
  state.autoRunning = false;
  state.autoRequestId = null;
  state.autoFailures = [];
  state.winningFile = null;
  state.winningPreset = "";
  state.testedFiles = [];
  state.lastTestedFile = null;
  state.lastTestedPreset = "";
  if (UI.testedSelect) UI.testedSelect.disabled = true;
  if (UI.downloadTested) UI.downloadTested.disabled = true;
  if (UI.downloadProcessed) UI.downloadProcessed.disabled = true;
  if (UI.testedSelect) renderTestedSamples();
  state.stylePrompt = "";
  if (UI.stylePrompt) UI.stylePrompt.value = "";
  if (UI.key) UI.key.value = "";
  if (UI.chords) UI.chords.value = "";
  state.musicSections = [];
  state.stems = [];
  state.stemGeneratedBuffer = null;
  state.stemGeneratedName = "";
  if (UI.stemFileName) UI.stemFileName.textContent = "";
  setStatus(UI.musicStatus, "", "");
  setStatus(UI.musicStatus, "", "");
  if (UI.chordGrid) UI.chordGrid.replaceChildren();
  if (UI.stemList) UI.stemList.replaceChildren();
  if (UI.stemsDownload) UI.stemsDownload.disabled = true;
  setStatus(UI.chordStatus, "", "");
  setStatus(UI.stemsStatus, "", "");
  if (UI.voiceSuggestions) UI.voiceSuggestions.replaceChildren();
  if (UI.styleState) setStepState(UI.styleState, "En attente", "");
  if (state.segmentUrl) {
    URL.revokeObjectURL(state.segmentUrl);
    state.segmentUrl = null;
  }

  if (clearUrl) UI.url.value = "";
  if (clearFields) {
    UI.title.value = "";
    UI.artist.value = "";
  }
  UI.original.value = "";
  UI.phonetic.value = "";
  UI.sampleStart.value = "0:00";
  delete UI.sampleStart.dataset.max;
  UI.lyricsSource.textContent = "—";
  delete UI.lyricsSource.dataset.tone;
  UI.phonStatus.textContent = "—";
  delete UI.phonStatus.dataset.tone;
  UI.results.replaceChildren();
  show(UI.results, false);
  setSectionChips([]);

  UI.bpm.textContent = "—";
  UI.bpmInput.value = "";
  UI.confidence.textContent = "—";
  delete UI.confidence.dataset.tone;
  UI.beatInfo.textContent = "Charge une vidéo puis lance l'analyse.";
  UI.tempoHint.textContent = "";
  UI.length.textContent = "—";
  UI.segmentRange.textContent = "—";
  UI.waveTime.textContent = "—";
  UI.sampleMeta.textContent = "—";
  UI.start.max = "0";
  UI.start.value = "0";
  UI.startOut.value = "0:00.00";

  UI.download.disabled = true;
  UI.sunoQueue.disabled = true;
  UI.sunoDownload.disabled = true;
  UI.capture.disabled = true;
  UI.preview.disabled = true;
  UI.stop.disabled = true;
  show(UI.editor, false);
  show(UI.videoCard, false);
  show(UI.analyzeRow, false);
  show(UI.progress, false);
  show(UI.audio, false);
  try {
    UI.audio.pause();
  } catch (_) {}
  UI.audio.removeAttribute("src");
  UI.thumb.removeAttribute("src");
  UI.thumb.alt = "";
  UI.thumb.hidden = true;
  delete UI.videoCard.dataset.local;
  UI.play.hidden = false;
  if (UI.sourceHeading) UI.sourceHeading.textContent = "Source YouTube";
  UI.videoTitle.textContent = "—";
  UI.videoSub.textContent = "—";
  UI.file.value = "";
  state.nameCustom = false;
  if (UI.trackName) {
    UI.trackName.value = UI.discreet.checked ? generateDiscreetName() : "";
  }

  setStepState(UI.sourceState, "En attente", "");
  setStepState(UI.lyricsState, "En attente", "");
  setStepState(UI.sunoState, "En attente", "");
  setStepState(UI.cutState, "En attente", "");
  setStatus(UI.validateStatus, "", "");
  UI.validate.disabled = true;
  setStatus(UI.sourceStatus, message, message ? "ok" : "");
  setStatus(UI.lyricStatus, "", "");
  setStatus(UI.segmentStatus, "", "");
  setStatus(UI.sunoStatus, "", "");
  setAutoStatus("", "");
  renderAutoProfiles();
  UI.auto.disabled = true;
  drawWave();
  updateLyricsButtons();

  try {
    const pending = chrome.storage.local.get(null).then((all) => {
      const keys = Object.keys(all ?? {}).filter((key) => key.startsWith("ytcover"));
      if (keys.length) return chrome.storage.local.remove(keys);
      return null;
    });
    if (pending && typeof pending.catch === "function") pending.catch(() => {});
  } catch (_) {}
  try {
    const pending = chrome.runtime.sendMessage({ type: "ct-clear-queue-finished" });
    if (pending && typeof pending.catch === "function") pending.catch(() => {});
  } catch (_) {}
}

function setBusy(busy, message = "") {
  state.busy = busy;
  UI.load.disabled = busy;
  UI.analyze.disabled = busy;
  UI.analyze2.disabled = busy;
  UI.capture.disabled = busy || !state.sample;
  UI.search.disabled = busy;
  UI.structure.disabled = busy;
  UI.phoneticButton.disabled = busy;
  UI.aiButton.disabled = busy;
  UI.sunoQueue.disabled = busy || !state.segmentBytes;
  UI.sunoFill.disabled = busy;
  UI.sunoFill2.disabled = busy;
  UI.title.disabled = busy;
  UI.artist.disabled = busy;
  UI.validate.disabled = busy || !state.sample;
  UI.styleGenerate.disabled = busy;
  UI.voiceSuggest.disabled = busy;
  UI.styleCopy.disabled = busy;
  UI.allowOriginal.disabled = busy;
  for (const button of UI.modeToggle.querySelectorAll("[data-mode]")) button.disabled = busy;
  UI.downloadProcessed.disabled = busy || !state.winningFile;
  updateAutoButton();
}

function debounce(fn, delay = 400) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function withTimeout(promise, ms, message) {
  let timer = null;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

function parseClock(value) {
  const raw = String(value ?? "").trim().replace(/\s+/g, "");
  if (!raw) return null;
  if (/^\d+(?:[.,]\d+)?$/.test(raw)) return Number(raw.replace(",", "."));
  const parts = raw.split(":");
  if (parts.length < 2 || parts.length > 3) return null;
  if (!parts.every((part) => /^\d+$/.test(part))) return null;
  const numbers = parts.map(Number);
  if (parts.length === 3) {
    const [hours, minutes, seconds] = numbers;
    if (minutes > 59 || seconds > 59) return null;
    return hours * 3600 + minutes * 60 + seconds;
  }
  const [minutes, seconds] = numbers;
  if (seconds > 59) return null;
  return minutes * 60 + seconds;
}

function formatClock(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function slugify(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "cover";
}

function normalizeYouTubeUrl(input) {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return { id: raw, url: `https://www.youtube.com/watch?v=${raw}` };
  let url;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch (_) {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
  if (!["youtube.com", "youtu.be", "music.youtube.com"].includes(host)) return null;
  let id = url.searchParams.get("v");
  if (!id) {
    const parts = url.pathname.split("/").filter(Boolean);
    const index = parts.findIndex((part) => ["shorts", "embed", "live", "v"].includes(part));
    if (index >= 0) id = parts[index + 1];
    else if (host === "youtu.be") id = parts[0];
  }
  if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) return null;
  return { id, url: `https://www.youtube.com/watch?v=${id}` };
}

function parseVideoTitle(title, channel) {
  let cleaned = String(title ?? "")
    .replace(/\s*[-–—]\s*YouTube\s*$/i, "")
    .replace(/\((?:official|officiel|lyrics?|paroles?|audio|video|clip|visuali[sz]er|hd|4k|remaster(?:ed)?|live|mv)[^)]*\)/gi, "")
    .replace(/\[(?:official|officiel|lyrics?|paroles?|audio|video|clip|visuali[sz]er|hd|4k|remaster(?:ed)?|live|mv)[^\]]*\]/gi, "")
    .replace(/\s*\|.*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  const parts = cleaned.split(/\s*[-–—]\s*/).map((part) => part.trim()).filter(Boolean);
  let artist = String(channel ?? "").replace(/\s*-\s*Topic$/i, "").replace(/VEVO$/i, "").trim();
  let song = cleaned;
  if (parts.length >= 2) {
    const [first, ...rest] = parts;
    const restText = rest.join(" - ");
    const channelLower = artist.toLowerCase();
    if (channelLower.includes(first.toLowerCase().slice(0, 6)) && first.length > 2) {
      song = restText;
      artist = first;
    } else if (channelLower.includes(restText.toLowerCase().slice(0, 6)) && restText.length > 2) {
      song = first;
      artist = restText;
    } else {
      artist = first;
      song = restText;
    }
  }
  song = song.replace(/\s*feat\.?.*$/i, "").replace(/\s*ft\.?.*$/i, "").trim();
  return { artist: artist.trim(), song: song.trim() };
}

/* ------------------------------------------------------------------ */
/* YouTube tab + capture                                               */
/* ------------------------------------------------------------------ */

async function waitForBridge(tabId, timeoutMs = 50000) {
  const deadline = Date.now() + timeoutMs;
  let injected = false;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { type: "ct-yt-ping" });
      if (response?.ok && response.ready && response.video) return response;
    } catch (error) {
      lastError = error;
    }
    // A YouTube tab opened before the extension was reloaded may not have the
    // content script. Inject it once, without asking the user to refresh.
    if (!injected && Date.now() > deadline - timeoutMs + 4000) {
      injected = true;
      try {
        await chrome.scripting.executeScript({ target: { tabId }, files: ["src/youtube-capture.js"] });
      } catch (_) {}
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    lastError?.message?.includes("Receiving end")
      ? "L'onglet YouTube ne répond pas. Recharge-le, puis réessaie."
      : "La vidéo YouTube n'a pas fini de charger. Ouvre l'onglet, clique sur Play, puis réessaie."
  );
}

async function loadYouTube() {
  if (state.busy) return;
  if (state.autoRunning) {
    setStatus(UI.sourceStatus, "Attends la fin de l'upload automatique avant de charger une autre vidéo.", "error");
    return;
  }
  const parsed = normalizeYouTubeUrl(UI.url.value);
  if (!parsed) {
    setStatus(UI.sourceStatus, "URL YouTube invalide. Exemple : https://www.youtube.com/watch?v=…", "error");
    return;
  }
  // A new scan must never inherit the previous song's title, artist, lyrics,
  // sample or upload state. Keep only the URL the user just typed.
  clearSongData({ clearUrl: false, clearFields: true });
  setBusy(true, "Ouverture de la vidéo YouTube…");
  setStatus(UI.sourceStatus, "Ouverture de la vidéo YouTube…", "working");
  setStepState(UI.sourceState, "Chargement", "working");
  try {
    state.source = "youtube";
    show(UI.editor, false);
    show(UI.videoCard, false);
    show(UI.analyzeRow, false);
    const coverTab = await chrome.tabs.getCurrent();
    state.coverTabId = coverTab?.id ?? null;

    const existing = await chrome.tabs.query({ url: parsed.url }).catch(() => []);
    const tab = existing[0] ?? (await chrome.tabs.create({ url: parsed.url, active: true }));
    await chrome.tabs.update(tab.id, { active: true }).catch(() => {});
    state.tabId = tab.id;
    const bridge = await waitForBridge(tab.id);
    state.video = {
      ...(bridge.video ?? {}),
      videoId: bridge.video?.videoId || parsed.id,
      title: bridge.video?.title || bridge.title || "",
      duration: bridge.video?.duration ?? null,
      channel: bridge.video?.channel || "",
      url: parsed.url,
    };
    if (!state.video.duration) {
      // The player sometimes needs a moment (or a Play click) before duration is known.
      for (let attempt = 0; attempt < 12 && !state.video.duration; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const retry = await chrome.tabs.sendMessage(tab.id, { type: "ct-yt-ping" }).catch(() => null);
        if (retry?.video?.duration) state.video = { ...state.video, ...retry.video };
      }
    }
    if (state.coverTabId) await chrome.tabs.update(state.coverTabId, { active: true }).catch(() => {});

    if (UI.sourceHeading) UI.sourceHeading.textContent = "Source YouTube";
    UI.videoTitle.textContent = state.video.title || "Vidéo YouTube";
    UI.videoSub.textContent = [
      state.video.channel,
      state.video.duration ? formatTime(state.video.duration) : null,
      state.video.videoId ? `youtube.com/watch?v=${state.video.videoId}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    if (state.video.videoId) {
      UI.thumb.src = `https://i.ytimg.com/vi/${state.video.videoId}/hqdefault.jpg`;
      UI.thumb.alt = state.video.title || "";
      UI.thumb.hidden = false;
      delete UI.videoCard.dataset.local;
      UI.play.hidden = false;
      show(UI.videoCard, true);
    }
    show(UI.analyzeRow, true);
    const defaultStart = Math.max(
      0,
      Math.min(
        (state.video.duration ?? 300) * 0.22,
        Math.max(0, (state.video.duration ?? 300) - 32)
      )
    );
    UI.sampleStart.value = formatClock(defaultStart);
    UI.sampleStart.dataset.max = String(Math.max(0, Math.floor((state.video.duration ?? 300) - 10)));
    setStatus(
      UI.sourceStatus,
      state.video.duration
        ? `Vidéo prête (${formatTime(state.video.duration)}). Choisis un point de départ puis lance l'analyse.`
        : "La vidéo n'est pas encore chargée. Ouvre l'onglet YouTube, clique sur Play, puis reviens lancer l'analyse.",
      state.video.duration ? "ok" : "error"
    );
    setStepState(UI.sourceState, state.video.duration ? "Prête" : "Lecture requise", state.video.duration ? "ok" : "error");
    suggestMetadata();
    refreshTrackName(false);
    saveDraft();
    void fetchMusicInfo({ silent: true });
    if (UI.title.value.trim() || UI.artist.value.trim()) {
      const token = state.searchToken;
      await searchLyrics(true, token);
    }
  } catch (error) {
    setStatus(UI.sourceStatus, error?.message || String(error), "error");
    setStepState(UI.sourceState, "Erreur", "error");
  } finally {
    setBusy(false);
  }
}

async function loadLocalFile(file) {
  if (!file) return;
  if (state.busy) return;
  if (state.autoRunning) {
    setStatus(UI.sourceStatus, "Attends la fin de l'upload automatique avant de charger un autre fichier.", "error");
    return;
  }
  clearSongData({ clearUrl: true, clearFields: true });
  setBusy(true, "Décodage du fichier…");
  setStatus(UI.sourceStatus, "Décodage du fichier…", "working");
  setStepState(UI.sourceState, "Fichier", "working");
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const buffer = await decodeAudioBytes(bytes, file.type);
    state.source = "file";
    state.tabId = null;
    state.sample = buffer;
    state.sampleStart = 0;
    state.sampleSource = "Fichier local";
    state.video = {
      title: file.name.replace(/\.[^.]+$/, ""),
      channel: "Fichier local",
      duration: buffer.duration,
      videoId: "",
      url: "",
    };
    state.segmentBytes = null;
    state.bpm = null;
    state.confidence = 0;
    state.beatOffset = 0;
    if (UI.sourceHeading) UI.sourceHeading.textContent = "Source audio";
    UI.videoTitle.textContent = state.video.title;
    UI.videoSub.textContent = `${formatTime(buffer.duration)} · ${buffer.numberOfChannels} canal(aux) · ${buffer.sampleRate} Hz`;
    show(UI.videoCard, true);
    show(UI.analyzeRow, false);
    UI.thumb.removeAttribute("src");
    UI.thumb.alt = "";
    UI.thumb.hidden = true;
    UI.videoCard.dataset.local = "true";
    UI.play.hidden = true;
    suggestMetadata();
    refreshTrackName(false);
    saveDraft();
    void fetchMusicInfo({ silent: true });
    await analyzeSample(true);
    setStatus(UI.sourceStatus, `Fichier prêt : ${file.name}.`, "ok");
  } catch (error) {
    setStatus(UI.sourceStatus, error?.message || String(error), "error");
    setStepState(UI.sourceState, "Erreur", "error");
  } finally {
    setBusy(false);
  }
}

function showProgress(visible, label = "", fraction = 0) {
  show(UI.progress, visible);
  if (label) UI.progressLabel.textContent = label;
  UI.progressFill.style.width = `${Math.max(0, Math.min(1, fraction)) * 100}%`;
}

async function captureSample() {
  if (state.source === "file" && state.sample) {
    await analyzeSample(true);
    return;
  }
  const duration = 30;
  const parsedStart = parseClock(UI.sampleStart.value);
  if (parsedStart === null) {
    setStatus(UI.sourceStatus, "Format du début attendu : min:sec (ex. 1:45).", "error");
    return;
  }
  const requested = Math.max(0, parsedStart);
  UI.sampleStart.value = formatClock(requested);
  if (!state.tabId) {
    setStatus(UI.sourceStatus, "Charge d'abord une vidéo YouTube.", "error");
    return;
  }
  setBusy(true, "Capture de l'échantillon…");
  setStatus(UI.sourceStatus, "Capture de l'échantillon…", "working");
  state.captureProgress = true;
  showProgress(true, "Capture de l'échantillon…", 0);
  try {
    // A YouTube tab opened before an extension update can still run the old
    // content script. Inject the versioned bridge, and keep the YouTube tab
    // active while recording: Chrome throttles timers in background tabs,
    // which made the video play but the MediaRecorder loop never finish.
    try {
      await chrome.scripting.executeScript({
        target: { tabId: state.tabId },
        files: ["src/youtube-capture.js"],
      });
    } catch (_) {}
    await chrome.tabs.update(state.tabId, { active: true }).catch(() => {});
    const response = await withTimeout(
      chrome.tabs.sendMessage(state.tabId, {
        type: "ct-yt-capture-v2",
        start: requested,
        duration,
        preRoll: 0.35,
      }),
      150000,
      "La capture n'a pas répondu. Ouvre l'onglet YouTube, clique sur Play, puis réessaie."
    );
    // Return to Cover Studio before decoding/analyzing so those steps also run
    // in the active tab.
    if (state.coverTabId != null) {
      await chrome.tabs.update(state.coverTabId, { active: true }).catch(() => {});
    }
    if (!response?.ok) throw new Error(response?.error || "Capture impossible.");
    const bytes = base64ToBytes(response.bytesBase64);
    const decoded = await decodeAudioBytes(bytes, response.mime);
    const trim = Math.max(0, Number(response.trim) || 0);
    const available = Math.max(0, decoded.duration - trim);
    if (available < 5) throw new Error("L'échantillon capturé est trop court. Réessaie.");
    state.sample = copyBuffer(decoded, trim, Math.min(duration, available));
    state.sampleStart = response.start ?? requested;
    state.sampleSource = "YouTube";
    state.samplePeaks = null;
    state.segmentBytes = null;
    await analyzeSample(false);
    setStatus(
      UI.sourceStatus,
      `Échantillon capturé (${state.sample.duration.toFixed(1)} s) à ${formatTime(state.sampleStart)}.`,
      "ok"
    );
  } catch (error) {
    setStatus(UI.sourceStatus, error?.message || String(error), "error");
    setStepState(UI.sourceState, "Erreur", "error");
  } finally {
    state.captureProgress = false;
    showProgress(false);
    setBusy(false);
    if (state.coverTabId != null) {
      await chrome.tabs.update(state.coverTabId, { active: true }).catch(() => {});
    }
  }
}

async function analyzeSample(fromFile = false) {
  if (!state.sample) {
    await captureSample();
    return;
  }
  setBusy(true, "Analyse du tempo…");
  setStatus(UI.sourceStatus, "Analyse du tempo…", "working");
  showProgress(true, "Analyse du tempo et du premier temps…", 0.6);
  try {
    const tempo = detectTempo(state.sample);
    state.bpm = Math.max(50, Math.min(200, Number(tempo.bpm) || 120));
    state.confidence = Number.isFinite(tempo.confidence) ? tempo.confidence : 0;
    state.beatOffset = Number.isFinite(tempo.beatOffset) ? tempo.beatOffset : 0;
    state.bars = Number(UI.bars.value) || 8;
    const period = beatPeriod(state.bpm);
    let duration = segmentLengthFromBars(state.bpm, state.bars);
    duration = Math.min(duration, Math.max(4, state.sample.duration));
    let start = state.beatOffset;
    if (fromFile || state.source === "file") {
      const target = state.sample.duration * 0.2;
      start = state.beatOffset + Math.round((target - state.beatOffset) / period) * period;
      if (!Number.isFinite(start) || start < 0) start = 0;
    }
    if (start + duration > state.sample.duration) {
      start = Math.max(0, state.sample.duration - duration);
    }
    state.segmentStart = Math.max(0, Math.min(start, Math.max(0, state.sample.duration - duration)));
    state.segmentDuration = duration;
    updateTempoUI();
    updateSegmentUI();
    show(UI.editor, true);
    setStepState(UI.sourceState, "Prête", "ok");
  } catch (error) {
    setStatus(UI.sourceStatus, error?.message || String(error), "error");
    setStepState(UI.sourceState, "Erreur", "error");
  } finally {
    showProgress(false);
    setBusy(false);
  }
}

function updateTempoUI() {
  const bpm = state.bpm ?? 120;
  UI.bpm.textContent = Number.isFinite(state.bpm) ? String(Math.round(bpm * 10) / 10) : "—";
  UI.bpmInput.value = Number.isFinite(state.bpm) ? String(Math.round(bpm * 10) / 10) : "";
  const confidence = state.confidence;
  const label = confidence >= 0.55 ? "Confiance élevée" : confidence >= 0.25 ? "Confiance moyenne" : "Estimation";
  UI.confidence.textContent = label;
  UI.confidence.dataset.tone = confidence >= 0.55 ? "ok" : confidence >= 0.25 ? "warn" : "";
  UI.beatInfo.textContent = `Premier temps détecté à ${formatTime(state.beatOffset, true)} dans l'échantillon.`;
  UI.tempoHint.textContent =
    confidence >= 0.25
      ? "Le passage par défaut est calé sur ce tempo. Ajuste le BPM ou les mesures si besoin."
      : "Tempo peu fiable : ajuste le BPM à la main pour recaler le passage.";
}

function updateSegmentUI() {
  if (!state.sample) return;
  const bpm = state.bpm || 120;
  const duration = Math.min(
    Math.max(2, segmentLengthFromBars(bpm, state.bars)),
    state.sample.duration,
    maxSegmentDuration()
  );
  state.segmentDuration = duration;
  const maxStart = Math.max(0, state.sample.duration - duration);
  state.segmentStart = Math.max(0, Math.min(state.segmentStart, maxStart));
  UI.start.max = String(maxStart);
  UI.start.value = String(state.segmentStart);
  UI.startOut.value = formatTime(state.segmentStart, true);
  UI.length.textContent = `${duration.toFixed(2)} s`;
  const absoluteStart = state.sampleStart + state.segmentStart;
  const absoluteEnd = absoluteStart + duration;
  UI.segmentRange.textContent = `Passage : ${formatTime(absoluteStart, true)} → ${formatTime(absoluteEnd, true)} dans la chanson (${duration.toFixed(2)} s, ${state.bars} mesures à ${Math.round(bpm * 10) / 10} BPM).`;
  UI.waveTime.textContent = `${formatTime(absoluteStart, true)} → ${formatTime(absoluteEnd, true)}`;
  UI.sampleMeta.textContent = `${formatTime(state.sample.duration, true)} · ${state.sampleSource}`;
  UI.capture.disabled = state.busy;
  UI.preview.disabled = !state.sample;
  UI.stop.disabled = true;
  UI.validate.disabled = state.busy || !state.sample;
  drawWave();
}

/* ------------------------------------------------------------------ */
/* Waveform                                                           */
/* ------------------------------------------------------------------ */

function drawWave() {
  const canvas = UI.wave;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(200, Math.floor(rect.width || canvas.width));
  const height = Math.max(120, Math.floor(rect.height || 190));
  if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "#12171e";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  if (!state.sample) {
    ctx.fillStyle = "rgba(157,169,185,0.75)";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Charge une vidéo puis analyse le tempo pour afficher la forme d'onde.", width / 2, height / 2 - 12);
    return;
  }

  if (!state.samplePeaks) state.samplePeaks = peaks(state.sample, Math.max(400, Math.floor(width)));
  const data = state.samplePeaks;
  const barWidth = width / data.length;
  for (let i = 0; i < data.length; i += 1) {
    const value = data[i];
    const barHeight = Math.max(1, value * (height - 24));
    const x = i * barWidth;
    const selected =
      x >= (state.segmentStart / state.sample.duration) * width &&
      x <= ((state.segmentStart + state.segmentDuration) / state.sample.duration) * width;
    ctx.fillStyle = selected ? "rgba(126,232,232,0.9)" : "rgba(33,196,196,0.35)";
    ctx.fillRect(x, height / 2 - barHeight / 2, Math.max(1, barWidth - 0.5), barHeight);
  }

  const x1 = (state.segmentStart / state.sample.duration) * width;
  const x2 = Math.min(width, ((state.segmentStart + state.segmentDuration) / state.sample.duration) * width);
  ctx.fillStyle = "rgba(33,196,196,0.12)";
  ctx.fillRect(x1, 0, Math.max(1, x2 - x1), height);
  ctx.strokeStyle = "#21c4c4";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x1 + 0.5, 0.5, Math.max(1, x2 - x1 - 1), height - 1);
  ctx.fillStyle = "#7ee8e8";
  ctx.fillRect(x1 - 1, 0, 3, height);
  ctx.fillRect(x2 - 2, 0, 3, height);
}

/* ------------------------------------------------------------------ */
/* Lyrics                                                             */
/* ------------------------------------------------------------------ */

function suggestMetadata() {
  if (!state.video) return;
  const parsed = parseVideoTitle(state.video.title, state.video.channel);
  if (!UI.title.value.trim() && parsed.song) UI.title.value = parsed.song;
  if (!UI.artist.value.trim() && parsed.artist) UI.artist.value = parsed.artist;
  if (state.source === "file") {
    if (!UI.title.value.trim()) UI.title.value = parsed.song || state.video.title;
    if (!UI.artist.value.trim()) UI.artist.value = "";
  }
}

function setLyricsResult(result, message = "") {
  UI.original.value = result.lyrics || "";
  UI.phonetic.value = "";
  UI.lyricsSource.textContent = result.source || "—";
  UI.lyricsSource.dataset.tone = result.source === "Genius" ? "ok" : "warn";
  setStatus(UI.lyricsState, result.source || "Paroles", "ok");
  setStepState(UI.lyricsState, result.source || "Prêtes", "ok");
  setSectionChips(result.sections || structureLyrics(UI.original.value).sections);
  renderChordGrid();
  const notes = [...(result.notes ?? [])];
  if (result.structured) notes.push("Structure déduite automatiquement — vérifie les balises.");
  if (message) notes.unshift(message);
  setStatus(UI.lyricStatus, notes.join(" "), notes.length ? "ok" : "");
  updateLyricsButtons();
  saveDraft();
}

function setSectionChips(sections = []) {
  UI.sectionChips.replaceChildren();
  for (const section of sections) {
    const chip = document.createElement("span");
    chip.className = "ytsection-chip";
    chip.dataset.label = section.label;
    chip.textContent = section.label;
    UI.sectionChips.append(chip);
  }
}

function updateLyricsButtons() {
  const hasLyrics = UI.original.value.trim().length > 0;
  const hasPhonetic = UI.phonetic.value.trim().length > 0;
  UI.structure.disabled = !hasLyrics || state.busy;
  UI.phoneticButton.disabled = !hasLyrics || state.busy;
  UI.aiButton.disabled = !hasLyrics || state.busy;
  UI.copyPhonetic.disabled = !hasPhonetic || state.busy;
  UI.sunoFill.disabled = !hasPhonetic || state.busy;
  updateAutoButton();
}

async function searchLyrics(auto = false, forcedToken = null) {
  const token = forcedToken ?? ++state.searchToken;
  if (token !== state.searchToken) return;
  const title = UI.title.value.trim();
  const artist = UI.artist.value.trim();
  if (!title && !artist) {
    if (!auto) setStatus(UI.lyricStatus, "Renseigne au moins un titre ou un artiste.", "error");
    return;
  }
  setBusy(true, "Recherche des paroles…");
  setStepState(UI.lyricsState, "Recherche", "working");
  setStatus(UI.lyricStatus, "Recherche sur Genius…", "working");
  show(UI.results, false);
  try {
    const results = await geniusSearch([title, artist].filter(Boolean).join(" "));
    if (token !== state.searchToken) return;
    state.geniusResults = results;
    if (results.length) {
      renderResults(results);
      const picked = await pickGeniusResult(results[0], true, token);
      if (token !== state.searchToken) return;
      if (!picked) throw Object.assign(new Error("Paroles Genius indisponibles."), { code: "genius_blocked" });
      setStatus(UI.lyricStatus, `${results.length} résultat(s) Genius. Le premier est chargé.`, "ok");
    } else {
      throw Object.assign(new Error("Aucun résultat Genius."), { code: "no_genius_result" });
    }
  } catch (error) {
    if (token !== state.searchToken) return;
    // Genius blocked or empty: fall back to LRCLIB / lyrics.ovh.
    try {
      const fallback = await fetchLyrics({ title, artist, preferGenius: false });
      if (token !== state.searchToken) return;
      setLyricsResult(fallback);
      setStatus(
        UI.lyricStatus,
        `${error?.message || "Genius indisponible."} Paroles via ${fallback.source}. Pour Genius : ouvre genius.com dans un onglet, passe la vérification, puis relance la recherche.`,
        "ok"
      );
    } catch (fallbackError) {
      if (token !== state.searchToken) return;
      setStatus(UI.lyricStatus, fallbackError?.message || String(fallbackError), "error");
      setStepState(UI.lyricsState, "Erreur", "error");
    }
  } finally {
    if (token === state.searchToken) {
      setBusy(false);
      updateLyricsButtons();
    }
  }
}

function renderResults(results) {
  UI.resultsList.replaceChildren();
  for (const result of results) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<strong>${escapeHtml(result.title)}</strong><span>${escapeHtml(result.artist || "")}</span>`;
    button.addEventListener("click", () => pickGeniusResult(result));
    li.append(button);
    UI.resultsList.append(li);
  }
  show(UI.results, true);
}

async function pickGeniusResult(result, quiet = false, forcedToken = null) {
  const token = forcedToken ?? state.searchToken;
  if (token !== state.searchToken) return false;
  if (!quiet) {
    setBusy(true, "Lecture des paroles Genius…");
    setStatus(UI.lyricStatus, "Lecture des paroles Genius…", "working");
  }
  try {
    const raw = await geniusLyrics(result.url);
    if (token !== state.searchToken) return false;
    const structured = structureLyrics(raw);
    setLyricsResult({
      lyrics: structured.text,
      rawLyrics: raw,
      sections: structured.sections,
      source: "Genius",
      sourceUrl: result.url,
      title: result.title,
      artist: result.artist,
      structured: structured.text !== raw.trim(),
      notes: [],
    });
    if (!quiet) show(UI.results, false);
    return true;
  } catch (error) {
    if (token !== state.searchToken) return false;
    if (quiet) {
      throw error;
    }
    setStatus(UI.lyricStatus, error?.message || String(error), "error");
    return false;
  } finally {
    if (!quiet && token === state.searchToken) {
      setBusy(false);
      updateLyricsButtons();
    }
  }
}

function structureCurrentLyrics() {
  const structured = structureLyrics(UI.original.value);
  UI.original.value = structured.text;
  setSectionChips(structured.sections);
  renderChordGrid();
  setStatus(UI.lyricStatus, "Balises de structure ajoutées ou normalisées.", "ok");
  updateLyricsButtons();
  saveDraft();
}

async function phoneticLocal() {
  const text = UI.original.value.trim();
  if (!text) return;
  setBusy(true, "Conversion phonétique locale…");
  setStatus(UI.lyricStatus, "Chargement du dictionnaire de prononciation…", "working");
  setStepState(UI.lyricsState, "Phonétique", "working");
  try {
    const start = performance.now();
    const result = await transcribe(UI.original.value);
    UI.phonetic.value = result;
    const seconds = ((performance.now() - start) / 1000).toFixed(1);
    UI.phonStatus.textContent = "Locale";
    UI.phonStatus.dataset.tone = "ok";
    setStatus(UI.lyricStatus, `Phonétique locale générée en ${seconds} s.`, "ok");
    updateLyricsButtons();
    saveDraft();
  } catch (error) {
    setStatus(UI.lyricStatus, error?.message || String(error), "error");
    setStepState(UI.lyricsState, "Erreur", "error");
  } finally {
    setBusy(false);
    updateLyricsButtons();
  }
}

async function readSongwriterConfig() {
  const stored = await chrome.storage.local.get({ songwriter: null });
  const config = stored.songwriter;
  if (!config || config.source === "local") return null;
  if (!config.baseUrl || !config.model) return null;
  let base = String(config.baseUrl).replace(/\/+$/, "");
  if (base.endsWith("/chat/completions")) return { ...config, url: base };
  return { ...config, url: `${base}/chat/completions` };
}

async function phoneticAI() {
  const text = UI.original.value.trim();
  if (!text) return;
  const config = await readSongwriterConfig();
  if (!config) {
    setStatus(
      UI.lyricStatus,
      "Aucun endpoint IA configuré. La phonétique locale reste disponible.",
      "error"
    );
    return;
  }
  try {
    const origin = new URL(config.url).origin + "/*";
    const granted = await chrome.permissions.contains({ origins: [origin] });
    if (!granted) {
      const accepted = await chrome.permissions.request({ origins: [origin] });
      if (!accepted) {
        setStatus(
          UI.lyricStatus,
          "L'accès réseau à l'endpoint IA a été refusé. Autorise-le depuis la page de l'extension, puis réessaie.",
          "error"
        );
        return;
      }
    }
  } catch (_) {
    // If the permissions API is unavailable, try the fetch anyway.
  }
  setBusy(true, "Conversion phonétique par l'IA…");
  setStepState(UI.lyricsState, "IA", "working");
  setStatus(UI.lyricStatus, "Envoi des paroles au modèle…", "working");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 180000);
  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.15,
        messages: [
          { role: "system", content: AI_PROMPT },
          { role: "user", content: text },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Le modèle a répondu HTTP ${response.status}. ${body.slice(0, 180)}`);
    }
    const data = await response.json();
    let output = data?.choices?.[0]?.message?.content;
    if (Array.isArray(output)) output = output.map((part) => part?.text ?? "").join("");
    output = String(output ?? "")
      .replace(/^```[a-z]*\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    if (!output) throw new Error("Le modèle a renvoyé une réponse vide.");
    UI.phonetic.value = output;
    UI.phonStatus.textContent = "IA";
    UI.phonStatus.dataset.tone = "ok";
    setStatus(UI.lyricStatus, `Phonétique IA générée avec ${config.model}.`, "ok");
    updateLyricsButtons();
    saveDraft();
  } catch (error) {
    setStatus(
      UI.lyricStatus,
      error?.name === "AbortError" ? "Le modèle n'a pas répondu à temps." : error?.message || String(error),
      "error"
    );
    setStepState(UI.lyricsState, "Erreur", "error");
  } finally {
    clearTimeout(timer);
    setBusy(false);
    updateLyricsButtons();
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ------------------------------------------------------------------ */
/* Segment encoding / Suno                                            */
/* ------------------------------------------------------------------ */

function invalidateSegment() {
  if (!state.segmentBytes) return;
  state.segmentBytes = null;
  if (state.segmentUrl) {
    URL.revokeObjectURL(state.segmentUrl);
    state.segmentUrl = null;
  }
  UI.download.disabled = true;
  UI.sunoQueue.disabled = true;
  UI.sunoDownload.disabled = true;
  setStatus(UI.segmentStatus, "Sélection modifiée — recapture le passage.", "");
}

const TRACK_NAME_A = [
  "Quiet", "Amber", "Silver", "Neon", "Velvet", "Midnight", "Echo", "Drift",
  "Golden", "Hollow", "Crimson", "Pale", "Slow", "Open", "Hidden", "Distant",
  "Soft", "Warm", "Blue", "Faded", "Lunar", "Copper", "Misty", "Gentle",
];
const TRACK_NAME_B = [
  "Harbor", "Orbit", "Canvas", "Signal", "Garden", "Window", "River", "Static",
  "Bloom", "Letter", "Motion", "Corner", "Skyline", "Room", "Tide", "Frame",
  "Street", "Valley", "Mirror", "Season", "Island", "Current", "Pocket", "Shore",
];

function randomInt(max) {
  try {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] % max;
  } catch (_) {
    return Math.floor(Math.random() * max);
  }
}

function generateDiscreetName() {
  const a = TRACK_NAME_A[randomInt(TRACK_NAME_A.length)];
  const b = TRACK_NAME_B[randomInt(TRACK_NAME_B.length)];
  const n = 1 + randomInt(98);
  return `${a} ${b} ${String(n).padStart(2, "0")}`;
}

function cleanTrackName(value) {
  return String(value ?? "")
    .replace(/\.mp3$/i, "")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function originalTrackName() {
  const parsed = parseVideoTitle(
    state.video?.title || UI.title.value || "",
    state.video?.channel || UI.artist.value || ""
  );
  const title = UI.title.value.trim() || parsed.song || "Cover";
  const artist = UI.artist.value.trim() || parsed.artist || "";
  return cleanTrackName([artist, title].filter(Boolean).join(" - ")) || "Cover";
}

function syncSegmentName() {
  if (!state.segmentBytes) return;
  const base = segmentFileBase();
  state.segmentName = `${base}.mp3`;
  setStatus(UI.segmentStatus, `Nom du fichier : ${state.segmentName}.`, "ok");
}

function refreshTrackName(force = false) {
  if (!UI.trackName) return;
  if (!UI.discreet.checked) {
    if (force || !UI.trackName.value.trim() || !state.nameCustom) {
      UI.trackName.value = originalTrackName();
      state.nameCustom = false;
    }
  } else if (force || !UI.trackName.value.trim() || !state.nameCustom) {
    let generated = generateDiscreetName();
    if (generated === UI.trackName.value) generated = generateDiscreetName();
    UI.trackName.value = generated;
    state.nameCustom = false;
  }
  syncSegmentName();
}

function segmentFileBase() {
  return (
    cleanTrackName(UI.trackName.value) ||
    cleanTrackName(UI.discreet.checked ? generateDiscreetName() : originalTrackName()) ||
    "Cover"
  );
}

async function buildSegment() {
  if (!state.sample) {
    setStatus(UI.segmentStatus, "Analyse d'abord un échantillon.", "error");
    return;
  }
  const slow = state.mode === "slow";
  setBusy(true);
  setStatus(UI.segmentStatus, slow ? "Préparation du passage en WAV (ralenti)…" : "Encodage du passage en MP3…", "working");
  showProgress(true, slow ? "Préparation WAV…" : "Encodage MP3…", 0);
  try {
    const slice = copyBuffer(state.sample, state.segmentStart, state.segmentDuration);
    let bytes;
    if (slow) {
      bytes = encodeWav(slice);
      showProgress(true, "Préparation WAV…", 1);
    } else {
      bytes = await encodeMp3(slice, 192, (fraction) => {
        showProgress(true, "Encodage MP3…", fraction);
      });
    }
    state.segmentBytes = bytes;
    state.segmentMime = slow ? "audio/wav" : "audio/mpeg";
    if (!UI.trackName.value.trim()) refreshTrackName(true);
    const base = segmentFileBase();
    UI.trackName.value = base;
    state.segmentName = `${base}.${slow ? "wav" : "mp3"}`;
    if (state.segmentUrl) URL.revokeObjectURL(state.segmentUrl);
    state.segmentUrl = URL.createObjectURL(new Blob([bytes], { type: state.segmentMime }));
    UI.download.disabled = false;
    UI.sunoQueue.disabled = false;
    UI.sunoDownload.disabled = false;
    const size = (bytes.length / (1024 * 1024)).toFixed(1);
    setStatus(
      UI.segmentStatus,
      `Passage prêt : ${state.segmentName} (${size} Mo).`,
      "ok"
    );
    setStepState(UI.sourceState, "Passage prêt", "ok");
    updateLyricsButtons();
    saveDraft();
  } catch (error) {
    setStatus(UI.segmentStatus, error?.message || String(error), "error");
  } finally {
    showProgress(false);
    setBusy(false);
  }
}

function previewSegment() {
  if (!state.sample) return;
  const slice = copyBuffer(state.sample, state.segmentStart, state.segmentDuration);
  const wav = encodeWav(slice);
  const url = URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
  UI.audio.src = url;
  show(UI.audio, true);
  UI.stop.disabled = false;
  UI.audio.play().catch(() => {});
  UI.audio.onended = () => {
    UI.stop.disabled = true;
    UI.audio.pause();
  };
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}

/* ------------------------------------------------------------------ */
/* Draft persistence                                                  */
/* ------------------------------------------------------------------ */

const saveDraft = debounce(async () => {
  if (Date.now() < state.draftSuppressedUntil) return;
  try {
    await chrome.storage.local.set({
      ytcoverDraft: {
        url: UI.url.value,
        title: UI.title.value,
        artist: UI.artist.value,
        lyrics: UI.original.value,
        phonetic: UI.phonetic.value,
        sampleStart: UI.sampleStart.value,
        trackName: UI.trackName?.value || "",
        discreet: UI.discreet?.checked !== false,
        style: UI.styleInput?.value || "",
        stylePrompt: UI.stylePrompt?.value || "",
        key: UI.key?.value || "",
        chords: UI.chords?.value || "",
        chorded: UI.chorded?.value || "",
        chordsBase: UI.chordsBase?.value || "original",
        useChords: UI.useChords?.checked !== false,
        voice: state.voice || "",
        variants: [...state.variants],
        enabledProfiles: [...state.enabledProfiles],
        styleFidelity: UI.styleFidelity?.checked !== false,
        mode: state.mode,
      },
    });
  } catch (_) {}
}, 700);

async function restoreDraft() {
  try {
    const { ytcoverDraft } = await chrome.storage.local.get({ ytcoverDraft: null });
    if (!ytcoverDraft) return;
    UI.url.value = ytcoverDraft.url || "";
    UI.title.value = ytcoverDraft.title || "";
    UI.artist.value = ytcoverDraft.artist || "";
    UI.original.value = ytcoverDraft.lyrics || "";
    UI.phonetic.value = ytcoverDraft.phonetic || "";
    if (typeof ytcoverDraft.discreet === "boolean") UI.discreet.checked = ytcoverDraft.discreet;
    if (ytcoverDraft.trackName) {
      UI.trackName.value = ytcoverDraft.trackName;
      state.nameCustom = true;
    }
    if (ytcoverDraft.style) UI.styleInput.value = ytcoverDraft.style;
    if (ytcoverDraft.stylePrompt) {
      UI.stylePrompt.value = ytcoverDraft.stylePrompt;
      state.stylePrompt = ytcoverDraft.stylePrompt;
      setStepState(UI.styleState, "Brouillon", "");
    }
    if (ytcoverDraft.key) UI.key.value = ytcoverDraft.key;
    if (ytcoverDraft.chords) UI.chords.value = ytcoverDraft.chords;
    if (ytcoverDraft.chorded) UI.chorded.value = ytcoverDraft.chorded;
    if (ytcoverDraft.chordsBase) UI.chordsBase.value = ytcoverDraft.chordsBase;
    if (typeof ytcoverDraft.useChords === "boolean") UI.useChords.checked = ytcoverDraft.useChords;
    if (ytcoverDraft.voice) {
      state.voice = ytcoverDraft.voice;
      for (const button of UI.voiceToggle.querySelectorAll("[data-voice]")) {
        button.setAttribute("aria-pressed", String(button.dataset.voice === state.voice));
      }
    }
    if (Array.isArray(ytcoverDraft.variants)) {
      state.variants = new Set(ytcoverDraft.variants.filter((v) => VOICE_VARIANTS.includes(v)));
    }
    if (typeof ytcoverDraft.styleFidelity === "boolean") {
      UI.styleFidelity.checked = ytcoverDraft.styleFidelity;
    } else {
      state.enabledProfiles = new Set(["subtle", "instrumental"]);
      UI.styleFidelity.checked = true;
    }
    if (Array.isArray(ytcoverDraft.enabledProfiles)) {
      const valid = ytcoverDraft.enabledProfiles.filter((id) =>
        AUTO_PROFILES.some((profile) => profile.id === id && id !== "slow" && id !== "transparent")
      );
      if (valid.length && ytcoverDraft.styleFidelity !== undefined) {
        state.enabledProfiles = new Set(valid);
      }
    }
    if (ytcoverDraft.sampleStart) {
      const parsed = parseClock(ytcoverDraft.sampleStart);
      UI.sampleStart.value = formatClock(parsed ?? 0);
    }
    if (UI.original.value.trim()) {
      setSectionChips(structureLyrics(UI.original.value).sections);
      UI.lyricsSource.textContent = "Brouillon";
      setStepState(UI.lyricsState, "Brouillon", "");
    }
    if (ytcoverDraft.mode) {
      setMode(ytcoverDraft.mode, { persist: false, invalidate: false });
    }
    updateLyricsButtons();
  } catch (_) {}
}

/* ------------------------------------------------------------------ */
/* Events                                                             */
/* ------------------------------------------------------------------ */

UI.load.addEventListener("click", loadYouTube);
UI.url.addEventListener("keydown", (event) => {
  if (event.key === "Enter") loadYouTube();
});
UI.local.addEventListener("click", () => UI.file.click());
UI.file.addEventListener("change", () => {
  const file = UI.file.files?.[0];
  UI.file.value = "";
  if (file) loadLocalFile(file);
});
UI.clearCache.addEventListener("click", () => {
  if (state.autoRunning) {
    setStatus(UI.sourceStatus, "Attends la fin de l'upload automatique avant de supprimer le cache.", "error");
    return;
  }
  if (state.busy) {
    setStatus(UI.sourceStatus, "Attends la fin de l'opération en cours avant de supprimer le cache.", "error");
    return;
  }
  clearSongData({ clearUrl: true, clearFields: true, message: "Cache supprimé : tous les champs de la chanson ont été réinitialisés." });
});
UI.play.addEventListener("click", () => {
  if (state.tabId) chrome.tabs.update(state.tabId, { active: true }).catch(() => {});
});
UI.analyze.addEventListener("click", captureSample);
function normalizeSampleStart() {
  const parsed = parseClock(UI.sampleStart.value);
  if (parsed === null) {
    setStatus(UI.sourceStatus, "Format du début attendu : min:sec (ex. 1:45).", "error");
    return false;
  }
  UI.sampleStart.value = formatClock(parsed);
  return true;
}

UI.sampleStart.addEventListener("blur", normalizeSampleStart);
UI.sampleStart.addEventListener("change", normalizeSampleStart);
UI.sampleStart.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  if (normalizeSampleStart()) captureSample();
});
UI.analyze2.addEventListener("click", captureSample);
UI.scan2.addEventListener("click", captureSample);
UI.capture.addEventListener("click", buildSegment);

UI.start.addEventListener("input", () => {
  invalidateSegment();
  state.segmentStart = Number(UI.start.value) || 0;
  UI.startOut.value = formatTime(state.segmentStart, true);
  updateSegmentUI();
});
UI.bars.addEventListener("change", () => {
  invalidateSegment();
  state.bars = Number(UI.bars.value) || 8;
  updateSegmentUI();
});
UI.bpmInput.addEventListener("change", () => {
  const value = Number(UI.bpmInput.value);
  if (Number.isFinite(value) && value >= 40 && value <= 220) {
    invalidateSegment();
    state.bpm = value;
    updateTempoUI();
    updateSegmentUI();
  }
});
UI.snap.addEventListener("click", () => {
  if (!state.bpm) return;
  invalidateSegment();
  state.segmentStart = Math.max(
    0,
    Math.min(
      state.sample.duration - state.segmentDuration,
      snapToBeat(state.segmentStart, state.bpm, state.beatOffset)
    )
  );
  updateSegmentUI();
});
UI.preview.addEventListener("click", previewSegment);
UI.stop.addEventListener("click", () => {
  UI.audio.pause();
  UI.stop.disabled = true;
});
UI.download.addEventListener("click", () => {
  if (state.segmentBytes) downloadAudio(state.segmentBytes, state.segmentName, state.segmentMime || "audio/mpeg");
});

UI.search.addEventListener("click", () => searchLyrics());
UI.resultsClose.addEventListener("click", () => show(UI.results, false));
UI.original.addEventListener("input", () => {
  updateLyricsButtons();
  scheduleChordGrid();
  saveDraft();
});
UI.phonetic.addEventListener("input", () => {
  updateLyricsButtons();
  saveDraft();
});
UI.structure.addEventListener("click", structureCurrentLyrics);
UI.phoneticButton.addEventListener("click", phoneticLocal);
UI.aiButton.addEventListener("click", phoneticAI);
UI.copyPhonetic.addEventListener("click", async () => {
  await navigator.clipboard.writeText(UI.phonetic.value);
  setStatus(UI.lyricStatus, "Paroles phonétiques copiées.", "ok");
});
UI.sunoFill.addEventListener("click", fillSuno);
UI.sunoFill2.addEventListener("click", fillSuno);
UI.sunoOpen.addEventListener("click", async () => {
  await openCreateTab();
  setStepState(UI.sunoState, "Suno ouvert", "ok");
  setStatus(UI.sunoStatus, "Suno Create est ouvert dans un onglet.", "ok");
});
UI.sunoQueue.addEventListener("click", async () => {
  if (!state.segmentBytes) {
    setStatus(UI.sunoStatus, "Capture d'abord un passage.", "error");
    return;
  }
  setStatus(UI.sunoStatus, "Envoi vers le moteur d'upload…", "working");
  setBusy(true);
  try {
    const result = await sendAudioToQueue({
      bytes: state.segmentBytes,
      name: state.segmentName,
      mime: state.segmentMime || "audio/mpeg",
    });
    if (!result?.ok) throw new Error(result?.error || "Envoi impossible.");
    setStatus(
      UI.sunoStatus,
      "Passage ajouté au moteur d'upload. Le workflow automatique gère le START.",
      "ok"
    );
    setStepState(UI.sunoState, "Audio envoyé", "ok");
  } catch (error) {
    const copied = await copyLyricsToSunoTab(text);
    setStatus(
      UI.sunoStatus,
      `${error?.message || String(error)}${
        copied
          ? " Les paroles sont copiées dans le presse-papiers : colle-les avec Ctrl+V."
          : " Utilise « Copier la phonétique » puis colle dans Suno."
      }`,
      "error"
    );
    setStepState(UI.sunoState, "Erreur", "error");
  } finally {
    setBusy(false);
  }
});
UI.sunoDownload.addEventListener("click", () => {
  if (!state.segmentBytes) {
    setStatus(UI.sunoStatus, "Capture d'abord un passage.", "error");
    return;
  }
  downloadAudio(state.segmentBytes, state.segmentName, state.segmentMime || "audio/mpeg");
  setStatus(UI.sunoStatus, state.segmentMime === "audio/wav" ? "Extrait WAV téléchargé." : "Extrait MP3 téléchargé.", "ok");
});

UI.auto.addEventListener("click", runAutoWorkflow);

async function copyLyricsToSunoTab(text) {
  try {
    const tabs = await chrome.tabs.query({ url: ["https://suno.com/create*"] });
    const tab = tabs[0];
    if (!tab?.id) return false;
    const result = await chrome.tabs.sendMessage(tab.id, { type: "ct-copy-lyrics", text });
    return !!result?.ok;
  } catch (_) {
    return false;
  }
}

async function fillSuno() {
  const text = currentLyrics();
  if (!text) {
    setStatus(UI.sunoStatus, "Génère d'abord la phonétique + accords.", "error");
    return;
  }
  setStatus(UI.sunoStatus, "Injection des paroles dans Suno…", "working");
  setStepState(UI.sunoState, "Injection", "working");
  setBusy(true);
  try {
    const result = await fillLyricsInSuno(text);
    if (!result?.ok) throw new Error(result?.error || "Remplissage impossible.");
    setStatus(UI.sunoStatus, "Paroles injectées dans l'éditeur Suno.", "ok");
    setStepState(UI.sunoState, "Paroles prêtes", "ok");
  } catch (error) {
    setStatus(UI.sunoStatus, error?.message || String(error), "error");
    setStepState(UI.sunoState, "Erreur", "error");
  } finally {
    setBusy(false);
  }
}

const VOICE_VARIANTS = [
  "smooth", "raspy", "deep", "breathy", "airy", "powerful", "soft", "gritty",
  "husky", "warm", "bright", "soulful", "smoky", "falsetto", "baritone", "alto",
  "soprano", "whisper",
];

const STYLE_HINTS = [
  { re: /synth|wave|retro|80s|electro/i, add: "analog synths, gated drums, driving bass, neon atmosphere" },
  { re: /rock|metal|guitar|punk/i, add: "electric guitars, live drums, raw energy" },
  { re: /pop|dance|radio/i, add: "catchy hooks, polished production, modern pop" },
  { re: /hip.?hop|rap|trap/i, add: "boom bap drums, deep bass, sampled textures" },
  { re: /jazz|swing|bossa/i, add: "upright bass, brushed drums, warm piano" },
  { re: /classical|orchestral|cinematic|film/i, add: "strings, cinematic arrangement, wide dynamics" },
  { re: /lo.?fi|chill|study/i, add: "dusty vinyl, mellow keys, relaxed drums" },
  { re: /house|techno|club|edm/i, add: "four-on-the-floor, synth arpeggios, club mix" },
  { re: /r&b|soul|funk|groove/i, add: "smooth groove, warm keys, soulful performance" },
  { re: /country|folk|acoustic/i, add: "acoustic guitar, organic instrumentation, intimate" },
  { re: /ambient|dream|ethereal/i, add: "soft pads, spacious reverb, slow evolving textures" },
  { re: /reggae|dub|ska/i, add: "offbeat skank, deep bass, one-drop drums" },
];

function setStyleStatus(message, tone = "") {
  setStatus(UI.styleStatus, message, tone);
}

function renderVoiceVariants() {
  if (!UI.voiceVariants) return;
  UI.voiceVariants.replaceChildren();
  for (const variant of VOICE_VARIANTS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ytvariant";
    button.dataset.variant = variant;
    button.dataset.selected = String(state.variants.has(variant));
    button.textContent = variant;
    UI.voiceVariants.append(button);
  }
}

function renderVoiceSuggestions(list) {
  if (!UI.voiceSuggestions) return;
  UI.voiceSuggestions.replaceChildren();
  for (const variant of list) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ytvariant";
    button.dataset.variant = variant;
    button.dataset.suggestion = "true";
    button.textContent = `+ ${variant}`;
    UI.voiceSuggestions.append(button);
  }
}

function setVoice(voice) {
  state.voice = voice === "female" ? "female" : voice === "male" ? "male" : "";
  for (const button of UI.voiceToggle.querySelectorAll("[data-voice]")) {
    button.setAttribute("aria-pressed", String(button.dataset.voice === state.voice));
  }
  setStyleStatus(state.voice ? `Voix ${state.voice === "male" ? "masculine" : "féminine"} sélectionnée.` : "", "");
  saveDraft();
}

function toggleVariant(variant, force = null) {
  if (!VOICE_VARIANTS.includes(variant)) return;
  const selected = force === null ? !state.variants.has(variant) : !!force;
  if (selected) state.variants.add(variant);
  else state.variants.delete(variant);
  renderVoiceVariants();
  setStyleStatus(`${variant} ${selected ? "ajouté" : "retiré"}. Régénère le prompt pour l'intégrer.`, "");
  saveDraft();
}

function styleDescriptors(style) {
  const found = [];
  for (const hint of STYLE_HINTS) {
    if (hint.re.test(style)) found.push(hint.add);
  }
  if (!found.length) found.push("rich arrangement, dynamic production");
  return found;
}

function setMusicStatus(message, tone = "") {
  setStatus(UI.musicStatus, message, tone);
}

function musicSlug(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/\b(official|video|lyrics?|audio|clip|feat\.?|ft\.?|remaster(ed)?|version|hd|hq)\b/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeMusicKey(value) {
  return String(value ?? "")
    .replace(/♯/g, "#")
    .replace(/♭/g, "b")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\bminor\b/i, "minor")
    .replace(/\bmajor\b/i, "major");
}

function displayChordString(value) {
  const raw = String(value ?? "");
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch (_) {}
  return decoded
    .replace(/\+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .join(" – ");
}

async function fetchHooktheory(title, artist) {
  const titleSlug = musicSlug(title);
  const artistSlug = musicSlug(artist);
  if (!titleSlug || !artistSlug) return null;
  const url = `https://www.hooktheory.com/theorytab/view/${artistSlug}/${titleSlug}`;
  try {
    const response = await withTimeout(
      fetch(url, { credentials: "omit", headers: { accept: "text/html" } }),
      15000,
      "Hooktheory n'a pas répondu."
    );
    if (!response.ok) return { key: "", chords: "", url, error: `HTTP ${response.status}` };
    const text = await response.text();
    // The visible data is Next.js-rendered. The key is in the
    // /cheat-sheet/key/<root>/<quality> link, and the section progressions
    // are in the embedded "rel" fields.
    const keyLinks = [...text.matchAll(/\/cheat-sheet\/key\/([a-z-]+)\/(minor|major)/g)];
    const keyLink = keyLinks.find((match) => match[2] === "minor") || keyLinks[0];
    let key = "";
    if (keyLink) {
      const root = keyLink[1].split("-")[0].toUpperCase();
      const accidental = keyLink[1].includes("sharp") ? "#" : keyLink[1].includes("flat") ? "b" : "";
      key = `${root}${accidental} ${keyLink[2]}`;
    }
    if (!key) {
      const keyMatch = text.match(/Key\s*\[([^\]]+)\]/i);
      if (keyMatch) key = normalizeMusicKey(keyMatch[1]);
    }
    const unescaped = text
      .replace(/\\"/g, '"')
      .replace(/\\u0026/g, "&")
      .replace(/\\u003c/g, "<")
      .replace(/\\u003e/g, ">");
    const rels = [...unescaped.matchAll(/"rel":"([^"]+)"/g)]
      .map((match) => match[1].replace(/\\u0026/g, "&").trim())
      .filter(Boolean);
    let progression = rels.sort((a, b) => b.length - a.length)[0] || "";
    if (progression) {
      progression = progression
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 8)
        .join(" – ");
    }
    const sections = [...unescaped.matchAll(/"name":"([^"]+)"[^}]*?"rel":"([^"]+)"/g)]
      .map((match) => ({
        name: match[1].trim(),
        rel: match[2].trim(),
        tokens: match[2].trim().split(/\s+/).filter(Boolean),
      }))
      .filter((section, index, list) => section.tokens.length > 0 && list.findIndex((item) => item.name === section.name) === index);
    if (!progression) {
      const chordMatches = [...text.matchAll(/chordString=([A-Za-z0-9+%._-]+)/g)]
        .map((match) => displayChordString(match[1]))
        .filter(Boolean);
      const counts = new Map();
      for (const chords of chordMatches) counts.set(chords, (counts.get(chords) || 0) + 1);
      progression = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
    }
    return { key, chords: progression, sections, url };
  } catch (error) {
    return { key: "", chords: "", sections: [], url, error: error?.message || String(error) };
  }
}

async function fetchSongBpm(title, artist) {
  const titleSlug = musicSlug(title);
  const artistSlug = musicSlug(artist);
  if (!titleSlug || !artistSlug) return null;
  const url = `https://songbpm.com/@${artistSlug}/${titleSlug}`;
  try {
    const response = await withTimeout(
      fetch(url, { credentials: "omit", headers: { accept: "text/html" } }),
      12000,
      "SongBPM n'a pas répondu."
    );
    if (!response.ok) return { key: "", url, error: `HTTP ${response.status}` };
    const text = await response.text();
    const match = text.match(/with a\s+([A-G][#♯b♭]?)\s+key and a\s+(major|minor)\s+mode/i);
    return { key: match ? normalizeMusicKey(`${match[1]} ${match[2]}`) : "", url };
  } catch (error) {
    return { key: "", url, error: error?.message || String(error) };
  }
}

async function fetchMusicInfo({ silent = false } = {}) {
  if (state.musicBusy) return false;
  const title = UI.title.value.trim() || state.video?.title || "";
  const artist = UI.artist.value.trim() || state.video?.channel || "";
  if (!title) {
    if (!silent) setMusicStatus("Renseigne d'abord le titre de la chanson.", "error");
    return false;
  }
  state.musicBusy = true;
  if (UI.musicInfo) UI.musicInfo.disabled = true;
  setMusicStatus("Recherche de la tonalité et de la progression…", "working");
  try {
    const hook = await fetchHooktheory(title, artist);
    state.musicSections = hook?.sections || [];
    let key = hook?.key || "";
    let chords = hook?.chords || "";
    let source = key || chords ? "Hooktheory" : "";
    if (!key) {
      const bpm = await fetchSongBpm(title, artist);
      if (bpm?.key) {
        key = bpm.key;
        source = source ? `${source} + SongBPM` : "SongBPM";
      }
    }
    const currentKey = UI.key.value.trim();
    const currentChords = UI.chords.value.trim();
    if (key && (!silent || !currentKey)) UI.key.value = key;
    if (chords && (!silent || !currentChords)) UI.chords.value = chords;
    if (!key && !chords) {
      if (!silent) {
        setMusicStatus(
          "Tonalité/accords introuvables automatiquement. Corrige-les à la main (le prompt les utilisera).",
          "error"
        );
      }
      return false;
    }
    setMusicStatus(
      `Récupéré${source ? ` via ${source}` : ""} : ${UI.key.value || "tonalité ?"}${
        UI.chords.value ? ` · ${UI.chords.value}` : ""
      }. Progression en chiffres romains ; vérifie et corrige si besoin.`,
      "ok"
    );
    saveDraft();
    renderChordGrid();
    return true;
  } finally {
    state.musicBusy = false;
    if (UI.musicInfo) UI.musicInfo.disabled = false;
  }
}

async function ensureMusicInfo() {
  if (state.musicBusy) return;
  if (!UI.key.value.trim() || !UI.chords.value.trim()) {
    const title = UI.title.value.trim() || state.video?.title;
    if (title) await fetchMusicInfo({ silent: true });
  }
}

function chordTokens(value) {
  const text = String(value ?? "").trim();
  if (!text) return [];
  return text
    .split(/\s+(?:–|-|\||,)\s+|\s*[|,]\s*/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function sectionChordTokens(name) {
  const normalized = String(name ?? "")
    .replace(/^\[|\]$/g, "")
    .replace(/\s*\d+$/g, "")
    .trim()
    .toLowerCase();
  const section = state.musicSections.find((item) => {
    const sectionName = item.name.trim().toLowerCase();
    return sectionName === normalized || normalized.startsWith(sectionName) || sectionName.startsWith(normalized);
  });
  return section?.tokens?.length ? section.tokens : chordTokens(UI.chords.value);
}

function lyricBlocks() {
  const blocks = [];
  let current = { tag: "", lines: [] };
  for (const rawLine of UI.original.value.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const tag = line.match(/^\[([^\]]+)\]$/);
    if (tag) {
      if (current.tag || current.lines.length) blocks.push(current);
      current = { tag: tag[1], lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.tag || current.lines.length) blocks.push(current);
  return blocks;
}

const CHORD_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTE_PCS = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };

function romanDegree(roman) {
  const values = { I: 1, V: 5, X: 10 };
  const upper = String(roman ?? "").toUpperCase();
  let total = 0;
  for (let i = 0; i < upper.length; i += 1) {
    const value = values[upper[i]] || 0;
    const next = values[upper[i + 1]] || 0;
    total += value < next ? -value : value;
  }
  return total;
}

function keyInfo(key) {
  const match = String(key ?? "").match(/^([A-G])([#b]?)\s*(minor|major|dorian)?/i);
  if (!match) return null;
  const pc = NOTE_PCS[match[1].toUpperCase() + (match[2] || "")];
  if (!Number.isFinite(pc)) return null;
  const mode = (match[3] || "minor").toLowerCase();
  const scales = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
  };
  return { pc, mode, scale: scales[mode] || scales.minor };
}

function actualChord(token, key) {
  const text = String(token ?? "").trim();
  if (!text) return "";
  if (/^[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|°|o|\+|[0-9]|\/|\(|\))*$/i.test(text)) return text;
  const info = keyInfo(key);
  if (!info) return text;
  const match = text.match(/^([#b]?)([ivIV]+)([°o+]?)(\d*)(?:\/([#b]?[ivIV]+))?$/);
  if (!match) return text;
  const degree = romanDegree(match[2]);
  if (!degree || degree > 7) return text;
  const accidental = match[1] === "#" ? 1 : match[1] === "b" ? -1 : 0;
  const pc = (info.pc + info.scale[degree - 1] + accidental + 12) % 12;
  const lower = /^[iv]+$/.test(match[2]);
  const mark = match[3];
  const figure = match[4] || "";
  let quality = mark === "°" || mark === "o" ? "dim" : mark === "+" ? "aug" : lower ? "m" : "";
  if (/7|42|65|43/.test(figure)) {
    quality += quality === "m" ? "7" : quality === "dim" ? "7" : degree === 5 ? "7" : "maj7";
  }
  let chord = `${CHORD_NAMES[pc]}${quality}`;
  const inversion = figure === "42" ? 10 : figure === "65" ? 4 : figure === "43" ? 7 : null;
  if (inversion !== null) chord += `/${CHORD_NAMES[(pc + inversion) % 12]}`;
  return chord;
}

function actualChordLine(tokens, key) {
  return tokens
    .map((token) => actualChord(token, key))
    .filter(Boolean)
    .join(" - ");
}

function parseTextBlocks(text) {
  const blocks = [];
  let current = { tag: "", lines: [] };
  for (const rawLine of String(text ?? "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const tag = line.match(/^\[([^\]]+)\]$/);
    if (tag) {
      if (current.tag || current.lines.length) blocks.push(current);
      current = { tag: tag[1], lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.tag || current.lines.length) blocks.push(current);
  return blocks;
}

function blockTokensForLines(tokens, lineCount) {
  if (!tokens.length || lineCount <= 0) return [];
  return Array.from({ length: lineCount }, (_, index) => [tokens[index % tokens.length]]);
}

function stripChordAnnotations(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .filter((line) => !/^\[[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|\d|\/|\s*[-–]|\])/.test(line.trim()))
    .map((line) => line.replace(/^\[[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|\d|\/|\s*[-–]|\])\s*/, ""))
    .join("\n");
}

function looksPhonetic(text) {
  const clean = String(text ?? "");
  return /[A-Z]{2,}/.test(clean) || /[a-z]+-[a-z]+/i.test(clean);
}

async function buildChordedLyrics() {
  if (!UI.original.value.trim()) {
    setStatus(UI.chordStatus, "Ajoute d'abord des paroles.", "error");
    return "";
  }
  let phoneticText = UI.phonetic.value.trim();
  if (!phoneticText || !looksPhonetic(stripChordAnnotations(phoneticText))) {
    try {
      phoneticText = (await transcribe(UI.original.value)).trim();
    } catch (_) {
      phoneticText = "";
    }
  }
  if (!phoneticText) {
    setStatus(UI.chordStatus, "Impossible de générer la phonétique.", "error");
    return "";
  }
  const baseText = stripChordAnnotations(phoneticText).trim();
  const baseBlocks = parseTextBlocks(baseText);
  const blocks = lyricBlocks();
  const output = [];
  const key = UI.key.value.trim();
  for (const block of blocks) {
    const tokens = sectionChordTokens(block.tag);
    if (block.tag) output.push(`[${block.tag}]`);
    const summary = actualChordLine(tokens.slice(0, 8), key);
    if (summary) output.push(`[${summary}]`);
    const baseBlock = baseBlocks.find(
      (item) => item.tag === block.tag && item.lines.length === block.lines.length
    ) || baseBlocks[blocks.indexOf(block)];
    const perLine = blockTokensForLines(tokens, block.lines.length);
    block.lines.forEach((line, index) => {
      const lineTokens = perLine[index] || [];
      const text = baseBlock?.lines[index] || line;
      const chordPrefix = actualChordLine(lineTokens, key);
      output.push(chordPrefix ? `[${chordPrefix}] ${text}` : text);
    });
    output.push("");
  }
  const result = output.join("\n").trim();
  UI.phonetic.value = result;
  UI.chorded.value = result;
  updateLyricsButtons();
  setStatus(
    UI.chordedStatus,
    result ? "Phonétique + accords générée." : "Aucun accord disponible.",
    result ? "ok" : "error"
  );
  setStatus(UI.lyricStatus, result ? "Phonétique + accords disponibles dans la zone phonétique." : "", result ? "ok" : "error");
  if (UI.lyricStatus) setStepState(UI.lyricsState, result ? "Accords" : "Sans accords", result ? "ok" : "");
  saveDraft();
  return result;
}

function currentLyrics() {
  return UI.phonetic.value.trim();
}

function hasChordAnnotations() {
  return /\[[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|\d|\/|\s|-)/.test(UI.phonetic.value);
}

function hasPhoneticChords() {
  return hasChordAnnotations() && looksPhonetic(stripChordAnnotations(UI.phonetic.value));
}

function renderChordGrid() {
  if (!UI.chordGrid) return;
  UI.chordGrid.replaceChildren();
  state.chordRows = [];
  const blocks = lyricBlocks();
  const hasChords = chordTokens(UI.chords.value).length > 0 || state.musicSections.length > 0;
  if (!blocks.length || !hasChords) {
    const empty = document.createElement("p");
    empty.className = "ytchord-empty";
    empty.textContent = !blocks.length
      ? "Ajoute des paroles pour afficher les accords phrase par phrase."
      : "Cherche la tonalité et les accords, ou saisis une progression.";
    UI.chordGrid.append(empty);
    if (UI.chordsState) setStepState(UI.chordsState, "En attente", "");
    setStatus(UI.chordStatus, "", "");
    return;
  }
  let lineCount = 0;
  for (const block of blocks) {
    const tokens = sectionChordTokens(block.tag);
    if (!tokens.length) continue;
    const section = document.createElement("div");
    section.className = "ytchord-section";
    if (block.tag) {
      const head = document.createElement("div");
      head.className = "ytchord-section-head";
      head.textContent = `[${block.tag}]`;
      section.append(head);
    }
    block.lines.forEach((line, index) => {
      const chords = [tokens[index % tokens.length]];
      if (!chords.length) return;
      const row = document.createElement("div");
      row.className = "ytchord-row";
      const displayChords = chords.map((token) => actualChord(token, UI.key.value));
      const chordEl = document.createElement("span");
      chordEl.className = "ytchord-chords";
      chordEl.textContent = displayChords.join(" – ");
      const textEl = document.createElement("span");
      textEl.className = "ytchord-text";
      textEl.textContent = line;
      row.append(chordEl, textEl);
      section.append(row);
      state.chordRows.push({
        tag: block.tag,
        chords: displayChords.join(" – "),
        tokens: chords,
        line,
      });
      lineCount += 1;
    });
    if (section.querySelector(".ytchord-row")) UI.chordGrid.append(section);
  }
  if (lineCount) {
    if (UI.chordsState) setStepState(UI.chordsState, "Prête", "ok");
    setStatus(UI.chordStatus, `${lineCount} phrase(s) avec accords. Répartition indicative.`, "ok");
  } else {
    if (UI.chordsState) setStepState(UI.chordsState, "Sans accords", "");
    setStatus(UI.chordStatus, "Aucune correspondance entre les sections et les paroles.", "error");
  }
}

let chordGridTimer = null;
function scheduleChordGrid() {
  clearTimeout(chordGridTimer);
  chordGridTimer = setTimeout(renderChordGrid, 180);
}

async function copyChordGrid() {
  if (!state.chordRows.length) {
    setStatus(UI.chordStatus, "Aucune grille à copier.", "error");
    return;
  }
  let currentTag = "";
  const lines = [];
  for (const row of state.chordRows) {
    if (row.tag && row.tag !== currentTag) {
      currentTag = row.tag;
      lines.push(`[${currentTag}]`);
    }
    lines.push(`${row.chords} | ${row.line}`);
  }
  try {
    await navigator.clipboard.writeText(lines.join("\n"));
    setStatus(UI.chordStatus, "Grille d'accords copiée.", "ok");
  } catch (_) {
    setStatus(UI.chordStatus, "Copie impossible.", "error");
  }
}

function setStemsStatus(message, tone = "") {
  setStatus(UI.stemsStatus, message, tone);
}

async function fetchSunoClips() {
  if (!UI.sunoList || UI.sunoList.disabled) return;
  UI.sunoList.disabled = true;
  setStatus(UI.sunoStatus, "Récupération de tes derniers morceaux Suno…", "working");
  try {
    const response = await withTimeout(
      chrome.runtime.sendMessage({ type: "ct-suno-clips" }),
      25000,
      "Suno n'a pas répondu."
    );
    if (!response?.ok) throw new Error(response?.error || "Récupération impossible.");
    const clips = Array.isArray(response.clips) ? response.clips : [];
    UI.sunoClip.replaceChildren();
    for (const clip of clips) {
      const option = document.createElement("option");
      option.value = clip.id;
      option.textContent = `${clip.title || clip.id}${
        Number.isFinite(clip.durationSec) ? ` · ${formatTime(clip.durationSec)}` : ""
      }`;
      UI.sunoClip.append(option);
    }
    UI.sunoClip.hidden = clips.length === 0;
    UI.sunoUse.hidden = clips.length === 0;
    if (!clips.length) {
      setStatus(UI.sunoStatus, "Aucun morceau Suno trouvé. Tu peux importer le fichier téléchargé.", "error");
    } else {
      setStatus(
        UI.sunoStatus,
        `${clips.length} morceau(x) récupéré(s). Choisis celui à séparer, ou n'en sépare aucun.`,
        "ok"
      );
    }
  } catch (error) {
    setStatus(UI.sunoStatus, error?.message || String(error), "error");
  } finally {
    UI.sunoList.disabled = false;
  }
}

async function useSunoClip() {
  const clipId = UI.sunoClip.value;
  if (!clipId) {
    setStatus(UI.sunoStatus, "Choisis d'abord un morceau Suno.", "error");
    return;
  }
  UI.sunoUse.disabled = true;
  setStatus(UI.sunoStatus, "Récupération de l'audio du morceau Suno…", "working");
  try {
    const response = await withTimeout(
      chrome.runtime.sendMessage({ type: "ct-suno-clip-audio", clipId }),
      25000,
      "Suno n'a pas répondu."
    );
    if (!response?.ok || !response.audioUrl) {
      throw new Error(response?.error || "Audio Suno introuvable.");
    }
    const audio = await withTimeout(
      fetch(response.audioUrl, { credentials: "omit" }),
      45000,
      "Téléchargement de l'audio Suno trop long."
    );
    if (!audio.ok) throw new Error(`Téléchargement audio refusé (${audio.status}).`);
    const bytes = new Uint8Array(await audio.arrayBuffer());
    const buffer = await decodeAudioBytes(
      bytes,
      audio.headers.get("content-type") || "audio/mpeg"
    );
    state.stemGeneratedBuffer = buffer;
    state.stemGeneratedName = `${response.title || clipId}.mp3`;
    UI.stemSource.value = "generated";
    UI.stemFileName.textContent = `${state.stemGeneratedName} · ${formatTime(buffer.duration)}`;
    setStemsStatus("Morceau Suno prêt. Tu peux le séparer, ou ne rien séparer.", "ok");
    if (UI.stemsState) setStepState(UI.stemsState, "Prêt", "ok");
    setStatus(UI.sunoStatus, "Morceau Suno chargé pour la séparation locale.", "ok");
  } catch (error) {
    setStatus(UI.sunoStatus, error?.message || String(error), "error");
    setStemsStatus("Récupération Suno impossible : importe le fichier téléchargé.", "error");
  } finally {
    UI.sunoUse.disabled = false;
  }
}

function stemSourceChannels() {
  if (UI.stemSource.value === "generated") {
    const buffer = state.stemGeneratedBuffer;
    if (!buffer) return null;
    return {
      channels: Array.from(
        { length: buffer.numberOfChannels },
        (_, index) => buffer.getChannelData(index).slice()
      ),
      sampleRate: buffer.sampleRate,
    };
  }
  if (!state.sample) return null;
  const start = Math.max(0, Math.min(state.segmentStart || 0, state.sample.duration));
  const duration = Math.max(
    1,
    Math.min(state.segmentDuration || state.sample.duration, state.sample.duration - start)
  );
  const slice = copyBuffer(state.sample, start, duration);
  const channels = Array.from(
    { length: slice.numberOfChannels },
    (_, index) => slice.getChannelData(index).slice()
  );
  return { channels, sampleRate: slice.sampleRate };
}

async function importGeneratedStemFile(file) {
  if (!file) return;
  setStemsStatus("Décodage du morceau généré…", "working");
  if (UI.stemsState) setStepState(UI.stemsState, "Décodage", "working");
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const buffer = await decodeAudioBytes(bytes, file.type || "audio/mpeg");
    state.stemGeneratedBuffer = buffer;
    state.stemGeneratedName = file.name;
    UI.stemSource.value = "generated";
    UI.stemFileName.textContent = `${file.name} · ${formatTime(buffer.duration)}`;
    if (UI.stemsRun) UI.stemsRun.disabled = false;
    setStemsStatus("Morceau généré importé. Lance la séparation des stems.", "ok");
    if (UI.stemsState) setStepState(UI.stemsState, "Prêt", "ok");
  } catch (error) {
    state.stemGeneratedBuffer = null;
    state.stemGeneratedName = "";
    UI.stemFileName.textContent = "";
    setStemsStatus(error?.message || String(error), "error");
    if (UI.stemsState) setStepState(UI.stemsState, "Erreur", "error");
  }
}

function ensureStemWorker() {
  if (state.stemWorker) return state.stemWorker;
  const worker = new Worker(chrome.runtime.getURL("src/anonymize/worker.js"), { type: "module" });
  worker.onmessage = (event) => handleStemWorkerMessage(event.data);
  worker.onerror = (event) => {
    state.stemsBusy = false;
    if (UI.stemsRun) UI.stemsRun.disabled = false;
    setStemsStatus(event.message || "Le worker de séparation a échoué.", "error");
    if (UI.stemsState) setStepState(UI.stemsState, "Erreur", "error");
  };
  state.stemWorker = worker;
  return worker;
}

function handleStemWorkerMessage(message) {
  if (!message || message.id !== state.stemRequestId) return;
  if (message.type === "progress") {
    const progress = message.progress || {};
    if (progress.phase === "loadingModel") {
      const fraction = Number.isFinite(progress.fraction) ? progress.fraction : 0;
      setStemsStatus(`Chargement du modèle Demucs… ${Math.round(fraction * 100)} %`, "working");
    } else if (progress.phase === "separating") {
      const fraction = Number.isFinite(progress.fraction) ? progress.fraction : 0;
      setStemsStatus(
        `Séparation des stems… ${progress.chunkIndex || 0}/${progress.chunkCount || "?"} (${Math.round(fraction * 100)} %)`,
        "working"
      );
    }
    return;
  }
  if (message.type === "complete") {
    state.stems = (message.result?.stems || []).map((stem) => ({
      key: stem.key,
      name: stem.name,
      bytes: stem.bytes instanceof Uint8Array ? stem.bytes : new Uint8Array(stem.bytes),
    }));
    state.stemsBusy = false;
    if (UI.stemsRun) UI.stemsRun.disabled = false;
    renderStems();
    if (state.stems.length) {
      setStemsStatus(`${state.stems.length} stem(s) prêt(s). Choisis le mode puis télécharge le ZIP.`, "ok");
      if (UI.stemsState) setStepState(UI.stemsState, "Prêts", "ok");
      if (UI.stemsDownload) UI.stemsDownload.disabled = false;
    } else {
      setStemsStatus("Aucun stem produit.", "error");
      if (UI.stemsState) setStepState(UI.stemsState, "Erreur", "error");
    }
    return;
  }
  if (message.type === "error") {
    state.stemsBusy = false;
    if (UI.stemsRun) UI.stemsRun.disabled = false;
    setStemsStatus(message.error?.message || "Séparation impossible.", "error");
    if (UI.stemsState) setStepState(UI.stemsState, "Erreur", "error");
  }
}

function renderStems() {
  if (!UI.stemList) return;
  UI.stemList.replaceChildren();
  for (const stem of state.stems) {
    const item = document.createElement("div");
    item.className = "ytstem-item";
    const label = document.createElement("strong");
    label.textContent = stem.name;
    const size = document.createElement("span");
    size.textContent = `${(stem.bytes.length / (1024 * 1024)).toFixed(1)} Mo`;
    item.append(label, size);
    UI.stemList.append(item);
  }
}

function separateStems() {
  if (state.stemsBusy) return;
  if (UI.stemSource.value === "generated" && !state.stemGeneratedBuffer) {
    setStemsStatus("Importe d'abord le morceau généré téléchargé depuis Suno.", "error");
    return;
  }
  if (UI.stemSource.value !== "generated" && !state.sample) {
    setStemsStatus("Scanne d'abord la vidéo ou importe un morceau.", "error");
    return;
  }
  const source = stemSourceChannels();
  if (!source) {
    setStemsStatus("Impossible de préparer la source pour la séparation.", "error");
    return;
  }
  state.stemsBusy = true;
  state.stems = [];
  state.stemRequestId += 1;
  const requestId = state.stemRequestId;
  if (UI.stemsRun) UI.stemsRun.disabled = true;
  if (UI.stemsDownload) UI.stemsDownload.disabled = true;
  if (UI.stemList) UI.stemList.replaceChildren();
  setStemsStatus("Préparation des stems de l'extrait…", "working");
  if (UI.stemsState) setStepState(UI.stemsState, "Séparation", "working");
  const worker = ensureStemWorker();
  const buffers = source.channels.map((channel) => channel.buffer);
  worker.postMessage(
    {
      id: requestId,
      task: "stems",
      params: {
        name: cleanTrackName(UI.trackName.value) || "extrait",
        channels: source.channels,
        sampleRate: source.sampleRate,
      },
    },
    buffers
  );
  setStemsStatus("Modèle Demucs en cours de chargement…", "working");
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeZip(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const bytes = file.bytes;
    const crc = crc32(bytes);
    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, bytes.length, true);
    localView.setUint32(22, bytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    localParts.push(local, bytes);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, bytes.length, true);
    centralView.setUint32(24, bytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centralParts.push(central);

    offset += local.length + bytes.length;
  }
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);
  const total = localParts.reduce((sum, part) => sum + part.length, 0) + centralSize + end.length;
  const output = new Uint8Array(total);
  let position = 0;
  for (const part of [...localParts, ...centralParts, end]) {
    output.set(part, position);
    position += part.length;
  }
  return output;
}

function downloadStems() {
  if (!state.stems.length) {
    setStemsStatus("Sépare d'abord les stems.", "error");
    return;
  }
  const mode = UI.stemScope.value;
  const wanted = mode === "all"
    ? ["instrumental", "vocals", "drums", "bass", "other"]
    : ["instrumental", "vocals"];
  const base = UI.stemSource.value === "generated" && state.stemGeneratedName
    ? cleanTrackName(state.stemGeneratedName.replace(/\.[^.]+$/, "")) || "morceau-genere"
    : cleanTrackName(UI.trackName.value) || "extrait";
  const files = state.stems
    .filter((stem) => wanted.includes(stem.key))
    .map((stem) => ({ name: `${base} - ${stem.name}.wav`, bytes: stem.bytes }));
  if (!files.length) {
    setStemsStatus("Aucun stem sélectionné.", "error");
    return;
  }
  const zip = makeZip(files);
  downloadAudio(zip, `${base} - stems.zip`, "application/zip");
  setStemsStatus(`ZIP de ${files.length} stem(s) téléchargé.`, "ok");
}

function localStylePrompt(style) {
  const voice = state.voice ? `${state.voice} vocals` : "";
  const variants = [...state.variants].join(", ");
  const chords = UI.chords?.value.trim() || "";
  const fidelity = UI.styleFidelity?.checked !== false;
  const slow = state.mode === "slow";
  if (fidelity) {
    const parts = [
      slow
        ? "slowed 50% cover of the uploaded song"
        : "cover of the uploaded song",
      "preserve the original melody, vocal phrasing and chord progression",
      chords ? `chord progression ${chords}` : "",
      `production direction: ${style}`,
      ...styleDescriptors(style),
      voice,
      variants,
      "professional production",
      "clear mix",
    ];
    return [...new Set(parts.map((part) => String(part).trim()).filter(Boolean))].join(", ");
  }
  const harmony = [chords ? `chord progression ${chords}` : ""];
  const parts = [
    style,
    ...styleDescriptors(style),
    ...harmony,
    voice,
    variants,
    "professional production",
    "clear mix",
  ];
  return [...new Set(parts.map((part) => String(part).trim()).filter(Boolean))].join(", ");
}

async function callStyleAi(system, user, maxTokens = 320) {
  try {
    const config = await readSongwriterConfig();
    if (!config) return "";
    const response = await withTimeout(
      fetch(config.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: config.model,
          temperature: 0.5,
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      }),
      45000,
      "Le modèle de style n'a pas répondu."
    );
    if (!response.ok) return "";
    const data = await response.json();
    let text = data?.choices?.[0]?.message?.content;
    if (Array.isArray(text)) text = text.map((part) => part?.text ?? "").join("");
    return String(text ?? "").replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/i, "").trim();
  } catch (_) {
    return "";
  }
}

async function generateStylePrompt() {
  const style = UI.styleInput.value.trim();
  if (!style) {
    setStyleStatus("Renseigne d'abord un style (ex. dark synthwave, voix féminine).", "error");
    setStepState(UI.styleState, "Style requis", "error");
    return "";
  }
  await ensureMusicInfo();
  setBusy(true);
  setStyleStatus("Génération du prompt de style…", "working");
  setStepState(UI.styleState, "Génération", "working");
  try {
    const voice = state.voice ? `${state.voice} vocal` : "vocal";
    const variants = [...state.variants].join(", ");
    const ai = await callStyleAi(
      "You are a music producer. Write one concise Suno style prompt as a comma-separated list. Include genre, mood, instrumentation, production and vocal description. If cover intent is requested, state that it is a cover and preserve the original melody, vocal phrasing and chord progression; the style is only a production direction. Never include any artist name, song title, key, tempo, BPM, or the word 'faithful': Suno rejects them or replaces the prompt. Say 'the uploaded song' instead. If a chord progression is provided, include it as musical reference. Return only the prompt, no explanation, no lyrics, under 70 words.",
      `Style: ${style}\nIntent: ${UI.styleFidelity.checked ? "cover, preserve melody, vocal phrasing and chords" : "free transformation"}\nChord progression: ${UI.chords.value.trim() || "unknown"}\nVoice: ${voice}\nVariants: ${variants || "none"}`,
      320
    );
    const prompt = ai || localStylePrompt(style);
    UI.stylePrompt.value = prompt;
    state.stylePrompt = prompt;
    setStyleStatus(ai ? "Prompt de style généré par l'IA." : "Prompt de style généré localement.", "ok");
    setStepState(UI.styleState, "Prompt prêt", "ok");
    saveDraft();
    return prompt;
  } finally {
    setBusy(false);
  }
}

function localVoiceSuggestions() {
  const style = UI.styleInput.value.toLowerCase();
  const female = state.voice === "female";
  let pool = female
    ? ["airy", "breathy", "soulful", "powerful", "soft", "husky", "bright", "falsetto"]
    : ["smooth", "raspy", "deep", "breathy", "gritty", "powerful", "warm", "baritone"];
  if (/rock|metal|punk/.test(style)) pool = ["raspy", "gritty", "powerful", "raw", "deep", "husky"];
  else if (/r&b|soul|funk/.test(style)) pool = ["smooth", "soulful", "warm", "husky", "breathy", "soft"];
  else if (/pop|dance/.test(style)) pool = ["bright", "powerful", "smooth", "airy", "confident", "warm"];
  else if (/ambient|dream|ethereal/.test(style)) pool = ["airy", "breathy", "soft", "whisper", "ethereal", "distant"];
  else if (/hip.?hop|rap|trap/.test(style)) pool = ["deep", "gritty", "confident", "raspy", "smooth", "punchy"];
  const unique = [...new Set(pool)].filter((variant) => !state.variants.has(variant));
  return unique.slice(0, 6);
}

async function suggestVoiceVariants() {
  setBusy(true);
  setStyleStatus("Recherche de variantes adaptées…", "working");
  try {
    const style = UI.styleInput.value.trim();
    const voice = state.voice || "male";
    const selected = [...state.variants].join(", ");
    const ai = await callStyleAi(
      "You suggest short voice-timbre descriptors for a singer. Return only 6 descriptors, comma-separated, one or two words each. No explanation.",
      `Style: ${style || "unknown"}\nVoice: ${voice}\nAlready selected: ${selected || "none"}`,
      120
    );
    let suggestions = ai
      ? ai.split(/[,;\n]/).map((item) => item.replace(/^[-*\d.\s]+/, "").trim().toLowerCase()).filter(Boolean)
      : [];
    suggestions = [...new Set(suggestions.filter((item) => item.length > 1 && item.length < 24))];
    if (!suggestions.length) suggestions = localVoiceSuggestions();
    renderVoiceSuggestions(suggestions.slice(0, 8));
    setStyleStatus(
      suggestions.length
        ? "Variantes proposées ci-dessous. Clique pour les ajouter."
        : "Aucune suggestion : choisis dans la liste des variantes.",
      "ok"
    );
  } finally {
    setBusy(false);
  }
}

async function copyStylePrompt() {
  const text = UI.stylePrompt.value.trim();
  if (!text) {
    setStyleStatus("Génère d'abord un prompt de style.", "error");
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    setStyleStatus("Prompt de style copié.", "ok");
    return true;
  } catch (_) {
    setStyleStatus("Copie impossible. Sélectionne le prompt et copie-le à la main.", "error");
    return false;
  }
}

async function runValidationWorkflow() {
  if (state.autoRunning || state.busy) return;
  if (!state.sample) {
    setStatus(UI.validateStatus, "Scanne d'abord la vidéo ou importe un morceau.", "error");
    return;
  }
  setStepState(UI.cutState, "Validation", "working");
  setStatus(UI.validateStatus, "Préparation de l'extrait…", "working");
  setBusy(true);
  try {
    if (!state.segmentBytes) {
      setBusy(false);
      await buildSegment();
      if (!state.segmentBytes) {
        setStatus(UI.validateStatus, "L'extrait n'a pas pu être préparé.", "error");
        setStepState(UI.cutState, "Erreur", "error");
        return;
      }
      setBusy(true);
    }
    if (!UI.stylePrompt.value.trim()) {
      await generateStylePrompt();
    }
    if (!UI.stylePrompt.value.trim()) {
      setStatus(UI.validateStatus, "Renseigne un style puis génère le prompt de style.", "error");
      setStepState(UI.cutState, "Style requis", "error");
      return;
    }
    if (!UI.phonetic.value.trim()) {
      if (!UI.original.value.trim()) {
        await searchLyrics(true);
      }
      if (UI.original.value.trim() && !UI.phonetic.value.trim()) {
        await phoneticLocal();
      }
    }
    if (!hasPhoneticChords() && (UI.key.value.trim() || UI.chords.value.trim() || state.musicSections.length)) {
      await buildChordedLyrics();
    }
    const lyrics = currentLyrics();
    if (!lyrics) {
      setStatus(UI.validateStatus, "Génère d'abord la phonétique + accords.", "error");
      setStepState(UI.cutState, "Erreur", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(lyrics);
      await navigator.clipboard.writeText(UI.stylePrompt.value.trim());
      setStatus(UI.validateStatus, "Extrait validé. Paroles copiées, puis prompt de style copié (le presse-papiers contient le prompt).", "ok");
    } catch (_) {
      setStatus(UI.validateStatus, "Extrait validé. Copie manuelle nécessaire pour les paroles ou le style.", "ok");
    }
    setStepState(UI.cutState, "Validé", "ok");
    setBusy(false);
    await runAutoWorkflow();
  } finally {
    setBusy(false);
  }
}

async function runAutoWorkflow() {
  if (state.autoRunning || state.busy) return;
  if (!hasPhoneticChords() && (UI.key.value.trim() || UI.chords.value.trim() || state.musicSections.length)) {
    await buildChordedLyrics();
  }
  const text = currentLyrics();
  const style = UI.stylePrompt.value.trim();
  if (!state.segmentBytes) {
    setAutoStatus("Capture d'abord un passage.", "error");
    return;
  }
  if (!text) {
    setAutoStatus("Génère d'abord la phonétique + accords.", "error");
    return;
  }
  if (!style) {
    setAutoStatus("Génère d'abord le prompt de style à l'étape 2.", "error");
    return;
  }
  const requestId =
    (globalThis.crypto?.randomUUID && crypto.randomUUID()) ||
    `auto-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  state.autoRunning = true;
  state.autoRequestId = requestId;
  state.autoFailures = [];
  resetTestedSamples();
  renderAutoProfiles();
  setAutoStatus(
    state.mode === "slow"
      ? "Test du ralenti 50 %, sans ouvrir Suno avant acceptation…"
      : state.mode === "transparent"
        ? "Test du mode transparent, sans ouvrir Suno avant acceptation…"
        : "Test de la dégradation, sans ouvrir Suno avant acceptation…",
    "working"
  );
  setStepState(UI.sunoState, "Auto", "working");
  updateAutoButton();
  setBusy(true);
  try {
    const selectedProfiles = profilesForAuto();
    if (!selectedProfiles.length) {
      throw new Error("Aucun mode de traitement sélectionné.");
    }
    const started = await startAutoUpload({
      bytes: state.segmentBytes,
      name: state.segmentName,
      mime: state.segmentMime || "audio/mpeg",
      profiles: selectedProfiles,
      requestId,
    });
    if (!started?.ok) throw new Error(started?.error || "Le moteur d'upload intégré n'a pas accepté l'upload.");
    const selectedLabels = selectedProfiles.map(
      (id) => AUTO_PROFILES.find((profile) => profile.id === id)?.label || id
    );
    setAutoStatus(
      `Upload lancé : ${selectedLabels.join(" → ")}. Aucune fenêtre Suno ne s'ouvre avant acceptation.`,
      "working"
    );
    // Safety net if the embedded engine stops reporting.
    setTimeout(() => {
      if (state.autoRunning && state.autoRequestId === requestId) {
        finishAuto("Le moteur d'upload intégré n'a plus répondu. Recharge Cover Studio.", "error");
      }
    }, 30 * 60 * 1000);
  } catch (error) {
    state.autoRunning = false;
    state.autoRequestId = null;
    setAutoStatus(error?.message || String(error), "error");
    setStepState(UI.sunoState, "Erreur", "error");
    updateAutoButton();
  } finally {
    setBusy(false);
    updateAutoButton();
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "ct-yt-progress") {
    if (!state.captureProgress) return;
    showProgress(true, message.message || "Capture…", message.fraction ?? 0);
    return;
  }
  if (message?.type === "ct-auto-progress" && message.requestId && message.requestId === state.autoRequestId) {
    handleAutoProgress(message);
  }
});

UI.title.addEventListener("input", () => {
  suggestMetadata();
  if (!state.nameCustom) refreshTrackName(false);
  saveDraft();
});
UI.discreet.addEventListener("change", () => {
  state.nameCustom = false;
  refreshTrackName(true);
  saveDraft();
});
UI.trackName.addEventListener("input", () => {
  state.nameCustom = true;
  syncSegmentName();
  saveDraft();
});
UI.nameRegen.addEventListener("click", () => {
  state.nameCustom = false;
  UI.discreet.checked = true;
  refreshTrackName(true);
  saveDraft();
});

UI.styleGenerate.addEventListener("click", () => generateStylePrompt());
UI.styleCopy.addEventListener("click", () => copyStylePrompt());
UI.styleFidelity.addEventListener("change", () => saveDraft());
UI.stylePrompt.addEventListener("input", () => {
  state.stylePrompt = UI.stylePrompt.value;
  saveDraft();
});
UI.styleInput.addEventListener("input", () => {
  setStyleStatus("", "");
  saveDraft();
});
UI.musicInfo.addEventListener("click", () => fetchMusicInfo());
UI.buildChords.addEventListener("click", () => buildChordedLyrics());
UI.phoneticChords.addEventListener("click", () => buildChordedLyrics());
UI.copyChords.addEventListener("click", async () => {
  const text = UI.chorded.value.trim();
  if (!text) {
    setStatus(UI.chordedStatus, "Génère d'abord les paroles avec accords.", "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    setStatus(UI.chordedStatus, "Paroles avec accords copiées.", "ok");
  } catch (_) {
    setStatus(UI.chordedStatus, "Copie impossible.", "error");
  }
});
UI.sunoChords.addEventListener("click", () => fillSuno());
UI.chordsBase.addEventListener("change", () => saveDraft());
UI.useChords.addEventListener("change", () => saveDraft());
UI.stemsRun.addEventListener("click", () => separateStems());
UI.stemImport.addEventListener("click", () => UI.stemFile.click());
UI.sunoList.addEventListener("click", () => fetchSunoClips());
UI.sunoUse.addEventListener("click", () => useSunoClip());
UI.stemFile.addEventListener("change", () => {
  const file = UI.stemFile.files?.[0];
  if (file) importGeneratedStemFile(file);
  UI.stemFile.value = "";
});
UI.stemSource.addEventListener("change", () => {
  if (UI.stemSource.value === "generated" && !state.stemGeneratedBuffer) {
    setStemsStatus("Importe le morceau généré, ou choisis l'extrait source.", "working");
  } else {
    setStemsStatus("", "");
  }
});
UI.stemsDownload.addEventListener("click", () => downloadStems());
UI.key.addEventListener("input", () => {
  setMusicStatus("", "");
  scheduleChordGrid();
  saveDraft();
});
UI.chords.addEventListener("input", () => {
  setMusicStatus("", "");
  scheduleChordGrid();
  saveDraft();
});
UI.voiceToggle.addEventListener("click", (event) => {
  const button = event.target.closest("[data-voice]");
  if (button) setVoice(button.dataset.voice);
});
UI.voiceSuggest.addEventListener("click", () => suggestVoiceVariants());
UI.voiceVariants.addEventListener("click", (event) => {
  const button = event.target.closest("[data-variant]");
  if (button) toggleVariant(button.dataset.variant);
});
UI.voiceSuggestions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-variant]");
  if (button) toggleVariant(button.dataset.variant, true);
});
UI.validate.addEventListener("click", runValidationWorkflow);
UI.downloadProcessed.addEventListener("click", downloadWinningSample);
UI.downloadTested.addEventListener("click", () => downloadTestedSample());
UI.allowOriginal.addEventListener("change", () => {
  renderAutoProfiles();
  saveDraft();
});
UI.modeToggle.addEventListener("click", (event) => {
  const button = event.target.closest("[data-mode]");
  if (button) setMode(button.dataset.mode);
});
UI.artist.addEventListener("input", saveDraft);

if (typeof ResizeObserver === "function") {
  new ResizeObserver(() => drawWave()).observe(UI.wave);
}
window.addEventListener("resize", drawWave);

/* ------------------------------------------------------------------ */
/* Boot                                                               */
/* ------------------------------------------------------------------ */

(async () => {
  await restoreDraft();
  setMode(state.mode, { persist: false, invalidate: false });
  renderChordGrid();
  if (!UI.trackName.value.trim()) refreshTrackName(true);
  renderVoiceVariants();
  renderVoiceSuggestions([]);
  renderAutoProfiles();
  updateLyricsButtons();
  UI.sunoQueue.disabled = true;
  UI.sunoDownload.disabled = true;
  UI.download.disabled = true;
  UI.capture.disabled = true;
  setStatus(
    UI.sourceStatus,
    "Colle une URL YouTube puis clique sur « Charger la vidéo ». Tu peux aussi importer un fichier audio local.",
    ""
  );
  drawWave();
  const current = await chrome.tabs.getCurrent().catch(() => null);
  state.coverTabId = current?.id ?? null;
})();
