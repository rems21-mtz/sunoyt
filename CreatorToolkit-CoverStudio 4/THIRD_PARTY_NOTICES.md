# Third-Party Notices

## onnxruntime-web 1.27.0

- Project: <https://github.com/microsoft/onnxruntime>
- License: MIT
- Packaged files: `vendor/onnxruntime/`
- License text: `vendor/onnxruntime/LICENSE`

The JavaScript runtime, Emscripten module, and WebAssembly binary are kept at
one pinned version. They are distributed locally and are never loaded from a
CDN.

## @breezystack/lamejs 1.2.7

- Project/source: <https://github.com/shijinyu/lamejs>
- Package: <https://www.npmjs.com/package/@breezystack/lamejs/v/1.2.7>
- License: LGPL-3.0
- Packaged files: `vendor/lamejs/`
- Full license: `vendor/lamejs/LICENSE`
- Package license note: `vendor/lamejs/LICENSE.package`

The distributed ES module is unmodified. Corresponding source is available at
the project URL and in the versioned npm package named above.

## Lucide icons

- Project: <https://lucide.dev>
- License: ISC
- Used glyphs: Settings2, ChevronDown, BadgeCheck, Binary, Cpu, Expand,
  FileType, Frame, Hash, Layers, MessageSquareText, ScanSearch, SquareDashed,
  and TextCursorInput
- License text: `vendor/lucide/LICENSE`

The SVG paths and square icon-tile treatment mirror the OCR Advanced settings
controls used by `chunks.md`.

## Demucs htdemucs weights

- Model: `MrCitron/demucs-v4-onnx`, `htdemucs.onnx`
- Original model family: Meta AI Demucs
- License: CC-BY-NC 4.0
- Source: <https://huggingface.co/MrCitron/demucs-v4-onnx>
- SHA-256:
  `7ed6e26883845a16a6d170069a4ff99b8410c2a64d0a2570ed0eb852eea234a2`
- Byte length: `302899058`

The Chrome Web Store package ships the verified weights at
`models/htdemucs.onnx`. A development checkout has no model file: the loader
probes that path first and, when it is missing, downloads the public object
used by `chunks.md` from Hugging Face, verifies the exact byte length and
pinned SHA-256, then caches it locally. A packaged file that is present but
corrupt is terminal — the shipped build has no download host to fall back to.
The weights are for personal, non-commercial use only.

## posthog-js 1.427.2

- Project: <https://github.com/PostHog/posthog-js>
- Package: <https://www.npmjs.com/package/posthog-js/v/1.427.2>
- License: MIT (the LICENSE file carries the Apache-2.0 notice of the
  Mixpanel code it descends from)
- Packaged files: `vendor/posthog/`
- License text: `vendor/posthog/LICENSE`
- SHA-256 (`module.no-external.mjs`):
  `b8ec7cfdcf81718ceae0fb3d24d3f1833caa32e25caeb30cf872209c70356fbd`
- SHA-256 (`exception-autocapture.js`):
  `cf48fa8c444ecfdb424bf65410107209a96ee73fe1329aee983ffddfba529744`

Two files from the package's `dist/`, byte-identical to upstream:
`module.no-external.js` (renamed `.mjs`, unchanged inside) and
`exception-autocapture.js`. This is the build that loads **no external
dependency at runtime** — no session recording, no surveys, no toolbar — and
the extension additionally disables every feature that would read the page.
Requests go to the product's own collector at `https://a.chunks.md`, only
after the user has switched reporting on in the Support tab.

## wllama64 1.0.0

- Project: <https://github.com/actuallymentor/wllama64>, a fork of
  <https://github.com/ngxson/wllama> (WebAssembly binding for llama.cpp)
  rebuilt with a 16 GiB Memory64 ceiling
- Package: <https://www.npmjs.com/package/wllama64/v/1.0.0>
- License: MIT (wllama, Xuan Son Nguyen); the WebAssembly binary compiles
  llama.cpp and ggml (MIT, <https://github.com/ggml-org/llama.cpp>), whose
  WebGPU backend is maintained at UC Santa Cruz
- Packaged files: `vendor/wllama/`
- License text: `vendor/wllama/LICENCE`
- SHA-256 (`index.js`):
  `0693b9d8e4adbee8372a1abf45595eb32979bf68948fd3560cda27edffa72b48`
- SHA-256 (`wllama-worker.js`):
  `448db02b2f824764e97a5cf8e9fda984bbd9e238eb37db00e09b0daafc58c408`
- SHA-256 (`wllama-glue.js`):
  `ff8c55f5e69bfed90c6f4ca098f0fbe7c9d83239cf3427150966e5dd9baea4b7`
- SHA-256 (`wllama.wasm`):
  `8ca26701abecfd8c52700f299a99a8902e638019ed97b9a6e59381c74a17969f`
- SHA-256 (`LICENCE`):
  `5866e3bd7e3cbd3f7c8bea6efd8a1e7fa7cc8de68c30f428aff7c6584a0fb720`

The WebAssembly binary is the upstream package's, byte-identical. The three
scripts are generated from the package's ES module by
`scripts/vendor-wllama.mjs`, which lifts the runtime's embedded worker and
Emscripten glue out into files and makes the module spawn its worker from a
packaged URL rather than from a blob, because an extension page's script
policy admits nothing else. The script is the whole record of the change and
`tests/wllama-vendor.test.js` pins its output.

## Built-in songwriter model (downloaded, not packaged)

- Model: `DavidAU/Qwen3.5-9B-The-Defiant-Fable-Uncensored-Heretic-NEO-IMATRIX-MAX-MTP-GGUF`,
  `Qwen3.5-9B-The-Defiant-Fable-Uncnr-Heretic-NEO-MAX-IQ2_M.gguf` and
  `mmproj-F16.gguf`
- Original model family: Qwen3.5 (Alibaba Cloud), fine-tuned by DavidAU
- License: Apache-2.0
- Source: <https://huggingface.co/DavidAU/Qwen3.5-9B-The-Defiant-Fable-Uncensored-Heretic-NEO-IMATRIX-MAX-MTP-GGUF>
- SHA-256 (weights):
  `ae9679dee69a4cb3a9375efa3644adc0164a362c61df2b283696d05e57df2fca`
- SHA-256 (vision projector):
  `f70dc3509053962b0d0d3ee8a7eacebf5d60aa560cad78254ae8698516ae029f`
- Byte lengths: `4942441760` and `918166080`

These files are not in the package: together they are about 5.9 GB, beyond
what the store accepts. They are downloaded the first time the built-in
songwriter is used, in parts, each part verified against a SHA-256 pinned in
`src/local-model/constants.js` before it is kept.
