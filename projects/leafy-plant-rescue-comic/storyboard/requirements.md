# leafy-plant-rescue-comic Requirements

This document holds storyboard-specific decisions for the current run. Keep reusable process rules in skills; keep concrete character, prop, style, and frame details here.

## Source

- Storyboard image: `projects/leafy-plant-rescue-comic/image/storyboard_input.png`
- Extracted frames: `projects/leafy-plant-rescue-comic/storyboard`
- Grid: 3 columns x 4 rows

## User Request

Create a detailed stick-man style comical cartoon animation about a worried orange-shirt stick character trying to save a drooping potted plant named Leafy. Use the reference as a lighthouse for pose, dialogue, room props, watering action, sunlight, comeback sprout, confetti ending, and comic speech bubbles. Do not paste or trace the reference into the final canvas.

## Required Output

- Final deliverable: animated browser canvas preview with PNG/MP4 controls wired like the existing app; MP4 download must match the selected playback speed.
- Animation length / pacing: 12 comic beats, 8 frames each, 96 frames at 12 fps.
- Video format: browser canvas frames first; MP4 path reserved for export follow-up.
- Browser route for review: `http://127.0.0.1:5176/`

## Visual Style

- Medium: stick-man style comical cartoon with ink outlines, colored-pencil/crayon texture, stable paper grain, and dense small strokes where detail matters.
- Line quality: bold black organic contours for character/plant, crisp closed paths for labels, room edges, desk, panels, and speech bubbles.
- Palette: teal-blue bedroom/study walls, warm wooden desk, orange shirt, blue shorts, terracotta pot, sick olive plant, bright yellow sunlight, blue water, multicolor confetti.
- Texture density: higher than previous drafts; use many small brush/scumble strokes for wood grain, wall shading, leaves, soil, water splashes, and light rays.
- Reference/lighthouse rule: use the source for poses, contact points, text, plant posture, props, and framing, but never paste or trace the image into the final canvas.
- Correction rule: if a rendered shape is obviously wrong, rebuild it from its source anchors/path/layer order using the lighthouse as guidance. Do not cover bugs with patches, eraser seams, masks, heavy outlines, or texture.

## Character And Identity Anchors

- Character identity: white round stick-man head, thin black stick arms/legs, expressive huge eyes, small black hair sprouts on top, orange T-shirt with white lightning/plant rescue scribble, blue shorts, white gloves, black/white shoes.
- Head / hair: circular white face with pale lavender side shadow; two or three thin black hair antenna strands.
- Face details: oversized eyes that track the plant, heavy black brows for worry, blue tears in sad beats, wide mouth shapes for gasp/shout/cheer.
- Mouth / expression: frame-specific open gasp, panic, careful concentration, disappointed thinking, exhausted slouch, surprise, and victory laugh.
- Clothing / body: orange shirt always visible with white lightning-like mark; blue shorts must read as shorts with waistband, two separate leg panels, center seam/crotch split, visible leg openings, and black legs exiting underneath.
- Clothing attachment: shorts must be anchored to the shirt/torso in every pose, including side poses. The shirt hem overlaps the waistband, and legs exit from the two short openings rather than appearing beside the shorts.
- Hands / limbs: white gloved hands with three/four finger shapes; no floating hands; wrists connect through thin black arms.
- Speech bubbles: bubble body and tail should be one continuous closed white path with a black outline; no teal wall color, tinted wedge, eraser seam, oval socket patch, or thought-dot mark should show through a speech-bubble tail join.

## Recurring Props And Environment

- Primary props: Leafy plant in terracotta pot with cream `LEAFY` label and heart, drooping leaves/stems, soil/mud, watering can/bucket, desk, lamp, window/cart, bookshelf, chair, bed/posters, trash basket, confetti.
- Surface / setting: wood desk/table is the main anchor; pot must sit on desk or cart in every plant shot.
- Background: bedroom/study with teal walls; frame-specific shelf/lamp/window/posters/bed/chair match the lighthouse enough to keep story context.
- Items that must be removed or changed: panel numbers and panel borders stay out of final animation; long guide marks are converted into motion or short local accents only.

## Frame Requirements

| # | Action / pose | Lighthouse evidence | Attachment chains | Semantic risks | Notes |
|---|---|---|---|---|---|
| 1 | Character gasps at drooping Leafy on desk. | Left room shelf/chair, angled lamp beam, character recoils with raised hands, plant droops in pot. | Head -> neck/body -> shirt -> arms -> gloved hands; pot -> desk; lamp -> light cone. | Speech tail, hand fingers, plant label, lamp not becoming guide mark. | Bubble: `GASP!` |
| 2 | Close-up of sad wilted Leafy. | Pot centered, three drooping stems, sad plant face, brown leaf edges, distress swirl. | Stem bases attach to soil; leaves attach to stems; pot sits in saucer. | Leafy face must read as plant, not a second character head. | No human in this beat. |
| 3 | Character cries and pleads beside plant near bed/window. | Big tears, clasped hands, plant on bedside/desk, speech bubble top left. | Hands clasp at chest; tears attach to eyes; plant remains on table. | Bubble must point to character, not plant. | Bubble: `Noooo! Stay with me, Leafy!` |
| 4 | Character carefully adds one drop with medicine dropper. | Close character profile, dropper above plant, single water drop, muddy spill. | Hand -> dropper -> drop; pot -> desk; drooping leaves. | Dropper and fingers cannot float; water should be droplets, not strings. | Bubble: `Just... one drop... very carefully...` |
| 5 | Character thinks nothing happened. | Character left with hand on chin, plant right unchanged. | Arm bends into chin; plant pot stable; desk horizon. | Thought pose and bubble ownership. | Bubble: `Um... I don't think anything happened.` |
| 6 | Character panics and pours too much water. | Huge water stream from bucket/can, splash rays, character shouting. | Arm grips bucket; water stream lands inside pot and spills. | Stream must not look like body limb; pot remains readable. | Bubble: `MORE WATER! WAKE UP!!` |
| 7 | Overwatered plant stuck in muddy overflowing pot. | Big muddy pot close-up, blue puddles, brown splash droplets, plant face yelling. | Leaves/stems attach to soaked soil; pot rim and side closed. | Mud drips and water splashes stay separate from stems. | No human in this beat. |
| 8 | Character pushes plant cart toward sunlight. | Window with sun and rays, rolling cart, character leaning forward. | Hands grip cart handle; feet contact floor; pot sits on cart. | Cart wheels/legs must be clear; sunlight as beam not solid wall. | Bubble: `Sunlight! We need sunlight!` |
| 9 | Character encourages Leafy under bright sun. | Yellow radiant background, character gestures up, plant still drooping but centered. | Raised arm attaches to shoulder; pot on desk; sun rays behind. | Bubble tail to character; rays should not hide plant. | Bubble: `You're strong, Leafy! You've got this! I BELIEVE!` |
| 10 | Character exhausted in chair after trying everything. | Slumped chair pose, crumpled tissues, plant on desk, wall poster. | Body slumps into chair; hands/legs hang; pot on desk. | Chair/body overlap, tissues not mistaken for hands. | Bubble: `I tried everything.` |
| 11 | Tiny new sprout appears. | Close plant pot, surprised face on left, yellow exclamation rays around green sprout. | Sprout emerges from soil; old stems still droop. | Sprout must be unmistakable and connected to soil. | Bubble: `...wait. Is that...?` |
| 12 | Character celebrates while Leafy says meh. | Confetti, victory pose, new sprout and unimpressed plant face, poster. | Jumping limbs attach; pot/desk stable; confetti behind characters. | Two bubbles must point to correct speakers; confetti not cluttering text. | Bubbles: `WE DID IT!!!` and `...meh.` |

## Validation Gates

- Construction blueprint reviewed before detailed rendering.
- Still frames pass semantic clarity review.
- Adjacent frames pass consistency review.
- Reported bugs are corrected by redrawing/recreating the broken source geometry or layer order, not by retrofit patches.
- Browser check confirms source images are not visible in the final art.
- Final video renders and plays back.
