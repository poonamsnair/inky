# storyboard In-Between Plan

This plan turns key storyboard panels into a smoother handmade animation. Use the source frames as lighthouses and redraw bridge frames; do not rely on crossfades alone.

## Timing

- FPS: 12
- Key-frame hold: 2 frame(s)
- Base in-betweens per transition: 5
 - Total video frames: 82
- Estimated duration: 6.83 seconds
- Loop final scene to first scene: no
- Machine timing: each in-between keeps legacy `t`/`linearT`, adds `motionT` for spatial anchor interpolation, and keeps `easedT` for effect accents such as settle or bounce.

## Layer Locking

- Locked set layers: paper grain, panel border, wall notes/posters, table/desk, static background lighting
- Anchored props/layers: laptop, mug, notebooks, papers, phone, lamp, plant, recurring desk props
- Animated layers: head, torso, shoulders, arms, wrists, hands, facial expression, hair droop, dream/sleep/motion marks

## Transition Schedule

| Transition | In-betweens | Easing | Timing Feel | Action Change | Clarity Risks |
|---|---:|---|---|---|---|
| 1 -> 2 | 6 | settle | overshoot-and-settle; clamp before using as a spatial interpolation | Character gasps at drooping Leafy on desk. -> Close-up of sad wilted Leafy. | Speech tail, hand fingers, plant label, lamp not becoming guide mark.; Leafy face must read as plant, not a second character head. |
| 2 -> 3 | 7 | anticipate-settle | small anticipation before moving, then a settling arrival | Close-up of sad wilted Leafy. -> Character cries and pleads beside plant near bed/window. | Leafy face must read as plant, not a second character head.; Bubble must point to character, not plant. |
| 3 -> 4 | 5 | bounce | impact or bounce effect timing; use motionT for spatial anchors and easedT for local bounce accents | Character cries and pleads beside plant near bed/window. -> Character carefully adds one drop with medicine dropper. | Bubble must point to character, not plant.; Dropper and fingers cannot float; water should be droplets, not strings. |
| 4 -> 5 | 5 | bounce | impact or bounce effect timing; use motionT for spatial anchors and easedT for local bounce accents | Character carefully adds one drop with medicine dropper. -> Character thinks nothing happened. | Dropper and fingers cannot float; water should be droplets, not strings.; Thought pose and bubble ownership. |
| 5 -> 6 | 5 | ease-in-out | slow start, quicker middle, slow settle | Character thinks nothing happened. -> Character panics and pours too much water. | Thought pose and bubble ownership.; Stream must not look like body limb; pot remains readable. |
| 6 -> 7 | 5 | ease-out | fast pickup, gentle arrival | Character panics and pours too much water. -> Overwatered plant stuck in muddy overflowing pot. | Stream must not look like body limb; pot remains readable.; Mud drips and water splashes stay separate from stems. |
| 7 -> 8 | 5 | ease-in-out | slow start, quicker middle, slow settle | Overwatered plant stuck in muddy overflowing pot. -> Character pushes plant cart toward sunlight. | Mud drips and water splashes stay separate from stems.; Cart wheels/legs must be clear; sunlight as beam not solid wall. |
| 8 -> 9 | 5 | ease-out | fast pickup, gentle arrival | Character pushes plant cart toward sunlight. -> Character encourages Leafy under bright sun. | Cart wheels/legs must be clear; sunlight as beam not solid wall.; Bubble tail to character; rays should not hide plant. |
| 9 -> 10 | 5 | ease-in-out | slow start, quicker middle, slow settle | Character encourages Leafy under bright sun. -> Character exhausted in chair after trying everything. | Bubble tail to character; rays should not hide plant.; Chair/body overlap, tissues not mistaken for hands. |
| 10 -> 11 | 5 | ease-out | fast pickup, gentle arrival | Character exhausted in chair after trying everything. -> Tiny new sprout appears. | Chair/body overlap, tissues not mistaken for hands.; Sprout must be unmistakable and connected to soil. |
| 11 -> 12 | 5 | ease-in-out | slow start, quicker middle, slow settle | Tiny new sprout appears. -> Character celebrates while Leafy says meh. | Sprout must be unmistakable and connected to soil.; Two bubbles must point to correct speakers; confetti not cluttering text. |

## Drawing Notes

- Reuse locked set layers during bridge frames so posters, walls, table, and static lighting do not swim.
- Keep anchored props in stable positions unless the story says they move.
- Interpolate animated anchors first: head, torso, shoulders, forearms, wrists, hands, expression, and story-critical marks.
- Keep face details attached to the head.
- Keep hands attached through wrist, forearm, and sleeve.
- Keep props attached to the desk or hand.
- Redraw ink and watercolor texture mainly on moving forms so the result feels handmade without making the whole set jitter.
- Use motion marks only after body attachment is clear.
