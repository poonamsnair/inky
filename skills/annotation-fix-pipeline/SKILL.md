---
name: annotation-fix-pipeline
description: Use when a user pastes Inky browser/video/canvas annotations, frame comments, selected rectangles, annotation screenshots, or asks an agent to fix marked-up animation feedback and show the updated preview.
---

# Annotation Fix Pipeline

## Purpose

Turn saved browser annotations into finished Inky drawing fixes. Each annotation is a user-selected rectangle on a frame plus a comment. Treat it as targeted feedback on the rendered animation, not as a request to paste or trace the annotation screenshot into the final art.

Use this with:
- `storyboard-animation-pipeline` for project structure and renderer rules.
- `reference-lighthouse` when rebuilding the affected shape from source anchors.
- `frame-consistency-auditor` when a fix touches recurring character, prop, bubble, caption, or background details.
- `animation-polish-pass` before handoff.
- `browser-quality-check` after the updated preview loads.

## Required Inputs

Read these before editing:

1. `AGENTS.md`
2. `DESIGN.md`
3. `projects/<project-name>/project.json`
4. `projects/<project-name>/storyboard/requirements.md`
5. `projects/<project-name>/storyboard/annotations.json`, or the annotation JSON embedded in the pasted prompt
6. Any screenshot paths listed by the annotations

Ignore annotations marked `deleted`, `removed`, or `archived`. Treat `to do` and `needs review` as active. Do not rework `done` annotations unless the user explicitly asks.

## Fix Order

1. Identify the active project from the prompt, manifest, or annotation JSON.
2. For each active annotation, inspect the frame number, time, selected bounds, screenshot, and comment.
3. Locate the drawing system in `projects/<project-name>/renderer.js` that owns the marked area.
4. Do an applicability sweep before editing:
   - Identify whether the marked element is one-off or recurring.
   - Search the renderer for the shared helper, scene data, action mode, track, or anchor family that draws it.
   - List the same element's likely frame range: the annotated frame, adjacent in-betweens, neighboring key scenes, and any other scenes using the same helper or object identity.
   - Prefer fixing the shared construction helper or scene anchors so every applicable frame changes together.
   - Only use a frame-specific branch when the annotation is truly frame-specific, and state why.
5. Rebuild the affected shape, layer, timing, text, or material from construction anchors. Do not hide the issue with cover-up fills, white patches, masks, eraser seams, opacity tricks, or extra texture.
6. After editing, verify the applicability sweep by checking representative frames from the beginning, middle, and end of the affected range, plus any frames named in related annotations.
7. If a correction affects a recurring element, check nearby frames and update shared anchors so the element stays consistent.
8. Update `storyboard/annotations.json` status as work progresses:
   - `doing` when starting a fix.
   - `done` when the rendered preview verifies the request.
   - `needs review` when the request is ambiguous or only partly resolved.
9. Render updated frames or the full project.
10. Run polish, visual diff, and inspector checks.
11. Start or reuse the local preview and open `/?project=<project-name>` so the user can see the updated animation.

## Commands

Use these from the repo root, adapting the project slug:

```bash
npm run render -- --project <project-name>
npm run storyboard:polish -- projects/<project-name>
npm run storyboard:visual-diff -- projects/<project-name>/outputs/frames projects/<project-name>/outputs/review-visual-diff
npm run storyboard:inspect -- projects/<project-name>
npm run preview -- --port 5176
```

If the preview port is busy, use another local port and report the exact URL.

## Handoff

Return:
- Fixed annotations by id and frame.
- The affected frame ranges checked for each annotation.
- Any annotations left as `needs review`, with the reason.
- Verification commands that passed or failed.
- The preview URL.
- Any remaining visual risks the user should inspect manually.
