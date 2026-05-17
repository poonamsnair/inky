# Source Evidence Notes

These notes summarize the repo and web evidence used to complete the scoping questionnaire and first LaTeX draft.

## Repo Evidence

- Inky is described as "a small canvas animation app for turning storyboard references into hand-drawn animated videos by a coding agent" in `README.md`.
- The project asks a coding agent to extract a storyboard, write requirements, create construction blueprints, redraw the scene in canvas code, animate in-betweens, polish frames, and verify browser/export controls.
- `DESIGN.md` says the final artwork must be drawn in code, while the reference image can guide decisions but must not be pasted, hidden, traced as final art, or used as a visible layer.
- The app canvas is configured in `src/main.js` as a 960 by 620 HTML Canvas at 12 FPS with 96 total frames for the currently wired example.
- Runtime drawing uses JavaScript Canvas APIs and helper functions from `src/material-tools.js`, especially deterministic paper grain, pressure strokes, material scumble, material fills, and readable text color checks.
- The runtime does not call an LLM API directly. `rg` only found coding-agent references in docs, not OpenAI/Anthropic/Gemini API calls in `src` or `tools`.
- The repo uses a file-based memory layer: project folders contain `image/`, `prompt/`, `storyboard/`, and `outputs/`, with `requirements.md`, frame images, ledgers, construction blueprints, speech bubbles, in-between plans, polish passes, rendered frames, and MP4s.
- `package.json` exposes project scripts for storyboard extraction, construction blueprints, frame capture, frame rendering, in-between planning, captions, speech bubbles, polish, visual diffs, semantic review, adjacent-frame review, material preview, build, and dev preview.
- `src/speech-bubble-tools.js` normalizes timed bubble tracks, validates speaker ownership by distance to speaker anchors, draws speech bubble body and tail as one closed path, draws thought bubbles separately, wraps text, and ensures contrast.
- `src/caption-tools.js` creates timed caption tracks, draws caption overlays, and exports WebVTT/SRT text.
- `tools/make-inbetween-plan.mjs` uses `d3-ease` to create key holds, in-between schedules, `linearT`, `easedT`, and `motionT`, with locked, anchored, and animated layer categories.
- `tools/make-visual-diff-review.mjs` uses `pixelmatch` and `pngjs` to detect frame-to-frame changes, producing report files and a contact sheet for flicker/drift review.
- `tools/make-construction-blueprints.mjs` and `tools/make-semantic-review-board.mjs` use ImageMagick to create visual boards from source or rendered frames.
- `projects/stickman-tax-writeoffs-comic/storyboard/requirements.md` is the active project brief in `DESIGN.md` and names concrete failure risks: wrong bubble owner, thought bubble mistaken for speech, floating finger, cluttered scribbles, unclear OFF labels, floating notes, bubbles hiding characters, marker looking like a knife, and punchline bubble hiding the auditor.
- The existing `projects/stickman-tax-writeoffs-comic/storyboard/polish-pass.md` states that no first-pass rendered PNGs exist yet for that project, so current evidence is pipeline setup and source storyboard artifacts rather than completed rendered output.
- Example completed output exists for other projects, especially `leafy-plant-rescue-comic`, which has rendered frames, MP4s at several playback speeds, and a visual-diff review folder.

## Firecrawl Research Notes

Firecrawl was used because the user asked for it explicitly.

- `firecrawl --status` showed the CLI was authenticated, had `.firecrawl/` present, and had credits available.
- A setup check scraped `https://firecrawl.dev` into `.firecrawl/install-check.md`.
- arXiv TeX guidance: `.firecrawl/search-arxiv-latex-preprint.json` found arXiv's TeX submission page. Important takeaways: submit source and figures, avoid extraneous files, include custom style files/macros, verify generated PDFs, use proper figure formats, and avoid `\today`.
- Preprint style: Firecrawl found Overleaf's arXiv/bio-arXiv preprint template and the `kourgeorge/arxiv-style` repository. Important takeaway: a single-column article-style preprint is a familiar arXiv reading format, but a local repo can stay simpler and avoid pretending to be a conference submission.
- HCI style: Firecrawl found ACM CHI formatting guidance. Important takeaway: CHI uses ACM templates and TAPS, while initial submissions are one-column review manuscripts. That is useful later, but the draft should not use `acmart` unless targeting CHI specifically.
- Related work search found SVGenius, DrawBench/Imagen, GenEval, CLIPDraw, SketchRNN, Sketchy Database, VCode, and spatial-reasoning-with-drawing work. These help position Inky between text-to-image benchmarks, stroke/vector generation, SVG-as-code benchmarks, and spatial reasoning evaluation.

## Practical Paper Setup Decision

The `paper/` folder uses:

- `main.tex`: conservative article-based LaTeX preprint.
- `references.bib`: local BibTeX file.
- `figures/`: copied figure assets so a future arXiv bundle can be self-contained.
- `preview.html`: browser preview because this machine currently lacks a TeX compiler.

This is intentionally not a final submission package. It is a first paper workspace.
