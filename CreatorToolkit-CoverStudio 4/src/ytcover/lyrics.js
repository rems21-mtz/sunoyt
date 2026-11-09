/*
 * Lyrics lookup + section structuring.
 *
 * Genius is tried first (it usually labels sections like [Verse 1] / [Chorus]).
 * If Genius is behind a Cloudflare challenge, LRCLIB and lyrics.ovh are used as
 * fallbacks and the sections are inferred from repetition and song position.
 */

const GENIUS_API = "https://genius.com/api/search/multi";
const LRCLIB_API = "https://lrclib.net/api/search";
const OVH_API = "https://api.lyrics.ovh/v1";

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function decodeEntities(value) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function containerToText(container) {
  const clone = container.cloneNode(true);
  clone.querySelectorAll("script, style, noscript").forEach((node) => node.remove());
  clone.querySelectorAll("[class*='Lyrics__Footer'], [class*='RightSidebar'], .ad_container").forEach((node) => node.remove());
  clone.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
  clone.querySelectorAll("p, div").forEach((node) => node.append("\n"));
  const text = clone.textContent || "";
  return text
    .split("\n")
    .map((line) => line.replace(/\u00a0/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function looksLikeChallenge(body) {
  return (
    !body ||
    /make sure you.re a human|un instant|attention required|cf-challenge|challenge-platform/i.test(body) ||
    /^\s*</.test(body)
  );
}

export async function geniusSearch(query) {
  const url = `${GENIUS_API}?per_page=8&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    credentials: "include",
    signal: AbortSignal.timeout(12000),
  });
  const text = await response.text();
  if (!response.ok || looksLikeChallenge(text)) {
    throw Object.assign(new Error("Genius demande une vérification humaine."), { code: "genius_blocked" });
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch (_) {
    throw Object.assign(new Error("Genius a renvoyé une réponse illisible."), { code: "genius_blocked" });
  }
  const seen = new Set();
  const results = [];
  for (const section of data?.response?.sections ?? []) {
    for (const hit of section?.hits ?? []) {
      const song = hit?.result;
      if (!song?.url || !song?.title || seen.has(song.url)) continue;
      if (!/genius\.com\/.+-lyrics$/.test(song.url)) continue;
      seen.add(song.url);
      results.push({
        title: song.title,
        artist: song.primary_artist?.name ?? "",
        url: song.url,
        image: song.song_art_image_thumbnail_url ?? "",
      });
    }
  }
  return results;
}

export async function geniusLyrics(url) {
  const response = await fetch(url, {
    credentials: "include",
    signal: AbortSignal.timeout(12000),
  });
  const html = await response.text();
  if (!response.ok || looksLikeChallenge(html)) {
    throw Object.assign(new Error("Genius demande une vérification humaine."), { code: "genius_blocked" });
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  const containers = [...doc.querySelectorAll('[data-lyrics-container="true"]')];
  if (!containers.length) {
    const legacy = doc.querySelector(".lyrics");
    if (!legacy) throw new Error("Aucune parole trouvée sur cette page Genius.");
    return containerToText(legacy);
  }
  return containers.map(containerToText).filter(Boolean).join("\n\n");
}

export async function lrclibLookup(title, artist) {
  const params = new URLSearchParams();
  if (title) params.set("track_name", title);
  if (artist) params.set("artist_name", artist);
  if (!title && !artist) return null;
  const urls = [`${LRCLIB_API}?${params.toString()}`];
  if (title) urls.push(`${LRCLIB_API}?q=${encodeURIComponent(`${title} ${artist}`.trim())}`);

  for (const url of urls) {
    let response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    } catch (_) {
      continue;
    }
    if (!response.ok) continue;
    const list = await response.json().catch(() => null);
    if (!Array.isArray(list) || !list.length) continue;
    const wantedTitle = normalize(title);
    const wantedArtist = normalize(artist);
    const scored = list
      .map((item) => {
        let score = 0;
        if (wantedTitle && normalize(item.trackName) === wantedTitle) score += 3;
        else if (wantedTitle && normalize(item.trackName).includes(wantedTitle)) score += 1;
        if (wantedArtist && normalize(item.artistName) === wantedArtist) score += 2;
        else if (wantedArtist && normalize(item.artistName).includes(wantedArtist)) score += 1;
        if (item.plainLyrics) score += 1;
        return { item, score };
      })
      .sort((a, b) => b.score - a.score);
    const best = scored[0]?.item;
    if (!best) continue;
    const plain = best.plainLyrics || "";
    if (!plain.trim()) continue;
    return {
      title: best.trackName || title,
      artist: best.artistName || artist,
      lyrics: plain,
      synced: best.syncedLyrics || "",
      source: "LRCLIB",
      sourceUrl: "https://lrclib.net/",
    };
  }
  return null;
}

export async function lyricsOvhLookup(title, artist) {
  if (!title || !artist) return null;
  const url = `${OVH_API}/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  if (!data?.lyrics) return null;
  return {
    title,
    artist,
    lyrics: String(data.lyrics).replace(/\r/g, "").trim(),
    synced: "",
    source: "lyrics.ovh",
    sourceUrl: "https://lyrics.ovh/",
  };
}

function stanzaKey(lines) {
  return normalize(lines.join(" ")).slice(0, 220);
}

/**
 * Adds [Intro] [Verse 1] [Chorus] [Bridge] [Outro] tags when the source has
 * none. Existing bracket tags are normalized and kept.
 */
export function structureLyrics(text) {
  const source = String(text ?? "").replace(/\r/g, "").trim();
  if (!source) return { text: "", sections: [] };

  const hasTags = /^\s*\[[^\]]+\]\s*$/m.test(source);
  if (hasTags) {
    const sections = [];
    const out = [];
    let current = [];
    let currentLabel = "";
    const flush = () => {
      if (!current.length) return;
      const label = currentLabel || "Verse";
      out.push(`[${label}]`, current.join("\n"), "");
      sections.push({ label, lines: current.slice() });
      current = [];
    };
    for (const line of source.split("\n")) {
      const match = /^\s*\[([^\]]+)\]\s*$/.exec(line);
      if (match) {
        flush();
        currentLabel = match[1]
          .split(":")[0]
          .replace(/\s+/g, " ")
          .replace(/^verse\s*(\d+)$/i, (_, n) => `Verse ${n}`)
          .replace(/^chorus\s*(\d*)$/i, "Chorus")
          .replace(/^pre[- ]?chorus$/i, "Pre-Chorus")
          .replace(/^post[- ]?chorus$/i, "Post-Chorus")
          .replace(/^bridge$/i, "Bridge")
          .replace(/^intro$/i, "Intro")
          .replace(/^outro$/i, "Outro");
        continue;
      }
      if (!line.trim() && !current.length) continue;
      current.push(line.trimEnd());
    }
    flush();
    return { text: out.join("\n").trim(), sections };
  }

  const blocks = source
    .split(/\n\s*\n+/)
    .map((block) => block.split("\n").map((line) => line.trimEnd()).filter(Boolean))
    .filter((block) => block.length);
  if (!blocks.length) return { text: source, sections: [] };
  // If the source has no blank lines, group lines into four-line stanzas.
  if (blocks.length === 1 && blocks[0].length > 8) {
    const lines = blocks[0];
    const grouped = [];
    for (let i = 0; i < lines.length; i += 4) grouped.push(lines.slice(i, i + 4));
    blocks.splice(0, blocks.length, ...grouped);
  }

  const keys = blocks.map(stanzaKey);
  const counts = new Map();
  keys.forEach((key) => counts.set(key, (counts.get(key) ?? 0) + 1));

  // The most repeated block is almost always the chorus. Ties go to the
  // longer block, then to the one that first appears later in the song.
  let chorusKey = null;
  let chorusCount = 0;
  let chorusWeight = -1;
  keys.forEach((key, index) => {
    const count = counts.get(key) ?? 0;
    if (count < 2) return;
    const weight = blocks[index].join(" ").length + index * 0.01;
    if (count > chorusCount || (count === chorusCount && weight > chorusWeight)) {
      chorusKey = key;
      chorusCount = count;
      chorusWeight = weight;
    }
  });

  let verse = 0;
  let chorusSeen = 0;
  let bridgeUsed = false;
  let preChorusUsed = false;
  const verseNumbers = new Map();
  const sections = [];
  const out = [];

  const isChorusNext = (index) => index + 1 < keys.length && keys[index + 1] === chorusKey;

  blocks.forEach((lines, index) => {
    const key = keys[index];
    const count = counts.get(key) ?? 0;
    const isFirst = index === 0;
    const isLast = index === blocks.length - 1;
    const short = lines.length <= 3;
    let label;

    if (chorusKey && key === chorusKey) {
      label = "Chorus";
      chorusSeen += 1;
    } else if (count >= 2) {
      const preChorus = short && isChorusNext(index);
      if (preChorus) {
        label = "Pre-Chorus";
        preChorusUsed = true;
      } else {
        if (!verseNumbers.has(key)) {
          verse += 1;
          verseNumbers.set(key, verse);
        }
        label = `Verse ${verseNumbers.get(key)}`;
      }
    } else if (isFirst && short) {
      label = "Intro";
    } else if (isLast && short && chorusSeen > 0) {
      label = "Outro";
    } else if (
      chorusSeen >= 2 &&
      !bridgeUsed &&
      !isLast &&
      lines.length >= 3 &&
      !isChorusNext(index)
    ) {
      label = "Bridge";
      bridgeUsed = true;
    } else if (short && isChorusNext(index)) {
      label = "Pre-Chorus";
      preChorusUsed = true;
    } else {
      verse += 1;
      label = `Verse ${verse}`;
    }

    sections.push({ label, lines: lines.slice() });
    out.push(`[${label}]`, lines.join("\n"), "");
  });

  return { text: out.join("\n").trim(), sections };
}

export async function fetchLyrics({ title, artist, preferGenius = true, geniusUrl = "" }) {
  const notes = [];
  let geniusResult = null;
  if (preferGenius) {
    try {
      if (geniusUrl) {
        const lyrics = await geniusLyrics(geniusUrl);
        geniusResult = { lyrics, source: "Genius", sourceUrl: geniusUrl, title, artist };
      } else {
        const query = [title, artist].filter(Boolean).join(" ");
        if (query) {
          const results = await geniusSearch(query);
          if (results[0]) {
            const lyrics = await geniusLyrics(results[0].url);
            geniusResult = {
              lyrics,
              source: "Genius",
              sourceUrl: results[0].url,
              title: results[0].title,
              artist: results[0].artist,
              results,
            };
          }
        }
      }
    } catch (error) {
      notes.push(
        error?.code === "genius_blocked"
          ? "Genius a demandé une vérification humaine : paroles récupérées via LRCLIB."
          : `Genius indisponible (${error?.message || error}) : repli sur LRCLIB.`
      );
    }
  }

  if (geniusResult?.lyrics?.trim()) {
    const structured = structureLyrics(geniusResult.lyrics);
    return {
      ...geniusResult,
      lyrics: structured.text,
      rawLyrics: geniusResult.lyrics,
      sections: structured.sections,
      notes,
      structured: structured.text !== geniusResult.lyrics.trim(),
    };
  }

  let fallback = await lrclibLookup(title, artist).catch(() => null);
  if (!fallback) fallback = await lyricsOvhLookup(title, artist).catch(() => null);
  if (!fallback?.lyrics?.trim()) {
    throw new Error(
      "Paroles introuvables. Vérifie le titre et l'artiste, ou colle les paroles à la main."
    );
  }
  const structured = structureLyrics(fallback.lyrics);
  return {
    ...fallback,
    lyrics: structured.text,
    rawLyrics: fallback.lyrics,
    sections: structured.sections,
    notes,
    structured: structured.text !== fallback.lyrics.trim(),
  };
}

export { normalize };
