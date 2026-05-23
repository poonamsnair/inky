# storyboard In-Between Plan

This plan turns key storyboard panels into a smoother handmade animation. Use the source frames as lighthouses and redraw bridge frames; do not rely on crossfades alone.

## Timing

- FPS: 12
- Key-frame hold: 2 frame(s)
- Base in-betweens per transition: 6
 - Total video frames: 90
- Estimated duration: 7.50 seconds
- Loop final scene to first scene: no
- Machine timing: each in-between keeps legacy `t`/`linearT`, adds `motionT` for spatial anchor interpolation, and keeps `easedT` for effect accents such as settle or bounce.

## Layer Locking

- Locked set layers: paper grain, panel border, wall notes/posters, table/desk, static background lighting
- Anchored props/layers: laptop, mug, notebooks, papers, phone, lamp, plant, recurring desk props
- Animated layers: head, torso, shoulders, arms, wrists, hands, facial expression, hair droop, dream/sleep/motion marks

## Transition Schedule

| Transition | In-betweens | Easing | Timing Feel | Action Change | Clarity Risks |
|---|---:|---|---|---|---|
| 1 -> 2 | 6 | ease-in-out | slow start, quicker middle, slow settle | Scene 1 -> Scene 2 | none listed |
| 2 -> 3 | 6 | ease-out | fast pickup, gentle arrival | Scene 2 -> Scene 3 | none listed |
| 3 -> 4 | 6 | ease-in-out | slow start, quicker middle, slow settle | Scene 3 -> Scene 4 | none listed |
| 4 -> 5 | 6 | ease-out | fast pickup, gentle arrival | Scene 4 -> Scene 5 | none listed |
| 5 -> 6 | 6 | ease-in-out | slow start, quicker middle, slow settle | Scene 5 -> Scene 6 | none listed |
| 6 -> 7 | 6 | ease-out | fast pickup, gentle arrival | Scene 6 -> Scene 7 | none listed |
| 7 -> 8 | 6 | ease-in-out | slow start, quicker middle, slow settle | Scene 7 -> Scene 8 | none listed |
| 8 -> 9 | 6 | ease-out | fast pickup, gentle arrival | Scene 8 -> Scene 9 | none listed |
| 9 -> 10 | 6 | ease-in-out | slow start, quicker middle, slow settle | Scene 9 -> Scene 10 | none listed |
| 10 -> 11 | 6 | ease-out | fast pickup, gentle arrival | Scene 10 -> Scene 11 | none listed |
| 11 -> 12 | 6 | ease-in-out | slow start, quicker middle, slow settle | Scene 11 -> Scene 12 | none listed |

## Drawing Notes

- Reuse locked set layers during bridge frames so posters, walls, table, and static lighting do not swim.
- Keep anchored props in stable positions unless the story says they move.
- Interpolate animated anchors first: head, torso, shoulders, forearms, wrists, hands, expression, and story-critical marks.
- Keep face details attached to the head.
- Keep hands attached through wrist, forearm, and sleeve.
- Keep props attached to the desk or hand.
- Redraw pen hatching and ink texture mainly on moving forms so the result feels handmade without making the whole set jitter.
- Use motion marks only after body attachment is clear.
