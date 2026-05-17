# cat-yarn-watercolor Requirements

This document holds storyboard-specific decisions for the current run. Keep reusable process rules in skills; keep concrete character, prop, style, and frame details here.

## Source

- Storyboard image: `/Users/poonamnairrmit/Downloads/ink-frame/app/dist/references/storyboard_input.png`
- Extracted frames: `storyboard-frames/cat-yarn-watercolor`
- Grid: 4 columns x 3 rows

## User Request

Create a clean animated video from the storyboard: black cat plays with a blue ball of yarn in ink and watercolor style. Use the storyboard as a lighthouse only; do not show, paste, trace, or hide the source bitmap in the final canvas. Keep panel numbers and handwritten captions out of the animated frame. Keep cat identity, yarn scale, floor line, watercolor background, and ink stroke style consistent. Final output should be a smooth 12-scene animation and rendered video.

## Required Output

- Final deliverable: a clean browser animation and rendered MP4 video.
- Animation length / pacing: 12 key scenes, smooth bridge frames, approximately 8-10 seconds at 12 fps.
- Video format: MP4 rendered from the canvas-sized artwork.
- Browser route for review: local Vite app at `http://127.0.0.1:5176/`.

## Visual Style

- Medium: handmade ink and watercolor on warm paper.
- Line quality: rough black pen contours, dense short hatching on the black cat, jittered panel border outside the animation only if needed for review.
- Watercolor palette: soft cream paper, pale blue-grey background clouds, sandy floor wash, blue yarn, black cat with subtle brown-blue highlights.
- Texture density: high pen density on fur and yarn; soft translucent washes in the background and floor.
- Reference/lighthouse rule: use extracted storyboard frames for pose/action guidance only; no source bitmap is shown, pasted, hidden, or sampled in the final canvas.

## Character And Identity Anchors

- Character identity: one small black cat, lively and curious, with upright triangular ears, long tail, white/bright eyes, whiskers, and dense black hatching.
- Head / hair: triangular head, pointed ears, hatching follows head/fur direction.
- Face details: bright round eyes, tiny nose, whiskers attached to cheeks, alert expression that changes with the action.
- Mouth / expression: small mouth except playful open mouth when gripping yarn.
- Clothing / body: none.
- Hands / limbs: four connected cat legs/paws; paws must attach through forelegs/hindlegs and never float.

## Recurring Props And Environment

- Primary props: blue ball of yarn, loose yarn string, yarn loops around cat in later frames.
- Surface / setting: simple sandy floor line with soft cast shadows.
- Background: pale watercolor wash clouds, stable empty room backdrop.
- Items that must be removed or changed: remove all panel numbers and handwritten storyboard captions from the animated view.

## Frame Requirements

| # | Action / pose | Lighthouse evidence | Attachment chains | Semantic risks | Notes |
|---|---|---|---|---|---|
| 1 | Cat sits upright noticing yarn at right | Cat back/sitting silhouette, yarn ball to the right | Spine to seated haunches, tail on floor, eyes toward yarn | Yarn too small; cat face unreadable | Opening still, quiet curiosity |
| 2 | Cat crouches and approaches | Low body, head forward, ball still right | Neck to shoulders to front paws | Floating paws, drifting yarn | Curious stalking motion |
| 3 | Cat reaches one gentle paw | Standing cat, paw extended to yarn | Shoulder-elbow-wrist-paw chain to ball | Paw missing contact | Tail high |
| 4 | Cat sniffs close to ball | Head lowered to ball, nose contact | Neck/head toward yarn, front paws grounded | Nose/yarn overlap confusion | Tiny sniff marks allowed |
| 5 | Cat sits and bats yarn | Seated cat, raised paw, ball wobble | Shoulder to raised paw, yarn ball anchored | Paw detached, ball pops | Motion arcs around yarn |
| 6 | Cat leaps/chases rolling ball | Cat airborne, ball left | Body arc, all legs attached to body | Cat too abstract in leap | Strong motion line under body |
| 7 | Cat catches ball low | Cat crouched around yarn | Paws wrap ball, head lowered | Yarn hidden by cat | Emphasize blue ball contours |
| 8 | Cat hugs/holds ball | Seated cat clutching yarn | Forelegs around ball, mouth/paws touch yarn | Ball reads as body patch | Playful grip |
| 9 | Cat rolls tangled | Cat on back with yarn loops | Yarn loops wrap body; legs attached | Loops confuse limbs | Chaotic but readable |
| 10 | Cat sits tangled | Seated cat wrapped in yarn, ball nearby | Yarn loops around torso/neck, tail visible | Loops detach or obscure face | "Oh dear" beat without caption |
| 11 | Cat pauses tangled | Cat front-facing, yarn around neck/body | Sitting body stable, string trails left | Face/harness confusion | Quiet pause |
| 12 | Cat walks away trailing yarn | Cat walking right, yarn trails behind | Walking legs connected, yarn around neck trails to left | Missing yarn trail, floating tail | End beat |

## Validation Gates

- Construction blueprint reviewed before detailed rendering.
- Still frames pass semantic clarity review.
- Adjacent frames pass consistency review.
- Browser check confirms source images are not visible in the final art.
- Final video renders and plays back.
