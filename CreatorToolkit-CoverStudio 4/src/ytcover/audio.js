import { Mp3Encoder } from "../../vendor/lamejs/lamejs.js";

const MP3_RATES = [8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000];

let sharedContext = null;
function audioContext() {
  if (!sharedContext || sharedContext.state === "closed") {
    sharedContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return sharedContext;
}

export function formatTime(seconds, withMs = false) {
  if (!Number.isFinite(seconds)) return "—";
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  const whole = Math.floor(rest);
  const ms = Math.round((rest - whole) * 1000);
  if (withMs) return `${m}:${String(whole).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
  return `${m}:${String(whole).padStart(2, "0")}`;
}

export function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function decodeAudioBytes(bytes, mime = "") {
  const context = audioContext();
  const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  try {
    return await context.decodeAudioData(copy);
  } catch (error) {
    throw new Error(
      `Impossible de décoder l'audio capturé${mime ? ` (${mime})` : ""}. Relance la capture.`
    );
  }
}

export function copyBuffer(buffer, startSec = 0, durationSec = null) {
  const rate = buffer.sampleRate;
  const start = Math.max(0, Math.floor(startSec * rate));
  const length = Math.max(
    0,
    Math.min(buffer.length - start, Math.floor((durationSec ?? buffer.duration - startSec) * rate))
  );
  const out = audioContext().createBuffer(buffer.numberOfChannels, length, rate);
  for (let c = 0; c < buffer.numberOfChannels; c += 1) {
    const src = buffer.getChannelData(c);
    const dst = out.getChannelData(c);
    dst.set(src.subarray(start, start + length));
  }
  return out;
}

export function monoMix(buffer, maxSeconds = 60) {
  const rate = buffer.sampleRate;
  const length = Math.min(buffer.length, Math.floor(maxSeconds * rate));
  const out = new Float32Array(length);
  const channels = buffer.numberOfChannels;
  for (let c = 0; c < channels; c += 1) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i += 1) out[i] += data[i];
  }
  if (channels > 1) {
    for (let i = 0; i < length; i += 1) out[i] /= channels;
  }
  return out;
}

/**
 * Tempo estimation with a log-energy onset envelope + autocorrelation and a
 * comb-filter beat phase. Returns a sane fallback instead of throwing.
 */
export function detectTempo(buffer) {
  const rate = buffer.sampleRate;
  const mono = monoMix(buffer, 45);
  if (mono.length < rate * 2) {
    return { bpm: 120, beatOffset: 0, confidence: 0, fallback: true };
  }

  const frame = 1024;
  const hop = 512;
  const frames = Math.floor((mono.length - frame) / hop);
  if (frames < 16) return { bpm: 120, beatOffset: 0, confidence: 0, fallback: true };

  const energy = new Float32Array(frames);
  for (let f = 0; f < frames; f += 1) {
    let sum = 0;
    const offset = f * hop;
    for (let i = 0; i < frame; i += 1) {
      const v = mono[offset + i];
      sum += v * v;
    }
    energy[f] = Math.log(1e-9 + sum);
  }

  const onset = new Float32Array(frames);
  for (let f = 1; f < frames; f += 1) onset[f] = Math.max(0, energy[f] - energy[f - 1]);

  // Remove slow loudness changes so a crescendo does not dominate the beat.
  const smoothing = Math.max(1, Math.round((rate / hop) * 0.8));
  const prefix = new Float64Array(frames + 1);
  for (let f = 0; f < frames; f += 1) prefix[f + 1] = prefix[f] + onset[f];
  for (let f = 0; f < frames; f += 1) {
    const lo = Math.max(0, f - smoothing);
    const hi = Math.min(frames, f + smoothing + 1);
    const local = (prefix[hi] - prefix[lo]) / (hi - lo);
    onset[f] = Math.max(0, onset[f] - local * 0.35);
  }

  const minLag = Math.max(2, Math.round((60 * rate) / (200 * hop)));
  const maxLag = Math.min(frames - 4, Math.round((60 * rate) / (55 * hop)));
  const scores = new Float64Array(maxLag + 2);
  let bestLag = 0;
  let bestScore = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let sum = 0;
    let energyA = 0;
    let energyB = 0;
    for (let i = 0; i + lag < frames; i += 1) {
      const a = onset[i];
      const b = onset[i + lag];
      sum += a * b;
      energyA += a * a;
      energyB += b * b;
    }
    const norm = Math.sqrt(energyA * energyB) || 1;
    const bpm = (60 * rate) / (lag * hop);
    // Mild prior around 110–125 BPM keeps half/double errors in check.
    const prior = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 115) / 0.75, 2));
    const score = (sum / norm) * (0.6 + 0.4 * prior);
    scores[lag] = score;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  if (!bestLag) return { bpm: 120, beatOffset: 0, confidence: 0, fallback: true };

  // Prefer a tempo in a singable range by comparing the octave neighbours.
  const candidates = [bestLag, Math.round(bestLag / 2), Math.round(bestLag * 2)].filter(
    (lag) => lag >= minLag && lag <= maxLag
  );
  let chosen = bestLag;
  let chosenScore = bestScore;
  for (const lag of candidates) {
    const bpm = (60 * rate) / (lag * hop);
    if (bpm < 70 || bpm > 175) continue;
    const score = scores[lag] || 0;
    // Slight preference for the middle of the range.
    const centre = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 105) / 0.9, 2));
    const weighted = score * (0.85 + 0.3 * centre);
    if (weighted > chosenScore * 0.92) {
      chosen = lag;
      chosenScore = weighted;
    }
  }

  // Parabolic interpolation around the chosen lag.
  const left = scores[chosen - 1] || 0;
  const right = scores[chosen + 1] || 0;
  const denom = left - 2 * chosenScore + right;
  const shift = Math.abs(denom) > 1e-9 ? (0.5 * (left - right)) / denom : 0;
  const preciseLag = chosen + Math.max(-0.5, Math.min(0.5, shift));
  let bpm = (60 * rate) / (preciseLag * hop);
  if (!Number.isFinite(bpm) || bpm <= 0) bpm = 120;
  while (bpm < 78) bpm *= 2;
  while (bpm > 190) bpm /= 2;

  // Beat phase: pick the comb offset with the most onset energy.
  let bestPhase = 0;
  let bestPhaseScore = -Infinity;
  for (let phase = 0; phase < chosen; phase += 1) {
    let sum = 0;
    let count = 0;
    for (let f = phase; f < frames; f += chosen) {
      sum += onset[f];
      count += 1;
    }
    const avg = count ? sum / count : 0;
    if (avg > bestPhaseScore) {
      bestPhaseScore = avg;
      bestPhase = phase;
    }
  }
  const beatOffset = (bestPhase * hop) / rate;
  const confidence = Math.max(0, Math.min(1, (chosenScore - 0.02) / 0.35));
  return { bpm: Math.round(bpm * 10) / 10, beatOffset, confidence, fallback: confidence < 0.12 };
}

export function beatPeriod(bpm) {
  return 60 / Math.max(30, bpm || 120);
}

export function segmentLengthFromBars(bpm, bars, beatsPerBar = 4) {
  return (bars * beatsPerBar * 60) / Math.max(30, bpm || 120);
}

export function snapToBeat(seconds, bpm, offset = 0, beatsPerBar = 4) {
  const period = beatPeriod(bpm);
  const n = Math.round((seconds - offset) / period);
  return offset + n * period;
}

export function peaks(buffer, buckets = 700) {
  const length = buffer.length;
  const channels = buffer.numberOfChannels;
  const data = [];
  const step = Math.max(1, Math.floor(length / buckets));
  for (let b = 0; b < buckets; b += 1) {
    const start = b * step;
    const end = Math.min(length, start + step);
    let peak = 0;
    for (let c = 0; c < channels; c += 1) {
      const channel = buffer.getChannelData(c);
      for (let i = start; i < end; i += 4) {
        const v = Math.abs(channel[i]);
        if (v > peak) peak = v;
      }
    }
    data.push(peak);
  }
  const max = Math.max(0.02, ...data);
  return data.map((v) => Math.min(1, v / max));
}

function nearestRate(rate) {
  let best = MP3_RATES[0];
  for (const candidate of MP3_RATES) {
    if (Math.abs(candidate - rate) < Math.abs(best - rate)) best = candidate;
  }
  return best;
}

async function resampleIfNeeded(buffer) {
  const target = nearestRate(buffer.sampleRate);
  if (target === buffer.sampleRate) return buffer;
  const length = Math.max(1, Math.round((buffer.length * target) / buffer.sampleRate));
  const offline = new OfflineAudioContext(buffer.numberOfChannels, length, target);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start();
  return offline.startRendering();
}

function toInt16(channel) {
  const out = new Int16Array(channel.length);
  for (let i = 0; i < channel.length; i += 1) {
    const v = Math.max(-1, Math.min(1, channel[i]));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return out;
}

export async function encodeMp3(buffer, bitrateKbps = 192, onProgress = () => {}) {
  const source = await resampleIfNeeded(buffer);
  const channels = Math.min(2, source.numberOfChannels);
  const rate = source.sampleRate;
  const left = toInt16(source.getChannelData(0));
  const right = channels > 1 ? toInt16(source.getChannelData(1)) : null;
  const encoder = new Mp3Encoder(channels, rate, bitrateKbps);
  const chunks = [];
  const block = 1152;
  for (let i = 0; i < left.length; i += block) {
    const l = left.subarray(i, i + block);
    const r = right ? right.subarray(i, i + block) : null;
    const encoded = channels > 1 ? encoder.encodeBuffer(l, r) : encoder.encodeBuffer(l);
    if (encoded.length) chunks.push(new Uint8Array(encoded));
    if ((i / block) % 32 === 0) {
      onProgress(Math.min(1, i / left.length));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  const tail = encoder.flush();
  if (tail.length) chunks.push(new Uint8Array(tail));
  onProgress(1);
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export function encodeWav(buffer) {
  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const bytesPerSample = 2;
  const dataSize = length * channels * bytesPerSample;
  const out = new ArrayBuffer(44 + dataSize);
  const view = new DataView(out);
  const writeString = (offset, value) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);
  let offset = 44;
  const data = [];
  for (let c = 0; c < channels; c += 1) data.push(buffer.getChannelData(c));
  for (let i = 0; i < length; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      const v = Math.max(-1, Math.min(1, data[c][i]));
      view.setInt16(offset, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      offset += 2;
    }
  }
  return new Uint8Array(out);
}
