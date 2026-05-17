# clown-juggling Requirements

This document holds storyboard-specific decisions for the current run. Keep reusable process rules in skills; keep concrete character, prop, style, and frame details here.

## Source

- Storyboard image: `projects/clown-juggling/image/storyboard_input.png`
- Extracted frames: `projects/clown-juggling/storyboard`
- Grid: 4 columns x 3 rows

## User Request

Create a clean animated video from the storyboard: a cheerful curly-haired clown on a small circus stage juggles red, blue, and yellow balls, briefly drops one, recovers it, and finishes with a celebratory bow. Use the storyboard as a lighthouse only; do not show, paste, trace, or hide the source bitmap in the final canvas. Keep panel numbers out of the animated frame. Keep clown identity, ball colors, stage curtains, bunting, paper texture, and ink-watercolor style consistent.

## Required Output

- Final deliverable: a clean browser animation and rendered MP4 video.
- Animation length / pacing: 12 key scenes, handmade bridge frames, approximately 7.5 seconds at 12 fps.
- Video format: MP4 rendered from the canvas-sized artwork.
- Browser route for review: local Vite app at `http://127.0.0.1:5176/`.

## Visual Style

- Medium: handmade black ink and soft watercolor on warm paper.
- Line quality: rough pen contours, lightly jittered hatching, expressive motion arcs around juggling balls and limbs.
- Watercolor palette: cream paper, warm circus curtains, muted red-and-cream shirt stripes, golden yellow trousers, blue dots, red shoes and nose, navy-blue hat, red/blue/yellow juggling balls.
- Texture density: medium-high pen detail on curls, bow tie, suspenders, shoes, and ball motion arcs; soft washes in background, curtains, and floor.
- Reference/lighthouse rule: use extracted storyboard frames for pose/action guidance only; no source bitmap is shown, pasted, hidden, traced, or sampled in the final canvas.
- Storyboard guide marks: remove panel numbers, borders, and long throw-guide lines. Translate throw arcs into ball movement and only use short local motion ticks where they clarify action.

## Character And Identity Anchors

- Character identity: one cheerful curly-haired circus clown with a round red nose, tiny dark hat, oversized bow tie, striped shirt, suspenders, baggy yellow trousers with blue spots, and large red shoes.
- Head / hair: round head, orange curls framing both sides, small navy hat that may tip or fly but remains recognizable.
- Face details: bright eyes, round red nose centered on the face, smiling mouth except during the drop scare, rosy cheeks, simple expressive brows.
- Mouth / expression: grin during the juggling run, worried open mouth in the dropped-ball beat, big smile for the celebration.
- Clothing / body: red-and-cream striped long sleeves, big red polka-dot bow tie, dark suspenders with round buttons, loose golden trousers with blue dots.
- Pants correction: trousers must read as baggy pants, not a ball or skirt. Include waistband, two rounded trouser lobes/legs, center split, cuffs/openings, visible leg exits, blue spots, and attached shoes.
- Hands / limbs: gloved simplified hands attach through wrists and striped sleeves; arms must visibly connect through shoulders, elbows, wrists, and palms; legs attach under trousers into oversized shoes.

## Recurring Props And Environment

- Primary props: three juggling balls, always red, blue, and yellow/gold; small hat as a secondary prop in greeting and finale.
- Surface / setting: simple circus stage with warm floor wash, low bunting trim, optional side curtains and confetti in opening/ending.
- Background: pale watercolor paper wall with faint triangular bunting; stable stage framing without panel borders in the animated canvas.
- Items that must be removed or changed: remove all panel numbers, black storyboard panel borders, and any comic-panel layout from the animated view.

## Frame Requirements

| # | Action / pose | Lighthouse evidence | Attachment chains | Semantic risks | Notes |
|---|---|---|---|---|---|
| 1 | Clown tips his hat between side curtains | Hat lifted above head, body leans, left arm out for balance | Head -> neck -> torso; shoulder -> sleeve -> wrist -> hat hand; trouser legs -> shoes grounded | Hat hand detaches; face hidden by hat; shoes float | Opening greeting with curtains visible |
| 2 | Clown presents the three balls | Balls clustered near one palm, other hand open, front-facing smile | Shoulders -> sleeves -> gloved hands; palm supports balls | Ball colors merge; palm not connected to sleeve | Setup beat before juggling |
| 3 | Wide stance begins the throw | Blue ball low in one hand, red ball in other, knees bent | Torso -> suspenders -> trousers -> bent legs -> shoes; hands connect through sleeves | Arms too short; trousers lose spots | First active juggling pose |
| 4 | Red ball arcs high while blue ball stays low | Red ball above raised hand, blue ball in other hand, high wave | Raised shoulder -> sleeve -> wrist -> open palm; ball arc over head | High ball reads as random dot; open hand unclear | Start of cascade |
| 5 | Three balls circulate above a tilted head | Blue and red balls high, yellow ball low in hand, head tilts | Neck bridge to head; lower hand cradles yellow ball; upper hand ready to catch | Hat/blue ball overlap; yellow ball hidden | Use motion arcs strongly |
| 6 | Full centered juggling cascade | Red, blue, yellow balls form large arc, both hands open | Both arms attach symmetrically; balls follow one loop | Balls drift off arc; fingers become blobs | Main steady juggling loop |
| 7 | Juggling continues, clown smiling | Three balls across top arc, red in/near one hand | Same body anchors as frame 6, hands open and attached | Identity drift in face; ball order confusing | Hold the happy rhythm |
| 8 | Playful off-balance flourish | Clown leans with one leg kicked back, balls still airborne, one ball low | Standing leg grounded; lifted leg attaches through trouser; hands still ready | Lifted leg detaches; low ball looks like shoe | Big comic pose |
| 9 | Yellow ball drops and clown panics | Yellow ball hits floor, clown crouches, hands splayed, worried face | Crouched torso -> bent legs -> shoes; arms -> spread fingers | Dropped ball not grounded; expression unclear | Panic beat with impact marks |
| 10 | Clown lunges down to scoop the yellow ball | Body bent forward, both hands reach down, one leg lifted behind | Spine curve from head to torso; arms reach from shoulders; rear leg attaches to hip | Head-body gap; hands lose contact with ball | Recovery action with dust puff |
| 11 | Clown recovers and presents all three balls overhead | Three balls float above, arms open, big smile | Arms attach upward from shoulders; head connected under ball arc | Balls too high/small; bow tie hidden | Triumph before finale |
| 12 | Curtain-call celebration with hat raised and confetti | Hat lifted, one leg kicked, arms wide, curtains/confetti return | Raised arm -> wrist -> hat; lifted leg attaches; standing shoe grounded | Hat floats; confetti confused with balls | End on applause pose |

## Validation Gates

- Construction blueprint reviewed before detailed rendering.
- Still frames pass semantic clarity review.
- Adjacent frames pass consistency review.
- Browser check confirms source images are not visible in the final art.
- Final video renders and plays back.
