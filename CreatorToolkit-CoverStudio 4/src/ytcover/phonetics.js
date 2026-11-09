/*
 * Simplified English phonetic transcription.
 *
 * Uses the CMU Pronouncing Dictionary (ARPAbet) to respell each word so a
 * native English reader pronounces it naturally: syllabified with hyphens,
 * stressed syllables in uppercase, silent letters removed by construction.
 * Section tags such as [Verse 1] are preserved untouched.
 */

const VOWELS = new Set(["AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY", "IH", "IY", "OW", "OY", "UH", "UW"]);
const LAX = new Set(["AA", "AE", "AH", "EH", "IH", "UH"]);

const VOWEL_TEXT = {
  AA: "ah",
  AE: "a",
  AH: "uh",
  AO: "aw",
  AW: "ow",
  AY: "ai",
  EH: "e",
  ER: "ur",
  EY: "ay",
  IH: "i",
  IY: "ee",
  OW: "oh",
  OY: "oy",
  UH: "oo",
  UW: "oo",
};

const CONSONANT_TEXT = {
  B: "b",
  CH: "ch",
  D: "d",
  DH: "th",
  F: "f",
  G: "g",
  HH: "h",
  JH: "j",
  K: "k",
  L: "l",
  M: "m",
  N: "n",
  NG: "ng",
  P: "p",
  R: "r",
  S: "s",
  SH: "sh",
  T: "t",
  TH: "th",
  V: "v",
  W: "w",
  Y: "y",
  Z: "z",
  ZH: "zh",
};

const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function numberToWords(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 999999) return null;
  if (n < 20) return ONES[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const r = n % 10;
    return TENS[t] + (r ? `-${ONES[r]}` : "");
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    return `${ONES[h]} hundred${rest ? ` ${numberToWords(rest)}` : ""}`;
  }
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  return `${numberToWords(thousands)} thousand${rest ? ` ${numberToWords(rest)}` : ""}`;
}

export function parseDictionary(text) {
  const map = new Map();
  for (const line of text.split("\n")) {
    if (!line || line.startsWith(";;;")) continue;
    const space = line.indexOf(" ");
    if (space <= 0) continue;
    let word = line.slice(0, space).toLowerCase();
    word = word.replace(/\(\d+\)$/, "");
    if (map.has(word)) continue;
    map.set(word, line.slice(space + 1).trim().split(/\s+/));
  }
  return map;
}

let dictionaryPromise = null;
export function loadDictionary() {
  if (!dictionaryPromise) {
    dictionaryPromise = fetch(chrome.runtime.getURL("data/cmudict.txt"))
      .then((response) => {
        if (!response.ok) throw new Error("Dictionnaire phonétique indisponible.");
        return response.text();
      })
      .then(parseDictionary)
      .catch((error) => {
        dictionaryPromise = null;
        throw error;
      });
  }
  return dictionaryPromise;
}

function parsePhones(phones) {
  return phones.map((phone) => {
    const match = /^([A-Z]+)([0-2])?$/.exec(phone);
    return match ? { phone: match[1], stress: match[2] === undefined ? null : Number(match[2]) } : { phone, stress: null };
  });
}

function isVowel(phone) {
  return VOWELS.has(phone.phone);
}

function splitSyllables(phones) {
  const vowels = [];
  for (let i = 0; i < phones.length; i += 1) if (isVowel(phones[i])) vowels.push(i);
  if (!vowels.length) return [phones];

  const syllables = [];
  let start = 0;
  for (let v = 0; v < vowels.length; v += 1) {
    const vowelIndex = vowels[v];
    const nextVowel = vowels[v + 1];
    let end;
    if (nextVowel === undefined) {
      end = phones.length;
    } else {
      const between = nextVowel - vowelIndex - 1;
      let onset;
      if (between <= 0) {
        onset = 0;
      } else if (between === 1) {
        const previous = phones[vowelIndex];
        const next = phones[nextVowel];
        const nextStressed = next.stress === 1 || next.stress === 2;
        onset =
          previous.stress !== null && LAX.has(previous.phone) && !nextStressed ? 0 : 1;
      } else {
        onset = Math.min(2, between - 1);
        if (
          between >= 3 &&
          phones[vowelIndex + 1].phone === "S" &&
          ["T", "P", "K"].includes(phones[vowelIndex + 2].phone) &&
          ["R", "L", "W", "Y"].includes(phones[vowelIndex + 3].phone)
        ) {
          onset = 3;
        }
      }
      end = nextVowel - onset;
      // "think-ing", not "thing-king": keep a /k/ or /g/ after /ŋ/ in the coda.
      if (
        end > start &&
        phones[end - 1]?.phone === "NG" &&
        (phones[end]?.phone === "K" || phones[end]?.phone === "G")
      ) {
        end += 1;
      }
    }
    syllables.push(phones.slice(start, end));
    start = end;
  }
  if (start < phones.length) {
    syllables[syllables.length - 1] = syllables[syllables.length - 1].concat(phones.slice(start));
  }
  // Merge an empty syllable caused by adjacent vowels.
  return syllables.filter((syllable) => syllable.length > 0);
}

function syllableText(syllable) {
  let text = "";
  for (let i = 0; i < syllable.length; i += 1) {
    const item = syllable[i];
    if (isVowel(item)) {
      text += VOWEL_TEXT[item.phone] || item.phone.toLowerCase();
      continue;
    }
    // "ng" followed by k/g reads better as "n" + "k"/"g" inside one syllable.
    if (item.phone === "NG") {
      const next = syllable[i + 1];
      if (next && (next.phone === "K" || next.phone === "G") && !isVowel(next)) {
        text += "n";
        continue;
      }
      text += "ng";
      continue;
    }
    text += CONSONANT_TEXT[item.phone] || item.phone.toLowerCase();
  }
  return text;
}

function stressSyllables(syllables) {
  let indices = [];
  for (let i = 0; i < syllables.length; i += 1) {
    if (syllables[i].some((phone) => phone.stress === 1)) indices.push(i);
  }
  if (!indices.length) {
    for (let i = 0; i < syllables.length; i += 1) {
      if (syllables[i].some((phone) => phone.stress === 2)) indices.push(i);
    }
  }
  if (!indices.length) indices = [0];
  return new Set(indices);
}

function renderPhones(phones) {
  const parsed = parsePhones(phones);
  const syllables = splitSyllables(parsed);
  if (syllables.length === 1) return syllableText(syllables[0]);
  const stressed = stressSyllables(syllables);
  return syllables
    .map((syllable, index) => {
      const text = syllableText(syllable);
      return stressed.has(index) ? text.toUpperCase() : text;
    })
    .join("-");
}

function lookup(dictionary, word) {
  const lower = word.toLowerCase().replace(/’/g, "'");
  if (dictionary.has(lower)) return dictionary.get(lower);
  // Plurals / third person.
  if (lower.endsWith("'s") || lower.endsWith("’s")) {
    const base = dictionary.get(lower.slice(0, -2));
    if (base) return base.concat(["Z"]);
  }
  if (lower.endsWith("s'") || lower.endsWith("s’")) {
    const base = dictionary.get(lower.slice(0, -1));
    if (base) return base.concat(["Z"]);
  }
  // Common contractions: transcribe the stem, then append the ending sound.
  const contractions = [
    ["n't", ["AH0", "N", "T"]],
    ["'re", ["R"]],
    ["'ve", ["V"]],
    ["'ll", ["L"]],
    ["'m", ["M"]],
    ["'d", ["D"]],
  ];
  for (const [suffix, extra] of contractions) {
    if (lower.endsWith(suffix)) {
      const base = dictionary.get(lower.slice(0, -suffix.length));
      if (base) return base.concat(extra);
    }
  }
  return null;
}

function transformWord(dictionary, raw) {
  const match = /^([^A-Za-z0-9]*)([A-Za-z0-9'’\-]+)([^A-Za-z0-9]*)$/.exec(raw);
  if (!match) return raw;
  const [, prefix, core, suffix] = match;
  if (/^\d+$/.test(core)) {
    const words = numberToWords(core);
    if (words) {
      return (
        prefix +
        words
          .split(" ")
          .map((word) => transformWord(dictionary, word))
          .join(" ") +
        suffix
      );
    }
    return raw;
  }
  const special = {
    i: "eye",
    "i'm": "eyem",
    "i've": "eyev",
    "i'll": "eyel",
    "i'd": "eyed",
  };
  const specialText = special[core.toLowerCase()];
  if (specialText) return prefix + specialText + suffix;
  const phones = lookup(dictionary, core);
  if (!phones) return prefix + core + suffix;
  return prefix + renderPhones(phones) + suffix;
}

export function transcribeWithDictionary(dictionary, text) {
  const lines = String(text ?? "").split("\n");
  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (/^\[[^\]]+\]$/.test(trimmed)) return trimmed;
      // Preserve chord brackets and section tags; transform only lyrics words.
      return line.replace(/\[[^\]]*\]|[A-Za-z0-9][A-Za-z0-9'’\-]*/g, (token) =>
        token.startsWith("[") ? token : transformWord(dictionary, token)
      );
    })
    .join("\n");
}

export async function transcribe(text) {
  const dictionary = await loadDictionary();
  return transcribeWithDictionary(dictionary, text);
}
