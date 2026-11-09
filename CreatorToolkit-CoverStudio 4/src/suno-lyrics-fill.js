(() => {
  "use strict";

  const VERSION = "3.4.2";
  if (window.__ctSunoBridgeV342) return;
  window.__ctSunoBridgeV342 = true;

  const CANDIDATE_SELECTOR = [
    "textarea",
    '[contenteditable="true"]',
    '[contenteditable=""]',
    '[role="textbox"]',
    ".cm-content",
    ".ProseMirror",
    '[data-lexical-editor="true"]',
    'input[type="text"]',
  ].join(",");

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function deepQueryIn(root, selector) {
    const results = [];
    const visit = (node) => {
      if (!node || !node.querySelectorAll) return;
      for (const element of node.querySelectorAll(selector)) results.push(element);
      for (const element of node.querySelectorAll("*")) {
        if (element.shadowRoot) visit(element.shadowRoot);
        if (element.tagName === "IFRAME") {
          try {
            const doc = element.contentDocument;
            if (doc?.documentElement) visit(doc);
          } catch (_) {}
        }
      }
    };
    visit(root);
    return results;
  }

  function deepQuery(selector) {
    return deepQueryIn(document, selector);
  }

  function visible(element) {
    try {
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
        return false;
      }
      const rect = element.getBoundingClientRect();
      return rect.width > 24 && rect.height > 14;
    } catch (_) {
      return false;
    }
  }

  function hintOf(element) {
    return [
      element.getAttribute("placeholder"),
      element.getAttribute("aria-label"),
      element.getAttribute("aria-placeholder"),
      element.getAttribute("data-placeholder"),
      element.getAttribute("name"),
      element.getAttribute("id"),
    ]
      .filter(Boolean)
      .join(" ");
  }

  function contextOf(element) {
    let context = "";
    let parent = element;
    for (let depth = 0; depth < 5 && parent; depth += 1) {
      context += ` ${parent.textContent || ""}`;
      parent = parent.parentElement;
    }
    return context.slice(0, 1200);
  }

  function scoreLyricsCandidate(element) {
    if (!visible(element)) return -Infinity;
    const hint = hintOf(element).toLowerCase();
    const context = contextOf(element).toLowerCase();
    let score = 0;
    if (/lyric|parole|write your|one line at a time/.test(hint)) score += 1200;
    if (/style|genre|describe your song/.test(hint)) score -= 900;
    if (/lyric|parole/.test(context)) score += 350;
    if (/style|genre/.test(context) && !/lyric|parole/.test(context)) score -= 250;
    const rect = element.getBoundingClientRect();
    score += Math.min(120, (rect.width * rect.height) / 1800);
    if (element.tagName === "TEXTAREA") score += 60;
    if (element.getAttribute("contenteditable") === "true") score += 50;
    return score;
  }

  function scoreStyleCandidate(element) {
    if (!visible(element)) return -Infinity;
    const hint = hintOf(element).toLowerCase();
    const context = contextOf(element).toLowerCase();
    let score = 0;
    if (/style|genre|describe your song|musical/.test(hint)) score += 900;
    if (/lyric|parole/.test(hint)) score -= 1200;
    if (/style|genre/.test(context)) score += 180;
    if (/lyric|parole/.test(context) && !/style|genre/.test(context)) score -= 400;
    const rect = element.getBoundingClientRect();
    score += Math.min(100, (rect.width * rect.height) / 1800);
    return score;
  }

  function findEditorUnderHeading(pattern, scorer) {
    const headings = deepQuery("h1,h2,h3,h4,h5,button,[role='tab'],label,div,span,p").filter(
      (element) => {
        if (!visible(element)) return false;
        const text = (element.textContent || "").trim().toLowerCase();
        return text.length > 0 && text.length < 28 && pattern.test(text);
      }
    );
    for (const heading of headings) {
      let parent = heading;
      for (let depth = 0; depth < 6 && parent; depth += 1) {
        parent = parent.parentElement;
        if (!parent) break;
        const candidates = deepQueryIn(parent, CANDIDATE_SELECTOR);
        const ranked = candidates
          .map((element) => ({ element, score: scorer(element) }))
          .sort((a, b) => b.score - a.score);
        if (ranked[0]?.score > 20) return ranked[0].element;
      }
    }
    return null;
  }

  function findLyricsEditor() {
    const byHeading = findEditorUnderHeading(
      /^(lyrics?|paroles?|lyrics?\s*&|paroles?\s*&)/i,
      scoreLyricsCandidate
    );
    if (byHeading) return byHeading;
    const candidates = deepQuery(CANDIDATE_SELECTOR)
      .map((element) => ({ element, score: scoreLyricsCandidate(element) }))
      .sort((a, b) => b.score - a.score);
    return candidates[0]?.score > 0 ? candidates[0].element : null;
  }

  function findStyleEditor() {
    const byHeading = findEditorUnderHeading(
      /^(style|styles|genre|musical style|style of music)\b/i,
      scoreStyleCandidate
    );
    if (byHeading) return byHeading;
    const candidates = deepQuery(CANDIDATE_SELECTOR)
      .map((element) => ({ element, score: scoreStyleCandidate(element) }))
      .sort((a, b) => b.score - a.score);
    return candidates[0]?.score > 0 ? candidates[0].element : null;
  }

  function markerOf(text) {
    const clean = String(text ?? "").replace(/\s+/g, " ").trim();
    return clean.slice(0, Math.min(22, clean.length));
  }

  function readEditor(element) {
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      return element.value;
    }
    return element.innerText || element.textContent || "";
  }

  function normalizedText(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function editorContains(element, text) {
    const clean = normalizedText(text);
    return clean.length > 0 && normalizedText(readEditor(element)).includes(clean.slice(0, Math.min(22, clean.length)));
  }

  async function isPersistent(element, text) {
    await sleep(350);
    const first = editorContains(element, text);
    await sleep(900);
    const second = editorContains(element, text);
    return first && second;
  }

  function setNativeValue(element, value) {
    const proto =
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : element instanceof HTMLInputElement
          ? HTMLInputElement.prototype
          : null;
    if (proto) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
      if (descriptor?.set) {
        descriptor.set.call(element, value);
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
    }
    return false;
  }

  function pasteText(element, text) {
    try {
      const transfer = new DataTransfer();
      transfer.setData("text/plain", text);
      element.dispatchEvent(
        new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: transfer,
        })
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  async function attemptFill(element, text) {
    const details = [];
    if (!element) return { ok: false, strategies: [], details: ["aucun éditeur"] };
    try {
      element.focus();
      element.click();
    } catch (_) {}
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      if (setNativeValue(element, text)) details.push("native");
      if (editorContains(element, text)) return { ok: true, strategies: details, details };
    }
    if (element.isContentEditable) {
      try {
        element.textContent = "";
        element.focus();
        document.execCommand("selectAll", false, null);
        if (document.execCommand("insertText", false, text)) details.push("insertText");
      } catch (_) {}
      if (!editorContains(element, text)) {
        try {
          element.innerHTML = String(text)
            .split("\n")
            .map((line) => document.createElement("div").appendChild(document.createTextNode(line)).parentNode.outerHTML)
            .join("");
          element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
          details.push("html");
        } catch (_) {}
      }
      if (!editorContains(element, text)) {
        try {
          const selection = window.getSelection();
          selection?.removeAllRanges();
          const range = document.createRange();
          range.selectNodeContents(element);
          selection?.addRange(range);
          document.execCommand("insertText", false, text);
          details.push("range");
        } catch (_) {}
      }
    }
    if (!editorContains(element, text)) {
      if (pasteText(element, text)) details.push("paste");
      await sleep(250);
    }
    if (!editorContains(element, text)) {
      if (setNativeValue(element, text)) details.push("native-fallback");
    }
    return { ok: editorContains(element, text), strategies: details, details };
  }

  function clickAdvanced() {
    const candidates = deepQuery("button,[role='tab'],[role='button'],a,div,span").filter((element) => {
      if (!visible(element)) return false;
      const text = (element.textContent || "").trim().toLowerCase();
      return /^(advanced|avancé|more options|options avancées)\b/.test(text) && text.length < 30;
    });
    const button = candidates.find((element) => /BUTTON|A/.test(element.tagName)) || candidates[0];
    if (button) {
      try {
        button.click();
        return true;
      } catch (_) {}
    }
    return false;
  }

  async function waitForEditor(finder, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const editor = finder();
      if (editor) return editor;
      if (Date.now() > deadline) return null;
      await sleep(250);
    }
  }

  async function fillTarget(finder, text, label) {
    const clean = String(text ?? "");
    if (!clean.trim()) return { ok: false, error: `Le texte ${label} est vide.` };
    const marker = markerOf(clean);
    let editor = await waitForEditor(finder, 4500);
    if (!editor) {
      clickAdvanced();
      editor = await waitForEditor(finder, 3500);
    }
    if (!editor) {
      return {
        ok: false,
        error: `Éditeur ${label} introuvable. Ouvre Suno Create en mode Advanced, puis réessaie.`,
      };
    }
    let attempt = await attemptFill(editor, clean);
    if (attempt.ok && (await isPersistent(editor, clean))) {
      return { ok: true, ...attempt, length: clean.length, strategy: attempt.strategies.join("+") };
    }
    await sleep(500);
    editor = finder() || editor;
    attempt = await attemptFill(editor, clean);
    if (attempt.ok && (await isPersistent(editor, clean))) {
      return { ok: true, ...attempt, length: clean.length, strategy: attempt.strategies.join("+") };
    }
    return { ok: false, error: `Le texte ${label} n'a pas pu être injecté.`, details: attempt.details };
  }

  function fillLyrics(text) {
    return fillTarget(findLyricsEditor, text, "Lyrics");
  }

  function fillStyle(text) {
    return fillTarget(findStyleEditor, text, "Style");
  }

  function copyText(text) {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      if (ok) return true;
    } catch (_) {}
    try {
      navigator.clipboard.writeText(text).catch(() => {});
      return true;
    } catch (_) {
      return false;
    }
  }

  function base64ToBytes(base64) {
    const binary = atob(String(base64 ?? ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function findAudioFileInput() {
    const inputs = deepQuery('input[type="file"]');
    const specific = inputs.filter((input) => {
      const accept = String(input.getAttribute("accept") || "").toLowerCase();
      return /audio|mp3|wav|m4a|flac|ogg|webm/.test(accept);
    });
    if (specific.length) return specific[0];
    const neutral = inputs.filter((input) => !String(input.getAttribute("accept") || "").trim());
    return neutral.length === 1 ? neutral[0] : null;
  }

  function findClickable(pattern) {
    const candidates = deepQuery("button,[role='tab'],[role='button'],a,div,span").filter((element) => {
      if (!visible(element)) return false;
      const text = (element.textContent || "").trim();
      return text.length > 0 && text.length <= 40 && pattern.test(text);
    });
    return candidates.find((element) => /BUTTON|A/.test(element.tagName)) || candidates[0] || null;
  }

  async function clickByPattern(pattern, timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const element = findClickable(pattern);
      if (element) {
        try {
          element.click();
          return element;
        } catch (_) {}
      }
      if (Date.now() > deadline) return null;
      await sleep(350);
    }
  }

  async function importAudio(message) {
    const bytes = base64ToBytes(message.bytesBase64);
    const name = String(message.name || "sample.mp3");
    const mime = String(message.mime || "audio/mpeg");
    const file = new File([bytes], name, { type: mime, lastModified: Date.now() });
    let input = findAudioFileInput();
    if (!input) {
      const opened = await clickByPattern(/audio file|upload audio|import audio|upload a song/i, 6000);
      if (opened) await sleep(900);
      input = findAudioFileInput();
    }
    if (!input) {
      return {
        ok: false,
        error:
          "Champ d'import audio introuvable. Ouvre l'onglet Audio File / Upload de Suno, puis importe le MP3 à la main.",
      };
    }
    try {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new Event("drop", { bubbles: true }));
      return { ok: true, name, size: file.size, accept: input.getAttribute("accept") || "" };
    } catch (error) {
      return { ok: false, error: error?.message || String(error) };
    }
  }

  async function goRemixCover() {
    const remix = await clickByPattern(/^(remix|remixer|remix this)$/i, 20000);
    if (!remix) {
      return {
        ok: false,
        error: "Bouton Remix introuvable. Ouvre le sample importé puis choisis Remix > Cover à la main.",
      };
    }
    await sleep(900);
    const cover = await clickByPattern(/^(cover|reprise)$/i, 20000);
    if (!cover) {
      return { ok: false, error: "Bouton Cover introuvable après Remix. Choisis Cover à la main." };
    }
    return { ok: true };
  }

  function findLabeledControl(labelPattern) {
    const labels = deepQuery("label,span,div,p,button").filter((element) => {
      if (!visible(element)) return false;
      const text = (element.textContent || "").trim();
      return text.length > 0 && text.length < 40 && labelPattern.test(text);
    });
    for (const label of labels) {
      let parent = label;
      for (let depth = 0; depth < 5 && parent; depth += 1) {
        const range = parent.querySelector('input[type="range"]');
        if (range) return { kind: "range", element: range, label };
        const number = parent.querySelector('input[type="number"]');
        if (number) return { kind: "number", element: number, label };
        const select = parent.querySelector("select");
        if (select) return { kind: "select", element: select, label };
        const slider = parent.querySelector('[role="slider"]');
        if (slider) return { kind: "slider", element: slider, label };
        parent = parent.parentElement;
      }
    }
    return null;
  }

  function setNativeInput(element, value) {
    const proto =
      element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor?.set) descriptor.set.call(element, String(value));
    else element.value = String(value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function setLabeledValue(labelPattern, value) {
    const control = findLabeledControl(labelPattern);
    if (!control) return { ok: false, reason: "introuvable" };
    try {
      if (control.kind === "range" || control.kind === "number") {
        if (!Number.isFinite(Number(value))) return { ok: false, kind: control.kind, reason: "valeur non numérique" };
        const min = Number(control.element.getAttribute("min"));
        const max = Number(control.element.getAttribute("max"));
        let next = Number(value);
        if (Number.isFinite(min)) next = Math.max(min, next);
        if (Number.isFinite(max)) next = Math.min(max, next);
        setNativeInput(control.element, next);
        return { ok: true, kind: control.kind, value: next };
      }
      if (control.kind === "select") {
        const options = [...control.element.options];
        const match = options.find((option) =>
          new RegExp(String(value), "i").test(`${option.value} ${option.textContent}`)
        );
        if (!match) return { ok: false, kind: "select", reason: "option introuvable" };
        setNativeInput(control.element, match.value);
        return { ok: true, kind: "select", value: match.textContent };
      }
      if (control.kind === "slider") {
        control.element.setAttribute("aria-valuenow", String(value));
        control.element.dispatchEvent(new Event("input", { bubbles: true }));
        control.element.dispatchEvent(new Event("change", { bubbles: true }));
        return { ok: true, kind: "slider", value };
      }
    } catch (error) {
      return { ok: false, kind: control.kind, reason: error?.message || String(error) };
    }
    return { ok: false, reason: "type inconnu" };
  }

  async function configureSuno() {
    let weirdness = setLabeledValue(/^weirdness/i, "0");
    if (!weirdness.ok) {
      clickAdvanced();
      await sleep(700);
      weirdness = setLabeledValue(/^weirdness/i, "0");
    }
    const styleInfluence = setLabeledValue(/style\s*influence/i, "100");
    let variety = setLabeledValue(/^variety/i, "off");
    if (!variety.ok) {
      const button = findClickable(/^off$/i);
      if (button) {
        try {
          button.click();
          variety = { ok: true, kind: "button", value: "Off" };
        } catch (_) {}
      }
    }
    return { ok: weirdness.ok || styleInfluence.ok || variety.ok, weirdness, styleInfluence, variety };
  }

  try {
    window.__ctSunoTest = {
      fillLyrics,
      fillStyle,
      importAudio,
      goRemixCover,
      configureSuno,
      findLyricsEditor,
      findStyleEditor,
    };
  } catch (_) {}

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== "object") return;
    if (message.type === "ct-suno-ping") {
      sendResponse({ ok: true, version: VERSION });
      return;
    }
    if (message.type === "ct-copy-lyrics") {
      sendResponse({ ok: copyText(String(message.text ?? "")) });
      return;
    }
    if (message.type === "ct-fill-lyrics-v2" || message.type === "ct-fill-lyrics") {
      fillLyrics(String(message.text ?? ""))
        .then(sendResponse)
        .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
      return true;
    }
    if (message.type === "ct-fill-style-v2") {
      fillStyle(String(message.text ?? ""))
        .then(sendResponse)
        .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
      return true;
    }
    if (message.type === "ct-import-audio-v2") {
      importAudio(message)
        .then(sendResponse)
        .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
      return true;
    }
    if (message.type === "ct-remix-cover-v2") {
      goRemixCover()
        .then(sendResponse)
        .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
      return true;
    }
    if (message.type === "ct-suno-settings-v2") {
      configureSuno()
        .then(sendResponse)
        .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
      return true;
    }
  });
})();
