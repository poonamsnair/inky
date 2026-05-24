---
name: caption-subtitle-tooling
description: Add captions, subtitles, closed captions, timed text, VTT, SRT, or frame-by-frame text overlays to Inky storyboard animations. Use when the user asks for captions/subtitles/CC, provides a script, asks to generate captions from a concept, or wants captions baked into rendered frames/video.
---

# Caption Subtitle Tooling

## Goal

Create captions as timed text first, then decide whether to preview them on canvas, export sidecar files, or bake them into a rendered video.

## Caption Choices

- **Frame-specific captions:** Use exact `frameStart` and `frameEnd` cues when the user gives frame-by-frame wording or wants lines tied to storyboard beats.
- **Script captions:** Split the script into short readable phrases, usually 1 to 2 lines each.
- **Concept-generated captions:** Write concise descriptive beats from the story. Keep them readable and factual.
- **Sidecar captions:** Export `.vtt` and `.srt` when captions should remain optional in a player.
- **Baked-in captions:** Render frames from `?export&captions=1` only when the user wants subtitles visible inside the MP4 itself.

## Placement Rules

- Keep captions away from the primary action. If hands, faces, props, or foreground objects occupy the bottom of the frame, place captions at `top`.
- Prefer 1 to 2 lines. Avoid long narration that makes the viewer read instead of watch.
- Keep each cue on screen long enough to read. For short animations, group multiple visual beats into fewer caption cues.
- Do not import storyboard panel numbers or reference-image labels as captions unless the user explicitly asks for those words.

## Inky Tools

Create or update a caption track:

```bash
npm run storyboard:captions -- projects/<project>/storyboard/captions.txt projects/<project>/storyboard/captions.json -- --fps 12 --frames 90 --position top
```

Text input can be plain lines or explicit ranges:

```text
0-14 | Fresh fruit waits on the kitchen counter.
15-29 | She rinses the berries and sets up the board.
```

Preview captions in the browser:

```text
http://127.0.0.1:<port>/?captions=1
```

Render captioned frames for a baked-in MP4:

```bash
npm run storyboard:render-frames -- "http://127.0.0.1:<port>/?export&captions=1" projects/<project>/outputs/frames-captioned 90
```

Then encode those frames with the normal FFmpeg command.

## Validation

- Check a start, middle, and final frame with `?captions=1`.
- Confirm captions do not hide hands, face, tools, or required props.
- Confirm VTT/SRT exports match the JSON cue text and timing.
- Test the CC toggle and VTT/SRT buttons in the browser when the UI is part of the deliverable.
