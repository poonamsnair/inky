---
name: comic-speech-bubble-tooling
description: Add comic speech bubbles, thought bubbles, dialogue balloons, bubble tails, and frame-timed spoken text to Inky storyboard animations. Use when the user asks for speech bubbles, comic dialogue, word balloons, thought bubbles, or animated text spoken by characters.
---

# Comic Speech Bubble Tooling

## Goal

Treat speech bubbles as part of the drawing, not subtitles. They belong to characters, point at speakers, and must preserve readability while staying clear of faces, hands, props, and action.

## Workflow

1. Extract dialogue from the storyboard or user script.
2. Store project-specific dialogue in `projects/<project>/storyboard/speech-bubbles.txt` or `.json`.
3. Generate `speech-bubbles.json` with `npm run storyboard:speech-bubbles`.
4. In the animation code, import from `src/speech-bubble-tools.js`.
5. Draw bubbles after characters/props that sit behind the bubble, but before foreground objects only when the bubble should feel physically behind something.
6. Preview start, middle, and end frames; adjust box sizes, tails, and line breaks before rendering.

## Tool Use

Generate a bubble track:

```bash
npm run storyboard:speech-bubbles -- projects/<project>/storyboard/speech-bubbles.txt projects/<project>/storyboard/speech-bubbles.json -- --fps 12 --frames 90
```

Text format:

```text
0-12 | I NEED HELP WITH MY TAXES. | 45,30,270 | 185,152 | speech | worried-client | client
13-24 | MORE... WRITE-OFFS? | 625,38,230 | 695,150 | thought | accountant-thinking | accountant
```

Fields are:

```text
frameStart-frameEnd | text | bubbleX,bubbleY,width | tailX,tailY[,baseX,baseY] | speech|thought | optional-id | optional-speaker
```

## Drawing Rules

- Use uppercase text for comic lettering when it matches the reference.
- Keep each bubble short. If the text does not fit cleanly, split it into multiple timed bubbles.
- Tail tips should point at the speaker mouth, head, or thinking character; never at a random prop.
- Add a `speaker` value for every dialogue bubble when more than one character appears in the frame.
- Validate bubble tails against speaker anchors with `validateSpeechBubbleOwnership()` from `src/speech-bubble-tools.js`; treat warnings as fixes before render.
- Thought bubbles use dot trails and should point near the thinking character's head.
- Avoid covering eyes, mouths, hands, important documents, tools, or punchline props.
- Keep black bubble outlines organic but readable. Do not let hand-drawn jitter distort words.
- Keep speech bubble interiors solid white unless the project brief explicitly requests another color. The renderer should construct the bubble body and tail as one continuous closed path, then fill and stroke that single path.
- Do not patch a speech-bubble tail after drawing with a visible circle, oval, eraser line, or socket cover. If the join is wrong, fix the path geometry at the source. Speech bubbles should not show thought-bubble dots or socket rings unless the bubble type is `thought`.
- Bubble text is allowed from the storyboard; panel numbers and panel borders are not.

## Validation

- Check text wraps without clipping at desktop and mobile preview sizes.
- Confirm every visible tail points to the correct speaker.
- Confirm bubble body and tail are one solid white fill with no background color leaking through.
- Confirm speech bubbles do not contain extra circles, ovals, socket rings, or thought-dot marks. Those belong only to thought bubbles.
- Confirm the speech bubble tool builds one continuous path for speech bubbles; do not approve post-draw patches at the tail join.
- Confirm every dialogue bubble has the right `speaker` metadata when multiple characters are visible.
- Confirm bubbles do not hide the comic action or final joke.
- Confirm bubble timing matches the character expression and pose.
