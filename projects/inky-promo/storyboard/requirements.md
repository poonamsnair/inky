# inky-promo Requirements

This document holds storyboard-specific decisions for the current run. Keep reusable process rules in skills; keep concrete character, prop, style, and frame details here.

## Source

- Storyboard image: `projects/inky-promo/image/storyboard.png`
- Extracted frames: `projects/inky-promo/storyboard`
- Grid: 3 columns x 4 rows

## User Request

Create an animated illustration style script with captions. Replace the colour wash look with a black-and-white pen ink storyboard drawing style.

## Required Output

- Final deliverable: deterministic 96-frame canvas animation plus rendered PNG frames.
- Animation length / pacing: 8 seconds at 12 fps, with 12 story beats of 8 frames each.
- Video format: browser preview and MP4 export available from the Inky controls after frames render.
- Browser route for review: `/?project=inky-promo`

## Visual Style

- Medium: black-and-white pen ink drawing on white paper, guided by the new 12-panel reference image supplied by the user.
- Line quality: lively variable-width dip-ink and brush-pen contours, with technical-pen UI details and handwritten labels.
- Value palette: white paper, black ink, light grey hatching, dense black hair and UI emphasis; no colour fills or watercolor blooms.
- Texture density: visible paper tooth, crosshatching, scratchy pen shading, dense scribble hair, and pale graphite scumble for shadows.
- Reference/lighthouse rule: source panel composition, story beats, and contact points guide the redraw; source bitmap, panel numbers, panel borders, and handwritten storyboard captions are not pasted into the final animation.

## Character And Identity Anchors

- Character identity: young woman creator/artist, consistent side profile or back view, thoughtful and work-focused.
- Head / hair: black messy bun with loose fringe and visible hairline/strand groups.
- Face details: simple profile nose, small mouth, focused eyes, warm cheek wash.
- Mouth / expression: subtle shifts from hopeful, frustrated, tired, thoughtful, then proud.
- Clothing / body: soft blue hoodie with hood, collar folds, cuffs, and drawstrings attached to torso/arms.
- Hands / limbs: simplified human hands attached through sleeves/wrists; fingers drawn as separate small shapes when writing, typing, or touching the screen.

## Recurring Props And Environment

- Primary props: laptop, sketchbook/notebook, pen, UI cards, Inky note/logo, tablet/app screen, plant, coffee mug.
- Surface / setting: creator desk/studio with warm paper and wood tones.
- Background: minimal wall/cards/window marks that support the story without becoming storyboard panel borders.
- Items that must be removed or changed: remove source panel numbers, source panel borders, and source handwritten bottom captions; translate arrows/guide marks into short local motion accents or animation timing.

## Frame Requirements

| # | Action / pose | Lighthouse evidence | Attachment chains | Semantic risks | Notes |
|---|---|---|---|---|---|
| 1 | Overhead desk, laptop says WORK | creator at cluttered desk wanting animation | head -> hoodie -> chair; laptop on desk | hair mass, laptop perspective | reveal the problem without source caption |
| 2 | Woman prompts an LLM | side profile typing on laptop | head -> neck -> hoodie -> sleeves -> hands -> keyboard | detached fingers, laptop text | hopeful first attempt |
| 3 | Robot results disappoint | woman watches grid of stiff robots | chin hand connects to sleeve; laptop screen anchored | thought cloud not a bubble track | show mismatch with imagination |
| 4 | Tool friction chaos | many tool windows, render queue, tabs, timeline | cards are UI props, arrows are local accents | guide arrows becoming physical strings | use short arrows/ticks only |
| 5 | Prompt, tweak, wait | tired woman at laptop with notebook | elbow on desk, hand to face, pen to notebook | wrist/face contact | show repetition and fatigue |
| 6 | Stiff preview warning | playback screen with low-fluidity warning | viewer -> laptop/tablet screen, person observing | robot frames must read as simple figures | show stiff generated motion |
| 7 | Drawing feels better | woman draws thumbnails in sketchbook | shoulder -> sleeve -> wrist -> pen -> page | hand/pen attachment | handmade moment begins |
| 8 | Animation principles notebook | close notebook with stick figure motion notes | notebook spine, page, pen | small text overflow | readable motion ideas |
| 9 | One place for sketch/colour/animate | woman thinks under pinned cards | head/hand/thinking pose; cards on wall | hand to chin attachment | cards are final props, not source labels |
| 10 | First Inky spark | pinned INKY note and lightbulb | note pinned to wall, lightbulb below | rays not guide lines | spark beat with warm wash |
| 11 | Inky app appears | app interface with canvas, timeline, AI helper | UI panels connected, timeline stable | tiny UI text | show AI helps beside canvas |
| 12 | Artist leads | creator works on tablet, plant and note nearby | back view -> hoodie -> arms -> tablet | back-view hands, tablet contact | final proud studio moment |

## Validation Gates

- Construction blueprint reviewed before detailed rendering.
- Still frames pass semantic clarity review.
- Adjacent frames pass consistency review.
- Browser check confirms source images are not visible in the final art.
- Final video renders and plays back.
