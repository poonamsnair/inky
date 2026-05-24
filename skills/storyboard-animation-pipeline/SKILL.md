---
name: storyboard-animation-pipeline
description: End-to-end workflow for turning a storyboard image into a consistent hand-drawn frame sequence with extracted contour scaffolds, selectable Inky brush presets, optional specialist material tools, then animating and rendering it. Use when the user provides a storyboard, asks to extract frames, draw frame by frame, keep characters/props consistent across frames, animate between frames, or render the result as a video.
---

# Storyboard Animation Pipeline

## Purpose

Convert a storyboard into a new drawn animation. Use source pixels only as references or extracted coordinate scaffolds; never paste, hide, or patch the original bitmap into the final artwork.

Use this with:
- `reference-replication-recipe` whenever a frame or scene must match a reference image accurately.
- `reference-lighthouse` for source-image interpretation.
- `image-path-extraction` when source contours, silhouettes, or prop placement need exact coordinates before redraw.
- `frame-construction-planner` before each finished still is drawn.
- `pen-watercolor-renderer` for handmade material style and brush/tool choices.
- `semantic-clarity-auditor` before moving on from a finished still frame.
- `frame-consistency-auditor` before animating between frames.
- `handmade-animation-planner` after approved still frames exist.
- `animation-polish-pass` after risky still frames, after first full render, and before final export.
- `caption-subtitle-tooling` when captions, subtitles, scripts, or timed text are requested.
- `comic-speech-bubble-tooling` when comic dialogue balloons, thought bubbles, or spoken text are part of the artwork.
- `browser-quality-check` before handoff.
- `doodle-style-designer` when the requested style is doodle-like, black-ink, sketchy, marker-drawn, or similar to loose illustration references.

## Required Order

1. Extract the storyboard into individual frame images.
2. Write or update a project requirements document for this specific storyboard.
3. Create source-lighthouse construction blueprints for each frame.
4. For any reference-based frame, follow `reference-replication-recipe`: show the overlay, extract paths, analyze style, create brushes from the returned hints, redraw the extracted paths with multi-pass strokes, verify alignment, then hide the overlay.
5. In the browser preview, use `window.inky.extractPathsFromImage()` for frames where exact contours, silhouettes, or prop positions matter; keep the returned points as construction data.
6. If the project uses `insp/` style references, call `window.inky.analyzeStyle("insp/<file>")`, describe the style in plain language, then map its colors, line quality, mood, and texture to explicit brush parameters. If no style reference is provided, derive the same style decisions from the target image.
7. Draw frame 1 from its blueprint and extracted coordinate scaffold: anchors first, attachment chains second, silhouette third, ink/watercolor/texture last.
8. Before detail, explicitly remove or translate storyboard-only marks: panel numbers, borders, long motion-guide lines, arrows, labels, ghost positions, and construction marks.
9. Choose the primary medium from `listBrushes()` (`pencil`, `charcoal`, `crayon`, `watercolor`) and tune `textureScale`, `color`, and `roughness`; use legacy material helpers only when the project needs a specialty medium.
10. Ask whether frame 1 is directionally right when the user is actively reviewing visuals.
11. Draw the next frame from its own blueprint, honoring user changes.
12. Run semantic clarity review on risky zones: face/head, hands, arms, clothing, foreground action, props, and any marks that might be mistaken for physical objects.
13. Compare the new finished frame against the previous finished frame and align recurring elements.
14. Repeat requirements-then-blueprint-then-extract-if-needed-then-draw-then-audit for every frame.
15. Animate only after adjacent still frames are approved or clearly acceptable.
16. After the first animation render, run the polish pass and fix unclear forms, missing props, text ownership, stray guide marks, and weak material texture.
17. Render final video only after the browser animation passes visual review.

Do not jump from extracted storyboard directly to animation.
Do not fix obvious drawing bugs by adding cover-up patches after the fact. If a body chain, prop, speech bubble, label, or material layer is wrong, return to the construction anchors and redraw/recreate that shape or layer correctly before moving on.

## Tools

Use these project scripts from the repo root:

```bash
npm run storyboard:start -- "<storyboard-image>" projects/<name>/storyboard 3 4 --requirements "match the storyboard unless the user requests changes"
npm run storyboard:blueprint -- projects/<name>/storyboard projects/<name>/storyboard/blueprints --requirements "match the storyboard unless the user requests changes"
npm run storyboard:semantic -- projects/<name>/outputs/png projects/<name>/outputs/review-semantic
npm run storyboard:review -- projects/<name>/outputs/png projects/<name>/outputs/review-adjacent
npm run storyboard:polish -- projects/<name>
npm run storyboard:visual-diff -- projects/<name>/outputs/frames projects/<name>/outputs/review-visual-diff
npm run canvas:paths
npm run canvas:brushes
```

Use `npm run extract:storyboard -- "<storyboard-image>" projects/<name>/storyboard <columns> <rows>` when only extraction is needed.

## Project Folder Standard

Every render project should live under:

```text
projects/<project-name>/
├── image/       # copy of the original user-provided image
├── insp/        # optional artistic style references
├── prompt/      # user direction, constraints, and later corrections
├── storyboard/  # extracted frames, requirements, ledgers, blueprints, in-between plans, app-specific frame work
└── outputs/     # rendered PNG frames, MP4s, contact sheets, and exports
```

Before drawing, copy the original reference image into `image/`, place optional style references in `insp/`, and write the current user direction into `prompt/user-prompt.md`. Keep storyboard-specific details in `storyboard/requirements.md`; keep reusable process rules in skills.

Do not copy older experiments, unrelated render folders, browser scratch files, research notes, or previous project outputs into a new project folder.

## Drawing Contract

For every frame, make a short plan before editing code:
- Current project requirements document path.
- Reference frame number and source path.
- Pose and main action.
- Required user changes.
- Shared anchors carried from previous frames: character identity, head/hair, face, clothing/body, hands, important props, environment, style.
- What must be redrawn fresh rather than patched.
- Lighthouse evidence for pose/contact/scale.
- Extracted path skeletons used, if any: source image, extraction options, retained path groups, and any deliberate offsets.
- Lighthouse mark guidance for contour emphasis, hatching direction, and soft watercolor zones.
- Style palette: any `insp/` source used, its dominant colors, mood, line quality, texture, and the brush settings chosen from that evidence.
- Motion-mark triage: which source marks are removed, which become animation timing, and which are redrawn as final local accents.
- Brush kit: which `listBrushes()` preset is primary, which parameters were tuned, and whether optional `src/material-tools.js` helpers are needed.
- Construction helpers: which `src/illustration-tools.js` or `src/companion-tools.js` helpers are used for body chains, hands, clothing, props, progressive draw-on strokes, extracted paths, and paper/style setup.
- Brush preview: if the project asks for a new brush look, render `npm run canvas:brushes`.
- Polish plan: what will be checked again after the first pass before texture/detail is increased.
- Attachment chains, especially for hands, sleeves, wrists, facial details, and props.
- Dense pen zones and soft watercolor zones.

The source frame is a guide and may provide extracted coordinate scaffolds, not a visible layer. Do not sample, paste, or hide the source image in the canvas.
Do not draw storyboard guide marks as literal final art. A long dashed throw arc should usually become ball movement over time; if a visible accent is needed, redraw it as short local motion ticks near the moving object.
If a drawn result contains a visible bug, use the source frame and neighboring frames to diagnose the root cause, erase/rebuild the defective shape in code, and rerender. Do not approve fixes that rely on white plugs, eraser seams, overlay patches, texture camouflage, or post-draw masking.

Storyboard-specific facts belong in `requirements.md`, `storyboard-ledger.json`, or a `--spec` JSON file, not in the reusable skill.

## Scene Graph Population

If a character part, prop, caption, speech bubble, or important contour should be editable later, the renderer must populate the scene graph while drawing the frame. Raw `brush.stroke()` pixels are not selectable in Edit mode.

```js
helpers.sceneGraph.drawObject(ctx, frame, {
  id: "cat_body",
  type: "path",
  points: traced.paths[0].points,
  brush: {
    type: style.suggestedBrush || style.suggested?.brush || "charcoal",
    color: style.palette?.dark || style.suggested?.color || "#2b2b2b",
    roughness: style.suggestedRoughness ?? style.suggested?.roughness ?? 0.45,
    size: 4,
  },
});
```

Use stable IDs. If the same object is graph-backed, do not draw a second raw canvas copy unless `helpers.sceneGraph.isDeleted(id)` and `helpers.sceneGraph.getOverride(id)` are respected.

## Frame Completion Gate

A frame is not done until:
- The user-requested changes are visible.
- The pose reads without needing the original reference.
- Ambiguous zones pass the `semantic-clarity-auditor` crop review.
- The character identity matches nearby frames.
- Important props match nearby frames unless the story says they changed.
- Storyboard-only marks have been removed or translated; no panel numbers, borders, labels, or construction/throw guide lines are visible as accidental objects.
- The pen/watercolor technique is consistent across the whole frame.
- The first-pass polish check has no unresolved structure, text ownership, guide-mark, or texture masking defects.
- Obvious bugs have been redrawn at the source rather than covered with patches.
- If rendered PNGs exist, visual-diff review has no unexplained locked-background shimmer, caption/bubble jumps, or vanishing story props.
- The frame was checked in the browser or from a rendered screenshot.

## Animation Gate

Before animating frame A to frame B:
- Run or manually perform the `frame-consistency-auditor`.
- Fix identity drift first. Do not animate mismatched eyes, facial details, head/hair, hands, props, clothing, or environment scale.
- Prefer a flipbook of finished redraws over puppet-like transforms.
- Keep body parts attached by using shared anchors: head center, neck base, shoulder line, elbow line, wrist/hand locations, cup position.
- Animate steam, dust, sparkle, local motion ticks, and tiny pen shimmer separately from the pose.
- Use long source motion arcs for timing paths, not as visible connector lines.

## Video Render Gate

Render video only after:
- Start, middle, and end stills from the browser have been inspected.
- The transition does not contain detached facial features, floating hands, popping props, or mismatched line styles.
- Reduced motion still shows a coherent frame.
- If captions are requested, `?captions=1` preview does not cover important action and VTT/SRT sidecars or baked-in captioned frames have been generated as requested.
- If speech bubbles are requested, bubble text wraps cleanly, every tail points at the intended speaker, and no bubble hides the joke or required props.
- The `animation-polish-pass` checklist has been run after the first render, and any Fix items that affect readability have been resolved.
