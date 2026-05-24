# Inky

<p align="center">
  <img src="docs/assets/inky-banner.png" alt="Inky ink bottle banner" width="180">
</p>

Start with a reference image: a finished scene, a key character pose, or a multi-panel storyboard. Inky saves that source into a local project, gives a coding agent the right prompt, and provides the browser loop for redrawing and animating it with Canvas code. Add optional style inspiration images to `insp/` when you want the animation to borrow a specific palette, texture, or line quality.

Inky is a small Canvas API and preview loop for agents drawing animated illustrations in code.

## Start With A Reference Image

You can use a single finished scene, a character pose, a prop sheet, lettering, or another visual target. Inky asks the agent to inspect the image first and decide whether it is one scene or a storyboard.

A good reference is usually:

- a single key pose or one main action broken into readable beats
- a clear storyboard grid when the image is multi-panel
- consistent character design, props, lettering, and camera framing
- enough silhouette and texture detail for the agent to redraw it
- no need to be perfect; it can be a lighthouse, not final art

Example storyboard used in this repo:

<img src="docs/assets/examples/cat-yarn-watercolor-original.png" alt="12-panel storyboard of a cat playing with yarn" width="900">

## Ask Your Coding Agent

Once you have the reference image, ask Codex, Claude, or another coding agent to build the animation from it.
The reusable prompt scaffold in `AGENT_PROMPT.md` explains the visual analysis loop and the core Inky APIs.

Example prompt:

```text
Use /image image/storyboard.png and draw an animated scene with ink style and watercolour effects of this cat playing with yarn.

Create a new Inky project, use the reference as the visual guide, redraw the scene in code with explicit brush settings, animate the motion, polish the frames, and make the browser preview/export work.
```

Other style prompts you can use:

```text
Use this 12 panel storyboard and animate a blond woman cutting fruit salad. Use waxy crayon fills and ink outlines.
```

```text
Use /image image/storyboard.png and draw it in the style of /style insp/crayon-sketch.png. Use the rough crayon texture and bright palette from that style.
```

```text
Use this 12 panel storyboard and animate a comic stick-man tax office scene with clean speech bubbles.
```

```text
Use this 12 panel storyboard and animate a clown juggling. Keep the baggy pants, hands, arms, and balls clear and remove storyboard-only guide arcs.
```

## Start In The Browser

Install and run the app:

```bash
npm install
npm run preview -- --port 5176
```

Inky requires Node.js `22` or newer. `npm run dev` and `npm run preview` both start the Vite app on `127.0.0.1`.

Open:

```text
http://127.0.0.1:5176/
```

Inky opens with no active animation.

1. Add a storyboard or target-scene image.
2. Add optional style inspiration images.
3. Describe the animation style, motion, and `/image` or `/style` slash references.
4. Create the local project files.
5. Copy the generated agent prompt.
6. Preview/export the finished animation.

After a project has been created or selected, the animation canvas and controls are the preview surface:

```text
http://127.0.0.1:5176/?project=cat-yarn-watercolor
```

Nested scenes use the same query parameter with a scene project reference:

```text
http://127.0.0.1:5176/?project=cat-yarn-watercolor/scenes/cat-yarn-watercolor-scene-02
```

<img src="docs/assets/browser-ui-annotated.svg" alt="Annotated Inky browser controls" width="900">

Use the browser controls to:

- **Projects** to jump between saved local projects.
- **Scene** to switch, rename, delete, or copy the current scene into a new scene.
- **Play / Pause** the animation.
- **Scrub the timeline** or type a frame number to inspect individual frames.
- **Change speed** to slow down or speed up playback.
- **Edit** to select, move, erase, draw, undo, redo, delete, save, or discard graph-backed scene objects.
- **Onion** to show neighboring edit traces while editing.
- **Annotate** to mark frame-specific notes, attach reference images, and copy an agent prompt for fixes.
- **Export PNG** to save the current frame.
- **Export MP4** to render, save, and download video at the selected speed.
- **Frame debugger** to inspect the manifest, renderer exports, reference overlay, edit layer state, and optional `getFrameDebug()` output.

## Ask For Fixes

After the first version, you can ask for specific visual fixes.

Examples:

```text
The shorts do not connect to the body. Redraw the body chain so the shirt overlaps the waistband and the legs exit from the shorts.
```

```text
The speech bubble points to the wrong character. Fix the source bubble geometry and redraw it, do not patch over it.
```

```text
The crayon texture still feels flat. Use the material brush tools so the strokes have wax gaps, pressure changes, and visible direction.
```

The agent should fix the root cause and rerender. It should not cover bugs with white patches, eraser seams, hidden overlays, or extra texture.

You can also use **Annotate** in the preview to draw a box around a problem frame, write the note, attach up to three reference images, and copy a generated fix prompt. Saved notes live in `storyboard/annotations.json`, with screenshots and annotation references under `outputs/`.

## Example Projects

### Cat Playing With Yarn

Ink and watercolour-style animation.

| Original storyboard | Inky drawn animation storyboard |
| --- | --- |
| <img src="docs/assets/examples/cat-yarn-watercolor-original.png" alt="Original 12-panel storyboard of a cat playing with yarn" width="420"> | <img src="docs/assets/examples/cat-yarn-watercolor-inky-storyboard.png" alt="Inky drawn 12-panel storyboard of the cat yarn animation" width="420"> |

### Blond Fruit Salad

Waxy crayon fills with ink outlines.

| Original storyboard | Inky drawn animation storyboard |
| --- | --- |
| <img src="docs/assets/examples/blond-fruit-salad-crayon-ink-original.jpg" alt="Original 12-panel storyboard of a woman making fruit salad" width="420"> | <img src="docs/assets/examples/blond-fruit-salad-crayon-ink-inky-storyboard.png" alt="Inky drawn 12-panel storyboard of the fruit salad animation" width="420"> |

### Leafy Plant Rescue Comic

Modern comic animation with speech bubbles.

| Original storyboard | Inky drawn animation storyboard |
| --- | --- |
| <img src="docs/assets/examples/leafy-plant-rescue-comic-original.png" alt="Original 12-panel storyboard of a plant rescue comic" width="420"> | <img src="docs/assets/examples/leafy-plant-rescue-comic-inky-storyboard.png" alt="Inky drawn 12-panel storyboard of the plant rescue animation" width="420"> |

### Clown Juggling

Hand-drawn children’s book style with animated juggling.

| Original storyboard | Inky drawn animation storyboard |
| --- | --- |
| <img src="docs/assets/examples/clown-juggling-original.png" alt="Original 12-panel storyboard of a clown juggling" width="420"> | <img src="docs/assets/examples/clown-juggling-inky-storyboard.png" alt="Inky drawn 12-panel storyboard of the clown juggling animation" width="420"> |

## Brush And Texture Tools

Inky's default drawing path is the Canvas API in `src/inky-canvas.js`.
Agents choose a starting medium with `listBrushes()`, then render with `createBrush()` and tune first-class parameters such as `size`, `thinning`, `smoothing`, `streamline`, `jitter`, `textureScale`, `roughness`, `opacity`, `seed`, and `inkFlow`.

Available starting points:

- `pencil` for dry sketch lines and construction marks
- `charcoal` for soft, smoky outlines and shadows
- `crayon` for waxy character fills and chunky handmade edges
- `watercolor` for translucent washes and gentle blooms

## Project Folders

Each animation project should live here:

```text
projects/<project-name>/
├── project.json         # source of truth for preview, render tools, tracks, and outputs
├── renderer.js          # project-specific drawing code for scene 01
├── scenes.json          # scene library index, created when scene tools are used
├── style-tokens.json    # optional shared palette and brush memory
├── image/               # source image copied as image/storyboard.<ext>
├── insp/                # optional artistic style references
├── prompt/              # agent prompts, scene prompts, and follow-up prompts
├── storyboard/
│   ├── requirements.md
│   ├── scene-objects.json
│   ├── edit-layer.json
│   └── annotations.json
├── scenes/
│   └── <scene-slug>/    # scene 02+ projects with their own project.json and renderer.js
└── outputs/             # rendered frames, MP4s, screenshots, reviews, and exports
```

## Contributing

Contributions are welcome. Please read `CONTRIBUTING.md` before opening a pull request.

For visual changes, include screenshots or notes from the browser preview so reviewers can see what changed.

## License

Inky is released under the MIT License. See `LICENSE` for details.
